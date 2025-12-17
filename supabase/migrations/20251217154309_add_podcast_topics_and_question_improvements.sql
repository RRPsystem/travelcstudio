/*
  # Podcast Topics en Vraag Verbeteringen

  1. Nieuwe Tabellen
    - `podcast_topics` - Onderwerpen per episode
  
  2. Wijzigingen aan podcast_questions
    - `topic_id` - Koppeling naar onderwerp
    - `guest_id` - Koppeling naar specifieke gast
    - `phase` - Voor welke fase (voorbereiding/live)
    - `visible_to_submitter` - Of de indiener de vraag kan zien

  3. Security
    - RLS policies voor topics
    - Brands/agents kunnen vooraf vragen insturen
    - Admin zet vragen in het schema per topic
*/

-- Create podcast topics table
CREATE TABLE IF NOT EXISTS podcast_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0,
  duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to podcast_questions
DO $$ 
BEGIN
  -- Add topic_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'podcast_questions' AND column_name = 'topic_id'
  ) THEN
    ALTER TABLE podcast_questions ADD COLUMN topic_id uuid REFERENCES podcast_topics(id) ON DELETE SET NULL;
  END IF;

  -- Add guest_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'podcast_questions' AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE podcast_questions ADD COLUMN guest_id uuid REFERENCES podcast_guests(id) ON DELETE SET NULL;
  END IF;

  -- Add phase if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'podcast_questions' AND column_name = 'phase'
  ) THEN
    ALTER TABLE podcast_questions ADD COLUMN phase text DEFAULT 'preparation' CHECK (phase IN ('preparation', 'pre_submitted', 'live', 'follow_up'));
  END IF;

  -- Add visible_to_submitter if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'podcast_questions' AND column_name = 'visible_to_submitter'
  ) THEN
    ALTER TABLE podcast_questions ADD COLUMN visible_to_submitter boolean DEFAULT true;
  END IF;

  -- Add priority if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'podcast_questions' AND column_name = 'priority'
  ) THEN
    ALTER TABLE podcast_questions ADD COLUMN priority integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_podcast_topics_episode ON podcast_topics(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_podcast_questions_topic ON podcast_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_podcast_questions_guest ON podcast_questions(guest_id);
CREATE INDEX IF NOT EXISTS idx_podcast_questions_phase ON podcast_questions(phase);

-- Enable RLS
ALTER TABLE podcast_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for podcast_topics

-- Admins can do everything
CREATE POLICY "Admins can manage podcast topics"
  ON podcast_topics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Brands and agents can view topics for their episodes
CREATE POLICY "Brands and agents can view podcast topics"
  ON podcast_topics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('brand', 'agent')
    )
  );

-- Update RLS for podcast_questions to allow pre-submission

-- Drop existing brand/agent submission policy if exists
DROP POLICY IF EXISTS "Brands and agents can submit questions" ON podcast_questions;

-- Allow brands and agents to submit questions (pre-submission)
CREATE POLICY "Brands and agents can submit questions"
  ON podcast_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('brand', 'agent')
    )
    AND source_type IN ('brand', 'agent')
    AND phase = 'pre_submitted'
    AND submitted_by = auth.uid()
  );

-- Brands and agents can view their own submitted questions
CREATE POLICY "Users can view own submitted questions"
  ON podcast_questions
  FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comment explaining the workflow
COMMENT ON COLUMN podcast_questions.phase IS 'preparation: Admin creating questions | pre_submitted: Brands/Agents submitted before episode | live: Questions during live recording | follow_up: Questions for follow-up';
COMMENT ON COLUMN podcast_questions.topic_id IS 'Links question to a specific topic within the episode';
COMMENT ON COLUMN podcast_questions.guest_id IS 'Links question to a specific guest (who should answer)';
