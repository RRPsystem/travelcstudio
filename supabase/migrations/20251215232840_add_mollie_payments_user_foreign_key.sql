/*
  # Add foreign key for mollie_payments to users

  1. Changes
    - Add foreign key constraint from mollie_payments.user_id to users.id
    - This allows joining payment data with user information
  
  2. Security
    - No RLS changes needed - existing policies remain in place
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mollie_payments_user_id_fkey' 
    AND table_name = 'mollie_payments'
  ) THEN
    ALTER TABLE mollie_payments 
    ADD CONSTRAINT mollie_payments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
