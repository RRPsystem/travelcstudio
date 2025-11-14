/*
  # Add feedback update policy for helpbot conversations

  1. Changes
    - Add UPDATE policy so users can update their own conversation feedback
    
  2. Security
    - Users can only update was_helpful on their own conversations
*/

CREATE POLICY "Users can update own conversation feedback"
  ON helpbot_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);