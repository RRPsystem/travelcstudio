import { useState, useCallback, useRef } from 'react';
import { X, Star, Upload, Search, Loader2, Building2, Database, PenLine, MapPin, Utensils, ChevronRight, ChevronLeft, Clock, ArrowLeft, Check } from 'lucide-react';
import { OfferteItem, OfferteItemType, OFFERTE_ITEM_TYPES } from '../../types/offerte';
import { supabase } from '../../lib/supabase';

interface Props {
  item: OfferteItem | null;
  itemType: OfferteItemType;
  onSave: (item: OfferteItem) => void;
  onClose: () => void;
}

interface TcSearchResult {
  type: string;
  id: string;
  name: string;
  stars?: number;
  location?: string;
  country?: string;
  description?: string;
  shortDescription?: string;
  images?: string[];
  price?: number;
  pricePerNight?: number;
  currency?: string;
  roomType?: string;
  mealPlan?: string;
  provider?: string;
  subtitle?: string;
  duration?: number;
  durationType?: string;
  image?: string;
  nights?: number;
  travelTitle?: string;
  // Hotel-specific detail fields
  address?: string;
  highlights?: string[];
  facilities?: Record<string, any>;
  checkInTime?: string;
  checkOutTime?: string;
}

// NL → EN/ES city name mapping for common destinations
const CITY_ALIASES: Record<string, string[]> = {
  'wenen': ['vienna', 'wien', 'viena'],
  'parijs': ['paris', 'parís'],
  'londen': ['london', 'londres'],
  'rome': ['roma', 'rome'],
  'praag': ['prague', 'praga', 'praha'],
  'brussel': ['brussels', 'bruxelles', 'bruselas'],
  'athene': ['athens', 'atenas', 'athen'],
  'lissabon': ['lisbon', 'lisboa'],
  'kopenhagen': ['copenhagen', 'copenhague', 'københavn'],
  'warschau': ['warsaw', 'varsovia', 'warszawa'],
  'boedapest': ['budapest'],
  'berlijn': ['berlin', 'berlín'],
  'münchen': ['munich', 'múnich'],
  'milaan': ['milan', 'milán', 'milano'],
  'venetië': ['venice', 'venecia', 'venezia'],
  'florence': ['firenze', 'florencia'],
  'napels': ['naples', 'nápoles', 'napoli'],
  'genève': ['geneva', 'ginebra'],
  'zürich': ['zurich', 'zúrich'],
  'edinburgh': ['edimburgo'],
  'dublin': ['dublín'],
  'stockholm': ['estocolmo'],
  'oslo': ['oslo'],
  'helsinki': ['helsinki'],
  'moskou': ['moscow', 'moscú', 'moskva'],
  'istanbul': ['estambul'],
  'cairo': ['el cairo', 'kairo'],
  'peking': ['beijing', 'pekín'],
  'tokio': ['tokyo'],
  'bangkok': ['bangkok'],
  'new york': ['nueva york'],
  'kaapstad': ['cape town', 'ciudad del cabo'],
  'marrakech': ['marrakesh', 'marraquech'],
  'dubrovnik': ['dubrovnik'],
  'nice': ['niza'],
  'barcelona': ['barcelona'],
  'madrid': ['madrid'],
  'sevilla': ['seville', 'sevilla'],
  'granada': ['granada'],
  'malaga': ['málaga'],
  'valencia': ['valencia'],
  'tenerife': ['tenerife'],
  'lanzarote': ['lanzarote'],
  'fuerteventura': ['fuerteventura'],
  'gran canaria': ['gran canaria'],
  'mallorca': ['majorca', 'mallorca'],
  'ibiza': ['ibiza'],
  'kreta': ['crete', 'creta'],
  'rhodos': ['rhodes', 'rodas'],
  'santorini': ['santorini'],
  'corfu': ['corfú', 'kérkyra'],
  // Countries NL → EN/ES
  'spanje': ['spain', 'españa', 'espana'],
  'frankrijk': ['france', 'francia'],
  'italië': ['italy', 'italia'],
  'duitsland': ['germany', 'alemania', 'deutschland'],
  'oostenrijk': ['austria'],
  'griekenland': ['greece', 'grecia'],
  'portugal': ['portugal'],
  'engeland': ['england', 'inglaterra'],
  'ierland': ['ireland', 'irlanda'],
  'schotland': ['scotland', 'escocia'],
  'noorwegen': ['norway', 'noruega'],
  'zweden': ['sweden', 'suecia'],
  'denemarken': ['denmark', 'dinamarca'],
  'finland': ['finland', 'finlandia'],
  'polen': ['poland', 'polonia'],
  'tsjechië': ['czech republic', 'república checa', 'czechia'],
  'hongarije': ['hungary', 'hungría'],
  'kroatië': ['croatia', 'croacia'],
  'turkije': ['turkey', 'turquía'],
  'egypte': ['egypt', 'egipto'],
  'marokko': ['morocco', 'marruecos'],
  'thailand': ['thailand', 'tailandia'],
  'indonesië': ['indonesia'],
  'japan': ['japan', 'japón'],
  'china': ['china'],
  'amerika': ['america', 'usa', 'united states', 'estados unidos'],
  'canada': ['canada', 'canadá'],
  'mexico': ['mexico', 'méxico'],
  'brazilië': ['brazil', 'brasil'],
  'argentinië': ['argentina'],
  'zuid-afrika': ['south africa', 'sudáfrica'],
  'australië': ['australia'],
  'nieuw-zeeland': ['new zealand', 'nueva zelanda'],
};

function getSearchTerms(query: string): string[] {
  const q = query.toLowerCase().trim();
  const terms = [q];
  // Only match if query IS the alias or alias IS the query (exact or near-exact)
  // Use equality or startsWith to avoid 'barcelona' matching 'barceló'
  for (const [nl, aliases] of Object.entries(CITY_ALIASES)) {
    if (nl === q || nl.startsWith(q) || q.startsWith(nl)) {
      terms.push(...aliases);
    }
    for (const alias of aliases) {
      if (alias === q || alias.startsWith(q) || q.startsWith(alias)) {
        terms.push(nl);
        terms.push(...aliases);
      }
    }
  }
  return [...new Set(terms)];
}

// Helper: check if text contains query as a whole word (not substring)
// e.g. 'barcelona' should NOT match 'barceló fuerteventura mar'
function wordMatch(text: string, query: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return true;
  // Check ALL occurrences for word boundary match
  let startPos = 0;
  while (startPos < t.length) {
    const idx = t.indexOf(q, startPos);
    if (idx === -1) return false;
    const before = idx === 0 || /[\s,.\-:;\(\)\/\|]/.test(t[idx - 1]);
    const after = idx + q.length >= t.length || /[\s,.\-:;\(\)\/\|]/.test(t[idx + q.length]);
    if (before && after) return true;
    startPos = idx + 1;
  }
  return false;
}

export function OfferteItemPanel({ item, itemType, onSave, onClose }: Props) {
  const typeConfig = OFFERTE_ITEM_TYPES.find(t => t.type === itemType)!;
  const isEditing = !!item;
  
  // Panel mode: 'search' or 'manual'
  const [panelMode, setPanelMode] = useState<'search' | 'manual'>(isEditing ? 'manual' : 'search');

  const [formData, setFormData] = useState<Partial<OfferteItem>>({
    type: itemType,
    title: item?.title || '',
    subtitle: item?.subtitle || '',
    description: item?.description || '',
    image_url: item?.image_url || '',
    location: item?.location || '',
    date_start: item?.date_start || '',
    date_end: item?.date_end || '',
    nights: item?.nights || undefined,
    price: item?.price || undefined,
    price_per_person: item?.price_per_person || undefined,
    supplier: item?.supplier || '',
    booking_reference: item?.booking_reference || '',
    departure_airport: item?.departure_airport || '',
    arrival_airport: item?.arrival_airport || '',
    departure_time: item?.departure_time || '',
    arrival_time: item?.arrival_time || '',
    airline: item?.airline || '',
    flight_number: item?.flight_number || '',
    hotel_name: item?.hotel_name || '',
    room_type: item?.room_type || '',
    board_type: item?.board_type || '',
    star_rating: item?.star_rating || undefined,
    transfer_type: item?.transfer_type || '',
    pickup_location: item?.pickup_location || '',
    dropoff_location: item?.dropoff_location || '',
    activity_duration: item?.activity_duration || '',
    included_items: item?.included_items || [],
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TcSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchVersionRef = useRef(0); // prevents race conditions between searches

  // Detail view state
  const [detailResult, setDetailResult] = useState<TcSearchResult | null>(null);
  const [detailPhotoIdx, setDetailPhotoIdx] = useState(0);
  // Agent choices for the offerte
  const [chosenRoomType, setChosenRoomType] = useState(''); // free-text notes field
  const [chosenBoardType, setChosenBoardType] = useState('');
  const [chosenNights, setChosenNights] = useState<number | undefined>(undefined);

  // Safely parse star rating from category string like "4", "4 estrellas", etc.
  const parseStars = (val: any): number | undefined => {
    if (!val) return undefined;
    const n = parseInt(String(val));
    return (!isNaN(n) && n >= 1 && n <= 5) ? n : undefined;
  };

  // Debounced search in travelc_travels
  const doSearch = useCallback(async (query: string) => {
    if (!supabase || !query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const thisVersion = ++searchVersionRef.current;
    setSearching(true);
    setSearchError(null);

    try {
      const searchTerms = getSearchTerms(query);
      console.log('[Search] Query:', query, '→ terms:', searchTerms);

      // Fetch all travels with ai_summary for better matching
      const { data: allTravels, error } = await supabase
        .from('travelc_travels')
        .select('id, title, destinations, hotels, flights, transfers, activities, images, countries, hero_image, ai_summary')
        .limit(500);

      // If a newer search was started, discard this result
      if (thisVersion !== searchVersionRef.current) {
        console.log('[Search] Discarding stale result for:', query);
        return;
      }

      if (error) throw error;
      if (!allTravels || allTravels.length === 0) {
        setSearchError('Geen reizen gevonden in de database. Importeer eerst reizen via Reisbeheer.');
        setSearching(false);
        return;
      }

      // Score each travel by how well it matches ANY of the search terms
      // Use wordMatch for hotel names to prevent 'barcelona' matching 'barceló'
      const scoredTravels = allTravels.map(t => {
        let score = 0;

        for (const q of searchTerms) {
          const destMatch = (t.destinations || []).some((d: any) =>
            wordMatch(d.name || '', q)
          );
          const countryMatch = (t.countries || []).some((c: string) => wordMatch(c, q));
          const destCountryMatch = (t.destinations || []).some((d: any) =>
            wordMatch(d.country || '', q)
          );
          const titleMatch = wordMatch(t.title || '', q);
          const summaryMatch = wordMatch(t.ai_summary || '', q);
          const hotelNameMatch = (t.hotels || []).some((h: any) =>
            wordMatch(h.name || '', q)
          );

          if (destMatch) score += 10;
          if (countryMatch) score += 8;
          if (destCountryMatch) score += 7;
          if (titleMatch) score += 6;
          if (summaryMatch) score += 4;
          if (hotelNameMatch) score += 3;
        }

        return { travel: t, score };
      }).filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      // Extract items based on itemType
      const results: TcSearchResult[] = [];
      const seen = new Set<string>();

      for (const { travel } of scoredTravels) {
        const travelDests = travel.destinations || [];
        const travelCountries = (travel.countries || []).join(', ');
        const mainDest = travelDests[0];
        const travelLocation = travelDests.map((d: any) => d.name).filter(Boolean).join(', ');

        if (itemType === 'hotel') {
          for (const hotel of (travel.hotels || [])) {
            const name = hotel.name || '';
            if (!name || seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());

            const imgs: string[] = [];
            for (const img of (hotel.images || [])) {
              const url = typeof img === 'string' ? img : img?.url;
              if (url && !imgs.includes(url)) imgs.push(url);
            }
            if (hotel.imageUrl && !imgs.includes(hotel.imageUrl)) imgs.unshift(hotel.imageUrl);

            results.push({
              type: 'hotel',
              id: hotel.id || hotel.hotelId || name,
              name,
              stars: parseStars(hotel.category),
              location: travelLocation || '',
              country: travelCountries || '',
              description: hotel.description || '',
              shortDescription: hotel.shortDescription || '',
              images: imgs.length > 0 ? imgs : (mainDest?.images?.slice(0, 3) || []),
              image: imgs[0] || mainDest?.images?.[0] || travel.hero_image || '',
              subtitle: `${travelLocation}${travelCountries ? ' — ' + travelCountries : ''}`,
              mealPlan: hotel.mealPlan || hotel.mealPlanDescription || '',
              nights: hotel.nights || undefined,
              travelTitle: travel.title || '',
              price: hotel.price || undefined,
              pricePerNight: hotel.pricePerNight || undefined,
              address: hotel.address || '',
              highlights: hotel.highlights || [],
              facilities: hotel.facilities || {},
              checkInTime: hotel.checkInTime || '',
              checkOutTime: hotel.checkOutTime || '',
            });
          }
        } else if (itemType === 'flight') {
          for (const flight of (travel.flights || [])) {
            const label = [flight.originCode, '→', flight.targetCode].filter(Boolean).join(' ');
            if (!label || seen.has(label)) continue;
            seen.add(label);
            results.push({
              type: 'flight',
              id: flight.id || label,
              name: `${flight.company || ''} ${flight.transportNumber || ''}`.trim() || label,
              subtitle: label,
              description: `${flight.departureDate || ''} ${flight.departureTime || ''} - ${flight.arrivalTime || ''}`,
              location: flight.originCode || '',
              image: '',
              travelTitle: travel.title || '',
            });
          }
        } else if (itemType === 'transfer') {
          for (const transfer of (travel.transfers || [])) {
            const name = transfer.name || transfer.description || 'Transfer';
            if (seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            results.push({
              type: 'transfer',
              id: transfer.id || name,
              name,
              description: transfer.description || '',
              location: transfer.origin || transfer.pickup || travelLocation || '',
              image: transfer.imageUrl || '',
              travelTitle: travel.title || '',
            });
          }
        } else if (itemType === 'activity') {
          for (const activity of (travel.activities || [])) {
            const name = activity.name || activity.title || '';
            if (!name || seen.has(name.toLowerCase())) continue;
            seen.add(name.toLowerCase());
            results.push({
              type: 'activity',
              id: activity.id || name,
              name,
              description: activity.description || '',
              location: activity.location || activity.city || travelLocation || '',
              country: travelCountries || '',
              image: activity.imageUrl || '',
              duration: activity.duration,
              durationType: activity.durationType,
              travelTitle: travel.title || '',
            });
          }
        }

        if (results.length >= 50) break;
      }

      // Check again if this search is still the latest
      if (thisVersion !== searchVersionRef.current) return;

      setSearchResults(results.slice(0, 50));
      if (results.length === 0) {
        setSearchError(`Geen ${itemType}s gevonden voor "${query}". Tip: probeer de Engelse naam (bv. "Vienna" i.p.v. "Wenen").`);
      }
    } catch (err: any) {
      if (thisVersion !== searchVersionRef.current) return;
      console.error('[Search] Error:', err);
      setSearchError('Zoeken mislukt. Probeer het opnieuw.');
    } finally {
      if (thisVersion === searchVersionRef.current) {
        setSearching(false);
      }
    }
  }, [itemType]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSearchError(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length >= 2) {
      searchTimerRef.current = setTimeout(() => doSearch(value), 400);
    } else {
      searchVersionRef.current++; // cancel any pending search
      setSearchResults([]);
      setSearching(false);
    }
  };

  const openDetail = (result: TcSearchResult) => {
    if (result.type === 'hotel') {
      // Open detail view for hotels
      setDetailResult(result);
      setDetailPhotoIdx(0);
      setChosenRoomType('');
      setChosenBoardType(result.mealPlan || '');
      setChosenNights(result.nights || undefined);
    } else {
      // Non-hotel items: select directly
      selectSearchResult(result);
    }
  };

  const selectSearchResult = (result: TcSearchResult) => {
    const updates: Partial<OfferteItem> = {
      title: result.name,
      description: result.description || result.shortDescription || '',
      image_url: result.images?.[0] || result.image || '',
      location: [result.location, result.country].filter(Boolean).join(', ') || '',
      price: result.price || undefined,
      supplier: result.provider || '',
    };

    if (result.type === 'hotel') {
      updates.hotel_name = result.name;
      updates.star_rating = result.stars || undefined;
      updates.room_type = result.roomType || '';
      updates.board_type = result.mealPlan || '';
      updates.nights = result.nights || undefined;
      updates.subtitle = result.subtitle || '';
    } else if (result.type === 'flight') {
      updates.subtitle = result.subtitle || '';
    } else if (result.type === 'activity') {
      if (result.duration && result.durationType) {
        updates.activity_duration = `${result.duration} ${result.durationType.toLowerCase()}`;
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
    setPanelMode('manual');
    setDetailResult(null);
    setSearchResults([]);
    setSearchQuery('');
  };

  const confirmDetailSelection = () => {
    if (!detailResult) return;
    const r = detailResult;
    const updates: Partial<OfferteItem> = {
      title: r.name,
      hotel_name: r.name,
      description: r.description || r.shortDescription || '',
      image_url: r.images?.[detailPhotoIdx] || r.images?.[0] || r.image || '',
      location: [r.location, r.country].filter(Boolean).join(', ') || '',
      star_rating: r.stars || undefined,
      room_type: chosenRoomType,
      board_type: chosenBoardType,
      nights: chosenNights || r.nights || undefined,
      subtitle: [r.location, r.country].filter(Boolean).join(', '),
      price: r.price || undefined,
      price_per_person: r.pricePerNight ? r.pricePerNight : undefined,
    };
    // Add agent notes to room_type field
    if (chosenRoomType) {
      updates.room_type = chosenRoomType;
    }

    setFormData(prev => ({ ...prev, ...updates }));
    setPanelMode('manual');
    setDetailResult(null);
    setSearchResults([]);
    setSearchQuery('');
  };

  const update = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const saved: OfferteItem = {
      id: item?.id || crypto.randomUUID(),
      type: itemType,
      title: formData.title || typeConfig.label,
      subtitle: formData.subtitle,
      description: formData.description,
      image_url: formData.image_url,
      location: formData.location,
      date_start: formData.date_start,
      date_end: formData.date_end,
      nights: formData.nights,
      price: formData.price,
      price_per_person: formData.price_per_person,
      supplier: formData.supplier,
      booking_reference: formData.booking_reference,
      departure_airport: formData.departure_airport,
      arrival_airport: formData.arrival_airport,
      departure_time: formData.departure_time,
      arrival_time: formData.arrival_time,
      airline: formData.airline,
      flight_number: formData.flight_number,
      hotel_name: formData.hotel_name,
      room_type: formData.room_type,
      board_type: formData.board_type,
      star_rating: formData.star_rating,
      transfer_type: formData.transfer_type,
      pickup_location: formData.pickup_location,
      dropoff_location: formData.dropoff_location,
      activity_duration: formData.activity_duration,
      included_items: formData.included_items,
      sort_order: item?.sort_order ?? 0,
    };
    onSave(saved);
  };

  const renderFlightFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Vertrek luchthaven</label>
          <input type="text" value={formData.departure_airport} onChange={e => update('departure_airport', e.target.value)} placeholder="AMS" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aankomst luchthaven</label>
          <input type="text" value={formData.arrival_airport} onChange={e => update('arrival_airport', e.target.value)} placeholder="JFK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Vertrektijd</label>
          <input type="time" value={formData.departure_time} onChange={e => update('departure_time', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aankomsttijd</label>
          <input type="time" value={formData.arrival_time} onChange={e => update('arrival_time', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Luchtvaartmaatschappij</label>
          <input type="text" value={formData.airline} onChange={e => update('airline', e.target.value)} placeholder="KLM" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Vluchtnummer</label>
          <input type="text" value={formData.flight_number} onChange={e => update('flight_number', e.target.value)} placeholder="KL644" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
    </>
  );

  const renderHotelFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Hotelnaam</label>
        <input type="text" value={formData.hotel_name} onChange={e => update('hotel_name', e.target.value)} placeholder="Hotel naam" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Kamertype</label>
          <input type="text" value={formData.room_type} onChange={e => update('room_type', e.target.value)} placeholder="Deluxe Double" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Aantal nachten</label>
          <input type="number" value={formData.nights || ''} onChange={e => update('nights', parseInt(e.target.value) || undefined)} placeholder="3" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Arrangement</label>
          <select value={formData.board_type} onChange={e => update('board_type', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
            <option value="">Selecteer...</option>
            <option value="RO">Room Only</option>
            <option value="BB">Bed & Breakfast</option>
            <option value="HB">Halfpension</option>
            <option value="FB">Volpension</option>
            <option value="AI">All Inclusive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sterren</label>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => update('star_rating', star)} className="focus:outline-none">
                <Star size={20} className={`transition-colors ${(formData.star_rating || 0) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderTransferFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Type transfer</label>
        <select value={formData.transfer_type} onChange={e => update('transfer_type', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
          <option value="">Selecteer...</option>
          <option value="private">Privé transfer</option>
          <option value="shared">Gedeelde transfer</option>
          <option value="self-drive">Zelf rijden</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ophaallocatie</label>
          <input type="text" value={formData.pickup_location} onChange={e => update('pickup_location', e.target.value)} placeholder="Luchthaven" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Afzetlocatie</label>
          <input type="text" value={formData.dropoff_location} onChange={e => update('dropoff_location', e.target.value)} placeholder="Hotel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>
    </>
  );

  const renderActivityFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Duur</label>
        <input type="text" value={formData.activity_duration} onChange={e => update('activity_duration', e.target.value)} placeholder="Halve dag, 3 uur, etc." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>
    </>
  );

  // Helper: extract all facility items from the nested facilities object
  const extractFacilities = (facilities: Record<string, any> | undefined): string[] => {
    if (!facilities) return [];
    const items: string[] = [];
    for (const [, value] of Object.entries(facilities)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim()) {
            items.push(item.trim());
          } else if (typeof item === 'object' && item?.name) {
            items.push(item.name);
          }
        }
      } else if (typeof value === 'string' && value.trim()) {
        items.push(value.trim());
      }
    }
    return [...new Set(items)];
  };

  // ==================== HOTEL DETAIL VIEW ====================
  const renderDetailView = () => {
    if (!detailResult) return null;
    const r = detailResult;
    const photos = r.images && r.images.length > 0 ? r.images : [];
    const allFacilities = extractFacilities(r.facilities);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Back button */}
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2">
          <button
            onClick={() => setDetailResult(null)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Terug naar resultaten</span>
          </button>
        </div>

        {/* Scrollable detail content */}
        <div className="flex-1 overflow-y-auto">
          {/* Photo carousel */}
          {photos.length > 0 && (
            <div className="relative">
              <img
                src={photos[detailPhotoIdx]}
                alt={r.name}
                className="w-full h-52 object-cover"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setDetailPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setDetailPhotoIdx(i => (i + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {detailPhotoIdx + 1} / {photos.length}
                  </div>
                </>
              )}
              {/* Thumbnail strip */}
              {photos.length > 1 && (
                <div className="flex gap-1 px-4 py-2 bg-gray-50 overflow-x-auto">
                  {photos.slice(0, 8).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setDetailPhotoIdx(i)}
                      className={`w-12 h-9 rounded overflow-hidden shrink-0 border-2 transition-colors ${
                        i === detailPhotoIdx ? 'border-orange-500' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {photos.length > 8 && (
                    <div className="w-12 h-9 rounded bg-gray-200 flex items-center justify-center shrink-0 text-[10px] text-gray-500">
                      +{photos.length - 8}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hotel info */}
          <div className="px-5 py-4 space-y-3">
            {/* Name + stars */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-900">{r.name}</h3>
                {r.stars && r.stars > 0 && (
                  <span className="flex items-center shrink-0">
                    {Array.from({ length: r.stars }).map((_, i) => (
                      <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </span>
                )}
              </div>
              {(r.location || r.country) && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-orange-400" />
                  {[r.location, r.country].filter(Boolean).join(', ')}
                </p>
              )}
              {r.address && (
                <p className="text-xs text-gray-400 mt-0.5">{r.address}</p>
              )}
            </div>

            {/* Quick info badges */}
            <div className="flex flex-wrap gap-2">
              {r.mealPlan && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                  <Utensils size={11} /> {r.mealPlan}
                </span>
              )}
              {r.nights && r.nights > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                  <Clock size={11} /> {r.nights} nachten
                </span>
              )}
              {r.checkInTime && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                  Check-in: {r.checkInTime}
                </span>
              )}
              {r.checkOutTime && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                  Check-out: {r.checkOutTime}
                </span>
              )}
            </div>

            {/* Price block */}
            {r.price && r.price > 0 && (
              <div className="bg-orange-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Prijs in deze reis</p>
                  <p className="text-lg font-bold text-orange-700">€ {r.price.toLocaleString('nl-NL')}</p>
                </div>
                {r.pricePerNight && r.pricePerNight > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-orange-500">per nacht</p>
                    <p className="text-sm font-semibold text-orange-600">€ {r.pricePerNight.toLocaleString('nl-NL')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {(r.description || r.shortDescription) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Beschrijving</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {r.description || r.shortDescription}
                </p>
              </div>
            )}

            {/* Highlights */}
            {r.highlights && r.highlights.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Highlights</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded text-xs">
                      <Check size={10} /> {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities - properly extracted */}
            {allFacilities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Faciliteiten</p>
                <div className="flex flex-wrap gap-1.5">
                  {allFacilities.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {r.travelTitle && (
              <p className="text-xs text-gray-400 italic">Uit reis: {r.travelTitle}</p>
            )}

            {/* ==================== OFFERTE AANPASSING ==================== */}
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Aanpassen voor offerte</p>

              <div className="grid grid-cols-2 gap-3">
                {/* Nights */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Aantal nachten</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={chosenNights || ''}
                    onChange={e => setChosenNights(parseInt(e.target.value) || undefined)}
                    placeholder={r.nights ? String(r.nights) : ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  />
                </div>
                {/* Board type override */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Arrangement</label>
                  <select
                    value={chosenBoardType}
                    onChange={e => setChosenBoardType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  >
                    <option value="">{r.mealPlan || 'Zoals in reis'}</option>
                    <option value="RO">Room Only</option>
                    <option value="BB">Bed & Breakfast</option>
                    <option value="HB">Halfpension</option>
                    <option value="FB">Volpension</option>
                    <option value="AI">All Inclusive</option>
                  </select>
                </div>
              </div>

              {/* Free text notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notities (kamertype, wensen, etc.)</label>
                <input
                  type="text"
                  value={chosenRoomType}
                  onChange={e => setChosenRoomType(e.target.value)}
                  placeholder="Bv. Deluxe kamer, zeezicht, king bed..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={confirmDetailSelection}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Selecteer dit hotel voor offerte
          </button>
        </div>
      </div>
    );
  };

  // ==================== SEARCH MODE RENDER ====================
  const renderSearchMode = () => {
    // If detail view is open, show that instead
    if (detailResult) return renderDetailView();

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search input area */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="relative">
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              autoFocus
              placeholder={
                itemType === 'hotel' ? 'Zoek hotel... (bv. "Wenen", "Bali", "Hilton")' :
                itemType === 'activity' ? 'Zoek activiteit... (bv. "Barcelona", "safari")' :
                itemType === 'flight' ? 'Zoek vlucht... (bv. "Amsterdam", "KLM")' :
                itemType === 'transfer' ? 'Zoek transfer...' :
                'Zoek...'
              }
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none bg-white shadow-sm"
            />
          </div>
          {!searchQuery && !searching && searchResults.length === 0 && (
            <p className="mt-2 text-[11px] text-gray-400">
              Zoek op bestemming, hotelnaam, land of reisnaam. NL en EN namen worden herkend.
            </p>
          )}
          {searchError && (
            <p className="mt-2 text-xs text-red-500">{searchError}</p>
          )}
        </div>

        {/* Results area - fills entire remaining space */}
        <div className="flex-1 overflow-y-auto">
          {searching && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-2" />
              <p className="text-sm text-gray-500">Zoeken in reizen...</p>
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 text-[11px] font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-100">
                {searchResults.length} resultaten gevonden
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.map((result) => (
                  <button
                    key={result.id + result.travelTitle}
                    onClick={() => openDetail(result)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left group"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                      {(result.images?.[0] || result.image) ? (
                        <img src={result.images?.[0] || result.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <Building2 size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-gray-900 truncate">{result.name}</span>
                        {result.stars && result.stars > 0 && (
                          <span className="flex items-center shrink-0 ml-1">
                            {Array.from({ length: result.stars }).map((_, i) => (
                              <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />
                            ))}
                          </span>
                        )}
                      </div>
                      {(result.location || result.country) && (
                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-orange-400 shrink-0" />
                          <span className="truncate">{[result.location, result.country].filter(Boolean).join(', ')}</span>
                        </p>
                      )}
                      {result.mealPlan && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Utensils size={9} className="shrink-0" />
                          {result.mealPlan}
                          {result.nights ? ` · ${result.nights} nachten` : ''}
                        </p>
                      )}
                      {result.description && (
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{result.description}</p>
                      )}
                      {result.travelTitle && (
                        <p className="text-[10px] text-gray-400 mt-1 truncate italic">uit: {result.travelTitle}</p>
                      )}
                    </div>
                    {/* Arrow */}
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 shrink-0 mt-2 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}

          {!searching && searchResults.length === 0 && searchQuery.length >= 2 && !searchError && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Search size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">Geen resultaten</p>
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery.length < 2 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Database size={36} className="text-gray-200 mb-4" />
              <p className="text-sm font-medium text-gray-600 mb-1">Zoek in je reisdatabase</p>
              <p className="text-xs text-gray-400 max-w-[280px]">
                Typ een bestemming, hotelnaam of land om hotels uit je geïmporteerde reizen te vinden.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== MANUAL MODE RENDER ====================
  const renderManualMode = () => (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {/* Common fields */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
        <input type="text" value={formData.title} onChange={e => update('title', e.target.value)} placeholder={typeConfig.label} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Subtitel</label>
        <input type="text" value={formData.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="Optionele subtitel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>

      {/* Type-specific fields */}
      {itemType === 'flight' && renderFlightFields()}
      {itemType === 'hotel' && renderHotelFields()}
      {itemType === 'transfer' && renderTransferFields()}
      {itemType === 'activity' && renderActivityFields()}

      {/* Common date fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Startdatum</label>
          <input type="date" value={formData.date_start} onChange={e => update('date_start', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Einddatum</label>
          <input type="date" value={formData.date_end} onChange={e => update('date_end', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Locatie</label>
        <input type="text" value={formData.location} onChange={e => update('location', e.target.value)} placeholder="Stad, land" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Beschrijving</label>
        <textarea value={formData.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Optionele beschrijving..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none" />
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Afbeelding</label>
        {formData.image_url ? (
          <div className="relative rounded-xl overflow-hidden">
            <img src={formData.image_url} alt="" className="w-full h-32 object-cover" />
            <button onClick={() => update('image_url', '')} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-lg hover:bg-black/70">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors cursor-pointer">
            <Upload size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">Sleep een afbeelding of klik om te uploaden</p>
          </div>
        )}
        <input type="text" value={formData.image_url} onChange={e => update('image_url', e.target.value)} placeholder="Of plak een URL..." className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>

      {/* Pricing */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Prijs</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Totaalprijs</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input type="number" value={formData.price || ''} onChange={e => update('price', parseFloat(e.target.value) || undefined)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Per persoon</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input type="number" value={formData.price_per_person || ''} onChange={e => update('price_per_person', parseFloat(e.target.value) || undefined)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Supplier / Booking ref */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Leverancier</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Leverancier</label>
            <input type="text" value={formData.supplier} onChange={e => update('supplier', e.target.value)} placeholder="Naam leverancier" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Boekingsreferentie</label>
            <input type="text" value={formData.booking_reference} onChange={e => update('booking_reference', e.target.value)} placeholder="REF-123" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeConfig.bgColor }}>
              <span style={{ color: typeConfig.color }} className="text-sm font-bold">{typeConfig.label[0]}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{isEditing ? 'Bewerk' : 'Voeg toe'}: {typeConfig.label}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setPanelMode('search')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              panelMode === 'search'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Database size={15} />
            Zoek in database
          </button>
          <button
            onClick={() => setPanelMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              panelMode === 'manual'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <PenLine size={15} />
            Handmatig invullen
          </button>
        </div>

        {/* Content based on mode */}
        {panelMode === 'search' ? renderSearchMode() : renderManualMode()}

        {/* Footer - only show in manual mode */}
        {panelMode === 'manual' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Annuleren
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
              {isEditing ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
