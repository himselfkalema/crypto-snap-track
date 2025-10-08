import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
  auth: { persistSession: false } 
});

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- MTN Helpers ---
async function getMtnToken(config: any) {
  console.log("Getting MTN token...");
  const res = await fetch(`${config.baseUrl}/disbursement/token/`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${config.userId}:${config.apiKey}`),
      "Ocp-Apim-Subscription-Key": config.subsKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MTN token failed: ${text}`);
  }
  
  const j = await res.json();
  console.log("MTN token obtained");
  return j.access_token;
}

async function mtnTransfer(config: any, externalRef: string, phone: string, amount: number) {
  console.log(`Initiating MTN transfer: ${amount} UGX to ${phone}`);
  const token = await getMtnToken(config);
  
  const body = {
    amount: String(amount),
    currency: "UGX",
    externalId: externalRef,
    payee: { partyIdType: "MSISDN", partyId: phone },
    payerMessage: "Wallet withdrawal",
    payeeNote: "Withdrawal from platform",
  };
  
  const res = await fetch(`${config.baseUrl}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": externalRef,
      "X-Target-Environment": config.targetEnv,
      "Ocp-Apim-Subscription-Key": config.subsKey,
      "Content-Type": "application/json",
      "X-Callback-Url": config.callbackUrl,
    },
    body: JSON.stringify(body),
  });
  
  if (![200, 202].includes(res.status)) {
    const text = await res.text();
    console.error(`MTN transfer failed: ${text}`);
    throw new Error(`MTN transfer failed: ${text}`);
  }
  
  console.log(`MTN transfer initiated successfully: ${res.status}`);
  return res.status;
}

// --- Airtel Helpers ---
async function airtelGetToken(config: any) {
  console.log("Getting Airtel token...");
  const res = await fetch(`${config.baseUrl}/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `client_id=${config.clientId}&client_secret=${config.clientSecret}&grant_type=client_credentials`,
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtel token failed: ${text}`);
  }
  
  const j = await res.json();
  console.log("Airtel token obtained");
  return j.access_token;
}

async function airtelTransfer(config: any, externalRef: string, phone: string, amount: number) {
  console.log(`Initiating Airtel transfer: ${amount} UGX to ${phone}`);
  const token = await airtelGetToken(config);
  
  const body = {
    amount: String(amount),
    currency: "UGX",
    externalId: externalRef,
    payee: { partyIdType: "MSISDN", partyId: phone },
    payerMessage: "Wallet withdrawal",
    payeeNote: "Withdrawal from platform",
  };
  
  const res = await fetch(`${config.baseUrl}/merchant/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": externalRef,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (![200, 202].includes(res.status)) {
    const text = await res.text();
    console.error(`Airtel transfer failed: ${text}`);
    throw new Error(`Airtel transfer failed: ${text}`);
  }
  
  console.log(`Airtel transfer initiated successfully: ${res.status}`);
  return res.status;
}

// --- Main Server ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // POST /withdraw
    if (url.pathname.endsWith("/withdraw") && req.method === "POST") {
      const { user_id, gross_amount } = await req.json();
      console.log(`Withdrawal request: user=${user_id}, amount=${gross_amount}`);
      
      if (!user_id || !gross_amount) {
        return new Response(
          JSON.stringify({ error: "user_id and gross_amount required" }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Load profile & provider
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("mobile, provider")
        .eq("id", user_id)
        .single();
        
      if (profileError || !profile?.mobile || !profile.provider) {
        console.error("Profile error:", profileError);
        return new Response(
          JSON.stringify({ error: "Profile missing mobile or provider" }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`User profile: mobile=${profile.mobile}, provider=${profile.provider}`);

      const fee = Number((gross_amount * 0.35).toFixed(2));
      const net = Number((gross_amount - fee).toFixed(2));

      // Debit wallet
      const { data: debitOk, error: debitError } = await supabase.rpc(
        "debit_wallet_if_enough", 
        { p_user_id: user_id, p_amount: gross_amount }
      );
      
      if (debitError) {
        console.error("Debit error:", debitError);
        return new Response(
          JSON.stringify({ error: "Wallet debit failed: " + debitError.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!debitOk) {
        console.log("Insufficient funds");
        return new Response(
          JSON.stringify({ error: "Insufficient funds" }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const externalRef = crypto.randomUUID();
      const { data: withdrawRow, error: insertError } = await supabase
        .from("withdrawals")
        .insert([{
          user_id,
          gross_amount,
          fee_amount: fee,
          net_amount: net,
          currency: 'UGX',
          mobile_number: profile.mobile,
          provider: profile.provider.toUpperCase(),
          status: 'PROCESSING',
          external_ref: externalRef
        }])
        .select()
        .single();

      if (insertError || !withdrawRow) {
        console.error("Insert withdrawal error:", insertError);
        // Refund
        await supabase.rpc("credit_wallet", { p_user_id: user_id, p_amount: gross_amount });
        return new Response(
          JSON.stringify({ error: "Failed to create withdrawal record" }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Withdrawal record created: ${withdrawRow.id}`);

      try {
        const provider = profile.provider.toUpperCase();
        
        if (provider === "MTN") {
          await mtnTransfer(PROVIDER_CONFIG.MTN, externalRef, profile.mobile, net);
        } else if (provider === "AIRTEL") {
          await airtelTransfer(PROVIDER_CONFIG.AIRTEL, externalRef, profile.mobile, net);
        } else {
          throw new Error("Unsupported provider: " + provider);
        }

        console.log(`Withdrawal initiated successfully for ${provider}`);
        return new Response(
          JSON.stringify({ success: true, withdrawal: withdrawRow }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error("Provider transfer error:", err);
        // Rollback
        await supabase.rpc("credit_wallet", { p_user_id: user_id, p_amount: gross_amount });
        await supabase.from("withdrawals").update({ status: 'FAILED' }).eq('id', withdrawRow.id);
        
        return new Response(
          JSON.stringify({ error: err.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (err) {
    console.error("Withdraw function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
