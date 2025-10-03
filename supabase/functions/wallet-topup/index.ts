import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  console.log('Wallet topup function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get country from Cloudflare header
    const country = req.headers.get("cf-ipcountry");
    console.log('Request from country:', country);
    
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Geo-blocking: Block India, South Africa, and Nigeria
    const blockedCountries = ['IN', 'ZA', 'NG'];
    if (country && blockedCountries.includes(country)) {
      console.log(`Access denied for blocked country: ${country}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This service is not available in your country' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Only allow Uganda
    if (country && country !== "UG") {
      console.log(`Access denied for country: ${country}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This service is only available in Uganda' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { user_id, phone, amount } = await req.json();
    
    console.log('Topup request:', { user_id, phone, amount });
    
    // Validate input
    if (!user_id || !phone || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid input: user_id, phone, and positive amount required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .eq('currency', 'USD')
      .single();

    if (walletError) {
      console.error('Wallet fetch error:', walletError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch wallet information' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id,
        wallet_id: wallet.id,
        amount: parseFloat(amount),
        transaction_type: 'topup',
        description: `Top-up via mobile ${phone}`,
        phone_number: phone,
        status: 'pending'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create transaction record' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simulate payment processing (in real app, integrate with payment provider)
    // For demo purposes, we'll assume success after a brief delay
    const isPaymentSuccessful = Math.random() > 0.1; // 90% success rate

    if (isPaymentSuccessful) {
      // Update wallet balance
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('Wallet update error:', updateError);
        
        // Update transaction status to failed
        await supabase
          .from('wallet_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to update wallet balance' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update transaction status to completed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      console.log('Topup successful:', { newBalance, transactionId: transaction.id });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          balance: newBalance,
          transaction_id: transaction.id,
          message: `Successfully topped up $${amount}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Payment failed
      await supabase
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment processing failed. Please try again.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in wallet-topup function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});