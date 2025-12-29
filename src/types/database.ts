export interface User {
  id: string;
  email: string;
  role: 'admin' | 'brand' | 'operator' | 'agent';
  brand_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  business_type: string;
  primary_color: string;
  secondary_color: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  website_url?: string;
  content_system?: 'internal' | 'wordpress' | 'external_builder';
  wordpress_url?: string;
  wordpress_username?: string;
  wordpress_app_password?: string;
  travelbro_domain?: string;
  font_family?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  brand_id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  slug?: string;
  bio?: string;
  profile_image_url?: string;
  city?: string;
  province?: string;
  recommended_trip_1?: string;
  recommended_trip_2?: string;
  recommended_trip_3?: string;
  custom_links?: CustomLink[];
  specializations?: string[];
  years_experience?: number;
  rating?: number;
  review_count?: number;
  is_top_advisor?: boolean;
  specialist_since?: string;
  certifications?: string[];
  phone_visible?: boolean;
  whatsapp_enabled?: boolean;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomLink {
  label: string;
  url: string;
}

export interface AgentReview {
  id: string;
  agent_id: string;
  reviewer_name: string;
  reviewer_location?: string;
  rating: number;
  review_text: string;
  trip_title?: string;
  travel_date?: string;
  is_verified: boolean;
  is_published: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  brand_id: string;
  name: string;
  description?: string;
  destination?: string;
  duration_days?: number;
  price_from?: number;
  price_currency?: string;
  featured_image_url?: string;
  images?: string[];
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  itinerary?: any;
  is_featured?: boolean;
  is_published?: boolean;
  author_type?: 'admin' | 'brand' | 'agent';
  author_id?: string;
  is_mandatory?: boolean;
  enabled_for_brands?: boolean;
  enabled_for_franchise?: boolean;
  gpt_instructions?: string;
  intake_template?: any;
  metadata?: {
    wp_post_id?: number;
    continent?: string;
    country?: string;
    preview_url?: string;
    thumbnail?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface TripBrandAssignment {
  id: string;
  trip_id: string;
  brand_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'mandatory';
  assigned_at: string;
  responded_at?: string;
  is_published: boolean;
  page_id?: string;
}

export interface TravelIntake {
  id: string;
  trip_id: string;
  brand_id?: string;
  session_token: string;
  travelers_count: number;
  intake_data: any;
  completed_at?: string;
  created_at: string;
}

export interface TravelConversation {
  id: string;
  trip_id: string;
  session_token: string;
  message: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export interface TripParticipant {
  id: string;
  trip_id: string;
  brand_id: string;
  phone_number: string;
  participant_name?: string;
  participant_role?: string;
  is_primary_contact: boolean;
  whatsapp_conversation_id?: string;
  last_message_at?: string;
  conversation_state?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsappSession {
  id: string;
  trip_id: string;
  phone_number: string;
  session_token?: string;
  conversation_state?: string;
  last_message_at?: string;
  created_at: string;
}

export interface ScheduledWhatsappMessage {
  id: string;
  trip_id: string;
  phone_number: string;
  message_text: string;
  template_name?: string;
  template_params?: any;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  error_message?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  display_name: string;
  language: string;
  category: string;
  template_content: string;
  variables: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: string;
  brand_id: string;
  template_id?: string;
  template_source_type?: 'quickstart' | 'custom' | 'wordpress';
  quickstart_template_id?: string;
  external_builder_id?: string;
  name: string;
  slug: string;
  domain?: string;
  subdomain?: string;
  full_url?: string;
  is_live?: boolean;
  content: any;
  status: 'draft' | 'pending_approval' | 'approved' | 'published';
  is_published: boolean;
  published_at?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WebsitePage {
  id: string;
  website_id: string;
  name: string;
  slug: string;
  content: any;
  html_content?: string;
  meta_title?: string;
  meta_description?: string;
  metadata?: any;
  is_homepage: boolean;
  is_in_menu: boolean;
  menu_label?: string;
  menu_order?: number;
  sort_order: number;
  content_type?: 'page' | 'news' | 'destination' | 'trip' | 'agent';
  template_slug?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsItem {
  id: string;
  template_id?: string;
  brand_id?: string;
  title: string;
  slug: string;
  content?: any;
  featured_image_url?: string;
  excerpt?: string;
  closing_text?: string;
  status: string;
  published_at?: string;
  brand_approved: boolean;
  brand_mandatory: boolean;
  website_visible: boolean;
  author_type: 'admin' | 'brand' | 'agent';
  author_brand_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface NewsBrandAssignment {
  id: string;
  news_item_id: string;
  brand_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'mandatory';
  assigned_at: string;
  responded_at?: string;
  is_published: boolean;
  page_id?: string;
}

export interface Destination {
  id: string;
  brand_id?: string;
  name: string;
  slug: string;
  country?: string;
  region?: string;
  description?: string;
  featured_image_url?: string;
  highlights?: string[];
  best_time_to_visit?: string;
  author_type?: 'admin' | 'brand' | 'agent';
  author_id?: string;
  is_mandatory?: boolean;
  enabled_for_brands?: boolean;
  enabled_for_franchise?: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DestinationBrandAssignment {
  id: string;
  destination_id: string;
  brand_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'mandatory';
  assigned_at: string;
  responded_at?: string;
  is_published: boolean;
  page_id?: string;
}

export interface BrandDomain {
  id: string;
  brand_id: string;
  website_id?: string;
  domain: string;
  is_subdomain: boolean;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_token?: string;
  last_verification_attempt?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExternalBuilder {
  id: string;
  name: string;
  builder_url: string;
  api_endpoint: string;
  editor_url?: string;
  auth_token?: string;
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface BuilderCategory {
  id: string;
  builder_id: string;
  category_slug: string;
  display_name: string;
  description?: string;
  total_pages: number;
  preview_url?: string;
  tags?: string[];
  features?: string[];
  recommended_pages?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickstartTemplate {
  id: string;
  builder_id: string;
  category_id: string;
  display_name: string;
  description?: string;
  selected_pages?: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BuilderSession {
  id: string;
  brand_id: string;
  website_id?: string;
  builder_id: string;
  one_time_token: string;
  session_data?: any;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: 'nieuw_idee' | 'pre_flight_check' | 'take_off' | 'in_progress' | 'test_fase' | 'afgerond' | 'afgekeurd';
  category: 'ai_tools' | 'website' | 'traveldingen' | 'uitbreiding' | 'bug_probleem' | 'content';
  vote_count: number;
  created_by?: string;
  brand_id?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_release?: string;
  operator_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapVote {
  id: string;
  roadmap_item_id: string;
  user_id: string;
  created_at: string;
}

export interface APISettings {
  id: string;
  brand_id?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  flickr_api_key?: string;
  flickr_api_secret?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_whatsapp_number?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditWallet {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditPrice {
  id: string;
  action_type: string;
  action_label: string;
  cost_credits: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_type: 'purchase' | 'spend';
  amount: number;
  balance_after: number;
  action_type?: string;
  description: string;
  metadata?: any;
  created_at: string;
}

export interface MolliePayment {
  id: string;
  wallet_id: string;
  user_id: string;
  mollie_payment_id: string;
  amount_eur: number;
  credits_amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
  payment_url?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PodcastHost {
  id: string;
  user_id?: string;
  name: string;
  bio?: string;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisodePlanning {
  id: string;
  episode_id?: string;
  title: string;
  description?: string;
  topic?: string;
  scheduled_date?: string;
  status: 'planning' | 'scheduled' | 'recording' | 'editing' | 'published' | 'cancelled';
  riverside_recording_id?: string;
  hosts?: string[];
  allow_questions: boolean;
  announcement_text?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PodcastQuestion {
  id: string;
  episode_planning_id: string;
  question: string;
  source_type: 'host' | 'admin' | 'brand' | 'agent' | 'ai' | 'public';
  submitted_by?: string;
  submitter_name?: string;
  status: 'suggested' | 'approved' | 'asked' | 'skipped';
  order_index: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PodcastTopic {
  id: string;
  episode_planning_id?: string;
  title: string;
  description?: string;
  status: 'suggested' | 'approved' | 'scheduled' | 'completed';
  suggested_by?: string;
  host_id?: string;
  guest_id?: string;
  visual_type?: 'image' | 'video' | 'screen_share' | 'none';
  visual_url?: string;
  ai_generate_content?: boolean;
  recording_scheduled_for?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface HelpbotConversation {
  id: string;
  user_id?: string;
  brand_id?: string;
  session_id: string;
  message: string;
  role: 'user' | 'assistant';
  feedback?: 'helpful' | 'not_helpful';
  created_at: string;
}

export interface MonitoringAlert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description?: string;
  source_table?: string;
  source_id?: string;
  metadata?: any;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface TestFeature {
  id: string;
  feature_key: string;
  feature_name: string;
  description?: string;
  enabled_globally: boolean;
  enabled_for_operators: boolean;
  enabled_brands?: string[];
  enabled_users?: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentGeneratorChat {
  id: string;
  user_id: string;
  brand_id?: string;
  content_type: 'news' | 'trip' | 'destination' | 'page' | 'general';
  target_id?: string;
  message: string;
  role: 'user' | 'assistant';
  metadata?: any;
  created_at: string;
}

export interface MediaFile {
  id: string;
  brand_id?: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  uploaded_by: string;
  created_at: string;
}

export interface BuilderMedia {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  source: string;
  source_id?: string;
  brand_id?: string;
  uploaded_by?: string;
  created_at: string;
}
