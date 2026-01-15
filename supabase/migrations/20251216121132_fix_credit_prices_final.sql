/*
  # Fix Credit Prices - Finale Versie

  1. Aanpassingen
    - Video Opslaan → Video Genereren (100 credits)
    - Verwijder Podcast vragen (wordt gratis)
    - Verwijder HelpBot chat (is gratis)
    - Verwijder Website Builder (is gratis)

  2. Overzicht Credit Kosten
    - Video Genereren: 100 credits (€1)
    - TravelBro aanmaken: 100 credits (€1)
    - AI Tekst: 2 credits
    - AI Foto: 5 credits
    - AI Reis Import: 1 credit
    - Social Media: 10 credits

  3. Notities
    - Gratis features niet meer in lijst
    - 100 credits = €1
*/

-- Verwijder gratis services uit de lijst
DELETE FROM credit_prices 
WHERE action_type IN ('helpbot_chat', 'website_builder', 'ai_podcast_questions');

-- Update Video Opslaan naar Video Genereren
UPDATE credit_prices
SET 
  action_label = 'Video Genereren',
  action_type = 'video_generation',
  cost_credits = 100,
  enabled = true,
  updated_at = now()
WHERE action_type = 'video_storage';

-- Zorg ervoor dat alle andere prijzen correct zijn
INSERT INTO credit_prices (action_type, action_label, cost_credits, enabled) VALUES
  ('travelbro_setup', 'TravelBro Aanmaken', 100, true),
  ('ai_travel_import', 'AI Reis Import (PDF/URL)', 1, true),
  ('ai_content_text', 'AI Tekst Generatie', 2, true),
  ('ai_image_generation', 'AI Afbeelding Genereren', 5, true),
  ('social_media_post', 'Social Media Post', 10, true)
ON CONFLICT (action_type) DO UPDATE SET
  action_label = EXCLUDED.action_label,
  cost_credits = EXCLUDED.cost_credits,
  enabled = EXCLUDED.enabled,
  updated_at = now();
