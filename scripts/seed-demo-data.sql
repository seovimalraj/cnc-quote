-- =====================================================
-- Seed Demo Data for Frigate Portal
-- =====================================================

-- Clear existing demo data
TRUNCATE order_items, orders, quote_items, quotes, organization_members, users, organizations CASCADE;

-- =====================================================
-- 1. ORGANIZATIONS
-- =====================================================

INSERT INTO organizations (id, name, slug, created_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'Admin Organization', 'admin-org', now() - interval '90 days'),
  ('20000000-0000-0000-0000-000000000002', 'Acme Manufacturing', 'acme-mfg', now() - interval '60 days'),
  ('30000000-0000-0000-0000-000000000003', 'Precision Supplier Inc', 'precision-supplier', now() - interval '45 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USERS
-- =====================================================

INSERT INTO users (id, email, organization_id, role, status, created_at)
VALUES 
  -- Admin user
  ('11111111-1111-1111-1111-111111111111', 'admin@cncquote.com', '10000000-0000-0000-0000-000000000001', 'admin', 'active', now() - interval '90 days'),
  
  -- Customer users (Acme Manufacturing)
  ('22222222-2222-2222-2222-222222222222', 'customer@acme.com', '20000000-0000-0000-0000-000000000002', 'admin', 'active', now() - interval '60 days'),
  ('22222222-2222-2222-2222-222222222223', 'engineer@acme.com', '20000000-0000-0000-0000-000000000002', 'member', 'active', now() - interval '55 days'),
  
  -- Supplier users (Precision Supplier)
  ('33333333-3333-3333-3333-333333333333', 'supplier@precision.com', '30000000-0000-0000-0000-000000000003', 'admin', 'active', now() - interval '45 days'),
  ('33333333-3333-3333-3333-333333333334', 'sales@precision.com', '30000000-0000-0000-0000-000000000003', 'member', 'active', now() - interval '40 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. ORGANIZATION MEMBERS (link users to orgs)
-- =====================================================

INSERT INTO organization_members (organization_id, user_id, role, created_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin', now() - interval '90 days'),
  ('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'admin', now() - interval '60 days'),
  ('20000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222223', 'member', now() - interval '55 days'),
  ('30000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'admin', now() - interval '45 days'),
  ('30000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333334', 'member', now() - interval '40 days')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. SUPPLIER PROFILES
-- =====================================================

INSERT INTO supplier_profiles (id, name, org_id, regions, certifications, rating, active, created_at)
VALUES 
  (
    gen_random_uuid(),
    'Precision Supplier Inc',
    '30000000-0000-0000-0000-000000000003',
    ARRAY['North America', 'Europe'],
    ARRAY['ISO 9001', 'AS9100', 'ISO 13485'],
    4.8,
    true,
    now() - interval '45 days'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. QUOTES
-- =====================================================

INSERT INTO quotes (id, org_id, user_id, status, total_amount, currency, expires_at, created_at)
VALUES 
  -- Quote 1: Approved (ready to convert to order)
  (
    '44444444-4444-4444-4444-444444444441',
    '20000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'approved',
    3250.00,
    'USD',
    now() + interval '15 days',
    now() - interval '10 days'
  ),
  
  -- Quote 2: Pending review
  (
    '44444444-4444-4444-4444-444444444442',
    '20000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222223',
    'pending',
    1850.00,
    'USD',
    now() + interval '20 days',
    now() - interval '5 days'
  ),
  
  -- Quote 3: Draft (still being configured)
  (
    '44444444-4444-4444-4444-444444444443',
    '20000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'draft',
    0.00,
    'USD',
    now() + interval '30 days',
    now() - interval '2 days'
  ),
  
  -- Quote 4: Expired (needs renewal)
  (
    '44444444-4444-4444-4444-444444444444',
    '20000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222223',
    'expired',
    4500.00,
    'USD',
    now() - interval '5 days',
    now() - interval '35 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. QUOTE ITEMS
-- =====================================================

INSERT INTO quote_items (id, quote_id, quantity, unit_price, total_price, material, process, finish, created_at)
VALUES 
  -- Items for Quote 1 (Approved)
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444441', 5, 650.00, 3250.00, 'Aluminum 6061', 'CNC Milling', 'Anodized Clear', now() - interval '10 days'),
  
  -- Items for Quote 2 (Pending)
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444442', 10, 185.00, 1850.00, 'Steel 304', 'Sheet Metal', 'Powder Coated', now() - interval '5 days'),
  
  -- Items for Quote 4 (Expired)
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 100, 45.00, 4500.00, 'Plastic ABS', 'Injection Molding', 'As Machined', now() - interval '35 days')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. ORDERS
-- =====================================================

INSERT INTO orders (id, org_id, quote_id, user_id, order_number, status, total_amount, currency, created_at)
VALUES 
  -- Order 1: In Production
  (
    '55555555-5555-5555-5555-555555555551',
    '20000000-0000-0000-0000-000000000002',
    '44444444-4444-4444-4444-444444444441',
    '22222222-2222-2222-2222-222222222222',
    'ORD-2025-1001',
    'in_production',
    3250.00,
    'USD',
    now() - interval '7 days'
  ),
  
  -- Order 2: Shipped
  (
    '55555555-5555-5555-5555-555555555552',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    '22222222-2222-2222-2222-222222222223',
    'ORD-2025-1002',
    'shipped',
    2100.00,
    'USD',
    now() - interval '20 days'
  ),
  
  -- Order 3: Completed
  (
    '55555555-5555-5555-5555-555555555553',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    '22222222-2222-2222-2222-222222222222',
    'ORD-2025-1003',
    'completed',
    1575.00,
    'USD',
    now() - interval '60 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. ORDER ITEMS
-- =====================================================

INSERT INTO order_items (id, order_id, quantity, unit_price, total_price, status, created_at)
VALUES 
  -- Items for Order 1 (In Production)
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555551', 5, 650.00, 3250.00, 'in_production', now() - interval '7 days'),
  
  -- Items for Order 2 (Shipped)
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555552', 12, 175.00, 2100.00, 'shipped', now() - interval '20 days'),
  
  -- Items for Order 3 (Completed)
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555553', 9, 175.00, 1575.00, 'completed', now() - interval '60 days')
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '✓ Demo data seeded successfully' as status;

SELECT 'ORGANIZATIONS:' as section, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'USERS:', COUNT(*) FROM users
UNION ALL
SELECT 'ORG_MEMBERS:', COUNT(*) FROM organization_members
UNION ALL
SELECT 'SUPPLIER_PROFILES:', COUNT(*) FROM supplier_profiles
UNION ALL
SELECT 'QUOTES:', COUNT(*) FROM quotes
UNION ALL
SELECT 'QUOTE_ITEMS:', COUNT(*) FROM quote_items
UNION ALL
SELECT 'ORDERS:', COUNT(*) FROM orders
UNION ALL
SELECT 'ORDER_ITEMS:', COUNT(*) FROM order_items;

-- Show demo credentials
SELECT 
  '=== DEMO CREDENTIALS ===' as info
UNION ALL
SELECT ''
UNION ALL
SELECT 'Admin User:'
UNION ALL
SELECT '  Email: admin@cncquote.com'
UNION ALL
SELECT '  Password: Demo123!'
UNION ALL
SELECT '  Role: System Administrator'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Customer User (Acme Manufacturing):'
UNION ALL
SELECT '  Email: customer@acme.com'
UNION ALL
SELECT '  Password: Demo123!'
UNION ALL
SELECT '  Role: Organization Admin'
UNION ALL
SELECT '  Has: 4 Quotes, 3 Orders'
UNION ALL
SELECT ''
UNION ALL
SELECT 'Supplier User (Precision Supplier):'
UNION ALL
SELECT '  Email: supplier@precision.com'
UNION ALL
SELECT '  Password: Demo123!'
UNION ALL
SELECT '  Role: Supplier Admin';
