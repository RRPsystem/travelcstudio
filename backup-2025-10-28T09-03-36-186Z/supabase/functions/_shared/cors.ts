export function withCORS(req: Request, resInit: ResponseInit = {}): Headers {
  const origin = req.headers.get('origin') ?? '*';
  const allowedOrigins = [
    'https://www.ai-websitestudio.nl',
    'https://ai-websitestudio.nl',
    'https://www.ai-travelstudio.nl',
    'https://ai-travelstudio.nl',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000'
  ];

  // Allow any origin that matches our domain patterns or localhost
  const isAllowed = allowedOrigins.includes(origin) ||
                   origin.includes('ai-websitestudio.nl') ||
                   origin.includes('ai-travelstudio.nl') ||
                   origin.includes('localhost') ||
                   origin.includes('127.0.0.1');

  const allowOrigin = isAllowed ? origin : '*';

  const headers = new Headers(resInit.headers || {});
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info');

  return headers;
}
