# Pages-API Deployment Instructies

## Status: ⚠️ DEPLOYMENT VEREIST

De `pages-api` Edge Function is bijgewerkt met template ondersteuning maar moet nog gedeployed worden.

## Wat er is aangepast:

1. ✅ JWT verificatie accepteert nu zowel `content:write` als `pages:write` scopes
2. ✅ Template detectie via `is_template` JWT claim
3. ✅ Correcte `brand_id` handling voor templates (NULL)
4. ✅ Debug logging toegevoegd

## Deployment Opties:

### Optie 1: Via Supabase Dashboard (Aanbevolen)

1. Open Supabase Dashboard: https://app.supabase.com
2. Ga naar je project: `huaaogdxxdcakxryecnw`
3. Navigeer naar: **Edge Functions** → **pages-api**
4. Klik op **Deploy new version**
5. Copy/paste de code uit: `/tmp/cc-agent/57777034/project/supabase/functions/pages-api/index.ts`
6. Klik op **Deploy**

### Optie 2: Via Supabase CLI

```bash
# Zorg dat je in de project directory bent
cd /path/to/project

# Login (als nog niet gedaan)
supabase login

# Link project (als nog niet gedaan)
supabase link --project-ref huaaogdxxdcakxryecnw

# Deploy de functie
supabase functions deploy pages-api
```

### Optie 3: Via Git Push

Als je Supabase GitHub integration hebt:

```bash
git add supabase/functions/pages-api/index.ts
git commit -m "feat: Add template support to pages-api"
git push origin main
```

Supabase zal automatisch deployen.

## Verificatie na deployment:

### Test 1: Check of de functie draait

```bash
curl https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/pages-api \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI"
```

Expected: 404 (omdat geen route match), maar geen 500 error.

### Test 2: Test template save (via browser console)

Ga naar Template Manager, open een nieuwe template in de builder, en voer uit in console:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const api = urlParams.get('api');

fetch(`${api}/functions/v1/pages-api/save`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    is_template: true,
    template_category: 'home',
    title: 'Deploy Test',
    slug: 'deploy-test',
    content_json: {
      layout: [],
      htmlSnapshot: '<div>test</div>'
    }
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Expected response (200 OK):
```json
{
  "page_id": "...",
  "title": "Deploy Test",
  "slug": "deploy-test",
  "is_template": true,
  "template_category": "home",
  "content_json": {...},
  "status": "draft"
}
```

## Checklist na deployment:

- [ ] pages-api is gedeployed (check Functions tab in Supabase)
- [ ] Geen errors in Function Logs
- [ ] Test 1 is succesvol (geen 500 error)
- [ ] Test 2 is succesvol (200 OK response)
- [ ] Template wordt opgeslagen in database met `is_template=true` en `brand_id=NULL`

## Als er problemen zijn:

1. Check de **Function Logs** in Supabase Dashboard
2. Zoek naar `[DEBUG]` logs die we hebben toegevoegd
3. Check of `JWT_SECRET` environment variable correct is ingesteld
4. Verify dat de JWT signature klopt (zie TEMPLATE_DEBUG_GUIDE.md)

## Environment Variables Check

Verify dat deze environment variables zijn ingesteld in Supabase:

```bash
JWT_SECRET=<your-jwt-secret>
SUPABASE_URL=https://huaaogdxxdcakxryecnw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Deze worden automatisch ingesteld door Supabase, maar als er problemen zijn check dit.
