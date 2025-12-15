import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { id: molliePaymentId } = await req.json();

    if (!molliePaymentId) {
      throw new Error('No payment ID provided');
    }

    console.log('Mollie webhook received for payment:', molliePaymentId);

    // Get system settings for API key
    const { data: settings, error: settingsError } = await supabaseClient
      .from('credit_system_settings')
      .select('mollie_api_key')
      .single();

    if (settingsError || !settings?.mollie_api_key) {
      throw new Error('Mollie API key not configured');
    }

    // Get payment from our database
    const { data: payment, error: paymentError } = await supabaseClient
      .from('mollie_payments')
      .select('*')
      .eq('mollie_payment_id', molliePaymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found in database');
    }

    // Get payment status from Mollie
    const mollieResponse = await fetch(
      `https://api.mollie.com/v2/payments/${molliePaymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${settings.mollie_api_key}`,
        },
      }
    );

    if (!mollieResponse.ok) {
      throw new Error('Failed to get payment from Mollie');
    }

    const molliePayment = await mollieResponse.json();
    const newStatus = molliePayment.status;

    console.log('Payment status from Mollie:', newStatus);

    // Update payment status in database
    await supabaseClient
      .from('mollie_payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          mollie_payment: molliePayment,
        },
      })
      .eq('id', payment.id);

    // If payment is successful, add credits to wallet
    if (newStatus === 'paid' && payment.status !== 'paid') {
      console.log('Payment successful, adding credits:', payment.credits_amount);

      const { error: addCreditsError } = await supabaseClient
        .rpc('add_credits', {
          p_user_id: payment.user_id,
          p_amount: payment.credits_amount,
          p_description: `Credits gekocht via Mollie (€${payment.amount_eur})`,
          p_metadata: {
            mollie_payment_id: molliePaymentId,
            payment_id: payment.id,
          },
        });

      if (addCreditsError) {
        console.error('Failed to add credits:', addCreditsError);
        throw new Error(`Failed to add credits: ${addCreditsError.message}`);
      }

      console.log('Credits successfully added to wallet');
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
