/*
  # Insert Test Features Data

  Inserts all features that need to be tested, categorized by:
  - brand: Website management tools
  - agent: AI tools and agent-specific features
  - shared: Features both groups need to test
*/

-- Brand Features (Website Management)
INSERT INTO test_features (name, description, category, order_index) VALUES
  ('Login & Authentication', 'Inloggen met email/password, sessie beheer, uitloggen', 'shared', 1),
  ('Dashboard Overview', 'Hoofdscherm met overzicht en navigatie', 'shared', 2),
  ('Page Management', 'Pagina''s aanmaken, bewerken, verwijderen en organiseren', 'brand', 3),
  ('Menu Builder', 'Menu structuur opbouwen met links en submenus', 'brand', 4),
  ('Footer Builder', 'Footer content beheren met kolommen en links', 'brand', 5),
  ('Template Selection', 'Templates selecteren en toepassen op pagina''s', 'brand', 6),
  ('Domain Settings', 'Domeinen koppelen en verifiëren', 'brand', 7),
  ('News Management', 'Nieuws items bekijken en goedkeuren', 'brand', 8),
  ('Destination Approval', 'Bestemmingen beoordelen en toewijzen', 'brand', 9),
  ('Trip Approval', 'Reizen beoordelen en toewijzen aan pagina''s', 'brand', 10),
  ('Brand Settings', 'Bedrijfsgegevens, logo, certificeringen beheren', 'brand', 11),
  ('Website Preview', 'Live preview van website bekijken', 'brand', 12),
  ('Social Media Connector', 'Social media accounts koppelen', 'brand', 13),
  ('Roadmap Board', 'Feature requests en planning bekijken', 'brand', 14)
ON CONFLICT DO NOTHING;

-- Agent Features (AI Tools)
INSERT INTO test_features (name, description, category, order_index) VALUES
  ('Agent Profile Setup', 'Profiel aanmaken met foto, bio, specialisaties', 'agent', 20),
  ('Agent Profile Edit', 'Profiel gegevens wijzigen en updaten', 'agent', 21),
  ('Agent Public Profile', 'Publieke weergave van agent profiel bekijken', 'agent', 22),
  ('TravelBro - Trip Creation', 'Nieuwe reis aanmaken met AI assistance', 'agent', 23),
  ('TravelBro - PDF Upload', 'PDF uploaden en automatisch parsen', 'agent', 24),
  ('TravelBro - Trip Editing', 'Reis details bewerken en aanpassen', 'agent', 25),
  ('TravelBro - Media Management', 'Foto''s en media uploaden voor reizen', 'agent', 26),
  ('TravelBro - Client Interface', 'Klant interface testen (intake formulier)', 'agent', 27),
  ('TravelBro - WhatsApp Integration', 'WhatsApp communicatie met clients', 'agent', 28),
  ('Social Media - Post Creation', 'Social media posts genereren met AI', 'agent', 29),
  ('Social Media - Image Generation', 'Afbeeldingen genereren voor posts', 'agent', 30),
  ('Social Media - Scheduling', 'Posts inplannen en publiceren', 'agent', 31),
  ('Review Management', 'Reviews beheren en weergeven', 'agent', 32),
  ('Portfolio Management', 'Aanbevolen reizen selecteren', 'agent', 33)
ON CONFLICT DO NOTHING;

-- Initialize Round 1
INSERT INTO test_rounds (round_number, status) VALUES (1, 'pending')
ON CONFLICT (round_number) DO NOTHING;

-- Create Round 2 and 3 (pending)
INSERT INTO test_rounds (round_number, status) VALUES (2, 'pending'), (3, 'pending')
ON CONFLICT (round_number) DO NOTHING;