import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

export interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scopes?: string[];
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