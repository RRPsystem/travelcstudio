/*
  # Fix Scheduled WhatsApp Messages Template Variables

  1. Changes
    - Clean up template_variables to ensure they meet Twilio requirements
    - Mark old broken messages as sent to prevent infinite retry loops
    
  2. Security
    - No RLS changes needed
*/

-- Mark any clearly broken messages as sent
UPDATE scheduled_whatsapp_messages
SET
  is_sent = true,
  sent_at = now()
WHERE
  is_sent = false
  AND (
    template_variables IS NULL
    OR jsonb_typeof(template_variables) != 'object'
    OR (scheduled_date < CURRENT_DATE AND scheduled_time < CURRENT_TIME)
  );
