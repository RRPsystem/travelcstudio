import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TcMicrosite {
  id: string;
  brand_id: string;
  name: string;
  microsite_id: string;
  username: string;
  password: string;
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export function TcMicrositeSettings() {
  const { effectiveBrandId } = useAuth();
  const [microsites, setMicrosites] = useState<TcMicrosite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMicrosite, setNewMicrosite] = useState({ name: '', microsite_id: '', username: '', password: '' });

  useEffect(() => {
    loadMicrosites();
  }, [effectiveBrandId]);

  const loadMicrosites = async () => {
    if (!effectiveBrandId || !supabase) return;
    setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('tc_microsites')
        .select('*')
        .eq('brand_id', effectiveBrandId)
        .order('name');

      if (dbError) throw dbError;
      setMicrosites(data || []);
    } catch (err: any) {
      console.error('Error loading TC microsites:', err);
      setError('Kon microsites niet laden: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!effectiveBrandId || !supabase) return;
    if (!newMicrosite.name.trim() || !newMicrosite.microsite_id.trim() || !newMicrosite.username.trim() || !newMicrosite.password.trim()) {
      setError('Vul alle velden in');
      return;
    }

    setSaving('new');
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('tc_microsites')
        .insert({
          brand_id: effectiveBrandId,
          name: newMicrosite.name.trim(),
          microsite_id: newMicrosite.microsite_id.trim(),
          username: newMicrosite.username.trim(),
          password: newMicrosite.password.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setMicrosites(prev => [...prev, data]);
      setNewMicrosite({ name: '', microsite_id: '', username: '', password: '' });
      setShowAddForm(false);
      setSuccess('Microsite toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error adding microsite:', err);
      setError('Fout bij toevoegen: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleUpdate = async (ms: TcMicrosite) => {
    if (!supabase) return;
    setSaving(ms.id);
    setError('');
    try {
      const { error: dbError } = await supabase
        .from('tc_microsites')
        .update({
          name: ms.name,
          microsite_id: ms.microsite_id,
          username: ms.username,
          password: ms.password,
          is_active: ms.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ms.id);

      if (dbError) throw dbError;
      setSuccess('Microsite opgeslagen!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating microsite:', err);
      setError('Fout bij opslaan: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Weet je zeker dat je deze microsite wilt verwijderen?')) return;
    try {
      const { error: dbError } = await supabase
        .from('tc_microsites')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      setMicrosites(prev => prev.filter(m => m.id !== id));
      setSuccess('Microsite verwijderd');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting microsite:', err);
      setError('Fout bij verwijderen: ' + err.message);
    }
  };

  const handleTest = async (ms: TcMicrosite) => {
    setTesting(ms.id);
    setError('');
    try {
      // First save any pending changes so the Edge Function reads the latest credentials
      await handleUpdate(ms);

      // Call server-side Edge Function — credentials never leave the server
      const { data: sessionData } = await supabase!.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://huaaogdxxdcakxryecnw.supabase.co'}/functions/v1/test-tc-credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ micrositeId: ms.id }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setMicrosites(prev => prev.map(m => m.id === ms.id ? { ...m, last_verified_at: new Date().toISOString() } : m));
        setSuccess(`✅ ${ms.name}: Verbinding succesvol!`);
      } else {
        setError(`❌ ${ms.name}: ${result.error || 'Authenticatie mislukt. Controleer credentials.'}`);
      }
    } catch (err: any) {
      setError(`❌ ${ms.name}: Verbindingsfout - ${err.message}`);
    } finally {
      setTesting(null);
      setTimeout(() => { setSuccess(''); setError(''); }, 5000);
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateField = (id: string, field: keyof TcMicrosite, value: any) => {
    setMicrosites(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Travel Compositor Microsites</h2>
          <p className="text-sm text-gray-500 mt-1">
            Beheer je TC credentials centraal. Deze worden gebruikt door offertes, AI Video, en imports.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Microsite toevoegen
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 space-y-4">
          <h3 className="font-medium text-gray-900">Nieuwe microsite toevoegen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
              <input
                type="text"
                value={newMicrosite.name}
                onChange={(e) => setNewMicrosite(prev => ({ ...prev, name: e.target.value }))}
                placeholder="bijv. pacificislandtravel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Microsite ID</label>
              <input
                type="text"
                value={newMicrosite.microsite_id}
                onChange={(e) => setNewMicrosite(prev => ({ ...prev, microsite_id: e.target.value }))}
                placeholder="bijv. 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gebruikersnaam</label>
              <input
                type="text"
                value={newMicrosite.username}
                onChange={(e) => setNewMicrosite(prev => ({ ...prev, username: e.target.value }))}
                placeholder="TC gebruikersnaam"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Wachtwoord</label>
              <input
                type="password"
                value={newMicrosite.password}
                onChange={(e) => setNewMicrosite(prev => ({ ...prev, password: e.target.value }))}
                placeholder="TC wachtwoord"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAdd}
              disabled={saving === 'new'}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Toevoegen
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewMicrosite({ name: '', microsite_id: '', username: '', password: '' }); }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Existing microsites */}
      {microsites.length === 0 && !showAddForm ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">Nog geen TC microsites geconfigureerd</p>
          <p className="text-sm text-gray-400">Voeg je Travel Compositor credentials toe om offertes te importeren</p>
        </div>
      ) : (
        <div className="space-y-4">
          {microsites.map(ms => (
            <div key={ms.id} className={`bg-white rounded-xl border ${ms.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${ms.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{ms.name}</h4>
                    <p className="text-xs text-gray-400">
                      Microsite ID: {ms.microsite_id}
                      {ms.last_verified_at && (
                        <> · Laatst getest: {new Date(ms.last_verified_at).toLocaleDateString('nl-NL')}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ms.is_active}
                      onChange={(e) => { updateField(ms.id, 'is_active', e.target.checked); }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Naam</label>
                  <input
                    type="text"
                    value={ms.name}
                    onChange={(e) => updateField(ms.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Microsite ID</label>
                  <input
                    type="text"
                    value={ms.microsite_id}
                    onChange={(e) => updateField(ms.id, 'microsite_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Gebruikersnaam</label>
                  <input
                    type="text"
                    value={ms.username}
                    onChange={(e) => updateField(ms.id, 'username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Wachtwoord</label>
                  <div className="relative">
                    <input
                      type={showPasswords.has(ms.id) ? 'text' : 'password'}
                      value={ms.password}
                      onChange={(e) => updateField(ms.id, 'password', e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => togglePassword(ms.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.has(ms.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdate(ms)}
                  disabled={saving === ms.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {saving === ms.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Opslaan
                </button>
                <button
                  onClick={() => handleTest(ms)}
                  disabled={testing === ms.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {testing === ms.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Test verbinding
                </button>
                <button
                  onClick={() => handleDelete(ms.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors ml-auto"
                >
                  <Trash2 size={12} />
                  Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 Hoe werkt dit?</p>
        <p>
          De credentials die je hier invoert worden automatisch gebruikt door alle onderdelen van TravelC Studio:
          offerte imports, AI Video Generator, en reis zoekfuncties. Je hoeft ze maar op één plek in te voeren.
        </p>
      </div>
    </div>
  );
}
