# External Builder - Credit System Integration

**Versie:** 1.0
**Laatst bijgewerkt:** 16 december 2024

## 📋 Overzicht

Dit document beschrijft hoe externe builders het BOLT credit systeem moeten integreren. Het credit systeem zorgt voor consistente facturering van alle acties (video opslag, API calls, generaties, etc.).

### Belangrijkste voordelen:
- ✅ **Centraal beheer** - Alle tarieven worden centraal beheerd
- ✅ **Automatische logging** - Elke transactie wordt gelogd
- ✅ **Atomische operaties** - Geen race conditions of dubbele charging
- ✅ **Audit trail** - Volledige geschiedenis per brand
- ✅ **Flexibel** - Eenvoudig nieuwe action types toevoegen

---

## ⚠️ KRITIEKE WAARSCHUWING: Payload Limiet

**Edge Functions hebben een payload limiet van ~6MB!**

### Video Storage - CORRECTE FLOW:

Als je de fout **"Request Entity Too Large" of "FUNCTION_PAYLOAD_TOO_LARGE"** krijgt bij video opslag:

**✅ JUISTE AANPAK:**
1. Upload video EERST naar JE EIGEN storage (Cloudflare R2, AWS S3, je eigen CDN)
2. Stuur alleen de **video URL** (+ kleine metadata) naar BOLT
3. BOLT schrijft credits af gebaseerd op de URL

```javascript
// STAP 1: Upload naar je eigen storage
const videoFile = document.getElementById('video-upload').files[0];
const uploadResult = await uploadToYourStorage(videoFile);
// uploadResult.url = 'https://your-cdn.com/videos/abc123.mp4'

// STAP 2: Stuur alleen URL naar BOLT (klein JSON object)
const response = await fetch(`${BOLT_API_URL}/deduct-credits`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    actionType: 'video_storage',
    description: 'Video opgeslagen',
    metadata: {
      videoUrl: uploadResult.url,  // ← Alleen de URL! (paar bytes)
      fileSizeBytes: videoFile.size,
      durationSeconds: 120
    }
  })
});
```

**❌ FOUT - Veroorzaakt "PAYLOAD_TOO_LARGE" error:**
```javascript
// Stuur NOOIT de video data zelf:
body: JSON.stringify({
  actionType: 'video_storage',
  videoData: base64VideoData,      // ← Dit is meerdere MB's!
  videoBlob: videoFile,             // ← Dit is meerdere MB's!
  videoBuffer: arrayBuffer          // ← Dit is meerdere MB's!
})
```

**Waarom deze flow?**
- Edge Functions hebben een strict limiet van ~6MB request size
- Videos zijn typisch 10-500MB groot
- Je bent verantwoordelijk voor je eigen video hosting
- BOLT registreert alleen de credits voor de opslag

---

## 🔐 Authentication

Alle API calls naar het credit systeem vereisen authenticatie via één van deze methoden:

### Optie 1: JWT Token (Recommended)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Optie 2: API Key
```http
X-API-Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Opmerking:** De builder JWT tokens worden verkregen via het normale builder authentication flow (zie `EXTERNAL_BUILDER_SECURITY.md`).

---

## 🎯 Endpoint: Deduct Credits

### Base URL
```
https://jouw-supabase-project.supabase.co/functions/v1/deduct-credits
```

### HTTP Method
`POST`

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

### Request Body

```typescript
{
  actionType: string;      // Type actie (zie lijst hieronder)
  description?: string;    // Optionele beschrijving
  metadata?: object;       // Optionele extra data
}
```

#### Beschikbare Action Types

| Action Type | Kosten (credits) | Euro (€) | Beschrijving |
|------------|------------------|----------|--------------|
| `video_storage` | 100 | €1.00 | Video opslaan naar "Mijn Video's" |
| `page_generation` | 50 | €0.50 | AI pagina generatie |
| `image_generation` | 150 | €1.50 | AI afbeelding generatie |
| `content_generation` | 30 | €0.30 | AI tekst/content generatie |
| `api_call_google_places` | 10 | €0.10 | Google Places API call |
| `api_call_google_routes` | 15 | €0.15 | Google Routes API call |
| `wordpress_sync` | 25 | €0.25 | WordPress sync operatie |
| `template_usage` | 20 | €0.20 | Template gebruik (per render) |

**Opmerking:** Tarieven worden dynamisch opgehaald uit de database en kunnen worden aangepast door operators.

### Response: Success (200)

```json
{
  "success": true,
  "message": "Credits successfully deducted",
  "transaction": {
    "id": "uuid",
    "brand_id": "uuid",
    "action_type": "video_storage",
    "credits_deducted": 100,
    "credits_remaining": 4900,
    "description": "Video opgeslagen: https://example.com/video.mp4",
    "created_at": "2024-12-16T10:30:00Z"
  }
}
```

### Response: Insufficient Credits (402)

```json
{
  "error": "Insufficient credits",
  "required": 100,
  "available": 45,
  "details": "Brand has insufficient credits. Required: 100, Available: 45"
}
```

### Response: Other Errors

```json
{
  "error": "Error message here",
  "details": "Additional error details"
}
```

#### Error Codes

| Status Code | Betekenis |
|------------|-----------|
| `400` | Invalid request (missing parameters, invalid action type) |
| `401` | Unauthorized (invalid or missing JWT) |
| `402` | Payment Required (insufficient credits) |
| `404` | Brand not found |
| `500` | Internal server error |

---

## 💡 Implementatie Voorbeelden

### Voorbeeld 1: Video Storage

```javascript
// api/register-video-storage.js (jouw Vercel endpoint)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandId, videoUrl } = req.body;

  if (!brandId || !videoUrl) {
    return res.status(400).json({
      error: 'brandId and videoUrl are required'
    });
  }

  // Get auth token from request
  const authToken = req.headers.authorization?.replace('Bearer ', '') ||
                   req.headers['x-api-key'];

  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Call BOLT credit system
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/deduct-credits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'video_storage',
          description: `Video opgeslagen: ${videoUrl}`,
          metadata: {
            videoUrl: videoUrl,
            timestamp: new Date().toISOString()
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();

      // Handle insufficient credits specifically
      if (response.status === 402) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          required: errorData.required,
          available: errorData.available
        });
      }

      return res.status(response.status).json({
        success: false,
        error: errorData.error || 'Failed to deduct credits'
      });
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      costCredits: result.transaction.credits_deducted,
      creditsRemaining: result.transaction.credits_remaining,
      videoUrl: videoUrl,
      transactionId: result.transaction.id
    });

  } catch (error) {
    console.error('Error in video storage billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### Voorbeeld 2: Frontend Integration

```javascript
// js/views/videoGeneratorView.js
async function saveToMyVideos(video) {
  try {
    // First, upload video (existing logic)
    const uploadResult = await uploadVideo(video);

    if (!uploadResult.success) {
      showError('Video upload failed');
      return;
    }

    // Then, register storage and deduct credits
    const billingResult = await fetch('/api/register-video-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        brandId: getCurrentBrandId(),
        videoUrl: uploadResult.video.videoUrl
      })
    });

    const billingData = await billingResult.json();

    if (!billingData.success) {
      if (billingResult.status === 402) {
        // Insufficient credits
        showWarning(
          `Video opgeslagen, maar onvoldoende credits voor facturering. ` +
          `Benodigd: ${billingData.required}, Beschikbaar: ${billingData.available}`
        );
      } else {
        showWarning(
          `Video opgeslagen, maar facturering mislukt: ${billingData.error}`
        );
      }
      return;
    }

    // Success!
    showSuccess(
      `Video opgeslagen! €${(billingData.costCredits / 100).toFixed(2)} ` +
      `(${billingData.costCredits} credits) afgeschreven. ` +
      `Resterende credits: ${billingData.creditsRemaining}`
    );

  } catch (error) {
    console.error('Error saving video:', error);
    showError('Er is een fout opgetreden bij het opslaan');
  }
}
```

### Voorbeeld 3: Template Usage

```javascript
// Wanneer een template wordt gebruikt/ge-rendered
async function recordTemplateUsage(templateId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/deduct-credits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'template_usage',
          description: `Template gebruikt: ${templateId}`,
          metadata: {
            templateId: templateId,
            renderTime: new Date().toISOString()
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Failed to deduct credits for template usage');
      // Besluit: laat template usage doorgaan of blokkeren?
    }

    const result = await response.json();
    console.log('Credits deducted:', result.transaction.credits_deducted);

  } catch (error) {
    console.error('Error recording template usage:', error);
  }
}
```

---

## 🧪 Testing

### Test met cURL

```bash
# Test video storage
curl -X POST https://jouw-project.supabase.co/functions/v1/deduct-credits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "video_storage",
    "description": "Test video storage",
    "metadata": {
      "videoUrl": "https://example.com/test-video.mp4"
    }
  }'
```

### Test met Postman

1. Maak een nieuwe POST request aan
2. URL: `https://jouw-project.supabase.co/functions/v1/deduct-credits`
3. Headers:
   - `Authorization: Bearer YOUR_JWT_TOKEN`
   - `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "actionType": "video_storage",
  "description": "Test video from Postman",
  "metadata": {
    "videoUrl": "https://example.com/video.mp4"
  }
}
```

### Test in Browser Console

```javascript
// Test credit deduction
async function testCreditSystem() {
  const response = await fetch(
    'https://jouw-project.supabase.co/functions/v1/deduct-credits',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yourJwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actionType: 'video_storage',
        description: 'Browser test',
        metadata: { test: true }
      })
    }
  );

  const data = await response.json();
  console.log('Result:', data);
}

testCreditSystem();
```

---

## 🔍 Monitoring & Debugging

### Check Brand Credit Balance

```sql
-- Via Supabase SQL Editor
SELECT
  id,
  name,
  credits_remaining,
  updated_at
FROM brands
WHERE id = 'your-brand-id';
```

### View Credit Transactions

```sql
-- Zie alle transacties van een brand
SELECT
  id,
  action_type,
  credits_deducted,
  credits_remaining,
  description,
  created_at
FROM credit_transactions
WHERE brand_id = 'your-brand-id'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Credit Prices

```sql
-- Zie huidige tarieven
SELECT
  action_type,
  credits_cost,
  euro_cost,
  description,
  is_active
FROM credit_prices
WHERE is_active = true
ORDER BY action_type;
```

---

## ⚠️ Best Practices

### 1. ❌ NEVER Direct Database Updates
```javascript
// ❌ FOUT - Niet doen!
await supabase
  .from('brands')
  .update({ credits_remaining: credits_remaining - 100 })
  .eq('id', brandId);
```

```javascript
// ✅ GOED - Gebruik altijd de edge function
await fetch(`${SUPABASE_URL}/functions/v1/deduct-credits`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ actionType: 'video_storage' })
});
```

### 2. ✅ Handle Insufficient Credits Gracefully

```javascript
if (response.status === 402) {
  // Inform user about insufficient credits
  showUpgradePrompt();
  // OR: Allow action but flag for manual billing
  // OR: Block action completely
}
```

### 3. ✅ Add Descriptive Messages

```javascript
{
  actionType: 'video_storage',
  description: `Video "${videoTitle}" (${fileSize}MB) opgeslagen`, // Goed!
  // vs
  description: 'Video saved' // Minder informatief
}
```

### 4. ✅ Include Useful Metadata

```javascript
{
  actionType: 'video_storage',
  metadata: {
    videoUrl: 'https://...',
    videoTitle: 'Summer Vacation',
    fileSizeBytes: 15728640,
    durationSeconds: 120,
    userId: 'user-id',
    timestamp: new Date().toISOString()
  }
}
```

### 5. ✅ Error Handling

```javascript
try {
  const response = await deductCredits(...);

  if (!response.ok) {
    // Log error voor debugging
    console.error('Credit deduction failed:', {
      status: response.status,
      statusText: response.statusText,
      brandId: brandId
    });

    // Toon user-friendly message
    showError('Kon credits niet afschrijven. Neem contact op met support.');
  }

} catch (error) {
  // Network error of andere exception
  console.error('Exception during credit deduction:', error);
  showError('Netwerkfout. Probeer het opnieuw.');
}
```

---

## 📊 Nieuwe Action Types Toevoegen

Als je een nieuw type actie wilt factureren:

1. **Neem contact op met BOLT operator** met:
   - Action type naam (bijv. `audio_generation`)
   - Gewenste kosten in credits
   - Beschrijving

2. **Operator voegt toe via Supabase:**
```sql
INSERT INTO credit_prices (action_type, credits_cost, euro_cost, description)
VALUES ('audio_generation', 80, 0.80, 'AI audio/voice generatie');
```

3. **Gebruik in je code:**
```javascript
await deductCredits({
  actionType: 'audio_generation',
  description: 'Audio gegenereerd met ElevenLabs'
});
```

Dat is alles! Het systeem pakt automatisch de juiste prijs op.

---

## 🆘 Support & Contact

Bij vragen of problemen:

1. **Check eerst de logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - Je eigen Vercel/server logs

2. **Test met cURL/Postman** om te isoleren waar het probleem zit

3. **Contact BOLT team:**
   - Email: [support email]
   - Include: brand_id, timestamp, error message, request body

---

## 📝 Changelog

### v1.0 (16 december 2024)
- Initiële versie
- Basis credit systeem met deduct-credits endpoint
- 8 standaard action types
- Volledige documentatie en voorbeelden

---

## ⚡ Quick Reference

```javascript
// Minimaal vereiste call
fetch(`${SUPABASE_URL}/functions/v1/deduct-credits`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    actionType: 'video_storage'
  })
});
```

**Environment Variables nodig:**
```bash
SUPABASE_URL=https://[project-ref].supabase.co
```

**Geen service role key nodig** - De edge function gebruikt intern de service role voor database updates. De builder gebruikt alleen een normale JWT token.
