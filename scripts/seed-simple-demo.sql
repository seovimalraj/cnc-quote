-- =====================================================
-- Simplified CNC Quote Portal Demo Data
-- Works with standalone PostgreSQL (no Supabase Auth)
-- =====================================================

-- First, let's create the missing tables in a simple format

-- Create quotes table (simplified)
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  status text DEFAULT 'draft',
  total_amount numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote_items table (simplified)
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  file_id uuid,
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total_price numeric(10,2) DEFAULT 0,
  material text,
  process text,
  finish text,
  created_at timestamptz DEFAULT now()
);

-- Create orders table (simplified)
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id),
  quote_id uuid REFERENCES quotes(id),
  user_id uuid REFERENCES users(id),
  order_number text UNIQUE,
  status text DEFAULT 'pending',
  total_amount numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table (simplified)
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  quote_item_id uuid REFERENCES quote_items(id),
  file_id uuid,
  quantity integer DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total_price numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create organization_members table if not exists
CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- Create supplier_profiles table if not exists
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  org_id uuid REFERENCES organizations(id),
  regions text[],
  certifications text[],
  rating numeric(3,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clear existing demo data
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE org_id IN (
    SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
  )
);
DELETE FROM orders WHERE org_id IN (
  SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
);
DELETE FROM quote_items WHERE quote_id IN (
  SELECT id FROM quotes WHERE org_id IN (
    SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
  )
);
DELETE FROM quotes WHERE org_id IN (
  SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
);
DELETE FROM organization_members WHERE organization_id IN (
  SELECT id FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc')
);
DELETE FROM supplier_profiles WHERE name IN ('Precision Supplier Inc');
DELETE FROM users WHERE email IN ('admin@cncquote.com', 'customer@acme.com', 'supplier@precision.com', 'john@acme.com', 'sarah@precision.com');
DELETE FROM profiles WHERE id IN (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'a0000000-0000-0000-0000-000000000005'::uuid
);
DELETE FROM organizations WHERE name IN ('Admin Org', 'Acme Manufacturing', 'Precision Supplier Inc');

-- =====================================================
-- 1. CREATE ORGANIZATIONS
-- =====================================================

INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Admin Org', 'admin-org', now() - interval '180 days', now()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Acme Manufacturing', 'acme-manufacturing', now() - interval '120 days', now()),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Precision Supplier Inc', 'precision-supplier', now() - interval '90 days', now());

-- =====================================================
-- 2. CREATE USERS
-- =====================================================

INSERT INTO users (id, email, organization_id, role, status, created_at, updated_at, last_login_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'admin@cncquote.com', '00000000-0000-0000-0000-000000000001'::uuid, 'admin', 'active', now() - interval '180 days', now(), now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'customer@acme.com', '00000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active', now() - interval '120 days', now(), now() - interval '1 hour'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'john@acme.com', '00000000-0000-0000-0000-000000000002'::uuid, 'member', 'active', now() - interval '90 days', now(), now() - interval '6 hours'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'supplier@precision.com', '00000000-0000-0000-0000-000000000003'::uuid, 'admin', 'active', now() - interval '90 days', now(), now() - interval '30 minutes'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'sarah@precision.com', '00000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', now() - interval '60 days', now(), now() - interval '3 hours');

-- =====================================================
-- 3. CREATE ORGANIZATION MEMBERSHIPS
-- =====================================================

INSERT INTO organization_members (organization_id, user_id, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin', now() - interval '180 days'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'admin', now() - interval '120 days'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'member', now() - interval '90 days'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid, 'admin', now() - interval '90 days'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000005'::uuid, 'member', now() - interval '60 days');

-- =====================================================
-- 4. CREATE PROFILES
-- =====================================================

INSERT INTO profiles (id, full_name, organization_id, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Admin User', '00000000-0000-0000-0000-000000000001'::uuid, now() - interval '180 days', now()),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Jane Smith', '00000000-0000-0000-0000-000000000002'::uuid, now() - interval '120 days', now()),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'John Doe', '00000000-0000-0000-0000-000000000002'::uuid, now() - interval '90 days', now()),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Mike Johnson', '00000000-0000-0000-0000-000000000003'::uuid, now() - interval '90 days', now()),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Sarah Williams', '00000000-0000-0000-0000-000000000003'::uuid, now() - interval '60 days', now());

-- =====================================================
-- 5. CREATE CUSTOMER QUOTES
-- =====================================================

INSERT INTO quotes (id, org_id, user_id, status, total_amount, currency, expires_at, created_at, updated_at)
VALUES
  ('q0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'approved', 2450.00, 'USD', now() + interval '30 days', now() - interval '15 days', now() - interval '10 days'),
  ('q0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'pending', 1875.50, 'USD', now() + interval '25 days', now() - interval '5 days', now() - interval '5 days'),
  ('q0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'draft', 3200.00, 'USD', now() + interval '40 days', now() - interval '2 days', now() - interval '2 days'),
  ('q0000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'expired', 1250.00, 'USD', now() - interval '10 days', now() - interval '50 days', now() - interval '40 days');

-- Quote Items
INSERT INTO quote_items (id, quote_id, file_id, quantity, unit_price, total_price, material, process, finish, created_at)
VALUES
  ('qi000000-0000-0000-0000-000000000001'::uuid, 'q0000000-0000-0000-0000-000000000001'::uuid, NULL, 10, 125.00, 1250.00, 'Aluminum 6061', 'CNC Milling', 'Anodized', now() - interval '15 days'),
  ('qi000000-0000-0000-0000-000000000002'::uuid, 'q0000000-0000-0000-0000-000000000001'::uuid, NULL, 5, 240.00, 1200.00, 'Stainless Steel 304', 'CNC Turning', 'Brushed', now() - interval '15 days'),
  ('qi000000-0000-0000-0000-000000000003'::uuid, 'q0000000-0000-0000-0000-000000000002'::uuid, NULL, 25, 75.02, 1875.50, 'Aluminum 7075', 'CNC Milling', 'As Machined', now() - interval '5 days'),
  ('qi000000-0000-0000-0000-000000000004'::uuid, 'q0000000-0000-0000-0000-000000000003'::uuid, NULL, 8, 400.00, 3200.00, 'Titanium Ti-6Al-4V', 'CNC Milling', 'Bead Blasted', now() - interval '2 days');

-- =====================================================
-- 6. CREATE CUSTOMER ORDERS
-- =====================================================

INSERT INTO orders (id, org_id, quote_id, user_id, order_number, status, total_amount, currency, created_at, updated_at)
VALUES
  ('o0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'q0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 'ORD-2025-0001', 'in_production', 2450.00, 'USD', now() - interval '8 days', now() - interval '1 day'),
  ('o0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, NULL, 'a0000000-0000-0000-0000-000000000004'::uuid, 'ORD-2025-0002', 'shipped', 3675.00, 'USD', now() - interval '45 days', now() - interval '5 days'),
  ('o0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, NULL, 'a0000000-0000-0000-0000-000000000002'::uuid, 'ORD-2025-0003', 'completed', 1250.00, 'USD', now() - interval '75 days', now() - interval '60 days');

-- Order Items
INSERT INTO order_items (id, order_id, quote_item_id, file_id, quantity, unit_price, total_price, status, created_at)
VALUES
  ('oi000000-0000-0000-0000-000000000001'::uuid, 'o0000000-0000-0000-0000-000000000001'::uuid, 'qi000000-0000-0000-0000-000000000001'::uuid, NULL, 10, 125.00, 1250.00, 'in_production', now() - interval '8 days'),
  ('oi000000-0000-0000-0000-000000000002'::uuid, 'o0000000-0000-0000-0000-000000000001'::uuid, 'qi000000-0000-0000-0000-000000000002'::uuid, NULL, 5, 240.00, 1200.00, 'in_production', now() - interval '8 days'),
  ('oi000000-0000-0000-0000-000000000003'::uuid, 'o0000000-0000-0000-0000-000000000002'::uuid, NULL, NULL, 15, 245.00, 3675.00, 'shipped', now() - interval '45 days'),
  ('oi000000-0000-0000-0000-000000000004'::uuid, 'o0000000-0000-0000-0000-000000000003'::uuid, NULL, NULL, 10, 125.00, 1250.00, 'completed', now() - interval '75 days');

-- =====================================================
-- 7. CREATE SUPPLIER DATA
-- =====================================================

INSERT INTO supplier_profiles (id, name, org_id, regions, certifications, rating, active, created_at, updated_at)
VALUES
  ('s0000000-0000-0000-0000-000000000001'::uuid, 'Precision Supplier Inc', '00000000-0000-0000-0000-000000000003'::uuid, ARRAY['us-east', 'us-central'], ARRAY['ISO 9001', 'AS9100'], 4.8, true, now() - interval '90 days', now());

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT '✓ Demo data seed completed!' as status;
SELECT '' as blank;
SELECT 'Login Credentials (Password: Demo123! for all):' as info;
SELECT '  - admin@cncquote.com (Admin Portal)' as credentials
UNION ALL SELECT '  - customer@acme.com (Customer Portal)'
UNION ALL SELECT '  - john@acme.com (Customer Portal)'
UNION ALL SELECT '  - supplier@precision.com (Supplier Portal)'
UNION ALL SELECT '  - sarah@precision.com (Supplier Portal)';
SELECT '' as blank2;
SELECT 'Data Created:' as summary;
SELECT '  - 3 Organizations' as data
UNION ALL SELECT '  - 5 Users'
UNION ALL SELECT '  - 4 Quotes'
UNION ALL SELECT '  - 3 Orders';
