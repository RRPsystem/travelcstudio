import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DnsResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
}

async function verifyDnsTxtRecord(domain: string, expectedToken: string): Promise<{ success: boolean; message: string }> {
  try {
    // Use Cloudflare DNS over HTTPS
    const dnsQuery = `https://cloudflare-dns.com/dns-query?name=_bolt-verify.${domain}&type=TXT`;

    const response = await fetch(dnsQuery, {
      headers: {
        'Accept': 'application/dns-json',
      },
    });

    if (!response.ok) {
      return { success: false, message: 'DNS lookup failed' };
    }

    const data: DnsResponse = await response.json();

    // Check if we got a valid response
    if (data.Status !== 0) {
      return { success: false, message: 'DNS record not found. Make sure you added the TXT record at _bolt-verify.' + domain };
    }

    // Check if Answer exists and has TXT records
    if (!data.Answer || data.Answer.length === 0) {
      return { success: false, message: 'No TXT records found at _bolt-verify.' + domain };
    }

    // Look for our verification token in the TXT records
    // TXT records in DNS responses are often quoted strings
    const found = data.Answer.some(record => {
      if (record.type !== 16) return false; // 16 = TXT record type

      // Remove quotes and whitespace
      const txtValue = record.data.replace(/^\"|\"$/g, '').trim();
      return txtValue === expectedToken;
    });

    if (!found) {
      return {
        success: false,
        message: 'Verification token not found. Make sure the TXT record value exactly matches the token shown in the dashboard.'
      };
    }

    return { success: true, message: 'Domain verified successfully' };

  } catch (error) {
    console.error('DNS verification error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'DNS verification failed'
    };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Parse request body
    const { domain_id } = await req.json();

    if (!domain_id) {
      return new Response(
        JSON.stringify({ error: 'Missing domain_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get domain details from database
    const { data: domain, error: fetchError } = await supabase
      .from('brand_domains')
      .select('id, domain, verification_token, status')
      .eq('id', domain_id)
      .single();

    if (fetchError || !domain) {
      return new Response(
        JSON.stringify({ error: 'Domain not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if already verified
    if (domain.status === 'verified') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Domain is already verified',
          already_verified: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Perform DNS verification
    const verificationResult = await verifyDnsTxtRecord(domain.domain, domain.verification_token);

    if (!verificationResult.success) {
      // Update status to failed
      await supabase
        .from('brand_domains')
        .update({
          status: 'failed',
          last_verification_attempt: new Date().toISOString()
        })
        .eq('id', domain_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: verificationResult.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verification succeeded - update database
    const { error: updateError } = await supabase
      .from('brand_domains')
      .update({
        status: 'verified',
        dns_verified_at: new Date().toISOString(),
        ssl_enabled: true,
        last_verification_attempt: new Date().toISOString()
      })
      .eq('id', domain_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Domain successfully verified! \ud83c\udf89'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in verify-domain function:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});