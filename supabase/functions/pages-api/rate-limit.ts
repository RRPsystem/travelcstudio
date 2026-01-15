interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private clients: Map<string, ClientRecord> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: number;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
    this.config = config;
    this.cleanupInterval = setInterval(() => this.cleanup(), config.windowMs);
  }

  check(clientId: string): void {
    const now = Date.now();
    const client = this.clients.get(clientId);

    if (!client) {
      this.clients.set(clientId, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return;
    }

    if (now > client.resetTime) {
      client.count = 1;
      client.resetTime = now + this.config.windowMs;
      return;
    }

    if (client.count >= this.config.maxRequests) {
      const error = new Error(`Rate limit exceeded. Max ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s`);
      (error as any).statusCode = 429;
      (error as any).retryAfter = Math.ceil((client.resetTime - now) / 1000);
      throw error;
    }

    client.count++;
  }

  getInfo(clientId: string): { limit: number; remaining: number; reset: number } {
    const client = this.clients.get(clientId);
    const now = Date.now();

    if (!client || now > client.resetTime) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        reset: Math.ceil((now + this.config.windowMs) / 1000)
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - client.count),
      reset: Math.ceil(client.resetTime / 1000)
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [clientId, client] of this.clients.entries()) {
      if (now > client.resetTime) {
        this.clients.delete(clientId);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clients.clear();
  }
}

export function getClientId(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `ua-${userAgent.substring(0, 50)}`;
}

export function addRateLimitHeaders(
  headers: Headers,
  info: { limit: number; remaining: number; reset: number }
): Headers {
  const newHeaders = new Headers(headers);
  newHeaders.set('X-RateLimit-Limit', info.limit.toString());
  newHeaders.set('X-RateLimit-Remaining', info.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', info.reset.toString());
  return newHeaders;
}