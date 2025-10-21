export interface BuilderJWTPayload {
  brand_id: string;
  sub: string;
  scope: string[];
  exp: number;
  iat: number;
}

export interface GenerateJWTResponse {
  token: string;
  brand_id: string;
  url: string;
  api_url: string;
  api_key: string;
}

/**
 * Generates a JWT token for the builder by calling the server-side Edge Function
 */
export async function generateBuilderJWT(
  brandId: string,
  userId: string,
  scopes: string[] = [
    'pages:read',
    'pages:write',
    'layouts:read',
    'layouts:write',
    'menus:read',
    'menus:write',
    'content:read',
    'content:write',
    'news:write'
  ],
  options: {
    pageId?: string;
    slug?: string;
    forceBrandId?: boolean;
    templateId?: string;
    menuId?: string;
    footerId?: string;
    authorType?: string;
    authorId?: string;
    contentType?: string;
    newsSlug?: string;
    mode?: string;
    returnUrl?: string;
  } = {}
): Promise<GenerateJWTResponse> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-builder-jwt`;

  let authToken = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const sessionKey = Object.keys(localStorage).find(key =>
    key.startsWith('sb-') && key.includes('-auth-token')
  );

  if (sessionKey) {
    try {
      const sessionData = JSON.parse(localStorage.getItem(sessionKey) || '{}');
      if (sessionData.access_token) {
        authToken = sessionData.access_token;
      }
    } catch (e) {
      console.warn('Failed to parse session token:', e);
    }
  }

  const requestBody: any = {
    scopes: scopes,
  };

  if (options.forceBrandId) {
    requestBody.brand_id = brandId;
  }

  if (options.pageId) requestBody.page_id = options.pageId;
  if (options.slug) requestBody.slug = options.slug;
  if (options.templateId) requestBody.template_id = options.templateId;
  if (options.menuId) requestBody.menu_id = options.menuId;
  if (options.footerId) requestBody.footer_id = options.footerId;
  if (options.authorType) requestBody.author_type = options.authorType;
  if (options.authorId) requestBody.author_id = options.authorId;
  if (options.contentType) requestBody.content_type = options.contentType;
  if (options.newsSlug) requestBody.news_slug = options.newsSlug;
  if (options.mode) requestBody.mode = options.mode;
  if (options.returnUrl) requestBody.return_url = options.returnUrl;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('JWT generation failed:', errorData);
    throw new Error(errorData.error || 'Failed to generate JWT');
  }

  const data = await response.json();
  return data;
}

export function generateBuilderDeeplink(
  brandId: string,
  token: string,
  options: {
    pageId?: string;
    templateId?: string;
    menuId?: string;
    headerId?: string;
    footerId?: string;
    returnUrl?: string;
  } = {}
): string {
  const builderBaseUrl = 'https://www.ai-websitestudio.nl';
  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL || window.location.origin}/functions/v1`;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const params = new URLSearchParams({
    api: apiBaseUrl,
    brand_id: brandId,
    token: token,
    apikey: apiKey
  });

  if (options.pageId) {
    params.append('page_id', options.pageId);
  }

  if (options.templateId) {
    params.append('template_id', options.templateId);
  }

  if (options.menuId) {
    params.append('menu_id', options.menuId);
  }

  if (options.headerId) {
    params.append('header_id', options.headerId);
  }

  if (options.footerId) {
    params.append('footer_id', options.footerId);
  }

  if (options.returnUrl) {
    params.append('return_url', options.returnUrl);
  }

  return `${builderBaseUrl}/?${params.toString()}`;
}

/**
 * Extract JWT token and brand_id from deeplink URL
 * Call this when Builder receives a deeplink from Bolt.new
 */
export function parseDeeplinkParams(): {
  brandId: string | null;
  token: string | null;
  apiBaseUrl: string | null;
  pageId?: string;
  menuId?: string;
  headerId?: string;
  footerId?: string;
} {
  const params = new URLSearchParams(window.location.search);

  return {
    brandId: params.get('brand_id'),
    token: params.get('token'),
    apiBaseUrl: params.get('api'),
    pageId: params.get('page_id') || undefined,
    menuId: params.get('menu_id') || undefined,
    headerId: params.get('header_id') || undefined,
    footerId: params.get('footer_id') || undefined,
  };
}
