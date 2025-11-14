# Template Ondersteuning Specificatie voor Externe Builder

## Overzicht

De externe builder op `https://www.ai-websitestudio.nl/index.html` moet template functionaliteit ondersteunen zodat admins templates kunnen maken die brands kunnen gebruiken.

## URL Parameters die de builder moet lezen

Wanneer de builder wordt geopend vanuit de Template Manager, ontvangt deze de volgende URL parameters:

```
https://www.ai-websitestudio.nl/index.html?
  token=<JWT_TOKEN>&
  api=<SUPABASE_URL>&
  apikey=<SUPABASE_ANON_KEY>&
  mode=create-template&
  content_type=page&
  is_template=true&
  title=Home%201&
  slug=home-1&
  template_category=home&
  preview_image_url=https://...
```

### Parameter Beschrijvingen:

| Parameter | Verplicht | Beschrijving | Voorbeeld |
|-----------|-----------|--------------|-----------|
| `token` | Ja | JWT token voor authenticatie | `eyJhbGc...` |
| `api` | Ja | Supabase API URL | `https://xxx.supabase.co` |
| `apikey` | Ja | Supabase Anon Key | `eyJhbGc...` |
| `mode` | Ja | Modus (create-template of edit-template) | `create-template` |
| `content_type` | Ja | Type content (MOET "page" zijn voor templates) | `page` |
| `is_template` | Ja | Geeft aan dat dit een template is | `true` |
| `title` | Ja | Titel van de template | `Home 1` |
| `slug` | Ja | URL slug voor de template | `home-1` |
| `template_category` | Ja | Categorie van de template | `home`, `about`, `contact`, `services`, `blog`, `general` |
| `preview_image_url` | Nee | URL van preview afbeelding | `https://example.com/preview.jpg` |

## Template Categorieën

De volgende categorieën zijn beschikbaar:

- `home` - Homepage templates
- `about` - Over Ons pagina templates
- `contact` - Contact pagina templates
- `services` - Diensten pagina templates
- `blog` - Blog pagina templates
- `general` - Algemene pagina templates

## API Endpoint voor Opslaan

### Endpoint
```
POST {api}/functions/v1/pages-api/save
```

### Headers
```javascript
{
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Request Body voor Template

```javascript
{
  // Template specifieke velden
  "is_template": true,
  "template_category": "home",
  "preview_image_url": "https://example.com/preview.jpg",

  // Standaard pagina velden
  "title": "Home 1",
  "slug": "home-1",
  "content_json": {
    // Je builder's content structuur
    "layout": [...],
    "styles": {...},
    "htmlSnapshot": "<html>...</html>"
  },

  // Optioneel: Voor updates
  "page_id": "uuid-of-existing-template"
}
```

### BELANGRIJK: Velden die NIET meegestuurd moeten worden voor templates

Voor templates moeten de volgende velden NIET worden meegestuurd:
- `brand_id` - Moet leeg/null blijven (wordt server-side afgehandeld)
- `owner_user_id` - Niet nodig voor templates

### Response van API

```javascript
{
  "page_id": "uuid-of-template",
  "title": "Home 1",
  "slug": "home-1",
  "is_template": true,
  "template_category": "home",
  "content_json": {...},
  "status": "draft"
}
```

## Workflow Voorbeeld

### 1. Template Aanmaken (Create Mode)

```javascript
// Lees URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const isTemplate = urlParams.get('is_template') === 'true';
const title = urlParams.get('title');
const slug = urlParams.get('slug');
const templateCategory = urlParams.get('template_category');
const previewImageUrl = urlParams.get('preview_image_url');
const token = urlParams.get('token');
const api = urlParams.get('api');

// Bij opslaan
async function saveTemplate(contentJson) {
  const response = await fetch(`${api}/functions/v1/pages-api/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      is_template: true,
      template_category: templateCategory,
      preview_image_url: previewImageUrl,
      title: title,
      slug: slug,
      content_json: contentJson
    })
  });

  const result = await response.json();
  console.log('Template opgeslagen:', result);

  // Optioneel: Sla page_id op voor toekomstige updates
  const pageId = result.page_id;
}
```

### 2. Template Bewerken (Edit Mode)

```javascript
// URL voor edit mode bevat page_id
const pageId = urlParams.get('page_id');

// Laad bestaande template data
async function loadTemplate() {
  const response = await fetch(`${api}/functions/v1/pages-api/${pageId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const template = await response.json();
  // Laad content_json in de builder
  loadContentIntoBuilder(template.content_json);
}

// Bij opslaan
async function updateTemplate(contentJson) {
  const response = await fetch(`${api}/functions/v1/pages-api/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      page_id: pageId, // Bestaande template ID
      is_template: true,
      template_category: templateCategory,
      preview_image_url: previewImageUrl,
      title: title,
      slug: slug,
      content_json: contentJson
    })
  });

  const result = await response.json();
  console.log('Template bijgewerkt:', result);
}
```

## UI Aanpassingen

### Toon Template Indicator

Wanneer `is_template=true`, toon een visuele indicator in de builder dat de gebruiker een template aan het maken/bewerken is:

```html
<div class="template-indicator">
  🎨 Template Modus: {template_category}
  <p>Deze pagina wordt een herbruikbare template voor alle brands</p>
</div>
```

### Validatie

Voor templates:
- ✅ Title en slug zijn verplicht
- ✅ Template category moet één van de toegestane waarden zijn
- ❌ Geen brand_id nodig
- ❌ Geen owner_user_id nodig

## Testing

### Test Template Aanmaken

1. Open URL:
```
https://www.ai-websitestudio.nl/index.html?token=XXX&api=https://xxx.supabase.co&apikey=XXX&mode=create-template&is_template=true&title=Test%20Template&slug=test-template&template_category=home
```

2. Bouw een pagina

3. Klik op opslaan

4. Controleer in Supabase dat de template is aangemaakt:
```sql
SELECT id, title, slug, is_template, template_category, brand_id
FROM pages
WHERE is_template = true
ORDER BY created_at DESC;
```

5. Verwachte resultaten:
   - `is_template` = `true`
   - `brand_id` = `NULL`
   - `template_category` = `home`

### Test Template Bewerken

1. Open URL:
```
https://www.ai-websitestudio.nl/index.html?token=XXX&api=https://xxx.supabase.co&apikey=XXX&mode=edit-template&page_id=XXX&is_template=true
```

2. Bewerk de pagina

3. Klik op opslaan

4. Controleer dat de template is bijgewerkt (versienummer verhoogd)

## Foutafhandeling

Mogelijke fouten van de API:

```javascript
// 400 - Validatie fout
{
  "error": "title and slug required for templates"
}

// 401 - Authenticatie fout
{
  "error": "Missing or invalid Authorization header"
}

// 500 - Server fout
{
  "error": "Internal server error",
  "details": "...",
  "timestamp": "2025-10-13T..."
}
```

## Vragen?

Als er vragen zijn over de implementatie, laat het weten!
