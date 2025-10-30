# Template Builder Troubleshooting Guide

## Problem: Templates niet laden in Builder (lege array)

### Symptomen
- Template lijst laadt wel in Admin → Templates
- Bij klikken op edit-knop opent builder
- Builder blijft leeg / laadt geen content
- Network tab toont `pages-api` request met lege array `[]` response

### Root Cause
De `pages-api` edge function verwacht de `page_id` in het **URL path** maar de builder stuurt het als **query parameter**.

**Verwacht:** `/functions/v1/pages-api/e7b67c06-f6a5-4eca-b598-96a5f0b58988`
**Werkelijk:** `/functions/v1/pages-api?page_id=e7b67c06-f6a5-4eca-b598-96a5f0b58988`

### Oplossing

Edit `/supabase/functions/pages-api/index.ts`:

```typescript
// VOOR (line ~408):
if (req.method === "GET") {
  const pageIdFromPath = pathParts[pathParts.length - 1];
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageIdFromPath);

  if (isUUID && pageIdFromPath) {
    const { data: page } = await supabase
      .from("pages")
      .select("*")
      .eq("id", pageIdFromPath)
      .maybeSingle();

// NA:
if (req.method === "GET") {
  const pageIdFromQuery = url.searchParams.get('page_id');
  const pageIdFromPath = pathParts[pathParts.length - 1];
  const pageId = pageIdFromQuery || pageIdFromPath;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);

  if (isUUID && pageId) {
    const { data: page } = await supabase
      .from("pages")
      .select("*")
      .eq("id", pageId)
      .maybeSingle();
```

### Deploy

Deploy de functie opnieuw via Supabase CLI of gebruik het deploy tool.

### Verificatie

1. Ga naar Admin → Templates
2. Klik op edit-knop bij een template
3. Open DevTools → Network tab
4. Zoek `pages-api` request
5. Response moet een **object** zijn met `html` property, niet een lege array

---

## Problem: Builder krijgt data maar kan het niet lezen

### Symptomen
- API geeft WEL data terug (object met `id`, `title`, `html`, etc.)
- Console error: `Cannot read properties of undefined (reading 'html')`
- Builder blijft leeg

### Root Cause
Mismatch tussen property namen die de API terugstuurt en wat de builder verwacht.

**API Response:**
```json
{
  "id": "...",
  "title": "...",
  "html": {...},      // <-- content zit hier
  "brand_id": "..."
}
```

**Builder verwacht:**
```javascript
pageData.content_json  // <-- maar zoekt hier
```

### Oplossing

Check in `deeplink.js` (of de DeeplinkV2 component) hoe de data wordt gelezen:

```javascript
// ZOEK NAAR:
const content = pageData.content_json;  // ❌ Fout
const content = pageData.html;          // ✓ Correct (volgens huidige API)

// OF update de API om content_json te returnen i.p.v. html
```

**Optie 1: Fix Builder** (aanpassen wat er verwacht wordt)
**Optie 2: Fix API** (aanpassen wat er teruggegeven wordt)

### Best Practice
Voor consistentie: gebruik overal `content_json` als property naam (zowel in database, API als frontend).
