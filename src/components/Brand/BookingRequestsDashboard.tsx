import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Calendar, CheckCircle, Clock, MapPin, Users, DollarSign, MessageSquare, X } from 'lucide-react';

interface BookingRequest {
  id: string;
  booking_type: string;
  item_name: string;
  item_description: string | null;
  preferred_dates: any;
  party_size: number | null;
  budget_range: string | null;
  special_requests: string | null;
  location: string | null;
  alternatives_requested: boolean;
  status: string;
  priority: string;
  original_user_message: string | null;
  created_at: string;
  updated_at: string;
  travel_trips: {
    trip_name: string;
    metadata: any;
  } | null;
  trip_participants: Array<{
    participant_name: string;
    participant_role: string;
  }>;
  booking_confirmation: string | null;
  booking_reference: string | null;
  notes: string | null;
}

export function BookingRequestsDashboard() {
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [bookingRef, setBookingRef] = useState('');

  useEffect(() => {
    loadBookingRequests();
  }, [filterStatus]);

  async function loadBookingRequests() {
    try {
      let query = supabase
        .from('booking_requests')
        .select(`
          *,
          travel_trips (
            trip_name,
            metadata
          ),
          trip_participants (
            participant_name,
            participant_role
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookingRequests(data || []);
    } catch (error) {
      console.error('Error loading booking requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(requestId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      await loadBookingRequests();
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Fout bij updaten status');
    }
  }

  async function completeBooking(requestId: string) {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'booked',
          booking_reference: bookingRef,
          notes: notes,
          booked_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Boeking voltooid!');
      setSelectedRequest(null);
      setNotes('');
      setBookingRef('');
      await loadBookingRequests();
    } catch (error) {
      console.error('Error completing booking:', error);
      alert('Fout bij voltooien boeking');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
      case 'info_gathering':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready_for_advisor':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: 'Nieuw',
      info_gathering: 'Info verzamelen',
      ready_for_advisor: 'Klaar voor adviseur',
      in_progress: 'In behandeling',
      booked: 'Geboekt',
      cancelled: 'Geannuleerd'
    };
    return labels[status] || status;
  }

  function getTypeIcon(type: string) {
    const icons: Record<string, string> = {
      hotel: '🏨',
      flight: '✈️',
      activity: '🎯',
      restaurant: '🍴',
      transport: '🚗',
      tickets: '🎫',
      other: '📋'
    };
    return icons[type] || '📋';
  }

  const travelerNames = (request: BookingRequest) =>
    request.trip_participants
      ?.filter(p => p.participant_role === 'traveler')
      .map(p => p.participant_name)
      .join(', ') || 'Onbekend';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Booking requests laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Boekingsverzoeken</h2>
          <p className="text-gray-600 mt-1">Beheer boekingsaanvragen van reizigers</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'ready_for_advisor', 'in_progress', 'booked', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'Alle' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {bookingRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">Geen boekingsverzoeken gevonden</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookingRequests.map(request => (
            <div
              key={request.id}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(request.booking_type)}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{request.item_name}</h3>
                      {request.travel_trips?.trip_name && (
                        <p className="text-sm text-gray-600">Reis: {request.travel_trips.trip_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm text-gray-600 mt-3">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {travelerNames(request)}
                    </span>
                    {request.party_size && (
                      <span className="flex items-center gap-1">
                        <Users size={16} />
                        {request.party_size} personen
                      </span>
                    )}
                    {request.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={16} />
                        {request.location}
                      </span>
                    )}
                    {request.budget_range && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={16} />
                        {request.budget_range}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                    <Clock size={16} />
                    {new Date(request.created_at).toLocaleString('nl-NL')}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {getStatusLabel(request.status)}
                  </span>
                  {request.alternatives_requested && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      Alternatieven gewenst
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span>{getTypeIcon(selectedRequest.booking_type)}</span>
                  {selectedRequest.item_name}
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedRequest.status}
                    onChange={(e) => updateStatus(selectedRequest.id, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="pending">Nieuw</option>
                    <option value="info_gathering">Info verzamelen</option>
                    <option value="ready_for_advisor">Klaar voor adviseur</option>
                    <option value="in_progress">In behandeling</option>
                    <option value="booked">Geboekt</option>
                    <option value="cancelled">Geannuleerd</option>
                  </select>
                </div>

                {selectedRequest.item_description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                    <p className="text-gray-900">{selectedRequest.item_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedRequest.party_size && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aantal personen</label>
                      <p className="text-gray-900">{selectedRequest.party_size}</p>
                    </div>
                  )}
                  {selectedRequest.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Locatie</label>
                      <p className="text-gray-900">{selectedRequest.location}</p>
                    </div>
                  )}
                  {selectedRequest.budget_range && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                      <p className="text-gray-900">{selectedRequest.budget_range}</p>
                    </div>
                  )}
                  {selectedRequest.preferred_dates && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gewenste data</label>
                      <p className="text-gray-900">{JSON.stringify(selectedRequest.preferred_dates)}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.special_requests && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Speciale verzoeken</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.special_requests}</p>
                  </div>
                )}

                {selectedRequest.original_user_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origineel bericht</label>
                    <p className="text-gray-600 italic">{selectedRequest.original_user_message}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Reiziger(s)</h4>
                  <p className="text-gray-900">{travelerNames(selectedRequest)}</p>
                  {selectedRequest.travel_trips?.trip_name && (
                    <p className="text-sm text-gray-600 mt-1">Reis: {selectedRequest.travel_trips.trip_name}</p>
                  )}
                </div>

                {selectedRequest.status !== 'booked' && selectedRequest.status !== 'cancelled' && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Boekingsreferentie
                      </label>
                      <input
                        type="text"
                        value={bookingRef}
                        onChange={(e) => setBookingRef(e.target.value)}
                        placeholder="Bijv. BK-2024-001"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notities
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Interne notities..."
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <button
                      onClick={() => completeBooking(selectedRequest.id)}
                      disabled={!bookingRef}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      Markeer als Geboekt
                    </button>
                  </div>
                )}

                {(selectedRequest.booking_reference || selectedRequest.notes) && (
                  <div className="border-t pt-4 space-y-2">
                    {selectedRequest.booking_reference && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Boekingsreferentie</label>
                        <p className="text-gray-900">{selectedRequest.booking_reference}</p>
                      </div>
                    )}
                    {selectedRequest.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notities</label>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
