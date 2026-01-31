import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ClientInterface } from './ClientInterface';
import { Loader, AlertCircle, MessageCircle } from 'lucide-react';

export function DemoInterface() {
  const [loading, setLoading] = useState(true);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDemoTrip();
  }, []);

  const loadDemoTrip = async () => {
    try {
      setLoading(true);
      // Find first active trip to use as demo
      const { data, error } = await supabase
        .from('travel_trips')
        .select('share_token, name')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.share_token) {
        setDemoToken(data.share_token);
      } else {
        setError('Geen actieve trips gevonden. Maak eerst een trip aan via Brand Dashboard.');
      }
    } catch (err) {
      console.error('Failed to load demo trip:', err);
      setError('Kon geen demo trip laden. Probeer het later opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Demo wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !demoToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Demo niet beschikbaar</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Hoe TravelBro te gebruiken:</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li>1. Login als Operator of Brand</li>
              <li>2. Ga naar TravelBro Setup</li>
              <li>3. Maak een nieuwe trip aan</li>
              <li>4. Gebruik de share link om de chat te openen</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">TravelBro Demo</h1>
              <p className="text-sm text-gray-600">Interactieve reis-assistent</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">
            Token: {demoToken}
          </div>
        </div>
      </div>
      <ClientInterface shareToken={demoToken} />
    </div>
  );
}
