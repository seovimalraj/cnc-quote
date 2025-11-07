-- Seed demo users for custom auth flow
-- Password: Demo123! (will be hashed by bcrypt in app)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- First insert into auth.users (parent table with passwords)
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'admin@cncquote.com',
    crypt('Demo123!', gen_salt('bf', 10)),
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'customer@acme.com',
    crypt('Demo123!', gen_salt('bf', 10)),
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'engineer@techcorp.com',
    crypt('Demo123!', gen_salt('bf', 10)),
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'supplier@fabrication.com',
    crypt('Demo123!', gen_salt('bf', 10)),
    NOW(),
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'sales@cncquote.com',
    crypt('Demo123!', gen_salt('bf', 10)),
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE 
SET 
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

-- Then insert into public.users (references auth.users)
INSERT INTO users (id, email, role, organization_id, default_org_id, last_org_id, status, password_set_at, created_at, updated_at)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'admin@cncquote.com',
    'admin',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'active',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'customer@acme.com',
    'member',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'active',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'engineer@techcorp.com',
    'member',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'active',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'supplier@fabrication.com',
    'member',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'active',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'sales@cncquote.com',
    'admin',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'active',
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE 
SET 
  role = EXCLUDED.role,
  updated_at = NOW();

SELECT 'Demo users seeded successfully' as status;
SELECT email, role FROM users WHERE email LIKE '%@%' ORDER BY email;
