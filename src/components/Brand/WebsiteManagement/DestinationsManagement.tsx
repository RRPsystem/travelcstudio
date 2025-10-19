import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Eye, Globe } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { generateBuilderJWT } from '../../../lib/jwtHelper';

interface Destination {
  id: string;
  title: string;
  slug: string;
  country: string;
  region: string;
  description: string;
  featured_image: string;
  status: 'draft' | 'published';
  page_id?: string;
  created_at: string;
  updated_at: string;
}

export function DestinationsManagement() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDestinations();
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      loadDestinations();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const loadDestinations = async () => {
    if (!user?.brand_id) return;

    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('brand_id', user.brand_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDestination = async () => {
    try {
      if (!user?.id || !user?.brand_id) {
        alert('User not authenticated');
        return;
      }

      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        mode: 'destination',
      });

      const apiBase = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const jwt = jwtResponse.token;

      const url = `/builder/index.html?brand_id=${user.brand_id}&api=${encodeURIComponent(apiBase)}&token=${jwt}&apikey=${encodeURIComponent(apiKey)}&content_type=destination`;

      console.log('🔗 Opening destination builder:', url);

      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        navigator.clipboard.writeText(url);
        alert('Pop-up geblokkeerd! URL is gekopieerd naar clipboard. Plak in nieuwe tab.');
      }
    } catch (err) {
      console.error('Error generating builder link:', err);
      alert('Failed to generate builder link');
    }
  };

  const handleEditDestination = async (destination: Destination) => {
    try {
      if (!user?.id || !user?.brand_id) {
        alert('User not authenticated');
        return;
      }

      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        pageId: destination.page_id,
        mode: 'destination',
      });

      const apiBase = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const jwt = jwtResponse.token;

      const url = `/builder/index.html?brand_id=${user.brand_id}&page_id=${destination.page_id || destination.id}&api=${encodeURIComponent(apiBase)}&token=${jwt}&apikey=${encodeURIComponent(apiKey)}&content_type=destination`;

      console.log('🔗 Opening destination edit:', url);

      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        navigator.clipboard.writeText(url);
        alert('Pop-up geblokkeerd! URL is gekopieerd naar clipboard. Plak in nieuwe tab.');
      }
    } catch (err) {
      console.error('Error generating builder link:', err);
      alert('Failed to generate builder link');
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze bestemming wilt publiceren?')) return;

    try {
      const { error } = await supabase
        .from('destinations')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      alert('✅ Bestemming gepubliceerd!');
      loadDestinations();
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Er ging iets mis bij het publiceren');
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze bestemming wilt depubliceren?')) return;

    try {
      const { error } = await supabase
        .from('destinations')
        .update({ status: 'draft' })
        .eq('id', id);

      if (error) throw error;

      alert('Bestemming gedepubliceerd');
      loadDestinations();
    } catch (error) {
      console.error('Error unpublishing:', error);
      alert('Er ging iets mis');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Weet je zeker dat je "${title}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;

    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Bestemming verwijderd');
      loadDestinations();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Er ging iets mis bij het verwijderen');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bestemmingen</h1>
          <p className="text-gray-600 mt-1">Beheer je reisbestemmingen</p>
        </div>
        <button
          onClick={handleCreateDestination}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
          style={{ backgroundColor: '#ff7700' }}
        >
          <Plus className="w-5 h-5" />
          Nieuwe Bestemming
        </button>
      </div>

      {destinations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nog geen bestemmingen</h3>
          <p className="text-gray-600 mb-6">Begin met het toevoegen van je eerste bestemming</p>
          <button
            onClick={handleCreateDestination}
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors hover:bg-orange-700"
            style={{ backgroundColor: '#ff7700' }}
          >
            Maak je Eerste Bestemming
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <div key={destination.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              {destination.featured_image && (
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={destination.featured_image}
                    alt={destination.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{destination.title}</h3>
                    <p className="text-sm text-gray-500">
                      {destination.country && destination.region
                        ? `${destination.country}, ${destination.region}`
                        : destination.country || destination.region}
                    </p>
                  </div>
                  {destination.status === 'published' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Gepubliceerd
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Concept
                    </span>
                  )}
                </div>
                {destination.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{destination.description}</p>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    /{destination.slug}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditDestination(destination)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Bewerken"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {destination.status === 'draft' ? (
                      <button
                        onClick={() => handlePublish(destination.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Publiceren"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnpublish(destination.id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                        title="Depubliceren"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(destination.id, destination.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
