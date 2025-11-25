import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const host = req.headers.host || '';
    const pathname = (req.url || '/').replace('/subdomain.html', '/');

    console.log('[PROXY] Host:', host, 'Path:', pathname);

    const supabaseUrl = 'https://huaaogdxxdcakxryecnw.supabase.co';
    const targetUrl = `${supabaseUrl}/functions/v1/website-viewer${pathname}`;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'host': host,
        'user-agent': req.headers['user-agent'] || '',
      },
    });

    const html = await response.text();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

    res.status(response.status).send(html);
  } catch (error) {
    console.error('[PROXY] Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error loading website</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
}
