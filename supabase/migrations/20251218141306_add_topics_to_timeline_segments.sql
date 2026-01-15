/*
  # Onderwerpen Koppelen aan Timeline Segmenten

  1. Wijzigingen aan podcast_segments
    - Voeg `topic_id` toe om onderwerpen te koppelen aan timeline
    - Voeg `notes` toe voor extra notities per segment
    - Voeg `background_music_url` toe voor achtergrondmuziek
    - Breid segment types uit met muziek, pauze, etc.

  2. Gebruik
    - Onderwerpen kunnen vanuit question board aan timeline worden toegevoegd
    - Extra segmenten (reclame, muziek, pauze) kunnen tussendoor geplaatst worden
    - Segmenten kunnen worden geordend/verplaatst
    - Elke segment heeft duidelijke tijdsindicatie

  3. Security
    - Erft RLS van bestaande podcast_segments policies
*/

-- Voeg topic_id toe voor koppeling met onderwerpen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_segments' AND column_name = 'topic_id'
  ) THEN
    ALTER TABLE podcast_segments ADD COLUMN topic_id uuid REFERENCES podcast_topics(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Voeg notes veld toe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_segments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE podcast_segments ADD COLUMN notes text;
  END IF;
END $$;

-- Voeg background_music_url toe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_segments' AND column_name = 'background_music_url'
  ) THEN
    ALTER TABLE podcast_segments ADD COLUMN background_music_url text;
  END IF;
END $$;

-- Update comments
COMMENT ON COLUMN podcast_segments.topic_id IS 'Koppeling naar een specifiek podcast onderwerp';
COMMENT ON COLUMN podcast_segments.notes IS 'Extra notities voor dit segment';
COMMENT ON COLUMN podcast_segments.background_music_url IS 'URL naar achtergrondmuziek voor dit segment';

-- Voeg index toe voor betere performance
CREATE INDEX IF NOT EXISTS idx_podcast_segments_topic_id ON podcast_segments(topic_id);
CREATE INDEX IF NOT EXISTS idx_podcast_segments_order ON podcast_segments(episode_planning_id, order_index);
