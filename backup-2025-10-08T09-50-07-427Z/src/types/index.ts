export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  userId: string;
  template: string;
  pages: Page[];
  settings: SiteSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  name: string;
  path: string;
  siteId: string;
  components: PageComponent[];
  seoTitle?: string;
  seoDescription?: string;
  isPublished: boolean;
}

export interface PageComponent {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  children?: PageComponent[];
  style?: ComponentStyle;
}

export interface ComponentStyle {
  margin?: string;
  padding?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface SiteSettings {
  title: string;
  description: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
}

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  uploadedAt: string;
}

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  description: string;
  user: {
    name: string;
  };
}

export type ComponentType = 
  | 'hero' 
  | 'text' 
  | 'image' 
  | 'gallery' 
  | 'booking-form' 
  | 'testimonial' 
  | 'destination-card'
  | 'tour-package'
  | 'contact-form'
  | 'youtube-video'
  | 'map';

export interface DragItem {
  id: string;
  type: ComponentType;
  name: string;
  icon: string;
}