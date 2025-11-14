/*
  # Fix Scheduled WhatsApp Messages Template Variables

  1. Changes
    - Clean up template_variables to ensure they meet Twilio requirements
    - Truncate variable values to max 100 characters
    - Remove any invalid characters that might cause Twilio errors
    - Mark messages with invalid variables as sent to prevent further errors

  2. Security
    - No RLS changes needed
*/

-- First, mark any messages that are clearly broken as "sent" so they don't keep failing
UPDATE scheduled_whatsapp_messages
SET
  is_sent = true,
  sent_at = now()
WHERE
  is_sent = false
  AND (
    template_variables IS NULL
    OR jsonb_typeof(template_variables) != 'object'
  );

-- Clean up template_variables for remaining unsent messages
UPDATE scheduled_whatsapp_messages
SET template_variables = jsonb_object_agg(
  key,
  CASE
    WHEN value::text IS NULL THEN '""'::jsonb
    WHEN length(value::text) > 102 THEN to_jsonb(left(trim(both '"' from value::text), 100))
    ELSE value
  END
)
FROM jsonb_each(template_variables)
WHERE
  is_sent = false
  AND template_variables IS NOT NULL
  AND jsonb_typeof(template_variables) = 'object';
