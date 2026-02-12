/**
 * ============================================================
 * TRAVEL COMPOSITOR API — CENTRALIZED FIELD REFERENCE
 * ============================================================
 * 
 * This file documents the EXACT field names returned by the TC API
 * for each item type. All TC-related code in the project should
 * reference this file to avoid field name guessing.
 * 
 * API Base: https://online.travelcompositor.com/resources
 * Swagger:  https://online.travelcompositor.com/resources/swagger.json
 * 
 * Endpoints used:
 *   - Auth:    POST /authentication/authenticate
 *   - Info:    GET  /travelidea/{micrositeId}/info/{travelId}?lang=nl
 *   - Detail:  GET  /travelidea/{micrositeId}/{travelId}?lang=nl
 *   - Fallback: GET /package/{micrositeId}/{travelId}?lang=nl
 *   - Hotels:  GET  /accommodations/{id}/datasheet
 *   - List:    GET  /travelidea/{micrositeId}?first=0&limit=500&lang=nl
 * 
 * Used by:
 *   - supabase/functions/import-travel-compositor/index.ts  (Edge Function)
 *   - src/lib/tcImportToOfferte.ts                          (Client mapping)
 *   - wordpress-plugins/travelc-reizen/.../travel-detail-v2.php (WP plugin)
 * ============================================================
 */

// ─── INFO ENDPOINT (PurchaseAttemptResponse / IdeaVO) ───────
export interface TcInfoResponse {
  id: number;
  title: string;
  largeTitle: string;
  description: string;
  remarks: string;
  imageUrl: string;
  creationDate: string;       // "2026-01-15"
  departureDate: string;      // "2026-09-11"
  ideaUrl: string;
  themes: string[];
  pricePerPerson: { amount: number; currency: string };
  totalPrice: { amount: number; currency: string };
  destinations: TcIdeaPlace[];    // Chronological order!
  itinerary: TcIdeaPlace[];       // Also chronological
  counters: {
    adults: number;
    children: number;
    hotelNights: number;
  };
}

export interface TcIdeaPlace {
  name: string;
  country?: string;
  geolocation?: { latitude: number; longitude: number };
}

// ─── DETAIL ENDPOINT (full trip package) ────────────────────
export interface TcDetailResponse {
  destinations: TcDestination[];   // In trip-chronological order
  hotels: TcHotel[];               // In trip-chronological order
  cruises: TcCruise[];             // In trip-chronological order
  transports: TcTransport[];       // Flights + transfers, have 'day' field
  cars: TcCarRental[];             // Usually 1 item
  tickets: TcTicket[];             // Activities/excursions
  numberOfDays: number;
  numberOfNights: number;
}

// ─── DESTINATION ────────────────────────────────────────────
export interface TcDestination {
  name: string;
  country: string;
  description: string;        // HTML, needs stripping
  highlights: string[];
  imageUrls: string[];
  geolocation: { latitude: number; longitude: number } | null;
}

// ─── HOTEL ──────────────────────────────────────────────────
// Raw TC API hotel object fields:
export interface TcHotel {
  name: string;
  nights: number;
  day: number;                 // Which day of the trip (1-based)
  destination: string;         // City/region name
  city?: string;
  hotelData: {
    name: string;
    category: string;          // e.g. "4 stars"
    city: string;
    destination: string;
    address: string;
    description: string;       // HTML
    shortDescription: string;  // HTML
    images: string[];          // URL array
    facilities: Record<string, string[] | boolean>;
    geolocation: { latitude: number; longitude: number } | null;
    mealPlan: string;          // e.g. "MET ONTBIJT", "ALLEEN KAMER"
    roomType?: string;
  };
  mealPlan: string;
  roomDescription?: string;
  selectedRoom?: string;
  price?: number;
  priceBreakdown?: { totalPrice?: { microsite?: { amount: number } } };
}

// ─── CRUISE ─────────────────────────────────────────────────
// Raw TC API cruise object fields:
export interface TcCruise {
  cruiseLine: string;          // e.g. "Royal Caribbean"
  shipId: string;              // e.g. "rcc-al" (Allure of the Seas)
  nights: number;
  stars: string;
  selectedCategory: string;    // Cabin type
  group: string;               // Cabin group
  departure: string;           // Departure port (e.g. "Fort Lauderdale")
  arrival: string;             // Arrival port
  // NOTE: No 'day' field — use destination matching for ordering
}

// ─── TRANSPORT (flights + transfers) ────────────────────────
// Raw TC API transport object fields:
export interface TcTransport {
  company: string;             // Airline name
  transportNumber: string;     // Flight number
  transportType: 'FLIGHT' | string;  // 'FLIGHT' or other (transfer/daytrip)
  day: number;                 // Which day of the trip (1-based) ← KEY for ordering
  originCode: string;          // Airport IATA code
  targetCode: string;          // Airport IATA code
  departureTime: string;       // "14:30"
  arrivalTime: string;         // "18:45"
  departureDate?: string;      // Only on flights, may be absent
  arrivalDate?: string;
  segment: TcTransportSegment[];
}

export interface TcTransportSegment {
  departureAirportName: string;
  arrivalAirportName: string;
  departureTime: string;
  arrivalTime: string;
}

// ─── CAR RENTAL ─────────────────────────────────────────────
// Raw TC API car rental object fields:
export interface TcCarRental {
  pickupDay: number;           // Day of trip for pickup (1-based)
  dropoffDay: number;          // Day of trip for dropoff
  // No actual dates — calculate from trip start + day numbers
  name?: string;
  category?: string;
  company?: string;
}

// ─── TICKET / ACTIVITY ──────────────────────────────────────
export interface TcTicket {
  name: string;
  description: string;
  destination: string;
  date?: string;
  duration?: string;
  price?: number;
  imageUrls?: string[];
}

// ─── ORDERING RULES ─────────────────────────────────────────
/**
 * CRITICAL: How to determine the correct chronological order:
 * 
 * 1. DESTINATIONS array → chronological trip order (this is the backbone)
 * 2. HOTELS array → in trip order, match to destinations by city/name
 * 3. CRUISES array → in trip order, match to destinations by departure port
 * 4. TRANSPORTS → have 'day' field (1 = first day, N = last day)
 * 5. CAR RENTALS → have pickupDay/dropoffDay (day numbers)
 * 
 * The destinations array is the SINGLE SOURCE OF TRUTH for ordering.
 * Hotels and cruises must be matched to destinations to get correct
 * interleaving (e.g., Hotel Miami → Cruise → Hotel Key West).
 * 
 * DO NOT sort by date_start — hotels/cruises have no dates in the API.
 * Calculate dates AFTER ordering using trip start date + cumulative nights.
 */
