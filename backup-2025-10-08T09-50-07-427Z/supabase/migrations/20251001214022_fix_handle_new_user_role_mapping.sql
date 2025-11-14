/*
  # Fix handle_new_user Role Mapping

  1. Purpose
    - Handle cases where user metadata contains roles not in profiles enum
    - Map common roles or use default 'employee'

  2. Changes
    - Update handle_new_user to safely handle role mapping
    - Only use role from metadata if it exists in enum, otherwise use 'employee'
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role user_role;
  v_role_text text;
BEGIN
  -- Get role from metadata
  v_role_text := new.raw_user_meta_data ->> 'role';
  
  -- Map to valid enum value or use default
  v_role := CASE 
    WHEN v_role_text IN ('admin', 'manager', 'director', 'employee') THEN v_role_text::user_role
    ELSE 'employee'::user_role
  END;

  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(new.raw_user_meta_data ->> 'first_name', profiles.first_name),
    last_name = coalesce(new.raw_user_meta_data ->> 'last_name', profiles.last_name),
    email = new.email,
    role = v_role;

  RETURN new;
END;
$function$;
