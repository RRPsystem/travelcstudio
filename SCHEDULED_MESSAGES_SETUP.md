# WhatsApp Scheduled Messages Setup

## Overzicht

Het systeem kan WhatsApp berichten plannen en automatisch versturen op een specifieke datum en tijd. Berichten worden opgeslagen in de `scheduled_whatsapp_messages` tabel.

## Edge Function

De `process-scheduled-messages` edge function verwerkt geplande berichten:
- Controleert alle berichten waar `is_sent = false`
- Controleert of de geplande tijd is bereikt (rekening houdend met timezone)
- Verstuurt het bericht via de `send-whatsapp` function
- Markeert het bericht als verzonden (`is_sent = true`, `sent_at = now()`)

## Handmatig Triggeren

Via de TravelBRO interface kun je de scheduler handmatig triggeren:

1. Ga naar een trip detail pagina
2. Scroll naar "Geplande WhatsApp Berichten"
3. Klik op "Verwerk Geplande Berichten Nu"

Dit verwerkt alle berichten die nu verstuurd zouden moeten worden.

## Automatische Scheduling (Aanbevolen)

### Optie 1: Supabase Cron (via pg_cron)

Als je toegang hebt tot de Supabase database, kun je een cron job instellen:

```sql
-- Voer elk uur uit (om xx:05)
SELECT cron.schedule(
  'process-scheduled-messages',
  '5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/process-scheduled-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    ) AS request_id;
  $$
);
```

### Optie 2: Externe Cron Service (bijv. cron-job.org)

1. Ga naar https://cron-job.org of een vergelijkbare service
2. Maak een nieuwe cron job aan:
   - **URL**: `https://your-project.supabase.co/functions/v1/process-scheduled-messages`
   - **Method**: POST
   - **Headers**:
     - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
     - `Content-Type: application/json`
   - **Schedule**: Elk uur (of elke 15 minuten voor hogere precisie)

### Optie 3: Vercel Cron Jobs

Als je applicatie op Vercel draait, kun je een serverless function maken:

```typescript
// api/cron/process-messages.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verifieer cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/process-scheduled-messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

Voeg toe aan `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/process-messages",
    "schedule": "0 * * * *"
  }]
}
```

## Timezone Support

Het systeem ondersteunt verschillende timezones:
- Europe/Amsterdam (UTC+1)
- Europe/London (UTC+0)
- America/New_York (UTC-5)
- America/Los_Angeles (UTC-8)
- Asia/Bangkok (UTC+7)
- Asia/Tokyo (UTC+9)
- Australia/Sydney (UTC+11)

Standaard wordt `Europe/Amsterdam` gebruikt.

## Testing

Test de scheduler handmatig:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-scheduled-messages \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "processed": 3,
  "successful": 2,
  "failed": 1,
  "results": [...]
}
```

## Monitoring

Controleer de logs in Supabase Dashboard:
1. Ga naar Functions
2. Selecteer `process-scheduled-messages`
3. Bekijk de logs voor status updates

## Troubleshooting

### Berichten worden niet verstuurd

1. **Check Twilio credentials**: Zorg dat Twilio correct is geconfigureerd
2. **Check scheduled time**: Controleer of de geplande tijd al is gepasseerd
3. **Check phone number**: Telefoonnummer moet in formaat `+31612345678` zijn
4. **Run handmatig**: Test via de UI knop of direct via curl

### Cron draait niet

1. Controleer of de cron job actief is
2. Check de logs van de cron service
3. Verifieer de Authorization header
4. Test de URL handmatig met curl

### Timezone issues

Als berichten op het verkeerde moment worden verstuurd:
1. Controleer of de juiste timezone is ingesteld bij het plannen
2. Verifieer dat de timezone offset correct is in de `getTimezoneOffset` functie
3. Test met verschillende timezones

## Aanbevolen Frequentie

- **Hoge precisie**: Elk kwartier (*/15 * * * *)
- **Normaal**: Elk uur (0 * * * *)
- **Laag verkeer**: Om de 4 uur (0 */4 * * *)

Voor productigebruik raden we aan elk uur te runnen.
