import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${requestId}] 🟢 Request received:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] ✅ OPTIONS request - returning CORS headers`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log(`[${requestId}] 📦 Parsing request body...`);
    const body = await req.json();
    console.log(`[${requestId}] 📦 Body parsed:`, body);

    const { pdfUrl } = body;

    if (!pdfUrl) {
      console.log(`[${requestId}] ❌ No PDF URL provided`);
      return new Response(
        JSON.stringify({ 
          error: "PDF URL is required",
          debug: { requestId, received: body }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] 🔐 Creating Supabase client...`);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    console.log(`[${requestId}] ✅ Supabase client created`);

    // Get user from auth token
    const authHeader = req.headers.get('Authorization');
    console.log(`[${requestId}] 🔐 Auth header present:`, !!authHeader);
    
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      console.log(`[${requestId}] 🔐 Extracting token...`);
      const token = authHeader.substring(7);
      console.log(`[${requestId}] 🔐 Token length:`, token.length);
      
      console.log(`[${requestId}] 🔐 Getting user from token...`);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError) {
        console.log(`[${requestId}] ❌ Auth error:`, authError);
      }
      
      userId = user?.id || null;
      console.log(`[${requestId}] 🔐 User ID:`, userId);
    }

    if (!userId) {
      console.log(`[${requestId}] ❌ No user ID - authentication failed`);
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          debug: { requestId, hasAuthHeader: !!authHeader }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] ✅ Authenticated user:`, userId);

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ⏱️ Processing took ${duration}ms`);

    // For now, return success without actual PDF parsing
    const response = {
      success: true,
      message: "PDF parsing not yet implemented - returning mock data",
      debug: {
        requestId,
        userId,
        pdfUrl,
        processingTime: `${duration}ms`
      },
      trip_name: "Test Trip",
      reservation_id: "TEST123",
      departure_date: "2026-06-01",
      arrival_date: "2026-06-15",
      destination: { city: "Cape Town", country: "South Africa", region: "Western Cape" },
      segments: [],
      itinerary: []
    };

    console.log(`[${requestId}] ✅ Returning success response`);
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ ERROR after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        debug: {
          requestId,
          errorName: error.name,
          stack: error.stack?.substring(0, 500),
          processingTime: `${duration}ms`
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});