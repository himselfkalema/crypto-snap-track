import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.201.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MTN_WEBHOOK_SECRET = Deno.env.get("MTN_WEBHOOK_SECRET");
const AIRTEL_WEBHOOK_SECRET = Deno.env.get("AIRTEL_WEBHOOK_SECRET");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-signature, x-signature, x-provider',
};

async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature === signature;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const bodyText = await req.text();
    
    // Check for webhook signature (provider-specific)
    const signature = req.headers.get('x-callback-signature') || req.headers.get('x-signature');
    const provider = req.headers.get('x-provider')?.toUpperCase();
    
    // Verify signature if available and secrets configured
    if (signature && (MTN_WEBHOOK_SECRET || AIRTEL_WEBHOOK_SECRET)) {
      const secret = provider === 'AIRTEL' ? AIRTEL_WEBHOOK_SECRET : MTN_WEBHOOK_SECRET;
      if (secret) {
        const isValid = await verifyWebhookSignature(bodyText, signature, secret);
        if (!isValid) {
          console.error('Invalid webhook signature');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), 
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    const ev = JSON.parse(bodyText);

    // Extract external reference from various possible locations
    const externalRef = ev.externalId ?? ev.referenceId ?? ev.transactionId ?? 
                       ev.transaction?.reference ?? ev.data?.externalId ?? ev.reference ?? 
                       ev.financialTransactionId;
    
    // Extract status from various possible locations
    let rawStatus = (ev.status ?? ev.transaction?.status ?? ev.data?.status ?? '').toString().toUpperCase();
    
    if (!externalRef) {
      console.error('No external reference found in callback:', ev);
      return new Response(JSON.stringify({ error: 'No external reference' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Normalize status
    let status = 'PROCESSING';
    if (['SUCCESS', 'COMPLETED', 'ACCEPTED', 'COMPLETED_FULL', 'SUCCESSFUL'].includes(rawStatus)) {
      status = 'COMPLETED';
    } else if (['FAILED', 'REJECTED', 'ERROR', 'DECLINED', 'CANCELLED'].includes(rawStatus)) {
      status = 'FAILED';
    }

    // Fetch withdrawal record
    const { data: w, error: wErr } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('external_ref', externalRef)
      .single();

    if (wErr || !w) {
      console.error('Withdrawal not found:', externalRef, wErr);
      return new Response(JSON.stringify({ error: 'Withdrawal not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotency check: if already in final state, don't update
    if (w.status === 'COMPLETED' || w.status === 'FAILED') {
      console.log('Withdrawal already in final state:', w.id, w.status);
      return new Response(JSON.stringify({ success: true, id: w.id, status: w.status, message: 'Already processed' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update withdrawal status
    await supabase.from('withdrawals').update({ status }).eq('id', w.id);

    // If failed, refund the wallet
    if (status === 'FAILED') {
      await supabase.rpc('credit_wallet', { p_user_id: w.user_id, p_amount: w.gross_amount });
      
      // Log audit event
      await supabase.rpc('log_audit', {
        p_user_id: w.user_id,
        p_action: 'WITHDRAWAL_FAILED_REFUNDED',
        p_details: { withdrawal_id: w.id, amount: w.gross_amount, provider: w.provider }
      });
    } else if (status === 'COMPLETED') {
      // Log successful withdrawal
      await supabase.rpc('log_audit', {
        p_user_id: w.user_id,
        p_action: 'WITHDRAWAL_COMPLETED',
        p_details: { withdrawal_id: w.id, amount: w.gross_amount, provider: w.provider }
      });
    }

    console.log('Withdrawal callback processed:', { id: w.id, externalRef, status });

    return new Response(JSON.stringify({ success: true, id: w.id, status }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Disbursement callback error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
