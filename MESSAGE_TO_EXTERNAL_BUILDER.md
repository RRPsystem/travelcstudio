# Bericht voor Externe Builder: Credit Systeem Integratie

---

## ⚠️ VEELVOORKOMENDE FOUT: "Request Entity Too Large"

**Als je deze fout krijgt bij video opslag:**

```
FUNCTION_PAYLOAD_TOO_LARGE
Request Entity Too Large
```

**Probleem:** Je stuurt de **video data** (meerdere MB's) naar de BOLT API.

**Oplossing:**
1. ✅ Upload video EERST naar JE EIGEN storage (R2, S3, CDN)
2. ✅ Stuur alleen de **video URL** naar BOLT (paar bytes)
3. ❌ Stuur NOOIT video data/base64/blob naar BOLT

Zie `EXTERNAL_BUILDER_CREDIT_SYSTEM.md` sectie "⚠️ KRITIEKE WAARSCHUWING" voor voorbeelden.

---

Hoi,

Bedankt voor de implementatie van de video storage billing! We hebben een centraal credit systeem opgezet in BOLT dat alle facturering afhandelt. Dit zorgt voor betere logging, atomische operaties en een audit trail.

## 🔄 Wat moet er aangepast worden?

In plaats van direct de database te updaten, moet je endpoint `/api/register-video-storage` onze edge function aanroepen.

## 📚 Documentatie

Ik heb twee documenten voor je gemaakt:

### 1. **EXTERNAL_BUILDER_CREDIT_SYSTEM.md**
Complete API specificatie met:
- ✅ Endpoint details en authenticatie
- ✅ Alle beschikbare action types en tarieven
- ✅ Error handling en response codes
- ✅ Test voorbeelden (cURL, Postman, browser)
- ✅ Best practices

### 2. **EXTERNAL_BUILDER_VIDEO_STORAGE_TEMPLATE.js**
Ready-to-use template voor je `/api/register-video-storage.js` endpoint met:
- ✅ Complete implementatie
- ✅ Error handling
- ✅ Frontend usage examples
- ✅ Testing instructies

## 🎯 Kern van de wijziging

**Oud (direct database update):**
```javascript
await supabase
  .from('brands')
  .update({ credits_remaining: credits - 100 })
  .eq('id', brandId);
```

**Nieuw (via BOLT credit systeem):**
```javascript
await fetch(`${SUPABASE_URL}/functions/v1/deduct-credits`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    actionType: 'video_storage',
    description: `Video opgeslagen: ${videoUrl}`,
    metadata: { videoUrl }
  })
});
```

## 🔧 Environment Variables

Je hebt alleen deze environment variable nodig:

```bash
SUPABASE_URL=https://fbnzwglswqgmcqvebpjq.supabase.co
```

**Geen service role key nodig!** De edge function handelt de database updates intern af.

## ✨ Voordelen

1. **Automatische logging** - Elke transactie wordt gelogd in `credit_transactions` tabel
2. **Atomische operaties** - Geen race conditions of dubbele charging
3. **Flexibel** - Tarieven kunnen centraal worden aangepast zonder code changes
4. **Audit trail** - Volledige geschiedenis per brand voor compliance
5. **Consistente error handling** - Uniforme foutmeldingen

## 🚀 Implementatie Stappen

1. ✅ Lees **EXTERNAL_BUILDER_CREDIT_SYSTEM.md** door
2. ✅ Gebruik **EXTERNAL_BUILDER_VIDEO_STORAGE_TEMPLATE.js** als basis
3. ✅ Pas je `/api/register-video-storage.js` aan
4. ✅ Update je frontend code (js/views/videoGeneratorView.js)
5. ✅ Test met de voorbeelden uit de documentatie
6. ✅ Deploy naar productie

## 📊 Beschikbare Action Types

Naast video storage kun je ook deze action types gebruiken:

| Action Type | Kosten |
|------------|--------|
| `video_storage` | €1.00 (100 credits) |
| `page_generation` | €0.50 (50 credits) |
| `image_generation` | €1.50 (150 credits) |
| `content_generation` | €0.30 (30 credits) |
| `api_call_google_places` | €0.10 (10 credits) |
| `api_call_google_routes` | €0.15 (15 credits) |
| `wordpress_sync` | €0.25 (25 credits) |
| `template_usage` | €0.20 (20 credits) |

Je kunt gewoon een ander `actionType` gebruiken in dezelfde endpoint call.

## 🧪 Testen

Eenvoudige test met cURL:

```bash
curl -X POST https://fbnzwglswqgmcqvebpjq.supabase.co/functions/v1/deduct-credits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "video_storage",
    "description": "Test video storage"
  }'
```

## ❓ Vragen?

Als er iets onduidelijk is of je loopt tegen problemen aan:
1. Check eerst de logs (Supabase Dashboard → Edge Functions → Logs)
2. Test met cURL om te isoleren waar het probleem zit
3. Neem contact op met vermelding van: brand_id, timestamp, error message

Groet!

---

**TL;DR**: Roep `${SUPABASE_URL}/functions/v1/deduct-credits` aan in plaats van direct de database te updaten. Zie de twee documentatie bestanden voor complete details en voorbeelden.
