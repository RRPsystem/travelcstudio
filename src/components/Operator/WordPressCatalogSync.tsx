import React, { useState } from 'react';
import { Download, RefreshCw, Globe, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SyncResult {
  success: boolean;
  total?: number;
  synced?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  filters?: {
    continents: Array<{
      slug: string;
      name: string;
      countries: Array<{ slug: string; name: string }>;
    }>;
  };
}

export function WordPressCatalogSync() {
  const [wpUrl, setWpUrl] = useState('https://flyendrive.online');
  const [continent, setContinent] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [availableFilters, setAvailableFilters] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const params = new URLSearchParams();
      params.set('wp_url', wpUrl);
      if (continent) params.set('continent', continent);
      if (country) params.set('country', country);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wordpress-catalog-sync?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      setResult(data);

      if (data.filters) {
        setAvailableFilters(data.filters);
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      setResult({
        success: false,
        errors: [err.message],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              WordPress Catalogus Sync
            </h2>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WordPress URL
            </label>
            <input
              type="url"
              value={wpUrl}
              onChange={(e) => setWpUrl(e.target.value)}
              placeholder="https://flyendrive.online"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL van de WordPress site met RBS Travel plugin
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Continent (optioneel)
              </label>
              {availableFilters ? (
                <select
                  value={continent}
                  onChange={(e) => {
                    setContinent(e.target.value);
                    setCountry('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle continenten</option>
                  {availableFilters.continents?.map((c: any) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={continent}
                  onChange={(e) => setContinent(e.target.value)}
                  placeholder="europa"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Land (optioneel)
              </label>
              {availableFilters && continent ? (
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle landen</option>
                  {availableFilters.continents
                    ?.find((c: any) => c.slug === continent)
                    ?.countries?.map((country: any) => (
                      <option key={country.slug} value={country.slug}>
                        {country.name}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="spanje"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={loading || !wpUrl}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Synchroniseren...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Catalogus Synchroniseren</span>
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start space-x-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {result.success ? 'Sync Succesvol' : 'Sync Mislukt'}
              </h3>

              {result.success && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.total || 0}
                      </div>
                      <div className="text-sm text-gray-600">Totaal</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">
                        {result.synced || 0}
                      </div>
                      <div className="text-sm text-gray-600">Nieuw</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600">
                        {result.updated || 0}
                      </div>
                      <div className="text-sm text-gray-600">Bijgewerkt</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-600">
                        {result.skipped || 0}
                      </div>
                      <div className="text-sm text-gray-600">Overgeslagen</div>
                    </div>
                  </div>

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-red-700 mb-2">
                        Fouten ({result.errors.length}):
                      </h4>
                      <ul className="space-y-1 text-sm text-red-600">
                        {result.errors.map((error, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!result.success && result.errors && (
                <div className="space-y-1 text-sm text-red-600">
                  {result.errors.map((error, idx) => (
                    <div key={idx}>{error}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Workflow
        </h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="font-bold mr-2">1.</span>
            <span>WordPress admin markeert reizen via "Toon in TravelC Web Catalogus"</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">2.</span>
            <span>Klik op "Catalogus Synchroniseren" om reizen te importeren</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">3.</span>
            <span>Ga naar "Reizen Catalogus" om geïmporteerde reizen toe te wijzen aan brands</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold mr-2">4.</span>
            <span>Brands kunnen toegewezen reizen accepteren en publiceren</span>
          </li>
        </ol>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">
          Belangrijk
        </h3>
        <p className="text-sm text-amber-800">
          Geïmporteerde reizen zijn NIET automatisch zichtbaar voor brands. Je moet ze handmatig toewijzen via
          <span className="font-semibold"> Operator Dashboard → Reizen Catalogus</span>.
        </p>
      </div>
    </div>
  );
}
