/*
  # Add last_verification_attempt to brand_domains

  1. Changes
    - Add `last_verification_attempt` timestamp column to track DNS verification attempts
    - This helps prevent abuse and provides debugging information

  2. Purpose
    - Track when domain verification was last attempted
    - Useful for rate limiting and troubleshooting DNS issues
*/

-- Add last_verification_attempt column to brand_domains
ALTER TABLE brand_domains 
ADD COLUMN IF NOT EXISTS last_verification_attempt timestamptz;

-- Add index for performance when querying recent verification attempts
CREATE INDEX IF NOT EXISTS idx_brand_domains_verification_attempt 
ON brand_domains(last_verification_attempt DESC);
