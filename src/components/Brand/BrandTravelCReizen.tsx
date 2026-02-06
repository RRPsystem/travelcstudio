import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RouteMap } from '../shared/RouteMap';
import {
  Plane, MapPin, Calendar, Euro, Hotel, Eye, ArrowLeft,
  Star, Ship, Car, Check, X, Image
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
  images: string[];
  destinations: any[];
  countries: string[];
  hotels: any[];
  flights: any[];
  transfers: any[];
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
  continents: string[];
  enabled_for_brands: boolean;
  enabled_for_franchise: boolean;
  is_mandatory: boolean;
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

export function BrandTravelCReizen() {
  const { user, effectiveBrandId } = useAuth();
  const [travels, setTravels] = useState<Travel[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTravel, setSelectedTravel] = useState<Travel | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'mandatory'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const brandId = effectiveBrandId || user?.brand_id;

  useEffect(() => {
    if (brandId) loadData();
  }, [brandId]);

  const loadData = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      // Load travels that are enabled for brands or mandatory
      const { data: travelsData, error: travelsError } = await supabase!
        .from('travelc_travels')
        .select('*')
        .or('enabled_for_brands.eq.true,is_mandatory.eq.true')
        .order('created_at', { ascending: false });

      if (travelsError) throw travelsError;
      setTravels(travelsData || []);

      // Load brand assignments
      const { data: assignmentsData } = await supabase!
        .from('travelc_travel_brand_assignments')
        .select('*')
        .eq('brand_id', brandId);

      setAssignments(assignmentsData || []);
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
    const assignment = getAssignment(travelId);
    return assignment?.is_active || false;
  };

  const handleToggleActive = async (travelId: string) => {
    if (!brandId) return;
    try {
      const existing = getAssignment(travelId);
      if (existing) {
        await supabase!
          .from('travelc_travel_brand_assignments')
          .update({ is_active: !existing.is_active })
          .eq('id', existing.id);
      } else {
        await supabase!
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
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  const handleToggleFeatured = async (travelId: string) => {
    const assignment = getAssignment(travelId);
    if (!assignment) return;
    try {
      await supabase!
        .from('travelc_travel_brand_assignments')
        .update({ is_featured: !assignment.is_featured })
        .eq('id', assignment.id);
      await loadData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleToggleSetting = async (assignmentId: string, field: string, value: any) => {
    try {
      await supabase!
        .from('travelc_travel_brand_assignments')
        .update({ [field]: value })
        .eq('id', assignmentId);
      await loadData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Filter travels
  const filteredTravels = travels.filter(t => {
    if (filter === 'active' && !isActive(t.id)) return false;
    if (filter === 'mandatory' && !t.is_mandatory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) ||
        t.countries?.some(c => c.toLowerCase().includes(q)) ||
        t.destinations?.some((d: any) => d.name?.toLowerCase().includes(q));
    }
    return true;
  });

  // ============================================
  // DETAIL VIEW
  // ============================================
  if (selectedTravel) {
    const travel = selectedTravel;
    const assignment = getAssignment(travel.id);
    const destinations = travel.destinations || [];
    const hotels = travel.hotels || [];
    const flights = travel.flights || [];
    const itinerary = travel.itinerary || [];

    return (
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => setSelectedTravel(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
        </button>

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
              <input
                type="checkbox"
                checked={assignment?.is_active || false}
                onChange={() => handleToggleActive(travel.id)}
                className="w-4 h-4 text-orange-600 rounded"
              />
              <span className="text-sm">Actief op website</span>
            </label>
            {assignment?.is_active && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignment?.is_featured || false}
                    onChange={() => handleToggleFeatured(travel.id)}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">Uitgelicht</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignment?.show_hotels ?? true}
                    onChange={() => assignment && handleToggleSetting(assignment.id, 'show_hotels', !(assignment.show_hotels ?? true))}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">Toon hotels</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignment?.show_prices ?? true}
                    onChange={() => assignment && handleToggleSetting(assignment.id, 'show_prices', !(assignment.show_prices ?? true))}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">Toon prijzen</span>
                </label>
              </>
            )}
          </div>
          {travel.is_mandatory && (
            <p className="text-xs text-orange-600 mt-2">⚠️ Deze reis is verplicht en verschijnt altijd op je website.</p>
          )}
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
            <h2 className="text-lg font-bold mb-3">🗺️ Routekaart</h2>
            <RouteMap
              destinations={destinations.map((d: any) => ({
                name: d.name || d.title || '',
                country: d.country || '',
                lat: d.geolocation?.latitude || d.lat || 0,
                lng: d.geolocation?.longitude || d.lng || 0,
                image: d.imageUrls?.[0] || d.images?.[0] || d.image || '',
                description: d.description || '',
                nights: d.nights || 0,
              }))}
              height="400px"
            />
          </div>
        )}

        {/* Destinations */}
        {destinations.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border">
            <h2 className="text-lg font-bold mb-3">Bestemmingen ({destinations.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {destinations.map((dest: any, idx: number) => {
                const img = dest.imageUrls?.[0] || dest.images?.[0] || '';
                return (
                  <div key={idx} className="flex gap-3 bg-gray-50 rounded-lg overflow-hidden">
                    {img && <img src={img} alt={dest.name} className="w-24 h-20 object-cover flex-shrink-0" />}
                    <div className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                        <span className="font-medium text-sm">{dest.name}</span>
                      </div>
                      {dest.nights > 0 && <span className="text-xs text-gray-500">{dest.nights} nachten</span>}
                      {dest.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dest.description.replace(/<[^>]*>/g, '').substring(0, 100)}</p>}
                    </div>
                  </div>
                );
              })}
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
                    {hotel.location && <span className="text-xs text-gray-500">{hotel.location}</span>}
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
                <div className="text-sm">
                  <strong>{f.departureAirport} → {f.arrivalAirport}</strong>
                  {f.departureDate && <span className="text-gray-500 ml-2">{f.departureDate}</span>}
                  {f.airline && <span className="text-gray-500 ml-2">({f.airline})</span>}
                </div>
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
                <div className="text-sm">
                  <strong>{c.cruiseLine} - {c.selectedCategory}</strong>
                  {c.nights > 0 && <span className="text-gray-500 ml-2">{c.nights} nachten</span>}
                </div>
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
                <div className="text-sm">
                  <strong>{car.product}</strong>
                  {car.pickupLocation && <span className="text-gray-500 ml-2">{car.pickupLocation} → {car.dropoffLocation}</span>}
                </div>
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
                <h2 className="text-lg font-bold mb-3 text-green-700">✅ Inclusief</h2>
                <ul className="space-y-1">
                  {travel.included.map((item: any, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <Check className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                      {typeof item === 'string' ? item : item.text || item.description || ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {travel.excluded?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-bold mb-3 text-red-700">❌ Exclusief</h2>
                <ul className="space-y-1">
                  {travel.excluded.map((item: any, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <X className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" />
                      {typeof item === 'string' ? item : item.text || item.description || ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Photo Gallery */}
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
        <p className="text-gray-600">
          Reizen beschikbaar gesteld door de admin. Activeer reizen voor je website en pas instellingen aan.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'active', label: 'Actief' },
            { key: 'mandatory', label: 'Verplicht' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Zoek op naam, land..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm flex-1 max-w-xs"
        />
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTravels.map(travel => {
            const assignment = getAssignment(travel.id);
            const active = assignment?.is_active || false;
            const featured = assignment?.is_featured || false;
            const image = travel.hero_image || travel.images?.[0] || '';

            return (
              <div
                key={travel.id}
                className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  active ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
                }`}
              >
                {/* Image */}
                <div className="relative h-40 cursor-pointer" onClick={() => setSelectedTravel(travel)}>
                  {image ? (
                    <img src={image} alt={travel.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-bold text-sm leading-tight">{travel.title}</h3>
                  </div>
                  {travel.is_mandatory && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Verplicht</span>
                  )}
                  {featured && (
                    <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Star className="w-3 h-3" /> Uitgelicht
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    {travel.number_of_nights > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {travel.number_of_nights}n
                      </span>
                    )}
                    {travel.destinations?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {travel.destinations.length}
                      </span>
                    )}
                    {travel.hotels?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Hotel className="w-3 h-3" /> {travel.hotels.length}
                      </span>
                    )}
                    {travel.price_per_person > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Euro className="w-3 h-3" /> {Number(travel.price_per_person).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {travel.countries?.length > 0 && (
                    <p className="text-xs text-blue-600 mb-2">{travel.countries.join(' · ')}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <button
                      onClick={() => setSelectedTravel(travel)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Bekijken
                    </button>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleToggleActive(travel.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                      <span className="ml-2 text-xs font-medium text-gray-600">{active ? 'Actief' : 'Inactief'}</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
