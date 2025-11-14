import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PlayCircle, CheckCircle, XCircle, Loader, MapPin, Route as RouteIcon, Search, Navigation } from 'lucide-react';

interface TestResult {
  success: boolean;
  apiKeyFound: boolean;
  test: string;
  result?: {
    status: string;
    resultsCount: number;
    firstResult?: any;
    summary: string;
  };
  error?: string;
  details?: any;
}

const tests = [
  { id: 'places-search', name: 'Places Text Search', description: 'Zoek "Eiffel Tower Paris"', icon: Search },
  { id: 'places-nearby', name: 'Places Nearby Search', description: 'Toeristische plekken in Amsterdam', icon: MapPin },
  { id: 'geocoding', name: 'Geocoding API', description: 'Coordinaten van Amsterdam', icon: Navigation },
  { id: 'directions', name: 'Directions API', description: 'Route Amsterdam → Paris', icon: RouteIcon },
];

export function GoogleAPITester() {
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [loading, setLoading] = useState<string | null>(null);

  const runTest = async (testId: string) => {
    setLoading(testId);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-google-places`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ test: testId })
        }
      );

      const result: TestResult = await response.json();
      setTestResults(prev => new Map(prev).set(testId, result));
    } catch (error) {
      console.error('Test error:', error);
      setTestResults(prev => new Map(prev).set(testId, {
        success: false,
        apiKeyFound: false,
        test: testId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    } finally {
      setLoading(null);
    }
  };

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.id);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Google APIs Tester</h3>
          <p className="text-sm text-gray-600">Test verschillende Google Maps APIs</p>
        </div>
        <button
          onClick={runAllTests}
          disabled={loading !== null}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <PlayCircle size={18} />
          <span>Run All Tests</span>
        </button>
      </div>

      <div className="space-y-3">
        {tests.map((test) => {
          const result = testResults.get(test.id);
          const isLoading = loading === test.id;
          const Icon = test.icon;

          return (
            <div
              key={test.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    result?.success ? 'bg-green-100' :
                    result?.error ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    <Icon size={20} className={
                      result?.success ? 'text-green-600' :
                      result?.error ? 'text-red-600' :
                      'text-gray-600'
                    } />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      {isLoading && <Loader size={16} className="animate-spin text-blue-600" />}
                      {result?.success && <CheckCircle size={16} className="text-green-600" />}
                      {result?.error && <XCircle size={16} className="text-red-600" />}
                    </div>
                    <p className="text-sm text-gray-600">{test.description}</p>

                    {result && (
                      <div className="mt-3 space-y-2">
                        {result.success && result.result && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-green-900">✓ {result.result.summary}</p>
                            {result.result.firstResult && (
                              <div className="mt-2 text-xs text-green-800">
                                <p className="font-medium">Eerste resultaat:</p>
                                <p className="truncate">
                                  {result.result.firstResult.name ||
                                   result.result.firstResult.summary ||
                                   result.result.firstResult.formatted_address ||
                                   'Data ontvangen'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {result.error && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-red-900">✗ {result.error}</p>
                            {result.details?.error_message && (
                              <p className="text-xs text-red-700 mt-1">{result.details.error_message}</p>
                            )}
                            {!result.apiKeyFound && (
                              <p className="text-xs text-red-700 mt-1">
                                API key niet gevonden in database
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => runTest(test.id)}
                  disabled={isLoading}
                  className="ml-4 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Test
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {testResults.size > 0 && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Tests uitgevoerd: {testResults.size}/{tests.length}
            </span>
            <span className="text-sm text-gray-600">
              Geslaagd: {Array.from(testResults.values()).filter(r => r.success).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
