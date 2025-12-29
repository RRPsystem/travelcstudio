# TravelBro Troubleshooting Guide

## 🔍 Waar checken als TravelBro niet werkt

### 1. **Database Tables Check**
Controleer of deze tables bestaan en data hebben:

```sql
-- Check if travel_trips table has active trips
SELECT id, name, share_token, is_active, whatsapp_enabled
FROM travel_trips
WHERE is_active = true
LIMIT 5;

-- Check if table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('travel_trips', 'travel_intakes', 'travel_conversations', 'travel_whatsapp_sessions');
```

**Verwacht resultaat:** Alle 4 tables moeten bestaan

---

### 2. **API Settings Check**
TravelBro heeft OpenAI API key nodig:

```sql
-- Check OpenAI API settings
SELECT
  provider,
  service_name,
  is_active,
  CASE WHEN api_key IS NOT NULL THEN '✅ API key set' ELSE '❌ NO API KEY' END as key_status
FROM api_settings
WHERE provider = 'OpenAI'
OR service_name = 'Twilio WhatsApp';

-- Als geen resultaten, check of table bestaat
SELECT COUNT(*) FROM api_settings;
```

**Fix:** Voeg OpenAI key toe via Operator Dashboard → API Settings

---

### 3. **Edge Function Status**
Check of de edge function deployed is:

Via Supabase Dashboard:
1. Ga naar **Edge Functions**
2. Zoek `travelbro-chat`
3. Check of functie deployed is (groen bolletje)
4. Click op functie → **Logs** bekijken

**CLI Check:**
```bash
supabase functions list
```

---

### 4. **RLS Policies Check**
Controleer Row Level Security policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('travel_trips', 'travel_intakes', 'travel_conversations');

-- Check anon access policies voor travel_trips
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'travel_trips'
AND roles @> ARRAY['anon'];
```

**Verwacht:**
- `rowsecurity` moet `true` zijn
- Moet policy hebben: "Public can view trips via share token"

---

### 5. **Frontend Error Check**
Open browser Console (F12) en check:

**Verwachte logs:**
```
✅ Trip loaded: <trip_id>
✅ Session created: <session_token>
```

**Error patronen:**
```
❌ "Trip not found" → share_token klopt niet
❌ "API key not found" → OpenAI key niet configured
❌ "403 Forbidden" → RLS policy probleem
❌ "Function not found" → Edge function niet deployed
```

---

### 6. **Test Query**
Volledige test om te checken of een trip bereikbaar is:

```sql
-- Test trip access (vervang <YOUR_SHARE_TOKEN>)
WITH trip_check AS (
  SELECT
    id,
    name,
    share_token,
    is_active,
    brand_id,
    CASE WHEN parsed_data IS NOT NULL THEN '✅' ELSE '❌' END as has_data,
    CASE WHEN is_active THEN '✅ Active' ELSE '❌ Inactive' END as status
  FROM travel_trips
  WHERE share_token = '<YOUR_SHARE_TOKEN>'
)
SELECT * FROM trip_check;
```

---

## 🚨 Meest Voorkomende Problemen

### Probleem 1: "Trip not found"
**Oorzaak:** Geen actieve trip met deze share_token
**Fix:**
```sql
-- Check of trip bestaat en is_active = true
UPDATE travel_trips
SET is_active = true
WHERE share_token = '<YOUR_SHARE_TOKEN>';
```

### Probleem 2: "API Error" / No response
**Oorzaak:** OpenAI API key niet ingesteld
**Fix:**
1. Ga naar Operator Dashboard
2. API Settings
3. Voeg OpenAI API key toe
4. Save & test

### Probleem 3: CORS errors
**Oorzaak:** Edge function CORS headers
**Fix:** Functie heeft correct CORS (al geïmplementeerd in code)

### Probleem 4: "Session error"
**Oorzaak:** travel_intakes of travel_whatsapp_sessions probleem
**Fix:**
```sql
-- Check session tables
SELECT COUNT(*) FROM travel_intakes;
SELECT COUNT(*) FROM travel_whatsapp_sessions;
```

---

## 📊 Complete Health Check Query

Voer deze query uit voor een complete check:

```sql
SELECT
  'Tables' as check_type,
  COUNT(*) as count,
  'Should be 4' as expected
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('travel_trips', 'travel_intakes', 'travel_conversations', 'travel_whatsapp_sessions')

UNION ALL

SELECT
  'Active Trips' as check_type,
  COUNT(*)::text as count,
  'Should be > 0' as expected
FROM travel_trips
WHERE is_active = true

UNION ALL

SELECT
  'API Settings' as check_type,
  COUNT(*)::text as count,
  'Should be > 0' as expected
FROM api_settings
WHERE provider = 'OpenAI' AND is_active = true

UNION ALL

SELECT
  'RLS Enabled' as check_type,
  COUNT(*)::text as count,
  'Should be 3' as expected
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('travel_trips', 'travel_intakes', 'travel_conversations')
AND rowsecurity = true;
```

**Verwacht resultaat:**
```
Tables        | 4 | Should be 4
Active Trips  | >0 | Should be > 0
API Settings  | >0 | Should be > 0
RLS Enabled   | 3 | Should be 3
```

---

## 🔧 Quick Fix Checklist

- [ ] Tables bestaan (travel_trips, travel_intakes, travel_conversations, travel_whatsapp_sessions)
- [ ] OpenAI API key ingesteld in api_settings
- [ ] Edge function `travelbro-chat` deployed
- [ ] RLS policies active op tables
- [ ] Minimaal 1 actieve trip (is_active = true)
- [ ] Browser console toont geen CORS errors
- [ ] Share token klopt en trip is vindbaar

---

## 📞 Laatste Test

Direct test vanuit Supabase SQL Editor:

```sql
-- 1. Check trip exists
SELECT id, name, share_token, is_active
FROM travel_trips
WHERE is_active = true
LIMIT 1;

-- 2. Test creating session (gebruik trip_id van stap 1)
INSERT INTO travel_whatsapp_sessions (trip_id, phone_number)
VALUES ('<TRIP_ID>', 'test_phone')
RETURNING *;

-- 3. Test creating intake
INSERT INTO travel_intakes (trip_id, travelers_count)
VALUES ('<TRIP_ID>', 2)
RETURNING id, session_token;
```

Als deze 3 queries werken, dan is de database OK en ligt het probleem waarschijnlijk aan:
- Edge function niet deployed
- OpenAI API key niet ingesteld
- Frontend URL problemen
