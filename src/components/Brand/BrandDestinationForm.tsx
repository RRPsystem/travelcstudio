import { useState, useEffect } from 'react';
import { MapPin, ArrowLeft, Sparkles, Save, Loader2, Plus, Trash2, Edit2, Image as ImageIcon, Globe, Thermometer, Calendar, Coins, Languages, Clock, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

interface BrandDestinationFormProps {
  destinationId?: string;
  onBack: () => void;
  onSaved: () => void;
}

const CONTINENTS = [
  'Afrika', 'Azië', 'Europa', 'Noord-Amerika', 'Oceanië', 'Zuid-Amerika', 'Midden-Oosten', 'Caribisch Gebied'
];

const emptyFormData = {
  title: '',
  slug: '',
  country: '',
  continent: '',
  intro_text: '',
  description: '',
  transportation: '',
  featured_image: '',
  images: [] as string[],
  video_url: '',
  map_image: '',
  flag_image: '',
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

export function BrandDestinationForm({ destinationId, onBack, onSaved }: BrandDestinationFormProps) {
  const { user, effectiveBrandId } = useAuth();
  const [formData, setFormData] = useState(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [loading, setLoading] = useState(!!destinationId);

  useEffect(() => {
    if (destinationId) {
      loadDestination();
    }
  }, [destinationId]);

  const loadDestination = async () => {
    if (!destinationId) return;
    
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('id', destinationId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          country: data.country || '',
          continent: data.continent || '',
          intro_text: data.intro_text || '',
          description: data.description || '',
          transportation: data.transportation || '',
          featured_image: data.featured_image || '',
          images: data.images || [],
          video_url: data.video_url || '',
          map_image: data.map_image || '',
          flag_image: data.flag_image || '',
          climate: data.climate || '',
          best_time_to_visit: data.best_time_to_visit || '',
          currency: data.currency || '',
          language: data.language || '',
          timezone: data.timezone || '',
          visa_info: data.visa_info || '',
          highlights: data.highlights || [],
          regions: data.regions || [],
          facts: data.facts || []
        });
      }
    } catch (error) {
      console.error('Error loading destination:', error);
      alert('Fout bij laden van bestemming');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleGenerateWithAI = async () => {
    if (!formData.title.trim()) {
      alert('Vul eerst een bestemmingsnaam in (bijv. Peru)');
      return;
    }

    setGeneratingAI(true);

    try {
      const { data: { session } } = await supabase!.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: 'destination',
          prompt: `Genereer uitgebreide reisinformatie voor ${formData.title}`,
          structuredGeneration: {
            name: formData.title,
            type: 'destination',
            brandId: effectiveBrandId,
            userId: user?.id,
            fields: ['intro_text', 'description', 'transportation', 'climate', 'best_time_to_visit', 'currency', 'language', 'timezone', 'visa_info', 'highlights', 'regions', 'facts']
          }
        })
      });

      if (!response.ok) throw new Error('AI generation failed');

      const data = await response.json();
      
      if (data.content) {
        setFormData(prev => ({
          ...prev,
          intro_text: data.content.intro_text || prev.intro_text,
          description: data.content.description || prev.description,
          transportation: data.content.transportation || prev.transportation,
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
      alert('Vul een bestemmingsnaam in');
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
        description: formData.description.trim(),
        transportation: formData.transportation.trim(),
        featured_image: formData.featured_image.trim(),
        images: formData.images.filter(img => img.trim()),
        video_url: formData.video_url.trim(),
        map_image: formData.map_image.trim(),
        flag_image: formData.flag_image.trim(),
        climate: formData.climate.trim(),
        best_time_to_visit: formData.best_time_to_visit.trim(),
        currency: formData.currency.trim(),
        language: formData.language.trim(),
        timezone: formData.timezone.trim(),
        visa_info: formData.visa_info.trim(),
        highlights: formData.highlights.filter(h => h.title.trim()),
        regions: formData.regions.filter(r => r.name.trim()),
        facts: formData.facts.filter(f => f.label.trim() && f.value.trim()),
        author_type: 'brand',
        author_id: user?.id,
        brand_id: effectiveBrandId
      };

      if (destinationId) {
        // Update existing
        const { error } = await supabase!
          .from('destinations')
          .update(destinationData)
          .eq('id', destinationId);
        if (error) throw error;
      } else {
        // Create new destination
        const { data: newDest, error: destError } = await supabase!
          .from('destinations')
          .insert([{ ...destinationData, enabled_for_brands: false, enabled_for_franchise: false, is_mandatory: false }])
          .select()
          .single();
        
        if (destError) throw destError;

        // Create assignment for this brand
        const { error: assignError } = await supabase!
          .from('destination_brand_assignments')
          .insert([{
            destination_id: newDest.id,
            brand_id: effectiveBrandId,
            status: 'brand',
            is_published: false,
            assigned_at: new Date().toISOString()
          }]);
        
        if (assignError) throw assignError;
      }

      onSaved();
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Fout bij opslaan van bestemming');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {destinationId ? 'Bestemming Bewerken' : 'Nieuwe Bestemming'}
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
            onChange={(e) => {
              const title = e.target.value;
              setFormData(prev => ({ 
                ...prev, 
                title,
                slug: prev.slug || generateSlug(title)
              }));
            }}
            placeholder="Bijv. Peru, Japan, Italië..."
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-2">
            Slug: <code className="bg-gray-100 px-2 py-0.5 rounded">{formData.slug || generateSlug(formData.title) || 'automatisch-gegenereerd'}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
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
                      placeholder="Landnaam"
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
                      type="url"
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

                {/* Photo Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">📸 Foto Galerij</label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ''] }))}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Plus size={16} /> Foto toevoegen
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative group">
                        {img ? (
                          <img src={img} alt={`Foto ${index + 1}`} className="h-24 w-full object-cover rounded-lg" />
                        ) : (
                          <div className="h-24 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                            <ImageIcon size={24} className="text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Voer afbeelding URL in:', img);
                              if (url !== null) {
                                setFormData(prev => ({
                                  ...prev,
                                  images: prev.images.map((i, idx) => idx === index ? url : i)
                                }));
                              }
                            }}
                            className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                images: prev.images.filter((_, idx) => idx !== index)
                              }));
                            }}
                            className="p-1.5 bg-white rounded-full hover:bg-red-100 text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.images.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">Nog geen foto's toegevoegd.</p>
                  )}
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🎬 Video URL</label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="YouTube URL of Travel Video Generator URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Map Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🗺️ Landkaart Afbeelding</label>
                  <input
                    type="url"
                    value={formData.map_image}
                    onChange={(e) => setFormData(prev => ({ ...prev, map_image: e.target.value }))}
                    placeholder="URL naar landkaart afbeelding"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                  {formData.map_image && (
                    <img src={formData.map_image} alt="Landkaart preview" className="mt-2 h-32 object-contain rounded-lg border" />
                  )}
                </div>

                {/* Flag Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🏳️ Vlag Afbeelding</label>
                  <input
                    type="url"
                    value={formData.flag_image}
                    onChange={(e) => setFormData(prev => ({ ...prev, flag_image: e.target.value }))}
                    placeholder="URL naar vlag afbeelding"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                  {formData.flag_image && (
                    <img src={formData.flag_image} alt="Vlag preview" className="mt-2 h-16 object-contain rounded-lg border" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Introductie (korte samenvatting)</label>
                  <textarea
                    value={formData.intro_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, intro_text: e.target.value }))}
                    rows={3}
                    placeholder="Korte introductie van de bestemming..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uitgebreide beschrijving</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={6}
                    placeholder="Uitgebreide informatie over het land, cultuur, bezienswaardigheden..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🚂 Vervoer & Rondreizen</label>
                  <textarea
                    value={formData.transportation}
                    onChange={(e) => setFormData(prev => ({ ...prev, transportation: e.target.value }))}
                    rows={4}
                    placeholder="Hoe reis je het beste door dit land?"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Coins size={18} className="text-gray-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Languages size={18} className="text-gray-400 mt-2.5" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Taal</label>
                      <input
                        type="text"
                        value={formData.language}
                        onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-gray-400 mt-2.5" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tijdzone</label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
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

          {/* Right Column - Highlights, Regions, Facts */}
          <div className="space-y-6">
            {/* Highlights */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Hoogtepunten</h3>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, highlights: [...prev.highlights, { title: '', description: '' }] }))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 text-sm"
                >
                  <Plus size={16} /> Toevoegen
                </button>
              </div>
              <div className="space-y-3">
                {formData.highlights.map((h, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={h.title}
                      onChange={(e) => {
                        const updated = [...formData.highlights];
                        updated[i].title = e.target.value;
                        setFormData(prev => ({ ...prev, highlights: updated }));
                      }}
                      placeholder="Titel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                    />
                    <textarea
                      value={h.description}
                      onChange={(e) => {
                        const updated = [...formData.highlights];
                        updated[i].description = e.target.value;
                        setFormData(prev => ({ ...prev, highlights: updated }));
                      }}
                      placeholder="Beschrijving"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, highlights: prev.highlights.filter((_, idx) => idx !== i) }))}
                      className="mt-2 text-red-600 text-sm hover:text-red-700"
                    >
                      <Trash2 size={14} className="inline mr-1" /> Verwijderen
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Regio's</h3>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, regions: [...prev.regions, { name: '', description: '' }] }))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 text-sm"
                >
                  <Plus size={16} /> Toevoegen
                </button>
              </div>
              <div className="space-y-3">
                {formData.regions.map((r, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => {
                        const updated = [...formData.regions];
                        updated[i].name = e.target.value;
                        setFormData(prev => ({ ...prev, regions: updated }));
                      }}
                      placeholder="Regio naam"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                    />
                    <textarea
                      value={r.description}
                      onChange={(e) => {
                        const updated = [...formData.regions];
                        updated[i].description = e.target.value;
                        setFormData(prev => ({ ...prev, regions: updated }));
                      }}
                      placeholder="Beschrijving"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, regions: prev.regions.filter((_, idx) => idx !== i) }))}
                      className="mt-2 text-red-600 text-sm hover:text-red-700"
                    >
                      <Trash2 size={14} className="inline mr-1" /> Verwijderen
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Facts */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Feiten</h3>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, facts: [...prev.facts, { label: '', value: '' }] }))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 text-sm"
                >
                  <Plus size={16} /> Toevoegen
                </button>
              </div>
              <div className="space-y-3">
                {formData.facts.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={f.label}
                      onChange={(e) => {
                        const updated = [...formData.facts];
                        updated[i].label = e.target.value;
                        setFormData(prev => ({ ...prev, facts: updated }));
                      }}
                      placeholder="Label"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, facts: prev.facts.filter((_, idx) => idx !== i) }))}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Selector */}
      <SlidingMediaSelector
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={(url) => {
          setFormData(prev => ({ ...prev, featured_image: url }));
          setShowMediaSelector(false);
        }}
      />
    </div>
  );
}
