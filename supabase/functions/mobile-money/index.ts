import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const requestSchema = z.object({
  phone_number: z.string().regex(/^256\d{9}$/, { message: 'Phone must be 256XXXXXXXXX format' }),
  amount: z.number().positive().max(5000000, { message: 'Maximum amount is 5,000,000 UGX' }),
  provider: z.enum(['MTN', 'AIRTEL'])
});

const callbackSchema = z.object({
  external_tx_id: z.string(),
  status: z.string()
});

serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // /request endpoint - requires authentication (SECURITY FIX)
    if (url.pathname.endsWith("/request") && req.method === "POST") {
      // Authentication check
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Parse and validate request
      const body = await req.json();
      const validated = requestSchema.parse(body);
      const { phone_number, amount, provider } = validated;
      
      // Always use authenticated user's ID (SECURITY FIX)
      const user_id = user.id;

      const external_tx_id = crypto.randomUUID();

      // Insert transaction record
      const { data: tx, error: txErr } = await supabase
        .from('mobile_money_transactions')
        .insert([{
          user_id,
          phone_number,
          amount,
          provider: provider.toUpperCase(),
          external_tx_id,
          status: 'PENDING',
          currency: 'UGX'
        }])
        .select()
        .single();

      if (txErr) {
        console.error('Transaction insert error:', txErr);
        return new Response(JSON.stringify({ error: 'Transaction failed' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Log audit event
      await supabase.rpc('log_audit', {
        p_user_id: user_id,
        p_action: 'MOBILE_MONEY_REQUEST_CREATED',
        p_details: { transaction_id: tx.id, amount, provider }
      });

      return new Response(JSON.stringify({ 
        success: true, 
        transaction: tx,
        message: 'Payment request created. Please complete payment on your phone.' 
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // /callback endpoint - for provider webhooks (no auth required)
    if (url.pathname.endsWith("/callback") && req.method === "POST") {
      const body = await req.json();
      const validated = callbackSchema.parse(body);
      const { external_tx_id, status } = validated;

      // Fetch transaction
      const { data: tx, error: txErr } = await supabase
        .from('mobile_money_transactions')
        .select('*')
        .eq('external_tx_id', external_tx_id)
        .single();

      if (txErr || !tx) {
        console.error('Transaction not found:', external_tx_id);
        return new Response(JSON.stringify({ error: 'Transaction not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Idempotency: if already processed, return success
      if (tx.status === 'COMPLETED' || tx.status === 'FAILED') {
        return new Response(JSON.stringify({ success: true, message: 'Already processed' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Normalize status
      let normalizedStatus = status.toUpperCase();
      if (['SUCCESS', 'COMPLETED', 'SUCCESSFUL'].includes(normalizedStatus)) {
        normalizedStatus = 'COMPLETED';
      } else if (['FAILED', 'REJECTED', 'ERROR'].includes(normalizedStatus)) {
        normalizedStatus = 'FAILED';
      } else {
        normalizedStatus = 'PROCESSING';
      }

      // Update transaction status
      await supabase
        .from('mobile_money_transactions')
        .update({ status: normalizedStatus })
        .eq('id', tx.id);

      // If successful, credit wallet
      if (normalizedStatus === 'COMPLETED') {
        await supabase.rpc('credit_wallet', { 
          p_user_id: tx.user_id, 
          p_amount: tx.amount 
        });

        // Log audit event
        await supabase.rpc('log_audit', {
          p_user_id: tx.user_id,
          p_action: 'WALLET_CREDITED_MOBILE_MONEY',
          p_details: { transaction_id: tx.id, amount: tx.amount, provider: tx.provider }
        });
      }

      return new Response(JSON.stringify({ success: true }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // SECURITY FIX: /simulate-success endpoint REMOVED from production
    // This was a critical vulnerability allowing free money generation

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: err.errors 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.error('Mobile money function error:', err);
    return new Response(JSON.stringify({ error: 'An error occurred' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
