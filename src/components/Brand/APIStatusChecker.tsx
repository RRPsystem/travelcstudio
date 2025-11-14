import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Key, X } from 'lucide-react';
import { db } from '../../lib/supabase';

interface APIStatus {
  name: string;
  configured: boolean;
  working: boolean | null;
  message: string;
  keyPreview?: string;
}

export function APIStatusChecker({ onClose }: { onClose: () => void }) {
  const [checking, setChecking] = useState(false);
  const [statuses, setStatuses] = useState<APIStatus[]>([]);

  useEffect(() => {
    checkAPIs();
  }, []);

  const checkAPIs = async () => {
    setChecking(true);
    const results: APIStatus[] = [];

    try {
      const settings = await db.getAPISettings();

      const openaiSettings = settings?.find((s: any) => s.provider === 'OpenAI');
      const googleSearchSettings = settings?.find((s: any) => s.provider === 'Google' && s.service_name === 'Google Custom Search');
      const googleMapsSettings = settings?.find((s: any) => s.provider === 'Google' && s.service_name === 'Google Maps API');

      results.push({
        name: 'OpenAI API',
        configured: !!openaiSettings?.api_key && openaiSettings.api_key.startsWith('sk-'),
        working: null,
        message: openaiSettings?.api_key?.startsWith('sk-')
          ? 'API key gevonden'
          : 'Geen geldige API key',
        keyPreview: openaiSettings?.api_key?.startsWith('sk-')
          ? `${openaiSettings.api_key.substring(0, 10)}...`
          : undefined
      });

      results.push({
        name: 'Google Search API',
        configured: !!googleSearchSettings?.api_key && !googleSearchSettings.api_key.includes('your-'),
        working: null,
        message: googleSearchSettings?.api_key && !googleSearchSettings.api_key.includes('your-')
          ? 'API key gevonden'
          : 'Niet geconfigureerd - AI verzint informatie!',
        keyPreview: googleSearchSettings?.api_key && !googleSearchSettings.api_key.includes('your-')
          ? `${googleSearchSettings.api_key.substring(0, 10)}...`
          : undefined
      });

      results.push({
        name: 'Google Maps API',
        configured: !!googleMapsSettings?.api_key && !googleMapsSettings.api_key.includes('your-'),
        working: null,
        message: googleMapsSettings?.api_key && !googleMapsSettings.api_key.includes('your-')
          ? 'API key gevonden'
          : 'Niet geconfigureerd - Routes worden verzonnen!',
        keyPreview: googleMapsSettings?.api_key && !googleMapsSettings.api_key.includes('your-')
          ? `${googleMapsSettings.api_key.substring(0, 10)}...`
          : undefined
      });

    } catch (error) {
      results.push({
        name: 'Database Connectie',
        configured: false,
        working: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    setStatuses(results);
    setChecking(false);
  };

  const getStatusIcon = (status: APIStatus) => {
    if (!status.configured) {
      return <XCircle className="w-6 h-6 text-red-500" />;
    }
    if (status.working === null) {
      return <AlertCircle className="w-6 h-6 text-yellow-500" />;
    }
    return status.working
      ? <CheckCircle className="w-6 h-6 text-green-500" />
      : <XCircle className="w-6 h-6 text-red-500" />;
  };

  const allConfigured = statuses.every(s => s.configured);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API Status Check</h2>
            <p className="text-sm text-gray-600 mt-1">
              Controleer of Google Maps en Search zijn aangesloten
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!allConfigured && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">
                    Waarschuwing: API's Niet Volledig Geconfigureerd
                  </h3>
                  <p className="text-sm text-orange-800">
                    Zonder Google APIs wordt alle informatie verzonnen door AI.
                    Routes, bestemmingen en actuele info zijn niet betrouwbaar.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {statuses.map((status, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 ${
                  status.configured
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{status.name}</h3>
                      {status.keyPreview && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                          <Key size={12} />
                          <code>{status.keyPreview}</code>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm ${
                      status.configured ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {status.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2">Hoe werkt het?</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong>OpenAI:</strong> Genereert de tekst</li>
                  <li><strong>Google Search:</strong> Haalt actuele reisinformatie op</li>
                  <li><strong>Google Maps:</strong> Geeft echte routes en bestemmingen</li>
                </ul>
                <p className="mt-3 text-blue-600 font-medium">
                  → Ga naar API Settings (Operator rol) om keys in te stellen
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={checkAPIs}
              disabled={checking}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
              <span>Opnieuw Checken</span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
