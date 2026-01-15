import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "domain parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try to find brand by checking brand_domains table
    const { data: domainData, error: domainError } = await supabase
      .from("brand_domains")
      .select(`
        brand_id,
        brands!inner (
          id,
          name
        )
      `)
      .or(`custom_domain.eq.${domain},subdomain.eq.${domain}`)
      .eq("is_verified", true)
      .maybeSingle();

    if (domainError) {
      console.error("Error fetching brand by domain:", domainError);
      throw new Error(`Failed to fetch brand: ${domainError.message}`);
    }

    if (domainData && domainData.brands) {
      return new Response(
        JSON.stringify({
          brand_id: domainData.brand_id,
          brand_name: domainData.brands.name,
          found_via: "domain_lookup"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If not found by exact domain, try to find by domain containing the search term
    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("id, name")
      .or(`website.ilike.%${domain}%,name.ilike.%${domain}%`)
      .limit(1)
      .maybeSingle();

    if (brandError) {
      console.error("Error fetching brand by website:", brandError);
      throw new Error(`Failed to fetch brand: ${brandError.message}`);
    }

    if (brandData) {
      return new Response(
        JSON.stringify({
          brand_id: brandData.id,
          brand_name: brandData.name,
          found_via: "fuzzy_match",
          notice: "Found by fuzzy match. Please verify this is the correct brand."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "No brand found for this domain",
        domain: domain,
        suggestion: "Make sure the domain is registered in the brand_domains table or brand website field"
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in get-brand-by-domain function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
