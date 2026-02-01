import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

interface Highlight {
  title: string;
  description: string;
  image?: string;
}

interface Region {
  name: string;
  description: string;
}

interface Fact {
  label: string;
  value: string;
}

interface DestinationData {
  id?: string;
  title: string;
  slug: string;
  country: string;
  continent: string;
  intro_text: string;
  featured_image: string;
  climate: string;
  best_time_to_visit: string;
  currency: string;
  language: string;
  timezone: string;
  visa_info: string;
  highlights: Highlight[];
  regions: Region[];
  facts: Fact[];
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
}

interface DestinationEditorProps {
  destination?: DestinationData | null;
  destinationId?: string;
  onClose: () => void;
  onSave: () => void;
}

const CONTINENTS = [
  'Afrika',
  'Azië',
  'Europa',
  'Noord-Amerika',
  'Oceanië',
  'Zuid-Amerika',
  'Midden-Oosten',
  'Caribisch Gebied'
];

export function DestinationEditor({ destination: propDestination, destinationId, onClose, onSave }: DestinationEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<DestinationData | null>(propDestination || null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'featured' | { type: 'highlight'; index: number } | null>(null);
  
  const [formData, setFormData] = useState<DestinationData>({
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
    highlights: [],
    regions: [],
    facts: [],
    enabled_for_brands: false,
    enabled_for_franchise: false,
    is_mandatory: false
  });

  const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';

  useEffect(() => {
    if (destinationId && !destination) {
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
      setDestination(data);
    } catch (error) {
      console.error('Error loading destination:', error);
      alert('Kon bestemming niet laden');
    }
  };

  useEffect(() => {
    if (destination) {
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
        facts: destination.facts || [],
        enabled_for_brands: destination.enabled_for_brands || false,
        enabled_for_franchise: destination.enabled_for_franchise || false,
        is_mandatory: destination.is_mandatory || false
      });
    }
  }, [destination]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      slug: !destination?.id ? generateSlug(value) : prev.slug
    }));
  };

  const handleAddHighlight = () => {
    setFormData(prev => ({
      ...prev,
      highlights: [...prev.highlights, { title: '', description: '', image: '' }]
    }));
  };

  const handleUpdateHighlight = (index: number, field: keyof Highlight, value: string) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => 
        i === index ? { ...h, [field]: value } : h
      )
    }));
  };

  const handleRemoveHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const handleAddRegion = () => {
    setFormData(prev => ({
      ...prev,
      regions: [...prev.regions, { name: '', description: '' }]
    }));
  };

  const handleUpdateRegion = (index: number, field: keyof Region, value: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  const handleRemoveRegion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.filter((_, i) => i !== index)
    }));
  };

  const handleAddFact = () => {
    setFormData(prev => ({
      ...prev,
      facts: [...prev.facts, { label: '', value: '' }]
    }));
  };

  const handleUpdateFact = (index: number, field: keyof Fact, value: string) => {
    setFormData(prev => ({
      ...prev,
      facts: prev.facts.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      )
    }));
  };

  const handleRemoveFact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      facts: prev.facts.filter((_, i) => i !== index)
    }));
  };

  const handleMediaSelect = (url: string) => {
    if (mediaTarget === 'featured') {
      setFormData(prev => ({ ...prev, featured_image: url }));
    } else if (mediaTarget && typeof mediaTarget === 'object' && mediaTarget.type === 'highlight') {
      handleUpdateHighlight(mediaTarget.index, 'image', url);
    }
    setShowMediaSelector(false);
    setMediaTarget(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Titel is verplicht');
      return;
    }

    if (!formData.slug.trim()) {
      alert('Slug is verplicht');
      return;
    }

    if (!formData.country.trim()) {
      alert('Land is verplicht');
      return;
    }

    setLoading(true);

    try {
      const destinationData: any = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        country: formData.country.trim(),
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
        brand_id: SYSTEM_BRAND_ID,
        enabled_for_brands: formData.enabled_for_brands,
        enabled_for_franchise: formData.enabled_for_franchise,
        is_mandatory: formData.is_mandatory
      };

      if (destination?.id || destinationId) {
        const { error } = await supabase
          .from('destinations')
          .update(destinationData)
          .eq('id', destination?.id || destinationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('destinations')
          .insert([destinationData]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving destination:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-teal-600 to-teal-700">
          <h2 className="text-xl font-bold text-white">
            {destination?.id || destinationId ? 'Bestemming Bewerken' : 'Nieuwe Bestemming'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basis Informatie</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel / Naam *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Bijvoorbeeld: Peru"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="peru"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Land *
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Peru"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Continent
                  </label>
                  <select
                    value={formData.continent}
                    onChange={(e) => setFormData(prev => ({ ...prev, continent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Selecteer...</option>
                    {CONTINENTS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uitgelichte Afbeelding
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.featured_image}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMediaTarget('featured');
                      setShowMediaSelector(true);
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ImageIcon size={20} />
                  </button>
                </div>
                {formData.featured_image && (
                  <img 
                    src={formData.featured_image} 
                    alt="Preview" 
                    className="mt-2 h-32 w-full object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Introductie Tekst
                </label>
                <textarea
                  value={formData.intro_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, intro_text: e.target.value }))}
                  rows={4}
                  placeholder="Beschrijf de bestemming..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Praktische Informatie</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Klimaat
                </label>
                <textarea
                  value={formData.climate}
                  onChange={(e) => setFormData(prev => ({ ...prev, climate: e.target.value }))}
                  rows={2}
                  placeholder="Beschrijf het klimaat..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beste Reistijd
                </label>
                <input
                  type="text"
                  value={formData.best_time_to_visit}
                  onChange={(e) => setFormData(prev => ({ ...prev, best_time_to_visit: e.target.value }))}
                  placeholder="Mei - Oktober"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valuta
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    placeholder="PEN (Sol)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taal
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                    placeholder="Spaans"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tijdzone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                    placeholder="UTC-5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visum Informatie
                </label>
                <textarea
                  value={formData.visa_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, visa_info: e.target.value }))}
                  rows={2}
                  placeholder="Visum vereisten voor Nederlandse reizigers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Highlights Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Hoogtepunten</h3>
              <button
                type="button"
                onClick={handleAddHighlight}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
              >
                <Plus size={16} />
                Toevoegen
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.highlights.map((highlight, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-gray-400">
                    <GripVertical size={20} />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={highlight.title}
                      onChange={(e) => handleUpdateHighlight(index, 'title', e.target.value)}
                      placeholder="Titel"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={highlight.description}
                      onChange={(e) => handleUpdateHighlight(index, 'description', e.target.value)}
                      placeholder="Beschrijving"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={highlight.image || ''}
                        onChange={(e) => handleUpdateHighlight(index, 'image', e.target.value)}
                        placeholder="Afbeelding URL"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMediaTarget({ type: 'highlight', index });
                          setShowMediaSelector(true);
                        }}
                        className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        <ImageIcon size={16} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {formData.highlights.length === 0 && (
                <p className="text-gray-500 text-sm italic">Nog geen hoogtepunten toegevoegd</p>
              )}
            </div>
          </div>

          {/* Regions Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Regio's</h3>
              <button
                type="button"
                onClick={handleAddRegion}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
              >
                <Plus size={16} />
                Toevoegen
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.regions.map((region, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={region.name}
                      onChange={(e) => handleUpdateRegion(index, 'name', e.target.value)}
                      placeholder="Regio naam"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={region.description}
                      onChange={(e) => handleUpdateRegion(index, 'description', e.target.value)}
                      placeholder="Beschrijving"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRegion(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {formData.regions.length === 0 && (
                <p className="text-gray-500 text-sm italic">Nog geen regio's toegevoegd</p>
              )}
            </div>
          </div>

          {/* Facts Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weetjes / Feiten</h3>
              <button
                type="button"
                onClick={handleAddFact}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
              >
                <Plus size={16} />
                Toevoegen
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.facts.map((fact, index) => (
                <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={fact.label}
                    onChange={(e) => handleUpdateFact(index, 'label', e.target.value)}
                    placeholder="Label"
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    value={fact.value}
                    onChange={(e) => handleUpdateFact(index, 'value', e.target.value)}
                    placeholder="Waarde"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFact(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {formData.facts.length === 0 && (
                <p className="text-gray-500 text-sm italic col-span-2">Nog geen weetjes toegevoegd</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Save size={18} />
            {loading ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      {showMediaSelector && (
        <SlidingMediaSelector
          isOpen={showMediaSelector}
          onClose={() => {
            setShowMediaSelector(false);
            setMediaTarget(null);
          }}
          onSelect={handleMediaSelect}
          brandId={SYSTEM_BRAND_ID}
        />
      )}
    </div>
  );
}
