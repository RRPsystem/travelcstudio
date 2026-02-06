import { useState, useEffect } from 'react';
import { Plane, Edit2, Trash2, ArrowLeft, Save, Loader2, Download, Hotel, MapPin, Car, Check, X, Image as ImageIcon, Calendar, Euro, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';

interface Travel {
  id: string;
  travel_compositor_id: string;
  title: string;
  slug: string;
  description?: string;
  intro_text?: string;
  number_of_nights?: number;
  number_of_days?: number;
  price_per_person?: number;
  price_description?: string;
  currency?: string;
  destinations?: any[];
  countries?: string[];
  hotels?: any[];
  flights?: any[];
  transports?: any[];
  car_rentals?: any[];
  activities?: any[];
  images?: string[];
  hero_image?: string;
  hero_video_url?: string;
  route_map_url?: string;
  itinerary?: any[];
  included?: any[];
  excluded?: any[];
  highlights?: string[];
  selling_points?: string[];
  practical_info?: any;
  price_breakdown?: any;
  travelers?: any;
  ai_summary?: string;
  all_texts?: any;
  raw_tc_data?: any;
  created_at: string;
  updated_at: string;
}

interface Brand {
  id: string;
  name: string;
  business_type: 'franchise' | 'custom';
}

interface TravelAssignment {
  id: string;
  travel_id: string;
  brand_id: string;
  is_active: boolean;
  is_featured: boolean;
  show_hotels: boolean;
  show_prices: boolean;
  show_itinerary: boolean;
  header_type: 'image' | 'video' | 'slideshow';
  custom_title?: string;
  custom_description?: string;
  custom_price?: number;
  display_order: number;
  status: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'assignments';
type EditTab = 'general' | 'photos' | 'components';
type HeroStyle = 'slideshow' | 'grid' | 'single' | 'video' | 'wide';

// Helper function to strip HTML tags
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export function TravelManagement() {
  const { user } = useAuth();
  const [travels, setTravels] = useState<Travel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assignments, setAssignments] = useState<TravelAssignment[]>([]);
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTravel, setEditingTravel] = useState<Travel | null>(null);
  const [editTab, setEditTab] = useState<EditTab>('general');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importTcId, setImportTcId] = useState('');
  const [importError, setImportError] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [mediaSelectorMode, setMediaSelectorMode] = useState<'hero' | 'gallery'>('gallery');

  const [formData, setFormData] = useState({
    travel_compositor_id: '',
    title: '',
    slug: '',
    description: '',
    intro_text: '',
    number_of_nights: 0,
    number_of_days: 0,
    price_per_person: 0,
    price_description: '',
    destinations: [] as any[],
    countries: [] as string[],
    continents: [] as string[],
    hotels: [] as any[],
    images: [] as string[],
    hero_image: '',
    hero_video_url: '',
    hero_style: 'slideshow' as HeroStyle,
    video_start_time: 0,
    video_end_time: 0,
    route_map_url: '',
    itinerary: [] as any[],
    included: [] as string[],
    excluded: [] as string[],
    highlights: [] as string[],
    categories: [] as string[],
    themes: [] as string[],
    practical_info: {}
  });
  const [componentMediaSelector, setComponentMediaSelector] = useState<{type: 'destination' | 'hotel', index: number} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load travels
      const { data: travelsData, error: travelsError } = await supabase
        .from('travelc_travels')
        .select('*')
        .order('created_at', { ascending: false });

      if (travelsError) throw travelsError;
      setTravels(travelsData || []);

      // Load brands
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, business_type')
        .neq('id', '00000000-0000-0000-0000-000000000999')
        .order('name');

      setBrands(brandsData || []);

      // Load assignments
      const { data: assignmentsData } = await supabase
        .from('travelc_travel_brand_assignments')
        .select('*');

      setAssignments(assignmentsData || []);

      // Load categories from database
      const { data: categoriesData } = await supabase
        .from('travelc_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      setDbCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleImportFromTC = async () => {
    if (!importTcId.trim()) {
      setImportError('Voer een Travel Compositor ID in');
      return;
    }

    setImporting(true);
    setImportError('');

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('travelc_travels')
        .select('id, title')
        .eq('travel_compositor_id', importTcId.trim())
        .maybeSingle();

      if (existing) {
        setImportError(`Deze reis bestaat al: "${existing.title}"`);
        setImporting(false);
        return;
      }

      // Call Travel Compositor API via edge function
      const { data, error } = await supabase.functions.invoke('import-travel-compositor', {
        body: { travelId: importTcId.trim() }
      });

      if (error) throw error;

      if (!data || !data.title) {
        setImportError('Kon reis niet ophalen van Travel Compositor');
        setImporting(false);
        return;
      }

      // Insert into database - map all fields from builder API
      const travelData = {
        travel_compositor_id: importTcId.trim(),
        title: data.title,
        slug: generateSlug(data.title),
        description: data.description || '',
        intro_text: data.introText || '',
        number_of_nights: data.numberOfNights || 0,
        number_of_days: data.numberOfDays || (data.numberOfNights ? data.numberOfNights + 1 : 0),
        price_per_person: data.pricePerPerson || 0,
        price_description: data.priceDescription || '',
        currency: data.currency || 'EUR',
        destinations: data.destinations || [],
        countries: data.countries || [],
        hotels: data.hotels || [],
        flights: data.flights || [],
        transports: data.transports || [],
        car_rentals: data.carRentals || [],
        activities: data.activities || [],
        images: data.images || [],
        hero_image: data.heroImage || data.images?.[0] || '',
        hero_video_url: data.heroVideoUrl || '',
        route_map_url: data.routeMapUrl || '',
        itinerary: data.itinerary || [],
        included: data.included || [],
        excluded: data.excluded || [],
        highlights: data.highlights || [],
        selling_points: data.sellingPoints || [],
        practical_info: data.practicalInfo || {},
        price_breakdown: data.priceBreakdown || {},
        travelers: data.travelers || {},
        ai_summary: data.aiSummary || '',
        all_texts: data.allTexts || {},
        raw_tc_data: data,
        author_id: user?.id
      };

      const { error: insertError } = await supabase
        .from('travelc_travels')
        .insert([travelData]);

      if (insertError) throw insertError;

      setImportTcId('');
      await loadData();
      alert(`Reis "${data.title}" succesvol geïmporteerd!`);
    } catch (error: any) {
      console.error('Import error:', error);
      setImportError(error.message || 'Fout bij importeren');
    } finally {
      setImporting(false);
    }
  };

  const handleEdit = (travel: Travel) => {
    setEditingTravel(travel);
    setFormData({
      travel_compositor_id: travel.travel_compositor_id,
      title: travel.title,
      slug: travel.slug,
      description: stripHtml(travel.description || ''),
      intro_text: stripHtml(travel.intro_text || ''),
      number_of_nights: travel.number_of_nights || 0,
      number_of_days: travel.number_of_days || 0,
      price_per_person: travel.price_per_person || 0,
      price_description: travel.price_description || '',
      destinations: (travel.destinations || []).map((d: any) => ({
        ...d,
        description: stripHtml(d.description || ''),
        highlights: d.highlights || []
      })),
      countries: travel.countries || [],
      continents: (travel as any).continents || [],
      hotels: (travel.hotels || []).map((h: any) => ({
        ...h,
        description: stripHtml(h.description || '')
      })),
      images: travel.images || [],
      hero_image: travel.hero_image || '',
      hero_video_url: travel.hero_video_url || '',
      hero_style: (travel as any).hero_style || 'slideshow',
      video_start_time: (travel as any).video_start_time || 0,
      video_end_time: (travel as any).video_end_time || 0,
      route_map_url: travel.route_map_url || '',
      itinerary: travel.itinerary || [],
      included: travel.included || [],
      excluded: travel.excluded || [],
      highlights: travel.highlights || [],
      categories: (travel as any).categories || [],
      themes: (travel as any).themes || [],
      practical_info: travel.practical_info || {}
    });
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Titel is verplicht');
      return;
    }

    setSaving(true);
    try {
      const travelData = {
        ...formData,
        slug: formData.slug || generateSlug(formData.title)
      };

      if (editingTravel) {
        const { error } = await supabase
          .from('travelc_travels')
          .update(travelData)
          .eq('id', editingTravel.id);

        if (error) throw error;
      }

      await loadData();
      setViewMode('list');
      setEditingTravel(null);
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (travel: Travel) => {
    if (!confirm(`Weet je zeker dat je "${travel.title}" wilt verwijderen?`)) return;

    try {
      const { error } = await supabase
        .from('travelc_travels')
        .delete()
        .eq('id', travel.id);

      if (error) throw error;
      await loadData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      alert(`Fout bij verwijderen: ${error.message}`);
    }
  };

  const handleAssignToBrand = async (travelId: string, brandId: string) => {
    try {
      const existing = assignments.find(a => a.travel_id === travelId && a.brand_id === brandId);
      
      if (existing) {
        // Toggle active status
        const { error } = await supabase
          .from('travelc_travel_brand_assignments')
          .update({ is_active: !existing.is_active })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('travelc_travel_brand_assignments')
          .insert([{
            travel_id: travelId,
            brand_id: brandId,
            is_active: true,
            is_featured: false,
            show_hotels: true,
            show_prices: true,
            show_itinerary: true,
            header_type: 'image',
            display_order: 0,
            status: 'accepted'
          }]);

        if (error) throw error;
      }

      await loadData();
    } catch (error: any) {
      console.error('Error assigning:', error);
      alert(`Fout: ${error.message}`);
    }
  };

  const handleToggleAssignmentSetting = async (assignmentId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('travelc_travel_brand_assignments')
        .update({ [field]: value })
        .eq('id', assignmentId);

      if (error) throw error;
      await loadData();
    } catch (error: any) {
      console.error('Error updating:', error);
    }
  };

  const getAssignment = (travelId: string, brandId: string) => {
    return assignments.find(a => a.travel_id === travelId && a.brand_id === brandId);
  };

  const getActiveCount = (travelId: string) => {
    return assignments.filter(a => a.travel_id === travelId && a.is_active).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Edit view
  if (viewMode === 'edit' && editingTravel) {
    const tabs = [
      { id: 'general', label: 'Algemeen', icon: '📋' },
      { id: 'photos', label: 'Header & Foto\'s', icon: '🖼️' },
      { id: 'components', label: 'Componenten', icon: '🧩' },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setViewMode('list'); setEditingTravel(null); setEditTab('general'); }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold">Reis Bewerken</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Opslaan
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setEditTab(tab.id as EditTab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                editTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
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
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachten</label>
                  <input
                    type="number"
                    value={formData.number_of_nights}
                    onChange={(e) => setFormData({ ...formData, number_of_nights: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dagen</label>
                  <input
                    type="number"
                    value={formData.number_of_days}
                    onChange={(e) => setFormData({ ...formData, number_of_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prijs p.p.</label>
                  <input
                    type="number"
                    value={formData.price_per_person}
                    onChange={(e) => setFormData({ ...formData, price_per_person: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TC ID</label>
                  <input
                    type="text"
                    value={formData.travel_compositor_id}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intro Tekst</label>
                <textarea
                  value={formData.intro_text}
                  onChange={(e) => setFormData({ ...formData, intro_text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Continents & Countries */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🌍 Continenten</label>
                  <div className="flex flex-wrap gap-2">
                    {['Europa', 'Azië', 'Afrika', 'Noord-Amerika', 'Zuid-Amerika', 'Oceanië', 'Antarctica'].map(cont => (
                      <label key={cont} className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={formData.continents.includes(cont)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, continents: [...formData.continents, cont] });
                            } else {
                              setFormData({ ...formData, continents: formData.continents.filter(c => c !== cont) });
                            }
                          }}
                          className="w-3 h-3"
                        />
                        <span className="text-sm">{cont}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🏳️ Landen</label>
                  <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg min-h-10">
                    {formData.countries.map((country, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm">{country}</span>
                    ))}
                    {formData.countries.length === 0 && <span className="text-gray-400 text-sm">Geen landen</span>}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📂 Categorieën</label>
                <div className="flex flex-wrap gap-2">
                  {dbCategories.map(cat => (
                    <label 
                      key={cat.id} 
                      className="flex items-center gap-1 px-3 py-1 rounded-full cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor: formData.categories.includes(cat.name) ? cat.color + '20' : '#f9fafb',
                        borderColor: formData.categories.includes(cat.name) ? cat.color : 'transparent',
                        borderWidth: '1px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(cat.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, categories: [...formData.categories, cat.name] });
                          } else {
                            setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat.name) });
                          }
                        }}
                        className="w-3 h-3"
                      />
                      <span className="text-sm">{cat.icon} {cat.name}</span>
                    </label>
                  ))}
                </div>
                {dbCategories.length === 0 && (
                  <p className="text-sm text-gray-400 mt-2">Geen categorieën gevonden. Voeg ze toe via Admin → Categorieën.</p>
                )}
              </div>

              {/* Themes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🏷️ Thema's</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.themes.map((theme, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1">
                      {theme}
                      <button
                        onClick={() => setFormData({ ...formData, themes: formData.themes.filter((_, i) => i !== idx) })}
                        className="text-purple-500 hover:text-red-500"
                      >×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="+ Nieuw thema toevoegen (Enter)"
                  className="px-3 py-2 border rounded-lg text-sm w-64"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value && !formData.themes.includes(input.value)) {
                        setFormData({ ...formData, themes: [...formData.themes, input.value] });
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB: Header & Foto's */}
          {editTab === 'photos' && (
            <div className="space-y-6">
              {/* Hero Style Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎨 Kies een Hero Stijl</label>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { id: 'slideshow', label: 'Foto Slideshow', desc: 'Automatische slideshow met alle bestemmingsfoto\'s', icon: '▶️' },
                    { id: 'grid', label: 'Foto Grid', desc: '4 foto\'s naast elkaar', icon: '🖼️' },
                    { id: 'single', label: 'Enkele Grote Foto', desc: 'Eén grote foto met titel eronder', icon: '🖼️' },
                    { id: 'video', label: 'YouTube Video', desc: 'Embedded YouTube video als hero', icon: '📺' },
                    { id: 'wide', label: 'Breed Formaat', desc: 'Brede foto, minder hoog', icon: '🌅' },
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setFormData({ ...formData, hero_style: style.id as HeroStyle })}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.hero_style === style.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{style.icon}</div>
                      <div className="font-medium text-sm">{style.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{style.desc}</div>
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
                      <button
                        onClick={() => setFormData({ ...formData, hero_image: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 w-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setMediaSelectorMode('hero'); setShowMediaSelector(true); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Kies Hero Afbeelding
                    </button>
                    <p className="text-xs text-gray-500">Of klik op een foto in de galerij hieronder</p>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Foto Galerij ({formData.images.length} foto's)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMediaSelectorMode('gallery'); setShowMediaSelector(true); }}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Foto's Toevoegen
                    </button>
                    {selectedImages.size > 0 && (
                      <button
                        onClick={() => {
                          const newImages = formData.images.filter((_, idx) => !selectedImages.has(idx));
                          setFormData({ ...formData, images: newImages });
                          setSelectedImages(new Set());
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Verwijder ({selectedImages.size})
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                  {formData.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 ${
                        selectedImages.has(idx) ? 'border-blue-500' : 'border-transparent'
                      } ${formData.hero_image === img ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      <img 
                        src={img} 
                        alt="" 
                        className="w-full h-24 object-cover"
                        onClick={() => {
                          const newSelected = new Set(selectedImages);
                          if (newSelected.has(idx)) {
                            newSelected.delete(idx);
                          } else {
                            newSelected.add(idx);
                          }
                          setSelectedImages(newSelected);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => setFormData({ ...formData, hero_image: img })}
                          className="p-1 bg-yellow-500 text-white rounded text-xs"
                          title="Als hero instellen"
                        >
                          ⭐
                        </button>
                        <button
                          onClick={() => {
                            const newImages = formData.images.filter((_, i) => i !== idx);
                            setFormData({ ...formData, images: newImages });
                          }}
                          className="p-1 bg-red-500 text-white rounded text-xs"
                          title="Verwijderen"
                        >
                          🗑️
                        </button>
                      </div>
                      {formData.hero_image === img && (
                        <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-1 rounded">
                          Hero
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Video URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video (YouTube)</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.hero_video_url}
                      onChange={(e) => setFormData({ ...formData, hero_video_url: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-xs text-gray-500 mt-1">YouTube video URL voor de hero sectie</p>
                  </div>
                  <button
                    onClick={() => { setMediaSelectorMode('hero'); setShowMediaSelector(true); }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    📁 Media
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start tijd (seconden)</label>
                    <input
                      type="number"
                      value={formData.video_start_time}
                      onChange={(e) => setFormData({ ...formData, video_start_time: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Eind tijd (seconden, 0 = hele video)</label>
                    <input
                      type="number"
                      value={formData.video_end_time}
                      onChange={(e) => setFormData({ ...formData, video_end_time: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* SlidingMediaSelector */}
              <SlidingMediaSelector
                isOpen={showMediaSelector}
                onClose={() => setShowMediaSelector(false)}
                onSelect={(imageUrl) => {
                  if (mediaSelectorMode === 'hero') {
                    setFormData({ ...formData, hero_image: imageUrl });
                  } else {
                    setFormData({ ...formData, images: [...formData.images, imageUrl] });
                  }
                  setShowMediaSelector(false);
                }}
                onSelectMultiple={(imageUrls) => {
                  setFormData({ ...formData, images: [...formData.images, ...imageUrls] });
                  setShowMediaSelector(false);
                }}
                title={mediaSelectorMode === 'hero' ? 'Kies Hero Afbeelding' : 'Foto\'s Toevoegen'}
                allowMultiple={mediaSelectorMode === 'gallery'}
              />
            </div>
          )}

          {/* TAB: Componenten */}
          {editTab === 'components' && (
            <div className="space-y-6">

              {/* Editable Destinations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Bestemmingen ({formData.destinations.length})
                </label>
                <div className="space-y-4">
                  {formData.destinations.map((dest: any, idx: number) => (
                    <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <input
                            type="text"
                            value={dest.name || dest.city || ''}
                            onChange={(e) => {
                              const newDests = [...formData.destinations];
                              newDests[idx] = { ...newDests[idx], name: e.target.value };
                              setFormData({ ...formData, destinations: newDests });
                            }}
                            className="font-medium bg-white px-2 py-1 border rounded"
                            placeholder="Naam bestemming"
                          />
                          {dest.country && <span className="text-sm text-gray-500">({dest.country})</span>}
                          {dest.nights && <span className="text-sm text-gray-500">• {dest.nights} nachten</span>}
                        </div>
                      </div>
                      
                      {/* Description */}
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Beschrijving</label>
                        <textarea
                          value={dest.description || ''}
                          onChange={(e) => {
                            const newDests = [...formData.destinations];
                            newDests[idx] = { ...newDests[idx], description: e.target.value };
                            setFormData({ ...formData, destinations: newDests });
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          rows={3}
                          placeholder="Beschrijving van de bestemming..."
                        />
                      </div>

                      {/* Highlights */}
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Highlights</label>
                        <div className="flex flex-wrap gap-1">
                          {(dest.highlights || []).map((h: string, i: number) => (
                            <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                              {h}
                              <button
                                onClick={() => {
                                  const newDests = [...formData.destinations];
                                  newDests[idx] = { 
                                    ...newDests[idx], 
                                    highlights: (newDests[idx].highlights || []).filter((_: any, hi: number) => hi !== i) 
                                  };
                                  setFormData({ ...formData, destinations: newDests });
                                }}
                                className="text-blue-500 hover:text-red-500"
                              >×</button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder="+ highlight"
                            className="text-xs px-2 py-1 border rounded w-24"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement;
                                if (input.value) {
                                  const newDests = [...formData.destinations];
                                  newDests[idx] = { 
                                    ...newDests[idx], 
                                    highlights: [...(newDests[idx].highlights || []), input.value] 
                                  };
                                  setFormData({ ...formData, destinations: newDests });
                                  input.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Images */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">Foto's ({dest.images?.length || 0})</label>
                          <button
                            onClick={() => setComponentMediaSelector({ type: 'destination', index: idx })}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                          >
                            + Foto toevoegen
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(dest.images || []).slice(0, 6).map((img: string, i: number) => (
                            <div key={i} className="relative group">
                              <img src={img} alt="" className="w-16 h-12 object-cover rounded" />
                              <button
                                onClick={() => {
                                  const newDests = [...formData.destinations];
                                  newDests[idx] = { 
                                    ...newDests[idx], 
                                    images: (newDests[idx].images || []).filter((_: any, ii: number) => ii !== i) 
                                  };
                                  setFormData({ ...formData, destinations: newDests });
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100"
                              >×</button>
                            </div>
                          ))}
                          {(dest.images?.length || 0) > 6 && (
                            <span className="text-xs text-gray-400 self-center">+{dest.images.length - 6} meer</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Hotels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hotel className="w-4 h-4 inline mr-1" />
                  Hotels ({formData.hotels.length})
                </label>
                <div className="space-y-4">
                  {formData.hotels.map((hotel: any, idx: number) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Hotel className="w-5 h-5 text-green-600" />
                          <input
                            type="text"
                            value={hotel.name || ''}
                            onChange={(e) => {
                              const newHotels = [...formData.hotels];
                              newHotels[idx] = { ...newHotels[idx], name: e.target.value };
                              setFormData({ ...formData, hotels: newHotels });
                            }}
                            className="font-medium bg-white px-2 py-1 border rounded"
                            placeholder="Naam hotel"
                          />
                          {hotel.stars && <span className="text-yellow-500">{'★'.repeat(hotel.stars)}</span>}
                          {hotel.nights && <span className="text-sm text-gray-500">({hotel.nights} nachten)</span>}
                        </div>
                        {hotel.city && <span className="text-sm text-gray-500">� {hotel.city}</span>}
                      </div>

                      {/* Description */}
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Beschrijving</label>
                        <textarea
                          value={hotel.description || ''}
                          onChange={(e) => {
                            const newHotels = [...formData.hotels];
                            newHotels[idx] = { ...newHotels[idx], description: e.target.value };
                            setFormData({ ...formData, hotels: newHotels });
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          rows={3}
                          placeholder="Beschrijving van het hotel..."
                        />
                      </div>

                      {/* Meal Plan */}
                      {hotel.mealPlan && (
                        <p className="text-sm text-gray-600 mb-2">🍽️ {hotel.mealPlanDescription || hotel.mealPlan}</p>
                      )}

                      {/* Images */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">Foto's ({hotel.images?.length || 0})</label>
                          <button
                            onClick={() => setComponentMediaSelector({ type: 'hotel', index: idx })}
                            className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                          >
                            + Foto toevoegen
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(hotel.images || []).slice(0, 6).map((img: string, i: number) => (
                            <div key={i} className="relative group">
                              <img src={img} alt="" className="w-16 h-12 object-cover rounded" />
                              <button
                                onClick={() => {
                                  const newHotels = [...formData.hotels];
                                  newHotels[idx] = { 
                                    ...newHotels[idx], 
                                    images: (newHotels[idx].images || []).filter((_: any, ii: number) => ii !== i) 
                                  };
                                  setFormData({ ...formData, hotels: newHotels });
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100"
                              >×</button>
                            </div>
                          ))}
                          {(hotel.images?.length || 0) > 6 && (
                            <span className="text-xs text-gray-400 self-center">+{hotel.images.length - 6} meer</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Component Media Selector */}
              <SlidingMediaSelector
                isOpen={componentMediaSelector !== null}
                onClose={() => setComponentMediaSelector(null)}
                onSelect={(imageUrl) => {
                  if (componentMediaSelector) {
                    if (componentMediaSelector.type === 'destination') {
                      const newDests = [...formData.destinations];
                      newDests[componentMediaSelector.index] = {
                        ...newDests[componentMediaSelector.index],
                        images: [...(newDests[componentMediaSelector.index].images || []), imageUrl]
                      };
                      setFormData({ ...formData, destinations: newDests });
                    } else {
                      const newHotels = [...formData.hotels];
                      newHotels[componentMediaSelector.index] = {
                        ...newHotels[componentMediaSelector.index],
                        images: [...(newHotels[componentMediaSelector.index].images || []), imageUrl]
                      };
                      setFormData({ ...formData, hotels: newHotels });
                    }
                  }
                  setComponentMediaSelector(null);
                }}
                title={componentMediaSelector?.type === 'destination' ? 'Foto toevoegen aan bestemming' : 'Foto toevoegen aan hotel'}
              />

              {/* Flights/Transports (read-only) */}
              {(editingTravel?.transports?.length > 0 || editingTravel?.flights?.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Plane className="w-4 h-4 inline mr-1" />
                    Vluchten/Vervoer ({(editingTravel?.transports?.length || 0) + (editingTravel?.flights?.length || 0)})
                  </label>
                  <div className="space-y-2">
                    {editingTravel?.transports?.map((transport: any, idx: number) => (
                      <div key={`t-${idx}`} className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-sky-600" />
                          <span className="font-medium">
                            {transport.originCode || transport.from || 'Vertrek'} → {transport.targetCode || transport.to || 'Aankomst'}
                          </span>
                          {transport.company && <span className="text-sm text-gray-500">({transport.company})</span>}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {transport.departureDate && <span className="mr-2">📅 {transport.departureDate}</span>}
                          {transport.departureTime && <span>🕐 {transport.departureTime}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Car Rentals (read-only) */}
              {editingTravel?.car_rentals?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Car className="w-4 h-4 inline mr-1" />
                    Huurauto's ({editingTravel?.car_rentals?.length || 0})
                  </label>
                  <div className="space-y-2">
                    {editingTravel?.car_rentals?.map((car: any, idx: number) => (
                      <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-orange-600" />
                          <span className="font-medium">
                            {car.company || car.supplier || 'Huurauto'}
                            {car.category && ` - ${car.category}`}
                          </span>
                          {car.days && <span className="text-sm text-gray-500">({car.days} dagen)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cruises (read-only) */}
              {editingTravel?.cruises?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🚢 Cruises ({editingTravel?.cruises?.length || 0})
                  </label>
                  <div className="space-y-2">
                    {editingTravel?.cruises?.map((cruise: any, idx: number) => (
                      <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚢</span>
                          <span className="font-medium">
                            {cruise.shipName || cruise.name || cruise.company || 'Cruise'}
                          </span>
                          {cruise.cabinType && <span className="text-sm text-gray-500">({cruise.cabinType})</span>}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {cruise.departurePort && <span className="mr-2">📍 {cruise.departurePort}</span>}
                          {cruise.arrivalPort && cruise.arrivalPort !== cruise.departurePort && <span>→ {cruise.arrivalPort}</span>}
                          {cruise.nights && <span className="ml-2">({cruise.nights} nachten)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfers (read-only) */}
              {editingTravel?.transfers?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🚐 Transfers ({editingTravel?.transfers?.length || 0})
                  </label>
                  <div className="space-y-2">
                    {editingTravel?.transfers?.map((transfer: any, idx: number) => (
                      <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚐</span>
                          <span className="font-medium">
                            {transfer.pickupLocation || transfer.from || 'Ophalen'} → {transfer.dropoffLocation || transfer.to || 'Afzetten'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {transfer.type && <span className="mr-2">Type: {transfer.type}</span>}
                          {transfer.date && <span className="mr-2">📅 {transfer.date}</span>}
                          {transfer.time && <span>🕐 {transfer.time}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities/Excursions (read-only) */}
              {(editingTravel?.activities?.length > 0 || editingTravel?.excursions?.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 Activiteiten & Excursies ({(editingTravel?.activities?.length || 0) + (editingTravel?.excursions?.length || 0)})
                  </label>
                  <div className="space-y-2">
                    {[...(editingTravel?.activities || []), ...(editingTravel?.excursions || [])].map((activity: any, idx: number) => (
                      <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <span className="font-medium">
                            {activity.name || activity.title || 'Activiteit'}
                          </span>
                          {activity.duration && <span className="text-sm text-gray-500">({activity.duration})</span>}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          {activity.location && <span className="mr-2">📍 {activity.location}</span>}
                          {activity.date && <span className="mr-2">📅 {activity.date}</span>}
                          {activity.price && <span>💰 €{activity.price}</span>}
                        </div>
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

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Reizen Beheer
        </h2>
      </div>

      {/* Import Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Importeer van Travel Compositor
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={importTcId}
            onChange={(e) => { setImportTcId(e.target.value); setImportError(''); }}
            placeholder="Travel Compositor ID (bijv. 35338738)"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleImportFromTC}
            disabled={importing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Importeren
          </button>
        </div>
        {importError && (
          <p className="mt-2 text-red-600 text-sm">{importError}</p>
        )}
      </div>

      {/* Travels List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold">{travels.length} Reizen</h3>
        </div>

        {travels.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nog geen reizen geïmporteerd</p>
            <p className="text-sm">Gebruik het import veld hierboven om een reis toe te voegen</p>
          </div>
        ) : (
          <div className="divide-y">
            {travels.map((travel) => (
              <div key={travel.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="w-32 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {travel.hero_image ? (
                      <img src={travel.hero_image} alt={travel.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg">{travel.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {travel.number_of_nights} nachten
                      </span>
                      {travel.price_per_person && (
                        <span className="flex items-center gap-1">
                          <Euro className="w-4 h-4" />
                          €{travel.price_per_person.toLocaleString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {travel.destinations?.length || 0} bestemmingen
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        TC: {travel.travel_compositor_id}
                      </span>
                    </div>

                    {/* Brand Assignments */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Actief voor:</span>
                        {brands.slice(0, 5).map((brand) => {
                          const assignment = getAssignment(travel.id, brand.id);
                          const isActive = assignment?.is_active;
                          return (
                            <button
                              key={brand.id}
                              onClick={() => handleAssignToBrand(travel.id, brand.id)}
                              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                                isActive
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {brand.name}
                            </button>
                          );
                        })}
                        {brands.length > 5 && (
                          <span className="text-xs text-gray-400">+{brands.length - 5} meer</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(travel)}
                      className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                      title="Bewerken"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(travel)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Assignment Settings */}
                {getActiveCount(travel.id) > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Brand Instellingen:</h5>
                    <div className="space-y-2">
                      {assignments
                        .filter(a => a.travel_id === travel.id && a.is_active)
                        .map((assignment) => {
                          const brand = brands.find(b => b.id === assignment.brand_id);
                          return (
                            <div key={assignment.id} className="flex items-center gap-4 text-sm bg-gray-50 p-2 rounded-lg">
                              <span className="font-medium w-32">{brand?.name}</span>
                              
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignment.show_hotels}
                                  onChange={(e) => handleToggleAssignmentSetting(assignment.id, 'show_hotels', e.target.checked)}
                                  className="rounded"
                                />
                                <Hotel className="w-3 h-3" /> Hotels
                              </label>

                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignment.show_prices}
                                  onChange={(e) => handleToggleAssignmentSetting(assignment.id, 'show_prices', e.target.checked)}
                                  className="rounded"
                                />
                                <Euro className="w-3 h-3" /> Prijzen
                              </label>

                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={assignment.is_featured}
                                  onChange={(e) => handleToggleAssignmentSetting(assignment.id, 'is_featured', e.target.checked)}
                                  className="rounded"
                                />
                                <Star className="w-3 h-3" /> Featured
                              </label>

                              <select
                                value={assignment.header_type}
                                onChange={(e) => handleToggleAssignmentSetting(assignment.id, 'header_type', e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                              >
                                <option value="image">Header: Foto</option>
                                <option value="video">Header: Video</option>
                                <option value="slideshow">Header: Slideshow</option>
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
