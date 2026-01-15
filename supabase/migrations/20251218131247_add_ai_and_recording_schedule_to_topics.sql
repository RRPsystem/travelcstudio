/*
  # AI en Opname Planning voor Podcast Onderwerpen

  1. Wijzigingen
    - Voeg `ai_enabled` toe aan podcast_topics (AI assist per onderwerp)
    - Voeg `recording_date` toe voor geplande opnamedatum
    - Voeg `recording_time` toe voor geplande opnametijd
    - Voeg `is_recorded` toe om bij te houden of het onderwerp al is opgenomen
    - Voeg `recorded_at` toe voor daadwerkelijke opnamedatum
    - Voeg `recording_notes` toe voor notities over de opname

  2. Gebruik
    - Onderwerpen kunnen op verschillende dagen/tijden worden opgenomen
    - AI kan per onderwerp worden in- of uitgeschakeld
    - Todo lijst functionaliteit voor opname planning
    - Later monteren van verschillende opnames tot één episode

  3. Security
    - Geen RLS wijzigingen nodig (erft van bestaande policies)
*/

-- Voeg AI enabled veld toe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'ai_enabled'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN ai_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Voeg opname planning velden toe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'recording_date'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN recording_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'recording_time'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN recording_time time;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'is_recorded'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN is_recorded boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'recorded_at'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN recorded_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'recording_notes'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN recording_notes text;
  END IF;
END $$;

-- Update comments
COMMENT ON COLUMN podcast_topics.ai_enabled IS 'AI assist is ingeschakeld voor dit onderwerp';
COMMENT ON COLUMN podcast_topics.recording_date IS 'Geplande datum voor opname van dit onderwerp';
COMMENT ON COLUMN podcast_topics.recording_time IS 'Geplande tijd voor opname van dit onderwerp';
COMMENT ON COLUMN podcast_topics.is_recorded IS 'Onderwerp is al opgenomen';
COMMENT ON COLUMN podcast_topics.recorded_at IS 'Daadwerkelijke datum/tijd van opname';
COMMENT ON COLUMN podcast_topics.recording_notes IS 'Notities over de opname';
