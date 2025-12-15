# Trip WordPress Synchronisatie - Implementatie Samenvatting

## Wat is gebouwd?

### 1. **Edge Function: wordpress-push-trip**
📍 `/supabase/functions/wordpress-push-trip/index.ts`

**Functie**: Pusht geaccepteerde trips van BOLT naar WordPress RRP System plugin.

**Gebruik**:
```bash
POST /functions/v1/wordpress-push-trip
Body: {
  "assignment_id": "uuid-hier"
}
```

**Wat gebeurt er**:
- Haalt trip data op uit `trip_brand_assignments`
- Valideert brand heeft WordPress credentials
- POST of PUT naar WordPress REST API endpoint
- Update `metadata` met `wp_post_id`, `wp_url`, etc.

---

### 2. **Edge Function: wordpress-trip-webhook**
📍 `/supabase/functions/wordpress-trip-webhook/index.ts`

**Functie**: Ontvangt metadata updates van WordPress (booking URLs, WhatsApp, etc.)

**Gebruik**:
```bash
POST /functions/v1/wordpress-trip-webhook
Header: X-Webhook-Secret: {secret}
Body: {
  "wp_post_id": 123,
  "booking_url": "...",
  "whatsapp_number": "...",
  ...
}
```

**Wat gebeurt er**:
- Zoekt assignment op basis van `wp_post_id`
- Update `trip_brand_assignments.metadata`
- Zet `is_published = true` bij `status = publish`

---

### 3. **Database Migration**
📍 Toegepast via Supabase MCP

**Wat is toegevoegd**:
- ✅ `metadata` JSONB kolom op `trip_brand_assignments`
- ✅ GIN index voor snelle `wp_post_id` lookups
- ✅ Index voor `brand_id + wp_post_id` combinatie
- ✅ Comment met metadata structuur documentatie

**Metadata velden**:
```json
{
  "wp_post_id": 123,
  "wp_slug": "reis-slug",
  "wp_url": "https://...",
  "wp_status": "publish",
  "booking_url": "...",
  "contact_button_text": "...",
  "contact_button_url": "...",
  "whatsapp_number": "...",
  "whatsapp_message": "...",
  "last_pushed_at": "...",
  "last_synced_from_wp": "...",
  "wp_published_at": "...",
  "push_status": "success"
}
```

---

### 4. **WordPress Plugin Documentatie**
📍 `/WORDPRESS_RRP_TRIP_SYNC.md`

**Bevat**:
- ✅ REST API endpoint specificaties voor WordPress developer
- ✅ `POST /wp-json/rbs-travel/v1/trips` (create)
- ✅ `PUT /wp-json/rbs-travel/v1/trips/{id}` (update)
- ✅ Webhook implementatie met PHP voorbeelden
- ✅ Meta box voorbeelden voor booking/contact velden
- ✅ Security best practices
- ✅ Testing checklist
- ✅ Complete workflow scenario's

---

## Workflow

### Scenario A: Brand Accepteert Trip

```
1. Brand klikt "Accepteren" in BOLT
   ↓
2. Frontend roept aan: wordpress-push-trip
   ↓
3. BOLT pusht naar WordPress: POST /rbs-travel/v1/trips
   ↓
4. WordPress maakt trip aan (status: draft)
   ↓
5. Brand logt in WordPress, vult booking URL + WhatsApp in
   ↓
6. Brand publiceert trip
   ↓
7. WordPress webhook → wordpress-trip-webhook
   ↓
8. BOLT update: metadata + is_published = true
```

### Scenario B: Content Update

```
1. Admin update trip in BOLT (prijs wijziging)
   ↓
2. Frontend roept aan: wordpress-push-trip (force_update: true)
   ↓
3. BOLT pusht naar WordPress: PUT /rbs-travel/v1/trips/{id}
   ↓
4. WordPress update content (booking velden blijven intact)
```

---

## Nog te doen (WordPress Developer)

### 1. REST API Endpoints Maken
- [ ] `POST /wp-json/rbs-travel/v1/trips`
- [ ] `PUT /wp-json/rbs-travel/v1/trips/{id}`

### 2. Webhook Implementatie
- [ ] `save_post_rbs_travel` hook
- [ ] Metadata versturen naar BOLT
- [ ] Settings pagina voor webhook URL + secret

### 3. Meta Boxes
- [ ] Booking URL veld
- [ ] Contact button velden
- [ ] WhatsApp velden

### 4. Testing
- [ ] Test create via POST
- [ ] Test update via PUT
- [ ] Test webhook naar BOLT
- [ ] Test authenticatie

---

## Frontend Integratie

### In TripApproval Component

Voeg "Push naar WordPress" button toe:

```typescript
const handlePushToWordPress = async (assignmentId: string) => {
  const { data, error } = await supabase.functions.invoke(
    'wordpress-push-trip',
    {
      body: { assignment_id: assignmentId }
    }
  );

  if (error) {
    console.error('Push failed:', error);
    alert('Fout bij pushen naar WordPress');
  } else {
    alert(`Trip gepusht! WordPress ID: ${data.wp_post_id}`);
  }
};
```

### Automatisch Pushen bij Acceptatie

Of automatisch na acceptatie:

```typescript
const handleAcceptTrip = async (assignmentId: string) => {
  // 1. Accepteer trip
  await supabase
    .from('trip_brand_assignments')
    .update({ status: 'accepted' })
    .eq('id', assignmentId);

  // 2. Push naar WordPress
  await supabase.functions.invoke('wordpress-push-trip', {
    body: { assignment_id: assignmentId }
  });
};
```

---

## Configuratie Vereist

### In Brand Settings
Voeg toe aan `brands` tabel (al aanwezig):
- ✅ `wordpress_url`
- ✅ `wordpress_username`
- ✅ `wordpress_app_password`

### Environment Variables (optioneel)
```env
WORDPRESS_WEBHOOK_SECRET=shared-secret-hier
```

---

## Testen

### 1. Test Push naar WordPress
```bash
curl -X POST "$SUPABASE_URL/functions/v1/wordpress-push-trip" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignment_id": "uuid-hier"}'
```

### 2. Test Webhook van WordPress
```bash
curl -X POST "$SUPABASE_URL/functions/v1/wordpress-trip-webhook" \
  -H "X-Webhook-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "wp_post_id": 123,
    "booking_url": "https://booking.example.com/trip/123"
  }'
```

---

## Succesvol! 🎉

Alle BOLT-side implementatie is compleet. WordPress developer kan nu starten met:
1. REST API endpoints bouwen
2. Webhook implementeren
3. Meta boxes toevoegen

De volledige specificatie staat in `WORDPRESS_RRP_TRIP_SYNC.md`.
