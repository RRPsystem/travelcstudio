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

    const { mollie_payment_id } = await req.json();

    if (!mollie_payment_id) {
      throw new Error('No mollie_payment_id provided');
    }

    console.log('Processing payment:', mollie_payment_id);

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
      .eq('mollie_payment_id', mollie_payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found in database');
    }

    console.log('Current payment status in DB:', payment.status);

    // Get payment status from Mollie
    const mollieResponse = await fetch(
      `https://api.mollie.com/v2/payments/${mollie_payment_id}`,
      {
        headers: {
          'Authorization': `Bearer ${settings.mollie_api_key}`,
        },
      }
    );

    if (!mollieResponse.ok) {
      const errorText = await mollieResponse.text();
      throw new Error(`Failed to get payment from Mollie: ${errorText}`);
    }

    const molliePayment = await mollieResponse.json();
    const newStatus = molliePayment.status;

    console.log('Payment status from Mollie:', newStatus);

    // Update payment status in database
    const { error: updateError } = await supabaseClient
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

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    // If payment is successful, add credits to wallet
    if (newStatus === 'paid' && payment.status !== 'paid') {
      console.log('Payment successful, adding credits:', payment.credits_amount);

      const { data: transactionId, error: addCreditsError } = await supabaseClient
        .rpc('add_credits', {
          p_user_id: payment.user_id,
          p_amount: payment.credits_amount,
          p_description: `Credits gekocht via Mollie (€${payment.amount_eur})`,
          p_metadata: {
            mollie_payment_id: mollie_payment_id,
            payment_id: payment.id,
          },
        });

      if (addCreditsError) {
        console.error('Failed to add credits:', addCreditsError);
        throw new Error(`Failed to add credits: ${addCreditsError.message}`);
      }

      console.log('Credits successfully added to wallet. Transaction ID:', transactionId);

      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          credits_added: payment.credits_amount,
          transaction_id: transactionId,
          message: `${payment.credits_amount} credits toegevoegd!`
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (newStatus === 'paid') {
      return new Response(
        JSON.stringify({
          success: true,
          status: newStatus,
          message: 'Credits waren al toegevoegd'
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: newStatus,
          message: `Betaling status is ${newStatus}, niet 'paid'`
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
