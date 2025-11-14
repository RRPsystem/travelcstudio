# ⚠️ BELANGRIJKE SECURITY UPDATE VEREIST

## Probleem
De externe builder integratie werkt niet omdat `JWT_SECRET` ontbreekt in Supabase Secrets.

## Foutmelding
```
❌ Test save mislukt: {"code":401,"message":"Invalid JWT"}
```

## Oplossing

### Stap 1: Genereer een JWT Secret
Gebruik een van deze methoden om een veilige secret te genereren:

**Optie A - Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Optie B - OpenSSL:**
```bash
openssl rand -hex 32
```

**Optie C - Online Generator:**
Ga naar https://generate-secret.vercel.app/32

### Stap 2: Voeg JWT_SECRET toe aan Supabase

1. Ga naar **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecteer je project: `huaaogdxxdcakxryecnw`
3. Ga naar **Project Settings** → **Edge Functions** → **Secrets**
4. Klik op **Add new secret**
5. Naam: `JWT_SECRET`
6. Waarde: *[Plak de gegenereerde secret hier]*
7. Klik op **Save**

### Stap 3: Test de integratie
1. Ga naar **Pagina Beheer** in AI Travel Studio
2. Klik op de **"🧪 Test Save"** button
3. Als het werkt zie je: `✅ Test save succesvol! Page ID: ...`

## Wat doet JWT_SECRET?

`JWT_SECRET` wordt gebruikt om:
- JWT tokens te ondertekenen voor de externe builder (ai-websitestudio.nl)
- Tokens te verifiëren bij het opslaan van pagina's, menu's en content
- Veilige communicatie tussen AI Travel Studio en de externe builder te waarborgen

## Beveiliging

⚠️ **BELANGRIJK:**
- Bewaar de `JWT_SECRET` VEILIG
- Deel deze NOOIT publiekelijk
- Gebruik een STERKE, WILLEKEURIGE waarde (minimaal 32 karakters)
- Wijzig de secret NIET zonder goede reden (dit breekt bestaande tokens)

## Betrokken Edge Functions

Deze Edge Functions gebruiken `JWT_SECRET`:
- `generate-builder-jwt` - Genereert JWT tokens voor de builder
- `pages-api` - Valideert JWT tokens bij pagina operaties
- `menus-api` - Valideert JWT tokens bij menu operaties
- `layouts-api` - Valideert JWT tokens bij layout operaties
- `content-api` - Valideert JWT tokens bij content operaties

## Status Check

Na het toevoegen van `JWT_SECRET`, controleer deze functies:
- ✅ Pagina openen in externe builder
- ✅ Pagina opslaan in externe builder
- ✅ Pagina terugkeren naar AI Travel Studio
- ✅ Menu bewerken
- ✅ Footer bewerken
- ✅ Templates maken

---

# Security Update - API Endpoints

## Uitgevoerde wijzigingen

### 1. Pages API (`/functions/v1/pages-api`)

**Save Draft Endpoint:**
- URL: `POST /functions/v1/pages-api/saveDraft`
- Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- Query params: `?apikey=<ANON_KEY>`
- Body: `{ brand_id, title, slug, content_json, page_id? }`
- Response 200: `{ success:true, page_id, slug, version }`
- JWT scope vereist: `content:write`

**Publish Endpoint:**
- URL: `POST /functions/v1/pages-api/{page_id}/publish`
- Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- Query params: `?apikey=<ANON_KEY>`
- Body: `{ body_html? }`
- Response 200: `{ success:true, page_id, slug, version, status:'published' }`
- JWT scope vereist: `content:write`

### 2. Content API (`/functions/v1/content-api`)

**Save Endpoint:**
- URL: `POST /functions/v1/content-api/save?type=news_items|destinations|trips`
- Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- Query params: `?apikey=<ANON_KEY>&type=<TYPE>`
- Body: `{ brand_id, title, slug, content, status:'draft', tags?, author_type?, author_id?, id? }`
- Response 200: `{ success:true, id, slug, status:'draft' }`
- JWT scope vereist: `content:write`

**Publish Endpoint:**
- URL: `POST /functions/v1/content-api/publish?type=news_items`
- Headers: `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- Query params: `?apikey=<ANON_KEY>&type=<TYPE>`
- Body: `{ brand_id, id?, slug?, author_type? }`
- Response 200: `{ success:true, id, slug, status:'published' }`
- JWT scope vereist: `content:write`

### 3. JWT Scope Validation

Alle write endpoints valideren nu:
- JWT bevat `brand_id` claim
- JWT bevat `scope` array met `content:write`
- Brand ID in token matcht met request body

Error responses:
- `401`: Ontbrekende of ongeldige JWT
- `403`: Onvoldoende rechten (scope mismatch of brand_id mismatch)
- `400`: Bad request (missende velden)
- `404`: Resource niet gevonden
- `500`: Server error

### 4. CORS Headers

Alle endpoints ondersteunen:
- Origin: `https://www.ai-websitestudio.nl`
- Methods: `GET, POST, PUT, DELETE, OPTIONS, PATCH`
- Headers: `Authorization, Content-Type, apikey`
- Preflight: OPTIONS requests worden correct afgehandeld

## Security Checklist

- [x] JWT scope validation (`content:write`)
- [x] Brand ID validation in alle endpoints
- [x] CORS headers correct geconfigureerd
- [x] Error responses met timestamps
- [x] Geen secrets in frontend code
- [x] Edge functions gedeployed

## Volgende stappen

### BELANGRIJK: Key Rotatie Vereist

De volgende keys moeten worden geroteerd omdat ze mogelijk in de codebase zijn gecommit:

1. **Supabase Keys** (via Supabase Dashboard):
   - Anon key
   - Service role key

2. **JWT Signing Secret** (via Supabase Dashboard → Edge Functions → Secrets):
   - `JWT_SECRET`

3. **API Keys** (indien gebruikt):
   - GCP keys
   - Andere third-party API keys

### Test Protocol

Na key rotatie testen met curl:

```bash
# Test save draft (pages)
curl -i -X POST \
  'https://<project>.supabase.co/functions/v1/pages-api/saveDraft?apikey=<NEW_ANON_KEY>' \
  -H 'Authorization: Bearer <NEW_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"brand_id":"<BRAND>","title":"Test","slug":"test","content_json":{}}'

# Test publish (pages)
curl -i -X POST \
  'https://<project>.supabase.co/functions/v1/pages-api/<PAGE_ID>/publish?apikey=<NEW_ANON_KEY>' \
  -H 'Authorization: Bearer <NEW_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"body_html":"<!doctype html><html>...</html>"}'

# Test save (content)
curl -i -X POST \
  'https://<project>.supabase.co/functions/v1/content-api/save?type=news_items&apikey=<NEW_ANON_KEY>' \
  -H 'Authorization: Bearer <NEW_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"brand_id":"<BRAND>","title":"Test","slug":"test","content":{"json":{},"html":""},"status":"draft"}'

# Test publish (content)
curl -i -X POST \
  'https://<project>.supabase.co/functions/v1/content-api/publish?type=news_items&apikey=<NEW_ANON_KEY>' \
  -H 'Authorization: Bearer <NEW_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{"brand_id":"<BRAND>","id":"<ID>"}'
```

## Frontend Integratie

De frontend (BOLT) moet de volgende URL parameters gebruiken:
- `api` - Supabase project URL
- `apikey` - Supabase anon key
- `brand_id` - Brand identifier
- `token` - JWT token met `content:write` scope
- Hash: `#/mode/page` voor routing

Geen hardcoded secrets meer in frontend code!
