# Travel Compositor Sync Setup

## 🎯 Overzicht

De `sync-from-builder` edge function is speciaal gemaakt voor het opslaan van reizen vanuit de Travel Compositor builder naar BOLT.

## ✅ Wat is er gemaakt

### 1. Nieuwe Edge Function: `sync-from-builder`

**Locatie:** `supabase/functions/sync-from-builder/index.ts`

**Functionaliteit:**
- ✅ Volledig CORS support voor `https://www.ai-websitestudio.nl`
- ✅ Builder JWT authenticatie (geen normale Supabase auth nodig!)
- ✅ POST: Reis opslaan/updaten in trips tabel
- ✅ GET: Reis ophalen op basis van trip_id
- ✅ Automatische trip_brand_assignments aanmaken

**CORS Headers:**
```typescript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
}
```

## 🚀 Deployment

### Deploy de edge function:

```bash
# Navigeer naar project directory
cd /tmp/cc-agent/57777034/project

# Deploy specifieke function
supabase functions deploy sync-from-builder

# Of deploy alle functions tegelijk
cd supabase/functions
for func in */; do
  supabase functions deploy "${func%/}"
done
```

## 📡 API Endpoints

### Endpoint URL:
```
POST https://[your-project].supabase.co/functions/v1/sync-from-builder
GET  https://[your-project].supabase.co/functions/v1/sync-from-builder?trip_id={id}
```

### Authenticatie:
Gebruik de **Builder JWT token** (niet de normale Supabase auth token!):

```javascript
const response = await fetch(`${apiUrl}/functions/v1/sync-from-builder`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${builderJWT}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    trip_id: 'uuid-here',
    title: 'Amazing Trip',
    description: 'Description here',
    destinations: ['Paris', 'Rome'],
    duration_days: 7,
    price_from: 1500,
    images: ['url1', 'url2'],
    tags: ['culture', 'food'],
    gpt_instructions: 'Optional GPT instructions',
    is_featured: false,
    featured_priority: null
  })
});
```

## 🔐 Authenticatie Flow

### 1. Builder JWT verkrijgen:

```javascript
// In BOLT dashboard
const response = await fetch(`${supabaseUrl}/functions/v1/generate-builder-jwt`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    scopes: ['trips:read', 'trips:write'],
    brand_id: 'your-brand-id',
    forceBrandId: true
  })
});

const { token: builderJWT } = await response.json();
```

### 2. Builder JWT gebruiken in Travel Compositor:

```javascript
// De builder ontvangt de JWT via URL params:
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const apiUrl = urlParams.get('api');
const brandId = urlParams.get('brand_id');

// Gebruik deze voor sync calls
```

## 📝 Request/Response Voorbeelden

### POST - Nieuwe reis aanmaken:

**Request:**
```json
{
  "trip_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Parijs & Rome Adventure",
  "description": "Een geweldige reis door twee iconische steden",
  "destinations": ["Paris, France", "Rome, Italy"],
  "duration_days": 7,
  "price_from": 1899,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "tags": ["culture", "food", "romance"],
  "gpt_instructions": "Focus op food experiences",
  "is_featured": true,
  "featured_priority": 10
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Parijs & Rome Adventure",
    "description": "Een geweldige reis door twee iconische steden",
    "destinations": ["Paris, France", "Rome, Italy"],
    "duration_days": 7,
    "price_from": 1899,
    "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    "tags": ["culture", "food", "romance"],
    "gpt_instructions": "Focus op food experiences",
    "is_featured": true,
    "featured_priority": 10,
    "created_at": "2025-11-11T12:00:00Z",
    "updated_at": "2025-11-11T12:00:00Z"
  },
  "message": "Trip created successfully"
}
```

### PUT - Bestaande reis updaten:

**Request:** (Dezelfde structuur als POST)

**Response (200 OK):**
```json
{
  "success": true,
  "trip": { /* updated trip data */ },
  "message": "Trip updated successfully"
}
```

### GET - Reis ophalen:

**Request:**
```
GET /functions/v1/sync-from-builder?trip_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {builderJWT}
```

**Response (200 OK):**
```json
{
  "trip": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Parijs & Rome Adventure",
    /* ... rest of trip data ... */
  }
}
```

## ⚠️ Error Responses

### 401 Unauthorized:
```json
{
  "error": "Missing Authorization header"
}
// of
{
  "error": "Invalid or expired token"
}
```

### 400 Bad Request:
```json
{
  "error": "trip_id is required"
}
```

### 404 Not Found:
```json
{
  "error": "Trip not found or not accessible"
}
```

### 500 Internal Server Error:
```json
{
  "error": "Internal server error",
  "details": "Detailed error message"
}
```

## 🔧 Integration in Travel Compositor

### JavaScript SDK Example:

```javascript
class TravelCompositorSync {
  constructor(apiUrl, token, brandId) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.brandId = brandId;
  }

  async saveTrip(tripData) {
    try {
      const response = await fetch(`${this.apiUrl}/functions/v1/sync-from-builder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save trip');
      }

      return await response.json();
    } catch (error) {
      console.error('[TravelCompositorSync] Save error:', error);
      throw error;
    }
  }

  async loadTrip(tripId) {
    try {
      const response = await fetch(
        `${this.apiUrl}/functions/v1/sync-from-builder?trip_id=${tripId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load trip');
      }

      return await response.json();
    } catch (error) {
      console.error('[TravelCompositorSync] Load error:', error);
      throw error;
    }
  }
}

// Usage in Travel Compositor:
const urlParams = new URLSearchParams(window.location.search);
const sync = new TravelCompositorSync(
  urlParams.get('api'),
  urlParams.get('token'),
  urlParams.get('brand_id')
);

// Auto-save na import
async function onTripImported(tripData) {
  try {
    const result = await sync.saveTrip(tripData);
    console.log('Trip saved:', result);
    showNotification('Reis succesvol opgeslagen in BOLT!');
  } catch (error) {
    console.error('Save failed:', error);
    showError('Kon reis niet opslaan: ' + error.message);
  }
}
```

## 🧪 Testing

### Test CORS Preflight:

```bash
curl -X OPTIONS \
  https://your-project.supabase.co/functions/v1/sync-from-builder \
  -H "Origin: https://www.ai-websitestudio.nl" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type" \
  -v

# Expected response:
# HTTP/2 200
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
# Access-Control-Max-Age: 86400
```

### Test POST Request:

```bash
# First get a builder JWT (via generate-builder-jwt endpoint)
BUILDER_JWT="your-jwt-here"

curl -X POST \
  https://your-project.supabase.co/functions/v1/sync-from-builder \
  -H "Authorization: Bearer $BUILDER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Test Trip",
    "description": "Test description",
    "destinations": ["Amsterdam"],
    "duration_days": 3
  }'
```

### Test in Browser Console:

```javascript
// In Travel Compositor builder
const tripData = {
  trip_id: crypto.randomUUID(),
  title: 'Test Trip from Compositor',
  description: 'Testing the sync endpoint',
  destinations: ['Amsterdam', 'Rotterdam'],
  duration_days: 5,
  price_from: 999
};

const response = await fetch(`${apiUrl}/functions/v1/sync-from-builder`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(tripData)
});

const result = await response.json();
console.log(result);
// Expected: { success: true, trip: {...}, message: "Trip created successfully" }
```

## 📊 Database Schema

### Trips Table:

De functie schrijft naar deze velden:
- `id` (UUID) - Primary key
- `title` (TEXT) - Reis titel
- `description` (TEXT) - Reis beschrijving
- `destinations` (TEXT[]) - Array van bestemmingen
- `duration_days` (INTEGER) - Duur in dagen
- `price_from` (DECIMAL) - Vanaf prijs
- `images` (TEXT[]) - Array van image URLs
- `tags` (TEXT[]) - Array van tags
- `gpt_instructions` (TEXT) - GPT instructies
- `is_featured` (BOOLEAN) - Featured status
- `featured_priority` (INTEGER) - Priority voor featured trips
- `created_at` (TIMESTAMPTZ) - Aanmaak datum
- `updated_at` (TIMESTAMPTZ) - Update datum

### Trip Brand Assignments:

Automatisch aangemaakt/geupdatet:
- `trip_id` (UUID) - Foreign key naar trips
- `brand_id` (UUID) - Foreign key naar brands
- `is_published` (BOOLEAN) - Default: false
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## 🔒 Security

### Row Level Security (RLS):

De function gebruikt de **SERVICE_ROLE_KEY** om RLS te bypassen, maar controleert:
1. ✅ Builder JWT is geldig
2. ✅ JWT bevat brand_id
3. ✅ Reis wordt gekoppeld aan juiste brand via assignments

### Token Scopes:

Niet nodig! De sync-from-builder functie kijkt alleen naar:
- `brand_id` in JWT payload
- `sub` (user_id) in JWT payload

## 🐛 Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Oorzaak:** Function nog niet gedeployed of verkeerde origin

**Oplossing:**
1. Deploy function: `supabase functions deploy sync-from-builder`
2. Wacht 1-2 minuten voor propagatie
3. Hard refresh browser (Ctrl+F5)

### 401 Error: "Invalid or expired token"

**Oorzaak:** Builder JWT is verlopen of incorrect

**Oplossing:**
1. Genereer nieuwe JWT via `generate-builder-jwt`
2. Check of JWT_SECRET correct is in Supabase secrets
3. Check of token niet verlopen is (24h geldig)

### 401 Error via trips-api

**Oorzaak:** trips-api verwacht Supabase auth token, niet Builder JWT

**Oplossing:** Gebruik `sync-from-builder` in plaats van `trips-api` voor builder operations!

### Trip wordt aangemaakt maar niet zichtbaar in dashboard

**Oorzaak:** `trip_brand_assignments` heeft `is_published: false`

**Oplossing:** Dit is correct! Brand moet trip eerst goedkeuren in TripApproval component.

### Database Error: "violates foreign key constraint"

**Oorzaak:** Brand ID bestaat niet in brands tabel

**Oplossing:** Check of `brand_id` in JWT klopt en bestaat in database

## 📈 Monitoring

### Edge Function Logs:

```bash
# View logs in Supabase Dashboard
# Project → Edge Functions → sync-from-builder → Logs

# Of via CLI:
supabase functions logs sync-from-builder --follow
```

### Key Log Messages:

```
[sync-from-builder] Request received: { method, origin }
[sync-from-builder] Token verified: { brand_id, user_id, scope }
[sync-from-builder] Saving trip from builder: { brand_id, trip_data_keys }
[sync-from-builder] Updating existing trip: {trip_id}
[sync-from-builder] Creating new trip: {trip_id}
```

## 🔄 Return Flow

Na het opslaan kan de builder terugkeren naar BOLT:

```javascript
// In Travel Compositor na succesvol opslaan:
const returnUrl = urlParams.get('return_url');
if (returnUrl) {
  // Redirect terug naar BOLT
  window.location.href = returnUrl;
}
```

**Return URL Format:**
```
https://your-bolt-instance.com/trips?saved=true&trip_id={trip_id}
```

## ✨ Features

### Auto-Save Support:

```javascript
// Debounced auto-save tijdens editing
let autoSaveTimeout;

function onTripDataChanged(tripData) {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      await sync.saveTrip(tripData);
      showNotification('Auto-saved', { type: 'success', duration: 1000 });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 2000); // 2 seconden debounce
}
```

### Conflict Resolution:

Als trip al bestaat wordt deze geupdatet (niet overschreven):

```javascript
// De API checkt automatisch op bestaande trips en doet:
// - INSERT als nieuwe trip
// - UPDATE als bestaande trip
// Geen handmatige conflict handling nodig!
```

## 📚 Related Documentation

- [SUPABASE_CORS_SETUP.md](./SUPABASE_CORS_SETUP.md) - CORS troubleshooting
- [TRIPS_FEATURED_GUIDE.md](./TRIPS_FEATURED_GUIDE.md) - Featured trips functionaliteit
- Builder JWT generation in `generate-builder-jwt` function
- Trip approval flow in TripApproval component

---

## 🎉 Klaar!

De sync-from-builder endpoint is nu klaar voor gebruik. Deploy de function en test de integratie!

**Deployment command:**
```bash
supabase functions deploy sync-from-builder
```

**Test URL:**
```
https://your-project.supabase.co/functions/v1/sync-from-builder
```

Succes met de Travel Compositor integratie! 🚀
