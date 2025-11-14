/*
  # Add Certification Numbers to Brands Table

  ## Summary
  Adds certification and registration numbers for travel industry compliance
  to the brands table. These fields are optional and can be filled in later.

  ## Changes
  
  ### Modified Tables: `brands`
  - `anvr_number` (text) - ANVR (Nederlandse reisbranche vereniging) registration number
  - `sgr_number` (text) - SGR (Stichting Garantiefonds Reisgelden) registration number
  - `calamiteitenfonds_number` (text) - Calamiteitenfonds registration number

  All fields are nullable so existing brands remain intact and can be updated later.

  ## Notes
  - Existing brands will have NULL values for these new fields
  - These can be filled in through the Brand Settings interface
  - No data loss - all existing brand data remains unchanged
*/

-- Add certification number fields to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS anvr_number text;

ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS sgr_number text;

ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS calamiteitenfonds_number text;
