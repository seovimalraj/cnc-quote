-- =====================================================
-- CNC Quote Portal Demo Data Seed Script
-- Creates realistic data for Admin, Customer, and Supplier portals
-- =====================================================

-- Clear existing demo data (keep this idempotent)
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE org_id IN (
  SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
));
DELETE FROM orders WHERE org_id IN (SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc'));
DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE org_id IN (
  SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
));
DELETE FROM quotes WHERE org_id IN (SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc'));
DELETE FROM organization_members WHERE organization_id IN (SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc'));
DELETE FROM users WHERE email IN ('admin@cncquote.com', 'customer@acme.com', 'supplier@precision.com', 'john@acme.com', 'sarah@precision.com');
DELETE FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc');

-- =====================================================
-- 1. CREATE ORGANIZATIONS
-- =====================================================

-- Admin Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Admin Org',
  'admin-org',
  now() - interval '180 days',
  now()
);

-- Customer Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Acme Manufacturing',
  'acme-manufacturing',
  now() - interval '120 days',
  now()
);

-- Supplier Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Precision Supplier Inc',
  'precision-supplier',
  now() - interval '90 days',
  now()
);

-- =====================================================
-- 2. CREATE AUTH USERS
-- Note: In real usage, these would be created via Supabase Auth
-- For demo, we'll create users table entries and you'll need to
-- create the auth.users manually via Supabase Dashboard or API
-- =====================================================

-- Create users in users table (assumes auth.users created separately)
-- Password for all demo users: Demo123!

-- Admin User (ID: a0000000-0000-0000-0000-000000000001)
INSERT INTO users (id, email, organization_id, role, status, created_at, updated_at, last_login_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'admin@cncquote.com',
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'active',
  now() - interval '180 days',
  now(),
  now() - interval '2 hours'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Customer User (ID: a0000000-0000-0000-0000-000000000002)
INSERT INTO users (id, email, organization_id, role, status, created_at, updated_at, last_login_at)
VALUES (
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'customer@acme.com',
  '00000000-0000-0000-0000-000000000002'::uuid,
  'admin',
  'active',
  now() - interval '120 days',
  now(),
  now() - interval '1 hour'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Customer User 2 (ID: a0000000-0000-0000-0000-000000000004)
INSERT INTO users (id, email, organization_id, role, status, created_at, updated_at, last_login_at)
VALUES (
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'john@acme.com',
  '00000000-0000-0000-0000-000000000002'::uuid,
  'member',
  'active',
  now() - interval '90 days',
  now(),
  now() - interval '6 hours'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Supplier User (ID: a0000000-0000-0000-0000-000000000003)
INSERT INTO users (id, email, organization_id, role, status, created_at, updated_at, last_login_at)
VALUES (
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'supplier@precision.com',
  '00000000-0000-0000-0000-000000000003'::uuid,
  'admin',
  'active',
  now() - interval '90 days',
  now(),
  now() - interval '30 minutes'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Supplier User 2 (ID: a0000000-0000-0000-0000-000000000005)
INSERT INTO users (id, email, organization_id, role, status, created_at, updated_at, last_login_at)
VALUES (
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'sarah@precision.com',
  '00000000-0000-0000-0000-000000000003'::uuid,
  'member',
  'active',
  now() - interval '60 days',
  now(),
  now() - interval '3 hours'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- =====================================================
-- 3. CREATE ORGANIZATION MEMBERSHIPS
-- =====================================================

INSERT INTO organization_members (organization_id, user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin', now() - interval '180 days'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'admin', now() - interval '120 days'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'member', now() - interval '90 days'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'admin', now() - interval '90 days'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000005'::uuid, 'member', now() - interval '60 days')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- =====================================================
-- 4. CREATE PROFILES (if using old profiles table)
-- =====================================================

INSERT INTO profiles (id, full_name, organization_id, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Admin User', '00000000-0000-0000-0000-000000000001'::uuid, now() - interval '180 days', now()),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Jane Smith', '00000000-0000-0000-0000-000000000002'::uuid, now() - interval '120 days', now()),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'John Doe', '00000000-0000-0000-0000-000000000002'::uuid, now() - interval '90 days', now()),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Mike Johnson', '00000000-0000-0000-0000-000000000003'::uuid, now() - interval '90 days', now()),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Sarah Williams', '00000000-0000-0000-0000-000000000003'::uuid, now() - interval '60 days', now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  organization_id = EXCLUDED.organization_id;

-- =====================================================
-- 5. CREATE CUSTOMER QUOTES
-- =====================================================

INSERT INTO quotes (
  id,
  org_id,
  user_id,
  status,
  total_amount,
  currency,
  expires_at,
  created_at,
  updated_at
)
VALUES
  -- Quote 1: Approved
  (
    'q0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'approved',
    2450.00,
    'USD',
    now() + interval '30 days',
    now() - interval '15 days',
    now() - interval '10 days'
  ),
  -- Quote 2: Pending
  (
    'q0000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'pending',
    1875.50,
    'USD',
    now() + interval '25 days',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  -- Quote 3: Draft
  (
    'q0000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'draft',
    3200.00,
    'USD',
    now() + interval '40 days',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  -- Quote 4: Expired
  (
    'q0000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'expired',
    1250.00,
    'USD',
    now() - interval '10 days',
    now() - interval '50 days',
    now() - interval '40 days'
  );

-- Quote Items
INSERT INTO quote_items (
  id,
  quote_id,
  file_id,
  quantity,
  unit_price,
  total_price,
  material,
  process,
  finish,
  created_at
)
VALUES
  -- Items for Quote 1
  (
    'qi000000-0000-0000-0000-000000000001'::uuid,
    'q0000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    10,
    125.00,
    1250.00,
    'Aluminum 6061',
    'CNC Milling',
    'Anodized',
    now() - interval '15 days'
  ),
  (
    'qi000000-0000-0000-0000-000000000002'::uuid,
    'q0000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    5,
    240.00,
    1200.00,
    'Stainless Steel 304',
    'CNC Turning',
    'Brushed',
    now() - interval '15 days'
  ),
  -- Items for Quote 2
  (
    'qi000000-0000-0000-0000-000000000003'::uuid,
    'q0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    25,
    75.02,
    1875.50,
    'Aluminum 7075',
    'CNC Milling',
    'As Machined',
    now() - interval '5 days'
  ),
  -- Items for Quote 3
  (
    'qi000000-0000-0000-0000-000000000004'::uuid,
    'q0000000-0000-0000-0000-000000000003'::uuid,
    NULL,
    8,
    400.00,
    3200.00,
    'Titanium Ti-6Al-4V',
    'CNC Milling',
    'Bead Blasted',
    now() - interval '2 days'
  );

-- =====================================================
-- 6. CREATE CUSTOMER ORDERS
-- =====================================================

INSERT INTO orders (
  id,
  org_id,
  quote_id,
  user_id,
  order_number,
  status,
  total_amount,
  currency,
  created_at,
  updated_at
)
VALUES
  -- Order 1: In Production
  (
    'o0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'q0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'ORD-2025-0001',
    'in_production',
    2450.00,
    'USD',
    now() - interval '8 days',
    now() - interval '1 day'
  ),
  -- Order 2: Shipped
  (
    'o0000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'ORD-2025-0002',
    'shipped',
    3675.00,
    'USD',
    now() - interval '45 days',
    now() - interval '5 days'
  ),
  -- Order 3: Completed
  (
    'o0000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'ORD-2025-0003',
    'completed',
    1250.00,
    'USD',
    now() - interval '75 days',
    now() - interval '60 days'
  );

-- Order Items
INSERT INTO order_items (
  id,
  order_id,
  quote_item_id,
  file_id,
  quantity,
  unit_price,
  total_price,
  status,
  created_at
)
VALUES
  -- Items for Order 1
  (
    'oi000000-0000-0000-0000-000000000001'::uuid,
    'o0000000-0000-0000-0000-000000000001'::uuid,
    'qi000000-0000-0000-0000-000000000001'::uuid,
    NULL,
    10,
    125.00,
    1250.00,
    'in_production',
    now() - interval '8 days'
  ),
  (
    'oi000000-0000-0000-0000-000000000002'::uuid,
    'o0000000-0000-0000-0000-000000000001'::uuid,
    'qi000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    5,
    240.00,
    1200.00,
    'in_production',
    now() - interval '8 days'
  ),
  -- Items for Order 2
  (
    'oi000000-0000-0000-0000-000000000003'::uuid,
    'o0000000-0000-0000-0000-000000000002'::uuid,
    NULL,
    NULL,
    15,
    245.00,
    3675.00,
    'shipped',
    now() - interval '45 days'
  ),
  -- Items for Order 3
  (
    'oi000000-0000-0000-0000-000000000004'::uuid,
    'o0000000-0000-0000-0000-000000000003'::uuid,
    NULL,
    NULL,
    10,
    125.00,
    1250.00,
    'completed',
    now() - interval '75 days'
  );

-- =====================================================
-- 7. CREATE SUPPLIER DATA
-- =====================================================

-- Supplier Profiles (if using marketplace tables)
INSERT INTO supplier_profiles (
  id,
  name,
  org_id,
  regions,
  certifications,
  rating,
  active,
  created_at,
  updated_at
)
VALUES
  (
    's0000000-0000-0000-0000-000000000001'::uuid,
    'Precision Supplier Inc',
    '00000000-0000-0000-0000-000000000003'::uuid,
    ARRAY['us-east', 'us-central'],
    ARRAY['ISO 9001', 'AS9100'],
    4.8,
    true,
    now() - interval '90 days',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  org_id = EXCLUDED.org_id,
  regions = EXCLUDED.regions,
  certifications = EXCLUDED.certifications,
  rating = EXCLUDED.rating,
  active = EXCLUDED.active;

-- =====================================================
-- NOTES FOR MANUAL SETUP:
-- =====================================================
-- 
-- 1. Create Auth Users via Supabase Dashboard:
--    - Email: admin@cncquote.com, Password: Demo123!
--    - Email: customer@acme.com, Password: Demo123!
--    - Email: john@acme.com, Password: Demo123!
--    - Email: supplier@precision.com, Password: Demo123!
--    - Email: sarah@precision.com, Password: Demo123!
--
-- 2. After creating auth users, update their UUIDs in this script if different
--
-- 3. Grant proper roles via RLS policies
--
-- =====================================================

SELECT 'Demo data seed completed!' as status;
SELECT 'Login Credentials:' as info;
SELECT '' as blank;
SELECT 'ADMIN PORTAL:' as portal, 'admin@cncquote.com' as email, 'Demo123!' as password;
SELECT 'CUSTOMER PORTAL:' as portal, 'customer@acme.com' as email, 'Demo123!' as password;
SELECT 'CUSTOMER PORTAL (2):' as portal, 'john@acme.com' as email, 'Demo123!' as password;
SELECT 'SUPPLIER PORTAL:' as portal, 'supplier@precision.com' as email, 'Demo123!' as password;
SELECT 'SUPPLIER PORTAL (2):' as portal, 'sarah@precision.com' as email, 'Demo123!' as password;
