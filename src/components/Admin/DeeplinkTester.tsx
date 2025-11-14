import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';

interface Page {
  id: string;
  slug: string;
  title: string;
  brand_id: string;
}

export default function DeeplinkTester() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [deeplinkUrl, setDeeplinkUrl] = useState<string>('');
  const [jwtToken, setJwtToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    const { data } = await supabase
      .from('pages')
      .select('id, slug, title, brand_id')
      .limit(10);

    if (data) setPages(data);
  };

  const generateDeeplink = async (page: Page) => {
    setLoading(true);
    setSelectedPage(page);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const wbctxResponse = await fetch(`${supabaseUrl}/functions/v1/wbctx-mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: page.brand_id,
          type: 'page',
          page_id: page.id,
          slug: page.slug,
          ttl_minutes: 60,
          ephemeral: false
        })
      });

      if (!wbctxResponse.ok) {
        const errorData = await wbctxResponse.json();
        throw new Error(errorData.error || 'Failed to generate context');
      }

      const wbctxData = await wbctxResponse.json();
      setJwtToken(wbctxData.ctx.token);
      setDeeplinkUrl(wbctxData.url);
    } catch (error) {
      console.error('Error generating deeplink:', error);
      alert(`Error generating deeplink: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deeplinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard error:', error);
      alert('Kon niet kopiëren naar clipboard. Kopieer handmatig uit het tekstveld.');
    }
  };

  const openInBuilder = () => {
    window.open(deeplinkUrl, '_blank');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Deeplink Generator</h2>
        <p className="text-gray-600">Genereer lange, veilige URLs voor de externe builder</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Step 1: Select a Page</h3>
          <div className="space-y-2">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => generateDeeplink(page)}
                disabled={loading}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  selectedPage?.id === page.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'hover:bg-gray-50 border-gray-200'
                } disabled:opacity-50`}
              >
                <div className="font-medium">{page.title}</div>
                <div className="text-sm text-gray-500">Slug: {page.slug}</div>
              </button>
            ))}
          </div>
          <button
            onClick={loadPages}
            className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Pages
          </button>
        </div>

        {deeplinkUrl && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Step 2: Lange Deeplink URL</h3>
              <p className="text-sm text-gray-600 mb-3">
                Deze URL bevat alle benodigde parameters voor de builder. De JWT token en context zijn ingebouwd.
              </p>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 font-mono text-xs break-all max-h-40 overflow-y-auto">
                {deeplinkUrl}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Gekopieerd!' : 'Kopieer URL'}
                </button>
                <button
                  onClick={openInBuilder}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Builder
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Debug Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Page ID:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedPage?.id}</code>
                </div>
                <div>
                  <span className="font-medium">Slug:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedPage?.slug}</code>
                </div>
                <div>
                  <span className="font-medium">Brand ID:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{selectedPage?.brand_id}</code>
                </div>
                <div>
                  <span className="font-medium">JWT Token:</span>
                  <div className="mt-1 bg-gray-100 p-2 rounded break-all font-mono text-xs">
                    {jwtToken}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">URL Parameters:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ brand_id = {selectedPage?.brand_id}</li>
                <li>✓ page_id = {selectedPage?.id}</li>
                <li>✓ slug = {selectedPage?.slug}</li>
                <li>✓ jwt = [JWT token met authenticatie]</li>
                <li>✓ deeplink = [Context serve URL]</li>
              </ul>
              <p className="text-sm text-blue-700 mt-3">
                Geen korte URLs meer - alle data zit in de query parameters!
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
