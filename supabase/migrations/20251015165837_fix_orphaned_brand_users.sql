/*
  # Fix Orphaned Brand Users
  
  1. Changes
    - Creates brands for brand users who don't have a brand_id
    - Links those users to their newly created brands
    - Ensures all brand users have a valid brand_id
  
  2. Security
    - No RLS changes needed
*/

DO $$
DECLARE
  orphaned_user RECORD;
  new_brand_id uuid;
  default_company_id uuid;
  brand_name_base text;
  brand_name text;
  brand_slug text;
  counter int;
BEGIN
  -- Get the "Algemeen" company ID as default
  SELECT id INTO default_company_id 
  FROM companies 
  WHERE name = 'Algemeen' 
  LIMIT 1;
  
  -- If no default company exists, create one
  IF default_company_id IS NULL THEN
    INSERT INTO companies (name, description)
    VALUES ('Algemeen', 'Default company for orphaned brands')
    RETURNING id INTO default_company_id;
  END IF;
  
  -- Loop through all brand users without a brand_id
  FOR orphaned_user IN 
    SELECT id, email 
    FROM users 
    WHERE role = 'brand' AND brand_id IS NULL
  LOOP
    -- Generate a unique brand name
    brand_name_base := COALESCE(
      INITCAP(REPLACE(SPLIT_PART(orphaned_user.email, '@', 1), '.', ' ')),
      'Brand User'
    );
    
    brand_name := brand_name_base;
    counter := 1;
    
    -- Ensure unique name
    WHILE EXISTS (SELECT 1 FROM brands WHERE company_id = default_company_id AND name = brand_name) LOOP
      brand_name := brand_name_base || ' ' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Generate slug
    brand_slug := LOWER(REPLACE(brand_name, ' ', '-')) || '-' || substring(orphaned_user.id::text, 1, 8);
    
    -- Create a brand for this user
    INSERT INTO brands (
      company_id,
      name,
      slug,
      description,
      business_type,
      contact_email
    ) VALUES (
      default_company_id,
      brand_name,
      brand_slug,
      'Auto-generated brand for existing user',
      'custom_travel_agency',
      orphaned_user.email
    )
    RETURNING id INTO new_brand_id;
    
    -- Update the user with the new brand_id
    UPDATE users 
    SET brand_id = new_brand_id
    WHERE id = orphaned_user.id;
    
    RAISE NOTICE 'Created brand % (%) for user %', brand_name, new_brand_id, orphaned_user.email;
  END LOOP;
END $$;
