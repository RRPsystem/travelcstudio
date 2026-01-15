# WordPress AI News Integration

Complete integratie van AI-gegenereerde nieuwsberichten in WordPress.

## Overzicht

Dit systeem stelt reisbureaus in staat om nieuwsberichten uit het platform te integreren in hun WordPress website. Nieuwsberichten kunnen op twee manieren beschikbaar zijn:

1. **Eigen nieuws**: Door het reisburo zelf aangemaakt
2. **Toegewezen nieuws**: Door de admin aangemaakt en toegewezen aan het reisburo

Beide types zijn beschikbaar via dezelfde WordPress shortcodes.

---

## Architectuur

### 1. Database Structuur

#### `news_items` tabel
Bevat alle nieuwsberichten (van admin én brands):

```sql
- id (uuid)
- brand_id (uuid) - Welke brand heeft dit nieuws gemaakt
- title (text)
- slug (text)
- content (jsonb) - HTML content
- excerpt (text)
- featured_image (text)
- status (draft | published)
- published_at (timestamp)
- author_type (admin | brand | agent)
- author_id (uuid)
- tags (array)
- is_mandatory (boolean)
```

#### `news_brand_assignments` tabel
Toewijzingen van admin nieuws aan brands:

```sql
- id (uuid)
- news_id (uuid) - Verwijzing naar news_items
- brand_id (uuid) - Aan welke brand toegewezen
- status (pending | accepted | rejected | mandatory)
- is_published (boolean) - Brand heeft dit gepubliceerd op website
- page_id (uuid) - Link naar website_pages
```

### 2. Edge Function: `wordpress-news`

**Endpoint:** `https://your-project.supabase.co/functions/v1/wordpress-news`

#### Functionaliteit

De function haalt BEIDE types nieuws op:
- Eigen nieuws waar `brand_id = brand_id`
- Toegewezen nieuws via `news_brand_assignments` waar `is_published = true`

Beide worden samengevoegd en gesorteerd op publicatiedatum.

#### API Parameters

**Verplicht:**
- `brand_id` (string) - UUID van het reisburo

**Optioneel:**
- `id` (string) - Specifiek nieuwsbericht ophalen op ID
- `slug` (string) - Specifiek nieuwsbericht ophalen op slug
- `limit` (number) - Aantal resultaten (standaard: 50)
- `offset` (number) - Offset voor paginering (standaard: 0)

#### Response Format

**Alle nieuws:**
```json
{
  "news": [
    {
      "id": "xxx",
      "title": "Nieuwsbericht titel",
      "slug": "nieuwsbericht-titel",
      "content": {...},
      "excerpt": "Korte samenvatting",
      "featured_image": "https://...",
      "status": "published",
      "published_at": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T11:00:00Z",
      "author_type": "admin",
      "author_id": "yyy",
      "tags": ["reistips", "europa"],
      "is_mandatory": false,
      "source": "assigned"
    }
  ],
  "total": 25
}
```

**Enkel nieuwsbericht:**
```json
{
  "id": "xxx",
  "title": "Nieuwsbericht titel",
  ...
  "source": "own"
}
```

#### `source` veld

Elk nieuwsbericht heeft een `source` veld:
- `"own"` - Door het reisburo zelf gemaakt
- `"assigned"` - Door admin toegewezen

---

## WordPress Plugin Installatie

### Stap 1: Upload Plugin

1. Download `wordpress-ai-news-plugin.php`
2. Upload naar `/wp-content/plugins/`
3. Activeer in WordPress admin → Plugins

### Stap 2: Configuratie

1. Ga naar **Settings → AI News**
2. Vul in:
   - **Supabase API URL**: `https://your-project.supabase.co/functions/v1/wordpress-news`
   - **Brand ID**: Je brand UUID uit de database
   - **Cache Duration**: 300 seconden (optioneel)
3. Klik **Save Changes**

### Stap 3: Cache Management

De plugin cacht API responses voor betere performance:
- **Standaard cache**: 5 minuten (300 seconden)
- **Cache wissen**: Klik "Clear All News Cache" in settings

---

## Shortcodes

### 1. Nieuwslijst

Toon nieuws als lijst:

```
[ai-news-list limit="10"]
```

**Parameters:**
- `limit` (number) - Aantal nieuwsberichten (standaard: 10)
- `offset` (number) - Offset voor paginering (standaard: 0)

**Voorbeeld:**
```
[ai-news-list limit="5"]
```

### 2. Nieuws Grid

Toon nieuws in grid layout:

```
[ai-news-grid limit="6" columns="3"]
```

**Parameters:**
- `limit` (number) - Aantal nieuwsberichten (standaard: 6)
- `columns` (number) - Aantal kolommen: 2, 3 of 4 (standaard: 3)

**Voorbeeld:**
```
[ai-news-grid limit="9" columns="3"]
```

### 3. Enkel Nieuwsbericht (volledig)

Toon volledig nieuwsbericht met titel, afbeelding, content, etc:

```
[ai-news id="xxx"]
```

**Parameters:**
- `id` (string) - Nieuwsbericht ID (verplicht OF slug)
- `slug` (string) - Nieuwsbericht slug (verplicht OF id)

**Voorbeelden:**
```
[ai-news id="123e4567-e89b-12d3-a456-426614174000"]
[ai-news slug="zomervakantie-2024"]
```

### 4. Alleen Titel

```
[ai-news-title id="xxx"]
```

**Output:** `<span class="ai-news-title">Titel van het nieuws</span>`

### 5. Alleen Excerpt

```
[ai-news-excerpt id="xxx"]
```

**Output:** `<div class="ai-news-excerpt">Korte samenvatting...</div>`

### 6. Alleen Content

```
[ai-news-content id="xxx"]
```

**Output:** `<div class="ai-news-content">Volledige HTML content...</div>`

### 7. Alleen Featured Image

```
[ai-news-image id="xxx"]
```

**Output:** `<img src="..." alt="..." class="ai-news-image">`

### 8. Publicatiedatum

```
[ai-news-date id="xxx" format="d-m-Y"]
```

**Parameters:**
- `format` (string) - PHP date format (standaard: "d-m-Y")

**Voorbeelden:**
```
[ai-news-date id="xxx"]
[ai-news-date id="xxx" format="j F Y"]
[ai-news-date id="xxx" format="d/m/Y H:i"]
```

### 9. Tags

```
[ai-news-tags id="xxx"]
```

**Output:**
```html
<div class="ai-news-tags">
  <span class="ai-news-tag">reistips</span>
  <span class="ai-news-tag">europa</span>
</div>
```

---

## Custom Styling

### CSS Classes

De plugin voegt automatisch basis styling toe. Je kunt deze overschrijven in je theme:

#### Lijstweergave
```css
.ai-news-list { }              /* Container voor lijst */
.ai-news-item { }              /* Enkel nieuwsbericht in lijst */
.ai-news-item .ai-news-image { }
.ai-news-item .ai-news-content { }
```

#### Grid weergave
```css
.ai-news-grid { }              /* Container voor grid */
.ai-news-grid-2 { }            /* Grid met 2 kolommen */
.ai-news-grid-3 { }            /* Grid met 3 kolommen */
.ai-news-grid-4 { }            /* Grid met 4 kolommen */
.ai-news-grid-item { }         /* Enkel nieuwsbericht in grid */
```

#### Content elementen
```css
.ai-news-title { }             /* Titel */
.ai-news-meta { }              /* Meta informatie (datum, tags) */
.ai-news-date { }              /* Datum */
.ai-news-excerpt { }           /* Samenvatting */
.ai-news-content { }           /* Volledige content */
.ai-news-image { }             /* Featured image */
.ai-news-tags { }              /* Tags container */
.ai-news-tag { }               /* Enkele tag */
```

#### Status
```css
.ai-news-error { }             /* Foutmelding */
.ai-news-empty { }             /* Geen nieuws gevonden */
```

### Custom Styling Voorbeeld

Voeg toe aan je theme's `style.css`:

```css
/* Aangepaste kleuren */
.ai-news-item {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.ai-news-title {
    color: #1e40af;
    font-family: 'Your Custom Font', sans-serif;
}

.ai-news-tag {
    background: #dbeafe;
    color: #1e40af;
}

/* Hover effecten */
.ai-news-grid-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
}

/* Responsive aanpassingen */
@media (max-width: 640px) {
    .ai-news-item {
        padding: 1rem;
    }
}
```

---

## Gebruik Scenarios

### Scenario 1: Homepage met laatste nieuws

```html
<h2>Laatste Reisnieuws</h2>
[ai-news-grid limit="3" columns="3"]
```

### Scenario 2: Dedicated nieuwspagina

```html
<h1>Alle Reisnieuws</h1>
[ai-news-list limit="20"]
```

### Scenario 3: Custom nieuws template

Met Elementor/WPBakery:

```html
<div class="custom-news-header">
    [ai-news-image id="xxx"]
    <div class="overlay">
        <h1>[ai-news-title id="xxx"]</h1>
        <p>[ai-news-date id="xxx" format="j F Y"]</p>
    </div>
</div>

<div class="custom-news-content">
    [ai-news-content id="xxx"]
</div>

<div class="custom-news-footer">
    [ai-news-tags id="xxx"]
</div>
```

### Scenario 4: Sidebar widget

```html
<div class="sidebar-news">
    <h3>Recent Nieuws</h3>
    [ai-news-list limit="3"]
</div>
```

---

## Troubleshooting

### Probleem: "Plugin not configured"

**Oplossing:**
1. Ga naar Settings → AI News
2. Vul API URL en Brand ID in
3. Klik Save Changes

### Probleem: "Error fetching news"

**Mogelijke oorzaken:**
1. Verkeerde API URL
2. Verkeerde Brand ID
3. Netwerk connectie probleem

**Oplossing:**
1. Controleer API URL (moet eindigen op `/wordpress-news`)
2. Controleer Brand ID in database
3. Test API handmatig: `https://your-project.supabase.co/functions/v1/wordpress-news?brand_id=xxx`

### Probleem: Nieuws wordt niet getoond

**Check:**
1. Zijn nieuwsberichten gepubliceerd? (`status = 'published'`)
2. Voor toegewezen nieuws: `is_published = true` in assignments?
3. Cache wissen in Settings → AI News

### Probleem: Oude content wordt getoond

**Oplossing:**
1. Ga naar Settings → AI News
2. Klik "Clear All News Cache"
3. Refresh je pagina

### Probleem: Layout ziet er niet goed uit

**Oplossing:**
1. Check of je theme conflicteert met de CSS
2. Voeg custom CSS toe in theme
3. Gebruik `!important` als laatste redmiddel

---

## Performance Tips

### 1. Cache optimalisatie

Verhoog cache duration voor minder API calls:
```
Settings → AI News → Cache Duration: 600 (10 minuten)
```

### 2. Limit aantal items

Gebruik altijd een `limit` parameter:
```
[ai-news-list limit="10"]  ✓ Goed
[ai-news-list]             ✗ Te veel items
```

### 3. Lazy loading images

Voeg toe in je theme's `functions.php`:

```php
add_filter('wp_get_attachment_image_attributes', function($attr) {
    $attr['loading'] = 'lazy';
    return $attr;
});
```

### 4. CDN voor featured images

Upload afbeeldingen naar CDN en gebruik absolute URLs in `featured_image`.

---

## Security

### XSS Preventie

De plugin gebruikt WordPress sanitization:
- `esc_html()` voor tekst
- `esc_url()` voor URLs
- `wp_kses_post()` voor HTML content

### API Security

- Edge function gebruikt `verify_jwt: false` (publiek toegankelijk)
- Alleen gepubliceerde nieuws (`status = 'published'`)
- Brand ID filtering voorkomt cross-brand data access

---

## Technische Details

### API Response Time
- Gemiddeld: 200-500ms
- Met cache: < 10ms

### Browser Compatibility
- Chrome ✓
- Firefox ✓
- Safari ✓
- Edge ✓
- IE11 ✗

### WordPress Requirements
- WordPress 5.0+
- PHP 7.4+
- MySQL 5.6+ / MariaDB 10.0+

---

## Support & Updates

### Plugin Updates

De plugin is standalone (geen dependencies). Updates:
1. Download nieuwe versie
2. Deactiveer oude versie
3. Verwijder oude plugin file
4. Upload nieuwe versie
5. Activeer plugin

**Let op:** Settings blijven bewaard in WordPress database.

### API Updates

De Edge function kan worden geüpdatet zonder plugin changes:
1. Update function code in Supabase
2. Deploy nieuwe versie
3. Clear cache in WordPress plugin

---

## Changelog

### Version 1.0.0 (2024-12-10)
- Initial release
- Support voor eigen + toegewezen nieuws
- 9 shortcodes beschikbaar
- Caching systeem
- Admin settings panel
- Responsive CSS styling
- Grid en lijst weergaves

---

## FAQ

**Q: Kan ik meerdere brands op één WordPress site gebruiken?**
A: Nee, één WordPress site = één brand ID. Voor meerdere brands heb je meerdere WordPress sites nodig.

**Q: Worden drafts ook getoond?**
A: Nee, alleen nieuws met `status = 'published'` wordt getoond.

**Q: Kan ik de HTML van nieuws aanpassen?**
A: Ja, pas de shortcode templates aan in de plugin file of gebruik custom CSS.

**Q: Werkt dit met page builders?**
A: Ja, shortcodes werken met Elementor, WPBakery, Divi, etc.

**Q: Kan ik toegewezen nieuws herkennen?**
A: Ja, via het `source` veld in de API response (`"own"` of `"assigned"`).

**Q: Hoe vaak wordt cache vernieuwd?**
A: Standaard elke 5 minuten. Instelbaar in Settings → AI News.
