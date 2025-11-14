/*
  # Create Agent Demo User - Complete

  1. Changes
    - Creates agent@travel.com demo user in auth.users with all required fields
    - Creates auth.identities entry for email/password authentication
    - Creates corresponding profile in public.users with 'agent' role
    - Sets password to 'agent123'
    
  2. Security
    - Password is hashed using Supabase auth
    - User is confirmed immediately for demo purposes
*/

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete existing agent user if exists
DELETE FROM auth.identities WHERE user_id = '550e8400-e29b-41d4-a716-446655440013';
DELETE FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440013';
DELETE FROM public.users WHERE id = '550e8400-e29b-41d4-a716-446655440013';

-- Create Agent user in auth.users
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
  recovery_token,
  email_change_token_new,
  is_sso_user,
  is_anonymous
) VALUES (
  '550e8400-e29b-41d4-a716-446655440013',
  '00000000-0000-0000-0000-000000000000',
  'agent@travel.com',
  crypt('agent123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"agent"}',
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  false,
  false
);

-- Create identity for email/password auth
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440013',
  jsonb_build_object('sub', '550e8400-e29b-41d4-a716-446655440013', 'email', 'agent@travel.com'),
  'email',
  now(),
  now(),
  now()
);

-- Create profile in public.users
INSERT INTO public.users (
  id,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440013',
  'agent@travel.com',
  'agent',
  now(),
  now()
);
