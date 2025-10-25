import React, { useState, useEffect } from 'react';
import { Plane, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateBuilderJWT, generateBuilderDeeplink } from '../../lib/jwtHelper';

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

      const { data: availableTripsData, error: availableTripsError } = await supabase
        .from('trips')
        .select('id, title, slug, description, featured_image, price, duration_days, created_at, published_at, status, is_mandatory, enabled_for_brands, author_type')
        .eq('enabled_for_brands', true)
        .neq('brand_id', user.brand_id)
        .order('created_at', { ascending: false });

      if (availableTripsError) throw availableTripsError;

      const filteredAvailableTrips = (availableTripsData || []).filter(item => !assignedTripIds.has(item.id));

      const brandTripsAsAssignments: TripAssignment[] = filteredBrandTrips.map(trip => ({
        id: `brand-${trip.id}`,
        trip_id: trip.id,
        status: 'brand' as const,
        is_published: trip.status === 'published',
        assigned_at: trip.created_at,
        trip: {
          id: trip.id,
          title: trip.title,
          slug: trip.slug,
          description: trip.description || '',
          featured_image: trip.featured_image || '',
          price: trip.price || 0,
          duration_days: trip.duration_days || 0,
          is_mandatory: false,
          published_at: trip.published_at || trip.created_at
        }
      }));

      const availableTripsAsAssignments: TripAssignment[] = filteredAvailableTrips.map(trip => ({
        id: `available-${trip.id}`,
        trip_id: trip.id,
        status: trip.is_mandatory ? 'mandatory' : 'pending',
        is_published: false,
        assigned_at: trip.created_at,
        trip: {
          id: trip.id,
          title: trip.title,
          slug: trip.slug,
          description: trip.description || '',
          featured_image: trip.featured_image || '',
          price: trip.price || 0,
          duration_days: trip.duration_days || 0,
          is_mandatory: trip.is_mandatory || false,
          published_at: trip.published_at || trip.created_at
        }
      }));

      const allAssignments = [...formattedAssignments, ...brandTripsAsAssignments, ...availableTripsAsAssignments];

      setAssignments(allAssignments);
    } catch (error) {
      console.error('Error loading trip assignments:', error);
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  };

  const handleResponse = async (assignmentId: string, tripId: string, newStatus: 'accepted' | 'rejected') => {
    if (!user?.brand_id) return;

    try {
      const existingAssignment = assignments.find(a => a.id === assignmentId);

      if (existingAssignment?.id.startsWith('available-')) {
        const { error } = await supabase
          .from('trip_brand_assignments')
          .insert({
            trip_id: tripId,
            brand_id: user.brand_id,
            status: newStatus,
            responded_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_brand_assignments')
          .update({
            status: newStatus,
            responded_at: new Date().toISOString()
          })
          .eq('id', assignmentId);

        if (error) throw error;
      }

      await loadAssignments();
    } catch (error) {
      console.error('Error updating trip assignment:', error);
    }
  };

  const handlePublishToggle = async (assignmentId: string, currentPublishStatus: boolean) => {
    if (!user?.brand_id) return;

    try {
      const { error } = await supabase
        .from('trip_brand_assignments')
        .update({ is_published: !currentPublishStatus })
        .eq('id', assignmentId);

      if (error) throw error;
      await loadAssignments();
    } catch (error) {
      console.error('Error toggling trip publish status:', error);
    }
  };

  const handleEdit = async (assignment: TripAssignment) => {
    if (!user?.brand_id) return;

    try {
      let pageId = assignment.page_id;

      if (!pageId) {
        const { data: websites } = await supabase
          .from('websites')
          .select('id')
          .eq('brand_id', user.brand_id)
          .limit(1)
          .single();

        if (!websites) {
          alert('Geen website gevonden voor dit brand.');
          return;
        }

        const { data: newPage, error: pageError } = await supabase
          .from('website_pages')
          .insert({
            website_id: websites.id,
            title: assignment.trip.title,
            slug: assignment.trip.slug,
            content: {},
            content_type: 'trip',
            status: 'draft'
          })
          .select()
          .single();

        if (pageError) throw pageError;
        pageId = newPage.id;

        if (!assignment.id.startsWith('brand-') && !assignment.id.startsWith('available-')) {
          await supabase
            .from('trip_brand_assignments')
            .update({ page_id: pageId })
            .eq('id', assignment.id);
        }
      }

      const jwt = await generateBuilderJWT(user.brand_id, pageId);
      const deeplink = generateBuilderDeeplink(jwt);
      window.open(deeplink, '_blank');
    } catch (error) {
      console.error('Error opening builder:', error);
      alert('Fout bij het openen van de builder. Probeer het opnieuw.');
    }
  };

  const handleDelete = async (assignmentId: string, tripId: string) => {
    if (!confirm('Weet je zeker dat je deze reis wilt verwijderen?')) return;

    try {
      const assignment = assignments.find(a => a.id === assignmentId);

      if (assignment?.id.startsWith('brand-')) {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripId);

        if (error) throw error;
      } else if (!assignment?.id.startsWith('available-')) {
        const { error } = await supabase
          .from('trip_brand_assignments')
          .delete()
          .eq('id', assignmentId);

        if (error) throw error;
      }

      await loadAssignments();
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const handleAddAvailableTrip = async (tripId: string) => {
    if (!user?.brand_id) return;

    try {
      const { error } = await supabase
        .from('trip_brand_assignments')
        .insert({
          trip_id: tripId,
          brand_id: user.brand_id,
          status: 'accepted',
          responded_at: new Date().toISOString()
        });

      if (error) throw error;
      await loadAssignments();
    } catch (error) {
      console.error('Error adding trip:', error);
    }
  };

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const acceptedAssignments = assignments.filter(a => a.status === 'accepted' || a.status === 'brand');
  const mandatoryAssignments = assignments.filter(a => a.status === 'mandatory');
  const availableTrips = assignments.filter(a => a.id.startsWith('available-'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#ff7700' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mandatoryAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane size={20} style={{ color: '#ff7700' }} />
            Verplichte Reizen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mandatoryAssignments.map((assignment) => (
              <TripCard
                key={assignment.id}
                assignment={assignment}
                onEdit={handleEdit}
                onPublishToggle={handlePublishToggle}
                isMandatory={true}
              />
            ))}
          </div>
        </div>
      )}

      {pendingAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane size={20} style={{ color: '#ff7700' }} />
            In Afwachting
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingAssignments.map((assignment) => (
              <TripCard
                key={assignment.id}
                assignment={assignment}
                onAccept={() => handleResponse(assignment.id, assignment.trip_id, 'accepted')}
                onReject={() => handleResponse(assignment.id, assignment.trip_id, 'rejected')}
              />
            ))}
          </div>
        </div>
      )}

      {acceptedAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane size={20} style={{ color: '#ff7700' }} />
            Geaccepteerde Reizen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {acceptedAssignments.map((assignment) => (
              <TripCard
                key={assignment.id}
                assignment={assignment}
                onEdit={handleEdit}
                onPublishToggle={handlePublishToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {availableTrips.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane size={20} style={{ color: '#ff7700' }} />
            Beschikbare Reizen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTrips.map((assignment) => (
              <TripCard
                key={assignment.id}
                assignment={assignment}
                onAdd={() => handleAddAvailableTrip(assignment.trip_id)}
              />
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Plane size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Geen reizen beschikbaar</h3>
          <p className="text-gray-600">Er zijn nog geen reizen toegewezen aan je brand.</p>
        </div>
      )}
    </div>
  );
}

interface TripCardProps {
  assignment: TripAssignment;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: (assignment: TripAssignment) => void;
  onPublishToggle?: (assignmentId: string, currentStatus: boolean) => void;
  onDelete?: (assignmentId: string, tripId: string) => void;
  onAdd?: () => void;
  isMandatory?: boolean;
}

function TripCard({
  assignment,
  onAccept,
  onReject,
  onEdit,
  onPublishToggle,
  onDelete,
  onAdd,
  isMandatory = false
}: TripCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {assignment.trip.featured_image && (
        <img
          src={assignment.trip.featured_image}
          alt={assignment.trip.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 flex-1">{assignment.trip.title}</h4>
          {isMandatory && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
              Verplicht
            </span>
          )}
          {assignment.status === 'brand' && (
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#fff4e6', color: '#ff7700' }}>
              Eigen
            </span>
          )}
        </div>

        {assignment.trip.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {assignment.trip.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          {assignment.trip.price > 0 && (
            <span className="font-medium">{formatPrice(assignment.trip.price)}</span>
          )}
          {assignment.trip.duration_days > 0 && (
            <span>{assignment.trip.duration_days} dagen</span>
          )}
        </div>

        {assignment.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
              style={{ backgroundColor: '#10b981' }}
            >
              Accepteren
            </button>
            <button
              onClick={onReject}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Afwijzen
            </button>
          </div>
        )}

        {(assignment.status === 'accepted' || assignment.status === 'mandatory' || assignment.status === 'brand') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit?.(assignment)}
                className="flex-1 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
                style={{ backgroundColor: '#ff7700' }}
              >
                <Pencil size={14} />
                Bewerken
              </button>
              {!isMandatory && onDelete && (
                <button
                  onClick={() => onDelete(assignment.id, assignment.trip_id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {(assignment.status === 'accepted' || assignment.status === 'mandatory' || assignment.status === 'brand') &&
             !assignment.id.startsWith('brand-') && !assignment.id.startsWith('available-') && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignment.is_published}
                  onChange={() => onPublishToggle?.(assignment.id, assignment.is_published)}
                  className="rounded"
                  style={{ accentColor: '#ff7700' }}
                />
                <span className="text-gray-700">Publiceren op website</span>
              </label>
            )}
          </div>
        )}

        {assignment.id.startsWith('available-') && (
          <button
            onClick={onAdd}
            className="w-full text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors"
            style={{ backgroundColor: '#ff7700' }}
          >
            <Plus size={14} />
            Toevoegen aan mijn reizen
          </button>
        )}
      </div>
    </div>
  );
}
