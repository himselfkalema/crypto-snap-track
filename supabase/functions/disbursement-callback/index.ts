import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
  auth: { persistSession: false } 
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405, 
        headers: corsHeaders 
      });
    }
    
    const bodyText = await req.text();
    console.log("Callback received:", bodyText);
    
    const event = JSON.parse(bodyText);

    // Determine provider from payload or headers
    const provider = event.provider?.toUpperCase() || req.headers.get("x-provider")?.toUpperCase() || "UNKNOWN";
    console.log(`Provider: ${provider}`);

    // Determine external reference ID
    const externalRef = event.externalId ?? 
                       event.referenceId ?? 
                       event.transactionId ?? 
                       event.transaction?.reference ??
                       event.financialTransactionId;
                       
    if (!externalRef) {
      console.error("No externalRef in callback payload");
      return new Response(
        JSON.stringify({ error: "No externalRef provided" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`External reference: ${externalRef}`);

    // Determine status from provider payload
    let rawStatus = (event.status ?? event.transaction?.status ?? "").toUpperCase();
    if (!rawStatus) {
      console.error("No status in callback payload");
      return new Response(
        JSON.stringify({ error: "No status in payload" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Raw status from provider: ${rawStatus}`);

    // Map provider-specific statuses to unified statuses
    let status: string;
    if (["SUCCESS", "COMPLETED", "ACCEPTED", "SUCCESSFUL"].includes(rawStatus)) {
      status = "COMPLETED";
    } else if (["FAILED", "REJECTED", "ERROR", "DECLINED"].includes(rawStatus)) {
      status = "FAILED";
    } else {
      status = "PROCESSING"; // intermediate
    }

    console.log(`Mapped status: ${status}`);

    // Fetch withdrawal row
    const { data: w, error: fetchError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("external_ref", externalRef)
      .single();
      
    if (fetchError || !w) {
      console.error("Withdrawal not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Withdrawal not found" }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found withdrawal: ${w.id}, current status: ${w.status}`);

    // Update withdrawal status
    const { error: updateError } = await supabase
      .from("withdrawals")
      .update({ status })
      .eq("id", w.id);
      
    if (updateError) {
      console.error("Failed to update withdrawal:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update withdrawal" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refund if failed
    if (status === "FAILED") {
      console.log(`Refunding ${w.gross_amount} to user ${w.user_id}`);
      const { error: refundError } = await supabase.rpc(
        "credit_wallet", 
        { p_user_id: w.user_id, p_amount: w.gross_amount }
      );
      
      if (refundError) {
        console.error("Refund failed:", refundError);
        // Log but don't fail the callback - we've recorded the failure
      } else {
        console.log("Refund successful");
      }
    }

    console.log(`Callback processed successfully: withdrawal ${w.id} -> ${status}`);

    return new Response(
      JSON.stringify({ success: true, withdrawalId: w.id, status }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error("Callback handler error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
