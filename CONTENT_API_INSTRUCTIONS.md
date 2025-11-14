# Content API Instructies voor Website Builder

Deze API endpoint kan content ontvangen voor nieuwsberichten, bestemmingen en reizen vanuit de Website Builder.

## Base URL
```
{VITE_SUPABASE_URL}/functions/v1/content-api
```

## Authenticatie
Alle requests vereisen een Bearer token in de Authorization header:
```
Authorization: Bearer {JWT_TOKEN}
```

De JWT token moet worden gegenereerd met de `generate-builder-jwt` functie en moet de volgende claims bevatten:
- `brand_id`: Het ID van het brand
- `scope`: Array met permissies (bijv. `['content:write']`)

## Content Types
De API ondersteunt drie content types:
- `news_items` - Nieuwsberichten
- `destinations` - Bestemmingen
- `trips` - Reizen

Het content type wordt bepaald via de `type` query parameter.

---

## Endpoints

### 1. Content Opslaan (Create/Update)

**POST** `/content-api/save?type={content_type}`

Slaat nieuwe content op of update bestaande content.

**Body Parameters:**
```json
{
  "brand_id": "uuid",
  "id": "uuid",              // Optioneel - voor updates
  "title": "string",         // Verplicht
  "slug": "string",          // Verplicht
  "content": {},             // JSONB object met HTML/content
  "excerpt": "string",       // Optioneel - korte beschrijving
  "featured_image": "url",   // Optioneel
  "status": "draft",         // Optioneel (draft of published)

  // Voor news_items (VERPLICHT):
  "author_type": "string",   // Verplicht voor news_items: "admin", "brand", of "agent"
  "author_id": "uuid",       // Verplicht voor news_items: ID van de auteur

  // Voor destinations:
  "description": "string",
  "country": "string",
  "region": "string",
  "gallery": ["url1", "url2"],

  // Voor trips:
  "description": "string",
  "destination_id": "uuid",  // Optioneel - link naar destination
  "price": 999.99,
  "duration_days": 7,
  "departure_dates": ["2024-01-01", "2024-02-01"],
  "gallery": ["url1", "url2"]
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid",
  "slug": "content-slug",
  "message": "Content saved successfully"
}
```

---

### 2. Content Publiceren

**POST** `/content-api/publish?type={content_type}`

Publiceert content (status wordt 'published').

**Body Parameters:**
```json
{
  "brand_id": "uuid",
  "id": "uuid",        // Of gebruik slug
  "slug": "string"     // Als id niet beschikbaar
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid",
  "slug": "content-slug",
  "status": "published",
  "message": "Content published successfully"
}
```

---

### 3. Content Lijst Ophalen

**GET** `/content-api/list?type={content_type}&brand_id={uuid}&status={status}`

Haalt lijst van content op voor een brand.

**Query Parameters:**
- `type`: Content type (news_items, destinations, trips) - **Verplicht**
- `brand_id`: Brand UUID - **Verplicht**
- `status`: Filter op status (draft, published) - Optioneel

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "brand_id": "uuid",
      "title": "string",
      "slug": "string",
      "content": {},
      "status": "published",
      "published_at": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z",
      ...
    }
  ]
}
```

---

### 4. Specifieke Content Ophalen

**GET** `/content-api/{id}?type={content_type}`

Of:

**GET** `/content-api?type={content_type}&brand_id={uuid}&slug={slug}`

Haalt één specifiek content item op.

**Response:**
```json
{
  "item": {
    "id": "uuid",
    "brand_id": "uuid",
    "title": "string",
    "slug": "string",
    "content": {},
    "status": "published",
    ...
  }
}
```

---

### 5. Content Verwijderen

**DELETE** `/content-api/{id}?type={content_type}`

Verwijdert een content item.

**Response:**
```json
{
  "success": true,
  "message": "Content deleted successfully"
}
```

---

## Voorbeelden

### Nieuwsbericht opslaan vanuit Website Builder

```javascript
const apiUrl = `${apiBaseUrl}/functions/v1/content-api/save?type=news_items`;

// BELANGRIJK: Voor news_items zijn author_type en author_id VERPLICHT
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    brand_id: brandId,
    title: 'Nieuwe Vakantiebestemming',
    slug: 'nieuwe-vakantiebestemming',
    content: {
      html: '<div>...</div>',
      blocks: [...]
    },
    excerpt: 'Ontdek onze nieuwste bestemming',
    featured_image: 'https://example.com/image.jpg',
    status: 'draft',
    author_type: 'brand',  // VERPLICHT: 'admin', 'brand', of 'agent'
    author_id: userId       // VERPLICHT: ID van de auteur
  })
});

const result = await response.json();
console.log(result.id, result.slug);
```

### Bestemming opslaan

```javascript
const apiUrl = `${apiBaseUrl}/functions/v1/content-api/save?type=destinations`;

await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    brand_id: brandId,
    title: 'Bali',
    slug: 'bali',
    content: { html: '<div>...</div>' },
    description: 'Tropisch paradijs',
    country: 'Indonesië',
    region: 'Zuid-Oost Azië',
    featured_image: 'https://example.com/bali.jpg',
    gallery: ['img1.jpg', 'img2.jpg'],
    status: 'draft'
  })
});
```

### Reis opslaan

```javascript
const apiUrl = `${apiBaseUrl}/functions/v1/content-api/save?type=trips`;

await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    brand_id: brandId,
    title: '7 Dagen Bali',
    slug: '7-dagen-bali',
    content: { html: '<div>...</div>' },
    description: 'Een week lang genieten op Bali',
    destination_id: 'destination-uuid',
    price: 1499.99,
    duration_days: 7,
    departure_dates: ['2024-06-01', '2024-07-01'],
    featured_image: 'https://example.com/trip.jpg',
    gallery: ['img1.jpg', 'img2.jpg'],
    status: 'draft'
  })
});
```

---

## Error Responses

Alle errors retourneren een JSON object met een `error` veld:

```json
{
  "error": "Error message",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (ontbrekende of ongeldige parameters)
- `403` - Unauthorized (geen toegang tot dit brand)
- `404` - Not Found (content bestaat niet)
- `500` - Internal Server Error

---

## Belangrijke Opmerkingen

1. **Slugs moeten uniek zijn** per brand voor elk content type
2. **Content field** kan elk JSONB object bevatten (HTML, blocks, etc.)
3. **Status** is standaard "draft" bij nieuwe items
4. **Timestamps** worden automatisch gegenereerd
5. **JWT Token** moet altijd de juiste brand_id bevatten
6. **CORS** is enabled voor alle origins (*)
7. **VERPLICHT voor news_items**: De velden `author_type` en `author_id` MOETEN worden meegestuurd bij het opslaan van nieuwsberichten. Deze worden automatisch doorgegeven in de URL parameters wanneer de builder wordt geopend (bijv. `&author_type=brand&author_id=xxx`). De builder MOET deze parameters uit de URL halen en meesturen in de POST request.

---

## Database Schema

### news_items
- id, brand_id, title, slug, content, excerpt, featured_image, status, published_at, created_at, updated_at
- **author_type** (text) - 'admin', 'brand', of 'agent' - **VERPLICHT**
- **author_id** (uuid) - ID van de auteur - **VERPLICHT**
- is_mandatory (boolean) - Of dit nieuws verplicht is voor brands
- enabled_for_brands (boolean) - Of dit nieuws beschikbaar is voor custom brands
- enabled_for_franchise (boolean) - Of dit nieuws beschikbaar is voor franchise brands

### destinations
- id, brand_id, title, slug, content, description, country, region, featured_image, gallery, status, published_at, created_at, updated_at

### trips
- id, brand_id, title, slug, content, description, destination_id, price, duration_days, departure_dates, featured_image, gallery, status, published_at, created_at, updated_at
