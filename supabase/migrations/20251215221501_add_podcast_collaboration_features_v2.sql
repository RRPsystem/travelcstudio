/*
  # Add Podcast Collaboration Features
  
  ## Uitbreiding voor Admin Collaboration
  
  1. **podcast_discussions**
     - Voor discussies/comments tussen admins over vragen en episode planning
     - Threads per vraag of algemeen per episode
     - Mentions support (@admin)
     
  2. **podcast_guests**
     - Guest management per episode
     - Status tracking (invited, confirmed, cancelled, attended)
     - Bijzonderheden en notities
     
  3. **podcast_segments**
     - Interviews, intros, outros
     - Pre-recorded content
     - Volgorde binnen episode
     
  4. **podcast_ai_suggestions**
     - AI gegenereerde suggesties voor vragen
     - Feedback tracking
     
  5. **Uitbreidingen op bestaande tables**
     - Questions: extra statussen (concept, under_discussion, approved, in_schedule, asked, skipped)
     - Episodes: guest_info jsonb veld
     
  ## Security
  - RLS policies voor operators en admins
  - Brands/agents kunnen alleen eigen submissions zien
*/

-- Extend podcast_questions statussen
DO $$ 
BEGIN
  ALTER TABLE podcast_questions 
  DROP CONSTRAINT IF EXISTS podcast_questions_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE podcast_questions 
ADD CONSTRAINT podcast_questions_status_check 
CHECK (status IN ('concept', 'under_discussion', 'approved', 'in_schedule', 'asked', 'skipped', 'rejected'));

-- Add discussion_count en ai_generated velden
ALTER TABLE podcast_questions 
ADD COLUMN IF NOT EXISTS discussion_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;

-- Create podcast_discussions table
CREATE TABLE IF NOT EXISTS podcast_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES podcast_questions(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES podcast_discussions(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  mentions uuid[] DEFAULT ARRAY[]::uuid[],
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create podcast_guests table
CREATE TABLE IF NOT EXISTS podcast_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  bio text,
  profile_image_url text,
  company text,
  role_title text,
  status text DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined', 'cancelled', 'attended', 'no_show')) NOT NULL,
  invited_date timestamptz DEFAULT now(),
  confirmed_date timestamptz,
  notes text,
  special_requirements text,
  topics text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create podcast_segments table
CREATE TABLE IF NOT EXISTS podcast_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE NOT NULL,
  segment_type text CHECK (segment_type IN ('intro', 'main', 'interview', 'outro', 'ad_break', 'pre_recorded')) NOT NULL,
  title text NOT NULL,
  description text,
  duration_minutes integer,
  order_index integer DEFAULT 0 NOT NULL,
  guest_id uuid REFERENCES podcast_guests(id) ON DELETE SET NULL,
  recording_url text,
  transcript text,
  notes text,
  is_recorded boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create podcast_ai_suggestions table
CREATE TABLE IF NOT EXISTS podcast_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE NOT NULL,
  suggestion_type text CHECK (suggestion_type IN ('question', 'topic', 'guest', 'improvement', 'title', 'description')) NOT NULL,
  content text NOT NULL,
  context jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')) NOT NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  applied_to_id uuid,
  feedback text,
  created_at timestamptz DEFAULT now()
);

-- Add guest_info jsonb to episodes
ALTER TABLE podcast_episodes_planning
ADD COLUMN IF NOT EXISTS guest_info jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_duration_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recording_notes text;

-- Enable RLS
ALTER TABLE podcast_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Podcast Discussions Policies
CREATE POLICY "Podcast admins can view discussions"
  ON podcast_discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Podcast admins can create discussions"
  ON podcast_discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Discussion authors can update own"
  ON podcast_discussions FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Podcast operators can delete discussions"
  ON podcast_discussions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Podcast Guests Policies
CREATE POLICY "Podcast admins can view guests"
  ON podcast_guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Podcast admins can manage guests"
  ON podcast_guests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

-- Podcast Segments Policies
CREATE POLICY "Podcast admins can view segments"
  ON podcast_segments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Podcast admins can manage segments"
  ON podcast_segments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

-- AI Suggestions Policies
CREATE POLICY "Podcast admins can view AI suggestions"
  ON podcast_ai_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "AI system can create suggestions"
  ON podcast_ai_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Podcast admins can review AI suggestions"
  ON podcast_ai_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_discussions_episode ON podcast_discussions(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_discussions_question ON podcast_discussions(question_id);
CREATE INDEX IF NOT EXISTS idx_discussions_parent ON podcast_discussions(parent_id);
CREATE INDEX IF NOT EXISTS idx_discussions_author ON podcast_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_guests_episode ON podcast_guests(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_guests_status ON podcast_guests(status);
CREATE INDEX IF NOT EXISTS idx_segments_episode ON podcast_segments(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_segments_order ON podcast_segments(episode_planning_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_episode ON podcast_ai_suggestions(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON podcast_ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_questions_discussion_count ON podcast_questions(discussion_count);

-- Function to update discussion_count on questions
CREATE OR REPLACE FUNCTION update_question_discussion_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.question_id IS NOT NULL THEN
    UPDATE podcast_questions
    SET discussion_count = discussion_count + 1
    WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' AND OLD.question_id IS NOT NULL THEN
    UPDATE podcast_questions
    SET discussion_count = GREATEST(discussion_count - 1, 0)
    WHERE id = OLD.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for discussion count
DROP TRIGGER IF EXISTS trigger_update_question_discussion_count ON podcast_discussions;
CREATE TRIGGER trigger_update_question_discussion_count
AFTER INSERT OR DELETE ON podcast_discussions
FOR EACH ROW
EXECUTE FUNCTION update_question_discussion_count();