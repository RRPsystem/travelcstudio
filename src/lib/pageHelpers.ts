export interface PageMetadata {
  type?: 'destination' | 'news' | 'blog' | 'page';
  category?: string;
  featured?: boolean;
  author?: string;
  tags?: string[];
  [key: string]: any;
}

export function detectPageType(slug: string, title?: string): 'destination' | 'news' | 'blog' | 'page' {
  const lowerSlug = slug.toLowerCase();
  const lowerTitle = title?.toLowerCase() || '';

  if (lowerSlug.startsWith('destination-') || lowerTitle.includes('bestemming')) {
    return 'destination';
  }

  if (lowerSlug.startsWith('news-') || lowerTitle.includes('nieuws')) {
    return 'news';
  }

  if (lowerSlug.startsWith('blog-') || lowerTitle.includes('blog')) {
    return 'blog';
  }

  return 'page';
}

export function getPageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'destination': 'Bestemming',
    'news': 'Nieuws',
    'blog': 'Blog',
    'page': 'Pagina'
  };
  return labels[type] || 'Pagina';
}

export function getPageTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    'destination': 'bg-blue-100 text-blue-800',
    'news': 'bg-green-100 text-green-800',
    'blog': 'bg-purple-100 text-purple-800',
    'page': 'bg-gray-100 text-gray-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

export function generateTemplatePreviewUrl(brandId: string, type: string): string {
  const baseUrl = 'https://www.ai-websitestudio.nl/templates/gotur/gotur-html-main';

  switch (type) {
    case 'destination':
      return `${baseUrl}/destinations-dynamic.html?brand_id=${brandId}`;
    case 'news':
    case 'blog':
      return `${baseUrl}/blog-dynamic.html?brand_id=${brandId}`;
    default:
      return '';
  }
}

export function isTemplateVisibleType(type: string): boolean {
  return ['destination', 'news', 'blog'].includes(type);
}
