/*
  # Voeg Guest toe aan Podcast Topics

  1. Wijzigingen
    - Voeg `guest_id` toe aan podcast_topics tabel
    - Guest kan aan een onderwerp gekoppeld worden
    - Foreign key naar podcast_guests

  2. Security
    - Geen RLS wijzigingen nodig (erft van bestaande policies)
*/

-- Voeg guest_id veld toe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcast_topics' AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE podcast_topics ADD COLUMN guest_id uuid REFERENCES podcast_guests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update comment
COMMENT ON COLUMN podcast_topics.guest_id IS 'Gast die bij dit onderwerp hoort';
