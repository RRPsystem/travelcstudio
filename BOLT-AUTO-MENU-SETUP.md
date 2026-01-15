# Auto Menu Setup voor BOLT Template Import

Dit document beschrijft hoe je automatisch menu's configureert wanneer je template pagina's importeert in Supabase.

## 📋 Overzicht

Er zijn **2 opties** om menu's automatisch in te stellen:

### ✅ Optie 1: Direct bij Import (AANBEVOLEN)
Voeg `show_in_menu`, `menu_order`, en `status` toe tijdens het inserten van pagina's.

### 🔄 Optie 2: API Call na Import (Fallback)
Call de `setup-menu` API endpoint na het importeren.

---

## 🎯 Optie 1: Direct bij Import (Primair)

Bij het importeren van template pagina's, voeg direct deze velden toe:

### Vereiste Velden

```javascript
{
  "show_in_menu": true,      // Toon in menu
  "menu_order": 1,            // Volgorde (1, 2, 3, etc.)
  "menu_label": "Home",       // Label in menu
  "status": "published"       // Moet published zijn
}
```

### Aanbevolen Menu Volgorde

| Pagina        | menu_order | menu_label   | show_in_menu |
|---------------|------------|--------------|--------------|
| home/index    | 1          | Home         | true         |
| about         | 2          | About        | true         |
| tours         | 3          | Tours        | true         |
| destinations  | 4          | Destinations | true         |
| contact       | 5          | Contact      | true         |

### Code Voorbeeld: Supabase Insert

```javascript
// Bij het inserten van een Home pagina
const { data, error } = await supabase
  .from('pages')
  .insert({
    brand_id: brandId,
    website_id: websiteId,
    slug: 'home',
    title: 'Home',
    body_html: homePageHtml,

    // ✅ MENU CONFIGURATIE
    show_in_menu: true,
    menu_order: 1,
    menu_label: 'Home',
    status: 'published',

    // Optioneel maar aanbevolen
    content_type: 'page'
  });
```

### Code Voorbeeld: Batch Insert

```javascript
const templatePages = [
  {
    slug: 'home',
    title: 'Home',
    body_html: homeHtml,
    show_in_menu: true,
    menu_order: 1,
    menu_label: 'Home',
    status: 'published'
  },
  {
    slug: 'about',
    title: 'About Us',
    body_html: aboutHtml,
    show_in_menu: true,
    menu_order: 2,
    menu_label: 'About',
    status: 'published'
  },
  {
    slug: 'tours',
    title: 'Our Tours',
    body_html: toursHtml,
    show_in_menu: true,
    menu_order: 3,
    menu_label: 'Tours',
    status: 'published'
  },
  {
    slug: 'destinations',
    title: 'Destinations',
    body_html: destinationsHtml,
    show_in_menu: true,
    menu_order: 4,
    menu_label: 'Destinations',
    status: 'published'
  },
  {
    slug: 'contact',
    title: 'Contact',
    body_html: contactHtml,
    show_in_menu: true,
    menu_order: 5,
    menu_label: 'Contact',
    status: 'published'
  }
];

// Voeg brand_id/website_id toe aan alle pagina's
const pagesWithIds = templatePages.map(page => ({
  ...page,
  brand_id: brandId,
  website_id: websiteId,
  content_type: 'page'
}));

// Insert in batch
const { data, error } = await supabase
  .from('pages')
  .insert(pagesWithIds);
```

### ✅ Voordelen Optie 1
- **Sneller**: Geen extra API call nodig
- **Eenvoudiger**: Gewoon 3 extra velden bij insert
- **Meer controle**: BOLT bepaalt exact de menu structuur
- **Atomic**: Alles in één transactie

---

## 🔄 Optie 2: API Call na Import (Fallback)

Als je de velden niet direct kunt zetten (legacy code, of als fallback), gebruik dan deze API:

### API Endpoint

```
POST https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/setup-menu
```

### Request Body

```json
{
  "brand_id": "your-brand-id-here"
}
```

Of voor websites:

```json
{
  "website_id": "your-website-id-here"
}
```

### JavaScript Voorbeeld

```javascript
const response = await fetch(
  'https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/setup-menu',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      brand_id: brandId
    })
  }
);

const result = await response.json();
console.log(`✅ Menu setup: ${result.updated_pages} pages configured`);
```

### cURL Voorbeeld

```bash
curl -X POST https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/setup-menu \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"brand_id": "your-brand-id"}'
```

### Response

```json
{
  "success": true,
  "updated_pages": 5,
  "pages": [
    {
      "id": "page-id-1",
      "slug": "home",
      "title": "Home",
      "menu_order": 1,
      "menu_label": "Home"
    },
    {
      "id": "page-id-2",
      "slug": "about",
      "title": "About Us",
      "menu_order": 2,
      "menu_label": "About"
    }
  ]
}
```

### 🎯 Wanneer Optie 2 gebruiken?
- Legacy import code die je niet wilt aanpassen
- Als fallback/cleanup tool
- Voor bestaande brands die al geïmporteerd zijn
- Handmatige fixes voor specifieke gevallen

---

## 🔍 Welke Pagina's worden Geconfigureerd?

De volgende pagina slugs worden automatisch herkend:

- `home` of `index` → Menu order 1, label "Home"
- `about` → Menu order 2, label "About"
- `tours` → Menu order 3, label "Tours"
- `destinations` → Menu order 4, label "Destinations"
- `contact` → Menu order 5, label "Contact"

Pagina's met andere slugs worden **niet** automatisch in het menu geplaatst.

---

## 📝 Database Schema

De relevante velden in de `pages` tabel:

```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  website_id UUID REFERENCES websites(id),

  -- Pagina content
  slug TEXT NOT NULL,
  title TEXT,
  body_html TEXT,

  -- Menu configuratie
  show_in_menu BOOLEAN DEFAULT false,
  menu_order INTEGER,
  menu_label TEXT,

  -- Status
  status TEXT DEFAULT 'draft',

  -- Type
  content_type TEXT DEFAULT 'page'
);
```

---

## 🧪 Testing

### Test Optie 1 (Direct Insert)

```javascript
// Test: Insert één pagina met menu configuratie
const { data, error } = await supabase
  .from('pages')
  .insert({
    brand_id: 'test-brand-id',
    slug: 'home',
    title: 'Test Home',
    body_html: '<h1>Test</h1>',
    show_in_menu: true,
    menu_order: 1,
    menu_label: 'Home',
    status: 'published'
  })
  .select();

console.log('Inserted page:', data);

// Verify menu configuratie
const { data: page } = await supabase
  .from('pages')
  .select('slug, show_in_menu, menu_order, menu_label, status')
  .eq('id', data[0].id)
  .single();

console.log('Menu config:', page);
```

### Test Optie 2 (API Call)

```javascript
// Test: Setup menu via API
const response = await fetch(
  'https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/setup-menu',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brand_id: 'test-brand-id'
    })
  }
);

const result = await response.json();
console.log('Setup result:', result);
```

---

## ❓ FAQ

### Q: Moet ik beide opties gebruiken?
**A:** Nee! Gebruik **Optie 1** bij nieuwe imports. Optie 2 is alleen voor legacy/fallback.

### Q: Wat als een pagina al bestaat?
**A:** Bij Optie 1: Skip of update. Bij Optie 2: De API update bestaande pagina's.

### Q: Kan ik custom slugs toevoegen?
**A:** Ja! Voeg gewoon extra items toe aan de `MENU_PAGES` array in de API (Optie 2), of zet de velden handmatig (Optie 1).

### Q: Werkt dit voor websites én brands?
**A:** Ja! Beide opties ondersteunen `brand_id` en `website_id`.

---

## 🚀 Aanbevolen Workflow

```mermaid
graph TD
    A[Start Template Import] --> B{Nieuwe Import Code?}
    B -->|Ja| C[Gebruik Optie 1: Direct Insert]
    B -->|Nee| D[Gebruik Optie 2: API Call]
    C --> E[Import Klaar]
    D --> E
    E --> F[Verify Menu in Supabase]
    F --> G{Menu OK?}
    G -->|Ja| H[Done!]
    G -->|Nee| I[Run Optie 2 API als Cleanup]
    I --> H
```

---

## 📞 Support

Voor vragen of problemen met menu setup:
1. Check de console logs voor `[SETUP-MENU]` berichten
2. Verify dat `show_in_menu`, `menu_order`, en `status` correct zijn gezet
3. Test met de API endpoint (Optie 2) als fallback

---

**TL;DR**: Gebruik **Optie 1** (direct velden zetten) voor nieuwe imports. Gebruik **Optie 2** (API call) als fallback of cleanup tool.
