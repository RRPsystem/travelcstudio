import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Eye, ArrowLeft, Sparkles, Save, Image as ImageIcon, Loader2, Globe, Thermometer, Calendar, Coins, Languages, Clock, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

interface Destination {
  id: string;
  title: string;
  slug: string;
  country: string;
  continent?: string;
  intro_text?: string;
  featured_image?: string;
  climate?: string;
  best_time_to_visit?: string;
  currency?: string;
  language?: string;
  timezone?: string;
  visa_info?: string;
  highlights?: Array<{ title: string; description: string; image?: string }>;
  regions?: Array<{ name: string; description: string }>;
  facts?: Array<{ label: string; value: string }>;
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

type ViewMode = 'list' | 'create' | 'edit';

const CONTINENTS = [
  'Afrika', 'Azië', 'Europa', 'Noord-Amerika', 'Oceanië', 'Zuid-Amerika', 'Midden-Oosten', 'Caribisch Gebied'
];

const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';

const emptyFormData = {
  title: '',
  slug: '',
  country: '',
  continent: '',
  intro_text: '',
  featured_image: '',
  climate: '',
  best_time_to_visit: '',
  currency: '',
  language: '',
  timezone: '',
  visa_info: '',
  highlights: [] as Array<{ title: string; description: string; image?: string }>,
  regions: [] as Array<{ name: string; description: string }>,
  facts: [] as Array<{ label: string; value: string }>
};

export function DestinationManagement() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    loadDestinations();
    loadBrands();
  }, []);

  const loadDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
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

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      slug: generateSlug(value),
      country: prev.country || value
    }));
  };

  const handleCreateNew = () => {
    setFormData(emptyFormData);
    setEditingDestination(null);
    setViewMode('create');
  };

  const handleEdit = (destination: Destination) => {
    setFormData({
      title: destination.title || '',
      slug: destination.slug || '',
      country: destination.country || '',
      continent: destination.continent || '',
      intro_text: destination.intro_text || '',
      featured_image: destination.featured_image || '',
      climate: destination.climate || '',
      best_time_to_visit: destination.best_time_to_visit || '',
      currency: destination.currency || '',
      language: destination.language || '',
      timezone: destination.timezone || '',
      visa_info: destination.visa_info || '',
      highlights: destination.highlights || [],
      regions: destination.regions || [],
      facts: destination.facts || []
    });
    setEditingDestination(destination);
    setViewMode('edit');
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingDestination(null);
    setFormData(emptyFormData);
  };

  const handleGenerateWithAI = async () => {
    if (!formData.title.trim()) {
      alert('Vul eerst een bestemmingsnaam in (bijv. Peru)');
      return;
    }

    console.log('🤖 Starting AI generation for:', formData.title);
    setGeneratingAI(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session:', session ? 'Found' : 'Not found');
      
      const requestBody = {
        contentType: 'destination',
        prompt: `Genereer uitgebreide reisinformatie voor ${formData.title}`,
        structuredGeneration: {
          name: formData.title,
          type: 'destination',
          brandId: SYSTEM_BRAND_ID,
          userId: user?.id,
          fields: ['intro_text', 'climate', 'best_time_to_visit', 'currency', 'language', 'timezone', 'visa_info', 'highlights', 'regions', 'facts']
        }
      };
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error('AI generation failed');
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      
      if (data.content) {
        setFormData(prev => ({
          ...prev,
          intro_text: data.content.intro_text || prev.intro_text,
          climate: data.content.climate || prev.climate,
          best_time_to_visit: data.content.best_time_to_visit || prev.best_time_to_visit,
          currency: data.content.currency || prev.currency,
          language: data.content.language || prev.language,
          timezone: data.content.timezone || prev.timezone,
          visa_info: data.content.visa_info || prev.visa_info,
          highlights: data.content.highlights || prev.highlights,
          regions: data.content.regions || prev.regions,
          facts: data.content.facts || prev.facts,
          featured_image: data.content.featured_image || prev.featured_image
        }));
      }
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Er ging iets mis bij het genereren. Probeer het opnieuw.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Titel is verplicht');
      return;
    }

    setSaving(true);

    try {
      const destinationData = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || generateSlug(formData.title),
        country: formData.country.trim() || formData.title.trim(),
        continent: formData.continent.trim(),
        intro_text: formData.intro_text.trim(),
        featured_image: formData.featured_image.trim(),
        climate: formData.climate.trim(),
        best_time_to_visit: formData.best_time_to_visit.trim(),
        currency: formData.currency.trim(),
        language: formData.language.trim(),
        timezone: formData.timezone.trim(),
        visa_info: formData.visa_info.trim(),
        highlights: formData.highlights.filter(h => h.title.trim()),
        regions: formData.regions.filter(r => r.name.trim()),
        facts: formData.facts.filter(f => f.label.trim() && f.value.trim()),
        author_type: 'admin',
        author_id: user?.id,
        brand_id: SYSTEM_BRAND_ID
      };

      if (editingDestination) {
        const { error } = await supabase
          .from('destinations')
          .update(destinationData)
          .eq('id', editingDestination.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('destinations')
          .insert([{ ...destinationData, enabled_for_brands: false, enabled_for_franchise: false, is_mandatory: false }]);
        if (error) throw error;
      }

      await loadDestinations();
      handleBack();
    } catch (error: any) {
      console.error('Error saving destination:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze bestemming wilt verwijderen?')) return;

    try {
      const { error } = await supabase.from('destinations').delete().eq('id', id);
      if (error) throw error;
      loadDestinations();
    } catch (error) {
      console.error('Error deleting destination:', error);
      alert('Fout bij verwijderen');
    }
  };

  const handleToggleBrands = async (id: string, current: boolean) => {
    try {
      await supabase.from('destinations').update({ enabled_for_brands: !current }).eq('id', id);
      loadDestinations();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleFranchise = async (id: string, current: boolean) => {
    try {
      await supabase.from('destinations').update({ enabled_for_franchise: !current }).eq('id', id);
      loadDestinations();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleMandatory = async (id: string, current: boolean) => {
    try {
      await supabase.from('destinations').update({ is_mandatory: !current }).eq('id', id);
      loadDestinations();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddHighlight = () => {
    setFormData(prev => ({ ...prev, highlights: [...prev.highlights, { title: '', description: '' }] }));
  };

  const handleAddRegion = () => {
    setFormData(prev => ({ ...prev, regions: [...prev.regions, { name: '', description: '' }] }));
  };

  const handleAddFact = () => {
    setFormData(prev => ({ ...prev, facts: [...prev.facts, { label: '', value: '' }] }));
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin" size={32} /></div>;
  }

  // CREATE/EDIT VIEW
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {viewMode === 'edit' ? 'Bestemming Bewerken' : 'Nieuwe Bestemming'}
                  </h1>
                  <p className="text-sm text-gray-500">Vul de gegevens in of gebruik AI om content te genereren</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateWithAI}
                  disabled={generatingAI || !formData.title.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {generatingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  <span>{generatingAI ? 'Genereren...' : 'Genereer met AI'}</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.title.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? 'Opslaan...' : 'Opslaan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Destination Name */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
                <MapPin size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bestemmingsnaam</h2>
                <p className="text-sm text-gray-500">Voer de naam van het land of de regio in</p>
              </div>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Bijv. Peru, Thailand, IJsland..."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {formData.title && (
              <p className="mt-2 text-sm text-gray-500">
                Slug: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{formData.slug}</span>
              </p>
            )}
          </div>

          {/* AI Tip */}
          {formData.title && !formData.intro_text && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-violet-600" size={20} />
                <p className="text-violet-800">
                  <strong>Tip:</strong> Klik op "Genereer met AI" om automatisch alle informatie over {formData.title} te laten invullen.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe size={20} className="text-teal-600" />
                  Basis Informatie
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Continent</label>
                      <select
                        value={formData.continent}
                        onChange={(e) => setFormData(prev => ({ ...prev, continent: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Selecteer...</option>
                        {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uitgelichte Afbeelding</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.featured_image}
                        onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMediaSelector(true)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <ImageIcon size={20} />
                      </button>
                    </div>
                    {formData.featured_image && (
                      <img src={formData.featured_image} alt="Preview" className="mt-2 h-40 w-full object-cover rounded-lg" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Introductie</label>
                    <textarea
                      value={formData.intro_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, intro_text: e.target.value }))}
                      rows={4}
                      placeholder="Beschrijf de bestemming..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Practical Info */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-teal-600" />
                  Praktische Informatie
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Thermometer size={18} className="text-gray-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Klimaat</label>
                      <textarea
                        value={formData.climate}
                        onChange={(e) => setFormData(prev => ({ ...prev, climate: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar size={18} className="text-gray-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beste Reistijd</label>
                      <input
                        type="text"
                        value={formData.best_time_to_visit}
                        onChange={(e) => setFormData(prev => ({ ...prev, best_time_to_visit: e.target.value }))}
                        placeholder="Mei - Oktober"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-start gap-2">
                      <Coins size={18} className="text-gray-400 mt-2.5" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
                        <input
                          type="text"
                          value={formData.currency}
                          onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Languages size={18} className="text-gray-400 mt-2.5" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Taal</label>
                        <input
                          type="text"
                          value={formData.language}
                          onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={18} className="text-gray-400 mt-2.5" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tijdzone</label>
                        <input
                          type="text"
                          value={formData.timezone}
                          onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visum Informatie</label>
                    <textarea
                      value={formData.visa_info}
                      onChange={(e) => setFormData(prev => ({ ...prev, visa_info: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Highlights */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Hoogtepunten</h3>
                  <button
                    onClick={handleAddHighlight}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700"
                  >
                    <Plus size={16} /> Toevoegen
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.highlights.map((h, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={h.title}
                          onChange={(e) => {
                            const updated = [...formData.highlights];
                            updated[i].title = e.target.value;
                            setFormData(prev => ({ ...prev, highlights: updated }));
                          }}
                          placeholder="Titel"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, highlights: prev.highlights.filter((_, idx) => idx !== i) }))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <textarea
                        value={h.description}
                        onChange={(e) => {
                          const updated = [...formData.highlights];
                          updated[i].description = e.target.value;
                          setFormData(prev => ({ ...prev, highlights: updated }));
                        }}
                        placeholder="Beschrijving"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                  {formData.highlights.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-4">Nog geen hoogtepunten. Klik op "Genereer met AI" of voeg handmatig toe.</p>
                  )}
                </div>
              </div>

              {/* Regions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Regio's</h3>
                  <button
                    onClick={handleAddRegion}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700"
                  >
                    <Plus size={16} /> Toevoegen
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.regions.map((r, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={r.name}
                          onChange={(e) => {
                            const updated = [...formData.regions];
                            updated[i].name = e.target.value;
                            setFormData(prev => ({ ...prev, regions: updated }));
                          }}
                          placeholder="Regio naam"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, regions: prev.regions.filter((_, idx) => idx !== i) }))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <textarea
                        value={r.description}
                        onChange={(e) => {
                          const updated = [...formData.regions];
                          updated[i].description = e.target.value;
                          setFormData(prev => ({ ...prev, regions: updated }));
                        }}
                        placeholder="Beschrijving"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                  {formData.regions.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-4">Nog geen regio's toegevoegd.</p>
                  )}
                </div>
              </div>

              {/* Facts */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Weetjes</h3>
                  <button
                    onClick={handleAddFact}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700"
                  >
                    <Plus size={16} /> Toevoegen
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.facts.map((f, i) => (
                    <div key={i} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const updated = [...formData.facts];
                          updated[i].label = e.target.value;
                          setFormData(prev => ({ ...prev, facts: updated }));
                        }}
                        placeholder="Label"
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={f.value}
                        onChange={(e) => {
                          const updated = [...formData.facts];
                          updated[i].value = e.target.value;
                          setFormData(prev => ({ ...prev, facts: updated }));
                        }}
                        placeholder="Waarde"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, facts: prev.facts.filter((_, idx) => idx !== i) }))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {formData.facts.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-4">Nog geen weetjes toegevoegd.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showMediaSelector && (
          <SlidingMediaSelector
            isOpen={showMediaSelector}
            onClose={() => setShowMediaSelector(false)}
            onSelect={(url) => {
              setFormData(prev => ({ ...prev, featured_image: url }));
              setShowMediaSelector(false);
            }}
          />
        )}
      </div>
    );
  }

  // LIST VIEW
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
              <p className="text-sm text-gray-600 mt-1">{destinations.length} bestemming(en)</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              <span>Nieuwe Bestemming</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bestemming</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Brands</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Franchise</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Verplicht</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {destinations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{d.title}</div>
                    <div className="text-sm text-gray-500">{d.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.country || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(d.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={d.enabled_for_brands} onChange={() => handleToggleBrands(d.id, d.enabled_for_brands)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={d.enabled_for_franchise} onChange={() => handleToggleFranchise(d.id, d.enabled_for_franchise)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={d.is_mandatory} onChange={() => handleToggleMandatory(d.id, d.is_mandatory)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button onClick={() => handleEdit(d)} className="text-blue-600 hover:text-blue-900" title="Bewerken">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900" title="Verwijderen">
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
