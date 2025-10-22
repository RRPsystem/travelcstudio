import React, { useState, useEffect } from 'react';
import { MapPin, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../lib/jwtHelper';

interface DestinationAssignment {
  id: string;
  destination_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'mandatory' | 'brand';
  is_published: boolean;
  assigned_at: string;
  page_id?: string;
  destination: {
    id: string;
    title: string;
    slug: string;
    description: string;
    featured_image: string;
    country: string;
    is_mandatory: boolean;
    published_at: string;
  };
}

export function DestinationApproval() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<DestinationAssignment[]>([]);
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
        .from('destination_brand_assignments')
        .select(`
          id,
          destination_id,
          status,
          is_published,
          assigned_at,
          destinations!inner (
            id,
            title,
            slug,
            description,
            featured_image,
            country,
            is_mandatory,
            published_at
          )
        `)
        .eq('brand_id', user.brand_id)
        .order('assigned_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      const formattedAssignments = (assignmentData || []).map(item => ({
        id: item.id,
        destination_id: item.destination_id,
        status: item.status,
        is_published: item.is_published || false,
        assigned_at: item.assigned_at,
        destination: Array.isArray(item.destinations) ? item.destinations[0] : item.destinations
      }));

      const assignedDestinationIds = new Set(formattedAssignments.map(a => a.destination_id));

      const { data: brandDestinationsData, error: brandDestinationsError } = await supabase
        .from('destinations')
        .select('id, title, slug, description, featured_image, country, created_at, published_at, status')
        .eq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (brandDestinationsError) throw brandDestinationsError;

      const filteredBrandDestinations = (brandDestinationsData || []).filter(item => !assignedDestinationIds.has(item.id));

      const formattedBrandDestinations = filteredBrandDestinations.map(item => ({
        id: `brand-destination-${item.id}`,
        destination_id: item.id,
        page_id: item.id,
        status: 'brand' as const,
        is_published: item.status === 'published',
        assigned_at: item.created_at,
        destination: {
          id: item.id,
          title: item.title,
          slug: item.slug,
          description: item.description || '',
          featured_image: item.featured_image || '',
          country: item.country || '',
          is_mandatory: false,
          published_at: item.published_at
        }
      }));

      const allDestinations = [...formattedAssignments, ...formattedBrandDestinations].sort((a, b) =>
        new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );

      setAssignments(allDestinations);
    } catch (error) {
      console.error('Error loading destination assignments:', error);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const handleTogglePublish = async (assignmentId: string, currentValue: boolean, assignment: DestinationAssignment) => {
    try {
      if (assignment.status === 'brand' && assignment.destination_id) {
        const { error } = await supabase
          .from('destinations')
          .update({ status: !currentValue ? 'published' : 'draft' })
          .eq('id', assignment.destination_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('destination_brand_assignments')
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

  const handleRejectDestination = async (assignmentId: string) => {
    if (!confirm('Weet je zeker dat je deze bestemming wilt afwijzen?')) return;

    try {
      const { error } = await supabase
        .from('destination_brand_assignments')
        .update({ status: 'rejected' })
        .eq('id', assignmentId);

      if (error) throw error;
      await loadAssignments();
    } catch (error) {
      console.error('Error rejecting destination:', error);
      alert('Failed to reject destination');
    }
  };

  const handleCreateDestination = async () => {
    try {
      if (!user?.id || !user?.brand_id) {
        alert('User not authenticated or brand not found');
        return;
      }

      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        authorType: 'brand',
        authorId: user.id,
        mode: 'destination',
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/destinations`;

      const deeplink = generateBuilderDeeplink({
        baseUrl: builderBaseUrl,
        jwtResponse,
        returnUrl,
        mode: 'destination',
        authorType: 'brand',
        authorId: user.id,
        contentType: 'destinations'
      });

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

  const handleEditDestination = async (destination: { id: string; slug: string; }, isBrand: boolean) => {
    try {
      if (!user?.id || !user?.brand_id) {
        alert('User not authenticated or brand not found');
        return;
      }

      const jwtResponse = await generateBuilderJWT(user.brand_id, user.id, ['content:read', 'content:write'], {
        forceBrandId: true,
        destinationSlug: destination.slug,
        authorType: 'brand',
        authorId: user.id,
        mode: 'destination',
      });

      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const returnUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}#/brand/destinations`;

      const deeplink = generateBuilderDeeplink({
        baseUrl: builderBaseUrl,
        jwtResponse,
        returnUrl,
        mode: 'destination',
        authorType: 'brand',
        authorId: user.id,
        contentType: 'destinations',
        destinationSlug: destination.slug
      });

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

  const handleDeleteDestination = async (destinationId: string) => {
    if (!confirm('Weet je zeker dat je deze bestemming wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', destinationId);

      if (error) throw error;
      await loadAssignments();
    } catch (error) {
      console.error('Error deleting destination:', error);
      alert('Failed to delete destination');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user?.brand_id) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Je moet ingelogd zijn als brand om bestemmingen te beheren.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <MapPin size={20} />
                <span>Bestemmingen</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Beheer toegewezen en eigen bestemmingen
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bron
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Publiceren
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {assignment.destination.featured_image && (
                        <img
                          src={assignment.destination.featured_image}
                          alt={assignment.destination.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.destination.title}
                        </div>
                        <div className="text-sm text-gray-500">{assignment.destination.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.destination.country || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      assignment.status === 'brand' ? 'bg-blue-100 text-blue-800' :
                      assignment.status === 'mandatory' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.status === 'brand' ? 'Eigen' :
                       assignment.status === 'mandatory' ? 'Verplicht' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      assignment.status === 'mandatory' ? 'bg-orange-100 text-orange-800' :
                      assignment.status === 'brand' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {assignment.status === 'accepted' ? 'Geaccepteerd' :
                       assignment.status === 'rejected' ? 'Afgewezen' :
                       assignment.status === 'mandatory' ? 'Verplicht' :
                       assignment.status === 'brand' ? 'Eigen' : 'In afwachting'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {assignment.status !== 'rejected' && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignment.is_published}
                          onChange={() => handleTogglePublish(assignment.id, assignment.is_published, assignment)}
                          disabled={assignment.status === 'pending'}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer ${
                          assignment.status === 'pending' ? 'opacity-50 cursor-not-allowed' : ''
                        } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                      </label>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleEditDestination(assignment.destination, assignment.status === 'brand')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Bewerken"
                      >
                        <Pencil size={16} />
                      </button>
                      {assignment.status === 'brand' && (
                        <button
                          onClick={() => handleDeleteDestination(assignment.destination_id)}
                          className="text-red-600 hover:text-red-900"
                          title="Verwijderen"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() => handleRejectDestination(assignment.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Afwijzen"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
