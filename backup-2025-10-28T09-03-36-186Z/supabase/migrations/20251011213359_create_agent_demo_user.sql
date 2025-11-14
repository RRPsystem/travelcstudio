/*
  # Create Agent Demo User

  1. Changes
    - Creates agent@travel.com demo user in auth.users
    - Creates corresponding profile in public.users with 'agent' role
    - Sets password to 'agent123'
    
  2. Security
    - Password is hashed using Supabase auth
    - User is confirmed immediately for demo purposes
*/

-- Create agent user in auth.users
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
  confirmation_token,
  recovery_token
)
VALUES (
  '724acef5-a7dd-4f4b-8c8c-43f223d62a10',
  '00000000-0000-0000-0000-000000000000',
  'agent@travel.com',
  crypt('agent123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Create profile in public.users
INSERT INTO public.users (
  id,
  email,
  role,
  created_at,
  updated_at
)
VALUES (
  '724acef5-a7dd-4f4b-8c8c-43f223d62a10',
  'agent@travel.com',
  'agent',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
