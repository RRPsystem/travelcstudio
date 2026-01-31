import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface TestResult {
  success: boolean;
  api?: string;
  status?: string;
  error?: string;
  message?: string;
  issue?: string;
  fix?: string;
  testRoute?: string;
  resultsFound?: number;
  responseTime?: string;
}

interface HealthCheckResponse {
  success: boolean;
  timestamp: string;
  tests: {
    geocoding: TestResult;
    directions: TestResult;
    places: TestResult;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  recommendations: string[];
}

export function GoogleAPIHealthCheck() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setTesting(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('test-google-api-health');

      if (fetchError) throw fetchError;

      setResults(data);
    } catch (err: any) {
      console.error('Health check error:', err);
      setError(err.message || 'Failed to run health check');
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (success: boolean) => {
    return success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Google API Health Check</h2>
          <p className="text-gray-600 mt-1">
            Test alle Google Maps APIs om te controleren of ze werken vanaf deze locatie
          </p>
        </div>

        <button
          onClick={runHealthCheck}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Health Check
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className={`border rounded-lg p-6 ${getStatusBg(results.success)}`}>
            <div className="flex items-start gap-4">
              {results.success ? (
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${getStatusColor(results.success)}`}>
                  {results.success ? '✅ All APIs Working' : '❌ Some APIs Failed'}
                </h3>
                <p className="text-gray-700 mt-1">
                  {results.summary.passed} van {results.summary.total} tests geslaagd
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Getest op: {new Date(results.timestamp).toLocaleString('nl-NL')}
                </p>
              </div>
            </div>
          </div>

          {/* Individual Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Geocoding */}
            <TestCard title="Geocoding API" result={results.tests.geocoding} />

            {/* Directions */}
            <TestCard title="Directions API" result={results.tests.directions} />

            {/* Places */}
            <TestCard title="Places API" result={results.tests.places} />
          </div>

          {/* Recommendations */}
          {results.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-4">📋 Aanbevelingen</h3>
              <div className="space-y-2">
                {results.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`${
                      rec.startsWith('→') ? 'ml-6 text-blue-700' : 'font-semibold text-blue-900'
                    }`}
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Error Info */}
          {!results.success && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">🔍 Gedetailleerde Errors</h3>
              <div className="space-y-4">
                {!results.tests.geocoding.success && (
                  <ErrorDetail title="Geocoding API" result={results.tests.geocoding} />
                )}
                {!results.tests.directions.success && (
                  <ErrorDetail title="Directions API" result={results.tests.directions} />
                )}
                {!results.tests.places.success && (
                  <ErrorDetail title="Places API" result={results.tests.places} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-bold text-gray-900 mb-3">💡 Veelvoorkomende Problemen</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <strong>Werkt thuis wel, maar niet op andere locatie?</strong>
            <p className="mt-1">
              → Waarschijnlijk heeft je Google API key IP of domain restrictions.
              <br />
              → Fix: Google Cloud Console → Credentials → Zet restrictions op "None"
            </p>
          </div>
          <div>
            <strong>REQUEST_DENIED error?</strong>
            <p className="mt-1">
              → API key restrictions of API niet enabled
              <br />
              → Fix: Enable alle Maps APIs in Google Cloud Console
            </p>
          </div>
          <div>
            <strong>OVER_QUERY_LIMIT error?</strong>
            <p className="mt-1">
              → Je hebt rate limits bereikt
              <br />
              → Fix: Wacht 1 uur of verhoog quota
            </p>
          </div>
          <div>
            <strong>Timeout errors?</strong>
            <p className="mt-1">
              → Slechte internet verbinding
              <br />
              → Fix: Test vanaf andere netwerk (bijv. 4G hotspot)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCard({ title, result }: { title: string; result: TestResult }) {
  const isSuccess = result.success;

  return (
    <div className={`border rounded-lg p-4 ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${isSuccess ? 'text-green-900' : 'text-red-900'}`}>
            {title}
          </h4>
          <p className={`text-sm mt-1 ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
            {result.message || result.error || result.status}
          </p>
          {result.testRoute && (
            <p className="text-xs text-green-600 mt-2">{result.testRoute}</p>
          )}
          {result.resultsFound !== undefined && (
            <p className="text-xs text-green-600 mt-2">{result.resultsFound} results gevonden</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorDetail({ title, result }: { title: string; result: TestResult }) {
  return (
    <div className="bg-white border border-red-200 rounded-lg p-4">
      <h4 className="font-semibold text-red-900">{title}</h4>
      {result.status && (
        <p className="text-sm text-gray-700 mt-1">
          <strong>Status:</strong> {result.status}
        </p>
      )}
      {result.error && (
        <p className="text-sm text-red-700 mt-1">
          <strong>Error:</strong> {result.error}
        </p>
      )}
      {result.issue && (
        <p className="text-sm text-gray-700 mt-2">
          <strong>Probleem:</strong> {result.issue}
        </p>
      )}
      {result.fix && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm font-semibold text-blue-900">Fix:</p>
          <pre className="text-xs text-blue-700 mt-1 whitespace-pre-wrap">{result.fix}</pre>
        </div>
      )}
    </div>
  );
}
