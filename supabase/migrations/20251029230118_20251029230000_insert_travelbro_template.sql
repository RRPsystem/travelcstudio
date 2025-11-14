/*
  # Insert TravelBro WhatsApp Template

  1. Data
    - Insert system-wide travelbro template with Twilio Content SID
    - This template is used for first-time WhatsApp messages to customers
*/

INSERT INTO whatsapp_templates (
  brand_id,
  name,
  template_sid,
  description,
  variables,
  is_active
) VALUES (
  NULL,
  'travelbro',
  'HX01a2453a98f1070954288e9c01d7bfa3',
  'TravelBro welkomstbericht voor WhatsApp',
  '[]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;