# Externe Builder - Template Aanlevering Specificatie

## Overzicht
Dit document beschrijft hoe externe website builders (zoals GoWild) hun **bestaande templates** kunnen aanleveren aan ons platform, zodat ze beschikbaar komen in de Brand QuickStart template gallerij.

---

## Wat is een Template Collectie?

Een template collectie is een **complete website template set** met meerdere pagina's die samen een samenhangend ontwerp vormen.

### Voorbeeld: "Traveler" Template Collectie
- **Category naam**: "Traveler"
- **Pagina's**:
  - Home
  - Over Ons
  - Contact
  - Bestemmingen
  - Blog

Deze 5 pagina's vormen samen één template collectie die brands in één keer kunnen gebruiken.

---

## Wat moeten jullie aanleveren?

### 1. Category Informatie (per template collectie)

Voor elke template collectie:
```json
{
  "category": "Traveler",
  "description": "Modern reisburo website template",
  "page_count": 5
}
```

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `category` | string | Ja | Naam van de template collectie (bijv. "Traveler", "Business", "Restaurant") |
| `description` | string | Nee | Korte beschrijving van de template collectie |
| `page_count` | number | Ja | Aantal pagina's in deze collectie |

---

### 2. Category Preview Image

Een **grote preview afbeelding** die de hele template collectie toont.

**Vereisten:**
- ✅ **Formaat**: PNG of JPEG
- ✅ **Afmetingen**: **800 x 1200 pixels** (portrait/verticale oriëntatie)
- ✅ **Aspect ratio**: 2:3 (hoogte is 1.5x de breedte)
- ✅ **Bestandsgrootte**: Max 500KB
- ✅ **Inhoud**: Een visueel overzicht van de complete website (bijv. meerdere schermen naast elkaar, of een lange scroll)

**Bestandsnaam:** `{category-slug}-preview.png`

**Voorbeeld:**
```
traveler-preview.png
business-preview.png
restaurant-preview.png
```

**Visual voorbeeld van wat we willen zien:**
```
┌─────────────────┐
│                 │
│   [Hero Home]   │  ← Screenshot top van homepage
│                 │
├─────────────────┤
│  [About Us]     │  ← Screenshot van about pagina
├─────────────────┤
│  [Contact]      │  ← Screenshot van contact pagina
├─────────────────┤
│  [Services]     │  ← Screenshot van services
└─────────────────┘
```
*Of: een grid met meerdere pagina previews naast elkaar*

---

### 3. Pagina Informatie (per individuele pagina)

Voor **elke pagina** in de template collectie:

```json
{
  "template_name": "Home",
  "category": "Traveler",
  "page_slug": "home",
  "description": "Modern homepage met hero sectie en uitgelichte bestemmingen",
  "preview_image_url": "https://jouw-cdn.com/templates/traveler/home-preview.png",
  "html_content": "<html>...</html>",
  "order_index": 1
}
```

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| `template_name` | string | Ja | Naam van de pagina (bijv. "Home", "Contact", "Over Ons") |
| `category` | string | Ja | Category naam waar deze pagina bij hoort |
| `page_slug` | string | Ja | URL-vriendelijke slug (bijv. "home", "contact", "over-ons") |
| `description` | string | Nee | Beschrijving van wat deze pagina bevat |
| `preview_image_url` | string | Ja | URL naar preview screenshot van deze pagina |
| `html_content` | string | Ja | Complete HTML content van de pagina |
| `order_index` | number | Ja | Volgorde binnen de category (1 = eerste, 2 = tweede, etc.) |

---

### 4. Pagina Preview Images

Voor **elke individuele pagina**:

**Vereisten:**
- ✅ **Formaat**: PNG of JPEG
- ✅ **Afmetingen**: **1200 x 800 pixels** (landscape/horizontale oriëntatie)
- ✅ **Aspect ratio**: 3:2
- ✅ **Bestandsgrootte**: Max 300KB per afbeelding
- ✅ **Inhoud**: Full-page screenshot van de pagina

**Bestandsnaam:** `{category-slug}-{page-slug}-preview.png`

**Voorbeelden:**
```
traveler-home-preview.png
traveler-contact-preview.png
traveler-about-preview.png
business-home-preview.png
business-services-preview.png
```

---

## Hoe aanleveren?

### Optie 1: Bulk Upload via API (Aanbevolen)

We maken een API endpoint waar je alle templates in één keer kunt uploaden.

**Endpoint:**
```
POST https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/register-external-templates
```

**Headers:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI",
  "Content-Type": "application/json"
}
```

**Let op:** De Authorization header gebruikt de Supabase Anon Key. Deze is publiek en kan veilig gedeeld worden.

**Request Body:**
```json
{
  "builder_name": "GoWild",
  "templates": [
    {
      "category": "Traveler",
      "description": "Modern reisburo website",
      "category_preview_url": "https://cdn.gowild.com/templates/traveler-preview.png",
      "pages": [
        {
          "template_name": "Home",
          "page_slug": "home",
          "description": "Homepage met hero en featured destinations",
          "preview_image_url": "https://cdn.gowild.com/templates/traveler-home.png",
          "html_content": "<!DOCTYPE html><html>...</html>",
          "order_index": 1
        },
        {
          "template_name": "Over Ons",
          "page_slug": "over-ons",
          "description": "Bedrijfsverhaal en team introductie",
          "preview_image_url": "https://cdn.gowild.com/templates/traveler-about.png",
          "html_content": "<!DOCTYPE html><html>...</html>",
          "order_index": 2
        },
        {
          "template_name": "Contact",
          "page_slug": "contact",
          "description": "Contactformulier en bedrijfsinformatie",
          "preview_image_url": "https://cdn.gowild.com/templates/traveler-contact.png",
          "html_content": "<!DOCTYPE html><html>...</html>",
          "order_index": 3
        }
      ]
    },
    {
      "category": "Business",
      "description": "Professionele bedrijfswebsite",
      "category_preview_url": "https://cdn.gowild.com/templates/business-preview.png",
      "pages": [
        {
          "template_name": "Home",
          "page_slug": "home",
          "description": "Zakelijke homepage",
          "preview_image_url": "https://cdn.gowild.com/templates/business-home.png",
          "html_content": "<!DOCTYPE html><html>...</html>",
          "order_index": 1
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "7 templates succesvol geregistreerd",
  "categories_created": 2,
  "template_ids": [
    "uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5", "uuid-6", "uuid-7"
  ]
}
```

---

### Optie 2: Handmatige Upload via Operator Dashboard

Als jullie maar een paar templates hebben, kunnen we ze ook handmatig uploaden:

1. Stuur ons een ZIP bestand met:
   ```
   templates/
   ├── traveler/
   │   ├── traveler-preview.png          (800x1200px)
   │   ├── home.html
   │   ├── home-preview.png              (1200x800px)
   │   ├── about.html
   │   ├── about-preview.png
   │   ├── contact.html
   │   └── contact-preview.png
   ├── business/
   │   ├── business-preview.png
   │   ├── home.html
   │   └── home-preview.png
   └── manifest.json
   ```

2. De `manifest.json` bevat de metadata:
   ```json
   {
     "builder_name": "GoWild",
     "categories": [
       {
         "category": "Traveler",
         "description": "Modern reisburo website",
         "pages": [
           {
             "template_name": "Home",
             "page_slug": "home",
             "html_file": "traveler/home.html",
             "preview_image": "traveler/home-preview.png",
             "order_index": 1
           }
         ]
       }
     ]
   }
   ```

3. Wij uploaden het naar onze Operator Dashboard

---

## HTML Content Vereisten

### ✅ Wat moet de HTML bevatten?

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Naam</title>

  <!-- Inline CSS of link naar externe stylesheet -->
  <style>
    /* Jullie CSS hier */
  </style>

  <!-- Of: -->
  <link rel="stylesheet" href="https://cdn.gowild.com/templates/styles.css">
</head>
<body>
  <header>
    <!-- Header content -->
  </header>

  <main>
    <!-- Main page content -->
  </main>

  <footer>
    <!-- Footer content -->
  </footer>

  <!-- Optioneel: JavaScript -->
  <script src="https://cdn.gowild.com/templates/scripts.js"></script>
</body>
</html>
```

### ✅ Best Practices

- **Responsive**: Moet goed werken op mobile, tablet en desktop
- **Modern CSS**: Gebruik Flexbox/Grid
- **Valide HTML5**: Geen syntax errors
- **Relatieve URLs**: Voor assets die gehost worden op jullie CDN
- **Clean code**: Goed geformatteerde, leesbare HTML
- **No hardcoded data**: Gebruik placeholders die brands kunnen aanpassen

### ❌ Wat NIET te doen

- ❌ Geen absolute URLs naar interne systemen
- ❌ Geen afhankelijkheden van externe services die offline kunnen gaan
- ❌ Geen inline scripts met beveiligingsrisico's
- ❌ Geen grote embedded assets (gebruik CDN links)

---

## Wat gebeurt er na aanlevering?

### Stap 1: Registratie
Jullie sturen templates via API of ZIP bestand.

### Stap 2: Validatie
Ons systeem controleert:
- ✅ Zijn alle URLs geldig?
- ✅ Zijn alle preview images beschikbaar?
- ✅ Is de HTML valide?
- ✅ Zijn alle vereiste velden aanwezig?

### Stap 3: Review (Optioneel)
Operator bekijkt templates in admin dashboard en kan:
- Preview bekijken
- HTML testen
- Goedkeuren of afkeuren

### Stap 4: Activatie
Operator zet `is_active = true` en templates verschijnen direct in:
- **Brand QuickStart** - Brands zien de template collecties
- **Template Gallery** - Individuele pagina's zijn zichtbaar

---

## Veelgestelde Vragen

### Q: Moeten we de HTML hosten?
**A:** Nee! De HTML content stuur je mee in de API call. Wij slaan het op in onze database. Alleen de **preview images** moeten op jullie CDN gehost worden.

### Q: Kunnen we templates later updaten?
**A:** Ja! Stuur dezelfde category+page_slug opnieuw, dan wordt de bestaande template ge-update.

### Q: Hoeveel templates kunnen we aanleveren?
**A:** Geen limiet! Stuur zoveel categories en pagina's als je wilt.

### Q: Wat als een brand de template aanpast?
**A:** De template blijft ongewijzigd. Brands maken een **kopie** die ze kunnen aanpassen.

### Q: Hoe weten we of templates succesvol zijn geüpload?
**A:** De API geeft een response met alle aangemaakte template IDs. Daarnaast kunnen jullie inloggen op het Operator Dashboard om de templates te bekijken.

---

## Technische Implementatie voor Jullie

### Stap 1: Preview Images Genereren
Gebruik een screenshot tool om automatisch previews te maken:

```javascript
// Voorbeeld met Puppeteer
const puppeteer = require('puppeteer');

async function generatePreview(htmlContent, outputPath, width, height) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width, height });
  await page.setContent(htmlContent);
  await page.screenshot({ path: outputPath, fullPage: true });

  await browser.close();
}

// Category preview (800x1200)
await generatePreview(html, 'traveler-preview.png', 800, 1200);

// Page preview (1200x800)
await generatePreview(html, 'traveler-home-preview.png', 1200, 800);
```

### Stap 2: Preview Images Uploaden naar CDN
Upload alle preview images naar jullie CDN en noteer de URLs.

### Stap 3: Templates Registreren via API

```javascript
const templates = {
  builder_name: "GoWild",
  templates: [
    {
      category: "Traveler",
      category_preview_url: "https://cdn.gowild.com/traveler-preview.png",
      pages: [
        {
          template_name: "Home",
          page_slug: "home",
          preview_image_url: "https://cdn.gowild.com/traveler-home.png",
          html_content: fs.readFileSync('traveler-home.html', 'utf8'),
          order_index: 1
        }
      ]
    }
  ]
};

const response = await fetch('https://platform.com/api/register-templates', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(templates)
});

const result = await response.json();
console.log('Templates registered:', result);
```

---

## Contact & Support

**Vragen?**
- Email: support@platform.com
- Docs: https://docs.platform.com/template-integration

**API Key aanvragen:**
Stuur een email naar support@platform.com met:
- Jullie bedrijfsnaam
- Contact persoon
- Hoeveel templates jullie willen aanleveren

---

## Checklist voor Aanlevering

Voordat je templates aanlever, controleer:

- [ ] Alle preview images zijn gemaakt (800x1200 voor category, 1200x800 voor pagina's)
- [ ] Preview images zijn geüpload naar CDN en URLs zijn publiek toegankelijk
- [ ] HTML content is valide en responsive
- [ ] Alle vereiste velden zijn ingevuld (category, template_name, page_slug, etc.)
- [ ] Order_index is correct voor alle pagina's
- [ ] API key is aangevraagd en ontvangen
- [ ] Test API call is succesvol
- [ ] Volledige template set is verstuurd

---

## Test Voorbeeld

Hier is een minimaal werkend voorbeeld om de API te testen met cURL:

```bash
curl -X POST https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/register-external-templates \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI" \
  -H "Content-Type: application/json" \
  -d '{
    "builder_name": "GoWild Test",
    "templates": [
      {
        "category": "Test Template",
        "description": "Een simpele test template",
        "category_preview_url": "https://via.placeholder.com/800x1200/4A90E2/FFFFFF?text=Test+Category",
        "pages": [
          {
            "template_name": "Home",
            "page_slug": "home",
            "description": "Test homepage",
            "preview_image_url": "https://via.placeholder.com/1200x800/4A90E2/FFFFFF?text=Home+Page",
            "html_content": "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test Homepage</h1><p>Dit is een test template.</p></body></html>",
            "order_index": 1
          }
        ]
      }
    ]
  }'
```

**Verwachte response:**
```json
{
  "success": true,
  "builder_name": "GoWild Test",
  "categories_processed": 1,
  "templates_created": 1,
  "template_ids": ["uuid-hier"],
  "errors": [],
  "message": "1 templates successfully registered"
}
```

### JavaScript/Node.js Voorbeeld

```javascript
const registerTemplates = async () => {
  const response = await fetch('https://huaaogdxxdcakxryecnw.supabase.co/functions/v1/register-external-templates', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWFvZ2R4eGRjYWt4cnllY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY3MzMsImV4cCI6MjA3NDIxMjczM30.EqZK_6xjEAVwUtsYj6nENe4x8-7At_oRAVsPMDvJBSI',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      builder_name: 'GoWild',
      templates: [
        {
          category: 'Traveler',
          description: 'Modern reisburo website',
          category_preview_url: 'https://cdn.gowild.com/templates/traveler-preview.png',
          pages: [
            {
              template_name: 'Home',
              page_slug: 'home',
              description: 'Homepage met hero section',
              preview_image_url: 'https://cdn.gowild.com/templates/traveler-home.png',
              html_content: '<!DOCTYPE html><html>...</html>',
              order_index: 1
            }
          ]
        }
      ]
    })
  });

  const result = await response.json();
  console.log('Result:', result);

  if (result.success) {
    console.log(`✅ ${result.templates_created} templates registered!`);
    console.log('Template IDs:', result.template_ids);
  } else {
    console.error('❌ Error:', result.error);
  }
};

registerTemplates();
```

---

**Klaar om te starten? Laat het ons weten! 🚀**
