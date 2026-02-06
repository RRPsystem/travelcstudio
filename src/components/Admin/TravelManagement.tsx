import { useState, useEffect } from 'react';
import { Plane, Edit2, Trash2, ArrowLeft, Save, Loader2, Download, Hotel, MapPin, Car, Check, X, Image as ImageIcon, Calendar, Euro, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SlidingMediaSelector } from '../shared/SlidingMediaSelector';
import { RouteMap } from '../shared/RouteMap';

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
  cruises?: any[];
  transfers?: any[];
  excursions?: any[];
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
  source_microsite?: string;
  author_type?: string;
  author_id?: string;
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
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
type EditTab = 'general' | 'photos' | 'components' | 'routemap';
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
  const [micrositeId, setMicrositeId] = useState('rondreis-planner');
  const [microsites, setMicrosites] = useState<Array<{id: string, name: string, hasCredentials: boolean}>>([]);
  const [loadingMicrosites, setLoadingMicrosites] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{current: number, total: number, results: Array<{id: string, status: string, title?: string}>} | null>(null);
  const [selectedTravels, setSelectedTravels] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  // Touroperator logo mapping per microsite
  const micrositeLogos: Record<string, {name: string, logo: string, color: string}> = {
    'rondreis-planner': { name: 'Rondreis Planner', logo: '🌍', color: 'bg-green-100 text-green-800' },
    'reisbureaunederland': { name: 'Reisbureau Nederland', logo: '🇳🇱', color: 'bg-blue-100 text-blue-800' },
    'symphonytravel': { name: 'Symphony Travel', logo: '🎵', color: 'bg-purple-100 text-purple-800' },
    'pacificislandtravel': { name: 'Travel Time', logo: '⏰', color: 'bg-teal-100 text-teal-800' },
    'newreisplan': { name: 'Travel Time Europa', logo: '🌍⏰', color: 'bg-orange-100 text-orange-800' },
  };

  // Hardcoded fallback microsites (in case builder API doesn't return all)
  const fallbackMicrosites = [
    { id: 'rondreis-planner', name: 'Rondreis Planner', hasCredentials: true },
    { id: 'reisbureaunederland', name: 'Reisbureau Nederland', hasCredentials: true },
    { id: 'symphonytravel', name: 'Symphony Travel', hasCredentials: true },
    { id: 'pacificislandtravel', name: 'Travel Time', hasCredentials: true },
    { id: 'newreisplan', name: 'Travel Time Europa', hasCredentials: true },
  ];
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
    loadMicrosites();
  }, []);

  const loadMicrosites = async () => {
    setLoadingMicrosites(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-external-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.ai-websitestudio.nl/api/config/microsites',
          method: 'GET'
        })
      });
      const result = await response.json();
      if (result.success && result.data?.microsites) {
        // Merge API results with fallback to ensure all 5 are present
        const apiIds = new Set(result.data.microsites.map((m: any) => m.id));
        const merged = [...result.data.microsites, ...fallbackMicrosites.filter(f => !apiIds.has(f.id))];
        setMicrosites(merged);
      } else {
        setMicrosites(fallbackMicrosites);
      }
    } catch (error) {
      console.log('Using default microsites');
      setMicrosites(fallbackMicrosites);
    } finally {
      setLoadingMicrosites(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load travels - only admin-authored (brand travels stay in brand panel)
      const { data: travelsData, error: travelsError } = await supabase
        .from('travelc_travels')
        .select('*')
        .or('author_type.eq.admin,author_type.is.null')
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

      // Call Travel Compositor API via edge function with micrositeId
      const { data, error } = await supabase.functions.invoke('import-travel-compositor', {
        body: { travelId: importTcId.trim(), micrositeId: micrositeId }
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
        cruises: data.cruises || [],
        transfers: data.transfers || [],
        excursions: data.excursions || [],
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
        source_microsite: micrositeId,
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

  const handleBulkImport = async () => {
    const ids = importTcId.split(/[,;\s]+/).map(id => id.trim()).filter(id => id.length > 0);
    if (ids.length === 0) { setImportError('Voer één of meer TC IDs in (komma-gescheiden)'); return; }
    if (ids.length === 1) { handleImportFromTC(); return; }

    setBulkImporting(true);
    setImportError('');
    const results: Array<{id: string, status: string, title?: string}> = [];
    setBulkProgress({ current: 0, total: ids.length, results });

    for (let i = 0; i < ids.length; i++) {
      const tcId = ids[i];
      try {
        const { data, error } = await supabase!.functions.invoke('import-travel-compositor', {
          body: { travelId: tcId, micrositeId: micrositeId }
        });
        if (error || !data?.title) {
          results.push({ id: tcId, status: 'error', title: error?.message || 'Kon niet ophalen' });
        } else {
          // Check if exists
          const { data: existing } = await supabase!.from('travelc_travels').select('id').eq('travel_compositor_id', tcId).maybeSingle();
          if (existing) {
            results.push({ id: tcId, status: 'exists', title: data.title });
          } else {
            const travelData = {
              travel_compositor_id: tcId, title: data.title, slug: generateSlug(data.title),
              description: data.description || '', intro_text: data.introText || '',
              number_of_nights: data.numberOfNights || 0, number_of_days: data.numberOfDays || 0,
              price_per_person: data.pricePerPerson || 0, price_description: data.priceDescription || '',
              currency: data.currency || 'EUR', destinations: data.destinations || [],
              countries: data.countries || [], hotels: data.hotels || [],
              flights: data.flights || [], transports: data.transports || [],
              car_rentals: data.carRentals || [], activities: data.activities || [],
              cruises: data.cruises || [], transfers: data.transfers || [],
              excursions: data.excursions || [], images: data.images || [],
              hero_image: data.heroImage || data.images?.[0] || '',
              hero_video_url: data.heroVideoUrl || '', route_map_url: data.routeMapUrl || '',
              itinerary: data.itinerary || [], included: data.included || [],
              excluded: data.excluded || [], highlights: data.highlights || [],
              selling_points: data.sellingPoints || [], practical_info: data.practicalInfo || {},
              price_breakdown: data.priceBreakdown || {}, travelers: data.travelers || {},
              ai_summary: data.aiSummary || '', all_texts: data.allTexts || {},
              raw_tc_data: data, source_microsite: micrositeId, author_id: user?.id
            };
            const { error: insertError } = await supabase!.from('travelc_travels').insert([travelData]);
            if (insertError) {
              results.push({ id: tcId, status: 'error', title: insertError.message });
            } else {
              results.push({ id: tcId, status: 'success', title: data.title });
            }
          }
        }
      } catch (err: any) {
        results.push({ id: tcId, status: 'error', title: err.message });
      }
      setBulkProgress({ current: i + 1, total: ids.length, results: [...results] });
    }

    setImportTcId('');
    await loadData();
    setBulkImporting(false);
  };

  const handleImportAllFromMicrosite = async () => {
    if (!micrositeId) return;
    const msName = micrositeLogos[micrositeId]?.name || micrositeId;
    if (!confirm(`Alle reizen van "${msName}" ophalen en importeren?\n\nDit kan even duren.`)) return;

    setBulkImporting(true);
    setImportError('');
    setBulkProgress({ current: 0, total: 0, results: [] });

    try {
      // Step 1: Get list of all travels from builder API
      const { data: { session } } = await supabase!.auth.getSession();
      const listRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-external-api`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.ai-websitestudio.nl/api/travelbro/list-travels?micrositeId=${micrositeId}&language=NL`,
          method: 'GET'
        })
      });
      const listResult = await listRes.json();
      
      if (!listResult.success || !listResult.data?.travels?.length) {
        setImportError(listResult.data?.error || 'Geen reizen gevonden voor deze microsite. Is het list-travels endpoint beschikbaar op de builder?');
        setBulkImporting(false);
        return;
      }

      const travelList = listResult.data.travels;
      const results: Array<{id: string, status: string, title?: string}> = [];
      setBulkProgress({ current: 0, total: travelList.length, results });

      // Step 2: Import each travel
      for (let i = 0; i < travelList.length; i++) {
        const item = travelList[i];
        const tcId = String(item.id);
        try {
          // Check if already exists
          const { data: existing } = await supabase!.from('travelc_travels').select('id').eq('travel_compositor_id', tcId).maybeSingle();
          if (existing) {
            results.push({ id: tcId, status: 'exists', title: item.title || 'Bestaat al' });
          } else {
            // Fetch full travel data
            const { data, error } = await supabase!.functions.invoke('import-travel-compositor', {
              body: { travelId: tcId, micrositeId: micrositeId }
            });
            if (error || !data?.title) {
              results.push({ id: tcId, status: 'error', title: error?.message || 'Kon niet ophalen' });
            } else {
              const travelData = {
                travel_compositor_id: tcId, title: data.title, slug: generateSlug(data.title),
                description: data.description || '', intro_text: data.introText || '',
                number_of_nights: data.numberOfNights || 0, number_of_days: data.numberOfDays || 0,
                price_per_person: data.pricePerPerson || 0, price_description: data.priceDescription || '',
                currency: data.currency || 'EUR', destinations: data.destinations || [],
                countries: data.countries || [], hotels: data.hotels || [],
                flights: data.flights || [], transports: data.transports || [],
                car_rentals: data.carRentals || [], activities: data.activities || [],
                cruises: data.cruises || [], transfers: data.transfers || [],
                excursions: data.excursions || [], images: data.images || [],
                hero_image: data.heroImage || data.images?.[0] || '',
                hero_video_url: data.heroVideoUrl || '', route_map_url: data.routeMapUrl || '',
                itinerary: data.itinerary || [], included: data.included || [],
                excluded: data.excluded || [], highlights: data.highlights || [],
                selling_points: data.sellingPoints || [], practical_info: data.practicalInfo || {},
                price_breakdown: data.priceBreakdown || {}, travelers: data.travelers || {},
                ai_summary: data.aiSummary || '', all_texts: data.allTexts || {},
                raw_tc_data: data, source_microsite: micrositeId, author_id: user?.id
              };
              const { error: insertError } = await supabase!.from('travelc_travels').insert([travelData]);
              if (insertError) {
                results.push({ id: tcId, status: 'error', title: insertError.message });
              } else {
                results.push({ id: tcId, status: 'success', title: data.title });
              }
            }
          }
        } catch (err: any) {
          results.push({ id: tcId, status: 'error', title: err.message });
        }
        setBulkProgress({ current: i + 1, total: travelList.length, results: [...results] });
      }

      await loadData();
      const successCount = results.filter(r => r.status === 'success').length;
      const existsCount = results.filter(r => r.status === 'exists').length;
      alert(`Import klaar!\n\n✅ ${successCount} nieuw geïmporteerd\n⚠️ ${existsCount} bestonden al\n❌ ${results.filter(r => r.status === 'error').length} fouten`);
    } catch (error: any) {
      setImportError(error.message || 'Fout bij ophalen reizen lijst');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleBulkToggleBrands = async (enabled: boolean) => {
    if (selectedTravels.size === 0) return;
    try {
      await supabase!.from('travelc_travels').update({ enabled_for_brands: enabled }).in('id', Array.from(selectedTravels));
      setSelectedTravels(new Set());
      await loadData();
    } catch (error) {
      console.error('Bulk toggle error:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTravels.size === travels.length) {
      setSelectedTravels(new Set());
    } else {
      setSelectedTravels(new Set(travels.map(t => t.id)));
    }
  };

  const toggleSelectTravel = (id: string) => {
    const next = new Set(selectedTravels);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedTravels(next);
  };

  const getMicrositeBadge = (microsite?: string) => {
    if (!microsite) return null;
    const info = micrositeLogos[microsite];
    if (!info) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{microsite}</span>;
    return <span className={`text-xs px-2 py-0.5 rounded-full ${info.color} font-medium`}>{info.logo} {info.name}</span>;
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

  const handleToggleBrands = async (id: string, current: boolean) => {
    try {
      await supabase!.from('travelc_travels').update({ enabled_for_brands: !current }).eq('id', id);
      await loadData();
    } catch (error) { console.error('Error:', error); }
  };

  const handleToggleFranchise = async (id: string, current: boolean) => {
    try {
      await supabase!.from('travelc_travels').update({ enabled_for_franchise: !current }).eq('id', id);
      await loadData();
    } catch (error) { console.error('Error:', error); }
  };

  const handleToggleMandatory = async (id: string, current: boolean) => {
    try {
      await supabase!.from('travelc_travels').update({ is_mandatory: !current }).eq('id', id);
      await loadData();
    } catch (error) { console.error('Error:', error); }
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
      { id: 'routemap', label: 'Routekaart', icon: '🗺️' },
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

              {/* Flights only (read-only) - filter out non-FLIGHT transports */}
              {(() => {
                const flightsOnly = (editingTravel?.transports || []).filter((t: any) => t.transportType === 'FLIGHT');
                const allFlights = [...flightsOnly, ...(editingTravel?.flights || []).filter((f: any) => !flightsOnly.some((t: any) => t.id === f.id))];
                return allFlights.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Plane className="w-4 h-4 inline mr-1" />
                    Vluchten ({allFlights.length})
                  </label>
                  <div className="space-y-2">
                    {allFlights.map((transport: any, idx: number) => (
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
                ) : null;
              })()}

              {/* Car Rentals (read-only) - TC fields: product, imageUrl, pickupDate/Location/Time, dropoffDate/Location/Time, transmissionType, mileage */}
              {editingTravel?.car_rentals?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Car className="w-4 h-4 inline mr-1" />
                    Huurauto's ({editingTravel?.car_rentals?.length || 0})
                  </label>
                  <div className="space-y-2">
                    {editingTravel?.car_rentals?.map((car: any, idx: number) => (
                      <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          {car.imageUrl && <img src={car.imageUrl} alt={car.product} className="w-20 h-14 object-contain rounded" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-orange-600" />
                              <span className="font-medium">{car.product || car.company || 'Huurauto'}</span>
                              {car.transmissionType && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{car.transmissionType}</span>}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div>📍 Ophalen: {car.pickupLocation || '?'} — {car.pickupDate} {car.pickupTime && `om ${car.pickupTime.substring(0,5)}`}</div>
                              <div>📍 Inleveren: {car.dropoffLocation || '?'} — {car.dropoffDate} {car.dropoffTime && `om ${car.dropoffTime.substring(0,5)}`}</div>
                              {car.depositDescription && <div>⛽ {car.depositDescription}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cruises (read-only) - TC fields: cruiseLine, shipId, selectedCategory, group, cabin, departure, arrival, nights, stars */}
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
                            {cruise.cruiseLine || cruise.shipId || 'Cruise'}
                          </span>
                          {cruise.stars && <span className="text-sm text-yellow-500">{'⭐'.repeat(Math.min(cruise.stars, 5))}</span>}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          {cruise.selectedCategory && <div>🛏️ {cruise.selectedCategory} ({cruise.group || cruise.cabin})</div>}
                          <div>
                            {cruise.departure && <span className="mr-2">� Vertrek: {new Date(cruise.departure).toLocaleDateString('nl-NL')} {new Date(cruise.departure).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})}</span>}
                          </div>
                          <div>
                            {cruise.arrival && <span className="mr-2">📅 Aankomst: {new Date(cruise.arrival).toLocaleDateString('nl-NL')} {new Date(cruise.arrival).toLocaleTimeString('nl-NL', {hour:'2-digit', minute:'2-digit'})}</span>}
                          </div>
                          {cruise.nights && <div>🌙 {cruise.nights} nachten</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfers (read-only) - TC: transports with transportType !== FLIGHT, has segment[] with departureAirportName/arrivalAirportName */}
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
                            {transfer.segment?.[0]?.departureAirportName || transfer.originCode || 'Vertrek'} → {transfer.segment?.[0]?.arrivalAirportName || transfer.targetCode || 'Aankomst'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {transfer.company && <span className="mr-2">🏢 {transfer.company}</span>}
                          {transfer.fare && <span className="mr-2">🚗 {transfer.fare}</span>}
                          {transfer.departureDate && <span className="mr-2">📅 {transfer.departureDate}</span>}
                          {transfer.departureTime && <span>🕐 {transfer.departureTime}</span>}
                          {transfer.duration && <span className="ml-2">⏱️ {transfer.duration}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities/Tickets/Excursions (read-only) */}
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
                            {activity.name || activity.title || activity.product || 'Activiteit'}
                          </span>
                          {activity.duration && <span className="text-sm text-gray-500">({activity.duration})</span>}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          {activity.location && <span className="mr-2">📍 {activity.location}</span>}
                          {activity.date && <span className="mr-2">📅 {activity.date}</span>}
                          {activity.day && <span className="mr-2">� Dag {activity.day}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Routekaart */}
          {editTab === 'routemap' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  🗺️ Routekaart
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Kaart met genummerde markers per bestemming en een route-lijn. Coördinaten worden automatisch opgezocht.
                </p>
              </div>

              {formData.destinations && formData.destinations.length >= 2 ? (
                <RouteMap
                  destinations={formData.destinations.map((d: any) => ({
                    name: d.name || d.title || '',
                    country: d.country || '',
                    lat: d.geolocation?.latitude || d.lat || 0,
                    lng: d.geolocation?.longitude || d.lng || 0,
                    image: d.imageUrls?.[0] || d.images?.[0] || d.image || '',
                    description: d.description || '',
                    nights: d.nights || 0,
                  }))}
                  height="500px"
                  onGeocodingComplete={(geocoded) => {
                    // Save geocoded coordinates back to destinations
                    const updatedDests = formData.destinations.map((d: any, i: number) => {
                      const geo = geocoded.find((g: any) => g.name === (d.name || d.title));
                      if (geo && geo.lat && geo.lng) {
                        return {
                          ...d,
                          geolocation: { latitude: geo.lat, longitude: geo.lng }
                        };
                      }
                      return d;
                    });
                    setFormData({ ...formData, destinations: updatedDests });
                  }}
                />
              ) : (
                <div className="flex items-center justify-center bg-gray-100 rounded-lg h-64">
                  <p className="text-gray-500 text-sm">Minimaal 2 bestemmingen nodig voor een routekaart</p>
                </div>
              )}

              {/* Destination list with coordinates */}
              {formData.destinations && formData.destinations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Bestemmingen ({formData.destinations.length})</h4>
                  <div className="space-y-1">
                    {formData.destinations.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{d.name || d.title}</span>
                        {d.nights > 0 && <span className="text-gray-500">({d.nights}n)</span>}
                        {d.geolocation?.latitude ? (
                          <span className="text-xs text-green-600 ml-auto">
                            📍 {d.geolocation.latitude.toFixed(2)}, {d.geolocation.longitude.toFixed(2)}
                          </span>
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
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Microsite</label>
          <select
            value={micrositeId}
            onChange={(e) => setMicrositeId(e.target.value)}
            disabled={loadingMicrosites}
            className="w-full max-w-md px-4 py-2 border rounded-lg bg-white disabled:bg-gray-100"
          >
            {loadingMicrosites ? (
              <option>Laden...</option>
            ) : microsites.length > 0 ? (
              microsites.map((ms) => (
                <option key={ms.id} value={ms.id}>
                  {ms.name} {ms.hasCredentials ? '✓' : ''}
                </option>
              ))
            ) : (
              <option value="rondreis-planner">Rondreis Planner</option>
            )}
          </select>
          <button
            onClick={handleImportAllFromMicrosite}
            disabled={bulkImporting || !micrositeId}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Importeer alle reizen van deze microsite
          </button>
        </div>
        <div className="flex gap-3 mt-3">
          <input
            type="text"
            value={importTcId}
            onChange={(e) => { setImportTcId(e.target.value); setImportError(''); }}
            placeholder="Of voer TC ID(s) in - komma-gescheiden (bijv. 35338738, 35338739)"
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={handleBulkImport}
            disabled={importing || bulkImporting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {(importing || bulkImporting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {bulkImporting ? `${bulkProgress?.current || 0}/${bulkProgress?.total || 0}` : 'Importeren'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Voer meerdere TC IDs in (komma-gescheiden) voor bulk import</p>
        {importError && (
          <p className="mt-2 text-red-600 text-sm">{importError}</p>
        )}
        {bulkProgress && bulkProgress.results.length > 0 && (
          <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
            {bulkProgress.results.map((r, idx) => (
              <div key={idx} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2 ${
                r.status === 'success' ? 'bg-green-50 text-green-700' :
                r.status === 'exists' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                <span>{r.status === 'success' ? '✅' : r.status === 'exists' ? '⚠️' : '❌'}</span>
                <span className="font-mono">{r.id}</span>
                <span>{r.status === 'exists' ? 'Bestaat al' : r.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedTravels.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            {selectedTravels.size} reis(en) geselecteerd
          </span>
          <div className="flex gap-2">
            <button onClick={() => handleBulkToggleBrands(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1">
              <Check className="w-4 h-4" /> Brands AAN
            </button>
            <button onClick={() => handleBulkToggleBrands(false)}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1">
              <X className="w-4 h-4" /> Brands UIT
            </button>
            <button onClick={() => setSelectedTravels(new Set())}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
              Deselecteer
            </button>
          </div>
        </div>
      )}

      {/* Travels List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input type="checkbox" checked={selectedTravels.size === travels.length && travels.length > 0}
                    onChange={toggleSelectAll} className="rounded border-gray-300" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afbeelding</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Brands</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Franchise</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Verplicht</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {travels.map((travel) => (
                <tr key={travel.id} className={`hover:bg-gray-50 ${selectedTravels.has(travel.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-3 text-center">
                    <input type="checkbox" checked={selectedTravels.has(travel.id)}
                      onChange={() => toggleSelectTravel(travel.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {travel.hero_image ? (
                      <img src={travel.hero_image} alt={travel.title} className="w-20 h-14 object-cover rounded-lg" />
                    ) : (
                      <div className="w-20 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{travel.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>TC: {travel.travel_compositor_id}</span>
                      {getMicrositeBadge(travel.source_microsite)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {travel.number_of_nights}n
                      </span>
                      {travel.price_per_person ? (
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          €{Number(travel.price_per_person).toLocaleString()}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {travel.destinations?.length || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={travel.enabled_for_brands || false} onChange={() => handleToggleBrands(travel.id, travel.enabled_for_brands)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={travel.enabled_for_franchise || false} onChange={() => handleToggleFranchise(travel.id, travel.enabled_for_franchise)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={travel.is_mandatory || false} onChange={() => handleToggleMandatory(travel.id, travel.is_mandatory)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => handleEdit(travel)} className="text-blue-600 hover:text-blue-900 p-1" title="Bewerken">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(travel)} className="text-red-600 hover:text-red-900 p-1" title="Verwijderen">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {travels.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nog geen reizen geïmporteerd</p>
                    <p className="text-sm">Gebruik het import veld hierboven om een reis toe te voegen</p>
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
