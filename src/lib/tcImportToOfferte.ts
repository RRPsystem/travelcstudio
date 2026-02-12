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
  const rawCruiseData = tc.rawTcData?.cruises || [];
  const rawTransports = tc.rawTcData?.transports || [];

  // Log ALL raw field names for debugging
  console.log('[TC Map] Formatted hotel keys:', tc.hotels?.[0] ? Object.keys(tc.hotels[0]) : 'none');
  console.log('[TC Map] Raw TC hotel keys:', rawHotels[0] ? Object.keys(rawHotels[0]) : 'none');
  console.log('[TC Map] Raw TC hotel[0] full:', rawHotels[0] ? JSON.stringify(rawHotels[0]).substring(0, 800) : 'none');
  console.log('[TC Map] Raw TC car keys:', rawCars[0] ? Object.keys(rawCars[0]) : 'none');
  console.log('[TC Map] Raw TC car[0] full:', rawCars[0] ? JSON.stringify(rawCars[0]).substring(0, 500) : 'none');
  console.log('[TC Map] Raw TC cruise keys:', rawCruiseData[0] ? Object.keys(rawCruiseData[0]) : 'none');
  console.log('[TC Map] Raw TC cruise[0] full:', rawCruiseData[0] ? JSON.stringify(rawCruiseData[0]).substring(0, 500) : 'none');
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

    // Extract facilities — Swagger: AccommodationFacilitiesVO
    // { includedFacilities: [{name}], nonIncludedFacilities: [{name}], otherFacilities: [{name}] }
    const rawFacilities = hotelData.facilities || h.facilities || rawHd.facilities || {};
    let facilityList: string[] = [];
    console.log(`[TC Map] Hotel "${name}" facilities type:`, typeof rawFacilities, Array.isArray(rawFacilities) ? 'array' : '', rawFacilities ? Object.keys(rawFacilities).join(',') : 'empty');

    // Swagger structure: { includedFacilities: FacilityVO[], nonIncludedFacilities: FacilityVO[], otherFacilities: FacilityVO[] }
    const extractFacilityNames = (arr: any[]): string[] =>
      (arr || []).map((f: any) => typeof f === 'string' ? f : f?.name || '').filter(Boolean);

    if (rawFacilities.includedFacilities || rawFacilities.nonIncludedFacilities || rawFacilities.otherFacilities) {
      facilityList = [
        ...extractFacilityNames(rawFacilities.includedFacilities),
        ...extractFacilityNames(rawFacilities.otherFacilities),
      ];
    } else if (Array.isArray(rawFacilities)) {
      facilityList = extractFacilityNames(rawFacilities);
    } else if (typeof rawFacilities === 'object') {
      for (const [key, val] of Object.entries(rawFacilities)) {
        if (Array.isArray(val)) {
          facilityList.push(...extractFacilityNames(val));
        } else if (val === true || val === 'true') {
          facilityList.push(key);
        } else if (typeof val === 'string' && val) {
          facilityList.push(val);
        }
      }
    }
    console.log(`[TC Map] Hotel "${name}" facilities (${facilityList.length}):`, facilityList.slice(0, 10).join(', '));

    // Extract location: hotelData.destination is OBJECT {name, code} per Swagger!
    const destName = typeof hotelData.destination === 'object' ? hotelData.destination?.name : hotelData.destination;
    const rawDestName = typeof rawHd.destination === 'object' ? rawHd.destination?.name : rawHd.destination;
    const location = safeStr(
      h.city || hotelData.city || destName || rawDestName || hotelData.address || h.address ||
      rawHd.city || rawHd.address || raw.city || raw.destination
    );

    // Extract dates: TC API uses checkInDate/checkOutDate (from Swagger IdeaHotelVO)
    const dateStart = safeStr(
      h.checkIn || h.checkInDate || hotelData.checkIn || hotelData.checkInDate ||
      raw.checkInDate || raw.checkIn || raw.startDate || raw.dateFrom
    );
    const dateEnd = safeStr(
      h.checkOut || h.checkOutDate || hotelData.checkOut || hotelData.checkOutDate ||
      raw.checkOutDate || raw.checkOut || raw.endDate || raw.dateTo
    );
    console.log(`[TC Map] Hotel "${name}" dates: checkIn="${dateStart}", checkOut="${dateEnd}", nights=${nights}, rawKeys=${Object.keys(raw).join(',')}`);

    // Extract room type: Swagger field is roomTypes (PLURAL!), not roomType
    const roomType = safeStr(
      h.roomTypes || h.roomType || hotelData.roomTypes || hotelData.roomType ||
      raw.roomTypes || raw.roomType || h.roomDescription || raw.roomDescription ||
      raw.selectedRoom || raw.roomName || rawHd.roomType
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
  // Edge Function fields: originDestinationCode, targetDestinationCode, originCode, targetCode,
  //   company, transportNumber, departureDate, departureTime, arrivalDate, arrivalTime, duration, transportType
  const transfers = tc.transfers || [];
  for (const t of transfers) {
    const from = safeStr(t.originDestinationCode || t.originCode || t.departureCity || '');
    const to = safeStr(t.targetDestinationCode || t.targetCode || t.arrivalCity || '');
    const transportType = safeStr(t.transportType || t.type || 'TRANSFER');
    const company = safeStr(t.company || '');
    const transportNum = safeStr(t.transportNumber || '');
    // Build descriptive title
    let transferTitle = transportType;
    if (from && to) transferTitle = `${from} → ${to}`;
    if (company) transferTitle += ` (${company}${transportNum ? ' ' + transportNum : ''})`;
    
    console.log(`[TC Map] Transfer: type=${transportType}, from=${from}, to=${to}, company=${company}, date=${t.departureDate}`);
    
    items.push({
      id: crypto.randomUUID(),
      type: 'transfer',
      title: transferTitle,
      subtitle: company || transportType,
      transfer_type: transportType,
      pickup_location: from,
      dropoff_location: to,
      date_start: safeStr(t.departureDate || t.startDate || ''),
      date_end: safeStr(t.arrivalDate || ''),
      departure_time: safeStr(t.departureTime || ''),
      arrival_time: safeStr(t.arrivalTime || ''),
      distance: safeStr(t.duration || ''),
      price: extractPrice(t),
      sort_order: 0,
    });
  }

  // --- Car rentals (IdeaCarRentalVO — see tcApiReference.ts) ---
  const cars = tc.carRentals || [];
  for (const c of cars) {
    console.log('[TC Map] Car rental keys:', Object.keys(c).join(', '));
    items.push({
      id: crypto.randomUUID(),
      type: 'car_rental',
      title: safeStr(c.product || c.name || c.carType || c.category || 'Huurauto'),
      subtitle: safeStr(c.company || c.supplier),
      supplier: safeStr(c.company || c.supplier),
      image_url: safeStr(c.imageUrl),
      date_start: safeStr(c.pickupDate || c.pickupDay || ''),   // pickupDate = real date!
      date_end: safeStr(c.dropoffDate || c.dropoffDay || ''),   // dropoffDate = real date!
      pickup_location: safeStr(c.pickupLocation || ''),
      dropoff_location: safeStr(c.dropoffLocation || ''),
      departure_time: safeStr(c.pickupTime || ''),
      arrival_time: safeStr(c.dropoffTime || ''),
      price: extractPrice(c),
      sort_order: 0,
    });
  }

  // --- Cruises ---
  // TC API has TWO arrays: cruises (CruiseDataSheetVO) and closedTours (IdeaClosedTourVO).
  // CruiseDataSheetVO: departure/arrival can be DATETIMES like "2026-09-13T16:00" (not port names!)
  // closedTours: has startDate/endDate explicitly.
  // Strategy: merge both, prefer closedTours dates, but CruiseDataSheetVO departure/arrival work too.
  const rawCruises = tc.cruises || [];
  const closedTours = tc.closedTours || [];

  // Helper: detect if a string looks like a date (starts with 4 digits)
  const looksLikeDate = (s: string) => s && /^\d{4}-\d{2}-\d{2}/.test(s);

  // Cruise line code to name mapping
  const cruiseLineNames: Record<string, string> = {
    'RCC': 'Royal Caribbean', 'RCI': 'Royal Caribbean', 'NCL': 'Norwegian Cruise Line',
    'MSC': 'MSC Cruises', 'CCL': 'Carnival Cruise Line', 'HAL': 'Holland America Line',
    'CEL': 'Celebrity Cruises', 'CUN': 'Cunard', 'PRI': 'Princess Cruises',
    'VIK': 'Viking', 'DIS': 'Disney Cruise Line', 'SIL': 'Silversea',
    'AZA': 'Azamara', 'OCE': 'Oceania Cruises', 'SEA': 'Seabourn',
  };

  console.log(`[TC Map] Cruises: ${rawCruises.length}, ClosedTours: ${closedTours.length}`);

  // Process cruises from CruiseDataSheetVO array (primary source for this trip type)
  for (let ci = 0; ci < rawCruises.length; ci++) {
    const cr = rawCruises[ci];
    const ct = closedTours[ci] || {}; // Try to match closedTour by index for enrichment

    // departure/arrival can be datetimes OR port names — detect which
    const depDate = looksLikeDate(cr.departure) ? cr.departure : (ct.startDate || '');
    const arrDate = looksLikeDate(cr.arrival) ? cr.arrival : (ct.endDate || '');
    const cruiseLineFull = cruiseLineNames[cr.cruiseLine] || cr.cruiseLine || ct.supplierName || '';
    const shipName = cr.shipName || ct.name || '';
    const title = shipName ? `${cruiseLineFull} — ${shipName}` : `Cruise ${cruiseLineFull}`;

    console.log(`[TC Map] Cruise "${title}" dates: dep="${depDate}", arr="${arrDate}", nights=${cr.nights}, category=${cr.selectedCategory}`);

    items.push({
      id: crypto.randomUUID(),
      type: 'cruise',
      title: safeStr(title),
      subtitle: safeStr(cr.selectedCategory || cr.group || ct.modalityName || ''),
      supplier: safeStr(cruiseLineFull),
      nights: cr.nights || (ct.dayTo && ct.dayFrom ? ct.dayTo - ct.dayFrom : 0) || 0,
      date_start: safeStr(depDate),
      date_end: safeStr(arrDate),
      location: safeStr(cr.originPort || (!looksLikeDate(cr.departure) ? cr.departure : '') || ct.address || ''),
      description: stripHtml(ct.description || ''),
      image_url: (ct.imageUrls || [])[0] || '',
      images: ct.imageUrls || [],
      price: extractPrice(cr.priceBreakdown ? cr : ct),
      sort_order: 0,
    });
  }

  // Process any remaining closedTours not matched to a cruise
  for (let ci = rawCruises.length; ci < closedTours.length; ci++) {
    const ct = closedTours[ci];
    items.push({
      id: crypto.randomUUID(),
      type: 'cruise',
      title: safeStr(ct.name || 'Pakketreis'),
      subtitle: safeStr(ct.supplierName || ct.modalityName || ''),
      supplier: safeStr(ct.supplierName || ''),
      nights: (ct.dayTo && ct.dayFrom ? ct.dayTo - ct.dayFrom : 0) || 0,
      date_start: safeStr(ct.startDate || ''),
      date_end: safeStr(ct.endDate || ''),
      location: safeStr(ct.address || ''),
      description: stripHtml(ct.description || ''),
      image_url: (ct.imageUrls || [])[0] || '',
      images: ct.imageUrls || [],
      price: extractPrice(ct),
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

  // =============================================================
  // ORDERING: Simple date-based sort
  // =============================================================
  // TC API provides real dates: checkInDate/checkOutDate for hotels,
  // startDate/endDate for closedTours (cruises), departureDate for flights.
  // Just sort everything by date_start.
  // =============================================================

  console.log('[TC Sort] Items before sort:', items.map(i => `${i.type}:"${i.title}" date=${i.date_start}`).join(' | '));

  // Sort by date_start — items with dates first, items without dates at the end
  // Normalize to date-only (YYYY-MM-DD) to handle datetime vs date comparison
  const toDateOnly = (d: string): string => d ? d.substring(0, 10) : '';

  items.sort((a, b) => {
    const dayA = toDateOnly(a.date_start || '');
    const dayB = toDateOnly(b.date_start || '');
    const validA = dayA.length === 10;
    const validB = dayB.length === 10;

    // Both have dates: sort chronologically by DAY only
    if (validA && validB) {
      if (dayA !== dayB) return dayA < dayB ? -1 : 1;
      // Same day: flights first, then hotels/cruises, then car/transfer
      const typeOrder: Record<string, number> = { flight: 0, transfer: 1, hotel: 2, cruise: 2, car_rental: 3, activity: 4 };
      return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
    }
    // Only one has a date: put the one with a date first
    if (validA && !validB) return -1;
    if (!validA && validB) return 1;
    // Neither has a date: keep original order
    return 0;
  });

  // Assign sort_order
  items.forEach((item, idx) => { item.sort_order = idx; });
  console.log('[TC Sort] Items after sort:', items.map(i => `${i.sort_order}:${i.type}:"${i.title}" ${i.date_start||'no-date'}`).join(' | '));

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
