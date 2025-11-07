-- =====================================================
-- Seed Auth Users for Supabase Auth Schema
-- Creates users in auth.users table with hashed passwords
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- First, temporarily drop FK constraints to allow clean delete
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_id_fkey CASCADE;
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey CASCADE;

-- Helper function to create auth users with bcrypt password hashing
-- Password: Demo123! (hashed with bcrypt)
DO $$
DECLARE
  admin_id uuid := '11111111-1111-1111-1111-111111111111';
  customer_id uuid := '22222222-2222-2222-2222-222222222222';
  engineer_id uuid := '22222222-2222-2222-2222-222222222223';
  supplier_id uuid := '33333333-3333-3333-3333-333333333333';
  sales_id uuid := '33333333-3333-3333-3333-333333333334';
  encrypted_pass text;
BEGIN
  -- Generate bcrypt hash for "Demo123!"
  encrypted_pass := crypt('Demo123!', gen_salt('bf', 10));

  -- Delete existing auth users if they exist
  DELETE FROM auth.users WHERE id IN (admin_id, customer_id, engineer_id, supplier_id, sales_id);

  -- Insert admin user
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@cncquote.com',
    encrypted_pass,
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"],"role":"admin"}',
    '{"name":"Admin User","role":"admin"}',
    false,
    now() - interval '90 days',
    now()
  );

  -- Insert customer admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    customer_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'customer@acme.com',
    encrypted_pass,
    now(),
    '{"provider":"email","providers":["email"],"role":"customer"}',
    '{"name":"Customer Admin","organization":"Acme Manufacturing"}',
    false,
    now() - interval '60 days',
    now()
  );

  -- Insert engineer
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    engineer_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'engineer@acme.com',
    encrypted_pass,
    now(),
    '{"provider":"email","providers":["email"],"role":"customer"}',
    '{"name":"Engineer User","organization":"Acme Manufacturing"}',
    false,
    now() - interval '55 days',
    now()
  );

  -- Insert supplier admin
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    supplier_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'supplier@precision.com',
    encrypted_pass,
    now(),
    '{"provider":"email","providers":["email"],"role":"supplier"}',
    '{"name":"Supplier Admin","organization":"Precision Supplier Inc"}',
    false,
    now() - interval '45 days',
    now()
  );

  -- Insert sales user
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
  ) VALUES (
    sales_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sales@precision.com',
    encrypted_pass,
    now(),
    '{"provider":"email","providers":["email"],"role":"supplier"}',
    '{"name":"Sales User","organization":"Precision Supplier Inc"}',
    false,
    now() - interval '40 days',
    now()
  );

  RAISE NOTICE 'Created 5 auth users with password: Demo123!';
END $$;

-- Restore the FK constraints from public tables to auth.users
ALTER TABLE users ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE organization_members ADD CONSTRAINT organization_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify auth users created
SELECT 
  'Auth users created successfully' as status,
  COUNT(*) as user_count 
FROM auth.users;

-- Show created users
SELECT 
  email,
  confirmed_at IS NOT NULL as confirmed,
  created_at,
  raw_user_meta_data->>'name' as name,
  raw_app_meta_data->>'role' as role
FROM auth.users
ORDER BY created_at;

SELECT 'AUTHENTICATION SETUP COMPLETE' as "=== STATUS ===";
SELECT 'All 5 users created in auth.users with:' as info;
SELECT '  Email: admin@cncquote.com' as "";
SELECT '  Email: customer@acme.com' as "";
SELECT '  Email: engineer@acme.com' as "";
SELECT '  Email: supplier@precision.com' as "";
SELECT '  Email: sales@precision.com' as "";
SELECT '' as "";
SELECT '  Password: Demo123!' as "";
SELECT '' as "";
SELECT 'FK constraints restored to auth.users' as "";
