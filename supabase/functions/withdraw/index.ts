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

// Provider configurations
const PROVIDER_CONFIG = {
  MTN: {
    baseUrl: Deno.env.get("MTN_BASE_URL"),
    subsKey: Deno.env.get("MTN_DISBURSEMENT_SUBS_KEY"),
    userId: Deno.env.get("MTN_DISBURSEMENT_USER_ID"),
    apiKey: Deno.env.get("MTN_DISBURSEMENT_API_KEY"),
    targetEnv: Deno.env.get("MTN_TARGET_ENV") ?? "sandbox",
    callbackUrl: Deno.env.get("MTN_CALLBACK_URL"),
  },
  AIRTEL: {
    baseUrl: Deno.env.get("AIRTEL_BASE_URL"),
    clientId: Deno.env.get("AIRTEL_CLIENT_ID"),
    clientSecret: Deno.env.get("AIRTEL_CLIENT_SECRET"),
    apiKey: Deno.env.get("AIRTEL_API_KEY"),
    callbackUrl: Deno.env.get("AIRTEL_CALLBACK_URL"),
  },
};

// Input validation schema
const withdrawSchema = z.object({
  gross_amount: z.number()
    .positive({ message: 'Amount must be positive' })
    .max(10000000, { message: 'Maximum withdrawal is 10,000,000 UGX' })
    .multipleOf(0.01, { message: 'Maximum 2 decimal places' })
});

async function getMtnToken(cfg: any) {
  const res = await fetch(`${cfg.baseUrl}/disbursement/token/`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${cfg.userId}:${cfg.apiKey}`),
      "Ocp-Apim-Subscription-Key": cfg.subsKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error('MTN token request failed');
  const j = await res.json();
  return j.access_token;
}

async function mtnTransfer(cfg: any, externalRef: string, phone: string, amount: number) {
  const token = await getMtnToken(cfg);
  const body = {
    amount: String(amount),
    currency: "UGX",
    externalId: externalRef,
    payee: { partyIdType: "MSISDN", partyId: phone },
    payerMessage: "Wallet withdrawal",
    payeeNote: "Withdrawal from CryptoSnapTrack",
  };
  const res = await fetch(`${cfg.baseUrl}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": externalRef,
      "X-Target-Environment": cfg.targetEnv,
      "Ocp-Apim-Subscription-Key": cfg.subsKey,
      "Content-Type": "application/json",
      "X-Callback-Url": cfg.callbackUrl,
    },
    body: JSON.stringify(body),
  });
  if (![200, 202].includes(res.status)) {
    console.error('MTN transfer failed:', await res.text());
    throw new Error('Payment provider error');
  }
  return res.status;
}

async function airtelGetToken(cfg: any) {
  const res = await fetch(`${cfg.baseUrl}/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `client_id=${cfg.clientId}&client_secret=${cfg.clientSecret}&grant_type=client_credentials`,
  });
  if (!res.ok) throw new Error('Airtel token request failed');
  const j = await res.json();
  return j.access_token;
}

async function airtelTransfer(cfg: any, externalRef: string, phone: string, amount: number) {
  const token = await airtelGetToken(cfg);
  const body = {
    amount: String(amount),
    currency: "UGX",
    externalId: externalRef,
    payee: { partyIdType: "MSISDN", partyId: phone },
    payerMessage: "Wallet withdrawal",
    payeeNote: "Withdrawal from CryptoSnapTrack",
  };
  const res = await fetch(`${cfg.baseUrl}/merchant/v1/payments`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`, 
      "Content-Type": "application/json",
      "X-Callback-Url": cfg.callbackUrl,
    },
    body: JSON.stringify(body),
  });
  if (![200, 202].includes(res.status)) {
    console.error('Airtel transfer failed:', await res.text());
    throw new Error('Payment provider error');
  }
  return res.status;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse and validate request body
    const body = await req.json();
    const validated = withdrawSchema.parse(body);
    const { gross_amount } = validated;
    
    // Always use authenticated user's ID (not from request body)
    const user_id = user.id;

    // Load user profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("mobile, provider, withdraw_skips_used, withdraw_skips_limit, subscription_tier")
      .eq("id", user_id)
      .single();

    if (profErr || !profile) {
      console.error('Profile error:', profErr);
      return new Response(JSON.stringify({ error: 'Profile not found. Please complete your profile.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!profile.mobile) {
      return new Response(JSON.stringify({ error: 'Please add a mobile number to your profile.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const provider = (profile.provider || 'MTN').toUpperCase();
    const fee = Number((Number(gross_amount) * 0.35).toFixed(2));
    const net = Number((Number(gross_amount) - fee).toFixed(2));

    // Check withdraw skips for premium users
    let skipUsed = false;
    if (profile.subscription_tier === 'premium' && profile.withdraw_skips_used < (profile.withdraw_skips_limit || 5)) {
      skipUsed = true;
    }

    // Debit wallet
    const { data: debitOk, error: debitErr } = await supabase.rpc('debit_wallet_if_enough', { 
      p_user_id: user_id, 
      p_amount: gross_amount 
    });

    if (debitErr) {
      console.error('Debit error:', debitErr);
      return new Response(JSON.stringify({ error: 'Transaction failed. Please try again.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!debitOk) {
      return new Response(JSON.stringify({ error: 'Insufficient balance for this transaction' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate unique external reference
    const externalRef = crypto.randomUUID();

    // Create withdrawal record
    const { data: withdrawRow, error: insertErr } = await supabase
      .from('withdrawals')
      .insert([{
        user_id,
        gross_amount,
        fee_amount: fee,
        net_amount: net,
        currency: 'UGX',
        mobile_number: profile.mobile,
        provider: provider,
        status: 'PROCESSING',
        external_ref: externalRef
      }])
      .select()
      .single();

    if (insertErr) {
      console.error('Insert error:', insertErr);
      // Rollback: refund wallet
      await supabase.rpc('credit_wallet', { p_user_id: user_id, p_amount: gross_amount });
      return new Response(JSON.stringify({ error: 'Transaction failed. Please try again.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call provider API
    try {
      if (provider === 'MTN') {
        await mtnTransfer(PROVIDER_CONFIG.MTN, externalRef, profile.mobile, net);
      } else if (provider === 'AIRTEL') {
        await airtelTransfer(PROVIDER_CONFIG.AIRTEL, externalRef, profile.mobile, net);
      } else {
        throw new Error('Unsupported provider');
      }

      // Increment withdraw skip usage for premium
      if (skipUsed) {
        await supabase
          .from('profiles')
          .update({ withdraw_skips_used: (profile.withdraw_skips_used || 0) + 1 })
          .eq('id', user_id);
      }

      // Log audit event
      await supabase.rpc('log_audit', {
        p_user_id: user_id,
        p_action: 'WITHDRAWAL_INITIATED',
        p_details: { withdrawal_id: withdrawRow.id, amount: gross_amount, provider }
      });

      return new Response(JSON.stringify({ success: true, withdrawal: withdrawRow }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (provErr) {
      console.error('Provider error:', provErr);
      // Rollback: mark failed and refund
      await supabase.from('withdrawals').update({ status: 'FAILED' }).eq('id', withdrawRow.id);
      await supabase.rpc('credit_wallet', { p_user_id: user_id, p_amount: gross_amount });
      
      return new Response(JSON.stringify({ error: 'Payment provider temporarily unavailable' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.error('Validation error:', err);
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: err.errors 
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.error('Withdraw function error:', err);
    return new Response(JSON.stringify({ error: 'An error occurred. Please contact support.' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
