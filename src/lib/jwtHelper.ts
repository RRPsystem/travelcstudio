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
    destinationSlug?: string;
    mode?: string;
    returnUrl?: string;
  } = {}
): Promise<GenerateJWTResponse> {
  console.log('[generateBuilderJWT] Called with scopes:', scopes);
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

  console.log('[generateBuilderJWT] Request body scopes:', requestBody.scopes);

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
  if (options.destinationSlug) requestBody.destination_slug = options.destinationSlug;
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

export function generateBuilderDeeplink({
  baseUrl,
  jwtResponse,
  returnUrl,
  pageId,
  templateId,
  menuId,
  headerId,
  footerId,
  mode,
  authorType,
  authorId,
  contentType,
  newsSlug,
  destinationSlug,
}: {
  baseUrl?: string;
  jwtResponse: GenerateJWTResponse;
  returnUrl?: string;
  pageId?: string;
  templateId?: string;
  menuId?: string;
  headerId?: string;
  footerId?: string;
  mode?: string;
  authorType?: string;
  authorId?: string;
  contentType?: string;
  newsSlug?: string;
  destinationSlug?: string;
}): string {
  const builderBaseUrl = baseUrl || 'https://www.ai-websitestudio.nl';
  const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const params = new URLSearchParams({
    api: apiBaseUrl,
    brand_id: jwtResponse.brand_id,
    token: jwtResponse.token,
    apikey: apiKey
  });

  if (pageId) params.append('page_id', pageId);
  if (templateId) params.append('template_id', templateId);
  if (menuId) params.append('menu_id', menuId);
  if (headerId) params.append('header_id', headerId);
  if (footerId) params.append('footer_id', footerId);
  if (returnUrl) params.append('return_url', returnUrl);
  if (mode) params.append('mode', mode);
  if (authorType) params.append('author_type', authorType);
  if (authorId) params.append('author_id', authorId);
  if (contentType) params.append('content_type', contentType);

  // Use 'slug' for both news and destinations (builder expects 'slug' parameter)
  if (newsSlug) params.append('slug', newsSlug);
  if (destinationSlug) params.append('slug', destinationSlug);

  return `${builderBaseUrl}/?${params.toString()}`;
}

/**
 * Helper function to open the builder with proper JWT token and return URL
 * Use this to prevent bugs where the wrong type is passed to generateBuilderDeeplink
 */
export async function openBuilder(
  brandId: string,
  userId: string,
  options: {
    pageId?: string;
    templateId?: string;
    menuId?: string;
    headerId?: string;
    footerId?: string;
    returnUrl?: string;
    scopes?: string[];
    mode?: string;
  } = {}
): Promise<string> {
  const scopes = options.scopes || [
    'pages:read',
    'pages:write',
    'layouts:read',
    'layouts:write',
    'menus:read',
    'menus:write',
    'content:read',
    'content:write'
  ];

  console.log('[openBuilder] Using scopes:', scopes);

  const jwtOptions: any = {};
  if (options.pageId) jwtOptions.pageId = options.pageId;
  if (options.templateId) jwtOptions.templateId = options.templateId;
  if (options.menuId) jwtOptions.menuId = options.menuId;
  if (options.returnUrl) jwtOptions.returnUrl = options.returnUrl;

  console.log('[openBuilder] Calling generateBuilderJWT with scopes:', scopes);
  const jwtResponse = await generateBuilderJWT(brandId, userId, scopes, jwtOptions);
  console.log('[openBuilder] JWT Response received');

  const deeplinkOptions: any = {
    jwtResponse: jwtResponse
  };
  if (options.pageId) deeplinkOptions.pageId = options.pageId;
  if (options.templateId) deeplinkOptions.templateId = options.templateId;
  if (options.menuId) deeplinkOptions.menuId = options.menuId;
  if (options.headerId) deeplinkOptions.headerId = options.headerId;
  if (options.footerId) deeplinkOptions.footerId = options.footerId;
  if (options.returnUrl) deeplinkOptions.returnUrl = options.returnUrl;
  if (options.mode) deeplinkOptions.mode = options.mode;

  return generateBuilderDeeplink(deeplinkOptions);
}

/**
 * Helper function specifically for Admin to create/edit templates
 */
export async function openTemplateBuilder(
  userId: string,
  options: {
    mode: 'create-template' | 'edit-template';
    pageId?: string;
    title?: string;
    slug?: string;
    templateCategory?: string;
    previewImageUrl?: string;
    returnUrl?: string;
  }
): Promise<string> {
  const systemBrandId = '00000000-0000-0000-0000-000000000999';
  const scopes = [
    'pages:read',
    'pages:write',
    'content:read',
    'content:write',
    'layouts:read',
    'layouts:write',
    'menus:read',
    'menus:write'
  ];

  const jwtOptions: any = {
    forceBrandId: false,
    mode: options.mode,
  };

  if (options.pageId) jwtOptions.pageId = options.pageId;
  if (options.returnUrl) jwtOptions.returnUrl = options.returnUrl;

  const jwtResponse = await generateBuilderJWT(systemBrandId, userId, scopes, jwtOptions);

  const builderBaseUrl = 'https://www.ai-websitestudio.nl';
  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const params = new URLSearchParams({
    api: apiBaseUrl,
    token: jwtResponse.token,
    apikey: apiKey,
    brand_id: systemBrandId,
    mode: options.mode,
    content_type: 'page',
    is_template: 'true',
    type: 'page',
  });

  if (options.pageId) params.append('page_id', options.pageId);
  if (options.title) params.append('title', options.title);
  if (options.slug) params.append('slug', options.slug);
  if (options.templateCategory) params.append('template_category', options.templateCategory);
  if (options.previewImageUrl) params.append('preview_image_url', options.previewImageUrl);
  if (options.returnUrl) params.append('return_url', options.returnUrl);

  console.log('[openTemplateBuilder] Generated URL params:', {
    mode: options.mode,
    content_type: 'page',
    is_template: 'true',
    pageId: options.pageId || 'new',
    returnUrl: options.returnUrl
  });

  return `${builderBaseUrl}/?${params.toString()}#/mode/builder`;
}

/**
 * Simplified helper for opening builder - auto-fetches user context
 */
export async function openBuilderSimple(options: {
  brand_id: string;
  user_id?: string;
  mode?: 'page' | 'menu' | 'footer';
  page_id?: string;
  menu_id?: string;
  footer_id?: string;
  template_id?: string;
  return_url?: string;
}): Promise<void> {
  const jwtResponse = await generateBuilderJWT(
    options.brand_id,
    options.user_id || options.brand_id,
    [
      'pages:read',
      'pages:write',
      'layouts:read',
      'layouts:write',
      'menus:read',
      'menus:write',
      'content:read',
      'content:write'
    ],
    {
      pageId: options.page_id,
      menuId: options.menu_id,
      footerId: options.footer_id,
      templateId: options.template_id,
      returnUrl: options.return_url,
      mode: options.mode,
    }
  );

  const deeplink = generateBuilderDeeplink({
    jwtResponse,
    pageId: options.page_id,
    menuId: options.menu_id,
    footerId: options.footer_id,
    templateId: options.template_id,
    returnUrl: options.return_url,
    mode: options.mode,
  });

  console.log('[openBuilderSimple] Opening builder:', deeplink);
  window.location.href = deeplink;
}

/**
 * Helper function to open the Video Generator
 */
export async function openVideoGenerator(
  brandId: string,
  userId: string,
  options: {
    returnUrl?: string;
  } = {}
): Promise<string> {
  const scopes = [
    'pages:read',
    'pages:write',
    'content:read',
    'content:write'
  ];

  const jwtOptions: any = {};
  if (options.returnUrl) jwtOptions.returnUrl = options.returnUrl;

  const jwtResponse = await generateBuilderJWT(brandId, userId, scopes, jwtOptions);

  const builderBaseUrl = 'https://www.ai-websitestudio.nl';
  const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const params = new URLSearchParams({
    api: apiBaseUrl,
    brand_id: jwtResponse.brand_id,
    token: jwtResponse.token,
    apikey: apiKey
  });

  if (options.returnUrl) params.append('return_url', options.returnUrl);

  return `${builderBaseUrl}/?${params.toString()}#/mode/video-generator`;
}

/**
 * Helper function to open the Travel Import tool
 */
export async function openTravelImport(
  brandId: string,
  userId: string,
  options: {
    returnUrl?: string;
  } = {}
): Promise<string> {
  const scopes = [
    'pages:read',
    'pages:write',
    'content:read',
    'content:write'
  ];

  const jwtOptions: any = {};
  if (options.returnUrl) jwtOptions.returnUrl = options.returnUrl;

  const jwtResponse = await generateBuilderJWT(brandId, userId, scopes, jwtOptions);

  const builderBaseUrl = 'https://www.ai-websitestudio.nl';
  const apiBaseUrl = jwtResponse.api_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const apiKey = jwtResponse.api_key || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const params = new URLSearchParams({
    api: apiBaseUrl,
    brand_id: jwtResponse.brand_id,
    token: jwtResponse.token,
    apikey: apiKey
  });

  if (options.returnUrl) params.append('return_url', options.returnUrl);

  return `${builderBaseUrl}/?${params.toString()}#/mode/travel`;
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
