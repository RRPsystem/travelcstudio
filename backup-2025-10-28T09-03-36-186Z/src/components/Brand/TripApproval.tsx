import React, { useState, useEffect } from 'react';
import { Plane, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateBuilderJWT } from '../../lib/jwtHelper';

interface TripAssignment {
  id: string;
  trip_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'mandatory' | 'brand';
  is_published: boolean;
  assigned_at: string;
  page_id?: string;
  trip: {
    id: string;
    title: string;
    slug: string;
    description: string;
    featured_image: string;
    price: number;
    duration_days: number;
    is_mandatory: boolean;
    published_at: string;
  };
}

export function TripApproval() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TripAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (user?.brand_id && !isLoadingData) {
      loadAssignments();
    } else if (!user?.brand_id) {
      setLoading(false);
    }
  }, [user?.brand_id]);

  const loadAssignments = async () => {
    if (!user?.brand_id || isLoadingData) {
      return;
    }

    setLoading(true);
    setIsLoadingData(true);
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('trip_brand_assignments')
        .select(`
          id,
          trip_id,
          status,
          is_published,
          assigned_at,
          page_id,
          trips!inner (
            id,
            title,
            slug,
            description,
            featured_image,
            price,
            duration_days,
            is_mandatory,
            published_at
          )
        `)
        .eq('brand_id', user.brand_id)
        .order('assigned_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      const formattedAssignments = (assignmentData || []).map(item => ({
        id: item.id,
        trip_id: item.trip_id,
        status: item.status,
        is_published: item.is_published || false,
        assigned_at: item.assigned_at,
        page_id: item.page_id,
        trip: Array.isArray(item.trips) ? item.trips[0] : item.trips
      }));

      const assignedTripIds = new Set(formattedAssignments.map(a => a.trip_id));

      const { data: brandTripsData, error: brandTripsError } = await supabase
        .from('trips')
        .select('id, title, slug, description, featured_image, price, duration_days, created_at, published_at, status')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (brandTripsError) throw brandTripsError;

      const filteredBrandTrips = (brandTripsData || []).filter(item => !assignedTripIds.has(item.id));

      const formattedBrandTrips = filteredBrandTrips.map(item => ({
        id: `brand-trip-${item.id}`,
        trip_id: item.id,
        page_id: item.id,
        status: 'brand' as const,
        is_published: item.status === 'published',
        assigned_at: item.created_at,
        trip: {
          id: item.id,
          title: item.title,
          slug: item.slug,
          description: item.description || '',
          featured_image: item.featured_image || '',
          price: item.price || 0,
          duration_days: item.duration_days || 0,
          is_mandatory: false,
          published_at: item.published_at
        }
      }));

      const allTrips = [...formattedAssignments, ...formattedBrandTrips].sort((a, b) =>
        new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );

      setAssignments(allTrips);
    } catch (error) {
      console.error('Error loading trip assignments:', error);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const handleTogglePublish = async (assignmentId: string, currentValue: boolean, assignment: TripAssignment) => {
    try {
      if (assignment.status === 'brand' && assignment.trip_id) {
        const { error } = await supabase
          .from('trips')
          .update({ status: !currentValue ? 'published' : 'draft' })
          .eq('id', assignment.trip_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_brand_assignments')
          .update({
            is_published: !currentValue,
            status: !currentValue ? 'accepted' : 'pending'
          })
          .eq('id', assignmentId);

        if (error) throw error;
      }
      await loadAssignments();
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Failed to update');
    }
  };

  const handlePreview = async (assignment: TripAssignment) => {
    if (!user?.brand_id || !assignment.page_id) return;

    const { data: domains } = await supabase
      .from('brand_domains')
      .select('domain')
      .eq('brand_id', user.brand_id)
      .eq('is_verified', true)
      .maybeSingle();

    const previewUrl = domains?.domain
      ? `https://${domains.domain}/${assignment.trip.slug}`
      : `/preview?brand_id=${user.brand_id}&slug=${assignment.trip.slug}`;

    window.open(previewUrl, '_blank');
  };

  const handleEdit = async (assignment: TripAssignment) => {
    if (!user?.brand_id || !user?.id) return;

    try {
      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, [
        'pages:read',
        'pages:write',
        'trips:read',
        'trips:write',
        'content:read',
        'content:write'
      ], {
        contentType: 'trips',
        pageId: assignment.page_id
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/content/trips`;

      const params = new URLSearchParams({
        api: apiBaseUrl,
        brand_id: user.brand_id,
        token: jwtResponse.token,
        apikey: apiKey,
        content_type: 'trips',
        return_url: returnUrl
      });

      if (assignment.page_id) {
        params.append('page_id', assignment.page_id);
      } else {
        params.append('slug', assignment.trip.slug);
        params.append('id', assignment.trip.id);
      }

      const deeplink = `${builderBaseUrl}?${params.toString()}`;

      console.log('🔗 Opening trip edit deeplink:', deeplink);
      console.log('Trip details:', {
        page_id: assignment.page_id,
        slug: assignment.trip.slug,
        title: assignment.trip.title,
        id: assignment.trip.id
      });

      const result = window.open(deeplink, '_blank');

      if (!result) {
        alert('Pop-up geblokkeerd! Sta pop-ups toe voor deze website.');
      }
    } catch (error) {
      console.error('Error opening builder:', error);
      alert(`Fout bij openen builder: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  const handleDelete = async (assignment: TripAssignment) => {
    if (!confirm(`Weet je zeker dat je "${assignment.trip.title}" wilt verwijderen?`)) {
      return;
    }

    try {
      if (assignment.status === 'brand') {
        const tripId = assignment.trip_id || assignment.trip.id;

        const { data, error } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripId)
          .select();

        if (error) {
          console.error('Delete error:', error);
          alert(`Fout bij verwijderen: ${error.message}`);
          throw error;
        }

        if (!data || data.length === 0) {
          console.error('No rows deleted - item not found or no permission');
          alert('Item kon niet worden verwijderd');
          return;
        }
      } else {
        const assignmentId = assignment.id.startsWith('brand-trip-')
          ? assignment.trip_id
          : assignment.id;

        const { data, error } = await supabase
          .from('trip_brand_assignments')
          .delete()
          .eq('id', assignmentId)
          .select();

        if (error) {
          console.error('Delete assignment error:', error);
          alert(`Fout bij verwijderen: ${error.message}`);
          throw error;
        }

        if (!data || data.length === 0) {
          console.error('No assignment rows deleted - not found');
          alert('Assignment kon niet worden verwijderd');
          return;
        }
      }

      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert(`Fout bij verwijderen: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  };

  const createNewTrip = async () => {
    if (!user?.brand_id || !user?.id) return;

    try {
      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, [
        'pages:read',
        'pages:write',
        'trips:read',
        'trips:write',
        'content:read',
        'content:write'
      ], {
        contentType: 'trips'
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/content/trips`;

      const params = new URLSearchParams({
        api: apiBaseUrl,
        brand_id: user.brand_id,
        token: jwtResponse.token,
        apikey: apiKey,
        content_type: 'trips',
        return_url: returnUrl
      });

      const deeplink = `${builderBaseUrl}?${params.toString()}`;

      console.log('🔗 Opening trip creation deeplink:', deeplink);

      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening builder:', error);
      alert('Kon de website builder niet openen');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Reizen</h2>
        </div>
        <button
          onClick={createNewTrip}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nieuwe Reis
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Plane className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen reizen</h3>
          <p className="mt-1 text-sm text-gray-500">Er zijn nog geen reizen beschikbaar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prijs</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duur</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Publiceren</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start flex-col">
                      <div className="font-medium text-gray-900">{assignment.trip.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{assignment.trip.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {assignment.trip.price > 0 ? (
                      <div className="text-sm text-gray-900 font-medium">
                        {formatPrice(assignment.trip.price)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {assignment.trip.duration_days > 0 ? (
                      <div className="text-sm text-gray-900">
                        {assignment.trip.duration_days} dagen
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(assignment.assigned_at)}
                  </td>
                  <td className="px-6 py-4">
                    {assignment.status === 'mandatory' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Verplicht
                      </span>
                    )}
                    {assignment.status === 'brand' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Eigen Reis
                      </span>
                    )}
                    {assignment.status === 'accepted' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Optioneel
                      </span>
                    )}
                    {assignment.status === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In afwachting
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={assignment.is_published}
                        onChange={() => handleTogglePublish(assignment.id, assignment.is_published, assignment)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {assignment.is_published && assignment.page_id && (
                        <button
                          onClick={() => handlePreview(assignment)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="text-orange-600 hover:text-orange-900 transition-colors"
                        title="Bewerken"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      {!assignment.trip.is_mandatory && (
                        <button
                          onClick={() => handleDelete(assignment)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
