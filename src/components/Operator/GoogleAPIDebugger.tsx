import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function GoogleAPIDebugger() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const updateResult = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.name === name);
      const newResult = { name, status, message, details };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      }
      return [...prev, newResult];
    });
  };

  const testGooglePlacesAutocomplete = async () => {
    updateResult('Places Autocomplete', 'pending', 'Testing...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-places-autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ input: 'Amsterdam' })
        }
      );

      const data = await response.json();

      if (response.ok && data.predictions) {
        updateResult('Places Autocomplete', 'success', `Found ${data.predictions.length} suggestions`, data);
      } else {
        updateResult('Places Autocomplete', 'error', data.error || 'API call failed', data);
      }
    } catch (error: any) {
      updateResult('Places Autocomplete', 'error', error.message);
    }
  };

  const testGoogleRoutes = async () => {
    updateResult('Routes API', 'pending', 'Testing route calculation...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-routes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            from: 'Amsterdam',
            to: 'Rotterdam',
            routeType: 'snelle-route',
            includeWaypoints: false
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        updateResult('Routes API', 'success', `Route found: ${data.route?.distance}`, data);
      } else {
        updateResult('Routes API', 'error', data.error || 'Route calculation failed', data);
      }
    } catch (error: any) {
      updateResult('Routes API', 'error', error.message);
    }
  };

  const testGooglePlacesSearch = async () => {
    updateResult('Places Search (New)', 'pending', 'Testing place search...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-google-places`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            latitude: 52.3676,
            longitude: 4.9041,
            query: 'restaurants'
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        updateResult('Places Search (New)', 'success', `Found ${data.places?.length || 0} places`, data);
      } else {
        updateResult('Places Search (New)', 'error', data.error || 'Places search failed', data);
      }
    } catch (error: any) {
      updateResult('Places Search (New)', 'error', error.message);
    }
  };

  const testAPISettings = async () => {
    updateResult('API Settings', 'pending', 'Checking API key configuration...');
    try {
      const { data, error } = await supabase
        .from('api_settings')
        .select('provider, service_name, api_key')
        .eq('provider', 'Google')
        .eq('service_name', 'Google Maps API')
        .maybeSingle();

      if (error) throw error;

      if (data && data.api_key) {
        const keyPreview = `${data.api_key.substring(0, 10)}...${data.api_key.substring(data.api_key.length - 4)}`;
        updateResult('API Settings', 'success', `API key configured: ${keyPreview}`, data);
      } else {
        updateResult('API Settings', 'error', 'No API key found in database');
      }
    } catch (error: any) {
      updateResult('API Settings', 'error', error.message);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    await testAPISettings();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGooglePlacesAutocomplete();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGoogleRoutes();
    await new Promise(resolve => setTimeout(resolve, 500));

    await testGooglePlacesSearch();

    setTesting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Google API Debugger</h2>

      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={testing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Run All Tests'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.name}
            className={`p-4 rounded-lg border-2 ${
              result.status === 'pending'
                ? 'border-yellow-300 bg-yellow-50'
                : result.status === 'success'
                ? 'border-green-300 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{result.name}</h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.status === 'pending'
                    ? 'bg-yellow-200 text-yellow-800'
                    : result.status === 'success'
                    ? 'bg-green-200 text-green-800'
                    : 'bg-red-200 text-red-800'
                }`}
              >
                {result.status.toUpperCase()}
              </span>
            </div>

            <p className="text-gray-700 mb-2">{result.message}</p>

            {result.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Click "Run All Tests" to start debugging Google APIs
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-2">Expected Configuration</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>✅ Google Maps API key opgeslagen in database</li>
          <li>✅ HTTP referrers: <code>*.supabase.co/*</code> en je eigen domeinen</li>
          <li>✅ Enabled APIs: Places API (New), Routes API, Directions API</li>
          <li>✅ Billing enabled in Google Cloud Console</li>
        </ul>
      </div>
    </div>
  );
}
