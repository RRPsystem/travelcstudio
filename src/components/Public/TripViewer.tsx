import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TripViewerProps {
  shareToken: string;
}

export function TripViewer({ shareToken }: TripViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [shareToken]);

  const loadTrip = async (enteredPassword?: string) => {
    setLoading(true);
    setError(null);
    setPasswordError(false);

    try {
      const { data: trip, error: fetchError } = await supabase
        .from('trips')
        .select('id, title, content, share_settings')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!trip) {
        setError('Deze reis is niet (meer) beschikbaar');
        setLoading(false);
        return;
      }

      // Check password protection
      if (trip.share_settings?.password_protected) {
        if (!enteredPassword) {
          setPasswordRequired(true);
          setLoading(false);
          return;
        }
        if (trip.share_settings.password !== enteredPassword) {
          setPasswordError(true);
          setLoading(false);
          return;
        }
      }

      // Check if we have HTML content from the builder
      if (!trip.content?.html) {
        setError('Deze reis heeft nog geen inhoud');
        setLoading(false);
        return;
      }

      // Update view count (fire and forget - no await needed)
      supabase.rpc('increment_trip_views', { trip_token: shareToken });

      // Render the complete HTML from the builder - exactly as it was created
      document.open();
      document.write(trip.content.html);
      document.close();

    } catch (err: any) {
      console.error('Error loading trip:', err);
      setError(err.message || 'Fout bij laden van reis');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTrip(password);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Reis laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Niet gevonden</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Beveiligde Reis
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Deze reis is beveiligd met een wachtwoord
            </p>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wachtwoord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-2 border ${
                    passwordError ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                  placeholder="Voer wachtwoord in"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-600 text-sm mt-1">
                    Onjuist wachtwoord
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Openen
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
