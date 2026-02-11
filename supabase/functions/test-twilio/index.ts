import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { accountSid, authToken, whatsappNumber } = await req.json();

    // Trim whitespace from credentials
    const cleanAccountSid = accountSid?.trim();
    const cleanAuthToken = authToken?.trim();

    if (!cleanAccountSid || !cleanAuthToken) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Account SID en Auth Token zijn verplicht'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test 1: Verify account exists
    const accountUrl = `https://api.twilio.com/2010-04-01/Accounts/${cleanAccountSid}.json`;
    const authHeader = 'Basic ' + btoa(`${cleanAccountSid}:${cleanAuthToken}`);

    console.log('Testing Twilio account:', cleanAccountSid);
    console.log('Auth token length:', cleanAuthToken.length);

    const accountResponse = await fetch(accountUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      let errorDetails = 'Onbekende fout';

      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.message || errorJson.error?.message || errorText;
        console.error('Twilio error response:', errorJson);
      } catch {
        errorDetails = errorText;
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: `\u274c Verbinding mislukt (${accountResponse.status})`,
          details: errorDetails,
          debug: {
            accountSid: cleanAccountSid.substring(0, 8) + '...',
            tokenLength: cleanAuthToken.length,
            statusCode: accountResponse.status,
            originalTokenLength: authToken?.length,
            hadWhitespace: authToken !== cleanAuthToken
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accountData = await accountResponse.json();
    console.log('Account verified:', accountData.friendly_name);

    // Test 2: Check WhatsApp capability if number provided
    let whatsappStatus = 'Niet getest';
    if (whatsappNumber) {
      const numbersUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const numbersResponse = await fetch(numbersUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      if (numbersResponse.ok) {
        const numbersData = await numbersResponse.json();
        const hasNumbers = numbersData.incoming_phone_numbers?.length > 0;
        whatsappStatus = hasNumbers
          ? `Gevonden: ${numbersData.incoming_phone_numbers.length} nummer(s)`
          : 'Gebruik WhatsApp Sandbox voor testen';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '\u2705 Verbinding succesvol! Twilio credentials werken correct.',
        details: `Account: ${accountData.friendly_name || accountSid}`,
        whatsappStatus,
        accountStatus: accountData.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error testing Twilio:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `\u274c Fout bij testen: ${error.message}`,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});