# 🔗 Agent Mobile App - Platform Integration Guide

> **Hoe werkt de mobile app samen met het web platform?**
> **Voor: Developers die de integratie begrijpen/debuggen**

---

## 🎯 Kern Concept

```
┌──────────────────────────────────────────────────┐
│           SINGLE SUPABASE DATABASE                │
│                                                   │
│  ┌──────────────┐        ┌──────────────┐       │
│  │   Tables     │        │  Auth System │       │
│  │   RLS        │◄───────┤  Edge Funcs  │       │
│  │   Storage    │        │  Real-time   │       │
│  └──────────────┘        └──────────────┘       │
└───────┬─────────────────────────┬────────────────┘
        │                         │
        ↓                         ↓
┌───────────────────┐    ┌────────────────────┐
│  WEB PLATFORM     │    │  MOBILE APP        │
│  (Bolt Env #1)    │    │  (Bolt Env #2)     │
│  ═════════════    │    │  ══════════        │
│  React + Vite     │    │  React Native      │
│  Web Dashboard    │    │  Agent Focus       │
│  All User Roles   │    │  Agent Only        │
└───────────────────┘    └────────────────────┘
```

**Belangrijkste Regel:**
**De mobile app is GEEN aparte applicatie. Het is een extra interface op dezelfde database!**

---

## 📊 Data Flow Voorbeelden

### Voorbeeld 1: Agent Maakt Offer in Mobile App

```
┌─────────────────────────────────────────────────────────────────┐
│ MOBILE APP (Agent onderweg)                                     │
└──┬──────────────────────────────────────────────────────────────┘
   │
   │ 1. Agent spreekt offer in
   │ 2. Audio → Supabase Storage
   │ 3. Call Edge Function: transcribe-audio
   │ 4. Call Edge Function: generate-offer-from-voice
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ SUPABASE (Shared Backend)                                        │
│ ──────────────────────────────────────────────────────────────── │
│ 1. Store audio file in Storage bucket                            │
│ 2. Transcribe via OpenAI Whisper (Edge Function)                 │
│ 3. Generate structured offer via GPT-4 (Edge Function)           │
│ 4. INSERT into trips table (if new)                              │
│ 5. INSERT into brand_trip_assignments (is_published: false)      │
│ 6. Trigger real-time event                                       │
└──┬───────────────────────────────────────────────────────────────┘
   │
   │ 6. Real-time subscription triggers
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ WEB DASHBOARD (Brand user)                                       │
│ ──────────────────────────────────────────────────────────────── │
│ 1. Receives real-time INSERT event                               │
│ 2. Shows notification: "Nieuwe offer van [agent name]!"          │
│ 3. Updates TripApproval component                                │
│ 4. Brand user can view/edit/approve                              │
└──────────────────────────────────────────────────────────────────┘
```

### Voorbeeld 2: Brand Keurt Offer Goed in Web

```
┌─────────────────────────────────────────────────────────────────┐
│ WEB DASHBOARD (Brand user)                                      │
└──┬──────────────────────────────────────────────────────────────┘
   │
   │ 1. Brand clicks "Goedkeuren"
   │ 2. UPDATE brand_trip_assignments SET is_published = true
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ SUPABASE (Shared Backend)                                        │
│ ──────────────────────────────────────────────────────────────── │
│ 1. UPDATE executes                                                │
│ 2. RLS policies check (brand owns this assignment?)              │
│ 3. Update successful                                              │
│ 4. Trigger real-time UPDATE event                                │
│ 5. (Optional) Trigger push notification via Edge Function        │
└──┬───────────────────────────────────────────────────────────────┘
   │
   │ 4-5. Real-time + push notification
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ MOBILE APP (Agent krijgt update)                                 │
│ ──────────────────────────────────────────────────────────────── │
│ 1. Real-time subscription receives UPDATE event                  │
│ 2. Push notification shows: "Offer Goedgekeurd! 🎉"             │
│ 3. Dashboard refreshes                                            │
│ 4. Status changes from "Pending" → "Approved"                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security & Access Control

### RLS Policies Zorgen Voor Isolatie

Beide apps gebruiken **dezelfde Supabase client** met **anon key**.
Security wordt gehandeld door **Row Level Security (RLS) policies** in de database.

#### Agent User in Mobile App:

```sql
-- Agent kan alleen lezen wat van zijn brand is
CREATE POLICY "Agents can read their brand's trips"
ON trips FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT trip_id FROM brand_trip_assignments
    WHERE brand_id = (
      SELECT brand_id FROM agents WHERE user_id = auth.uid()
    )
  )
);

-- Agent kan alleen offers maken voor zijn brand
CREATE POLICY "Agents can create assignments for their brand"
ON brand_trip_assignments FOR INSERT
TO authenticated
WITH CHECK (
  brand_id = (
    SELECT brand_id FROM agents WHERE user_id = auth.uid()
  )
  AND is_published = false  -- Moet via brand approval!
);

-- Agent kan NIET direct trips wijzigen
-- (Geen UPDATE policy voor agents op trips table)
```

#### Brand User in Web Dashboard:

```sql
-- Brand kan trips van hun brand lezen
CREATE POLICY "Brands can read their trips"
ON trips FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT trip_id FROM brand_trip_assignments
    WHERE brand_id = (
      SELECT id FROM brands WHERE id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  )
);

-- Brand kan assignments goedkeuren/afwijzen
CREATE POLICY "Brands can update their assignments"
ON brand_trip_assignments FOR UPDATE
TO authenticated
USING (brand_id IN (
  SELECT brand_id FROM users WHERE id = auth.uid()
))
WITH CHECK (brand_id IN (
  SELECT brand_id FROM users WHERE id = auth.uid()
));
```

**Resultaat:**
- Agent ziet alleen data van hun brand
- Brand ziet alleen hun eigen data
- Geen cross-contamination mogelijk
- Database enforced, niet app logic!

---

## 🔄 Real-time Synchronisatie

### Hoe Werkt Real-time?

Beide apps **subscriben op dezelfde Postgres changes**:

```typescript
// In WEB DASHBOARD (Brand user)
const subscription = supabase
  .channel('brand_offers')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'brand_trip_assignments',
    filter: `brand_id=eq.${brandId}`
  }, (payload) => {
    // Nieuwe offer van agent!
    console.log('New offer:', payload.new);
    showNotification('Nieuwe offer van agent!');
    refreshOffersList();
  })
  .subscribe();
```

```typescript
// In MOBILE APP (Agent user)
const subscription = supabase
  .channel('my_offers')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'brand_trip_assignments',
    filter: `metadata->>agent_id=eq.${agentId}`
  }, (payload) => {
    // Offer status update van brand!
    if (payload.new.is_published && !payload.old.is_published) {
      console.log('Offer approved!');
      showPushNotification('Je offer is goedgekeurd! 🎉');
      refreshDashboard();
    }
  })
  .subscribe();
```

### Real-time Events Die Relevant Zijn:

| Event | Table | Trigger | Web Listens? | Mobile Listens? |
|-------|-------|---------|--------------|-----------------|
| **INSERT** | `brand_trip_assignments` | Agent submit offer | ✅ Yes | ❌ No |
| **UPDATE** | `brand_trip_assignments` | Brand approves/rejects | ❌ No | ✅ Yes |
| **INSERT** | `travel_intakes` | New client lead (WhatsApp) | ✅ Yes | ✅ Yes |
| **UPDATE** | `trips` | Brand edits trip | ❌ No | ✅ Yes (refresh) |
| **UPDATE** | `brands` | Brand updates settings | ❌ No | ✅ Yes (refresh) |
| **INSERT** | `trip_participants` | New client added | ✅ Yes | ✅ Yes |

---

## 🎨 UI/UX Verschillen

Hoewel dezelfde data, is de **presentatie verschillend**:

### Web Dashboard (Brand Focus)

```typescript
// Comprehensive CMS interface
<BrandDashboard>
  <PageManagement />        // Manage website pages
  <NewsApproval />          // Approve/reject news
  <TripApproval />          // Approve/reject agent offers
  <DestinationManagement /> // Full destination editor
  <MenuBuilder />           // Website menu builder
  <AgentManagement />       // Manage agents
  <DomainSettings />        // Website domains
  // ... etc (50+ components!)
</BrandDashboard>
```

### Mobile App (Agent Focus)

```typescript
// Simplified, mobile-optimized interface
<AgentApp>
  <Dashboard />             // Quick stats & pending items
  <TripCatalog />          // Browse available trips
  <VoiceOfferCreator />    // Voice-to-offer (MAIN FEATURE)
  <ClientList />           // Simple client management
  <AgentProfile />         // Profile view/edit
  // That's it! ~5 main screens
</AgentApp>
```

**Design Philosophy:**

- **Web:** "I need full control and detail"
- **Mobile:** "I need quick actions on-the-go"

---

## 🔌 API & Edge Functions

### Welke Edge Functions Gebruikt Mobile App?

#### ✅ Bestaande Functions (Hergebruik)

| Function | Gebruik in Mobile | Beschrijving |
|----------|-------------------|--------------|
| `generate-content` | Content generatie | Voor AI-assisted offer descriptions |
| `google-places-autocomplete` | Location search | Voor destination search in offers |
| `send-whatsapp` | Client contact | Send WhatsApp messages to clients |
| `helpbot-chat` | In-app assistant | Optional AI help for agents |
| `brand-settings-api` | Brand data | Get brand colors/logo for theming |

#### 🆕 Nieuwe Functions (Web team moet maken)

| Function | Voor Wie? | Beschrijving |
|----------|-----------|--------------|
| `transcribe-audio` | **Mobile** | Convert voice recording to text (Whisper API) |
| `generate-offer-from-voice` | **Mobile** | Structure transcript into offer (GPT-4) |
| `register-push-token` | **Mobile** | Save device push token for notifications |

### Voorbeeld: Nieuwe Edge Function Request

**Mobile app roept aan:**
```typescript
// In mobile app
const { data, error } = await supabase.functions.invoke('transcribe-audio', {
  body: {
    audioUrl: publicAudioUrl,  // Uploaded to Supabase Storage
    language: 'nl',
  }
});

// Returns: { text: "Dit is de getranscribeerde tekst..." }
```

**Web platform moet maken:**
```typescript
// supabase/functions/transcribe-audio/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { audioUrl, language = 'nl' } = await req.json();

  // Download audio from URL
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();

  // Send to OpenAI Whisper
  const formData = new FormData();
  formData.append('file', audioBlob);
  formData.append('model', 'whisper-1');
  formData.append('language', language);

  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    },
    body: formData,
  });

  const { text } = await whisperResponse.json();

  return new Response(JSON.stringify({ text }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 💾 Shared Database Tables

### Tables Die Door Beide Apps Gebruikt Worden

#### 1. `agents` (Profile Data)

**Mobile:** Leest eigen profile, kan bijwerken
**Web:** Brand kan agent profiles bekijken, operator kan alles

```sql
SELECT * FROM agents
WHERE user_id = auth.uid();  -- Mobile: own profile
-- VS
SELECT * FROM agents
WHERE brand_id = $1;  -- Web: all agents of brand
```

#### 2. `trips` (Trip Catalog)

**Mobile:** Leest assigned trips (via brand_trip_assignments)
**Web:** Full CRUD voor brand's trips

```sql
-- Mobile: read-only via assignments
SELECT t.* FROM trips t
INNER JOIN brand_trip_assignments bta ON t.id = bta.trip_id
WHERE bta.brand_id = (SELECT brand_id FROM agents WHERE user_id = auth.uid())
AND bta.is_published = true;

-- Web: full access
SELECT * FROM trips
WHERE id IN (
  SELECT trip_id FROM brand_trip_assignments WHERE brand_id = $1
);
```

#### 3. `brand_trip_assignments` (Approval Queue)

**Mobile:** INSERT only (submit offers)
**Web:** Full control (approve/reject/edit)

```sql
-- Mobile: submit new offer
INSERT INTO brand_trip_assignments (
  brand_id,
  trip_id,
  is_published,  -- ALWAYS false!
  metadata
) VALUES (
  (SELECT brand_id FROM agents WHERE user_id = auth.uid()),
  $1,
  false,
  jsonb_build_object('agent_id', (SELECT id FROM agents WHERE user_id = auth.uid()))
);

-- Web: approve offer
UPDATE brand_trip_assignments
SET is_published = true,
    approved_at = now(),
    approved_by = auth.uid()
WHERE id = $1
AND brand_id = $2;
```

#### 4. `travel_intakes` (Client Leads)

**Mobile:** Read leads for follow-up
**Web:** Full management + TravelBro integration

```sql
-- Both read same data (filtered by brand_id)
SELECT * FROM travel_intakes
WHERE brand_id = (
  -- Mobile:
  SELECT brand_id FROM agents WHERE user_id = auth.uid()
  -- Web:
  -- User is already brand scoped
);
```

#### 5. `trip_participants` (Client Contacts)

**Mobile:** Create + update client contacts
**Web:** View all clients, full management

```sql
-- Mobile: add client
INSERT INTO trip_participants (
  brand_id,
  trip_id,
  name,
  email,
  phone,
  notes,
  status
) VALUES (
  (SELECT brand_id FROM agents WHERE user_id = auth.uid()),
  $1, $2, $3, $4, $5, 'lead'
);

-- Both can update
UPDATE trip_participants
SET status = $1, notes = $2
WHERE id = $3
AND brand_id = ...;  -- RLS enforces brand scope
```

---

## 🧪 Testing Integratie

### Test Scenario 1: End-to-End Offer Flow

**Setup:**
1. Login als agent in mobile app
2. Login als brand (van dezelfde brand!) in web dashboard

**Test:**
1. ✅ Mobile: Maak voice offer
2. ✅ Mobile: Submit offer
3. ✅ Web: Zie real-time notificatie van nieuwe offer
4. ✅ Web: Open TripApproval, zie offer in lijst
5. ✅ Web: Bewerk en approve offer
6. ✅ Mobile: Krijg push notification "Goedgekeurd!"
7. ✅ Mobile: Zie offer status change in dashboard

### Test Scenario 2: Client Lead Flow

**Setup:**
1. Login als agent in mobile app
2. Simuleer TravelBro intake (of maak handmatig in web)

**Test:**
1. ✅ Web: Create travel_intake entry
2. ✅ Mobile: Zie real-time update in clients lijst
3. ✅ Mobile: Open client detail
4. ✅ Mobile: Update status naar "contacted"
5. ✅ Web: Zie status update in real-time
6. ✅ Both: Kunnen notities toevoegen/lezen

### Test Scenario 3: Brand Settings Update

**Setup:**
1. Login als brand in web
2. Mobile app open op agent dashboard

**Test:**
1. ✅ Web: Update brand logo/colors
2. ✅ Mobile: Zie real-time update van brand styling
3. ✅ Mobile: App herlaadt met nieuwe brand theme

---

## 🐛 Debugging Tips

### RLS Debug Query

Als mobile app geen data ziet maar web wel:

```sql
-- Test in Supabase SQL editor met agent's JWT
SET request.jwt.claims = '{"sub": "agent-user-id"}';

-- Probeer query
SELECT * FROM trips
WHERE id IN (
  SELECT trip_id FROM brand_trip_assignments
  WHERE brand_id = (
    SELECT brand_id FROM agents WHERE user_id = current_setting('request.jwt.claims')::json->>'sub'
  )
);

-- Geen results? Dan is RLS policy te restrictief!
```

### Real-time Debug

```typescript
// Add verbose logging
const subscription = supabase
  .channel('debug-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'brand_trip_assignments'
  }, (payload) => {
    console.log('🔥 REALTIME EVENT:', {
      event: payload.eventType,
      table: payload.table,
      old: payload.old,
      new: payload.new,
      errors: payload.errors
    });
  })
  .subscribe((status, err) => {
    console.log('📡 Subscription status:', status);
    if (err) console.error('❌ Subscription error:', err);
  });
```

### Edge Function Debug

```typescript
// In mobile app
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { test: 'data' }
});

console.log('Edge Function Response:', { data, error });

// Check logs in Supabase Dashboard:
// Project > Edge Functions > [function name] > Logs
```

---

## 📋 Checklist Voor Succesvolle Integratie

### Voor Mobile App Developer:

- [ ] Supabase client gebruikt **zelfde URL + anon key**
- [ ] Auth flow werkt (login → check agent role → load profile)
- [ ] Alle queries hebben **brand_id filter** (RLS compliance)
- [ ] Real-time subscriptions subscribed op **juiste events**
- [ ] Push tokens worden **opgeslagen in database**
- [ ] Error handling voor **offline scenarios**
- [ ] Type definitions zijn **exact kopie van web** (`types/database.ts`)

### Voor Web Platform Team:

- [ ] **Edge Functions** `transcribe-audio` en `generate-offer-from-voice` gemaakt
- [ ] **Storage bucket** `voice-recordings` bestaat met juiste RLS
- [ ] **RLS policies** voor agents zijn correct (read assignments, insert only)
- [ ] **Real-time** is enabled op relevante tables
- [ ] **TripApproval** component heeft subscription op new assignments
- [ ] **Test agent account** bestaat met juiste brand_id

### Voor Database Admin:

- [ ] RLS enabled op **alle tables**
- [ ] Agent policies zijn **restrictief** (geen admin data lekken)
- [ ] Real-time is **enabled** op: `brand_trip_assignments`, `travel_intakes`, `trip_participants`
- [ ] **Indexes** op: `brand_trip_assignments.metadata->>agent_id`, `travel_intakes.brand_id`, `trip_participants.brand_id`

---

## 🚨 Common Pitfalls

### ❌ Pitfall 1: Direct Trip Updates

```typescript
// WRONG! Agent mag niet direct trips table wijzigen
await supabase
  .from('trips')
  .update({ title: 'New Title' })
  .eq('id', tripId);

// ✅ CORRECT! Agent submit via assignment met metadata
await supabase
  .from('brand_trip_assignments')
  .insert({
    brand_id: agent.brand_id,
    trip_id: tripId,
    is_published: false,  // Brand moet approven!
    metadata: {
      agent_id: agent.id,
      custom_title: 'New Title',  // Suggestie voor brand
    }
  });
```

### ❌ Pitfall 2: Bypassing RLS

```typescript
// WRONG! Service role key in mobile app
const supabase = createClient(url, SERVICE_ROLE_KEY);  // 🚨 NOOIT DOEN!

// ✅ CORRECT! Gebruik anon key, RLS enforces security
const supabase = createClient(url, ANON_KEY);
```

### ❌ Pitfall 3: Geen Brand Filter

```typescript
// WRONG! Haalt alle trips op (RLS blokkeert dit toch)
const { data } = await supabase
  .from('trips')
  .select('*');

// ✅ CORRECT! Expliciet filter op brand via assignments
const { data } = await supabase
  .from('trips')
  .select('*, brand_trip_assignments!inner(brand_id)')
  .eq('brand_trip_assignments.brand_id', agent.brand_id)
  .eq('brand_trip_assignments.is_published', true);
```

---

## 🎯 Deployment Checklist

### Pre-Launch

- [ ] **Test accounts** aangemaakt (agent + brand van zelfde brand)
- [ ] **Real-time** getest met beide apps tegelijk open
- [ ] **Push notifications** getest op fysieke devices
- [ ] **Edge Functions** deployed en getest
- [ ] **Storage buckets** hebben juiste CORS settings
- [ ] **RLS policies** reviewed door security team

### Launch

- [ ] **Monitoring** setup voor Edge Function errors
- [ ] **Analytics** tracking voor voice offer conversions
- [ ] **Support docs** voor agents (hoe voice gebruiken)
- [ ] **Brand onboarding** doc (nieuwe feature announcement)

### Post-Launch

- [ ] **Usage metrics** bijhouden (voice offers per day)
- [ ] **Error rates** monitoren (transcription failures)
- [ ] **User feedback** verzamelen (NPS voor mobile app)

---

## 📚 Gerelateerde Documenten

- `AGENT_MOBILE_APP_BRIEFING.md` - Complete build specs voor mobile app
- `EXTERNAL_BUILDER_TEMPLATE_SPEC.md` - Hoe external builders werken (vergelijkbaar patroon)
- `SECURITY.md` - RLS policies en security guidelines
- `supabase/migrations/*` - Database schema en policies
- `src/types/database.ts` - TypeScript types (te kopiëren naar mobile)

---

## 🎉 Success!

**Als je dit document hebt gelezen en begrepen, ben je klaar om:**

1. ✅ Mobile app te bouwen die perfect integreert
2. ✅ Web platform uit te breiden met nodige Edge Functions
3. ✅ Real-time sync te implementeren tussen beide apps
4. ✅ Security en RLS correct te hanteren
5. ✅ Debugging te doen als iets niet werkt

**De platforms zijn nu één! 🚀**

---

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Maintained By:** Platform Team
