/*
  # Fix Podcast Topics - Hosts en Beeldmateriaal URL
  
  1. Wijzigingen
    - Fix foreign keys: interviewer_id, leading_id, sidekick_id moeten naar podcast_hosts verwijzen (niet podcast_guests)
    - Voeg `visuals_url` toe voor beeldmateriaal links
  
  2. Security
    - Geen RLS wijzigingen nodig (erft van bestaande policies)
*/

-- Drop oude foreign keys
DO $$ 
BEGIN
  -- Drop interviewer_id constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%podcast_topics_interviewer_id_fkey%'
    AND table_name = 'podcast_topics'
  ) THEN
    ALTER TABLE podcast_topics DROP CONSTRAINT IF EXISTS podcast_topics_interviewer_id_fkey;
  END IF;

  -- Drop leading_id constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%podcast_topics_leading_id_fkey%'
    AND table_name = 'podcast_topics'
  ) THEN
    ALTER TABLE podcast_topics DROP CONSTRAINT IF EXISTS podcast_topics_leading_id_fkey;
  END IF;

  -- Drop sidekick_id constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%podcast_topics_sidekick_id_fkey%'
    AND table_name = 'podcast_topics'
  ) THEN
    ALTER TABLE podcast_topics DROP CONSTRAINT IF EXISTS podcast_topics_sidekick_id_fkey;
  END IF;
END $$;

-- Voeg nieuwe foreign keys toe die naar podcast_hosts verwijzen
ALTER TABLE podcast_topics
  ADD CONSTRAINT podcast_topics_interviewer_id_fkey 
    FOREIGN KEY (interviewer_id) REFERENCES podcast_hosts(id) ON DELETE SET NULL;

ALTER TABLE podcast_topics
  ADD CONSTRAINT podcast_topics_leading_id_fkey 
    FOREIGN KEY (leading_id) REFERENCES podcast_hosts(id) ON DELETE SET NULL;

ALTER TABLE podcast_topics
  ADD CONSTRAINT podcast_topics_sidekick_id_fkey 
    FOREIGN KEY (sidekick_id) REFERENCES podcast_hosts(id) ON DELETE SET NULL;

-- Voeg visuals_url veld toe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'podcast_topics' AND column_name = 'visuals_url'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN visuals_url text;
  END IF;
END $$;

-- Update comment
COMMENT ON COLUMN podcast_topics.visuals_url IS 'URL naar beeldmateriaal voor dit onderwerp (video, foto, etc.)';
COMMENT ON COLUMN podcast_topics.interviewer_id IS 'Host die dit onderwerp interviewt';
COMMENT ON COLUMN podcast_topics.leading_id IS 'Host die de leiding heeft over dit onderwerp';
COMMENT ON COLUMN podcast_topics.sidekick_id IS 'Host die sidekick is bij dit onderwerp';