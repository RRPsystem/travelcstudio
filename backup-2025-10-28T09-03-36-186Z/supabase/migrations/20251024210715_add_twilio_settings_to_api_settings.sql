/*
  # Add Twilio Settings to api_settings

  1. Changes
    - Add `twilio_account_sid` for Twilio account identifier
    - Add `twilio_auth_token` for Twilio authentication
    - Add `twilio_whatsapp_number` for the WhatsApp Business number

  2. Purpose
    - Store Twilio credentials per brand for WhatsApp integration
    - Secure storage with RLS already in place on api_settings table
*/

-- Add Twilio fields to api_settings
ALTER TABLE api_settings 
ADD COLUMN IF NOT EXISTS twilio_account_sid text,
ADD COLUMN IF NOT EXISTS twilio_auth_token text,
ADD COLUMN IF NOT EXISTS twilio_whatsapp_number text;
