import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Euro, Clock, Phone, Mail, Eye, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TripViewerProps {
  shareToken: string;
}

interface TripData {
  id: string;
  title: string;
  description: string;
  content: any;
  trip_type: string;
  price: number;
  duration_days: number;
  featured_image: string;
  gallery: string[];
  share_settings: {
    password_protected: boolean;
    password: string | null;
    show_price: boolean;
    show_contact: boolean;
    custom_message: string | null;
  };
  brand_name: string;
  brand_id: string;
}

export function TripViewer({ shareToken }: TripViewerProps) {
  const [trip, setTrip] = useState<TripData | null>(null);
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
      // Haal trip op via share_token
      const { data, error: fetchError } = await supabase
        .from('trips_with_share_url')
        .select('*')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Deze reis is niet (meer) beschikbaar');
        setLoading(false);
        return;
      }

      // Check password protection
      if (data.share_settings?.password_protected) {
        if (!enteredPassword) {
          setPasswordRequired(true);
          setLoading(false);
          return;
        }

        if (data.share_settings.password !== enteredPassword) {
          setPasswordError(true);
          setLoading(false);
          return;
        }
      }

      // Update view count
      await supabase.rpc('increment_trip_views', { trip_token: shareToken });

      setTrip(data);
      setPasswordRequired(false);
    } catch (err: any) {
      console.error('Error loading trip:', err);
      setError(err.message || 'Fout bij laden van reis');
    } finally {
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

  if (!trip) return null;

  const typeLabels = {
    roadbook: '📚 Roadbook',
    offerte: '💰 Offerte',
    catalog: '📖 Reis',
    wordpress: '📝 Reis',
    custom: '🎯 Reis'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      {trip.featured_image && (
        <div className="relative h-96 bg-gray-900">
          <img
            src={trip.featured_image}
            alt={trip.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-4xl mx-auto">
              <span className="inline-block px-3 py-1 bg-orange-600 text-white text-sm rounded-full mb-3">
                {typeLabels[trip.trip_type as keyof typeof typeLabels] || '📖 Reis'}
              </span>
              <h1 className="text-4xl font-bold text-white mb-2">{trip.title}</h1>
              {trip.description && (
                <p className="text-xl text-white/90">{trip.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Custom message */}
        {trip.share_settings?.custom_message && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-900">{trip.share_settings.custom_message}</p>
          </div>
        )}

        {/* Info bar */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            {trip.duration_days && (
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Duur</p>
                  <p className="font-semibold text-gray-900">{trip.duration_days} dagen</p>
                </div>
              </div>
            )}

            {trip.share_settings?.show_price && trip.price && (
              <div className="flex items-center space-x-2">
                <Euro className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Prijs</p>
                  <p className="font-semibold text-gray-900">€{trip.price},-</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
          {trip.content && typeof trip.content === 'object' && trip.content.html ? (
            <div
              dangerouslySetInnerHTML={{ __html: trip.content.html }}
              className="prose max-w-none"
            />
          ) : (
            <p className="text-gray-600">Geen inhoud beschikbaar</p>
          )}
        </div>

        {/* Gallery */}
        {trip.gallery && trip.gallery.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Foto's</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {trip.gallery.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {trip.share_settings?.show_contact && (
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Interesse?</h2>
            <p className="text-gray-600 mb-4">
              Neem contact met ons op voor meer informatie of om te boeken!
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={`mailto:contact@${trip.brand_name.toLowerCase().replace(/\s+/g, '')}.nl`}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Mail size={18} />
                <span>Email ons</span>
              </a>
              <a
                href="tel:+31000000000"
                className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-orange-600 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Phone size={18} />
                <span>Bel ons</span>
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Aangeboden door {trip.brand_name}</p>
        </div>
      </div>
    </div>
  );
}
