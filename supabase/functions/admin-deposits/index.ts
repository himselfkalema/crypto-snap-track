import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using security definer function
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const { depositId, action, notes } = await req.json();

    if (!depositId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing depositId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.email} performing ${action} on deposit ${depositId}`);

    // Fetch the deposit
    const { data: deposit, error: fetchError } = await supabaseClient
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError || !deposit) {
      return new Response(
        JSON.stringify({ error: 'Deposit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'confirm') {
      // Update deposit to CONFIRMED
      const { error: updateError } = await supabaseClient
        .from('deposits')
        .update({
          status: 'CONFIRMED',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
          notes: notes || null
        })
        .eq('id', depositId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Deposit ${depositId} confirmed by admin ${user.email}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Deposit confirmed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'process') {
      // Process: Credit wallet
      const { error: processError } = await supabaseClient.rpc('increment_wallet_balance', {
        p_user_id: deposit.user_id,
        p_amount: deposit.amount
      });

      if (processError) {
        throw processError;
      }

      // Update deposit to PROCESSED
      const { error: updateError } = await supabaseClient
        .from('deposits')
        .update({
          status: 'PROCESSED',
          processed_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Deposit ${depositId} processed - ${deposit.amount} ${deposit.currency} credited to user ${deposit.user_id}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Deposit processed and wallet credited' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'reject') {
      // Reject deposit
      const { error: updateError } = await supabaseClient
        .from('deposits')
        .update({
          status: 'FAILED',
          notes: notes || 'Rejected by admin'
        })
        .eq('id', depositId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Deposit ${depositId} rejected by admin ${user.email}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Deposit rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Admin deposits error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});