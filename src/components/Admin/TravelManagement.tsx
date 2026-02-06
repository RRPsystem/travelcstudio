import React, { useState, useEffect } from 'react';
import { Plane, Edit2, Trash2, ArrowLeft, Save, Loader2, Download, Hotel, MapPin, Car, Check, X, Image as ImageIcon, Calendar, Euro, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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

export function TravelManagement() {
  const { user } = useAuth();
  const [travels, setTravels] = useState<Travel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assignments, setAssignments] = useState<TravelAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTravel, setEditingTravel] = useState<Travel | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importTcId, setImportTcId] = useState('');
  const [importError, setImportError] = useState('');

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
    hotels: [] as any[],
    images: [] as string[],
    hero_image: '',
    hero_video_url: '',
    route_map_url: '',
    itinerary: [] as any[],
    included: [] as string[],
    excluded: [] as string[],
    highlights: [] as string[],
    practical_info: {}
  });

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
      description: travel.description || '',
      intro_text: travel.intro_text || '',
      number_of_nights: travel.number_of_nights || 0,
      number_of_days: travel.number_of_days || 0,
      price_per_person: travel.price_per_person || 0,
      price_description: travel.price_description || '',
      destinations: travel.destinations || [],
      countries: travel.countries || [],
      hotels: travel.hotels || [],
      images: travel.images || [],
      hero_image: travel.hero_image || '',
      hero_video_url: travel.hero_video_url || '',
      route_map_url: travel.route_map_url || '',
      itinerary: travel.itinerary || [],
      included: travel.included || [],
      excluded: travel.excluded || [],
      highlights: travel.highlights || [],
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
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setViewMode('list'); setEditingTravel(null); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Reis Bewerken</h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* Basic Info */}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intro Tekst</label>
            <textarea
              value={formData.intro_text}
              onChange={(e) => setFormData({ ...formData, intro_text: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Details */}
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

          {/* Media */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Afbeelding URL</label>
              <input
                type="text"
                value={formData.hero_image}
                onChange={(e) => setFormData({ ...formData, hero_image: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {formData.hero_image && (
                <img src={formData.hero_image} alt="Hero" className="mt-2 h-32 object-cover rounded-lg" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Video URL</label>
              <input
                type="text"
                value={formData.hero_video_url}
                onChange={(e) => setFormData({ ...formData, hero_video_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Destinations Preview */}
          {formData.destinations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bestemmingen ({formData.destinations.length})</label>
              <div className="space-y-2">
                {formData.destinations.map((dest: any, idx: number) => (
                  <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{dest.name || dest.city || dest}</span>
                      {dest.country && <span className="text-sm text-gray-500">({dest.country})</span>}
                      {dest.nights && <span className="text-sm text-gray-500">• {dest.nights} nachten</span>}
                    </div>
                    {dest.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dest.description}</p>}
                    {dest.highlights?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dest.highlights.slice(0, 3).map((h: string, i: number) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{h}</span>
                        ))}
                      </div>
                    )}
                    {dest.images?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {dest.images.slice(0, 3).map((img: string, i: number) => (
                          <img key={i} src={img} alt="" className="w-16 h-12 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotels Preview */}
          {formData.hotels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hotels ({formData.hotels.length})</label>
              <div className="space-y-2">
                {formData.hotels.map((hotel: any, idx: number) => (
                  <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Hotel className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{hotel.name || hotel}</span>
                      {hotel.stars && <span className="text-yellow-500">{'★'.repeat(hotel.stars)}</span>}
                      {hotel.nights && <span className="text-sm text-gray-500">({hotel.nights} nachten)</span>}
                    </div>
                    {hotel.city && <p className="text-sm text-gray-600 mt-1">📍 {hotel.city}</p>}
                    {hotel.mealPlan && <p className="text-sm text-gray-600">🍽️ {hotel.mealPlanDescription || hotel.mealPlan}</p>}
                    {hotel.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{hotel.description}</p>}
                    {hotel.images?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {hotel.images.slice(0, 3).map((img: string, i: number) => (
                          <img key={i} src={img} alt="" className="w-16 h-12 object-cover rounded" />
                        ))}
                        {hotel.images.length > 3 && <span className="text-xs text-gray-400">+{hotel.images.length - 3} meer</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flights/Transports Preview */}
          {(editingTravel?.flights?.length > 0 || editingTravel?.transports?.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vluchten/Vervoer ({(editingTravel.flights?.length || 0) + (editingTravel.transports?.length || 0)})
              </label>
              <div className="space-y-2">
                {/* Show transports from raw TC data */}
                {editingTravel.transports?.map((transport: any, idx: number) => (
                  <div key={`t-${idx}`} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">
                        {transport.departure?.city || transport.departure?.name || transport.from || 'Vertrek'}
                      </span>
                      <span>→</span>
                      <span className="font-medium">
                        {transport.arrival?.city || transport.arrival?.name || transport.to || 'Aankomst'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {transport.carrier && <span className="mr-2">✈️ {transport.carrier}</span>}
                      {transport.flightNumber && <span className="mr-2">{transport.flightNumber}</span>}
                      {transport.departure?.date && <span className="mr-2">📅 {transport.departure.date}</span>}
                      {transport.departure?.time && <span>🕐 {transport.departure.time}</span>}
                    </div>
                  </div>
                ))}
                {/* Fallback to flights if no transports */}
                {!editingTravel.transports?.length && editingTravel.flights?.map((flight: any, idx: number) => (
                  <div key={`f-${idx}`} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-medium">{flight.departureAirport || flight.departureCity}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">{flight.arrivalAirport || flight.arrivalCity}</span>
                      {flight.carrier && <span className="ml-2 text-sm text-gray-500">({flight.carrier} {flight.flightNumber})</span>}
                    </div>
                    {flight.departureDate && <span className="text-sm text-gray-500">{flight.departureDate}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Car Rentals Preview */}
          {editingTravel?.car_rentals?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Huurauto's ({editingTravel.car_rentals.length})</label>
              <div className="space-y-2">
                {editingTravel.car_rentals.map((car: any, idx: number) => (
                  <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">
                        {car.company || car.supplier || 'Huurauto'} 
                        {(car.category || car.carType || car.vehicle) && ` - ${car.category || car.carType || car.vehicle}`}
                      </span>
                      {(car.days || car.rentalDays) && <span className="text-sm text-gray-500">({car.days || car.rentalDays} dagen)</span>}
                    </div>
                    {(car.pickupLocation || car.pickUp || car.pickup) && (
                      <p className="text-sm text-gray-600 mt-1">📍 Ophalen: {car.pickupLocation || car.pickUp || car.pickup}</p>
                    )}
                    {(car.dropoffLocation || car.dropOff || car.dropoff) && (car.dropoffLocation || car.dropOff || car.dropoff) !== (car.pickupLocation || car.pickUp || car.pickup) && (
                      <p className="text-sm text-gray-600">📍 Inleveren: {car.dropoffLocation || car.dropOff || car.dropoff}</p>
                    )}
                    {car.transmission && <p className="text-sm text-gray-500">⚙️ {car.transmission}</p>}
                    {car.price && <p className="text-sm text-gray-500">💰 €{car.price}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Gallery */}
          {editingTravel?.images?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Afbeeldingen ({editingTravel.images.length})</label>
              <div className="grid grid-cols-6 gap-2">
                {editingTravel.images.slice(0, 12).map((img: string, idx: number) => (
                  <img key={idx} src={img} alt="" className="w-full h-20 object-cover rounded-lg" />
                ))}
                {editingTravel.images.length > 12 && (
                  <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                    +{editingTravel.images.length - 12} meer
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Itinerary Preview */}
          {editingTravel?.itinerary?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dagprogramma ({editingTravel.itinerary.length} dagen)</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {editingTravel.itinerary.map((day: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 border rounded-lg">
                    <span className="font-medium text-sm">Dag {day.dayNumber || idx + 1}: {day.title || day.destination || ''}</span>
                    {day.description && <p className="text-xs text-gray-500 line-clamp-1">{day.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Included/Excluded */}
          <div className="grid grid-cols-2 gap-4">
            {editingTravel?.included?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inclusief ({editingTravel.included.length})</label>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {editingTravel.included.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-1 text-green-700">
                      <Check className="w-3 h-3" /> {typeof item === 'string' ? item : item.description || item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {editingTravel?.excluded?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exclusief ({editingTravel.excluded.length})</label>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {editingTravel.excluded.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-1 text-red-700">
                      <X className="w-3 h-3" /> {typeof item === 'string' ? item : item.description || item.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => { setViewMode('list'); setEditingTravel(null); }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Opslaan
            </button>
          </div>
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
