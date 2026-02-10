import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RouteMap } from '../shared/RouteMap';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';
import {
  Plane, MapPin, Calendar, Euro, Hotel, Eye, ArrowLeft, Edit2, Trash2,
  Star, Ship, Car, Check, X, Image, Download, Loader2, Save, Plus
} from 'lucide-react';

interface Travel {
  id: string;
  travel_compositor_id: string;
  title: string;
  slug: string;
  description: string;
  intro_text: string;
  number_of_nights: number;
  number_of_days: number;
  price_per_person: number;
  price_description: string;
  hero_image: string;
  hero_video_url: string;
  hero_style: string;
  video_start_time: number;
  video_end_time: number;
  images: string[];
  destinations: any[];
  countries: string[];
  continents: string[];
  hotels: any[];
  flights: any[];
  transfers: any[];
  transports: any[];
  cruises: any[];
  car_rentals: any[];
  activities: any[];
  excursions: any[];
  itinerary: any[];
  included: any[];
  excluded: any[];
  highlights: any[];
  categories: string[];
  themes: string[];
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
  author_type: string;
  author_id: string;
  source_microsite?: string;
  created_at: string;
}

interface Assignment {
  id: string;
  travel_id: string;
  brand_id: string;
  is_active: boolean;
  is_featured: boolean;
  show_hotels: boolean;
  show_prices: boolean;
  show_itinerary: boolean;
  header_type: string;
  custom_title: string;
  custom_price: number;
  display_order: number;
  status: string;
}

type ViewMode = 'list' | 'detail' | 'edit';
type EditTab = 'general' | 'photos' | 'components' | 'routemap';
type HeroStyle = 'slideshow' | 'grid' | 'single' | 'video' | 'wide';

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
};

export function BrandTravelCReizen() {
  const { user, effectiveBrandId } = useAuth();
  const [travels, setTravels] = useState<Travel[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  const [editingTravel, setEditingTravel] = useState<Travel | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'own' | 'mandatory'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [selectedTravels, setSelectedTravels] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Import state
  const [importTcId, setImportTcId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Edit state
  const [editTab, setEditTab] = useState<EditTab>('general');
  const [saving, setSaving] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [mediaSelectorMode, setMediaSelectorMode] = useState<'hero' | 'gallery'>('gallery');
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [componentMediaSelector, setComponentMediaSelector] = useState<{type: 'destination' | 'hotel', index: number} | null>(null);

  const [formData, setFormData] = useState({
    title: '', slug: '', description: '', intro_text: '',
    number_of_nights: 0, number_of_days: 0, price_per_person: 0, price_description: '',
    destinations: [] as any[], countries: [] as string[], continents: [] as string[],
    hotels: [] as any[], images: [] as string[],
    hero_image: '', hero_video_url: '', hero_style: 'slideshow' as HeroStyle,
    video_start_time: 0, video_end_time: 0, route_map_url: '',
    itinerary: [] as any[], included: [] as string[], excluded: [] as string[],
    highlights: [] as string[], categories: [] as string[], themes: [] as string[],
  });

  // Touroperator logo mapping per microsite
  const micrositeInfo: Record<string, {name: string, logo: string, color: string}> = {
    'rondreis-planner': { name: 'Rondreis Planner', logo: '🌍', color: 'bg-green-100 text-green-800' },
    'reisbureaunederland': { name: 'Reisbureau Nederland', logo: '🇳🇱', color: 'bg-blue-100 text-blue-800' },
    'symphonytravel': { name: 'Symphony Travel', logo: '🎵', color: 'bg-purple-100 text-purple-800' },
    'pacificislandtravel': { name: 'Travel Time', logo: '⏰', color: 'bg-teal-100 text-teal-800' },
    'newreisplan': { name: 'Travel Time Europa', logo: '🌍', color: 'bg-orange-100 text-orange-800' },
  };

  const brandId = effectiveBrandId || user?.brand_id;
  const apiBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travelc-api`;

  useEffect(() => {
    if (brandId) loadData();
  }, [brandId]);

  const loadData = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      // Load admin travels (enabled for brands or mandatory) + own brand travels - lightweight columns only
      const { data: travelsData, error: travelsError } = await supabase!
        .from('travelc_travels')
        .select('id, travel_compositor_id, title, slug, number_of_nights, number_of_days, price_per_person, hero_image, source_microsite, enabled_for_brands, enabled_for_franchise, is_mandatory, created_at, updated_at')
        .or(`enabled_for_brands.eq.true,is_mandatory.eq.true,author_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (travelsError) throw travelsError;
      setTravels((travelsData || []) as any);

      // Load brand assignments via Edge Function
      const res = await fetch(`${apiBase}?action=assignments&brand_id=${brandId}`);
      const result = await res.json();
      setAssignments(result.assignments || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignment = (travelId: string): Assignment | undefined => {
    return assignments.find(a => a.travel_id === travelId && a.brand_id === brandId);
  };

  const isActive = (travelId: string): boolean => {
    return getAssignment(travelId)?.is_active || false;
  };

  const isOwnTravel = (travel: Travel): boolean => {
    return travel.author_id === user?.id || travel.author_type === 'brand';
  };

  const callToggleApi = async (travelId: string, field?: string, value?: any) => {
    if (!brandId) return;

    // Optimistic update: immediately update local state
    const existing = assignments.find(a => a.travel_id === travelId && a.brand_id === brandId);
    const updateField = (field || 'is_active') as keyof Assignment;
    const newValue = value !== undefined ? value : !(existing?.[updateField] ?? false);

    if (existing) {
      setAssignments(prev => prev.map(a =>
        a.travel_id === travelId && a.brand_id === brandId
          ? { ...a, [updateField]: newValue }
          : a
      ));
    } else {
      // New assignment — add optimistically
      setAssignments(prev => [...prev, {
        id: `temp-${travelId}`,
        travel_id: travelId,
        brand_id: brandId!,
        is_active: true,
        is_featured: false,
        show_hotels: true,
        show_prices: true,
        show_itinerary: true,
        header_type: 'image',
        custom_title: '',
        custom_price: 0,
        display_order: 0,
        status: 'accepted',
      }]);
    }

    try {
      const res = await fetch(`${apiBase}?action=toggle-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travel_id: travelId, brand_id: brandId, field, value }),
      });
      const result = await res.json();
      if (!result.success) {
        // Revert on error
        await loadData();
        throw new Error(result.error);
      }
      // Silently reload assignments in background to sync IDs
      const assignRes = await fetch(`${apiBase}?action=assignments&brand_id=${brandId}`);
      const assignResult = await assignRes.json();
      setAssignments(assignResult.assignments || []);
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  const handleViewDetail = async (travel: Travel) => {
    // Fetch full travel data (list view only has lightweight columns)
    const { data: fullTravel, error } = await supabase!
      .from('travelc_travels')
      .select('*')
      .eq('id', travel.id)
      .single();

    if (error || !fullTravel) {
      alert('Fout bij laden van reisgegevens');
      return;
    }

    setSelectedTravel(fullTravel as Travel);
    setViewMode('detail');
  };

  const handleToggleActive = async (travelId: string) => {
    await callToggleApi(travelId, 'is_active');
  };

  const handleToggleFeatured = async (travelId: string) => {
    await callToggleApi(travelId, 'is_featured');
  };

  const handleToggleSetting = async (travelId: string, field: string, value: any) => {
    await callToggleApi(travelId, field, value);
  };

  // Bulk selection helpers
  const toggleSelectTravel = (travelId: string) => {
    setSelectedTravels(prev => {
      const next = new Set(prev);
      if (next.has(travelId)) next.delete(travelId);
      else next.add(travelId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTravels.size === filteredTravels.length) {
      setSelectedTravels(new Set());
    } else {
      setSelectedTravels(new Set(filteredTravels.map(t => t.id)));
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (!brandId) return;
    const label = activate ? 'activeren' : 'deactiveren';
    if (!confirm(`${selectedTravels.size} reis(en) ${label}?`)) return;
    setBulkProcessing(true);
    try {
      const res = await fetch(`${apiBase}?action=bulk-toggle-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travel_ids: Array.from(selectedTravels),
          brand_id: brandId,
          is_active: activate,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      console.log(`Bulk ${label}: ${result.updated} updated, ${result.inserted} inserted`);
      setSelectedTravels(new Set());
      await loadData();
    } catch (error) {
      console.error('Bulk activate error:', error);
    } finally {
      setBulkProcessing(false);
    }
  };

  // ============================================
  // IMPORT
  // ============================================
  const handleImportFromTC = async () => {
    if (!importTcId.trim()) { setImportError('Voer een Travel Compositor ID in'); return; }
    setImporting(true);
    setImportError('');
    try {
      const res = await fetch(`${apiBase}?action=import-travel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tc_id: importTcId.trim(), author_id: user?.id, author_type: 'brand', microsite_id: 'reisbureaunederland' }),
      });
      const result = await res.json();
      if (!result.success) { setImportError(result.error || 'Fout bij importeren'); return; }

      setImportTcId('');
      await loadData();
      alert(`Reis "${result.title}" succesvol geïmporteerd!`);
    } catch (error: any) {
      setImportError(error.message || 'Fout bij importeren');
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // EDIT
  // ============================================
  const handleEdit = async (travel: Travel) => {
    // Fetch full travel data (list view only has lightweight columns)
    const { data: fullTravel, error } = await supabase!
      .from('travelc_travels')
      .select('*')
      .eq('id', travel.id)
      .single();

    if (error || !fullTravel) {
      alert('Fout bij laden van reisgegevens');
      return;
    }

    setEditingTravel(fullTravel as Travel);
    setFormData({
      title: fullTravel.title, slug: fullTravel.slug,
      description: stripHtml(fullTravel.description || ''),
      intro_text: stripHtml(fullTravel.intro_text || ''),
      number_of_nights: fullTravel.number_of_nights || 0,
      number_of_days: fullTravel.number_of_days || 0,
      price_per_person: fullTravel.price_per_person || 0,
      price_description: fullTravel.price_description || '',
      destinations: (fullTravel.destinations || []).map((d: any) => ({ ...d, description: stripHtml(d.description || ''), highlights: d.highlights || [] })),
      countries: fullTravel.countries || [],
      continents: fullTravel.continents || [],
      hotels: (fullTravel.hotels || []).map((h: any) => ({ ...h, description: stripHtml(h.description || '') })),
      images: fullTravel.images || [],
      hero_image: fullTravel.hero_image || '',
      hero_video_url: fullTravel.hero_video_url || '',
      hero_style: (fullTravel.hero_style as HeroStyle) || 'slideshow',
      video_start_time: fullTravel.video_start_time || 0,
      video_end_time: fullTravel.video_end_time || 0,
      route_map_url: fullTravel.route_map_url || '',
      itinerary: fullTravel.itinerary || [],
      included: fullTravel.included || [],
      excluded: fullTravel.excluded || [],
      highlights: fullTravel.highlights || [],
      categories: fullTravel.categories || [],
      themes: fullTravel.themes || [],
    });
    setEditTab('general');
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { alert('Titel is verplicht'); return; }
    if (!editingTravel) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}?action=save-travel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travel_id: editingTravel.id,
          data: { ...formData, slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      await loadData();
      setViewMode('list');
      setEditingTravel(null);
    } catch (error: any) {
      alert(`Fout bij opslaan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (travel: Travel) => {
    if (!confirm(`Weet je zeker dat je "${travel.title}" wilt verwijderen?`)) return;
    try {
      const res = await fetch(`${apiBase}?action=delete-travel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travel_id: travel.id }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      await loadData();
    } catch (error: any) {
      alert(`Fout bij verwijderen: ${error.message}`);
    }
  };

  // Filter travels
  const filteredTravels = travels.filter(t => {
    if (filter === 'active' && !isActive(t.id)) return false;
    if (filter === 'mandatory' && !t.is_mandatory) return false;
    if (filter === 'own' && !isOwnTravel(t)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) ||
        t.countries?.some(c => c.toLowerCase().includes(q)) ||
        t.destinations?.some((d: any) => d.name?.toLowerCase().includes(q));
    }
    return true;
  });

  // ============================================
  // EDIT VIEW
  // ============================================
  if (viewMode === 'edit' && editingTravel) {
    const tabs = [
      { id: 'general', label: 'Algemeen', icon: '📋' },
      { id: 'photos', label: "Header & Foto's", icon: '🖼️' },
      { id: 'components', label: 'Componenten', icon: '🧩' },
      { id: 'routemap', label: 'Routekaart', icon: '🗺️' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setViewMode('list'); setEditingTravel(null); setEditTab('general'); }} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold">Reis Bewerken</h2>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Opslaan
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setEditTab(tab.id as EditTab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${editTab === tab.id ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className="mr-2">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          {/* TAB: Algemeen */}
          {editTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachten</label>
                  <input type="number" value={formData.number_of_nights} onChange={(e) => setFormData({ ...formData, number_of_nights: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dagen</label>
                  <input type="number" value={formData.number_of_days} onChange={(e) => setFormData({ ...formData, number_of_days: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prijs p.p.</label>
                  <input type="number" value={formData.price_per_person} onChange={(e) => setFormData({ ...formData, price_per_person: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intro Tekst</label>
                <textarea value={formData.intro_text} onChange={(e) => setFormData({ ...formData, intro_text: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded-lg" />
              </div>

              {/* Continents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Continenten</label>
                <div className="flex flex-wrap gap-2">
                  {['Europa', 'Azië', 'Afrika', 'Noord-Amerika', 'Zuid-Amerika', 'Oceanië'].map(cont => (
                    <label key={cont} className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full cursor-pointer hover:bg-gray-100">
                      <input type="checkbox" checked={formData.continents.includes(cont)}
                        onChange={(e) => {
                          if (e.target.checked) setFormData({ ...formData, continents: [...formData.continents, cont] });
                          else setFormData({ ...formData, continents: formData.continents.filter(c => c !== cont) });
                        }} className="w-3 h-3" />
                      <span className="text-sm">{cont}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Landen</label>
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg min-h-10">
                  {formData.countries.map((country, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm">{country}</span>
                  ))}
                  {formData.countries.length === 0 && <span className="text-gray-400 text-sm">Geen landen</span>}
                </div>
              </div>

              {/* Categories (Type reis) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type reis</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.categories.map((cat, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                      {cat}
                      <button onClick={() => setFormData({ ...formData, categories: formData.categories.filter((_, i) => i !== idx) })} className="text-blue-500 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Autorondreis', 'Fly & Drive', 'Strandvakantie', 'Stedentrip', 'Cruise', 'Safari', 'Treinreis', 'Combinatiereis', 'Groepsreis'].map(cat => (
                    <button key={cat} onClick={() => { if (!formData.categories.includes(cat)) setFormData({ ...formData, categories: [...formData.categories, cat] }); }}
                      className={`px-2 py-1 rounded-full text-xs border transition-colors ${formData.categories.includes(cat) ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="+ Ander type (Enter)" className="px-3 py-2 border rounded-lg text-sm w-64"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value && !formData.categories.includes(input.value)) {
                        setFormData({ ...formData, categories: [...formData.categories, input.value] });
                        input.value = '';
                      }
                    }
                  }} />
              </div>

              {/* Themes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thema's</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.themes.map((theme, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                      {theme}
                      <button onClick={() => setFormData({ ...formData, themes: formData.themes.filter((_, i) => i !== idx) })} className="text-purple-500 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <input type="text" placeholder="+ Nieuw thema (Enter)" className="px-3 py-2 border rounded-lg text-sm w-64"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value && !formData.themes.includes(input.value)) {
                        setFormData({ ...formData, themes: [...formData.themes, input.value] });
                        input.value = '';
                      }
                    }
                  }} />
              </div>
            </div>
          )}

          {/* TAB: Header & Foto's */}
          {editTab === 'photos' && (
            <div className="space-y-6">
              {/* Hero Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Stijl</label>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { id: 'slideshow', label: 'Slideshow', icon: '▶️' },
                    { id: 'grid', label: 'Grid', icon: '🖼️' },
                    { id: 'single', label: 'Enkele Foto', icon: '📷' },
                    { id: 'video', label: 'Video', icon: '📺' },
                    { id: 'wide', label: 'Breed', icon: '🌅' },
                  ].map(style => (
                    <button key={style.id} onClick={() => setFormData({ ...formData, hero_style: style.id as HeroStyle })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${formData.hero_style === style.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-xl mb-1">{style.icon}</div>
                      <div className="text-xs font-medium">{style.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Afbeelding</label>
                <div className="flex gap-4 items-start">
                  {formData.hero_image ? (
                    <div className="relative">
                      <img src={formData.hero_image} alt="Hero" className="h-32 w-48 object-cover rounded-lg" />
                      <button onClick={() => setFormData({ ...formData, hero_image: '' })} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="h-32 w-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Image className="w-8 h-8" /></div>
                  )}
                  <button onClick={() => { setMediaSelectorMode('hero'); setShowMediaSelector(true); }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
                    <Image className="w-4 h-4" /> Kies Hero
                  </button>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video (YouTube)</label>
                <input type="text" value={formData.hero_video_url} onChange={(e) => setFormData({ ...formData, hero_video_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="https://www.youtube.com/watch?v=..." />
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start (sec)</label>
                    <input type="number" value={formData.video_start_time} onChange={(e) => setFormData({ ...formData, video_start_time: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" min="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Eind (sec, 0=heel)</label>
                    <input type="number" value={formData.video_end_time} onChange={(e) => setFormData({ ...formData, video_end_time: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" min="0" />
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Foto Galerij ({formData.images.length})</label>
                  <div className="flex gap-2">
                    <button onClick={() => { setMediaSelectorMode('gallery'); setShowMediaSelector(true); }} className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Toevoegen
                    </button>
                    {selectedImages.size > 0 && (
                      <button onClick={() => { setFormData({ ...formData, images: formData.images.filter((_, idx) => !selectedImages.has(idx)) }); setSelectedImages(new Set()); }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Verwijder ({selectedImages.size})</button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 ${selectedImages.has(idx) ? 'border-orange-500' : 'border-transparent'} ${formData.hero_image === img ? 'ring-2 ring-yellow-400' : ''}`}>
                      <img src={img} alt="" className="w-full h-24 object-cover"
                        onClick={() => { const s = new Set(selectedImages); if (s.has(idx)) s.delete(idx); else s.add(idx); setSelectedImages(s); }} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => setFormData({ ...formData, hero_image: img })} className="p-1 bg-yellow-500 text-white rounded text-xs" title="Als hero">⭐</button>
                        <button onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })} className="p-1 bg-red-500 text-white rounded text-xs" title="Verwijder">🗑️</button>
                      </div>
                      {formData.hero_image === img && <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 rounded">Hero</div>}
                    </div>
                  ))}
                </div>
              </div>

              <SlidingMediaSelector isOpen={showMediaSelector} onClose={() => setShowMediaSelector(false)}
                onSelect={(url) => { if (mediaSelectorMode === 'hero') setFormData({ ...formData, hero_image: url }); else setFormData({ ...formData, images: [...formData.images, url] }); setShowMediaSelector(false); }}
                onSelectMultiple={(urls) => { setFormData({ ...formData, images: [...formData.images, ...urls] }); setShowMediaSelector(false); }}
                title={mediaSelectorMode === 'hero' ? 'Kies Hero Afbeelding' : "Foto's Toevoegen"} allowMultiple={mediaSelectorMode === 'gallery'} />
            </div>
          )}

          {/* TAB: Componenten */}
          {editTab === 'components' && (
            <div className="space-y-6">
              {/* Destinations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><MapPin className="w-4 h-4 inline mr-1" />Bestemmingen ({formData.destinations.length})</label>
                <div className="space-y-4">
                  {formData.destinations.map((dest: any, idx: number) => (
                    <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <input type="text" value={dest.name || dest.city || ''} onChange={(e) => { const d = [...formData.destinations]; d[idx] = { ...d[idx], name: e.target.value }; setFormData({ ...formData, destinations: d }); }}
                          className="font-medium bg-white px-2 py-1 border rounded" placeholder="Naam" />
                        {dest.country && <span className="text-sm text-gray-500">({dest.country})</span>}
                        {dest.nights > 0 && <span className="text-sm text-gray-500">{dest.nights}n</span>}
                      </div>
                      <textarea value={dest.description || ''} onChange={(e) => { const d = [...formData.destinations]; d[idx] = { ...d[idx], description: e.target.value }; setFormData({ ...formData, destinations: d }); }}
                        className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Beschrijving..." />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Foto's: {dest.images?.length || 0}</span>
                        <button onClick={() => setComponentMediaSelector({ type: 'destination', index: idx })} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">+ Foto</button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(dest.images || []).slice(0, 4).map((img: string, i: number) => (
                          <div key={i} className="relative group">
                            <img src={img} alt="" className="w-16 h-12 object-cover rounded" />
                            <button onClick={() => { const d = [...formData.destinations]; d[idx] = { ...d[idx], images: (d[idx].images || []).filter((_: any, ii: number) => ii !== i) }; setFormData({ ...formData, destinations: d }); }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hotels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"><Hotel className="w-4 h-4 inline mr-1" />Hotels ({formData.hotels.length})</label>
                <div className="space-y-4">
                  {formData.hotels.map((hotel: any, idx: number) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Hotel className="w-5 h-5 text-green-600" />
                        <input type="text" value={hotel.name || ''} onChange={(e) => { const h = [...formData.hotels]; h[idx] = { ...h[idx], name: e.target.value }; setFormData({ ...formData, hotels: h }); }}
                          className="font-medium bg-white px-2 py-1 border rounded" placeholder="Naam hotel" />
                        {hotel.stars > 0 && <span className="text-yellow-500">{'★'.repeat(hotel.stars)}</span>}
                      </div>
                      <textarea value={hotel.description || ''} onChange={(e) => { const h = [...formData.hotels]; h[idx] = { ...h[idx], description: e.target.value }; setFormData({ ...formData, hotels: h }); }}
                        className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Beschrijving..." />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">Foto's: {hotel.images?.length || 0}</span>
                        <button onClick={() => setComponentMediaSelector({ type: 'hotel', index: idx })} className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200">+ Foto</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Component Media Selector */}
              <SlidingMediaSelector isOpen={componentMediaSelector !== null} onClose={() => setComponentMediaSelector(null)}
                onSelect={(url) => {
                  if (componentMediaSelector) {
                    if (componentMediaSelector.type === 'destination') {
                      const d = [...formData.destinations]; d[componentMediaSelector.index] = { ...d[componentMediaSelector.index], images: [...(d[componentMediaSelector.index].images || []), url] };
                      setFormData({ ...formData, destinations: d });
                    } else {
                      const h = [...formData.hotels]; h[componentMediaSelector.index] = { ...h[componentMediaSelector.index], images: [...(h[componentMediaSelector.index].images || []), url] };
                      setFormData({ ...formData, hotels: h });
                    }
                  }
                  setComponentMediaSelector(null);
                }}
                title={componentMediaSelector?.type === 'destination' ? 'Foto toevoegen aan bestemming' : 'Foto toevoegen aan hotel'} />

              {/* Flights (read-only) */}
              {(() => {
                const flightsOnly = (editingTravel?.transports || []).filter((t: any) => t.transportType === 'FLIGHT');
                const allFlights = [...flightsOnly, ...(editingTravel?.flights || []).filter((f: any) => !flightsOnly.some((t: any) => t.id === f.id))];
                return allFlights.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><Plane className="w-4 h-4 inline mr-1" />Vluchten ({allFlights.length})</label>
                    <div className="space-y-2">
                      {allFlights.map((t: any, idx: number) => (
                        <div key={idx} className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-center gap-2">
                          <Plane className="w-4 h-4 text-sky-600" />
                          <span className="font-medium text-sm">{t.originCode || t.from || 'Vertrek'} → {t.targetCode || t.to || 'Aankomst'}</span>
                          {t.company && <span className="text-sm text-gray-500">({t.company})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Car Rentals (read-only) */}
              {editingTravel?.car_rentals?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><Car className="w-4 h-4 inline mr-1" />Huurauto's ({editingTravel.car_rentals.length})</label>
                  {editingTravel.car_rentals.map((car: any, idx: number) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
                      {car.imageUrl && <img src={car.imageUrl} alt="" className="w-20 h-14 object-contain rounded" />}
                      <div><strong>{car.product || 'Huurauto'}</strong><div className="text-xs text-gray-500">{car.pickupLocation} → {car.dropoffLocation}</div></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cruises (read-only) */}
              {editingTravel?.cruises?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2"><Ship className="w-4 h-4 inline mr-1" />Cruises ({editingTravel.cruises.length})</label>
                  {editingTravel.cruises.map((c: any, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                      <Ship className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">{c.cruiseLine || 'Cruise'}</span>
                      {c.nights > 0 && <span className="text-sm text-gray-500">{c.nights}n</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Routekaart */}
          {editTab === 'routemap' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">🗺️ Routekaart</h3>
              <p className="text-sm text-gray-500">Kaart met genummerde markers per bestemming. Coördinaten worden automatisch opgezocht.</p>
              {formData.destinations.length >= 2 ? (
                <RouteMap
                  destinations={formData.destinations.map((d: any) => ({
                    name: d.name || d.title || '', country: d.country || '',
                    lat: d.geolocation?.latitude || d.lat || 0, lng: d.geolocation?.longitude || d.lng || 0,
                    image: d.imageUrls?.[0] || d.images?.[0] || d.image || '',
                    description: d.description || '', nights: d.nights || 0,
                  }))}
                  height="500px"
                  onGeocodingComplete={(geocoded) => {
                    const updatedDests = formData.destinations.map((d: any) => {
                      const geo = geocoded.find((g: any) => g.name === (d.name || d.title));
                      if (geo && geo.lat && geo.lng) return { ...d, geolocation: { latitude: geo.lat, longitude: geo.lng } };
                      return d;
                    });
                    setFormData({ ...formData, destinations: updatedDests });
                  }}
                />
              ) : (
                <div className="flex items-center justify-center bg-gray-100 rounded-lg h-64">
                  <p className="text-gray-500 text-sm">Minimaal 2 bestemmingen nodig</p>
                </div>
              )}
              {formData.destinations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Bestemmingen ({formData.destinations.length})</h4>
                  <div className="space-y-1">
                    {formData.destinations.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                        <span className="font-medium">{d.name || d.title}</span>
                        {d.nights > 0 && <span className="text-gray-500">({d.nights}n)</span>}
                        {d.geolocation?.latitude ? (
                          <span className="text-xs text-green-600 ml-auto">📍 {d.geolocation.latitude.toFixed(2)}, {d.geolocation.longitude.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-orange-500 ml-auto">⏳ Wordt opgezocht...</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // DETAIL VIEW
  // ============================================
  if (viewMode === 'detail' && selectedTravel) {
    const travel = selectedTravel;
    const assignment = getAssignment(travel.id);
    const destinations = travel.destinations || [];
    const hotels = travel.hotels || [];
    const flights = travel.flights || [];
    const itinerary = travel.itinerary || [];

    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setViewMode('list'); setSelectedTravel(null); }} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
          </button>
          {isOwnTravel(travel) && (
            <button onClick={() => handleEdit(travel)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm">
              <Edit2 className="w-4 h-4" /> Bewerken
            </button>
          )}
        </div>

        {/* Hero */}
        {travel.hero_image && (
          <div className="relative rounded-xl overflow-hidden mb-6 h-72">
            <img src={travel.hero_image} alt={travel.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h1 className="text-3xl font-bold mb-2">{travel.title}</h1>
              <div className="flex items-center gap-4 text-sm opacity-90">
                {travel.number_of_days > 0 && <span>{travel.number_of_days} dagen / {travel.number_of_nights} nachten</span>}
                {travel.countries?.length > 0 && <span>{travel.countries.join(', ')}</span>}
                {travel.price_per_person > 0 && <span className="font-bold text-lg">Vanaf € {Number(travel.price_per_person).toLocaleString()} p.p.</span>}
              </div>
            </div>
          </div>
        )}

        {/* Brand Assignment Controls */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-orange-800 mb-3">Jouw instellingen voor deze reis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={assignment?.is_active || false} onChange={() => handleToggleActive(travel.id)} className="w-4 h-4 text-orange-600 rounded" />
              <span className="text-sm">Actief op website</span>
            </label>
            {assignment?.is_active && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={assignment?.is_featured || false} onChange={() => handleToggleFeatured(travel.id)} className="w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm">Uitgelicht</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={assignment?.show_hotels ?? true} onChange={() => handleToggleSetting(travel.id, 'show_hotels', !(assignment?.show_hotels ?? true))} className="w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm">Toon hotels</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={assignment?.show_prices ?? true} onChange={() => handleToggleSetting(travel.id, 'show_prices', !(assignment?.show_prices ?? true))} className="w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm">Toon prijzen</span>
                </label>
              </>
            )}
          </div>
          {travel.is_mandatory && <p className="text-xs text-orange-600 mt-2">Deze reis is verplicht en verschijnt altijd op je website.</p>}
        </div>

        {/* Intro */}
        {travel.intro_text && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <p className="text-gray-700 text-lg leading-relaxed">{travel.intro_text}</p>
          </div>
        )}

        {/* Highlights */}
        {travel.highlights?.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Hoogtepunten</h2>
            <div className="grid grid-cols-2 gap-2">
              {travel.highlights.map((hl: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-blue-50 rounded-lg p-2">
                  <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{typeof hl === 'string' ? hl : hl.text || hl.title || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Route Map */}
        {destinations.length >= 2 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Routekaart</h2>
            <RouteMap destinations={destinations.map((d: any) => ({ name: d.name || '', country: d.country || '', lat: d.geolocation?.latitude || 0, lng: d.geolocation?.longitude || 0, image: d.imageUrls?.[0] || d.images?.[0] || '', description: d.description || '', nights: d.nights || 0 }))} height="400px" />
          </div>
        )}

        {/* Destinations */}
        {destinations.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Bestemmingen ({destinations.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {destinations.map((dest: any, idx: number) => (
                <div key={idx} className="flex gap-3 bg-gray-50 rounded-lg overflow-hidden">
                  {(dest.imageUrls?.[0] || dest.images?.[0]) && <img src={dest.imageUrls?.[0] || dest.images?.[0]} alt={dest.name} className="w-24 h-20 object-cover flex-shrink-0" />}
                  <div className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                      <span className="font-medium text-sm">{dest.name}</span>
                    </div>
                    {dest.nights > 0 && <span className="text-xs text-gray-500">{dest.nights} nachten</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        {hotels.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Hotels ({hotels.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hotels.map((hotel: any, idx: number) => (
                <div key={idx} className="flex gap-3 bg-gray-50 rounded-lg overflow-hidden">
                  {hotel.imageUrl && <img src={hotel.imageUrl} alt={hotel.name} className="w-24 h-20 object-cover flex-shrink-0" />}
                  <div className="py-2">
                    <span className="font-medium text-sm">{hotel.name}</span>
                    {hotel.stars > 0 && <div className="text-yellow-500 text-xs">{'★'.repeat(hotel.stars)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flights */}
        {flights.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Vluchten</h2>
            {flights.map((f: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
                <Plane className="w-4 h-4 text-blue-500" />
                <div className="text-sm"><strong>{f.departureAirport} → {f.arrivalAirport}</strong>{f.departureDate && <span className="text-gray-500 ml-2">{f.departureDate}</span>}</div>
              </div>
            ))}
          </div>
        )}

        {/* Cruises */}
        {travel.cruises?.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Cruise</h2>
            {travel.cruises.map((c: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
                <Ship className="w-4 h-4 text-blue-500" />
                <div className="text-sm"><strong>{c.cruiseLine} - {c.selectedCategory}</strong>{c.nights > 0 && <span className="text-gray-500 ml-2">{c.nights}n</span>}</div>
              </div>
            ))}
          </div>
        )}

        {/* Car Rentals */}
        {travel.car_rentals?.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Huurauto</h2>
            {travel.car_rentals.map((car: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
                <Car className="w-4 h-4 text-green-500" />
                <div className="text-sm"><strong>{car.product}</strong>{car.pickupLocation && <span className="text-gray-500 ml-2">{car.pickupLocation} → {car.dropoffLocation}</span>}</div>
              </div>
            ))}
          </div>
        )}

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Reisprogramma</h2>
            <div className="space-y-3 border-l-2 border-blue-300 pl-4 ml-2">
              {itinerary.map((day: any, idx: number) => (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Dag {day.day || day.dayNumber || idx + 1}</span>
                    <span className="font-medium text-sm">{day.title || day.name}</span>
                  </div>
                  {day.description && <p className="text-xs text-gray-600 ml-12">{day.description.replace(/<[^>]*>/g, '').substring(0, 200)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Included / Excluded */}
        {(travel.included?.length > 0 || travel.excluded?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {travel.included?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-bold mb-3 text-green-700">Inclusief</h2>
                <ul className="space-y-1">{travel.included.map((item: any, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><Check className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />{typeof item === 'string' ? item : item.text || item.description || ''}</li>
                ))}</ul>
              </div>
            )}
            {travel.excluded?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-bold mb-3 text-red-700">Exclusief</h2>
                <ul className="space-y-1">{travel.excluded.map((item: any, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><X className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />{typeof item === 'string' ? item : item.text || item.description || ''}</li>
                ))}</ul>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {travel.images?.length > 1 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Foto's ({travel.images.length})</h2>
            <div className="grid grid-cols-4 gap-2">
              {travel.images.slice(0, 12).map((img: string, idx: number) => (
                <img key={idx} src={img} alt="" className="w-full h-24 object-cover rounded-lg" loading="lazy" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // LIST VIEW
  // ============================================
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">TravelC Reizen</h1>
        <p className="text-gray-600">Beheer je reizen: importeer van Travel Compositor, bewerk en activeer voor je website.</p>
      </div>

      {/* Import Section */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Download className="w-5 h-5 text-orange-600" />
          Importeer van Travel Compositor
        </h3>
        <p className="text-sm text-gray-600 mb-3">Importeer reizen van de microsite <strong>Reisbureau Nederland</strong> via het TC ID nummer.</p>
        <div className="flex gap-3">
          <input type="text" value={importTcId} onChange={(e) => { setImportTcId(e.target.value); setImportError(''); }}
            placeholder="Travel Compositor ID (bijv. 35338738)" className="flex-1 px-4 py-2 border rounded-lg" />
          <button onClick={handleImportFromTC} disabled={importing}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Importeren
          </button>
        </div>
        {importError && <p className="mt-2 text-red-600 text-sm">{importError}</p>}
      </div>

      {/* Bulk Actions Bar */}
      {selectedTravels.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-orange-800">
            {selectedTravels.size} reis(en) geselecteerd
          </span>
          <div className="flex gap-2">
            <button onClick={() => handleBulkActivate(true)} disabled={bulkProcessing}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Alles activeren
            </button>
            <button onClick={() => handleBulkActivate(false)} disabled={bulkProcessing}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-1">
              {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Alles deactiveren
            </button>
            <button onClick={() => setSelectedTravels(new Set())}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
              Deselecteer
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'own', label: 'Eigen reizen' },
            { key: 'active', label: 'Actief' },
            { key: 'mandatory', label: 'Verplicht' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Zoek op naam, land..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm flex-1 max-w-xs" />
        <span className="text-sm text-gray-500">{filteredTravels.length} reizen</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredTravels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Plane className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Geen reizen gevonden</p>
          <p className="text-sm text-gray-400 mt-1">Importeer een reis via Travel Compositor ID</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center w-10">
                    <input type="checkbox" checked={selectedTravels.size === filteredTravels.length && filteredTravels.length > 0}
                      onChange={toggleSelectAll} className="rounded border-gray-300" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afbeelding</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actief</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Uitgelicht</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTravels.map(travel => {
                  const assignment = getAssignment(travel.id);
                  const active = assignment?.is_active || false;
                  const featured = assignment?.is_featured || false;
                  const own = isOwnTravel(travel);
                  const image = travel.hero_image || travel.images?.[0] || '';

                  return (
                    <tr key={travel.id} className={`hover:bg-gray-50 ${active ? 'bg-green-50/30' : ''} ${selectedTravels.has(travel.id) ? 'bg-orange-50' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" checked={selectedTravels.has(travel.id)}
                          onChange={() => toggleSelectTravel(travel.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {image ? (
                          <img src={image} alt={travel.title} className="w-20 h-14 object-cover rounded-lg cursor-pointer"
                            onClick={() => handleViewDetail(travel)} />
                        ) : (
                          <div className="w-20 h-14 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer"
                            onClick={() => handleViewDetail(travel)}>
                            <Image className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-orange-600"
                          onClick={() => handleViewDetail(travel)}>
                          {travel.title}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>TC: {travel.travel_compositor_id}</span>
                          {travel.source_microsite && micrositeInfo[travel.source_microsite] && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${micrositeInfo[travel.source_microsite].color}`}>
                              {micrositeInfo[travel.source_microsite].logo} {micrositeInfo[travel.source_microsite].name}
                            </span>
                          )}
                          {travel.is_mandatory && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-medium">Verplicht</span>}
                          {own && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-medium">Eigen reis</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          {travel.number_of_nights > 0 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {travel.number_of_nights}n
                            </span>
                          )}
                          {travel.price_per_person > 0 && (
                            <span className="flex items-center gap-1">
                              <Euro className="w-3 h-3" /> €{Number(travel.price_per_person).toLocaleString()}
                            </span>
                          )}
                          {travel.destinations?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {travel.destinations.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {travel.countries?.length > 0 && (
                          <span className="text-xs text-blue-600">{travel.countries.join(', ')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={active} onChange={() => handleToggleActive(travel.id)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={featured} onChange={() => handleToggleFeatured(travel.id)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                        </label>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleViewDetail(travel)}
                            className="text-gray-500 hover:text-gray-700 p-1" title="Bekijken">
                            <Eye size={16} />
                          </button>
                          {own && (
                            <>
                              <button onClick={() => handleEdit(travel)}
                                className="text-orange-500 hover:text-orange-700 p-1" title="Bewerken">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDelete(travel)}
                                className="text-red-400 hover:text-red-600 p-1" title="Verwijderen">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTravels.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Geen reizen gevonden</p>
                      <p className="text-sm text-gray-400 mt-1">Importeer een reis via Travel Compositor ID</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
