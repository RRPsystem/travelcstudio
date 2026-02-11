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
  let sortOrder = 0;

  // --- Flights ---
  const flights = tc.flights || [];
  for (const f of flights) {
    items.push({
      id: crypto.randomUUID(),
      type: 'flight',
      title: buildFlightTitle(f),
      subtitle: [f.company, f.transportNumber].filter(Boolean).join(' '),
      departure_airport: f.departureCity || f.departure || '',
      arrival_airport: f.arrivalCity || f.arrival || '',
      departure_time: f.departureTime || '',
      arrival_time: f.arrivalTime || '',
      airline: f.company || '',
      flight_number: f.transportNumber || '',
      date_start: f.departureDate || '',
      date_end: f.arrivalDate || '',
      price: extractPrice(f),
      sort_order: sortOrder++,
    });
  }

  // --- Hotels ---
  const hotels = tc.hotels || [];
  for (const h of hotels) {
    const hotelData = h.hotelData || h;
    const name = hotelData.name || h.name || 'Hotel';
    const nights = h.nights || hotelData.nights || 0;
    const stars = parseStars(hotelData.category || h.category);
    const images = hotelData.images || h.images || [];
    const firstImage = typeof images[0] === 'string' ? images[0] : images[0]?.url || '';

    items.push({
      id: crypto.randomUUID(),
      type: 'hotel',
      title: name,
      hotel_name: name,
      description: stripHtml(hotelData.shortDescription || hotelData.description || h.description || ''),
      image_url: firstImage,
      location: hotelData.address || h.address || '',
      nights,
      star_rating: stars,
      board_type: h.mealPlan || hotelData.mealPlan || '',
      room_type: h.roomType || '',
      price: extractPrice(h),
      date_start: h.checkIn || '',
      date_end: h.checkOut || '',
      sort_order: sortOrder++,
    });
  }

  // --- Transfers (non-flight transports) ---
  const transfers = tc.transfers || [];
  for (const t of transfers) {
    items.push({
      id: crypto.randomUUID(),
      type: 'transfer',
      title: buildTransferTitle(t),
      transfer_type: t.transportType || 'transfer',
      pickup_location: t.departureCity || t.departure || '',
      dropoff_location: t.arrivalCity || t.arrival || '',
      date_start: t.departureDate || '',
      departure_time: t.departureTime || '',
      arrival_time: t.arrivalTime || '',
      price: extractPrice(t),
      sort_order: sortOrder++,
    });
  }

  // --- Car rentals ---
  const cars = tc.carRentals || [];
  for (const c of cars) {
    items.push({
      id: crypto.randomUUID(),
      type: 'car_rental',
      title: c.name || c.carType || 'Huurauto',
      subtitle: c.company || c.supplier || '',
      supplier: c.company || c.supplier || '',
      date_start: c.pickupDate || '',
      date_end: c.dropoffDate || '',
      pickup_location: c.pickupLocation || '',
      dropoff_location: c.dropoffLocation || '',
      price: extractPrice(c),
      sort_order: sortOrder++,
    });
  }

  // --- Cruises ---
  const cruises = tc.cruises || [];
  for (const cr of cruises) {
    items.push({
      id: crypto.randomUUID(),
      type: 'cruise',
      title: cr.name || cr.shipName || 'Cruise',
      subtitle: cr.cruiseLine || cr.company || '',
      supplier: cr.cruiseLine || cr.company || '',
      nights: cr.nights || 0,
      price: extractPrice(cr),
      sort_order: sortOrder++,
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
      date_start: a.date || '',
      activity_duration: a.duration || '',
      price: extractPrice(a),
      sort_order: sortOrder++,
    });
  }

  // --- Destinations ---
  const destinations: OfferteDestination[] = (tc.destinations || []).map((d: any, i: number) => ({
    name: d.name || `Bestemming ${i + 1}`,
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
