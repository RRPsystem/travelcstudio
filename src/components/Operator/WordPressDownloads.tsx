import React, { useState } from 'react';
import { Download, FileCode, Check, AlertCircle } from 'lucide-react';

const PLUGIN_VERSION = '1.0.0';
const PLUGIN_LAST_UPDATE = '2024-12-11';

export function WordPressDownloads() {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    setDownloadSuccess(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-plugin`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-news-plugin.php';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">WordPress Downloads</h2>
        <p className="text-gray-600 mt-1">Download WordPress plugins en integraties</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileCode className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">AI News Integration Plugin</h3>
                <p className="text-sm text-gray-600 mt-1">
                  WordPress plugin voor het tonen van AI-gegenereerde nieuwsberichten uit Supabase
                </p>
                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                  <span>Versie: {PLUGIN_VERSION}</span>
                  <span>•</span>
                  <span>Laatst bijgewerkt: {PLUGIN_LAST_UPDATE}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Features:</h4>
          <ul className="space-y-2 text-sm text-gray-600 mb-6">
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Shortcodes voor nieuws lijst, grid en individuele berichten</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Cache management voor betere performance</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Automatische styling met responsive design</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Featured images, tags en publicatiedatum support</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Configureerbare API URL en Brand ID</span>
            </li>
          </ul>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloaden...' : 'Download Plugin'}</span>
            </button>

            {downloadSuccess && (
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Download succesvol!</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-blue-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Installatie instructies:</h4>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Download het plugin bestand (ai-news-plugin.php)</li>
            <li>Log in op je WordPress admin dashboard</li>
            <li>Ga naar Plugins → Add New → Upload Plugin</li>
            <li>Upload het gedownloade bestand en activeer de plugin</li>
            <li>Ga naar Settings → AI News en configureer de API URL en Brand ID</li>
            <li>Gebruik de shortcodes in je pagina's of posts</li>
          </ol>
        </div>

        <div className="p-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Beschikbare shortcodes:</h4>
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-list limit="10" offset="0"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon lijst van nieuwsberichten</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-grid limit="6" columns="3"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon nieuws in grid layout (columns: 2, 3 of 4)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news id="xxx"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon specifiek nieuwsbericht (volledig artikel)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-title id="xxx"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon alleen titel van een nieuwsbericht</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-excerpt id="xxx"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon alleen excerpt (korte samenvatting)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-content id="xxx"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon alleen content (volledige tekst)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-image id="xxx"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon alleen featured image</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-date id="xxx" format="d-m-Y"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon publicatiedatum (format optioneel: d-m-Y, Y-m-d, etc.)</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <code className="text-sm text-purple-600">[ai-news-tags id="xxx"]</code>
              <p className="text-xs text-gray-600 mt-1">Toon tags van een nieuwsbericht</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
