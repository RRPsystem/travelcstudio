import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyAndConsumeInitialToken } from '../_shared/jwt.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    console.log('[Exchange Token] Processing token exchange request');

    const { payload, sessionToken } = await verifyAndConsumeInitialToken(req);

    console.log('[Exchange Token] Token exchanged successfully', {
      session_id: payload.session_id,
      token_type: payload.token_type,
      has_new_token: !!sessionToken
    });

    const response: any = {
      success: true,
      brand_id: payload.brand_id,
      user_id: payload.sub || payload.user_id,
      session_id: payload.session_id
    };

    if (sessionToken) {
      response.session_token = sessionToken;
      response.message = "Initial token consumed. Use session_token for subsequent requests.";
    } else {
      response.message = "Session token validated.";
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[Exchange Token] Error:', error);

    let statusCode = 400;
    let errorMessage = error.message;

    if (error.message.includes('already used') || error.message.includes('only be used once')) {
      statusCode = 403;
      errorMessage = '🔒 This URL has already been used and is no longer valid. Please request a new editor link.';
    } else if (error.message.includes('expired')) {
      statusCode = 401;
      errorMessage = '⏱️ This session has expired. Please request a new editor link.';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = '❌ Session not found. Please request a new editor link.';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: error.message
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
