/*
  # Create wbctx storage table

  1. New Tables
    - `wbctx_storage`
      - `id` (text, primary key) - Short ID for context
      - `ctx_data` (jsonb) - Full context object with signature
      - `expires_at` (timestamptz) - When context expires
      - `used` (boolean) - Whether ephemeral context has been used
      - `ephemeral` (boolean) - Whether context is single-use
      - `created_at` (timestamptz) - When context was created
  
  2. Security
    - Enable RLS on `wbctx_storage` table
    - Public read access for non-expired contexts
    - No write/update/delete access (only via edge function)
  
  3. Indexes
    - Index on expires_at for cleanup queries
    - Index on created_at for monitoring
*/

CREATE TABLE IF NOT EXISTS wbctx_storage (
  id text PRIMARY KEY,
  ctx_data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  ephemeral boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wbctx_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of non-expired contexts"
  ON wbctx_storage
  FOR SELECT
  USING (expires_at > now() AND (NOT ephemeral OR NOT used));

CREATE INDEX IF NOT EXISTS idx_wbctx_expires_at ON wbctx_storage(expires_at);
CREATE INDEX IF NOT EXISTS idx_wbctx_created_at ON wbctx_storage(created_at);

CREATE OR REPLACE FUNCTION cleanup_expired_wbctx()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM wbctx_storage WHERE expires_at < now() - interval '1 hour';
END;
$$;
