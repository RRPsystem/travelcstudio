# WordPress RRP System - Trip Synchronisatie met BOLT

## Overzicht

Dit document beschrijft hoe het RRP System plugin trips synchroniseert met BOLT (Supabase). Er zijn twee flows:

1. **BOLT → WordPress**: Push trip content naar WordPress
2. **WordPress → BOLT**: Sync metadata (booking URLs, contact info) terug

## 1. BOLT → WordPress: POST `/wp-json/rbs-travel/v1/trips`

### Doel
BOLT pusht trip content naar WordPress wanneer een brand een reis accepteert. De brand vult daarna zelf de booking/contact details in.

### Endpoint Details

**URL**: `POST /wp-json/rbs-travel/v1/trips`
**Authenticatie**: Basic Auth (WordPress Application Password)

### Request Headers
```
Content-Type: application/json
Authorization: Basic {base64(username:app_password)}
```

### Request Body
```json
{
  "title": "10 Dagen Thailand Rondreis",
  "slug": "10-dagen-thailand-rondreis",
  "description": "Ontdek de highlights van Thailand in 10 dagen",
  "content": {
    "blocks": [
      {
        "type": "text",
        "content": "Volledige HTML beschrijving van de reis..."
      }
    ]
  },
  "featured_image": "https://example.com/thailand.jpg",
  "price": 1499,
  "duration_days": 10,
  "tc_idea_id": "TH-001",
  "continent": "azie",
  "country": "thailand",
  "status": "draft",
  "booking_url": "",
  "contact_button_text": "",
  "contact_button_url": "",
  "whatsapp_number": "",
  "whatsapp_message": ""
}
```

### Response (Success)
```json
{
  "success": true,
  "id": 123,
  "slug": "10-dagen-thailand-rondreis",
  "edit_url": "https://yoursite.com/wp-admin/post.php?post=123&action=edit"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Invalid authentication"
}
```

## 2. Update Bestaande Trip: PUT `/wp-json/rbs-travel/v1/trips/{id}`

### Doel
Update een bestaande trip in WordPress (content-only, niet metadata).

**URL**: `PUT /wp-json/rbs-travel/v1/trips/{id}`
**Authenticatie**: Basic Auth

### Request Body
Zelfde structuur als POST, maar alleen de velden die gewijzigd zijn hoeven meegestuurd te worden:

```json
{
  "title": "Nieuwe titel",
  "price": 1599,
  "description": "Bijgewerkte beschrijving"
}
```

### Response
```json
{
  "success": true,
  "id": 123,
  "message": "Trip updated successfully"
}
```

## 3. WordPress → BOLT: Metadata Sync Webhook

### Doel
Wanneer de brand in WordPress de booking/contact velden invult, stuurt WordPress deze metadata terug naar BOLT.

### Wanneer Triggeren?
- Bij `save_post` van een `rbs_travel` post
- **Alleen** als de metadata velden gewijzigd zijn
- **Optioneel**: Bij publicatie van de trip

### WordPress Implementatie

```php
add_action('save_post_rbs_travel', 'rbs_sync_trip_metadata_to_bolt', 20, 3);

function rbs_sync_trip_metadata_to_bolt($post_id, $post, $update) {
    // Skip auto-saves en revisies
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
        return;
    }

    // Haal BOLT webhook URL op uit instellingen
    $webhook_url = get_option('rbs_bolt_webhook_url');
    $webhook_secret = get_option('rbs_bolt_webhook_secret');

    if (empty($webhook_url)) {
        return; // Niet geconfigureerd
    }

    // Haal brand_id op (opgeslagen bij import)
    $brand_id = get_post_meta($post_id, '_bolt_brand_id', true);

    // Verzamel metadata
    $metadata = array(
        'wp_post_id' => $post_id,
        'brand_id' => $brand_id,
        'booking_url' => get_post_meta($post_id, '_booking_url', true),
        'contact_button_text' => get_post_meta($post_id, '_contact_button_text', true),
        'contact_button_url' => get_post_meta($post_id, '_contact_button_url', true),
        'whatsapp_number' => get_post_meta($post_id, '_whatsapp_number', true),
        'whatsapp_message' => get_post_meta($post_id, '_whatsapp_message', true),
        'status' => $post->post_status,
    );

    // Als gepubliceerd, voeg publicatiedatum toe
    if ($post->post_status === 'publish' && !empty($post->post_date)) {
        $metadata['published_at'] = $post->post_date_gmt;
    }

    // Verstuur webhook
    $response = wp_remote_post($webhook_url, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-Webhook-Secret' => $webhook_secret,
        ),
        'body' => wp_json_encode($metadata),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        error_log('BOLT webhook failed: ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (!empty($result['success'])) {
            // Optioneel: Sla sync timestamp op
            update_post_meta($post_id, '_bolt_last_sync', current_time('mysql'));
        }
    }
}
```

### BOLT Webhook Endpoint

**URL**: `POST {SUPABASE_URL}/functions/v1/wordpress-trip-webhook`
**Headers**:
```
Content-Type: application/json
X-Webhook-Secret: {secret}
```

**Body**:
```json
{
  "wp_post_id": 123,
  "brand_id": "uuid-here",
  "booking_url": "https://booking.example.com/trip/123",
  "contact_button_text": "Vraag informatie aan",
  "contact_button_url": "https://example.com/contact",
  "whatsapp_number": "+31612345678",
  "whatsapp_message": "Ik wil graag meer info over deze reis",
  "status": "publish",
  "published_at": "2024-12-15 10:00:00"
}
```

## 4. WordPress Admin Configuratie

### Instellingen Pagina
Maak een instellingenpagina in WordPress Admin:

**Menu**: `RRP System → BOLT Sync`

**Velden**:
- ✅ **Webhook URL**: `{SUPABASE_URL}/functions/v1/wordpress-trip-webhook`
- ✅ **Webhook Secret**: Gedeeld secret voor authenticatie
- ✅ **Auto-sync enabled**: Checkbox om sync aan/uit te zetten
- ✅ **Sync on publish only**: Alleen synchen bij publicatie (niet bij draft saves)

```php
register_setting('rbs_bolt_sync', 'rbs_bolt_webhook_url');
register_setting('rbs_bolt_sync', 'rbs_bolt_webhook_secret');
register_setting('rbs_bolt_sync', 'rbs_bolt_auto_sync_enabled');
register_setting('rbs_bolt_sync', 'rbs_bolt_sync_on_publish_only');
```

## 5. Meta Boxes voor Brand-Specifieke Velden

### Trip Metadata Metabox
Voeg een metabox toe aan de trip edit screen:

```php
add_action('add_meta_boxes', 'rbs_add_trip_metadata_metabox');

function rbs_add_trip_metadata_metabox() {
    add_meta_box(
        'rbs_trip_metadata',
        'Booking & Contact Informatie',
        'rbs_trip_metadata_metabox_html',
        'rbs_travel',
        'normal',
        'high'
    );
}

function rbs_trip_metadata_metabox_html($post) {
    wp_nonce_field('rbs_trip_metadata', 'rbs_trip_metadata_nonce');

    $booking_url = get_post_meta($post->ID, '_booking_url', true);
    $contact_button_text = get_post_meta($post->ID, '_contact_button_text', true);
    $contact_button_url = get_post_meta($post->ID, '_contact_button_url', true);
    $whatsapp_number = get_post_meta($post->ID, '_whatsapp_number', true);
    $whatsapp_message = get_post_meta($post->ID, '_whatsapp_message', true);
    ?>
    <table class="form-table">
        <tr>
            <th><label for="booking_url">Booking URL</label></th>
            <td>
                <input type="url" id="booking_url" name="booking_url"
                       value="<?php echo esc_attr($booking_url); ?>"
                       class="regular-text" />
                <p class="description">Direct link naar boeking voor deze reis</p>
            </td>
        </tr>
        <tr>
            <th><label for="contact_button_text">Contact Button Tekst</label></th>
            <td>
                <input type="text" id="contact_button_text" name="contact_button_text"
                       value="<?php echo esc_attr($contact_button_text); ?>"
                       class="regular-text" />
            </td>
        </tr>
        <tr>
            <th><label for="contact_button_url">Contact Button URL</label></th>
            <td>
                <input type="url" id="contact_button_url" name="contact_button_url"
                       value="<?php echo esc_attr($contact_button_url); ?>"
                       class="regular-text" />
            </td>
        </tr>
        <tr>
            <th><label for="whatsapp_number">WhatsApp Nummer</label></th>
            <td>
                <input type="text" id="whatsapp_number" name="whatsapp_number"
                       value="<?php echo esc_attr($whatsapp_number); ?>"
                       class="regular-text" placeholder="+31612345678" />
            </td>
        </tr>
        <tr>
            <th><label for="whatsapp_message">WhatsApp Bericht</label></th>
            <td>
                <textarea id="whatsapp_message" name="whatsapp_message"
                          rows="3" class="large-text"><?php echo esc_textarea($whatsapp_message); ?></textarea>
                <p class="description">Vooraf ingevuld bericht voor WhatsApp</p>
            </td>
        </tr>
    </table>
    <?php
}
```

## 6. Complete Workflow

### Scenario: Brand Accepteert Trip

1. **Brand accepteert trip in BOLT** → `trip_brand_assignments.status = 'accepted'`
2. **BOLT roept aan**: `POST /wp-json/rbs-travel/v1/trips`
3. **WordPress maakt trip aan** als `rbs_travel` Custom Post Type (status: draft)
4. **WordPress slaat op**: `_bolt_brand_id` meta field
5. **Brand logt in WordPress** en vult booking/contact velden in
6. **Brand publiceert trip** → `post_status = 'publish'`
7. **WordPress webhook triggered** → `POST {SUPABASE}/functions/v1/wordpress-trip-webhook`
8. **BOLT update**: `trip_brand_assignments.metadata` en `is_published = true`

### Scenario: Content Update in BOLT

1. **Admin update trip in BOLT** (prijs, beschrijving, etc.)
2. **BOLT roept aan**: `PUT /wp-json/rbs-travel/v1/trips/{wp_post_id}`
3. **WordPress update trip** (alleen content velden, niet metadata)
4. **Booking/contact velden blijven ongewijzigd**

## 7. Testing Checklist

### WordPress Plugin Tests
- [ ] POST nieuwe trip vanuit BOLT → Trip wordt aangemaakt
- [ ] PUT bestaande trip vanuit BOLT → Content wordt geüpdatet
- [ ] Save metadata in WordPress → Webhook wordt verstuurd
- [ ] Publiceer trip → Status wordt gesynchroniseerd
- [ ] Invalid auth → Geeft 401 error
- [ ] Missing required fields → Geeft 400 error

### BOLT Tests
```bash
# Test push trip to WordPress
curl -X POST "$SUPABASE_URL/functions/v1/wordpress-push-trip" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_id": "uuid-here"
  }'

# Test webhook from WordPress
curl -X POST "$SUPABASE_URL/functions/v1/wordpress-trip-webhook" \
  -H "X-Webhook-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "wp_post_id": 123,
    "brand_id": "uuid-here",
    "booking_url": "https://booking.example.com/trip/123",
    "status": "publish"
  }'
```

## 8. Error Handling

### WordPress Errors
```php
// Voorbeeld error response
wp_send_json_error([
    'message' => 'Invalid trip data',
    'code' => 'invalid_data',
    'data' => ['field' => 'title', 'error' => 'Title is required']
], 400);
```

### BOLT Errors
```json
{
  "success": false,
  "error": "WordPress credentials not configured for this brand",
  "details": "Please configure WordPress URL, username and app password in brand settings"
}
```

## 9. Security Considerations

1. **WordPress Application Passwords**: Gebruik moderne app passwords, geen plain text passwords
2. **Webhook Secret**: Valideer altijd `X-Webhook-Secret` header
3. **HTTPS Only**: Forceer HTTPS voor alle API calls
4. **Rate Limiting**: Implementeer rate limiting op WordPress endpoints
5. **Nonce Verification**: Gebruik WordPress nonces voor form submissions
6. **Capability Checks**: Check `edit_posts` capability voor API access

## 10. Database Schema

### WordPress Post Meta Fields
```
_bolt_brand_id          # UUID van brand in BOLT
_bolt_trip_id           # UUID van trip in BOLT (optioneel)
_bolt_assignment_id     # UUID van assignment in BOLT
_bolt_last_sync         # Timestamp van laatste sync
_booking_url            # Brand's booking URL
_contact_button_text    # Contact button label
_contact_button_url     # Contact button URL
_whatsapp_number        # WhatsApp nummer
_whatsapp_message       # WhatsApp bericht
```

### BOLT Metadata Structure
```json
{
  "wp_post_id": 123,
  "wp_slug": "10-dagen-thailand-rondreis",
  "wp_url": "https://brand.com/?p=123",
  "wp_status": "publish",
  "booking_url": "https://booking.example.com/trip/123",
  "contact_button_text": "Vraag informatie aan",
  "contact_button_url": "https://example.com/contact",
  "whatsapp_number": "+31612345678",
  "whatsapp_message": "Ik wil graag meer info",
  "last_pushed_at": "2024-12-15T10:00:00Z",
  "last_synced_from_wp": "2024-12-15T11:00:00Z",
  "wp_published_at": "2024-12-15T10:30:00Z",
  "push_status": "success"
}
```

## Vragen?

Neem contact op voor ondersteuning bij de implementatie!
