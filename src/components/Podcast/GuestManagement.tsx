import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Mail, Building2, UserCheck, UserX, Clock, CheckCircle, X } from 'lucide-react';

interface Guest {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  company: string | null;
  role_title: string | null;
  status: string;
  invited_date: string;
  confirmed_date: string | null;
  notes: string | null;
  special_requirements: string | null;
  topics: string[] | null;
}

interface GuestManagementProps {
  episodeId: string;
  onStatsUpdate: () => void;
}

export default function GuestManagement({ episodeId, onStatsUpdate }: GuestManagementProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    company: '',
    role_title: '',
    bio: '',
    notes: '',
    special_requirements: ''
  });

  useEffect(() => {
    loadGuests();
  }, [episodeId]);

  const loadGuests = async () => {
    const { data } = await supabase
      .from('podcast_guests')
      .select('*')
      .eq('episode_planning_id', episodeId)
      .order('created_at', { ascending: false });

    setGuests(data || []);
  };

  const addGuest = async () => {
    if (!newGuest.name.trim()) return;

    const { error } = await supabase
      .from('podcast_guests')
      .insert({
        episode_planning_id: episodeId,
        ...newGuest,
        status: 'invited'
      });

    if (!error) {
      setNewGuest({ name: '', email: '', company: '', role_title: '', bio: '', notes: '', special_requirements: '' });
      setShowAddForm(false);
      loadGuests();
      onStatsUpdate();
    }
  };

  const updateGuestStatus = async (guestId: string, status: string) => {
    const updates: any = { status };
    if (status === 'confirmed') {
      updates.confirmed_date = new Date().toISOString();
    }

    await supabase
      .from('podcast_guests')
      .update(updates)
      .eq('id', guestId);

    loadGuests();
    onStatsUpdate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'declined': return 'bg-red-100 text-red-700';
      case 'attended': return 'bg-blue-100 text-blue-700';
      default: return 'bg-orange-100 text-orange-700';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gasten</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Plus size={18} />
          <span>Gast Toevoegen</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Nieuwe Gast</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Naam *</label>
              <input
                type="text"
                value={newGuest.name}
                onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrijf</label>
              <input
                type="text"
                value={newGuest.company}
                onChange={(e) => setNewGuest({ ...newGuest, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Functie</label>
              <input
                type="text"
                value={newGuest.role_title}
                onChange={(e) => setNewGuest({ ...newGuest, role_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notities</label>
            <textarea
              value={newGuest.notes}
              onChange={(e) => setNewGuest({ ...newGuest, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={addGuest}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Gast Toevoegen
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {guests.map((guest) => (
          <div key={guest.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{guest.name}</h3>
                {guest.role_title && guest.company && (
                  <p className="text-sm text-gray-600">{guest.role_title} bij {guest.company}</p>
                )}
                {guest.email && (
                  <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
                    <Mail size={14} />
                    <span>{guest.email}</span>
                  </div>
                )}
                {guest.notes && (
                  <p className="mt-2 text-sm text-gray-600">{guest.notes}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(guest.status)}`}>
                  {guest.status}
                </span>
                <select
                  value={guest.status}
                  onChange={(e) => updateGuestStatus(guest.id, e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="invited">Uitgenodigd</option>
                  <option value="confirmed">Bevestigd</option>
                  <option value="declined">Afgewezen</option>
                  <option value="cancelled">Geannuleerd</option>
                  <option value="attended">Aanwezig</option>
                  <option value="no_show">Niet Verschenen</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {guests.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <UserCheck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen gasten</h3>
            <p className="text-gray-600">Voeg gasten toe voor deze episode</p>
          </div>
        )}
      </div>
    </div>
  );
}
