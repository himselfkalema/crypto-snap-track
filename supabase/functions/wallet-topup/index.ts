import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const topupSchema = z.object({
  amount: z.number().positive().max(10000000),
  phone: z.string().regex(/^256\d{9}$/).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extract and decode JWT token (already verified by Supabase gateway since verify_jwt=true)
    const token = authHeader.replace('Bearer ', '');
    
    let user_id: string;
    try {
      const [_header, payload, _signature] = decode(token);
      const claims = payload as { sub?: string; exp?: number };
      
      if (!claims.sub) {
        throw new Error('Invalid token: missing sub claim');
      }
      
      // Check if token is expired
      if (claims.exp && claims.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }
      
      user_id = claims.sub;
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse and validate request
    const body = await req.json();
    const validated = topupSchema.parse(body);
    const { amount, phone } = validated;

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Validate phone belongs to user if provided
    if (phone) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('mobile')
        .eq('id', user_id)
        .single();

      if (profile?.mobile && profile.mobile !== phone) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Phone number does not match profile' 
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Credit wallet
    const { error: creditError } = await supabaseAdmin.rpc('credit_wallet', { 
      p_user_id: user_id, 
      p_amount: amount 
    });

    if (creditError) {
      console.error('Credit wallet error:', creditError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to credit wallet' 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log audit event
    await supabaseAdmin.rpc('log_audit', {
      p_user_id: user_id,
      p_action: 'WALLET_TOPUP',
      p_details: { amount, phone: phone || 'not provided' }
    });

    console.log(`Wallet topped up for user ${user_id}: ${amount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Wallet credited successfully' 
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Validation failed', 
        details: err.errors 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.error('Wallet topup error:', err);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'An error occurred' 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
