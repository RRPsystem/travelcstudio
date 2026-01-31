import React, { useState, useEffect } from 'react';
import { Plane, CheckCircle, XCircle, Clock, Eye, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CatalogTrip {
  id: string;
  title: string;
  slug: string;
  description: string;
  featured_image: string;
  price: number;
  duration_days: number;
  submit_to_catalog: boolean;
  catalog_status: 'pending' | 'approved' | 'rejected' | null;
  catalog_submitted_at: string;
  catalog_reviewed_at: string | null;
  catalog_reviewed_by: string | null;
  catalog_notes: string | null;
  brand_id: string;
  brands: {
    name: string;
    business_type: string;
  };
}

export function TripCatalogManager() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<CatalogTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedTrip, setSelectedTrip] = useState<CatalogTrip | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadCatalogTrips();
    loadBrands();
  }, [filter]);

  const loadCatalogTrips = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          brands!inner (
            name,
            business_type
          )
        `)
        .eq('submit_to_catalog', true)
        .order('catalog_submitted_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'pending') {
          query = query.is('catalog_status', null);
        } else {
          query = query.eq('catalog_status', filter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error loading catalog trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, business_type')
        .neq('id', '00000000-0000-0000-0000-000000000999')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  };

  const handleReview = async (tripId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          catalog_status: status,
          catalog_reviewed_at: new Date().toISOString(),
          catalog_reviewed_by: user?.id,
          catalog_notes: reviewNotes || null
        })
        .eq('id', tripId);

      if (error) throw error;

      alert(`Reis ${status === 'approved' ? 'goedgekeurd' : 'afgekeurd'}!`);
      setSelectedTrip(null);
      setReviewNotes('');
      loadCatalogTrips();
    } catch (err) {
      console.error('Error reviewing trip:', err);
      alert('Fout bij beoordelen van reis');
    }
  };

  const handleAssignToBrands = async () => {
    if (!selectedTrip || selectedBrands.length === 0) {
      alert('Selecteer minimaal 1 brand');
      return;
    }

    try {
      const assignments = selectedBrands.map(brandId => ({
        trip_id: selectedTrip.id,
        brand_id: brandId,
        status: 'pending',
        assigned_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('trip_brand_assignments')
        .upsert(assignments, {
          onConflict: 'trip_id,brand_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      alert(`Reis toegewezen aan ${selectedBrands.length} brand(s)!`);
      setShowAssignModal(false);
      setSelectedTrip(null);
      setSelectedBrands([]);
    } catch (err: any) {
      console.error('Error assigning trip:', err);
      alert('Fout bij toewijzen: ' + err.message);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} className="mr-1" />
          In afwachting
        </span>
      );
    }
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={12} className="mr-1" />
          Goedgekeurd
        </span>
      );
    }
    if (status === 'rejected') {
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
            <h2 className="text-2xl font-bold text-gray-900">Reis Catalogus</h2>
            <p className="text-gray-600 mt-1">
              Beoordeel reizen van tour operators en wijs ze toe aan brands
            </p>
          </div>

          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'Alle' },
              { value: 'pending', label: 'In afwachting' },
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
              {filter === 'pending' ? 'Er zijn geen reizen in afwachting van beoordeling' : 'Pas het filter aan om reizen te zien'}
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
                    {getStatusBadge(trip.catalog_status)}
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {trip.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>Van: {trip.brands.name}</span>
                    <span>{trip.duration_days} dagen</span>
                  </div>

                  {trip.price && (
                    <p className="text-lg font-bold text-orange-600 mb-3">
                      €{trip.price.toLocaleString('nl-NL')}
                    </p>
                  )}

                  {trip.catalog_notes && (
                    <div className="bg-gray-50 rounded p-2 mb-3">
                      <p className="text-xs text-gray-600">
                        <MessageSquare size={12} className="inline mr-1" />
                        {trip.catalog_notes}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {!trip.catalog_status && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            handleReview(trip.id, 'approved');
                          }}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <CheckCircle size={14} className="inline mr-1" />
                          Goedkeuren
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            const notes = prompt('Reden voor afkeuring (optioneel):');
                            setReviewNotes(notes || '');
                            handleReview(trip.id, 'rejected');
                          }}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <XCircle size={14} className="inline mr-1" />
                          Afkeuren
                        </button>
                      </>
                    )}

                    {trip.catalog_status === 'approved' && (
                      <button
                        onClick={() => {
                          setSelectedTrip(trip);
                          setShowAssignModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        <Send size={14} className="inline mr-1" />
                        Toewijzen aan brands
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAssignModal && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                Reis toewijzen: {selectedTrip.title}
              </h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              <p className="text-gray-600 mb-4">
                Selecteer de brands waar je deze reis aan wilt toewijzen:
              </p>

              <div className="space-y-2">
                {brands.map(brand => (
                  <label
                    key={brand.id}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBrands([...selectedBrands, brand.id]);
                        } else {
                          setSelectedBrands(selectedBrands.filter(id => id !== brand.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{brand.name}</p>
                      <p className="text-sm text-gray-500">{brand.business_type}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTrip(null);
                  setSelectedBrands([]);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleAssignToBrands}
                disabled={selectedBrands.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Toewijzen ({selectedBrands.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
