/*
  # Add Admin Policies for Podcast Management

  1. Changes
    - Add policies for admins to manage podcast episodes
    - Add policies for admins to manage podcast questions
    - Add policies for admins to view all podcast data

  2. Security
    - Admins can create, read, update and delete episodes
    - Admins can manage all questions
    - Admins can view all host notes
*/

-- Add admin policy for viewing all planning
CREATE POLICY "Admins can view all planning"
  ON podcast_episodes_planning FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add admin policy for managing all planning
CREATE POLICY "Admins can manage all planning"
  ON podcast_episodes_planning FOR ALL
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

-- Add admin policy for viewing all questions
CREATE POLICY "Admins can view all questions"
  ON podcast_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add admin policy for managing all questions
CREATE POLICY "Admins can manage all questions"
  ON podcast_questions FOR ALL
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

-- Add admin policy for viewing all host notes
CREATE POLICY "Admins can view all host notes"
  ON podcast_host_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add admin policy for managing hosts
CREATE POLICY "Admins can manage hosts"
  ON podcast_hosts FOR ALL
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
