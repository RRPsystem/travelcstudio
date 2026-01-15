import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePaymentRequest {
  amount_eur: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { amount_eur }: CreatePaymentRequest = await req.json();

    if (!amount_eur || amount_eur <= 0) {
      throw new Error('Invalid amount');
    }

    // Get system settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('credit_system_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      throw new Error('Credit system not configured');
    }

    if (!settings.enabled) {
      throw new Error('Credit system is disabled');
    }

    if (amount_eur < settings.minimum_purchase_eur) {
      throw new Error(`Minimum purchase is €${settings.minimum_purchase_eur}`);
    }

    if (!settings.mollie_api_key) {
      throw new Error('Mollie API key not configured');
    }

    // Calculate credits
    const credits_amount = Math.floor(amount_eur * settings.credits_per_euro);

    // Get or create wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .rpc('get_or_create_wallet', { p_user_id: user.id });

    if (walletError) {
      throw new Error(`Failed to get wallet: ${walletError.message}`);
    }

    // Get user details for payment description
    const { data: userData } = await supabaseClient
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    // Create Mollie payment
    const mollieResponse = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.mollie_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: 'EUR',
          value: amount_eur.toFixed(2),
        },
        description: `${credits_amount} credits voor ${userData?.email || user.email}`,
        redirectUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mollie-payment-redirect?user_id=${user.id}`,
        webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mollie-webhook`,
        metadata: {
          user_id: user.id,
          wallet_id: wallet,
          credits_amount: credits_amount.toString(),
        },
      }),
    });

    if (!mollieResponse.ok) {
      const errorText = await mollieResponse.text();
      throw new Error(`Mollie API error: ${errorText}`);
    }

    const molliePayment = await mollieResponse.json();

    // Store payment in database
    const { data: payment, error: paymentError } = await supabaseClient
      .from('mollie_payments')
      .insert({
        wallet_id: wallet,
        user_id: user.id,
        mollie_payment_id: molliePayment.id,
        amount_eur: amount_eur,
        credits_amount: credits_amount,
        status: 'pending',
        payment_url: molliePayment._links.checkout.href,
        metadata: {
          mollie_payment: molliePayment,
        },
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to store payment: ${paymentError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        mollie_payment_id: molliePayment.id,
        payment_url: molliePayment._links.checkout.href,
        amount_eur: amount_eur,
        credits_amount: credits_amount,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
