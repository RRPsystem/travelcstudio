import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, ExternalLink, RefreshCw, Loader, MessageCircle } from 'lucide-react';
import { ClientInterface } from '../TravelBro/ClientInterface';

interface Trip {
  id: string;
  name: string;
  share_token: string;
  share_url: string;
  is_active: boolean;
  created_at: string;
  brand_id: string;
  brands?: {
    name: string;
  };
}

export function TravelBroPreview() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadActiveTrips();
  }, []);

  const loadActiveTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('travel_trips')
        .select(`
          id,
          name,
          share_token,
          is_active,
          created_at,
          brand_id,
          brands:brand_id (
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const tripsWithUrl = (data || []).map(trip => {
        const brandSlug = trip.brands?.name?.toLowerCase().replace(/\s+/g, '-') || 'demo';
        return {
          ...trip,
          share_url: `https://${brandSlug}.travelbro.app/${trip.share_token}`
        };
      });

      setTrips(tripsWithUrl);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowPreview(true);
  };

  if (showPreview && selectedTrip) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">TravelBro Preview</h2>
            <p className="text-gray-600 mt-1">
              Preview van: <span className="font-semibold">{selectedTrip.name}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={selectedTrip.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in nieuw tabblad
            </a>
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Terug naar lijst
            </button>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Client View</span>
            </div>
            <div className="text-sm opacity-90">
              Share Token: {selectedTrip.share_token}
            </div>
          </div>

          <div className="h-[calc(100vh-240px)] overflow-auto">
            <ClientInterface shareToken={selectedTrip.share_token} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">TravelBro Preview</h2>
          <p className="text-gray-600 mt-1">Bekijk hoe TravelBro eruitziet voor klanten</p>
        </div>
        <button
          onClick={loadActiveTrips}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Ververs
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Geen actieve TravelBro trips gevonden</p>
          <p className="text-gray-500 text-sm mt-2">
            Maak eerst een trip aan via Brand Dashboard → TravelBro Setup
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{trip.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {trip.brands?.name || 'Onbekende brand'}
                  </p>
                </div>
                {trip.is_active && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Actief
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-500">
                  Aangemaakt: {new Date(trip.created_at).toLocaleDateString('nl-NL')}
                </div>
                <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded truncate">
                  Token: {trip.share_token}
                </div>
              </div>

              <button
                onClick={() => handlePreview(trip)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
