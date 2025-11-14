/*
  # Add foreign key relationship between users and brands

  1. Changes
    - Add foreign key constraint from users.brand_id to brands.id
    - This establishes the relationship that Supabase PostgREST expects

  2. Security
    - No RLS changes needed
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_brand_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_brand_id_fkey
      FOREIGN KEY (brand_id)
      REFERENCES brands(id)
      ON DELETE SET NULL;
  END IF;
END $$;
