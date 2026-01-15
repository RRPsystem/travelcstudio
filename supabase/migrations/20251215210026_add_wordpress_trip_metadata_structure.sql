/*
  # WordPress Trip Metadata Structure

  1. Purpose
    - Add metadata column to trip_brand_assignments
    - Enable WordPress ↔ Supabase synchronization
    - Store WordPress-specific data (booking URLs, contact info, etc.)

  2. Changes
    - Add metadata JSONB column to trip_brand_assignments
    - Add GIN index for efficient wp_post_id lookups
    - Add index for brand_id + wp_post_id combination

  3. Metadata Structure
    The metadata JSONB column will contain:
    - wp_post_id: WordPress post ID (number)
    - wp_slug: WordPress post slug (string)
    - wp_url: Direct link to WordPress post (string)
    - wp_status: WordPress post status (draft/publish)
    - booking_url: Brand's booking URL (string)
    - contact_button_text: Contact button label (string)
    - contact_button_url: Contact button URL (string)
    - whatsapp_number: WhatsApp number (string)
    - whatsapp_message: Pre-filled WhatsApp message (string)
    - last_pushed_at: Last push to WordPress timestamp
    - last_synced_from_wp: Last sync from WordPress timestamp
    - wp_published_at: WordPress publication date
    - push_status: Status of last push (success/failed)
*/

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_brand_assignments' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE trip_brand_assignments ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comment to metadata column documenting structure
COMMENT ON COLUMN trip_brand_assignments.metadata IS 'WordPress sync metadata: wp_post_id, wp_slug, wp_url, wp_status, booking_url, contact_button_text, contact_button_url, whatsapp_number, whatsapp_message, last_pushed_at, last_synced_from_wp, wp_published_at, push_status';

-- Create GIN index for efficient wp_post_id lookups
CREATE INDEX IF NOT EXISTS idx_trip_assignments_wp_post_id
ON trip_brand_assignments USING GIN (metadata);

-- Create index for brand_id + wp_post_id combination (common query pattern)
CREATE INDEX IF NOT EXISTS idx_trip_assignments_brand_wp_post
ON trip_brand_assignments (brand_id)
WHERE metadata ? 'wp_post_id';
