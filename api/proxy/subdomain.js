export default async function handler(req, res) {
  try {
    const host = req.headers.host || '';
    const pathname = req.url || '/';

    console.log('[PROXY] Request:', { host, pathname });

    // Extract subdomain
    const subdomain = host.split('.')[0];

    // Build Supabase Edge Function URL
    const supabaseUrl = `https://wlyghhxrsjgdnjqvlxmi.supabase.co/functions/v1/website-viewer${pathname}`;
    const targetUrl = `${supabaseUrl}?subdomain=${encodeURIComponent(subdomain)}`;

    console.log('[PROXY] Fetching:', targetUrl);

    // Fetch HTML from Supabase Edge Function
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
      },
    });

    let html = await response.text();

    console.log('[PROXY] Response status:', response.status);

    // Inject navigation fix script at the top of <head>
    const navigationFix = `
<script>
console.log('[PROXY FIX] Intercepting all navigation...');

// Store the original pushState and replaceState
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

// Override pushState
history.pushState = function() {
  originalPushState.apply(this, arguments);
  console.log('[PROXY FIX] pushState intercepted');
};

// Override replaceState
history.replaceState = function() {
  originalReplaceState.apply(this, arguments);
  console.log('[PROXY FIX] replaceState intercepted');
};

// Intercept ALL clicks on links VERY early
document.addEventListener('click', function(e) {
  const link = e.target.closest('a');
  if (link && link.href) {
    const linkUrl = new URL(link.href, window.location.href);
    const currentHost = window.location.host;

    // Only intercept same-domain links
    if (linkUrl.host === currentHost) {
      console.log('[PROXY FIX] Intercepted link:', link.href);

      // Prevent default and manually navigate
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Navigate to the pathname only (stay on same domain)
      window.location.href = linkUrl.pathname + linkUrl.search + linkUrl.hash;
      return false;
    }
  }
}, true); // USE CAPTURE PHASE!

console.log('[PROXY FIX] ✅ Navigation interceptor installed!');
</script>`;

    // Inject at the start of <head>
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + navigationFix);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', '<HEAD>' + navigationFix);
    }

    // Send response WITHOUT any CSP header (completely disable CSP)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

    // Explicitly remove any CSP headers
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    res.removeHeader('X-WebKit-CSP');

    res.status(response.status).send(html);
  } catch (error) {
    console.error('[PROXY] Error:', error);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.removeHeader('Content-Security-Policy');

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Proxy Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; text-align: center;">
          <h1>Error loading website</h1>
          <p>${error.message || 'Unknown error'}</p>
          <p style="color: #666; font-size: 0.9rem;">Host: ${req.headers.host}</p>
        </body>
      </html>
    `);
  }
}
