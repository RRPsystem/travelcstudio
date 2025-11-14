/*
  # Create Content Generator Chat History Tables

  1. New Tables
    - `content_generator_chats`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to brands)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text) - Chat session title
      - `content_type` (text) - Type of content (destination, route, planning, etc.)
      - `messages` (jsonb) - Array of chat messages
      - `metadata` (jsonb) - Additional data like route info, styles, etc.
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `content_generator_chats` table
    - Add policies for users to manage their own chats within their brand
*/

-- Create content_generator_chats table
CREATE TABLE IF NOT EXISTS content_generator_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_generator_chats_brand_id ON content_generator_chats(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_generator_chats_user_id ON content_generator_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_content_generator_chats_created_at ON content_generator_chats(created_at DESC);

-- Enable RLS
ALTER TABLE content_generator_chats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view chats from their own brand
CREATE POLICY "Users can view own brand chats"
  ON content_generator_chats FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create chats for their own brand
CREATE POLICY "Users can create own brand chats"
  ON content_generator_chats FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can update their own chats
CREATE POLICY "Users can update own chats"
  ON content_generator_chats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own chats
CREATE POLICY "Users can delete own chats"
  ON content_generator_chats FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_generator_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_content_generator_chats_updated_at_trigger ON content_generator_chats;
CREATE TRIGGER update_content_generator_chats_updated_at_trigger
  BEFORE UPDATE ON content_generator_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_content_generator_chats_updated_at();