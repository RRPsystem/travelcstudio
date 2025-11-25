import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const host = req.headers.host || '';
    const pathname = (req.url || '/').replace('/api/proxy/subdomain', '/');

    console.log('[PROXY] Host:', host, 'Path:', pathname);

    // Extract subdomain
    const subdomain = host.split('.')[0];

    // Reject invalid subdomains (main app domains)
    const invalidSubdomains = ['www', 'app', 'ai-travelstudio', 'localhost'];
    if (!host.includes('.ai-travelstudio.nl') || invalidSubdomains.includes(subdomain)) {
      console.log('[PROXY] Invalid subdomain, passing through to main app');
      // Return empty response, let Vercel handle it with next rewrite
      return res.status(404).send('Not a valid subdomain website');
    }

    const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
    const targetUrl = `${supabaseUrl}/functions/v1/website-viewer${pathname}`;

    console.log('[PROXY] Fetching:', targetUrl);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'host': host,
        'user-agent': req.headers['user-agent'] || '',
        'x-forwarded-host': host,
      },
    });

    const html = await response.text();

    console.log('[PROXY] Response status:', response.status);

    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.setHeader(
      'Content-Security-Policy',
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *;"
    );

    res.status(response.status).send(html);
  } catch (error) {
    console.error('[PROXY] Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; text-align: center;">
          <h1>Error loading website</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p style="color: #666; font-size: 0.9rem;">Host: ${req.headers.host}</p>
        </body>
      </html>
    `);
  }
}
