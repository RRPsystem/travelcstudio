/*
  # Create GPT Models table

  1. New Tables
    - `gpt_models`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `content_type` (text)
      - `system_prompt` (text)
      - `temperature` (numeric)
      - `max_tokens` (integer)
      - `model` (text)
      - `is_active` (boolean)
      - `usage_count` (integer)
      - `last_used` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `gpt_models` table
    - Add policy for operators to manage GPT models
    - Add policy for all authenticated users to read active GPT models
*/

CREATE TABLE IF NOT EXISTS gpt_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content_type text NOT NULL,
  system_prompt text NOT NULL,
  temperature numeric(3,2) DEFAULT 0.7,
  max_tokens integer DEFAULT 1500,
  model text DEFAULT 'gpt-3.5-turbo',
  is_active boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gpt_models ENABLE ROW LEVEL SECURITY;

-- Operators can manage all GPT models
CREATE POLICY "Operators can manage GPT models"
  ON gpt_models
  FOR ALL
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

-- All authenticated users can read active GPT models
CREATE POLICY "Users can read active GPT models"
  ON gpt_models
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_gpt_models_updated_at 
  BEFORE UPDATE ON gpt_models 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();