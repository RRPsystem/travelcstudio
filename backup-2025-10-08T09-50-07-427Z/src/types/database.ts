export interface User {
  id: string;
  email: string;
  role: 'admin' | 'brand' | 'operator';
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
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: string;
  brand_id: string;
  template_id?: string;
  name: string;
  slug: string;
  domain?: string;
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
  meta_title?: string;
  meta_description?: string;
  is_homepage: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  template_id?: string;
  brand_id?: string;
  title: string;
  slug: string;
  content?: any;
  featured_image_url?: string;
  excerpt?: string;
  status: string;
  published_at?: string;
  brand_approved: boolean;
  brand_mandatory: boolean;
  website_visible: boolean;
  author_type: string;
  author_brand_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BuilderProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  project_data: any;
  settings: any;
  status: string;
  domain?: string;
  brand_id?: string;
  created_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BuilderPage {
  id: string;
  project_id?: string;
  name: string;
  slug: string;
  page_data: any;
  meta_title?: string;
  meta_description?: string;
  is_homepage: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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