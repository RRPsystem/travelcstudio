/*
  # Fix Function Search Path Security Warnings
  
  This migration fixes the security warnings by setting explicit search_path on all database functions.
  
  ## Security Changes
  - Sets search_path to 'public, pg_temp' on all functions
  - Prevents potential security vulnerabilities from search_path manipulation
  - Addresses all 40 warnings shown in Security Advisor
  
  ## Functions Updated
  - All trigger functions (set_updated_at, update_*_updated_at, etc.)
  - All utility functions (cleanup_*, ensure_*, fill_*, etc.)
  - All custom functions (generate_*, get_*, increment_*, etc.)
*/

-- Update all functions in the public schema with proper search_path
DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')  -- functions and procedures
  LOOP
    BEGIN
      -- Build the function signature
      func_signature := format('%I.%I(%s)', 
        func_record.schema_name,
        func_record.function_name,
        func_record.args
      );
      
      -- Set the search_path
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', func_signature);
      
      RAISE NOTICE 'Updated function: %', func_signature;
    EXCEPTION 
      WHEN OTHERS THEN
        RAISE NOTICE 'Skipped function % due to error: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;
