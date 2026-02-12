/**
 * ============================================================
 * TRAVEL COMPOSITOR API — SINGLE SOURCE OF TRUTH
 * ============================================================
 * 
 * This file contains the EXACT field names from the TC API Swagger.
 * ALL TC-related code MUST reference this file. NEVER guess field names.
 * 
 * Source: TC API Swagger — IdeaDayToDayVO response schema
 * API Base: https://online.travelcompositor.com/resources
 * Swagger:  https://online.travelcompositor.com/resources/swagger.json
 * 
 * Endpoints:
 *   Auth:     POST /authentication/authenticate
 *   Info:     GET  /travelidea/{micrositeId}/info/{travelId}?lang=nl
 *   Detail:   GET  /travelidea/{micrositeId}/{travelId}?lang=nl
 *   Fallback: GET  /package/{micrositeId}/{travelId}?lang=nl
 *   Hotels:   GET  /accommodations/{id}/datasheet
 *   List:     GET  /travelidea/{micrositeId}?first=0&limit=500&lang=nl
 * 
 * Used by:
 *   supabase/functions/import-travel-compositor/index.ts
 *   src/lib/tcImportToOfferte.ts
 *   wordpress-plugins/travelc-reizen/.../travel-detail-v2.php
 * 
 * Last updated: 2026-02-12 from Swagger IdeaDayToDayVO
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════
// DETAIL ENDPOINT — IdeaDayToDayVO (top-level response)
// ═══════════════════════════════════════════════════════════
export interface TcDayToDayResponse {
  destinations: TcDestination[];
  tripSpots: TcTripSpot[];
  closedTours: TcClosedTour[];     // ← CRUISES can also be here (package tours)
  cruises: TcCruise[];             // ← CRUISES (CruiseDataSheetVO) — separate array!
  transports: TcTransport[];       // Flights (transportType='FLIGHT')
  transfers: TcTransfer[];         // Ground transfers (separate from transports!)
  hotels: TcHotel[];
  preferredHotels: TcPreferredHotel[];
  tickets: TcTicket[];             // Activities / excursions
  cars: TcCarRental[];             // Car rentals (IdeaCarRentalVO)
  manuals: TcManual[];             // Manual bookings (IdeaManualVO)
}

// ═══════════════════════════════════════════════════════════
// DESTINATION — IdeaDestinationVO
// ═══════════════════════════════════════════════════════════
export interface TcDestination {
  type: 'DESTINATION' | 'TRIP_SPOT' | 'TRANSPORT_BASE' | 'HOTEL';
  code: string;
  name: string;
  nextLocationDistance: string;
  fromDay: number;                 // ← First day at this destination (1-based)
  toDay: number;                   // ← Last day at this destination (1-based)
  country: string;
  description: string;             // HTML, needs stripping
  imageUrls: string[];
  geolocation: { latitude: number; longitude: number } | null;
  recommendedAirportCode: string;
  recommendedAirportName: string;
  moreInfoUrl: string;
}

// ═══════════════════════════════════════════════════════════
// TRIP SPOT — IdeaTripSpotVO
// ═══════════════════════════════════════════════════════════
export interface TcTripSpot {
  type: 'DESTINATION' | 'TRIP_SPOT' | 'TRANSPORT_BASE' | 'HOTEL';
  code: string;
  name: string;
  nextLocationDistance: string;
  latitude: number;
  longitude: number;
  spotType: 'NATURE' | 'AMUSEMENT' | 'TOWN' | 'HERITAGE';
  country: string;
  active: boolean;
  image: string;
  secondImage: string;
  highResolutionImage: string;
}

// ═══════════════════════════════════════════════════════════
// HOTEL — IdeaHotelVO
// ═══════════════════════════════════════════════════════════
export interface TcHotel {
  id: string;
  day: number;                     // Which day of the trip (1-based)
  checkInDate: string;             // ← ACTUAL DATE "2026-09-11" ($date)
  checkOutDate: string;            // ← ACTUAL DATE "2026-09-13" ($date)
  nights: number;
  hotelData: TcHotelData;
  roomTypes: string;               // ← Room type description (NOT roomType singular!)
  mealPlan: string;                // e.g. "MET ONTBIJT", "ALLEEN KAMER"
  priceBreakdown: TcPriceBreakdown;
  bookingReference: string;
  supplier: string;
  mandatory: boolean;
  fixed: boolean;
}

export interface TcHotelData {
  id: string;
  giataId: number;
  name: string;
  category: 'S1'|'S2'|'S3'|'S4'|'S5'|'S6'|'L1'|'L2'|'L3'|'L4'|'L5'|'H1'|'H2'|'H3'|'H4'|'H5'|'IN';
  images: TcHotelImage[];
  facilities: TcFacilities;
  destination: TcPlace;            // ← Object with .name, .code, NOT a string!
  geolocation: { latitude: number; longitude: number } | null;
  description: string;             // HTML
  ratings: TcRating[];
  phoneNumber: string;
  chain: string;
  address: string;
  internalRemark: string;
  accommodationType: 'HOTEL' | 'APARTMENT';
  accommodationSubtype: string;    // HOTEL, MOTELS, RESORTS, BED_AND_BR, VILLAS, etc.
}

export interface TcHotelImage {
  url: string;
  // ApiStaticContentAccommodationImageVO — may have more fields
}

export interface TcFacilities {
  includedFacilities: TcFacility[];
  nonIncludedFacilities: TcFacility[];
  otherFacilities: TcFacility[];
}

export interface TcFacility {
  name: string;
  // FacilityVO — may have more fields
}

export interface TcPlace {
  type: 'DESTINATION' | 'TRIP_SPOT' | 'TRANSPORT_BASE' | 'HOTEL';
  code: string;
  name: string;
  nextLocationDistance: string;
}

export interface TcRating {
  source: string;
  numReviews: number;
  score: string;
}

// ═══════════════════════════════════════════════════════════
// CLOSED TOUR — IdeaClosedTourVO (CRUISES + PACKAGE TOURS)
// ═══════════════════════════════════════════════════════════
export interface TcClosedTour {
  id: string;
  providerCode: string;
  supplierId: number;
  supplierName: string;
  dayFrom: number;                 // ← Start day of trip (1-based)
  dayTo: number;                   // ← End day of trip (1-based)
  startDate: string;               // ← ACTUAL DATE-TIME ($date-time)
  endDate: string;                 // ← ACTUAL DATE-TIME ($date-time)
  name: string;
  modalityName: string;
  description: string;
  address: string;
  imageUrls: string[];
  includedServices: string;
  nonIncludedServices: string;
  hotels: string;                  // Hotels within the tour (text description)
  priceBreakdown: TcPriceBreakdown;
  bookingReference: string;
  mandatory: boolean;
  fixed: boolean;
  dataSheetId: string;
}

// ═══════════════════════════════════════════════════════════
// CRUISE — CruiseDataSheetVO
// ═══════════════════════════════════════════════════════════
export interface TcCruise {
  id: string;
  shipId: string;
  shipName: string;
  cruiseLine: string;
  stars: number;
  selectedCategory: string;        // Cabin category
  year: string;
  group: string;
  cabin: string;
  originPort: string;
  departure: string;               // CAN BE datetime "2026-09-13T16:00" OR port name — detect with regex!
  arrival: string;                 // CAN BE datetime "2026-09-19T06:00" OR port name — detect with regex!
  nights: number;
  region: string;
  month: string;
  mandatory: boolean;
  fixed: boolean;
  // NOTE: Cruises do NOT have checkInDate/checkOutDate or startDate/endDate!
  // Use closedTours for date info, or calculate from hotel context.
}

// ═══════════════════════════════════════════════════════════
// CAR RENTAL — IdeaCarRentalVO
// ═══════════════════════════════════════════════════════════
export interface TcCarRental {
  id: string;
  product: string;
  company: string;
  imageUrl: string;
  pickupDay: number;               // Day of trip (1-based)
  pickupDate: string;              // ← ACTUAL DATE ($date)!
  pickupLocation: string;
  pickupTime: string;
  dropoffDay: number;              // Day of trip (1-based)
  dropoffDate: string;             // ← ACTUAL DATE ($date)!
  dropoffLocation: string;
  dropoffTime: string;
  priceBreakdown: TcPriceBreakdown;
  mileage: number;
  depositDescription: string;
  fuelType: string;                // FuelType enum (9 values)
  transmissionType: 'AUTOMATIC' | 'MANUAL';
  minimumAge: number;
  bookingReference: string;
  charges: TcCarCharge[];
  mandatory: boolean;
  fixed: boolean;
}

export interface TcCarCharge {
  id: number;
  providerCode: string;
  providerDescription: string;
  money: { amount: number; currency?: string };
}

// ═══════════════════════════════════════════════════════════
// MANUAL — IdeaManualVO (manual bookings)
// ═══════════════════════════════════════════════════════════
export interface TcManual {
  bookingReference: string;
  provider: string;
  startDate: string;               // ← ACTUAL DATE ($date)
  endDate: string;                 // ← ACTUAL DATE ($date)
  country: string;
  description: string;
  pnr: string;
  providerName: string;
  paymentType: string;
  promotionCode: boolean;
  type: 'ACCOUNTING_ADJUSMENT' | 'PROMOTION_CODE' | 'PAYMENT_COMMISSION'
    | 'REWARD_REDEMPTION' | 'OPERATOR_DISCOUNT' | 'AGENCY_EXPENSES'
    | 'ON_SPOT_EXPENSES' | 'TRANSPORT' | 'HOTEL' | 'CLOSEDTOUR'
    | 'TICKET' | 'INSURANCE' | 'TRANSFER' | 'CAR_RENTAL' | 'GIFT_BOX'
    | 'GIFT_BOX_FEE' | 'GIFT_BOX_PURCHASE' | 'GROUP_COACH' | 'GIFT_CARD'
    | 'ADMINISTRATIVE_FEE' | 'CRUISE' | 'MEMBERSHIP' | 'AMENDMENT'
    | 'TRAVEL_CLUB' | 'TRAVEL_CLUB_TPV_FEE';
  voucherDescription: string;
  priceBreakdown: TcPriceBreakdown;
  createdByAgency: string;
  cancelPolicy: TcCancelPolicy[];
}

export interface TcCancelPolicy {
  date: string;                    // $date
  netPrice: { amount: number; currency?: string };
  amount: { amount: number; currency?: string };
  policyAmount: { amount: number; currency?: string };
}

// ═══════════════════════════════════════════════════════════
// TRANSPORT — IdeaTransportVO (FLIGHTS)
// ═══════════════════════════════════════════════════════════
export interface TcTransport {
  type: 'DESTINATION' | 'TRIP_SPOT' | 'TRANSPORT_BASE' | 'HOTEL';  // LocationType
  code: string;
  name: string;
  nextLocationDistance: string;
  id: string;
  day: number;                     // ← Which day of the trip (1-based)
  transportType: string;           // e.g. 'FLIGHT'
  originDestinationCode: string;
  originCode: string;              // Airport IATA code (e.g. "AMS")
  targetDestinationCode: string;
  targetCode: string;              // Airport IATA code (e.g. "MIA")
  company: string;                 // Airline name
  transportNumber: string;         // Flight number (e.g. "BA429")
  duration: string;
  departureDate: string;           // ← ACTUAL DATE ($date)
  arrivalDate: string;             // ← ACTUAL DATE ($date)
  departureTime: string;           // "10:15:00"
  arrivalTime: string;             // "16:45:00"
  numberOfSegments: number;
  dayDifference: number;
  priceBreakdown: TcPriceBreakdown;
  fare: string;
  marketingAirlineCode: string;
  baggageInfo: string;
  bookingReference: string;
  supplier: string;
  mandatory: boolean;
  fixed: boolean;
  segment: TcTransportSegment[];
}

export interface TcTransportSegment {
  departureAirport: string;        // IATA code
  arrivalAirport: string;          // IATA code
  departureAirportName: string;
  arrivalAirportName: string;
  departureDate: string;           // $date-time
  arrivalDate: string;             // $date-time
  marketingAirlineCode: string;
  operatingAirlineCode: string;
  flightNumber: string;
  bookingClass: string;
  cabinClass: string;
  durationInMinutes: number;
  transportType: string;
  fareType: 'PUBLIC' | 'PRIVATE' | 'NEGOTIATED' | 'NEGOSPACE' | 'TOUR_OPERATOR' | 'LOWCOST' | 'MIXED';
  technicalStopsVO: TcTechnicalStop[];
  baggageInfo: string;
}

export interface TcTechnicalStop {
  transportBaseCode: string;
  arrivalDate: string;             // $date-time
  departureDate: string;           // $date-time
  providerTransportBaseDescription: string;
}

// ═══════════════════════════════════════════════════════════
// TRANSFER — IdeaTransferVO (GROUND TRANSPORT)
// ═══════════════════════════════════════════════════════════
export interface TcTransfer {
  id: string;
  day: number;                     // ← Which day of the trip (1-based)
  type: 'IN' | 'OUT';             // TransferType: IN = arrival transfer, OUT = departure transfer
  imageUrl: string;
  productType: 'ECONOMY' | 'STANDARD' | 'EXPRESS' | 'SPECIAL' | 'PREMIUM' | 'LUXURY';
  vehicleType: 'CAR' | 'ELECTRIC_CAR' | 'MINIBUS' | 'BUS' | 'BOAT' | 'DISABLED'
    | 'CAR_OR_BOAT' | 'MINIBUS_OR_BOAT' | 'CAR_OR_TRAIN' | 'SPEEDBOAT' | 'CATAMARAN'
    | 'TRAIN' | 'FLIGHT' | 'MOTORBIKE' | 'SUV' | 'LIMOUSINE' | 'CAR_4X4' | 'TRUCK'
    | 'SEDAN' | 'STATION_WAGON' | 'HIGH_CLASS_SEDAN' | 'SUPERIOR_HIGH_CLASS_SEDAN'
    | 'MPV' | 'SEAPLANE' | 'VAN' | 'MINIVAN' | 'AIRTAXI' | 'CAR_AND_BOAT'
    | 'VAN_AND_BOAT' | 'MINIVAN_OR_BOAT';
  transferServiceType: 'PRIVATE' | 'SHUTTLE' | 'SHARED';
  priceBreakdown: TcPriceBreakdown;
  dateTime: string;                // ← ACTUAL DATE-TIME
  from: TcGeoWithName;             // { latitude, longitude, name }
  to: TcGeoWithName;               // { latitude, longitude, name }
  bookingReference: string;
  transportNumber: string;
  pickupInformation: string;
  telephoneAssistance: string;
  mandatory: boolean;
  fixed: boolean;
}

export interface TcGeoWithName {
  name: string;
  latitude: number;
  longitude: number;
}

// ═══════════════════════════════════════════════════════════
// TICKET — IdeaTicketVO (ACTIVITIES / EXCURSIONS)
// ═══════════════════════════════════════════════════════════
export interface TcTicket {
  id: string;
  day: number;                     // ← Which day of the trip (1-based)
  name: string;
  ticketId: string;
  modality: string;
  description: string;
  meetingPoint: string;
  duration: string;
  imageUrls: string[];
  priceBreakdown: TcPriceBreakdown;
  providerCode: string;
  eventDate: string;               // ← ACTUAL DATE ($date)
  eventTime: string;               // ← TIME ($partial-time)
  adults: number;
  prices: TcTicketPrice[];
  bookingReference: string;
  mandatory: boolean;
  fixed: boolean;
}

export interface TcTicketPrice {
  // IdeaTicketModalityPrice — details TBD
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════
// PREFERRED HOTEL — IdeaPreferredHotelVO
// ═══════════════════════════════════════════════════════════
export interface TcPreferredHotel {
  // Details TBD — check Swagger if needed
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════
// PRICE BREAKDOWN — PriceBreakdownVO
// ═══════════════════════════════════════════════════════════
export interface TcPriceBreakdown {
  totalPrice?: {
    microsite?: { amount: number; currency?: string };
    amount?: number;
  };
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════
// INFO ENDPOINT — IdeaVO / PurchaseAttemptResponse
// ═══════════════════════════════════════════════════════════
export interface TcInfoResponse {
  id: number;
  title: string;
  largeTitle: string;
  description: string;
  remarks: string;
  imageUrl: string;
  creationDate: string;
  departureDate: string;           // ← Trip departure date
  ideaUrl: string;
  themes: string[];
  pricePerPerson: { amount: number; currency: string };
  totalPrice: { amount: number; currency: string };
  destinations: { name: string; country?: string; geolocation?: { latitude: number; longitude: number } }[];
  itinerary: { name: string; country?: string; geolocation?: { latitude: number; longitude: number } }[];
  counters: {
    adults: number;
    children: number;
    hotelNights: number;
  };
}

// ═══════════════════════════════════════════════════════════
// ORDERING RULES
// ═══════════════════════════════════════════════════════════
/**
 * HOW TO ORDER ITEMS CHRONOLOGICALLY:
 * 
 * 1. Hotels have checkInDate + checkOutDate (REAL dates!) → sort by checkInDate
 * 2. Transports have departureDate (REAL dates!) → sort by departureDate
 * 3. ClosedTours (cruises) have startDate + endDate (REAL dates!) → sort by startDate
 * 4. Tickets have eventDate (REAL date!) → sort by eventDate
 * 5. Transfers have dateTime (REAL date-time!) → sort by dateTime
 * 6. Cars have pickupDate + dropoffDate (REAL dates!) AND pickupDay/dropoffDay
 * 
 * SIMPLE: Just sort ALL items by their date field. Every item type has one.
 * Cars are the only exception — calculate from trip start + pickupDay.
 * 
 * Destinations have fromDay/toDay which defines the day range for each stop.
 * 
 * IMPORTANT FIELD NAME GOTCHAS:
 *   - Hotels: checkInDate / checkOutDate  (NOT checkIn / checkOut)
 *   - Hotels: roomTypes (plural!)         (NOT roomType)
 *   - Hotels: hotelData.destination is an OBJECT { name, code } not a string
 *   - Hotels: hotelData.images is array of { url } objects, not string[]
 *   - Hotels: hotelData.facilities has .includedFacilities[] etc, not flat
 *   - Cruises: CruiseDataSheetVO has NO dates! Only port names + nights
 *   - Cruises may ALSO appear in closedTours (with dates: startDate/endDate)
 *   - ClosedTours: startDate/endDate      (NOT departureDate/arrivalDate)
 *   - ClosedTours: dayFrom/dayTo          (NOT day/nights)
 *   - Cars: pickupDate/dropoffDate ARE real dates ($date)! Also have day numbers
 *   - Cars: pickupLocation/dropoffLocation, pickupTime/dropoffTime
 *   - Transfers: separate array from transports!
 *   - Transfers: from/to are { name, lat, lng } objects
 */
