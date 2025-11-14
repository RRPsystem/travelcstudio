# Deeplink API Reference for Website Builder V2

This document defines the exact URL structure for deeplinks into the Website Builder for different content types.

## Overview

The Website Builder supports three content types via deeplinks:
- **Pages** (regular website pages)
- **News** (news articles/blog posts)
- **Destinations** (travel destinations)

All deeplinks follow a consistent pattern with required and optional parameters.

---

## Base URL

```
https://your-builder-domain.com/
```

For development:
```
http://localhost:5173/
```

---

## Common Required Parameters

All deeplink types require these base parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `api` | Base URL of the content API | `https://yourproject.supabase.co/functions/v1` |
| `brand_id` | UUID of the brand | `550e8400-e29b-41d4-a716-446655440000` |
| `token` | JWT token with appropriate scopes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `apikey` | Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

---

## 1. PAGE Mode Deeplinks

### URL Format
```
https://builder.com/?api={API_URL}&brand_id={BRAND_ID}&token={JWT_TOKEN}&apikey={ANON_KEY}&page_id={PAGE_ID}#/mode/page
```

### Required Parameters
- All common parameters (api, brand_id, token, apikey)
- `page_id` - UUID of the page to edit

### Example
```
https://ai-websitestudio.nl/?api=https://yourproject.supabase.co/functions/v1&brand_id=550e8400-e29b-41d4-a716-446655440000&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJicmFuZF9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsInN1YiI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInNjb3BlIjpbInBhZ2VzOnJlYWQiLCJwYWdlczp3cml0ZSJdLCJpYXQiOjE3MDcwMDAwMDAsImV4cCI6MTcwNzA4NjQwMH0.example&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_anon_key&page_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890#/mode/page
```

### API Endpoints Used
- **Load**: `GET {api}/pages-api?page_id={page_id}` with `Authorization: Bearer {token}`
- **Save Draft**: `POST {api}/pages-api/saveDraft` with body:
  ```json
  {
    "brand_id": "...",
    "page_id": "...",
    "title": "Page Title",
    "slug": "page-slug",
    "content_json": { "html": "...", "css": "...", "components": [...] }
  }
  ```
- **Publish**: `POST {api}/pages-api/publish` with body:
  ```json
  {
    "brand_id": "...",
    "page_id": "...",
    "title": "Page Title",
    "slug": "page-slug",
    "content_json": { "html": "...", "css": "...", "components": [...] }
  }
  ```

---

## 2. NEWS Mode Deeplinks

### URL Format
```
https://builder.com/?api={API_URL}&brand_id={BRAND_ID}&token={JWT_TOKEN}&apikey={ANON_KEY}&content_type=news_items&news_slug={SLUG}#/mode/news
```

OR using `slug` parameter:
```
https://builder.com/?api={API_URL}&brand_id={BRAND_ID}&token={JWT_TOKEN}&apikey={ANON_KEY}&content_type=news_items&slug={SLUG}#/mode/news
```

### Required Parameters
- All common parameters (api, brand_id, token, apikey)
- `content_type` - MUST be `news_items`
- `news_slug` OR `slug` - The slug identifier for the news article (NOT page_id)

### Example
```
https://ai-websitestudio.nl/?api=https://yourproject.supabase.co/functions/v1&brand_id=550e8400-e29b-41d4-a716-446655440000&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJicmFuZF9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsInN1YiI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInNjb3BlIjpbImNvbnRlbnQ6d3JpdGUiXSwiaWF0IjoxNzA3MDAwMDAwLCJleHAiOjE3MDcwODY0MDB9.example&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_anon_key&content_type=news_items&news_slug=breaking-news-article#/mode/news
```

### API Endpoints Used
- **Load**: `GET {api}/content-api/news_items/load?brand_id={brand_id}&slug={news_slug}`
- **Save**: `POST {api}/content-api/news_items/save` with body:
  ```json
  {
    "brand_id": "...",
    "title": "Article Title",
    "slug": "article-slug",
    "content": { "html": "...", "css": "...", "components": [...] },
    "author_type": "brand",
    "author_id": "user-id",
    "status": "draft"
  }
  ```

---

## 3. DESTINATION Mode Deeplinks

### URL Format
```
https://builder.com/?api={API_URL}&brand_id={BRAND_ID}&token={JWT_TOKEN}&apikey={ANON_KEY}&content_type=destinations&slug={SLUG}#/mode/destination
```

### Required Parameters
- All common parameters (api, brand_id, token, apikey)
- `content_type` - MUST be `destinations`
- `slug` - The slug identifier for the destination

### Example
```
https://ai-travelstudio.nl/?api=https://yourproject.supabase.co/functions/v1&brand_id=550e8400-e29b-41d4-a716-446655440000&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJicmFuZF9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsInN1YiI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiIsInNjb3BlIjpbImNvbnRlbnQ6d3JpdGUiXSwiaWF0IjoxNzA3MDAwMDAwLCJleHAiOjE3MDcwODY0MDB9.example&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example_anon_key&content_type=destinations&slug=tokyo-japan#/mode/destination
```

### API Endpoints Used
- **Load**: `GET {api}/content-api/destinations/load?brand_id={brand_id}&slug={slug}`
- **Save**: `POST {api}/content-api/destinations/save` with body:
  ```json
  {
    "brand_id": "...",
    "title": "Destination Name",
    "slug": "destination-slug",
    "content": { "html": "...", "css": "...", "components": [...] },
    "status": "draft"
  }
  ```

---

## JWT Token Requirements

### Token Generation
Tokens are generated via the `generate-builder-jwt` edge function:

```
POST https://yourproject.supabase.co/functions/v1/generate-builder-jwt
Authorization: Bearer {supabase_user_token}
```

### Token Payload Structure
```json
{
  "brand_id": "550e8400-e29b-41d4-a716-446655440000",
  "sub": "user-uuid",
  "scope": ["pages:read", "pages:write", "content:write"],
  "iat": 1707000000,
  "exp": 1707086400
}
```

### Required Scopes by Content Type

| Content Type | Required Scopes |
|-------------|-----------------|
| Pages | `pages:read`, `pages:write` |
| News | `content:write` |
| Destinations | `content:write` |

---

## Mode Hash Parameter

The hash parameter `#/mode/{type}` is **required** and tells the builder which mode to operate in:

- `#/mode/page` - Page editing mode
- `#/mode/news` - News article editing mode
- `#/mode/destination` - Destination editing mode

This prevents the "slug thingy" confusion and ensures the builder knows exactly what type of content it's editing.

---

## Safe Mode

To disable remote sync and run in local-only mode, add:
```
?safe=1
```

This disables all remote API calls and keeps all saves local only.

---

## Diagnostics

When required parameters are missing, the builder will:
1. Continue to operate in local-only mode
2. Show a diagnostic banner explaining missing parameters
3. Never block the UI or freeze

Missing parameters are logged to the console.

---

## Testing Checklist

### Page Mode
- [ ] Load existing page via `page_id`
- [ ] Save draft
- [ ] Publish page
- [ ] Verify content syncs to database

### News Mode
- [ ] Load existing news article via `news_slug`
- [ ] Save draft
- [ ] Verify content syncs to `news_items` table
- [ ] Confirm no `page_id` in URL

### Destination Mode
- [ ] Load existing destination via `slug`
- [ ] Save draft
- [ ] Verify content syncs to `destinations` table

### Error Cases
- [ ] Missing parameters show diagnostic banner
- [ ] Local save always works
- [ ] No JSON parse errors
- [ ] No UI freezes

---

## Example Integration Code

### React/TypeScript Example
```typescript
const generateDeeplinkURL = (
  mode: 'page' | 'news' | 'destination',
  brandId: string,
  token: string,
  identifier: string // page_id, news_slug, or slug
): string => {
  const base = 'https://ai-websitestudio.nl/';
  const api = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
  const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const params = new URLSearchParams({
    api,
    brand_id: brandId,
    token,
    apikey
  });

  if (mode === 'page') {
    params.append('page_id', identifier);
  } else if (mode === 'news') {
    params.append('content_type', 'news_items');
    params.append('news_slug', identifier);
  } else if (mode === 'destination') {
    params.append('content_type', 'destinations');
    params.append('slug', identifier);
  }

  return `${base}?${params.toString()}#/mode/${mode}`;
};

// Usage
const pageURL = generateDeeplinkURL('page', brandId, token, pageId);
const newsURL = generateDeeplinkURL('news', brandId, token, newsSlug);
const destURL = generateDeeplinkURL('destination', brandId, token, slug);
```

---

## Summary Table

| Mode | content_type | Identifier Param | Hash |
|------|--------------|------------------|------|
| Page | (none) | `page_id` | `#/mode/page` |
| News | `news_items` | `news_slug` or `slug` | `#/mode/news` |
| Destination | `destinations` | `slug` | `#/mode/destination` |

---

## Contact

For issues or questions about deeplink integration, check the builder's console logs or contact the development team.

Last updated: 2025-10-10
