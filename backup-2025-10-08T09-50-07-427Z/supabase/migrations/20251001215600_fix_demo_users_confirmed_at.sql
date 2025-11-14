/*
  # Fix Demo Users - Remove confirmed_at

  1. Purpose
    - Recreate demo users without setting confirmed_at (it's a generated column)
    - Only set email_confirmed_at

  2. Changes
    - Delete and recreate demo users with proper auth configuration
*/

-- Delete existing demo users completely
DELETE FROM auth.identities WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440012'
);

DELETE FROM public.users WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440012'
);

DELETE FROM auth.users WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440012'
);

-- Get the actual instance_id from the auth config
DO $$
DECLARE
  v_instance_id uuid;
BEGIN
  -- Try to get instance_id from existing users or use default
  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_id;

  -- Create Admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '550e8400-e29b-41d4-a716-446655440010',
    v_instance_id,
    'admin@travel.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb,
    'authenticated',
    'authenticated',
    false,
    false
  );

  -- Create Brand user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '550e8400-e29b-41d4-a716-446655440011',
    v_instance_id,
    'brand@travel.com',
    crypt('brand123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"brand"}'::jsonb,
    'authenticated',
    'authenticated',
    false,
    false
  );

  -- Create Operator user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '550e8400-e29b-41d4-a716-446655440012',
    v_instance_id,
    'operator@travel.com',
    crypt('operator123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"operator"}'::jsonb,
    'authenticated',
    'authenticated',
    false,
    false
  );
END $$;

-- Create identities
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440010',
    jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440010', 'email', 'admin@travel.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440011',
    jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440011', 'email', 'brand@travel.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440012',
    jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440012', 'email', 'operator@travel.com', 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  );

-- Create public.users records
INSERT INTO public.users (id, email, role, brand_id, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'admin@travel.com', 'admin', NULL, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440011', 'brand@travel.com', 'brand', '550e8400-e29b-41d4-a716-446655440001', now(), now()),
  ('550e8400-e29b-41d4-a716-446655440012', 'operator@travel.com', 'operator', NULL, now(), now());
