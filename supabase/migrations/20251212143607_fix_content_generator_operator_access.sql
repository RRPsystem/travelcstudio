/*
  # Fix Content Generator - Operator Access
  
  1. Problem
    - Operators kunnen geen content_generator_chats bekijken of beheren
    - AI Content Generator werkt niet voor operators
    
  2. Solution
    - Voeg operator policies toe voor volledige toegang tot content_generator_chats
*/

-- Operators can view all content generator chats
CREATE POLICY "Operators can view all chats"
  ON content_generator_chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Operators can manage all content generator chats
CREATE POLICY "Operators can manage all chats"
  ON content_generator_chats
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
