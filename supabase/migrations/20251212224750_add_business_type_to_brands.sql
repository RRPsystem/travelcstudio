/*
  # Add business type to brands

  1. Changes
    - Add `business_type` column to brands table
    - Possible values: 'travel_agency', 'zto', 'united_travel', 'eigen_merk', 'tour_operator'
  
  2. Purpose
    - Track what type of travel business each brand represents
    - Helps with categorization and analytics
    - Separate from website_type which tracks the builder system
*/

-- Add business_type column to brands
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS business_type text 
CHECK (business_type IN ('travel_agency', 'zto', 'united_travel', 'eigen_merk', 'tour_operator'));

-- Add helpful comment
COMMENT ON COLUMN brands.business_type IS 'Type of travel business: travel_agency, zto, united_travel, eigen_merk, or tour_operator';
