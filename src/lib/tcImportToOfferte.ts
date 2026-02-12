import { supabase } from './supabase';
import { OfferteItem, OfferteDestination } from '../types/offerte';

// Microsites with credentials configured in Supabase secrets
export const TC_MICROSITES: { id: string; name: string; emoji: string }[] = [
  { id: 'rondreis-planner', name: 'Rondreis Planner', emoji: '🌍' },
  { id: 'reisbureaunederland', name: 'Reisbureau Nederland', emoji: '🇳🇱' },
  { id: 'symphonytravel', name: 'Symphony Travel', emoji: '🎵' },
  { id: 'pacificislandtravel', name: 'Pacific Island Travel', emoji: '🏝️' },
  { id: 'newreisplan', name: 'New Reisplan', emoji: '✈️' },
];

export interface TcImportResult {
  title: string;
  subtitle: string;
  introText: string;
  heroImage: string;
  destinations: OfferteDestination[];
  items: OfferteItem[];
  totalPrice: number;
  numberOfTravelers: number;
  currency: string;
}

/**
 * Fetch a travel from Travel Compositor API via the import-travel-compositor Edge Function
 * and map it to Offerte fields (items, destinations, meta).
 */
export async function importTcTravel(travelId: string, micrositeId?: string): Promise<TcImportResult> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd');
  if (!travelId.trim()) throw new Error('Voer een Travel Compositor ID in');

  console.log('[TC Import] Fetching travel', travelId, micrositeId ? `from ${micrositeId}` : '(auto-detect)');

  const body: Record<string, string> = { travelId: travelId.trim() };
  if (micrositeId) body.micrositeId = micrositeId;

  const response = await supabase.functions.invoke('import-travel-compositor', { body });

  const { data, error } = response;
  console.log('[TC Import] Response:', { data, error });

  // supabase.functions.invoke puts the parsed JSON body in `data` even on error status codes
  if (error) {
    // data often contains the real error message from the Edge Function
    if (data && typeof data === 'object') {
      if (data.error) throw new Error(data.error);
      if (data.message) throw new Error(data.message);
    }
    // Try to parse error.context if available (Supabase wraps the body there sometimes)
    if (error.context) {
      try {
        const body = await error.context.json();
        if (body?.error) throw new Error(body.error);
        if (body?.message) throw new Error(body.message);
      } catch (_) { /* ignore parse errors */ }
    }
    throw new Error(error.message || 'Fout bij ophalen reis van Travel Compositor');
  }
  if (!data || data.error) throw new Error(data?.error || data?.message || 'Reis niet gevonden');
  if (!data.title) throw new Error(`Reis ${travelId} gevonden maar bevat geen titel. Controleer het ID en de microsite.`);

  return mapTcDataToOfferte(data);
}

function mapTcDataToOfferte(tc: any): TcImportResult {
  const items: OfferteItem[] = [];

  // Log raw data for debugging field names
  console.log('[TC Map] Raw hotel keys:', tc.hotels?.[0] ? Object.keys(tc.hotels[0]) : 'none');
  console.log('[TC Map] Raw hotel[0]._raw:', tc.hotels?.[0]?._raw);
  console.log('[TC Map] Raw car keys:', tc.carRentals?.[0] ? Object.keys(tc.carRentals[0]) : 'none');
  console.log('[TC Map] Raw cruise keys:', tc.cruises?.[0] ? Object.keys(tc.cruises[0]) : 'none');
  console.log('[TC Map] Raw transfer keys:', tc.transfers?.[0] ? Object.keys(tc.transfers[0]) : 'none');

  // --- Flights ---
  const flights = tc.flights || [];
  for (const f of flights) {
    items.push({
      id: crypto.randomUUID(),
      type: 'flight',
      title: buildFlightTitle(f),
      subtitle: [f.company, f.transportNumber].filter(Boolean).join(' '),
      departure_airport: f.departureCity || f.departure || f.originCode || '',
      arrival_airport: f.arrivalCity || f.arrival || f.targetCode || '',
      departure_time: f.departureTime || '',
      arrival_time: f.arrivalTime || '',
      airline: f.company || '',
      flight_number: f.transportNumber || '',
      date_start: f.departureDate || '',
      date_end: f.arrivalDate || '',
      price: extractPrice(f),
      sort_order: 0, // will be reassigned after chronological sort
    });
  }

  // --- Hotels ---
  const hotels = tc.hotels || [];
  for (const h of hotels) {
    const hotelData = h.hotelData || h;
    const name = hotelData.name || h.name || 'Hotel';
    const nights = h.nights || hotelData.nights || 0;
    const stars = parseStars(hotelData.category || h.category);
    const rawImages = hotelData.images || h.images || [];
    const imageUrls: string[] = rawImages
      .map((img: any) => typeof img === 'string' ? img : img?.url || '')
      .filter((url: string) => url);
    const firstImage = imageUrls[0] || '';

    // Extract facilities as string array
    const rawFacilities = hotelData.facilities || h.facilities || {};
    let facilityList: string[] = [];
    if (Array.isArray(rawFacilities)) {
      facilityList = rawFacilities.map((f: any) => typeof f === 'string' ? f : f.name || '').filter(Boolean);
    } else if (typeof rawFacilities === 'object') {
      for (const [key, val] of Object.entries(rawFacilities)) {
        if (Array.isArray(val)) {
          facilityList.push(...val.map((v: any) => typeof v === 'string' ? v : v.name || '').filter(Boolean));
        } else if (val === true || val === 'true') {
          facilityList.push(key);
        } else if (typeof val === 'string' && val) {
          facilityList.push(val);
        }
      }
    }

    // Extract location: try city, destination, address in that order
    const location = h.city || hotelData.city || h.destination || hotelData.destination || hotelData.address || h.address || '';

    // Extract dates: try multiple field names from TC API
    const dateStart = h.checkIn || hotelData.checkIn || h.startDate || h.dateFrom || '';
    const dateEnd = h.checkOut || hotelData.checkOut || h.endDate || h.dateTo || '';

    // Extract room type
    const roomType = h.roomType || hotelData.roomType || h.roomDescription || h.room || '';

    items.push({
      id: crypto.randomUUID(),
      type: 'hotel',
      title: name,
      hotel_name: name,
      description: stripHtml(hotelData.shortDescription || hotelData.description || h.description || ''),
      image_url: firstImage,
      images: imageUrls.slice(0, 10),
      facilities: facilityList.length > 0 ? facilityList : undefined,
      location,
      nights,
      star_rating: stars,
      board_type: h.mealPlan || hotelData.mealPlan || h.mealPlanDescription || '',
      room_type: roomType,
      price: extractPrice(h),
      date_start: dateStart,
      date_end: dateEnd,
      sort_order: 0,
    });
  }

  // --- Transfers (non-flight transports) ---
  const transfers = tc.transfers || [];
  for (const t of transfers) {
    items.push({
      id: crypto.randomUUID(),
      type: 'transfer',
      title: buildTransferTitle(t),
      transfer_type: t.transportType || t.type || 'transfer',
      pickup_location: t.departureCity || t.departure || t.origin || '',
      dropoff_location: t.arrivalCity || t.arrival || t.target || '',
      date_start: t.departureDate || t.startDate || '',
      departure_time: t.departureTime || '',
      arrival_time: t.arrivalTime || '',
      price: extractPrice(t),
      sort_order: 0,
    });
  }

  // --- Car rentals ---
  const cars = tc.carRentals || [];
  for (const c of cars) {
    // Log all car fields for debugging
    console.log('[TC Map] Car rental raw data:', JSON.stringify(c).substring(0, 500));
    items.push({
      id: crypto.randomUUID(),
      type: 'car_rental',
      title: c.name || c.carType || c.vehicleType || c.category || 'Huurauto',
      subtitle: c.company || c.supplier || c.rentalCompany || '',
      supplier: c.company || c.supplier || c.rentalCompany || '',
      date_start: c.pickupDate || c.startDate || c.dateFrom || c.checkIn || '',
      date_end: c.dropoffDate || c.endDate || c.dateTo || c.checkOut || '',
      pickup_location: c.pickupLocation || c.pickupOffice || c.pickup || c.departureCity || '',
      dropoff_location: c.dropoffLocation || c.dropoffOffice || c.dropoff || c.arrivalCity || '',
      price: extractPrice(c),
      sort_order: 0,
    });
  }

  // --- Cruises ---
  const cruises = tc.cruises || [];
  for (const cr of cruises) {
    // Log all cruise fields for debugging
    console.log('[TC Map] Cruise raw data:', JSON.stringify(cr).substring(0, 500));
    items.push({
      id: crypto.randomUUID(),
      type: 'cruise',
      title: cr.name || cr.shipName || 'Cruise',
      subtitle: cr.cruiseLine || cr.company || '',
      supplier: cr.cruiseLine || cr.company || '',
      nights: cr.nights || cr.duration || 0,
      date_start: cr.departureDate || cr.startDate || cr.dateFrom || cr.checkIn || '',
      date_end: cr.arrivalDate || cr.endDate || cr.dateTo || cr.checkOut || '',
      location: cr.departurePort || cr.embarkation || cr.departure || '',
      description: stripHtml(cr.description || cr.itinerary || ''),
      price: extractPrice(cr),
      sort_order: 0,
    });
  }

  // --- Activities / Tickets ---
  const activities = tc.activities || [];
  for (const a of activities) {
    items.push({
      id: crypto.randomUUID(),
      type: 'activity',
      title: a.name || a.title || 'Activiteit',
      description: stripHtml(a.description || ''),
      location: a.destination || a.location || '',
      date_start: a.date || a.startDate || '',
      activity_duration: a.duration || '',
      price: extractPrice(a),
      sort_order: 0,
    });
  }

  // --- CHRONOLOGICAL SORT ---
  // Sort ALL items by their date_start, then reassign sort_order
  // Items without dates keep their relative position within their category
  items.sort((a, b) => {
    const dateA = a.date_start ? new Date(a.date_start).getTime() : NaN;
    const dateB = b.date_start ? new Date(b.date_start).getTime() : NaN;
    
    // Both have dates: sort by date
    if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
    // Only A has date: A comes first (we know where it belongs)
    if (!isNaN(dateA) && isNaN(dateB)) return -1;
    // Only B has date: B comes first
    if (isNaN(dateA) && !isNaN(dateB)) return 1;
    // Neither has date: keep original order (flights first makes sense as fallback)
    return 0;
  });
  
  // Reassign sort_order after chronological sort
  items.forEach((item, idx) => { item.sort_order = idx; });

  // --- Destinations ---
  const destinations: OfferteDestination[] = (tc.destinations || []).map((d: any, i: number) => ({
    name: d.name || `Bestemming ${i + 1}`,
    country: d.country || '',
    description: stripHtml(d.description || ''),
    highlights: d.highlights || [],
    images: d.images || d.imageUrls || [],
    lat: d.geolocation?.latitude || 0,
    lng: d.geolocation?.longitude || 0,
    order: i,
  }));

  // --- Meta ---
  const countryList = (tc.countries || []).join(', ');
  const subtitle = [
    tc.numberOfDays ? `${tc.numberOfDays} dagen` : '',
    tc.numberOfNights ? `${tc.numberOfNights} nachten` : '',
    countryList,
  ].filter(Boolean).join(' · ');

  const totalPrice = tc.pricePerPerson || tc.priceBreakdown?.hotels || 0;
  const adults = tc.travelers?.adults || 2;

  return {
    title: tc.title || `Reis ${tc.id}`,
    subtitle,
    introText: stripHtml(tc.introText || tc.description || ''),
    heroImage: tc.heroImage || tc.images?.[0] || '',
    destinations,
    items,
    totalPrice: items.reduce((sum, item) => sum + (item.price || 0), 0) || totalPrice,
    numberOfTravelers: adults,
    currency: tc.currency || 'EUR',
  };
}

// --- Helpers ---

function extractPrice(obj: any): number {
  if (typeof obj.price === 'number') return obj.price;
  if (obj.priceBreakdown?.totalPrice?.microsite?.amount) return obj.priceBreakdown.totalPrice.microsite.amount;
  if (obj.priceBreakdown?.totalPrice?.amount) return obj.priceBreakdown.totalPrice.amount;
  if (typeof obj.totalPrice === 'number') return obj.totalPrice;
  return 0;
}

function buildFlightTitle(f: any): string {
  const from = f.departureCity || f.departure || '';
  const to = f.arrivalCity || f.arrival || '';
  if (from && to) return `${from} → ${to}`;
  return f.company ? `Vlucht ${f.company}` : 'Vlucht';
}

function buildTransferTitle(t: any): string {
  const from = t.departureCity || t.departure || '';
  const to = t.arrivalCity || t.arrival || '';
  const type = t.transportType || 'Transfer';
  if (from && to) return `${type}: ${from} → ${to}`;
  return type;
}

function parseStars(category: string | number | undefined): number {
  if (!category) return 0;
  if (typeof category === 'number') return category;
  const match = String(category).match(/(\d)/);
  return match ? parseInt(match[1]) : 0;
}

function stripHtml(html: string): string {
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
}
