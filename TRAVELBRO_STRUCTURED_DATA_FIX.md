# TravelBro - Gestructureerde Data Fix

## Het Probleem 🚨

De AI had ALLE data maar stelde toch domme vragen:
- "welk hotel bedoel je?" → terwijl ze net over St. Lucia praatten
- "welke dam?" → terwijl de AI zelf Tzaneen Dam voorstelde
- "van welk hotel vertrek je?" → terwijl ze daar letterlijk slapen

**Waarom?** De trip data zat in 1 grote tekst blob. De AI moest steeds parsen, raden, zoeken.

## De Oplossing ✅

### 1. Database Structuur
Nieuwe `metadata` structuur in trips tabel:

```json
{
  "itinerary": [
    {
      "day": 5,
      "date": "2025-01-19",
      "location": "St. Lucia",
      "hotel": {
        "name": "Ndiza Lodge & Cabanas",
        "address": "...",
        "amenities": ["restaurant", "bar", "pool", "wifi"],
        "has_restaurant": true
      },
      "activities": ["iSimangaliso Wetland Park", "Boottocht"],
      "highlights": ["Hippos en krokodillen spotten"]
    }
  ],
  "total_days": 21,
  "start_date": "2025-01-15",
  "end_date": "2025-02-04"
}
```

### 2. Database Functies
```sql
-- Waar zijn ze vandaag?
SELECT get_current_trip_day('trip-id');

-- Welk hotel in St. Lucia?
SELECT get_hotel_for_location('trip-id', 'St. Lucia');
```

### 3. Convert Bestaande Trip

```bash
node convert-trip-to-structured-data.cjs <trip-id>
```

Dit script:
- Parset de custom_context
- Maakt structured metadata
- Update de trip in database

### 4. TravelBro Chat Gebruikt Het Automatisch

Als structured data beschikbaar is:
- ✅ Weet direct: St. Lucia = Ndiza Lodge & Cabanas
- ✅ Weet dat hotel restaurant heeft
- ✅ Weet welke activiteiten er zijn
- ✅ Kan direct afstanden berekenen

Fallback:
- Als geen structured data → oude parsing methode

## Extra Verbeteringen 🚀

### 1. Laatste Plaats Tracker
- Onthoudt laatst genoemde plaats
- "is de dam ver?" → weet automatisch welke dam

### 2. Google Search Integratie
- Detecteert weer vragen
- Zoekt actuele info op internet
- Toont top 3 resultaten

### 3. Slimme Afstand Berekening
- "ver?" triggert automatisch Google Routes
- Gebruikt current hotel als startpunt
- Gebruikt laatste plaats als bestemming

### 4. Verboden Vragen List
De AI mag NOOIT meer zeggen:
- "van welk hotel vertrek je?"
- "welke dam bedoel je?"
- "ik heb geen specifieke informatie"

## Deploy Instructies

1. **Migratie is al toegepast** ✅
   - Functies: `get_current_trip_day()`, `get_hotel_for_location()`

2. **Convert een trip:**
   ```bash
   node convert-trip-to-structured-data.cjs <trip-id>
   ```

3. **Deploy travelbro-chat:**
   - Functie gebruikt automatisch structured data als beschikbaar
   - Werkt ook zonder (fallback naar oude methode)

## Test Het

### Voeg structured data toe:
```bash
node convert-trip-to-structured-data.cjs a5f77d3d-1a26-4cf0-9e9f-3b0d77a37a63
```

### Test conversatie:
1. "Wat is er te doen in St. Lucia?"
2. AI: "iSimangaliso Wetland Park, boottocht..."
3. "heeft het hotel waar we zitten een restaurant?"
4. AI: ✅ "Ja! Ndiza Lodge & Cabanas heeft een restaurant!"
   (NIET: "welk hotel bedoel je?")

## Resultaat

**VOOR:**
```
User: "heeft het hotel een restaurant?"
AI: "Kun je me vertellen over welk hotel je het hebt?"
```

**NA:**
```
User: "heeft het hotel een restaurant?"
AI: "Ja! Ndiza Lodge & Cabanas (jullie hotel in St. Lucia) heeft een restaurant én een bar!"
```

## Voordelen

1. ✅ AI weet ALTIJD welk hotel bij welke locatie hoort
2. ✅ AI weet welke voorzieningen hotels hebben
3. ✅ Geen domme verduidelijkingsvragen meer
4. ✅ Sneller: geen parsing nodig
5. ✅ Makkelijk uitbreidbaar: voeg data toe aan metadata
6. ✅ Backward compatible: werkt ook zonder structured data
