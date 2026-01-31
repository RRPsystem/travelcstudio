import React, { useState, useEffect } from 'react';
import { Plane, Send, Eye, Clock, CheckCircle, XCircle, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateBuilderJWT } from '../../lib/jwtHelper';

interface Trip {
  id: string;
  title: string;
  slug: string;
  description: string;
  featured_image: string;
  price: number;
  duration_days: number;
  status: string;
  submit_to_catalog: boolean;
  catalog_status: 'pending' | 'approved' | 'rejected' | null;
  catalog_submitted_at: string | null;
  catalog_reviewed_at: string | null;
  catalog_notes: string | null;
  created_at: string;
}

export function TripSubmissionManager() {
  const { user, effectiveBrandId } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'not_submitted' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (effectiveBrandId) {
      loadTrips();
    }
  }, [effectiveBrandId, filter]);

  const loadTrips = async () => {
    if (!effectiveBrandId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('trips')
        .select('*')
        .eq('brand_id', effectiveBrandId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (filter === 'not_submitted') {
        filteredData = filteredData.filter(t => !t.submit_to_catalog);
      } else if (filter === 'pending') {
        filteredData = filteredData.filter(t => t.submit_to_catalog && !t.catalog_status);
      } else if (filter === 'approved') {
        filteredData = filteredData.filter(t => t.catalog_status === 'approved');
      } else if (filter === 'rejected') {
        filteredData = filteredData.filter(t => t.catalog_status === 'rejected');
      }

      setTrips(filteredData);
    } catch (err) {
      console.error('Error loading trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToCatalog = async (tripId: string) => {
    if (!confirm('Weet je zeker dat je deze reis wilt indienen bij de Admin catalogus?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          submit_to_catalog: true,
          catalog_submitted_at: new Date().toISOString()
        })
        .eq('id', tripId);

      if (error) throw error;

      alert('Reis succesvol ingediend bij Admin catalogus!');
      loadTrips();
    } catch (err: any) {
      console.error('Error submitting trip:', err);
      alert('Fout bij indienen: ' + err.message);
    }
  };

  const handleWithdrawSubmission = async (tripId: string) => {
    if (!confirm('Weet je zeker dat je de indiening wilt intrekken?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .update({
          submit_to_catalog: false,
          catalog_submitted_at: null,
          catalog_status: null
        })
        .eq('id', tripId);

      if (error) throw error;

      alert('Indiening ingetrokken');
      loadTrips();
    } catch (err: any) {
      console.error('Error withdrawing submission:', err);
      alert('Fout bij intrekken: ' + err.message);
    }
  };

  const handleEditTrip = async (trip: Trip) => {
    try {
      const jwt = await generateBuilderJWT(effectiveBrandId!, user!.id);
      const builderUrl = `${window.location.origin}/#/builder?slug=${trip.slug}&jwt=${jwt}&contentType=trip`;
      window.open(builderUrl, '_blank');
    } catch (error) {
      console.error('Error generating builder JWT:', error);
      alert('Fout bij openen van editor');
    }
  };

  const getStatusBadge = (trip: Trip) => {
    if (!trip.submit_to_catalog) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Niet ingediend
        </span>
      );
    }
    if (!trip.catalog_status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} className="mr-1" />
          In beoordeling
        </span>
      );
    }
    if (trip.catalog_status === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Goedgekeurd
        </span>
      );
    }
    if (trip.catalog_status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle size={12} className="mr-1" />
          Afgekeurd
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mijn Reizen - Catalogus Inzendingen</h2>
            <p className="text-gray-600 mt-1">
              Beheer je reizen en dien ze in bij de centrale Admin catalogus
            </p>
          </div>

          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'Alle' },
              { value: 'not_submitted', label: 'Niet ingediend' },
              { value: 'pending', label: 'In beoordeling' },
              { value: 'approved', label: 'Goedgekeurd' },
              { value: 'rejected', label: 'Afgekeurd' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === value
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-12">
            <Plane size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen reizen gevonden</h3>
            <p className="text-gray-600">
              {filter === 'not_submitted' ? 'Alle reizen zijn al ingediend' : 'Pas het filter aan om reizen te zien'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div key={trip.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {trip.featured_image && (
                  <img
                    src={trip.featured_image}
                    alt={trip.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{trip.title}</h3>
                    {getStatusBadge(trip)}
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {trip.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{trip.duration_days} dagen</span>
                    {trip.price && (
                      <span className="text-lg font-bold text-orange-600">
                        €{trip.price.toLocaleString('nl-NL')}
                      </span>
                    )}
                  </div>

                  {trip.catalog_notes && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                      <p className="text-xs font-medium text-red-900 mb-1">
                        <MessageSquare size={12} className="inline mr-1" />
                        Admin feedback:
                      </p>
                      <p className="text-xs text-red-800">{trip.catalog_notes}</p>
                    </div>
                  )}

                  {trip.catalog_status === 'approved' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                      <p className="text-xs text-green-800">
                        <CheckCircle size={12} className="inline mr-1" />
                        Deze reis is goedgekeurd en kan worden toegewezen aan andere brands
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTrip(trip)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Edit size={14} className="inline mr-1" />
                      Bewerken
                    </button>

                    {!trip.submit_to_catalog && (
                      <button
                        onClick={() => handleSubmitToCatalog(trip.id)}
                        className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        <Send size={14} className="inline mr-1" />
                        Indienen
                      </button>
                    )}

                    {trip.submit_to_catalog && !trip.catalog_status && (
                      <button
                        onClick={() => handleWithdrawSubmission(trip.id)}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        <XCircle size={14} className="inline mr-1" />
                        Intrekken
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Hoe werkt de catalogus?</h3>
        <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
          <li>Maak een reis aan en vul alle details in</li>
          <li>Klik op "Indienen" om de reis naar de Admin catalogus te sturen</li>
          <li>Admin beoordeelt de reis (goedkeuren/afkeuren)</li>
          <li>Bij goedkeuring kan Admin de reis toewijzen aan andere brands</li>
          <li>Andere brands kunnen de reis accepteren en publiceren op hun website</li>
        </ol>
      </div>
    </div>
  );
}
