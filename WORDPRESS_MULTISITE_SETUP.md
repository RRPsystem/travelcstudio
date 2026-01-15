# WordPress Multisite AI News Integration Setup

## 📋 Voor Elke Brand/Site in Je Multisite

Elke WordPress site in je netwerk kan zijn eigen nieuws ontvangen vanuit het centrale systeem.

---

## 🚀 Installatie (Eenmalig voor Hele Netwerk)

### Stap 1: Upload Plugin

1. Download: `wordpress-ai-news-plugin-v2.php`
2. Upload naar: `/wp-content/plugins/`
3. **Activeer de plugin in het Network Admin** (niet per site!)

---

## ⚙️ Per Site Configuratie

Elke brand/site moet dit doen:

### Methode A: Automatisch (Aanbevolen)

1. **Ga naar: Instellingen > AI News**

2. **Vul alleen in:**
   ```
   API Base URL: https://[jouw-project].supabase.co
   ```

3. **Klik op: "Auto-Detect Brand ID"**

   ✅ Het systeem vindt automatisch de Brand ID op basis van je domein!

### Methode B: Handmatig

1. **Ga naar: Instellingen > AI News**

2. **Vul in:**
   ```
   Supabase API URL: https://[jouw-project].supabase.co/functions/v1/wordpress-news
   Brand ID: [UUID van deze brand]
   Cache Duration: 300 (optioneel)
   ```

3. **Klik: "Instellingen Opslaan"**

---

## 📊 Hoe Werkt Auto-Detect?

De auto-detect functie zoekt de Brand ID op basis van:

1. **Exact Domain Match**
   - Zoekt in `brand_domains` tabel
   - Matcht op `custom_domain` of `subdomain`
   - Alleen geverifieerde domeinen

2. **Fuzzy Match (fallback)**
   - Zoekt in `brands.website` veld
   - Gebruikt partial match

---

## 🎯 Nieuwsberichten Tonen

Na configuratie kun je nieuws tonen met shortcodes:

### Lijst van Nieuws
```
[ai-news-list limit="10"]
```

### Grid Layout (3 kolommen)
```
[ai-news-grid limit="6" columns="3"]
```

### Enkel Nieuwsbericht
```
[ai-news id="xxx"]
```

### Specifieke Onderdelen
```
[ai-news-title id="xxx"]
[ai-news-excerpt id="xxx"]
[ai-news-content id="xxx"]
[ai-news-image id="xxx"]
[ai-news-date id="xxx" format="d-m-Y"]
[ai-news-tags id="xxx"]
```

---

## 🔧 Technische Vereisten

### 1. Deploy Edge Function

```bash
# In je Supabase project
npx supabase functions deploy get-brand-by-domain
```

### 2. Zorg dat Brand Domains Zijn Ingesteld

Elke brand moet een verified domein hebben in de `brand_domains` tabel:

```sql
INSERT INTO brand_domains (brand_id, custom_domain, is_verified)
VALUES ('brand-uuid', 'example.com', true);
```

---

## 🐛 Troubleshooting

### "Geen brand gevonden voor domein"

**Oplossing:**
1. Controleer of domein is ingesteld in `brand_domains` tabel
2. Check of `is_verified = true`
3. Gebruik handmatige configuratie als fallback

### "Plugin not configured"

**Oplossing:**
1. Ga naar Instellingen > AI News
2. Gebruik Auto-Detect of vul handmatig in
3. Check of API URL correct is

### Cache Problemen

**Oplossing:**
1. Ga naar Instellingen > AI News
2. Klik op "Clear All News Cache"
3. Refresh je pagina

---

## 🔐 Security

- Elke site kan **alleen** zijn eigen nieuws zien
- Brand ID is verplicht voor alle API calls
- Cache is per-site opgeslagen
- RLS policies beschermen alle data

---

## 🎨 Styling Aanpassen

De plugin gebruikt standaard CSS classes. Voeg je eigen CSS toe via je theme:

```css
.ai-news-list { /* Custom styles */ }
.ai-news-item { /* Custom styles */ }
.ai-news-grid { /* Custom styles */ }
.ai-news-title { /* Custom styles */ }
```

---

## 📞 Support

Voor vragen over:
- **Plugin setup:** Instellingen > AI News pagina
- **Nieuws content:** Centrale platform operator
- **Domain koppeling:** Brand admin of system admin
