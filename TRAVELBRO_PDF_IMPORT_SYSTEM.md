# TravelBro - Professionele PDF Import Systeem

## Het Probleem ❌

**VOOR:** Trip data was 1 grote text blob in `custom_context`
- AI moest constant parsen
- Raad welke hotel bij welke locatie hoort
- Geen structuur, geen datums, geen faciliteiten

**RESULTAAT:**
- "Welk hotel bedoel je?" 😡
- "Van welke locatie vertrek je?" 😡
- "Ik heb geen specifieke info over dat hotel" 😡

## De Oplossing ✅

### 1. Professionele PDF Parsing

Reis PDF's (zoals van Reisprofessionals, TravelEssence, etc) bevatten PERFECTE data:

```
ITINERARY

1. Johannesburg - 5-6 Jan 2026
   Accommodation: City Lodge Johannesburg Airport
   - 1 Night
   - Room Only
   - Pool, WiFi, Restaurant

2. St. Lucia - 13-16 Jan 2026
   Accommodation: Ndiza Lodge & Cabanas
   - 3 Nights
   - Bed & Breakfast
   - Restaurant ✓, Bar, Pool, WiFi
```

Dit parsen we naar:

```json
{
  "itinerary": [
    {
      "day": 1,
      "date": "2026-01-05",
      "location": "Johannesburg",
      "hotel": {
        "name": "City Lodge Johannesburg Airport",
        "amenities": ["pool", "wifi", "restaurant"],
        "has_restaurant": true
      },
      "activities": ["Apartheid Museum", "Soweto tour"],
      "highlights": ["Aankomst in Johannesburg"]
    },
    {
      "day": 9,
      "date": "2026-01-13",
      "location": "St. Lucia",
      "hotel": {
        "name": "Ndiza Lodge & Cabanas",
        "amenities": ["restaurant", "bar", "pool", "wifi"],
        "has_restaurant": true
      },
      "activities": ["iSimangaliso Wetland Park", "Boat cruise"],
      "highlights": ["Aankomst in St. Lucia"]
    }
  ],
  "total_days": 28,
  "start_date": "2026-01-05",
  "end_date": "2026-02-01",
  "route": ["Johannesburg", "Welgevonden", "Tzaneen", ...]
}
```

### 2. Automatische URL Fetching

Als trip `source_urls` heeft, fetcht TravelBro automatisch extra info:

```typescript
// In travelbro-chat/index.ts
if (trip.source_urls && trip.source_urls.length > 0) {
  for (const url of trip.source_urls.slice(0, 3)) {
    const response = await fetch(url);
    const content = cleanHTML(await response.text());
    externalContent += content;
  }
}
```

**Voordeel:** AI heeft ALTIJD de nieuwste info van:
- Hotel websites
- Tourism boards
- Activity providers
- Restaurant info

### 3. Structured Itinerary Display

De AI krijgt nu:

```
📅 GESTRUCTUREERD REISSCHEMA (GEBRUIK DIT!):

Dag 9 (2026-01-13) - St. Lucia:
  🏨 Hotel: Ndiza Lodge & Cabanas ✅ Heeft restaurant!
  ✨ Faciliteiten: restaurant, bar, pool, wifi
  📍 Activiteiten: iSimangaliso Wetland Park, Boat cruise

🎯 HUIDIGE CONTEXT:
📍 Locatie: ST. LUCIA
🏨 Jullie hotel: Ndiza Lodge & Cabanas ✅ Dit hotel HEEFT een restaurant!

⚠️ GEBRUIK DEZE CONTEXT!
- "daar" = St. Lucia
- "het hotel" = Ndiza Lodge & Cabanas
- Als ze vragen "heeft het hotel een restaurant?" → JA!
```

## Usage

### 1. Parse PDF naar Text

Eerst PDF omzetten naar text (handmatig of met tool):

```bash
# Met pdftotext (Linux/Mac)
pdftotext rrp-9033.pdf rrp-9033.txt

# Of kopieer de text uit PDF viewer
```

### 2. Parse Text naar Structured Data

```bash
node parse-trip-pdf-to-structured-data.cjs <trip-id> <pdf-text-file>
```

Voorbeeld:
```bash
node parse-trip-pdf-to-structured-data.cjs \
  a5f77d3d-1a26-4cf0-9e9f-3b0d77a37a63 \
  ./rrp-9033.txt
```

Output:
```
📄 Parsing trip PDF...
📅 Start datum: 2026-01-05
✅ Parsed 28 dagen

✅ Structured metadata:
{
  "itinerary": [...],
  "total_days": 28,
  "start_date": "2026-01-05",
  "end_date": "2026-02-01",
  "route": [
    "Johannesburg",
    "Welgevonden Game Reserve",
    "Tzaneen",
    "Graskop",
    "Piet Retief",
    "St. Lucia",
    "KwaZulu-Natal",
    "Umhlanga",
    "Durban",
    "Port Elizabeth",
    "Addo Elephant National Park",
    "Knysna",
    "Swellendam",
    "Hermanus",
    "Cape Town"
  ]
}

✅ Trip metadata succesvol geüpdatet!

📊 Samenvatting:
   - 28 dagen
   - 15 bestemmingen
   - 7 hotels met restaurant
```

### 3. Add Source URLs (Optioneel)

Voeg externe URLs toe voor real-time info:

```sql
UPDATE trips
SET source_urls = ARRAY[
  'https://www.sanparks.org/parks/addo/',
  'https://www.isimangaliso.com/',
  'https://www.hermanus.co.za/whale-watching/'
]
WHERE id = 'trip-id';
```

TravelBro fetcht deze automatisch tijdens gesprek!

## Wat Parseert De Tool?

### ✅ Extracted Data

1. **Datums**
   - Check-in / Check-out per locatie
   - Aantal nachten
   - Totale reis duur

2. **Hotels**
   - Volledige naam
   - Adres
   - Faciliteiten (pool, wifi, restaurant, bar, spa, etc)
   - Meal plan (Room Only, B&B, Half Board, Full Board)

3. **Locaties**
   - Namen
   - Volgorde (route)
   - Per-dag toewijzing

4. **Activiteiten**
   - Points of Interest uit PDF
   - Standard activities per bestemming type
   - Highlights per dag

### ⚠️ Niet Parsed (Nog)

- Flight details (zit wel in PDF)
- Transport tussen locaties
- Contact informatie
- Pricing
- Booking references

## Supported PDF Formats

De parser werkt met professionele reis PDF's die deze structuur hebben:

### ✅ Ondersteund

- **TourRadar format** (RRP-xxxx)
- **TravelEssence format**
- **Custom itineraries** met:
  - Duidelijke destination headers
  - "Accommodation:" labels
  - Datum formaat: "5 Jan 2026" of "05/01/2026"
  - Nights info

### ❌ Niet Ondersteund

- Fully unstructured text
- Image-only PDFs (OCR needed)
- Custom formats zonder headers

## Database Schema

```sql
-- trips table
CREATE TABLE trips (
  id uuid PRIMARY KEY,
  title text,
  custom_context text,  -- Old format (fallback)
  metadata jsonb,        -- NEW: Structured data
  source_urls text[],    -- URLs to fetch
  created_at timestamptz DEFAULT now()
);

-- Metadata structure:
{
  "itinerary": [...],      -- Array of days
  "total_days": 28,
  "start_date": "2026-01-05",
  "end_date": "2026-02-01",
  "route": [...],          -- Unique locations
  "parsed_from_pdf": true,
  "parsed_at": "2025-..."
}
```

## AI Benefits

Met structured data kan de AI:

1. **Direct Antwoorden**
   ```
   Q: "Heeft het hotel een restaurant?"
   A: "Ja! Ndiza Lodge & Cabanas heeft een restaurant én bar!"
   ```
   (NIET: "Welk hotel bedoel je?")

2. **Context Behouden**
   ```
   Q: "Wat is er te doen in St. Lucia?"
   A: "iSimangaliso Wetland Park, boottocht..."
   Q: "is dat ver van het hotel?"
   A: "Van Ndiza Lodge is het 15 min rijden"
   ```
   (Weet welk hotel!)

3. **Proactieve Suggesties**
   ```
   "Jullie zitten 3 nachten in St. Lucia bij Ndiza Lodge.
    Het hotel heeft een restaurant, dus je hoeft niet ver
    te zoeken voor diner!"
   ```

4. **Accurate Info**
   - Geen raden meer
   - Geen "ik weet het niet"
   - Directe access tot facilities, dates, locations

## Roadmap

### V2 (Volgende Stap)
- [ ] Native PDF parsing (zonder text extract stap)
- [ ] Flight info extraction
- [ ] Price extraction
- [ ] Multi-language support (NL, EN, DE, FR)

### V3 (Toekomst)
- [ ] Image recognition (activiteiten)
- [ ] Automatic activity suggestions from images
- [ ] Map generation from itinerary
- [ ] Day-by-day weather integration

## Testing

Test met dit scenario:

1. Parse RRP-9033 PDF
2. Open TravelBro chat
3. Vraag: "Waar slapen we in St. Lucia?"
4. **Expected:** "Jullie slapen in Ndiza Lodge & Cabanas!"
5. Vraag: "heeft dat hotel een restaurant?"
6. **Expected:** "Ja! Ndiza Lodge heeft een restaurant én bar!"

**VOOR:** Zou vragen "welk hotel bedoel je?"
**NA:** Direct correct antwoord! ✅

## Conclusie

Door professionele reis PDF's te parsen naar structured data:
- ✅ AI weet ALTIJD welk hotel bij welke locatie hoort
- ✅ Geen domme vragen meer
- ✅ Proactieve en accurate antwoorden
- ✅ Externe URLs automatisch gefetcht
- ✅ Real-time up-to-date info

**Result:** TravelBro die echt helpt, niet frustreert! 🎉
