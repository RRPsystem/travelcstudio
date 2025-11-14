/*
  # Create helpbot conversations table

  1. New Tables
    - `helpbot_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `user_role` (text) - Brand, Operator, Admin, Agent
      - `user_question` (text) - The question asked
      - `bot_response` (text) - The response given
      - `was_helpful` (boolean, nullable) - User feedback
      - `created_at` (timestamptz)
    
  2. Security
    - Enable RLS on `helpbot_conversations` table
    - Operators can view all conversations
    - Users can view their own conversations
    - Service role can insert (Edge Function)
    
  3. Indexes
    - Index on user_id for faster queries
    - Index on created_at for chronological queries
*/

CREATE TABLE IF NOT EXISTS helpbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_role text NOT NULL,
  user_question text NOT NULL,
  bot_response text NOT NULL,
  was_helpful boolean DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE helpbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view all helpbot conversations"
  ON helpbot_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Users can view own helpbot conversations"
  ON helpbot_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert helpbot conversations"
  ON helpbot_conversations FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_helpbot_conversations_user_id ON helpbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_helpbot_conversations_created_at ON helpbot_conversations(created_at DESC);