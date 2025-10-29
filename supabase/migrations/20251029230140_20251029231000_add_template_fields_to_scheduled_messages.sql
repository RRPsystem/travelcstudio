/*
  # Add Template Support to Scheduled WhatsApp Messages

  1. Changes
    - Add `template_name` column to reference whatsapp_templates
    - Add `template_variables` jsonb column for dynamic template values
    - Make `message_content` nullable (since templates don't need it)
    - Make `trip_id` nullable (not all messages are trip-related)

  2. Notes
    - When template_name is set, the system will use the template instead of message_content
    - template_variables should match the variables defined in the template
*/

-- Make trip_id nullable
ALTER TABLE scheduled_whatsapp_messages 
  ALTER COLUMN trip_id DROP NOT NULL;

-- Make message_content nullable (templates don't need content)
ALTER TABLE scheduled_whatsapp_messages 
  ALTER COLUMN message_content DROP NOT NULL;

-- Add template fields
ALTER TABLE scheduled_whatsapp_messages 
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS template_variables jsonb DEFAULT '{}'::jsonb;

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_template 
  ON scheduled_whatsapp_messages(template_name) 
  WHERE template_name IS NOT NULL;
