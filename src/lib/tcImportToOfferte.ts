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

  // Access raw TC data for richer field extraction
  const rawHotels = tc.rawTcData?.hotels || [];
  const rawCars = tc.rawTcData?.cars || [];
  const rawCruises = tc.rawTcData?.cruises || [];
  const rawTransports = tc.rawTcData?.transports || [];

  // Log ALL raw field names for debugging
  console.log('[TC Map] Formatted hotel keys:', tc.hotels?.[0] ? Object.keys(tc.hotels[0]) : 'none');
  console.log('[TC Map] Raw TC hotel keys:', rawHotels[0] ? Object.keys(rawHotels[0]) : 'none');
  console.log('[TC Map] Raw TC hotel[0] full:', rawHotels[0] ? JSON.stringify(rawHotels[0]).substring(0, 800) : 'none');
  console.log('[TC Map] Raw TC car keys:', rawCars[0] ? Object.keys(rawCars[0]) : 'none');
  console.log('[TC Map] Raw TC car[0] full:', rawCars[0] ? JSON.stringify(rawCars[0]).substring(0, 500) : 'none');
  console.log('[TC Map] Raw TC cruise keys:', rawCruises[0] ? Object.keys(rawCruises[0]) : 'none');
  console.log('[TC Map] Raw TC cruise[0] full:', rawCruises[0] ? JSON.stringify(rawCruises[0]).substring(0, 500) : 'none');
  console.log('[TC Map] Raw TC transport keys:', rawTransports[0] ? Object.keys(rawTransports[0]) : 'none');
  console.log('[TC Map] Raw TC transport[0] full:', rawTransports[0] ? JSON.stringify(rawTransports[0]).substring(0, 500) : 'none');

  // --- Flights ---
  const flights = tc.flights || [];
  for (const f of flights) {
    items.push({
      id: crypto.randomUUID(),
      type: 'flight',
      title: buildFlightTitle(f),
      subtitle: [safeStr(f.company), safeStr(f.transportNumber)].filter(Boolean).join(' '),
      departure_airport: safeStr(f.departureCity || f.departure || f.originCode),
      arrival_airport: safeStr(f.arrivalCity || f.arrival || f.targetCode),
      departure_time: safeStr(f.departureTime),
      arrival_time: safeStr(f.arrivalTime),
      airline: safeStr(f.company),
      flight_number: safeStr(f.transportNumber),
      date_start: safeStr(f.departureDate),
      date_end: safeStr(f.arrivalDate),
      price: extractPrice(f),
      sort_order: 0, // will be reassigned after chronological sort
    });
  }

  // --- Hotels ---
  // Use formatted hotels but also check raw TC data for missing fields
  const hotels = tc.hotels || [];
  for (let hi = 0; hi < hotels.length; hi++) {
    const h = hotels[hi];
    const raw = rawHotels[hi] || {}; // Original TC API hotel object
    const rawHd = raw.hotelData || {};
    const hotelData = h.hotelData || h;
    const name = hotelData.name || h.name || rawHd.name || 'Hotel';
    const nights = h.nights || hotelData.nights || raw.nights || 0;
    const stars = parseStars(hotelData.category || h.category || rawHd.category);
    const rawImages = hotelData.images || h.images || rawHd.images || [];
    const imageUrls: string[] = rawImages
      .map((img: any) => typeof img === 'string' ? img : img?.url || '')
      .filter((url: string) => url);
    const firstImage = imageUrls[0] || '';

    // Extract facilities as string array
    const rawFacilities = hotelData.facilities || h.facilities || rawHd.facilities || {};
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

    // Extract location: formatted first, then raw TC data
    const location = safeStr(
      h.city || hotelData.city || h.destination || hotelData.destination || hotelData.address || h.address ||
      rawHd.city || raw.destination || rawHd.destination || rawHd.address || raw.city
    );

    // Extract dates: formatted first, then raw TC hotel data (try ALL possible field names)
    const dateStart = safeStr(
      h.checkIn || hotelData.checkIn || h.startDate || h.dateFrom ||
      raw.checkIn || raw.startDate || raw.dateFrom || raw.checkinDate || raw.check_in
    );
    const dateEnd = safeStr(
      h.checkOut || hotelData.checkOut || h.endDate || h.dateTo ||
      raw.checkOut || raw.endDate || raw.dateTo || raw.checkoutDate || raw.check_out
    );

    // Extract room type: formatted first, then raw
    const roomType = safeStr(
      h.roomType || hotelData.roomType || h.roomDescription || h.room ||
      raw.roomDescription || raw.roomType || raw.room || raw.selectedRoom || raw.roomName || rawHd.roomType
    );

    // Extract meal plan: formatted first, then raw
    const boardType = safeStr(
      h.mealPlan || hotelData.mealPlan || h.mealPlanDescription ||
      raw.mealPlan || raw.mealPlanDescription || raw.board || rawHd.mealPlan
    );

    items.push({
      id: crypto.randomUUID(),
      type: 'hotel',
      title: name,
      hotel_name: name,
      description: stripHtml(hotelData.shortDescription || hotelData.description || h.description || rawHd.shortDescription || rawHd.description || ''),
      image_url: firstImage,
      images: imageUrls.slice(0, 10),
      facilities: facilityList.length > 0 ? facilityList : undefined,
      location,
      nights,
      star_rating: stars,
      board_type: boardType,
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
      transfer_type: safeStr(t.transportType || t.type || 'transfer'),
      pickup_location: safeStr(t.departureCity || t.departure || t.origin),
      dropoff_location: safeStr(t.arrivalCity || t.arrival || t.target),
      date_start: safeStr(t.departureDate || t.startDate),
      departure_time: safeStr(t.departureTime),
      arrival_time: safeStr(t.arrivalTime),
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
      title: safeStr(c.name || c.carType || c.vehicleType || c.category || 'Huurauto'),
      subtitle: safeStr(c.company || c.supplier || c.rentalCompany),
      supplier: safeStr(c.company || c.supplier || c.rentalCompany),
      date_start: safeStr(c.pickupDate || c.startDate || c.dateFrom || c.checkIn),
      date_end: safeStr(c.dropoffDate || c.endDate || c.dateTo || c.checkOut),
      pickup_location: safeStr(c.pickupLocation || c.pickupOffice || c.pickup || c.departureCity),
      dropoff_location: safeStr(c.dropoffLocation || c.dropoffOffice || c.dropoff || c.arrivalCity),
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
      title: safeStr(cr.name || cr.shipName || 'Cruise'),
      subtitle: safeStr(cr.cruiseLine || cr.company),
      supplier: safeStr(cr.cruiseLine || cr.company),
      nights: cr.nights || cr.duration || 0,
      date_start: safeStr(cr.departureDate || cr.startDate || cr.dateFrom || cr.checkIn),
      date_end: safeStr(cr.arrivalDate || cr.endDate || cr.dateTo || cr.checkOut),
      location: safeStr(cr.departurePort || cr.embarkation || cr.departure),
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

  // --- DESTINATION-BASED ORDERING ---
  // The TC API destinations array is in chronological trip order.
  // Match hotels and cruises to destinations by name to get correct interleaving.
  const destNames = (tc.destinations || []).map((d: any) =>
    (d.name || '').toLowerCase().trim()
  );
  console.log('[TC Map] Destinations in order:', destNames);

  // Separate items by type
  const flightItems = items.filter(i => i.type === 'flight');
  const hotelItems = items.filter(i => i.type === 'hotel');
  const cruiseItems = items.filter(i => i.type === 'cruise');
  const carItems = items.filter(i => i.type === 'car_rental');
  const transferItems = items.filter(i => i.type === 'transfer');
  const activityItems = items.filter(i => i.type === 'activity');

  // Match accommodations to destinations by name
  const unmatchedHotels = [...hotelItems];
  const unmatchedCruises = [...cruiseItems];
  const orderedAccommodations: OfferteItem[] = [];

  for (const destName of destNames) {
    if (!destName) continue;

    // Try hotel match first
    const hIdx = unmatchedHotels.findIndex(h => {
      const loc = (typeof h.location === 'string' ? h.location : '').toLowerCase().trim();
      return loc && destName && (loc.includes(destName) || destName.includes(loc));
    });
    if (hIdx >= 0) {
      orderedAccommodations.push(unmatchedHotels[hIdx]);
      unmatchedHotels.splice(hIdx, 1);
      continue;
    }

    // Try cruise match (by departure port)
    const cIdx = unmatchedCruises.findIndex(c => {
      const loc = (typeof c.location === 'string' ? c.location : '').toLowerCase().trim();
      return loc && destName && (loc.includes(destName) || destName.includes(loc));
    });
    if (cIdx >= 0) {
      orderedAccommodations.push(unmatchedCruises[cIdx]);
      unmatchedCruises.splice(cIdx, 1);
    }
  }

  // Append any unmatched accommodations at the end
  orderedAccommodations.push(...unmatchedHotels, ...unmatchedCruises);
  console.log('[TC Map] Accommodation order:', orderedAccommodations.map(a => `${a.type}: ${a.title} (${a.location})`));

  // Identify outbound vs return flights using day field
  const totalDays = tc.numberOfDays || tc.numberOfNights || 0;
  const outboundFlights: OfferteItem[] = [];
  const returnFlights: OfferteItem[] = [];
  for (const f of flightItems) {
    // Raw TC transports have a 'day' field
    const fIdx = flightItems.indexOf(f);
    const rawFlight = (tc.flights || [])[fIdx];
    const day = rawFlight?.day || 0;
    if (day > 1 && day >= totalDays - 1) {
      returnFlights.push(f);
    } else {
      outboundFlights.push(f);
    }
  }

  // Build final timeline
  const timeline: OfferteItem[] = [
    ...outboundFlights,
    ...orderedAccommodations,
    ...carItems,
    ...transferItems,
    ...activityItems,
    ...returnFlights,
  ];

  // Assign sort_order
  timeline.forEach((item, idx) => { item.sort_order = idx; });

  // --- CALCULATE DATES from trip start + cumulative nights ---
  const tripStartDate = findTripStartDate(timeline, tc);
  if (tripStartDate) {
    console.log('[TC Map] Trip start date:', tripStartDate.toISOString().split('T')[0]);
    let cumulativeDay = 1;

    for (const item of timeline) {
      if (item.type === 'hotel' || item.type === 'cruise') {
        const nights = item.nights || 1;
        if (!item.date_start || item.date_start === '') {
          const checkIn = new Date(tripStartDate);
          checkIn.setDate(checkIn.getDate() + cumulativeDay - 1);
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkOut.getDate() + nights);
          item.date_start = checkIn.toISOString().split('T')[0];
          item.date_end = checkOut.toISOString().split('T')[0];
          console.log(`[TC Map] Dates: ${item.title} → ${item.date_start} to ${item.date_end} (${nights}n)`);
        }
        cumulativeDay += nights;
      }

      if (item.type === 'car_rental' && (!item.date_start || item.date_start === '')) {
        const carIdx = carItems.indexOf(item);
        const rawCar = (tc.carRentals || [])[carIdx];
        const pickupDay = rawCar?.pickupDay || rawCar?.day || 1;
        const dropoffDay = rawCar?.dropoffDay || (totalDays || 14);
        const pickupDate = new Date(tripStartDate);
        pickupDate.setDate(pickupDate.getDate() + pickupDay - 1);
        const dropoffDate = new Date(tripStartDate);
        dropoffDate.setDate(dropoffDate.getDate() + dropoffDay - 1);
        item.date_start = pickupDate.toISOString().split('T')[0];
        item.date_end = dropoffDate.toISOString().split('T')[0];
      }
    }
  }

  // Replace items array with correctly ordered timeline
  items.length = 0;
  items.push(...timeline);

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

/** Find trip start date from first flight departure or TC meta data */
function findTripStartDate(items: OfferteItem[], tc: any): Date | null {
  // 1. Try first flight's departure date
  const firstFlight = items.find(i => i.type === 'flight' && i.date_start);
  if (firstFlight?.date_start) {
    const d = new Date(firstFlight.date_start);
    if (!isNaN(d.getTime())) {
      console.log('[TC Map] Trip start from first flight:', firstFlight.date_start);
      return d;
    }
  }
  
  // 2. Try raw transports departure date (flights come from raw TC data)
  const rawTransports = tc.rawTcData?.transports || tc.transports || [];
  for (const t of rawTransports) {
    if (t.departureDate) {
      const d = new Date(t.departureDate);
      if (!isNaN(d.getTime())) {
        console.log('[TC Map] Trip start from raw transport:', t.departureDate);
        return d;
      }
    }
  }
  
  // 3. Try TC meta departure date
  if (tc.departureDate) {
    const d = new Date(tc.departureDate);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 4. Try any item with a valid date
  for (const item of items) {
    if (item.date_start) {
      const d = new Date(item.date_start);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  console.warn('[TC Map] Could not determine trip start date');
  return null;
}

/** Safely convert TC API values to string — handles {code, name} objects */
function safeStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null) {
    return val.name || val.description || val.code || JSON.stringify(val);
  }
  return String(val);
}

function extractPrice(obj: any): number {
  if (typeof obj.price === 'number') return obj.price;
  if (obj.priceBreakdown?.totalPrice?.microsite?.amount) return obj.priceBreakdown.totalPrice.microsite.amount;
  if (obj.priceBreakdown?.totalPrice?.amount) return obj.priceBreakdown.totalPrice.amount;
  if (typeof obj.totalPrice === 'number') return obj.totalPrice;
  return 0;
}

function buildFlightTitle(f: any): string {
  const from = safeStr(f.departureCity || f.departure);
  const to = safeStr(f.arrivalCity || f.arrival);
  if (from && to) return `${from} → ${to}`;
  return f.company ? `Vlucht ${safeStr(f.company)}` : 'Vlucht';
}

function buildTransferTitle(t: any): string {
  const from = safeStr(t.departureCity || t.departure);
  const to = safeStr(t.arrivalCity || t.arrival);
  const type = safeStr(t.transportType || 'Transfer');
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
