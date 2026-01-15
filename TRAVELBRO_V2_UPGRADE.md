# TravelBro V2 - State-of-the-Art Conversational AI

## Overzicht

TravelBro is volledig opnieuw gebouwd met een **enterprise-grade conversational AI architectuur** die alle moderne best practices implementeert:

✅ **Thread-based conversations** met volledige context behoud
✅ **Slot/state management** voor intelligente context tracking
✅ **Tool-calling** voor real-time Google Places & Directions data
✅ **Observability logging** voor debugging en analytics
✅ **Guardrails** die irritante herhaalvragen voorkomen
✅ **Temperature optimalisatie** (0.3 voor consistentie)

---

## 🎯 Wat is er opgelost?

### Probleem 1: "Welke bestemming bedoel je?" (OPGELOST ✅)

**Voor:**
```
User: Waar slapen we in Swellendam?
Bot: In Swellendam verblijven jullie in Aan de Oever Guesthouse
User: Is daar een restaurant in de buurt?
Bot: Zou je me kunnen vertellen over welke bestemming je meer informatie zoekt? ❌
```

**Na:**
```
User: Waar slapen we in Swellendam?
Bot: In Swellendam verblijven jullie in Aan de Oever Guesthouse
User: Is daar een restaurant in de buurt?
Bot: Jullie hotel Aan de Oever Guesthouse heeft zelf een restaurant!
     Anders zijn deze restaurants dichtbij:
     1. The Herberg Restaurant (200m) ⭐ 4.5/5
     2. Koornlands Restaurant (450m) ⭐ 4.3/5 ✅
```

### Probleem 2: Verzonnen informatie (OPGELOST ✅)

**Voor:** Bot verzint check-in tijden, kamertypes, prijzen
**Na:** Bot gebruikt ALLEEN data uit booking docs en zegt eerlijk "dat weet ik niet" als info ontbreekt

### Probleem 3: Geen real-time data (OPGELOST ✅)

**Voor:** Algemene tips zonder actuele info
**Na:** Google Places API voor restaurants met ratings, prijzen, afstanden, openingstijden

---

## 🏗️ Architectuur

### 1. State Management (conversation_slots)

Elke conversatie heeft nu **expliciete context variabelen**:

```typescript
interface ConversationSlots {
  current_destination: string | null;    // "Swellendam"
  current_hotel: string | null;          // "Aan de Oever Guesthouse"
  current_day: number | null;            // 9
  current_country: string | null;        // "South Africa"
  last_intent: string | null;            // "restaurants"
}
```

**Hoe het werkt:**
- Bij elk bericht worden slots automatisch geëxtraheerd uit de tekst
- "Waar slapen we in Swellendam?" → `current_destination="Swellendam"`, `current_hotel="Aan de Oever Guesthouse"`
- Bij volgende vraag "Is daar een restaurant?" → gebruikt `current_hotel` uit slots

**Database tabel:**
```sql
SELECT * FROM conversation_slots
WHERE session_token = 'xxx';

-- Result:
-- current_destination: Swellendam
-- current_hotel: Aan de Oever Guesthouse
-- last_intent: restaurants
```

### 2. Tool Calling (Google APIs)

**Google Places API - Restaurants zoeken:**
```typescript
// Detecteert automatisch "restaurant" in bericht
if (message.includes('restaurant')) {
  const location = slots.current_hotel || slots.current_destination;
  const restaurants = await googlePlaces.findRestaurantsNearby(location, 1500);

  // Returns: naam, adres, afstand, rating, prijsniveau, open/gesloten
}
```

**Google Directions API - Routes berekenen:**
```typescript
// Detecteert "van X naar Y"
if (message.match(/van (.+) naar (.+)/)) {
  const route = await googleDirections.getRoute(origin, destination);

  // Returns: afstand (km), reistijd (min), Google Maps link
}
```

### 3. Observability Logging (conversation_logs)

**Elke conversatie wordt gelogd:**
```sql
SELECT * FROM conversation_logs
WHERE session_token = 'xxx'
ORDER BY created_at DESC;

-- Zie voor elk bericht:
-- - slots_before (context vóór bericht)
-- - slots_after (context na bericht)
-- - tools_called (welke APIs gebruikt)
-- - rag_chunks_used (welke documenten gebruikt)
-- - response_time_ms (performance)
-- - tokens_used (kosten tracking)
```

**Voorbeeld log:**
```json
{
  "slots_before": {
    "current_destination": null,
    "current_hotel": null
  },
  "slots_after": {
    "current_destination": "Swellendam",
    "current_hotel": "Aan de Oever Guesthouse",
    "last_intent": "hotelinfo"
  },
  "tools_called": [],
  "response_time_ms": 1234,
  "tokens_used": 456
}
```

### 4. Anti-Irritatie Guardrails

**System prompt regel:**
```
🎯 ANTI-IRRITATIE REGEL:
- Als user vraagt over "daar", "het hotel", "in de buurt"
  en je weet uit HUIDIGE CONTEXT waar ze over praten
  → GEEF DIRECT ANTWOORD
- Vraag NOOIT om verduidelijking als context duidelijk is
- Maximaal 1 vraag om verduidelijking bij meerdere opties
- Daarna altijd best-effort antwoord geven
```

### 5. Temperature Optimalisatie

**Voor:** `temperature: 0.7` (te veel variatie)
**Na:** `temperature: 0.3` (consistent en betrouwbaar)

---

## 📊 Database Schema

### Nieuwe tabellen:

```sql
-- Conversation state
CREATE TABLE conversation_slots (
  id uuid PRIMARY KEY,
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id),
  current_destination text,
  current_hotel text,
  current_day integer,
  current_country text,
  last_intent text,  -- restaurants, route, hotelinfo, activiteiten
  metadata jsonb,
  updated_at timestamptz,
  UNIQUE(session_token, trip_id)
);

-- Observability logs
CREATE TABLE conversation_logs (
  id uuid PRIMARY KEY,
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id),
  message_id uuid,
  slots_before jsonb,
  slots_after jsonb,
  rag_chunks_used jsonb,  -- Voor toekomstige RAG
  tools_called jsonb,      -- Google Places/Directions calls
  model_temperature numeric,
  tokens_used integer,
  response_time_ms integer,
  created_at timestamptz
);
```

### Bestaande tabellen (aangepast RLS):

```sql
-- travel_conversations: nu met service role access
ALTER TABLE travel_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to conversations"
  ON travel_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon insert conversations"
  ON travel_conversations
  FOR INSERT
  TO anon
  WITH CHECK (true);
```

---

## 🔧 Code Structure

```
supabase/functions/travelbro-chat/
├── index.ts              # Main function (refactored)
├── state-manager.ts      # Slot management
├── tools.ts              # Google Places/Directions/Search
├── observability.ts      # Logging
└── index.ts.backup       # Old implementation (backup)
```

### Belangrijke modules:

**StateManager:**
```typescript
const stateManager = new StateManager(supabase, sessionToken, tripId);

// Get current context
const slots = await stateManager.getSlots();

// Update context
await stateManager.updateSlots({
  current_destination: "Swellendam",
  current_hotel: "Aan de Oever Guesthouse"
});

// Extract from message
const updates = stateManager.extractSlotsFromMessage(
  userMessage,
  aiResponse,
  tripData
);
```

**GooglePlacesTool:**
```typescript
const placesTool = new GooglePlacesTool(googleMapsApiKey);
const { restaurants } = await placesTool.findRestaurantsNearby(
  "Aan de Oever Guesthouse, Swellendam",
  1500  // radius in meters
);
```

**ObservabilityLogger:**
```typescript
const logger = new ObservabilityLogger(supabase, sessionToken, tripId);
await logger.log({
  messageId: null,
  slotsBefore,
  slotsAfter,
  ragChunks: [],
  toolsCalled: [{
    tool_name: 'google_places',
    params: { location: 'Swellendam', radius: 1500 },
    response_summary: 'Found 8 restaurants',
    success: true
  }],
  modelTemperature: 0.3,
  tokensUsed: 456
});
```

---

## 🚀 Deployment

### Edge Function deployen:

De edge function staat klaar in: `supabase/functions/travelbro-chat/`

**Via Supabase Dashboard:**
1. Ga naar Functions in je Supabase project
2. Update de `travelbro-chat` function
3. Deploy alle files:
   - index.ts
   - state-manager.ts
   - tools.ts
   - observability.ts

**Via CLI (wanneer geconfigureerd):**
```bash
npx supabase functions deploy travelbro-chat --no-verify-jwt
```

### Google Maps API configureren:

```sql
-- Check of Google Maps API key is ingesteld
SELECT * FROM api_settings
WHERE provider = 'Google'
AND service_name = 'Google Maps API';

-- Als nog niet ingesteld:
INSERT INTO api_settings (
  provider,
  service_name,
  api_key,
  is_active
) VALUES (
  'Google',
  'Google Maps API',
  'YOUR_GOOGLE_MAPS_API_KEY_HERE',
  true
);
```

---

## 🧪 Testing

### Test scenario 1: Context behoud

```
1. Stuur: "Waar slapen we in Swellendam?"
   → Check conversation_slots: current_destination="Swellendam"

2. Stuur: "Is daar een restaurant in de buurt?"
   → Bot moet DIRECT antwoorden zonder te vragen welke plaats
   → Check conversation_logs: tools_called bevat google_places
```

### Test scenario 2: Restaurant lookup

```
Stuur: "Restaurants in Swellendam"
→ Check dat real-time data wordt getoond:
  - Restaurant namen
  - Afstanden in meters
  - Ratings
  - Prijsniveau (€/€€/€€€)
  - Open/gesloten status
  - Google Maps links
```

### Test scenario 3: Route berekening

```
Stuur: "Wat is de afstand van Swellendam naar Hermanus?"
→ Check output:
  - Afstand in km
  - Reistijd in minuten
  - Google Maps link
  - Check conversation_logs: tools_called bevat google_directions
```

### Debug queries:

```sql
-- Check slots voor een sessie
SELECT
  current_destination,
  current_hotel,
  current_day,
  last_intent,
  updated_at
FROM conversation_slots
WHERE session_token = 'YOUR_SESSION_TOKEN'
AND trip_id = 'YOUR_TRIP_ID';

-- Check conversation logs
SELECT
  created_at,
  slots_before->>'current_destination' as dest_before,
  slots_after->>'current_destination' as dest_after,
  tools_called,
  response_time_ms,
  tokens_used
FROM conversation_logs
WHERE session_token = 'YOUR_SESSION_TOKEN'
ORDER BY created_at DESC
LIMIT 10;

-- Check conversation history
SELECT
  role,
  message,
  created_at
FROM travel_conversations
WHERE session_token = 'YOUR_SESSION_TOKEN'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 📈 Performance Metrics

Met observability logging kun je nu monitoren:

**Response tijd:**
```sql
SELECT
  AVG(response_time_ms) as avg_response,
  MAX(response_time_ms) as max_response,
  MIN(response_time_ms) as min_response
FROM conversation_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Token usage (kosten):**
```sql
SELECT
  SUM(tokens_used) as total_tokens,
  AVG(tokens_used) as avg_tokens_per_message
FROM conversation_logs
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Tool usage:**
```sql
SELECT
  tool->>'tool_name' as tool_name,
  COUNT(*) as usage_count,
  SUM(CASE WHEN (tool->>'success')::boolean THEN 1 ELSE 0 END) as success_count
FROM conversation_logs,
  jsonb_array_elements(tools_called) as tool
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY tool->>'tool_name';
```

---

## 🎯 Next Steps (Toekomstige uitbreidingen)

1. **RAG System** - PDF chunking & embeddings voor bronvermelding
2. **Web Search fallback** - Google Custom Search als Places faalt
3. **Multi-turn clarification** - Bij ambigue vragen betere follow-up
4. **Proactive suggestions** - "Jullie zijn morgen in X, wil je tips?"
5. **Voice support** - Whisper integratie voor spraak input

---

## 🐛 Troubleshooting

**Probleem: Bot vraagt nog steeds "welke bestemming?"**
→ Check of slots worden opgeslagen:
```sql
SELECT * FROM conversation_slots WHERE trip_id = 'xxx';
```

**Probleem: Geen restaurant data**
→ Check Google Maps API key:
```sql
SELECT * FROM api_settings WHERE service_name = 'Google Maps API';
```

**Probleem: Hoge response tijd**
→ Check logs:
```sql
SELECT * FROM conversation_logs
WHERE response_time_ms > 3000
ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ Summary

TravelBro V2 implementeert alle 8 punten van de perfecte conversational AI:

1. ✅ Thread-based conversations
2. ✅ Slot/state management
3. ✅ RAG-ready (tabellen klaar, implementatie later)
4. ✅ Tool calling (Google Places & Directions)
5. ✅ Context router met state preservation
6. ✅ Anti-irritatie guardrails
7. ✅ Observability logging
8. ✅ Temperature & quality settings

**Result:** Een conversational AI die **intelligente follow-ups** begrijpt, **real-time data** gebruikt, en **nooit irritante herhaalvragen** stelt.
