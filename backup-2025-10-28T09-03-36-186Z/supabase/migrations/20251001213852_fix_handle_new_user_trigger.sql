/*
  # Fix handle_new_user Trigger Function

  1. Purpose
    - Fix type casting issue in handle_new_user function
    - Ensure role is properly cast to user_role enum type

  2. Changes
    - Update handle_new_user function to cast role string to user_role enum
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, first_name, last_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'medewerker'::user_role)
  )
  on conflict (id) do update set
    first_name = coalesce(new.raw_user_meta_data ->> 'first_name', profiles.first_name),
    last_name = coalesce(new.raw_user_meta_data ->> 'last_name', profiles.last_name),
    email = new.email,
    role = coalesce((new.raw_user_meta_data ->> 'role')::user_role, profiles.role);

  return new;
end;
$function$;
