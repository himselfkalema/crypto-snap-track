import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  console.log('Mobile money function called:', url.pathname);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // 1️⃣ Request a mobile money payment
    if (url.pathname.endsWith("/request") && req.method === "POST") {
      const { user_id, phone_number, amount, provider } = await req.json();

      console.log('Mobile money request:', { user_id, phone_number, amount, provider });

      if (!user_id || !phone_number || !amount) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 🔑 Here you would call MTN MoMo or Airtel Money API
      // For now, we'll simulate with a random external transaction ID
      const external_tx_id = crypto.randomUUID();

      console.log('Generated external_tx_id:', external_tx_id);

      // Save transaction in DB as PENDING
      const { error } = await supabase.from("mobile_money_transactions").insert([{
        user_id,
        phone_number,
        amount,
        provider,
        external_tx_id,
        status: "PENDING",
        currency: "UGX"
      }]);

      if (error) {
        console.error('Error creating transaction:', error);
        throw error;
      }

      console.log('Mobile money request created successfully');

      return new Response(
        JSON.stringify({ success: true, external_tx_id }), 
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2️⃣ Callback webhook (telco confirms payment)
    if (url.pathname.endsWith("/callback") && req.method === "POST") {
      const body = await req.json();
      const { external_tx_id, status } = body;

      console.log('Mobile money callback received:', { external_tx_id, status });

      // Update transaction status in DB
      const { data, error } = await supabase
        .from("mobile_money_transactions")
        .update({ status })
        .eq("external_tx_id", external_tx_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }

      console.log('Transaction updated:', data);

      // If payment SUCCESS → increment wallet
      if (status === "SUCCESS" && data) {
        console.log('Incrementing wallet balance for user:', data.user_id);
        
        const { error: rpcError } = await supabase.rpc("increment_wallet_balance", {
          p_user_id: data.user_id,
          p_amount: data.amount,
        });

        if (rpcError) {
          console.error('Error incrementing wallet:', rpcError);
          throw rpcError;
        }

        console.log('Wallet balance incremented successfully');
      }

      return new Response(
        JSON.stringify({ received: true }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3️⃣ Simulate payment completion (for testing purposes)
    if (url.pathname.endsWith("/simulate-success") && req.method === "POST") {
      const { external_tx_id } = await req.json();

      console.log('Simulating payment success for:', external_tx_id);

      if (!external_tx_id) {
        return new Response(
          JSON.stringify({ error: "Missing external_tx_id" }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update transaction status to SUCCESS
      const { data, error } = await supabase
        .from("mobile_money_transactions")
        .update({ status: "SUCCESS" })
        .eq("external_tx_id", external_tx_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }

      // Increment wallet balance
      if (data) {
        const { error: rpcError } = await supabase.rpc("increment_wallet_balance", {
          p_user_id: data.user_id,
          p_amount: data.amount,
        });

        if (rpcError) {
          console.error('Error incrementing wallet:', rpcError);
          throw rpcError;
        }
      }

      return new Response(
        JSON.stringify({ success: true }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (err) {
    console.error("Mobile Money Error:", err);
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});