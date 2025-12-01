import { createRemoteJWKSet, jwtVerify, SignJWT } from "npm:jose@5";
import { createClient } from 'npm:@supabase/supabase-js@2';

export interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scopes?: string[];
  session_id?: string;
  token_type?: 'initial' | 'session';
  iat?: number;
  exp?: number;
}

export async function verifyBearerToken(req: Request): Promise<JWTPayload> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.substring(7);
  const jwtSecret = Deno.env.get("JWT_SECRET");

  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(jwtSecret);

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.brand_id) {
      throw new Error("Invalid token: missing brand_id");
    }

    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

export async function verifyAndConsumeInitialToken(req: Request): Promise<{ payload: JWTPayload; sessionToken: string }> {
  const payload = await verifyBearerToken(req);

  if (!payload.session_id) {
    throw new Error('Invalid token: missing session_id');
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: session, error: sessionError } = await serviceClient
    .from('builder_sessions')
    .select('*')
    .eq('id', payload.session_id)
    .maybeSingle();

  if (sessionError || !session) {
    throw new Error('Session not found');
  }

  if (new Date(session.expires_at) < new Date()) {
    throw new Error('Session expired');
  }

  if (payload.token_type === 'initial') {
    if (session.initial_token_used) {
      throw new Error('Initial token already used. URL can only be used once.');
    }

    const sessionToken = crypto.randomUUID();
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      throw new Error("JWT_SECRET not configured");
    }

    const encoder = new TextEncoder();
    const secretKey = encoder.encode(jwtSecret);

    const newSessionJWT = await new SignJWT({
      ...payload,
      token_type: 'session',
      session_token: sessionToken
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(secretKey);

    const { error: updateError } = await serviceClient
      .from('builder_sessions')
      .update({
        initial_token_used: true,
        session_token: sessionToken,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', payload.session_id);

    if (updateError) {
      throw new Error('Failed to consume initial token');
    }

    return { payload, sessionToken: newSessionJWT };
  } else if (payload.token_type === 'session') {
    if (!payload.session_token || session.session_token !== payload.session_token) {
      throw new Error('Invalid session token');
    }

    await serviceClient
      .from('builder_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', payload.session_id);

    return { payload, sessionToken: '' };
  }

  throw new Error('Invalid token type');
}