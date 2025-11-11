# Supabase CORS Setup Guide

## 🔴 Probleem

De website krijgt CORS errors bij het aanroepen van:
1. Edge Functions (bijv. `/functions/v1/trips-api`)
2. REST API endpoints (bijv. `/rest/v1/trip_brand_assignments`)

```
Response to preflight request doesn't pass access control check
```

---

## ✅ Oplossing

### 1️⃣ Edge Functions CORS (Gedaan!)

Alle edge functions zijn al geüpdatet met de juiste CORS headers:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Belangrijk:** Headers moeten **lowercase** zijn!
- ✅ `authorization, x-client-info, apikey, content-type`
- ❌ `Authorization, X-Client-Info, Apikey, Content-Type`

---

### 2️⃣ REST API CORS (Supabase Dashboard)

De REST API (`/rest/v1/*`) endpoints hebben CORS instellingen die via Supabase Dashboard geconfigureerd worden.

#### Stappen in Supabase Dashboard:

1. **Ga naar je Supabase Project**
   - Open: https://supabase.com/dashboard
   - Selecteer je project

2. **Ga naar Settings → API**
   - In de linker sidebar: Settings → API
   - Scroll naar beneden naar "CORS Configuration"

3. **Voeg Allowed Origins toe**

   Voeg deze origins toe (één per regel):
   ```
   https://www.ai-websitestudio.nl
   https://ai-websitestudio.nl
   https://www.ai-travelstudio.nl
   https://ai-travelstudio.nl
   http://localhost:5173
   http://localhost:3000
   *
   ```

4. **Custom CORS Headers (indien beschikbaar)**

   Sommige Supabase plans hebben advanced CORS settings:
   - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
   - `Access-Control-Max-Age: 86400`

5. **Sla op en wacht 1-2 minuten**
   - CORS changes kunnen even duren om te propageren

---

### 3️⃣ Alternatief: PostgREST Config (Geavanceerd)

Als je directe toegang hebt tot PostgREST configuratie:

```conf
# postgrest.conf
db-uri = "postgres://..."
db-schema = "public"
db-anon-role = "anon"

# CORS settings
server-cors-allowed-origins = "*"
```

**Let op:** Dit is alleen mogelijk bij self-hosted Supabase.

---

## 🧪 Testen

### Test Edge Function CORS

```bash
# Preflight request
curl -X OPTIONS https://your-project.supabase.co/functions/v1/trips-api \
  -H "Origin: https://www.ai-websitestudio.nl" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization, content-type" \
  -v

# Check response headers:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

### Test REST API CORS

```bash
# Preflight request
curl -X OPTIONS https://your-project.supabase.co/rest/v1/trip_brand_assignments \
  -H "Origin: https://www.ai-websitestudio.nl" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization, apikey" \
  -v

# Check response headers:
# Access-Control-Allow-Origin: https://www.ai-websitestudio.nl (of *)
```

### Test vanuit Website

```javascript
// In browser console
fetch('https://your-project.supabase.co/functions/v1/trips-api?for_builder=true', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);

// Als CORS werkt, zie je de trips data
// Als CORS niet werkt, zie je: "CORS policy: No 'Access-Control-Allow-Origin' header"
```

---

## 🔧 Troubleshooting

### Error: "No 'Access-Control-Allow-Origin' header"

**Mogelijke oorzaken:**
1. Edge function niet opnieuw gedeployed na CORS fix
2. REST API origins niet geconfigureerd in Supabase Dashboard
3. Browser cache toont oude CORS errors

**Oplossingen:**
1. Redeploy alle edge functions via Supabase CLI
2. Check Supabase Dashboard → Settings → API → CORS
3. Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)

### Error: "Request header field X is not allowed"

Dit betekent dat een header niet in `Access-Control-Allow-Headers` staat.

**Check deze headers:**
- ✅ `authorization` (lowercase!)
- ✅ `x-client-info` (lowercase!)
- ✅ `apikey` (lowercase!)
- ✅ `content-type` (lowercase!)

**Hoofdletters in headers veroorzaken CORS errors!**

### Error: "Method DELETE is not allowed by CORS"

De method staat niet in `Access-Control-Allow-Methods`.

**Zorg dat deze methods zijn toegestaan:**
```
GET, POST, PUT, DELETE, OPTIONS, PATCH
```

### Browser Console Shows CORS Error but curl Works

Dit is normaal! Browsers hebben strengere CORS checks dan curl.

**Test in browser:**
1. Open Developer Tools → Network tab
2. Filter op "Fetch/XHR"
3. Check of preflight OPTIONS request succesvol is (status 200)
4. Check response headers van OPTIONS request

---

## 📋 Checklist

Gebruik deze checklist om CORS volledig te fixen:

### Edge Functions
- [x] Alle edge functions hebben lowercase headers
- [x] OPTIONS method handler is aanwezig
- [x] corsHeaders worden teruggegeven bij OPTIONS
- [x] corsHeaders worden teruggegeven bij alle responses
- [ ] Edge functions zijn opnieuw gedeployed

### REST API
- [ ] Allowed origins zijn toegevoegd in Supabase Dashboard
- [ ] Wildcard `*` is toegevoegd (indien gewenst)
- [ ] CORS settings zijn opgeslagen
- [ ] 1-2 minuten gewacht voor propagatie

### Testing
- [ ] OPTIONS preflight request werkt
- [ ] GET request vanuit browser werkt
- [ ] POST request vanuit browser werkt
- [ ] Geen CORS errors in browser console

---

## 🚀 Quick Fix Commands

```bash
# 1. Verify all edge functions have correct CORS
cd supabase/functions
grep -r "Access-Control-Allow-Headers" */index.ts

# Should show: "authorization, x-client-info, apikey, content-type" (lowercase!)

# 2. Redeploy specific function
supabase functions deploy trips-api

# 3. Redeploy all functions
for func in */; do
  supabase functions deploy "${func%/}"
done
```

---

## 🔗 Referenties

- [Supabase CORS Documentation](https://supabase.com/docs/guides/api/cors)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Edge Functions CORS Guide](https://supabase.com/docs/guides/functions/cors)

---

## ⚠️ Security Notes

### Production Settings

Voor productie websites, gebruik **specifieke origins** in plaats van `*`:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": req.headers.get("Origin") || "https://www.ai-websitestudio.nl",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### Credentials

Als je cookies/credentials gebruikt:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": req.headers.get("Origin"), // Niet "*"!
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Let op:** Met credentials mag origin NIET `*` zijn!

---

## 📝 Changelog

- **2025-11-11**: Alle edge functions geüpdatet naar lowercase headers
- **2025-11-11**: content-api CORS function geüpdatet
- **2025-11-11**: trips-api CORS headers gefixed
