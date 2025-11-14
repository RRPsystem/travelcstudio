/*
  # Test Management System

  1. New Tables
    - `test_features`
      - Features to be tested by Brand/Agent teams
      - Categories: brand, agent, shared
      - Ordered list for consistent testing
    
    - `test_rounds`
      - Tracks testing rounds (max 3)
      - Controls active testing periods
    
    - `test_assignments`
      - Links users to features per round
      - Tracks individual progress
    
    - `test_feedback`
      - Stores tester feedback per feature
      - Status: works, broken, partial
      - Ratings and comments
    
    - `test_feature_status`
      - Operator-controlled status per feature
      - Tracks fix progress across rounds
  
  2. Security
    - Enable RLS on all tables
    - Testers can only see their own assignments/feedback
    - Operators can see everything and update status
    - No cross-tester visibility
*/

-- Test Features Table
CREATE TABLE IF NOT EXISTS test_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('brand', 'agent', 'shared')),
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Test Rounds Table
CREATE TABLE IF NOT EXISTS test_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number integer NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_number)
);

-- Test Assignments Table
CREATE TABLE IF NOT EXISTS test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES test_features(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES test_rounds(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(feature_id, user_id, round_id)
);

-- Test Feedback Table
CREATE TABLE IF NOT EXISTS test_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES test_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES test_features(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES test_rounds(id) ON DELETE CASCADE,
  test_status text CHECK (test_status IN ('works', 'broken', 'partial')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comments text,
  screenshot_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_id, round_id)
);

-- Test Feature Status (Operator Control)
CREATE TABLE IF NOT EXISTS test_feature_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES test_features(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES test_rounds(id) ON DELETE CASCADE,
  operator_status text NOT NULL DEFAULT 'in_test' CHECK (operator_status IN ('in_test', 'needs_fix', 'fixed', 'approved')),
  operator_notes text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(feature_id, round_id)
);

-- Enable RLS
ALTER TABLE test_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_feature_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_features
CREATE POLICY "Anyone can view test features"
  ON test_features FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage test features"
  ON test_features FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for test_rounds
CREATE POLICY "Anyone can view test rounds"
  ON test_rounds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage test rounds"
  ON test_rounds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for test_assignments
CREATE POLICY "Users can view own assignments"
  ON test_assignments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can manage assignments"
  ON test_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for test_feedback
CREATE POLICY "Users can view own feedback"
  ON test_feedback FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON test_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feedback"
  ON test_feedback FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own feedback"
  ON test_feedback FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for test_feature_status
CREATE POLICY "Anyone can view feature status"
  ON test_feature_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage feature status"
  ON test_feature_status FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_assignments_user ON test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_round ON test_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_test_feedback_user ON test_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_test_feedback_feature ON test_feedback(feature_id);
CREATE INDEX IF NOT EXISTS idx_test_feedback_round ON test_feedback(round_id);
CREATE INDEX IF NOT EXISTS idx_test_feature_status_feature ON test_feature_status(feature_id);