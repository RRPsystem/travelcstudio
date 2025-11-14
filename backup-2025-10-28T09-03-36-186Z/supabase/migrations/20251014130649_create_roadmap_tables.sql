/*
  # Create Roadmap Feature Tables

  1. New Tables
    - `roadmap_items`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `status` (text, default 'submitted')
        - Values: submitted, under_review, planned, in_progress, testing, completed, rejected
      - `category` (text, required)
        - Values: feature, improvement, bug_fix, integration
      - `vote_count` (integer, default 0)
      - `created_by` (uuid, references users)
      - `brand_id` (uuid, references brands)
      - `assigned_to` (uuid, references users, nullable)
      - `priority` (text, default 'medium')
        - Values: low, medium, high, critical
      - `estimated_release` (date, nullable)
      - `operator_notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `roadmap_votes`
      - `id` (uuid, primary key)
      - `roadmap_item_id` (uuid, references roadmap_items)
      - `user_id` (uuid, references users)
      - `created_at` (timestamptz)
      - Unique constraint on (roadmap_item_id, user_id)

  2. Security
    - Enable RLS on both tables
    - Brands/Agents can create items and votes
    - Everyone can read all roadmap items
    - Only operators can update items
    - Users can only delete their own votes
*/

-- Create roadmap_items table
CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'planned', 'in_progress', 'testing', 'completed', 'rejected')),
  category text NOT NULL CHECK (category IN ('feature', 'improvement', 'bug_fix', 'integration')),
  vote_count integer DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_release date,
  operator_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create roadmap_votes table
CREATE TABLE IF NOT EXISTS roadmap_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid NOT NULL REFERENCES roadmap_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(roadmap_item_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_items_brand_id ON roadmap_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_created_by ON roadmap_items(created_by);
CREATE INDEX IF NOT EXISTS idx_roadmap_votes_item_id ON roadmap_votes(roadmap_item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_votes_user_id ON roadmap_votes(user_id);

-- Enable RLS
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmap_items

-- Everyone can read all roadmap items
CREATE POLICY "Anyone can view roadmap items"
  ON roadmap_items FOR SELECT
  TO authenticated
  USING (true);

-- Brands and agents can create items
CREATE POLICY "Brands and agents can create roadmap items"
  ON roadmap_items FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Only operators can update roadmap items
CREATE POLICY "Operators can update roadmap items"
  ON roadmap_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'operator'
    )
  );

-- Creators can update their own items if status is still 'submitted'
CREATE POLICY "Creators can update their own submitted items"
  ON roadmap_items FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND status = 'submitted'
  )
  WITH CHECK (
    created_by = auth.uid() AND status = 'submitted'
  );

-- RLS Policies for roadmap_votes

-- Everyone can view votes
CREATE POLICY "Anyone can view votes"
  ON roadmap_votes FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own votes
CREATE POLICY "Users can create votes"
  ON roadmap_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
  ON roadmap_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update vote_count when votes change
CREATE OR REPLACE FUNCTION update_roadmap_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roadmap_items 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.roadmap_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roadmap_items 
    SET vote_count = vote_count - 1 
    WHERE id = OLD.roadmap_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update vote_count
DROP TRIGGER IF EXISTS trigger_update_roadmap_vote_count ON roadmap_votes;
CREATE TRIGGER trigger_update_roadmap_vote_count
  AFTER INSERT OR DELETE ON roadmap_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_vote_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_roadmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_roadmap_updated_at ON roadmap_items;
CREATE TRIGGER trigger_update_roadmap_updated_at
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_updated_at();