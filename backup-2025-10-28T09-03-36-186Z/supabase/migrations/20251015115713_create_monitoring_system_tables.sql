/*
  # Create Monitoring & Error Tracking System

  ## Summary
  Creates tables for comprehensive system monitoring, error logging, and performance tracking
  for the operator dashboard.

  ## New Tables
  
  ### `system_errors`
  Stores frontend and backend errors with stack traces and context
  - `id` (uuid, primary key)
  - `error_type` (text) - Type of error (frontend, backend, api, database)
  - `severity` (text) - critical, error, warning, info
  - `message` (text) - Error message
  - `stack_trace` (text) - Full stack trace
  - `user_id` (uuid) - User who encountered the error
  - `url` (text) - Page URL where error occurred
  - `user_agent` (text) - Browser user agent
  - `context` (jsonb) - Additional context data
  - `resolved` (boolean) - Whether error has been resolved
  - `resolved_by` (uuid) - Operator who resolved it
  - `resolved_at` (timestamptz) - When it was resolved
  - `created_at` (timestamptz)

  ### `system_metrics`
  Stores time-series performance metrics
  - `id` (uuid, primary key)
  - `metric_name` (text) - Name of the metric
  - `metric_value` (numeric) - The value
  - `metric_unit` (text) - Unit (ms, MB, count, percentage)
  - `tags` (jsonb) - Additional tags for filtering
  - `recorded_at` (timestamptz)

  ### `api_usage_logs`
  Tracks external API usage for cost monitoring
  - `id` (uuid, primary key)
  - `api_name` (text) - OpenAI, Google Maps, etc.
  - `endpoint` (text) - Specific endpoint called
  - `tokens_used` (integer) - For OpenAI
  - `cost_estimate` (numeric) - Estimated cost in USD
  - `response_time_ms` (integer) - Response time
  - `status_code` (integer) - HTTP status
  - `brand_id` (uuid) - Which brand made the request
  - `user_id` (uuid) - Which user made the request
  - `created_at` (timestamptz)

  ### `system_alerts`
  Active alerts that need operator attention
  - `id` (uuid, primary key)
  - `alert_type` (text) - error_spike, high_api_cost, performance_degradation
  - `severity` (text) - critical, warning, info
  - `title` (text)
  - `description` (text)
  - `threshold_value` (numeric) - What triggered the alert
  - `current_value` (numeric) - Current value
  - `acknowledged` (boolean)
  - `acknowledged_by` (uuid)
  - `acknowledged_at` (timestamptz)
  - `resolved` (boolean)
  - `resolved_by` (uuid)
  - `resolved_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Only operators can read/write monitoring data
  - System can insert errors without authentication (for error tracking)

  ## Indexes
  - Index on created_at for time-based queries
  - Index on severity for filtering critical issues
  - Index on brand_id for per-brand analytics
*/

-- Create system_errors table
CREATE TABLE IF NOT EXISTS system_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL CHECK (error_type IN ('frontend', 'backend', 'api', 'database', 'edge_function')),
  severity text NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  message text NOT NULL,
  stack_trace text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  url text,
  user_agent text,
  context jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text NOT NULL,
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  endpoint text,
  tokens_used integer,
  cost_estimate numeric(10, 6),
  response_time_ms integer,
  status_code integer,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create system_alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  description text,
  threshold_value numeric,
  current_value numeric,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_severity ON system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON system_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_system_errors_user_id ON system_errors(user_id);

CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_brand_id ON api_usage_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_name ON api_usage_logs(api_name);

CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);

-- Enable Row Level Security
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_errors
CREATE POLICY "Operators can view all errors"
  ON system_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can update errors"
  ON system_errors FOR UPDATE
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

CREATE POLICY "System can insert errors"
  ON system_errors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert errors for error tracking"
  ON system_errors FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policies for system_metrics
CREATE POLICY "Operators can view metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "System can insert metrics"
  ON system_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for api_usage_logs
CREATE POLICY "Operators can view API usage"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "System can insert API usage logs"
  ON api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for system_alerts
CREATE POLICY "Operators can view alerts"
  ON system_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Operators can update alerts"
  ON system_alerts FOR UPDATE
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

CREATE POLICY "System can insert alerts"
  ON system_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);
