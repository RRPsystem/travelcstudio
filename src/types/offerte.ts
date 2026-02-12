export type OfferteItemType = 'flight' | 'transfer' | 'hotel' | 'activity' | 'car_rental' | 'cruise' | 'train' | 'insurance' | 'note';

export interface OfferteItem {
  id: string;
  type: OfferteItemType;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  location?: string;
  date_start?: string;
  date_end?: string;
  nights?: number;
  price?: number;
  price_per_person?: number;
  currency?: string;
  supplier?: string;
  booking_reference?: string;
  details?: Record<string, any>;
  images?: string[]; // Multiple images for photo grid
  facilities?: string[]; // Hotel facilities/amenities
  price_hidden?: boolean; // Hide price for this item
  // Flight specific
  departure_airport?: string;
  arrival_airport?: string;
  departure_time?: string;
  arrival_time?: string;
  airline?: string;
  flight_number?: string;
  // Hotel specific
  hotel_name?: string;
  room_type?: string;
  board_type?: string; // e.g. 'BB', 'HB', 'FB', 'AI'
  star_rating?: number;
  // Transfer specific
  transfer_type?: string; // 'private', 'shared', 'self-drive'
  pickup_location?: string;
  dropoff_location?: string;
  // Activity specific
  activity_duration?: string;
  included_items?: string[];
  // Auto rondreis specific
  distance?: string; // e.g. "250 km"
  sort_order: number;
}

export interface ExtraCost {
  id: string;
  label: string;
  amount: number;
  per_person?: boolean; // true = amount is per person, false = total amount
  apply_to_all?: boolean; // true = apply to all future offertes for this brand
}

export interface Offerte {
  id: string;
  brand_id?: string;
  agent_id?: string;
  travel_compositor_id?: string;
  // Client info
  client_name: string;
  client_email?: string;
  client_phone?: string;
  // Offerte content
  title: string;
  subtitle?: string;
  intro_text?: string;
  hero_image_url?: string;
  hero_images?: string[];
  hero_video_url?: string;
  // Route map
  destinations?: OfferteDestination[];
  // Items
  items: OfferteItem[];
  // Extra costs (admin fees, SGR, etc.)
  extra_costs?: ExtraCost[];
  // Pricing
  total_price?: number;
  price_per_person?: number;
  number_of_travelers?: number;
  currency: string;
  price_display: 'total' | 'per_person' | 'both' | 'hidden';
  // Auto rondreis specific
  departure_date?: string; // For countdown timer
  template_type?: 'standard' | 'auto-rondreis';
  // Status
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'revised' | 'expired';
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  valid_until?: string;
  // Client response
  client_response?: 'accepted' | 'rejected';
  client_response_note?: string;
  // Notes
  internal_notes?: string;
  terms_conditions?: string;
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface OfferteDestination {
  name: string;
  country?: string;
  description?: string;
  highlights?: string[];
  images?: string[];
  lat: number;
  lng: number;
  order: number;
}

export const OFFERTE_ITEM_TYPES: { type: OfferteItemType; label: string; icon: string; color: string; bgColor: string }[] = [
  { type: 'flight', label: 'Vlucht', icon: 'Plane', color: '#3b82f6', bgColor: '#eff6ff' },
  { type: 'transfer', label: 'Transfer', icon: 'Car', color: '#8b5cf6', bgColor: '#f5f3ff' },
  { type: 'hotel', label: 'Hotel', icon: 'Building2', color: '#f59e0b', bgColor: '#fffbeb' },
  { type: 'activity', label: 'Activiteit', icon: 'Compass', color: '#10b981', bgColor: '#ecfdf5' },
  { type: 'car_rental', label: 'Huurauto', icon: 'CarFront', color: '#6366f1', bgColor: '#eef2ff' },
  { type: 'cruise', label: 'Cruise', icon: 'Ship', color: '#0ea5e9', bgColor: '#f0f9ff' },
  { type: 'train', label: 'Trein', icon: 'Train', color: '#ef4444', bgColor: '#fef2f2' },
  { type: 'insurance', label: 'Verzekering', icon: 'Shield', color: '#64748b', bgColor: '#f8fafc' },
  { type: 'note', label: 'Notitie', icon: 'StickyNote', color: '#a855f7', bgColor: '#faf5ff' },
];
