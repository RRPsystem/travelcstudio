/*
  # Add Podcast Management System

  1. New Tables
    - `podcast_hosts`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Reference to auth.users
      - `name` (text) - Host name
      - `bio` (text) - Host biography
      - `profile_image_url` (text)
      - `is_active` (boolean)
      
    - `podcast_episodes_planning`
      - `id` (uuid, primary key)
      - `episode_id` (uuid, nullable) - Reference to published episode
      - `title` (text) - Episode title
      - `description` (text) - Episode description
      - `topic` (text) - Main topic
      - `scheduled_date` (timestamptz) - Recording date
      - `status` (text) - 'planning', 'scheduled', 'recording', 'editing', 'published'
      - `riverside_recording_id` (text) - Riverside.fm recording ID
      - `hosts` (uuid[]) - Array of host IDs
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `podcast_questions`
      - `id` (uuid, primary key)
      - `episode_planning_id` (uuid) - Reference to planning
      - `question` (text) - The question
      - `source_type` (text) - 'host', 'admin', 'brand', 'agent', 'ai'
      - `submitted_by` (uuid, nullable) - User who submitted
      - `status` (text) - 'suggested', 'approved', 'asked', 'skipped'
      - `order_index` (integer) - Order in question list
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)

    - `podcast_host_notes`
      - `id` (uuid, primary key)
      - `episode_planning_id` (uuid)
      - `host_id` (uuid) - Author of note
      - `note` (text)
      - `is_private` (boolean) - Private to hosts only
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `riverside_webhook_logs`
      - `id` (uuid, primary key)
      - `event_type` (text)
      - `recording_id` (text)
      - `payload` (jsonb)
      - `processed` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Operators can manage everything
    - Hosts can manage their episodes
    - Brands/agents can submit questions
    - Public can view published episodes and announcements
*/

-- Create podcast hosts table
CREATE TABLE IF NOT EXISTS podcast_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  profile_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create podcast episode planning table
CREATE TABLE IF NOT EXISTS podcast_episodes_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES travel_journal_episodes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  topic text,
  scheduled_date timestamptz,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'scheduled', 'recording', 'editing', 'published', 'cancelled')),
  riverside_recording_id text,
  hosts uuid[] DEFAULT ARRAY[]::uuid[],
  allow_questions boolean DEFAULT true,
  announcement_text text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create podcast questions table
CREATE TABLE IF NOT EXISTS podcast_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE,
  question text NOT NULL,
  source_type text DEFAULT 'host' CHECK (source_type IN ('host', 'admin', 'brand', 'agent', 'ai', 'public')),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name text,
  status text DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'asked', 'skipped')),
  order_index integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create podcast host notes table
CREATE TABLE IF NOT EXISTS podcast_host_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_planning_id uuid REFERENCES podcast_episodes_planning(id) ON DELETE CASCADE,
  host_id uuid REFERENCES podcast_hosts(id) ON DELETE CASCADE,
  note text NOT NULL,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create riverside webhook logs table
CREATE TABLE IF NOT EXISTS riverside_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recording_id text,
  payload jsonb,
  processed boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE podcast_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_episodes_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_host_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE riverside_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Podcast Hosts Policies
CREATE POLICY "Anyone can view active hosts"
  ON podcast_hosts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Operators can manage hosts"
  ON podcast_hosts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Episode Planning Policies
CREATE POLICY "Operators can view all planning"
  ON podcast_episodes_planning FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Hosts can view their episodes"
  ON podcast_episodes_planning FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM podcast_hosts
      WHERE id = ANY(hosts)
    )
  );

CREATE POLICY "Public can view announced episodes"
  ON podcast_episodes_planning FOR SELECT
  USING (
    status IN ('scheduled', 'published')
    AND allow_questions = true
  );

CREATE POLICY "Operators can manage all planning"
  ON podcast_episodes_planning FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Hosts can update their episodes"
  ON podcast_episodes_planning FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM podcast_hosts
      WHERE id = ANY(hosts)
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM podcast_hosts
      WHERE id = ANY(hosts)
    )
  );

-- Questions Policies
CREATE POLICY "Operators and hosts can view all questions"
  ON podcast_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
    OR auth.uid() IN (
      SELECT ph.user_id FROM podcast_hosts ph
      INNER JOIN podcast_episodes_planning pep ON ph.id = ANY(pep.hosts)
      WHERE pep.id = episode_planning_id
    )
  );

CREATE POLICY "Authenticated users can submit questions"
  ON podcast_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Public can submit questions to announced episodes"
  ON podcast_questions FOR INSERT
  WITH CHECK (
    episode_planning_id IN (
      SELECT id FROM podcast_episodes_planning
      WHERE status IN ('scheduled', 'published')
      AND allow_questions = true
    )
  );

CREATE POLICY "Operators can manage all questions"
  ON podcast_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Hosts can manage questions for their episodes"
  ON podcast_questions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT ph.user_id FROM podcast_hosts ph
      INNER JOIN podcast_episodes_planning pep ON ph.id = ANY(pep.hosts)
      WHERE pep.id = episode_planning_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT ph.user_id FROM podcast_hosts ph
      INNER JOIN podcast_episodes_planning pep ON ph.id = ANY(pep.hosts)
      WHERE pep.id = episode_planning_id
    )
  );

-- Host Notes Policies
CREATE POLICY "Operators can view all notes"
  ON podcast_host_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Hosts can view notes for their episodes"
  ON podcast_host_notes FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT ph.user_id FROM podcast_hosts ph
      INNER JOIN podcast_episodes_planning pep ON ph.id = ANY(pep.hosts)
      WHERE pep.id = episode_planning_id
    )
  );

CREATE POLICY "Hosts can create notes"
  ON podcast_host_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM podcast_hosts WHERE id = host_id
    )
  );

CREATE POLICY "Hosts can update their own notes"
  ON podcast_host_notes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = (
      SELECT user_id FROM podcast_hosts WHERE id = host_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM podcast_hosts WHERE id = host_id
    )
  );

-- Webhook Logs Policies (Operators only)
CREATE POLICY "Operators can view webhook logs"
  ON riverside_webhook_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Service role can insert webhook logs"
  ON riverside_webhook_logs FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_podcast_hosts_user ON podcast_hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_planning_status ON podcast_episodes_planning(status);
CREATE INDEX IF NOT EXISTS idx_episode_planning_scheduled ON podcast_episodes_planning(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_episode_planning_riverside ON podcast_episodes_planning(riverside_recording_id);
CREATE INDEX IF NOT EXISTS idx_questions_episode ON podcast_questions(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON podcast_questions(status);
CREATE INDEX IF NOT EXISTS idx_host_notes_episode ON podcast_host_notes(episode_planning_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON riverside_webhook_logs(processed, created_at);