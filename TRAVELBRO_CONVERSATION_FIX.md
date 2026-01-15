# 🗣️ TravelBro Conversatie Fix

## ❌ Het Probleem

TravelBro kon geen gesprek voeren zoals ChatGPT:
- Vergat de context van het gesprek
- Vroeg steeds opnieuw om dezelfde informatie
- Kon niet doorpraten over hetzelfde onderwerp

**Voorbeeld:**
```
User: Vertel over Swellendam
Bot: [geeft info over Swellendam]
User: Is er een restaurant?
Bot: Over welke locatie wil je informatie? ❌
```

Bot snapt niet dat "restaurant" over Swellendam gaat!

## 🔍 De Oorzaak

**KRITIEK BUG**: De conversatie werd **NOOIT opgeslagen** in de database!
- Code las wel `travel_conversations` uit
- Maar schreef er NOOIT naar
- Dus TravelBro had letterlijk geen geheugen

## ✅ De Oplossing

### 1. **Conversatie Opslag Toegevoegd**
```typescript
await supabase.from("travel_conversations").insert([
  { session_token, trip_id, role: "user", message },
  { session_token, trip_id, role: "assistant", message: aiResponse }
]);
```

Nu worden **alle berichten opgeslagen** in de database.

### 2. **Conversation History Verhoogd**
- Van 10 → 20 berichten
- Meer context = beter begrip

### 3. **Expliciete Conversatie Instructies**
```
🗣️ CONVERSATIE CONTEXT & GEHEUGEN:

1. ONTHOUD WAAR HET GESPREK OVER GAAT
2. GEBRUIK CONVERSATIE CONTEXT
3. WEES EEN NATUURLIJKE GESPREKSPARTNER
4. IMPLICIETE REFERENTIES ("daar", "dat hotel")
5. CONVERSATIE FLOW (bouw voort op eerdere berichten)
```

### 4. **Recente Context Samenvatting**
De laatste 3 berichten worden expliciet getoond:
```
💬 RECENTE CONVERSATIE CONTEXT:
👤 Reiziger: Vertel over Swellendam
🤖 TravelBRO: [info]
👤 Reiziger: Is er een restaurant?

⚠️ GEBRUIK DEZE CONTEXT!
```

### 5. **Model & Temperature Optimalisatie**
- Model: `gpt-4o-mini` (sneller, goedkoper, even goed voor gesprekken)
- Temperature: 0.8 (natuurlijker, meer gevarieerd)
- Max tokens: 2000 (genoeg ruimte voor uitgebreide antwoorden)

## 🎯 Resultaat

TravelBro werkt nu zoals ChatGPT:

```
User: Vertel over Swellendam
Bot: Swellendam is een prachtig historisch stadje in de Western Cape...

User: Is er een restaurant?
Bot: In Swellendam zijn er prima restaurants zoals... ✅

User: En een supermarkt?
Bot: Ook supermarkten zijn er genoeg in Swellendam... ✅

User: Hoe ver is het hotel?
Bot: Het hotel in Swellendam ligt ongeveer 2km van het centrum... ✅
```

## 📊 Database Schema Check

De `travel_conversations` tabel moet deze structuur hebben:

```sql
CREATE TABLE travel_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id),
  role text NOT NULL, -- 'user' of 'assistant'
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conversations_session ON travel_conversations(session_token);
CREATE INDEX idx_conversations_created ON travel_conversations(created_at);
```

## 🚀 Deployment

```bash
# Deploy de edge function
supabase functions deploy travelbro-chat

# Test de conversatie
# Stel 3 vragen in WhatsApp over hetzelfde onderwerp
# TravelBro moet nu context onthouden!
```

## 🔍 Debug Query

Check of conversaties worden opgeslagen:

```sql
SELECT
  role,
  LEFT(message, 50) as preview,
  created_at
FROM travel_conversations
WHERE session_token = 'YOUR_SESSION_TOKEN'
ORDER BY created_at DESC
LIMIT 10;
```

Als dit leeg is → berichten worden niet opgeslagen!

## 📈 Performance Tips

1. **Conversation Cleanup**: Oude conversaties periodiek opschonen
```sql
DELETE FROM travel_conversations
WHERE created_at < NOW() - INTERVAL '30 days';
```

2. **Index Optimization**: Zorg dat indexes aanwezig zijn
```sql
CREATE INDEX IF NOT EXISTS idx_conversations_session_created
ON travel_conversations(session_token, created_at DESC);
```

3. **Conversation Limit**: Bij zeer lange gesprekken (>50 berichten):
   - Alleen laatste 20 laden (huidige setting)
   - Of: sliding window met samenvatting

## 🎓 Wat Hebben We Geleerd?

1. **Conversation History ≠ Conversation Storage**
   - Je kunt history ophalen...
   - Maar als je niet opslaat, blijft de database leeg!

2. **Expliciete Context Werkt Beter**
   - Niet alleen history in messages array
   - Ook expliciete "laatste 3 berichten" samenvatting
   - Plus duidelijke instructies over context gebruiken

3. **Temperature Matters**
   - 0.7 = safe maar soms te stijf
   - 0.8 = natuurlijker, menselijker
   - 0.9+ = te random, onvoorspelbaar

4. **Model Keuze**
   - GPT-4o = duur, overkill voor chat
   - GPT-4o-mini = perfect voor conversaties
   - Sneller, goedkoper, prima kwaliteit
