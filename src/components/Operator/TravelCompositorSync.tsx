import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';

interface SyncJob {
  id: string;
  trip_id: string;
  compositor_booking_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  last_sync_at?: string;
  created_at: string;
  travel_trips?: {
    id: string;
    name: string;
    brand_id: string;
  };
}

interface Trip {
  id: string;
  name: string;
  compositor_booking_id?: string;
  auto_sync_enabled: boolean;
  last_compositor_sync?: string;
}

export default function TravelCompositorSync() {
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showNewSyncModal, setShowNewSyncModal] = useState(false);
  const [newSync, setNewSync] = useState({
    trip_id: '',
    compositor_booking_id: '',
    compositor_api_url: '',
    auth_token: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsResponse, tripsResponse] = await Promise.all([
        supabase.functions.invoke('compositor-sync', {
          method: 'GET',
        }),
        supabase
          .from('travel_trips')
          .select('id, name, compositor_booking_id, auto_sync_enabled, last_compositor_sync')
          .order('created_at', { ascending: false }),
      ]);

      if (jobsResponse.data?.jobs) {
        setSyncJobs(jobsResponse.data.jobs);
      }

      if (tripsResponse.data) {
        setTrips(tripsResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (tripId: string, compositorBookingId: string) => {
    setSyncing(tripId);
    try {
      const { data, error } = await supabase.functions.invoke('compositor-sync', {
        body: {
          trip_id: tripId,
          compositor_booking_id: compositorBookingId,
          compositor_api_url: 'https://www.ai-websitestudio.nl/api/travelbro/get-travel',
          auth_token: newSync.auth_token || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        alert('Trip succesvol gesynchroniseerd met Travel Compositor!');
        await loadData();
      } else {
        alert(`Sync mislukt: ${data.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync error: ${error.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleNewSync = async () => {
    if (!newSync.trip_id || !newSync.compositor_booking_id || !newSync.compositor_api_url) {
      alert('Vul alle verplichte velden in');
      return;
    }

    setSyncing(newSync.trip_id);
    try {
      const { data, error } = await supabase.functions.invoke('compositor-sync', {
        body: newSync,
      });

      if (error) throw error;

      if (data.success) {
        alert('Sync succesvol gestart!');
        setShowNewSyncModal(false);
        setNewSync({
          trip_id: '',
          compositor_booking_id: '',
          compositor_api_url: '',
          auth_token: '',
        });
        await loadData();
      } else {
        alert(`Sync mislukt: ${data.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync error: ${error.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const toggleAutoSync = async (tripId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('travel_trips')
        .update({ auto_sync_enabled: !currentValue })
        .eq('id', tripId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error toggling auto sync:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Travel Compositor Sync</h2>
          <p className="text-gray-600 mt-1">
            Synchroniseer trip data automatisch via External Builder
          </p>
        </div>
        <button
          onClick={() => setShowNewSyncModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Nieuwe Sync
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Trips met Compositor Booking ID</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {trips.filter(t => t.compositor_booking_id).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Geen trips met Compositor booking ID gevonden
            </div>
          ) : (
            trips
              .filter(t => t.compositor_booking_id)
              .map(trip => (
                <div key={trip.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{trip.name}</h4>
                      <p className="text-sm text-gray-500">
                        Booking ID: {trip.compositor_booking_id}
                      </p>
                      {trip.last_compositor_sync && (
                        <p className="text-xs text-gray-400 mt-1">
                          Laatste sync: {new Date(trip.last_compositor_sync).toLocaleString('nl-NL')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={trip.auto_sync_enabled}
                          onChange={() => toggleAutoSync(trip.id, trip.auto_sync_enabled)}
                          className="rounded border-gray-300"
                        />
                        Auto sync
                      </label>
                      <button
                        onClick={() => handleSync(trip.id, trip.compositor_booking_id!)}
                        disabled={syncing === trip.id}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {syncing === trip.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Sync Nu
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Sync History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {syncJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Geen sync jobs gevonden
            </div>
          ) : (
            syncJobs.map(job => (
              <div key={job.id} className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(job.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {job.travel_trips?.name || 'Unknown Trip'}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {new Date(job.created_at).toLocaleString('nl-NL')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Booking ID: {job.compositor_booking_id}
                    </p>
                    {job.error_message && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {job.error_message}
                      </p>
                    )}
                    {job.last_sync_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Sync tijd: {new Date(job.last_sync_at).toLocaleString('nl-NL')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showNewSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Nieuwe Sync Configureren</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip
                </label>
                <select
                  value={newSync.trip_id}
                  onChange={(e) => setNewSync({ ...newSync, trip_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Selecteer een trip</option>
                  {trips.map(trip => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compositor Booking ID *
                </label>
                <input
                  type="text"
                  value={newSync.compositor_booking_id}
                  onChange={(e) => setNewSync({ ...newSync, compositor_booking_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="TC-2026-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compositor API URL *
                </label>
                <input
                  type="text"
                  value={newSync.compositor_api_url}
                  onChange={(e) => setNewSync({ ...newSync, compositor_api_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="https://www.ai-websitestudio.nl/api/travelbro/get-travel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auth Token (optioneel)
                </label>
                <input
                  type="password"
                  value={newSync.auth_token}
                  onChange={(e) => setNewSync({ ...newSync, auth_token: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Bearer token..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewSyncModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleNewSync}
                disabled={syncing !== null}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Start Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
