import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw, Loader2, Building2, Plane, XCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TcMicrosite {
  id: string;
  name: string;
  microsite_id: string;
  username: string;
  password: string;
  is_active: boolean;
  last_verified_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  created_at: string;
  updated_at: string;
}

interface Brand {
  id: string;
  name: string;
}

interface AccessEntry {
  id: string;
  brand_id: string;
  microsite_id: string;
}

type TabType = 'credentials' | 'matrix';

export function TcMicrositeSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('credentials');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [microsites, setMicrosites] = useState<TcMicrosite[]>([]);
  const [accessEntries, setAccessEntries] = useState<AccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMicrosite, setNewMicrosite] = useState({ name: '', microsite_id: '', username: '', password: '' });
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [brandsRes, micrositesRes, accessRes] = await Promise.all([
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('tc_microsites').select('*').order('name'),
        supabase.from('tc_microsite_access').select('*'),
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (micrositesRes.error) throw micrositesRes.error;
      // Access table might not exist yet — handle gracefully
      if (accessRes.error && !accessRes.error.message.includes('does not exist')) {
        throw accessRes.error;
      }

      setBrands(brandsRes.data || []);
      setMicrosites(micrositesRes.data || []);
      setAccessEntries(accessRes.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Kon data niet laden: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Credentials tab ───

  const handleAdd = async () => {
    if (!supabase) return;
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
      setSuccess('Microsite toegevoegd! Vergeet niet om brand-toegang in te stellen in de Matrix tab.');
      setTimeout(() => setSuccess(''), 5000);
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
    if (!supabase || !confirm('Weet je zeker dat je deze microsite wilt verwijderen? Alle brand-koppelingen worden ook verwijderd.')) return;
    try {
      const { error: dbError } = await supabase
        .from('tc_microsites')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      setMicrosites(prev => prev.filter(m => m.id !== id));
      setAccessEntries(prev => prev.filter(a => a.microsite_id !== id));
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
      await handleUpdate(ms);

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
      const now = new Date().toISOString();

      if (result.success) {
        // Update local state with test result
        setMicrosites(prev => prev.map(m => m.id === ms.id ? {
          ...m,
          last_verified_at: now,
          last_test_status: 'success',
          last_test_message: result.message || 'Verbinding succesvol',
        } : m));
        // Persist test status to DB
        await supabase!.from('tc_microsites').update({
          last_test_status: 'success',
          last_test_message: result.message || 'Verbinding succesvol',
        }).eq('id', ms.id);
        setSuccess(`${ms.name}: Verbinding succesvol!`);
      } else {
        const errMsg = result.error || 'Authenticatie mislukt';
        setMicrosites(prev => prev.map(m => m.id === ms.id ? {
          ...m,
          last_verified_at: now,
          last_test_status: 'failed',
          last_test_message: errMsg,
        } : m));
        await supabase!.from('tc_microsites').update({
          last_verified_at: now,
          last_test_status: 'failed',
          last_test_message: errMsg,
        }).eq('id', ms.id);
        setError(`${ms.name}: ${errMsg}`);
      }
    } catch (err: any) {
      const errMsg = `Verbindingsfout - ${err.message}`;
      setMicrosites(prev => prev.map(m => m.id === ms.id ? {
        ...m,
        last_test_status: 'error',
        last_test_message: errMsg,
      } : m));
      setError(`${ms.name}: ${errMsg}`);
    } finally {
      setTesting(null);
      setTimeout(() => { setSuccess(''); setError(''); }, 5000);
    }
  };

  // ─── Matrix tab ───

  const hasAccess = (brandId: string, micrositeId: string) => {
    return accessEntries.some(a => a.brand_id === brandId && a.microsite_id === micrositeId);
  };

  const toggleAccess = async (brandId: string, micrositeId: string) => {
    if (!supabase) return;
    setSavingAccess(true);
    setError('');
    try {
      const existing = accessEntries.find(a => a.brand_id === brandId && a.microsite_id === micrositeId);
      if (existing) {
        // Remove access
        const { error: dbError } = await supabase
          .from('tc_microsite_access')
          .delete()
          .eq('id', existing.id);
        if (dbError) throw dbError;
        setAccessEntries(prev => prev.filter(a => a.id !== existing.id));
      } else {
        // Grant access
        const { data, error: dbError } = await supabase
          .from('tc_microsite_access')
          .insert({ brand_id: brandId, microsite_id: micrositeId })
          .select()
          .single();
        if (dbError) throw dbError;
        setAccessEntries(prev => [...prev, data]);
      }
    } catch (err: any) {
      console.error('Error toggling access:', err);
      setError('Fout bij wijzigen toegang: ' + err.message);
    } finally {
      setSavingAccess(false);
    }
  };

  const grantAllForBrand = async (brandId: string) => {
    if (!supabase) return;
    setSavingAccess(true);
    try {
      const missing = microsites.filter(ms => !hasAccess(brandId, ms.id));
      if (missing.length === 0) return;
      const inserts = missing.map(ms => ({ brand_id: brandId, microsite_id: ms.id }));
      const { data, error: dbError } = await supabase
        .from('tc_microsite_access')
        .insert(inserts)
        .select();
      if (dbError) throw dbError;
      setAccessEntries(prev => [...prev, ...(data || [])]);
    } catch (err: any) {
      setError('Fout: ' + err.message);
    } finally {
      setSavingAccess(false);
    }
  };

  const revokeAllForBrand = async (brandId: string) => {
    if (!supabase) return;
    setSavingAccess(true);
    try {
      const toRemove = accessEntries.filter(a => a.brand_id === brandId);
      if (toRemove.length === 0) return;
      const { error: dbError } = await supabase
        .from('tc_microsite_access')
        .delete()
        .eq('brand_id', brandId);
      if (dbError) throw dbError;
      setAccessEntries(prev => prev.filter(a => a.brand_id !== brandId));
    } catch (err: any) {
      setError('Fout: ' + err.message);
    } finally {
      setSavingAccess(false);
    }
  };

  // ─── Helpers ───

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

  const getTestStatusBadge = (ms: TcMicrosite) => {
    if (!ms.last_test_status) {
      return <span className="text-xs text-gray-400 italic">Nog niet getest</span>;
    }
    if (ms.last_test_status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          <CheckCircle size={10} /> OK
          {ms.last_verified_at && <span className="text-green-500 ml-1">{new Date(ms.last_verified_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5" title={ms.last_test_message || ''}>
        <XCircle size={10} /> Mislukt
        {ms.last_verified_at && <span className="text-red-500 ml-1">{new Date(ms.last_verified_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
      </span>
    );
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
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'credentials'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plane size={16} />
              Credentials ({microsites.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'matrix'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Toegang Matrix
            </div>
          </button>
        </div>
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

      {/* ═══ CREDENTIALS TAB ═══ */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Globale TC microsites. Credentials worden server-side bewaard en nooit aan brands getoond.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Nieuwe microsite
            </button>
          </div>

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
                    placeholder="bijv. Pacific Island Travel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Microsite ID</label>
                  <input
                    type="text"
                    value={newMicrosite.microsite_id}
                    onChange={(e) => setNewMicrosite(prev => ({ ...prev, microsite_id: e.target.value }))}
                    placeholder="bijv. pacificislandtravel"
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

          {microsites.length === 0 && !showAddForm ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Plane size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-2">Nog geen TC microsites</p>
              <p className="text-sm text-gray-400">Voeg Travel Compositor credentials toe</p>
            </div>
          ) : (
            <div className="space-y-4">
              {microsites.map(ms => (
                <div key={ms.id} className={`bg-white rounded-xl border ${ms.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${ms.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{ms.name}</h4>
                          {getTestStatusBadge(ms)}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Microsite ID: {ms.microsite_id}
                          {' · '}
                          {accessEntries.filter(a => a.microsite_id === ms.id).length} brand(s) gekoppeld
                        </p>
                        {ms.last_test_status === 'failed' && ms.last_test_message && (
                          <p className="text-xs text-red-500 mt-1">{ms.last_test_message}</p>
                        )}
                      </div>
                    </div>
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
        </div>
      )}

      {/* ═══ MATRIX TAB ═══ */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Bepaal welke brands welke TC microsites mogen gebruiken. Admin/operator heeft altijd toegang tot alles.
          </p>

          {microsites.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">Voeg eerst microsites toe in de Credentials tab</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[200px]">
                        Brand
                      </th>
                      {microsites.map(ms => (
                        <th key={ms.id} className="text-center px-3 py-3 text-xs font-semibold text-gray-600 min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="truncate max-w-[110px]">{ms.name}</span>
                            {ms.last_test_status === 'success' && (
                              <span className="w-2 h-2 rounded-full bg-green-400" title="Verbinding OK" />
                            )}
                            {ms.last_test_status === 'failed' && (
                              <span className="w-2 h-2 rounded-full bg-red-400" title="Verbinding mislukt" />
                            )}
                            {!ms.last_test_status && (
                              <span className="w-2 h-2 rounded-full bg-gray-300" title="Nog niet getest" />
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 min-w-[80px]">
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((brand, idx) => (
                      <tr key={brand.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/30 transition-colors`}>
                        <td className="px-4 py-3 sticky left-0 bg-inherit">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{brand.name}</span>
                          </div>
                        </td>
                        {microsites.map(ms => {
                          const checked = hasAccess(brand.id, ms.id);
                          return (
                            <td key={ms.id} className="text-center px-3 py-3">
                              <button
                                onClick={() => toggleAccess(brand.id, ms.id)}
                                disabled={savingAccess}
                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  checked
                                    ? 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
                                    : 'bg-white border-gray-300 text-transparent hover:border-orange-300'
                                }`}
                              >
                                {checked && <CheckCircle size={14} />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="text-center px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => grantAllForBrand(brand.id)}
                              disabled={savingAccess}
                              className="text-xs text-green-600 hover:text-green-800 px-1.5 py-0.5 rounded hover:bg-green-50"
                              title="Alles toekennen"
                            >
                              Alles
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => revokeAllForBrand(brand.id)}
                              disabled={savingAccess}
                              className="text-xs text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50"
                              title="Alles intrekken"
                            >
                              Geen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Hoe werkt de matrix?</p>
            <ul className="space-y-1 text-blue-700">
              <li>- Klik op een cel om toegang te geven of in te trekken</li>
              <li>- Admin/operator heeft altijd toegang tot alle microsites</li>
              <li>- Brands zien alleen de microsites waar ze toegang toe hebben</li>
              <li>- Credentials (username/password) zijn nooit zichtbaar voor brands</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
