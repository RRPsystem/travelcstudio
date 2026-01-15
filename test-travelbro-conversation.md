# 🧪 TravelBro Conversatie Test

## Test Scenario's

### ✅ Test 1: Basis Context Onthouden
**Doel:** Check of TravelBro een onderwerp kan onthouden

```
User: Vertel over Swellendam
Bot: [Geeft informatie over Swellendam]

User: Is er een restaurant?
Bot: ✅ GOED: "In Swellendam zijn er prima restaurants..."
Bot: ❌ FOUT: "Over welke locatie wil je informatie?"
```

### ✅ Test 2: Multi-Turn Gesprek
**Doel:** Check of TravelBro meerdere berichten kan onthouden

```
User: Wat kunnen we doen in Johannesburg?
Bot: [Geeft activiteiten]

User: Hoe duur is dat?
Bot: ✅ GOED: "De activiteiten in Johannesburg kosten..."
Bot: ❌ FOUT: "Waar wil je precies heen?"

User: En hoe kom ik daar?
Bot: ✅ GOED: "Naar Johannesburg kun je..."
```

### ✅ Test 3: Impliciete Referenties
**Doel:** Check of TravelBro "daar", "dat", "die" begrijpt

```
User: We gaan naar Kruger Park
Bot: [Info over Kruger Park]

User: Hoe is het weer daar?
Bot: ✅ GOED: "Het weer in Kruger Park is..."
Bot: ❌ FOUT: "Waar bedoel je precies?"

User: Is dat hotel goed?
Bot: ✅ GOED: "Het hotel in Kruger Park heeft..."
```

### ✅ Test 4: Hotel Context
**Doel:** Check of TravelBro hotel namen onthoudt

```
User: Hoe heet ons eerste hotel?
Bot: [Geeft hotel naam, bijv. "Hotel Johannesburg City"]

User: Heeft het een zwembad?
Bot: ✅ GOED: "Hotel Johannesburg City heeft..."
Bot: ❌ FOUT: "Welk hotel bedoel je?"

User: En WiFi?
Bot: ✅ GOED: "Ja, Hotel Johannesburg City heeft gratis WiFi"
```

### ✅ Test 5: Lange Conversatie
**Doel:** Check of TravelBro >10 berichten kan onthouden

```
Stel 15 vragen achter elkaar over hetzelfde onderwerp.
Bot moet context blijven behouden tot bericht 20 (limit).
```

## 🔍 Verificatie Stappen

### Stap 1: Check Database
Na elke test, run deze query:

```sql
SELECT
  role,
  LEFT(message, 80) as message,
  created_at
FROM travel_conversations
WHERE session_token = 'JOUW_SESSION_TOKEN'
ORDER BY created_at DESC
LIMIT 10;
```

**Verwacht resultaat:**
- ✅ Elk user bericht heeft een assistant antwoord
- ✅ Berichten staan in chronologische volgorde
- ✅ Timestamps zijn recent (< 5 min oud)

### Stap 2: Check Edge Function Logs
```bash
supabase functions logs travelbro-chat
```

**Let op:**
- ✅ Geen errors over "travel_conversations"
- ✅ "conversation history" wordt geladen
- ✅ Berichten worden opgeslagen

### Stap 3: Test Context Summary
In de logs moet je zien:

```
💬 RECENTE CONVERSATIE CONTEXT:
👤 Reiziger: [laatste vraag]
🤖 TravelBRO: [laatste antwoord]
...
```

Dit betekent dat de context summary werkt!

## 🐛 Troubleshooting

### Probleem: "Over welke locatie wil je informatie?"
**Oorzaak:** Context wordt niet gebruikt
**Fix:**
1. Check of `conversationHistory` wordt opgehaald
2. Check of "RECENTE CONVERSATIE CONTEXT" in logs verschijnt
3. Verhoog temperature naar 0.9 (meer creatief = beter begrip)

### Probleem: Geen berichten in database
**Oorzaak:** Berichten worden niet opgeslagen
**Fix:**
1. Check of insert statement wordt uitgevoerd
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'travel_conversations'`
3. Test handmatig insert:
```sql
INSERT INTO travel_conversations (session_token, trip_id, role, message)
VALUES ('test', (SELECT id FROM travel_trips LIMIT 1), 'user', 'test');
```

### Probleem: Oude context wordt gebruikt
**Oorzaak:** Te veel history in database
**Fix:**
```sql
-- Clear old conversations
DELETE FROM travel_conversations
WHERE created_at < NOW() - INTERVAL '1 day'
  AND session_token = 'JOUW_SESSION_TOKEN';
```

### Probleem: Context reset na 10 berichten
**Oorzaak:** Oude limit was 10
**Fix:** Nu 20 berichten limit (al gefixt!)

## 📊 Success Criteria

✅ **PASS** als:
- User kan 5+ vragen stellen zonder locatie te herhalen
- Bot onthoudt hotel namen, plaatsen, activiteiten
- "daar", "dat", "die" worden correct begrepen
- Database bevat alle user + assistant berichten
- Geen "welke locatie?" vragen als context duidelijk is

❌ **FAIL** als:
- Bot vraagt om herhaling na 2-3 berichten
- Database is leeg of heeft gaps
- Bot geeft generieke antwoorden zonder context
- Logs tonen errors over travel_conversations

## 🎯 Real-World Test

**Beste test:** Laat een echte gebruiker 10 minuten chatten!

Als ze zeggen: "Ik hoef niet steeds te herhalen waar ik het over heb" → ✅ SUCCESS!

Als ze zeggen: "Die bot snapt er niks van" → ❌ FAIL

## 📈 Performance Metrics

Track deze metrics:
- Gemiddeld aantal berichten per sessie
- Percentage vragen dat context gebruikt
- User satisfaction (thumbs up/down)
- Conversation drop-off rate

Doel:
- >20 berichten per sessie (langer = beter)
- >80% context usage (hoog = goed geheugen)
- >90% satisfaction (tevreden users)
- <20% drop-off (mensen blijven praten)
