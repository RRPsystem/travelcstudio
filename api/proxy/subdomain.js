const https = require('https');

module.exports = async (req, res) => {
  console.log('[PROXY] Starting request handler');

  try {
    const host = req.headers.host || '';
    let pathname = req.url || '/';

    console.log('[PROXY] Raw request:', { host, pathname, headers: req.headers });

    // Remove /api/proxy/subdomain prefix if present
    if (pathname.startsWith('/api/proxy/subdomain')) {
      pathname = pathname.replace('/api/proxy/subdomain', '') || '/';
    }

    // Extract subdomain
    const subdomain = host.split('.')[0];

    console.log('[PROXY] Parsed:', { host, subdomain, pathname });

    // Reject invalid subdomains (main app domains)
    const invalidSubdomains = ['www', 'app', 'ai-travelstudio', 'localhost'];
    if (!host.includes('.ai-travelstudio.nl') || invalidSubdomains.includes(subdomain)) {
      console.log('[PROXY] Invalid subdomain, passing through to main app');
      return res.status(404).send('Not a valid subdomain website');
    }

    // Build target URL manually to avoid URL constructor issues
    let targetUrl = `https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/website-viewer${pathname}`;
    targetUrl += `?subdomain=${encodeURIComponent(subdomain)}`;

    console.log('[PROXY] Target URL:', targetUrl);

    // Use native https module for compatibility
    const htmlResponse = await new Promise((resolve, reject) => {
      https.get(targetUrl, {
        headers: {
          'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
        },
      }, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, html: data }));
      }).on('error', reject);
    });

    console.log('[PROXY] Response status:', htmlResponse.status);

    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.setHeader(
      'Content-Security-Policy',
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *;"
    );

    return res.status(htmlResponse.status).send(htmlResponse.html);
  } catch (error) {
    console.error('[PROXY] Error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; text-align: center;">
          <h1>Error loading website</h1>
          <p>${error.message || 'Unknown error'}</p>
          <p style="color: #666; font-size: 0.9rem;">Host: ${req.headers.host}</p>
        </body>
      </html>
    `);
  }
};
