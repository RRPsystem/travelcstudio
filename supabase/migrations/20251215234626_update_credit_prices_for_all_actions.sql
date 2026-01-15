/*
  # Update Credit Prices voor Alle Acties

  1. Updates
    - Verwijder oude test prices
    - Voeg correcte prices toe voor alle acties:
      * HelpBot: 0 credits (gratis)
      * TravelBro aanmaken: 100 credits (€1)
      * Video opslag: 100 credits (€1)
      * AI Travel import: 1 credit
      * AI Foto generatie: 5 credits
      * AI Content generatie (tekst): 2 credits
      * Social Media post: 10 credits
      * Podcast vragen: 5 credits
      * Website functies: 0 credits (gratis)

  2. Notities
    - 100 credits = €1 (bij credits_per_euro = 100)
    - Alle bedragen in credits, niet euro's
*/

-- Verwijder oude test data
DELETE FROM credit_prices;

-- Insert correcte credit prices
INSERT INTO credit_prices (action_type, action_label, cost_credits, enabled) VALUES
  -- Gratis services
  ('helpbot_chat', 'HelpBot Chat (gratis)', 0, true),
  ('website_builder', 'Website Builder (gratis)', 0, true),

  -- Premium services (1 euro = 100 credits)
  ('travelbro_setup', 'TravelBro Aanmaken', 100, true),
  ('video_storage', 'Video Opslaan', 100, true),

  -- AI services - laag tarief
  ('ai_travel_import', 'AI Reis Import (PDF/URL)', 1, true),
  ('ai_content_text', 'AI Tekst Generatie', 2, true),

  -- AI services - medium tarief
  ('ai_image_generation', 'AI Afbeelding Genereren', 5, true),
  ('ai_podcast_questions', 'Podcast Vragen Genereren', 5, true),

  -- Social media - hoog tarief
  ('social_media_post', 'Social Media Post', 10, true)
ON CONFLICT (action_type) DO UPDATE SET
  action_label = EXCLUDED.action_label,
  cost_credits = EXCLUDED.cost_credits,
  enabled = EXCLUDED.enabled,
  updated_at = now();

-- Update system settings: 100 credits = €1
UPDATE credit_system_settings
SET
  credits_per_euro = 100,
  minimum_purchase_eur = 5.00,
  updated_at = now()
WHERE id IN (SELECT id FROM credit_system_settings LIMIT 1);
