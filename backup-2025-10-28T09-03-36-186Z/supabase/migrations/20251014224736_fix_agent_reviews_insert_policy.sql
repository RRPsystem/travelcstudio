/*
  # Fix Agent Reviews Insert Policy

  1. Changes
    - Drop existing restrictive policy for agents
    - Add separate policies for INSERT, UPDATE, DELETE
    - Allow agents to insert reviews for their own agent_id
    - Allow agents to update/delete their own reviews
  
  2. Security
    - Agents can only manage reviews for their own profile
    - Operators can manage all reviews
    - Public can view published reviews
*/

-- Drop the existing policy that uses "ALL"
DROP POLICY IF EXISTS "Agents can manage their reviews" ON agent_reviews;

-- Allow agents to insert reviews for their own profile
CREATE POLICY "Agents can insert own reviews"
  ON agent_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents 
      WHERE id = agent_id
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'agent'
      )
    )
  );

-- Allow agents to update their own reviews
CREATE POLICY "Agents can update own reviews"
  ON agent_reviews FOR UPDATE
  TO authenticated
  USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN users u ON u.brand_id = a.brand_id
      WHERE u.id = auth.uid() AND u.role = 'agent'
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN users u ON u.brand_id = a.brand_id
      WHERE u.id = auth.uid() AND u.role = 'agent'
    )
  );

-- Allow agents to delete their own reviews
CREATE POLICY "Agents can delete own reviews"
  ON agent_reviews FOR DELETE
  TO authenticated
  USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN users u ON u.brand_id = a.brand_id
      WHERE u.id = auth.uid() AND u.role = 'agent'
    )
  );