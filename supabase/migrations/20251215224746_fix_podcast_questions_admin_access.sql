/*
  # Fix Podcast Questions Admin Access for Collaboration
  
  1. Changes
    - Add policy for ADMINS to view all questions (not just operators)
    - Add policy for ADMINS to update all questions
    - Add policy for ADMINS to delete questions
    
  2. Reasoning
    - In a collaboration project, all admins need full access to all questions
    - This enables proper teamwork on podcast preparation
    - Operators and Admins now have equal access to manage questions
    
  3. Security
    - Still restricted to authenticated users with admin/operator role
    - Regular users can only submit, not view or edit
*/

-- Drop the old restrictive view policy and replace with admin-inclusive one
DROP POLICY IF EXISTS "Operators and hosts can view all questions" ON podcast_questions;

CREATE POLICY "Admins, operators and hosts can view all questions"
  ON podcast_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
    OR auth.uid() IN (
      SELECT ph.user_id FROM podcast_hosts ph
      INNER JOIN podcast_episodes_planning pep ON ph.id = ANY(pep.hosts)
      WHERE pep.id = episode_planning_id
    )
  );

-- Add admin update policy
CREATE POLICY "Admins can update all questions"
  ON podcast_questions FOR UPDATE
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

-- Add admin delete policy
CREATE POLICY "Admins can delete questions"
  ON podcast_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('operator', 'admin')
    )
  );