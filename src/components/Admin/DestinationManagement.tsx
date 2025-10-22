import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateBuilderJWT } from '../../lib/jwtHelper';

interface Destination {
  id: string;
  title: string;
  slug: string;
  country: string;
  created_at: string;
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
}

interface Brand {
  id: string;
  name: string;
  business_type: 'franchise' | 'custom';
}

export function DestinationManagement() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDestinations();
    loadBrands();
  }, []);

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('id, title, slug, country, created_at, enabled_for_brands, enabled_for_franchise, is_mandatory')
        .eq('author_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, business_type')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';

  const handleCreateDestination = async () => {
    try {
      if (!user?.id) {
        alert('User not authenticated');
        return;
      }

      const jwtResponse = await generateBuilderJWT(SYSTEM_BRAND_ID, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        authorType: 'admin',
        authorId: user.id,
        mode: 'destination',
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/admin/destinations`;

      const params = new URLSearchParams({
        api: apiBaseUrl,
        brand_id: SYSTEM_BRAND_ID,
        token: jwtResponse.token,
        apikey: apiKey,
        author_type: 'admin',
        author_id: user.id,
        content_type: 'destinations',
        return_url: returnUrl,
        mode: 'destination'
      });

      const deeplink = `${builderBaseUrl}/?${params.toString()}#/mode/destination`;
      console.log('🔗 Opening destination builder deeplink:', deeplink);

      const newWindow = window.open(deeplink, '_blank');
      if (!newWindow) {
        navigator.clipboard.writeText(deeplink);
        alert('Pop-up geblokkeerd! URL is gekopieerd naar clipboard. Plak in nieuwe tab.');
      }
    } catch (err) {
      console.error('Error generating deeplink:', err);
      alert('Failed to generate builder link');
    }
  };

  const handleEditDestination = async (destination: Destination) => {
    try {
      if (!user?.id) {
        alert('User not authenticated');
        return;
      }

      if (!destination.slug) {
        alert('Destination has no slug. Cannot edit.');
        return;
      }

      const jwtResponse = await generateBuilderJWT(SYSTEM_BRAND_ID, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        destinationSlug: destination.slug,
        authorType: 'admin',
        authorId: user.id,
        mode: 'destination',
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/admin/destinations`;

      const params = new URLSearchParams({
        api: apiBaseUrl,
        brand_id: SYSTEM_BRAND_ID,
        token: jwtResponse.token,
        apikey: apiKey,
        destination_slug: destination.slug,
        author_type: 'admin',
        author_id: user.id,
        content_type: 'destinations',
        return_url: returnUrl,
        mode: 'destination'
      });

      const deeplink = `${builderBaseUrl}?${params.toString()}`;

      console.log('🔗 Opening destination edit deeplink:', deeplink);

      const newWindow = window.open(deeplink, '_blank');
      if (!newWindow) {
        navigator.clipboard.writeText(deeplink);
        alert('Pop-up geblokkeerd! URL is gekopieerd naar clipboard. Plak in nieuwe tab.');
      }
    } catch (err) {
      console.error('Error generating deeplink:', err);
      alert('Failed to generate builder link');
    }
  };

  const handleToggleBrands = async (destinationId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ enabled_for_brands: !currentValue })
        .eq('id', destinationId);

      if (error) throw error;

      if (!currentValue) {
        const customBrands = brands.filter(b => b.business_type === 'custom').map(b => b.id);
        const assignments = customBrands.map(brandId => ({
          destination_id: destinationId,
          brand_id: brandId,
          status: 'pending'
        }));

        await supabase
          .from('destination_brand_assignments')
          .upsert(assignments, { onConflict: 'destination_id,brand_id' });
      } else {
        const customBrands = brands.filter(b => b.business_type === 'custom').map(b => b.id);
        await supabase
          .from('destination_brand_assignments')
          .delete()
          .eq('destination_id', destinationId)
          .in('brand_id', customBrands);
      }

      loadDestinations();
    } catch (error) {
      console.error('Error toggling brands:', error);
      alert('Failed to update');
    }
  };

  const handleToggleFranchise = async (destinationId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ enabled_for_franchise: !currentValue })
        .eq('id', destinationId);

      if (error) throw error;

      if (!currentValue) {
        const franchiseBrands = brands.filter(b => b.business_type === 'franchise').map(b => b.id);
        const assignments = franchiseBrands.map(brandId => ({
          destination_id: destinationId,
          brand_id: brandId,
          status: 'pending'
        }));

        await supabase
          .from('destination_brand_assignments')
          .upsert(assignments, { onConflict: 'destination_id,brand_id' });
      } else {
        const franchiseBrands = brands.filter(b => b.business_type === 'franchise').map(b => b.id);
        await supabase
          .from('destination_brand_assignments')
          .delete()
          .eq('destination_id', destinationId)
          .in('brand_id', franchiseBrands);
      }

      loadDestinations();
    } catch (error) {
      console.error('Error toggling franchise:', error);
      alert('Failed to update');
    }
  };

  const handleToggleMandatory = async (destinationId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ is_mandatory: !currentValue })
        .eq('id', destinationId);

      if (error) throw error;

      if (!currentValue) {
        const allBrands = brands.map(b => b.id);
        const assignments = allBrands.map(brandId => ({
          destination_id: destinationId,
          brand_id: brandId,
          status: 'mandatory'
        }));

        await supabase
          .from('destination_brand_assignments')
          .upsert(assignments, { onConflict: 'destination_id,brand_id' });
      } else {
        await supabase
          .from('destination_brand_assignments')
          .delete()
          .eq('destination_id', destinationId)
          .eq('status', 'mandatory');
      }

      loadDestinations();
    } catch (error) {
      console.error('Error toggling mandatory:', error);
      alert('Failed to update');
    }
  };

  const handleDeleteDestination = async (destinationId: string) => {
    if (!confirm('Are you sure you want to delete this destination?')) return;

    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', destinationId);

      if (error) throw error;
      loadDestinations();
    } catch (error) {
      console.error('Error deleting destination:', error);
      alert('Failed to delete destination');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <MapPin size={20} />
                <span>Bestemmingen Beheer</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {destinations.length} bestemming(en)
              </p>
            </div>
            <button
              onClick={handleCreateDestination}
              className="bg-black text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} />
              <span>Nieuwe Bestemming</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bestemming
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Land
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brands
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Franchise
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verplicht
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {destinations.map((destination) => (
                <tr key={destination.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{destination.title}</div>
                    <div className="text-sm text-gray-500">{destination.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {destination.country || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(destination.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={destination.enabled_for_brands}
                        onChange={() => handleToggleBrands(destination.id, destination.enabled_for_brands)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={destination.enabled_for_franchise}
                        onChange={() => handleToggleFranchise(destination.id, destination.enabled_for_franchise)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={destination.is_mandatory}
                        onChange={() => handleToggleMandatory(destination.id, destination.is_mandatory)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleEditDestination(destination)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Bewerken"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDestination(destination.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Verwijderen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {destinations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Geen bestemmingen gevonden. Klik op "Nieuwe Bestemming" om er één aan te maken.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
