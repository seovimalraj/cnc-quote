-- Step 17: Marketplace Seed Data
-- Example suppliers, capabilities, and routing rules

-- NOTE: Replace 'YOUR_ORG_ID' with actual org_id before running

-- Supplier 1: Acme Precision (US-based, full-service CNC shop)
INSERT INTO supplier_profiles (
  id,
  org_id,
  name,
  regions,
  certifications,
  rating,
  active,
  notes
) VALUES (
  gen_random_uuid(),
  'YOUR_ORG_ID',
  'Acme Precision Manufacturing',
  ARRAY['us-east', 'us-west'],
  ARRAY['ISO_9001', 'AS9100'],
  4.5,
  true,
  'Reliable partner for CNC milling and turning. Fast lead times for small batches.'
) RETURNING id;

-- Get Acme ID for capabilities (manually replace after insert)
-- Let's use a CTE for cleaner syntax

WITH acme AS (
  INSERT INTO supplier_profiles (
    id,
    org_id,
    name,
    regions,
    certifications,
    rating,
    active,
    notes
  ) VALUES (
    gen_random_uuid(),
    'YOUR_ORG_ID',
    'Acme Precision Manufacturing',
    ARRAY['us-east', 'us-west'],
    ARRAY['ISO_9001', 'AS9100'],
    4.5,
    true,
    'Reliable partner for CNC milling and turning. Fast lead times for small batches.'
  ) RETURNING id
)
INSERT INTO process_capabilities (
  id,
  supplier_id,
  process,
  envelope_json,
  materials_json,
  finish_json,
  min_qty,
  max_qty,
  leadtime_days_min,
  leadtime_days_max,
  unit_cost_index
)
SELECT
  gen_random_uuid(),
  acme.id,
  'cnc_milling',
  '{"length": 500, "width": 400, "height": 300}'::jsonb,
  '["aluminum_6061", "aluminum_7075", "stainless_steel_304", "stainless_steel_316", "brass"]'::jsonb,
  '["as_machined", "anodize_clear", "anodize_black", "powder_coat"]'::jsonb,
  1,
  1000,
  5,
  10,
  1.2
FROM acme;

-- Add turning capability for Acme
WITH acme AS (
  SELECT id FROM supplier_profiles WHERE name = 'Acme Precision Manufacturing' LIMIT 1
)
INSERT INTO process_capabilities (
  id,
  supplier_id,
  process,
  envelope_json,
  materials_json,
  finish_json,
  min_qty,
  max_qty,
  leadtime_days_min,
  leadtime_days_max,
  unit_cost_index
)
SELECT
  gen_random_uuid(),
  acme.id,
  'cnc_turning',
  '{"diameter": 150, "length": 300}'::jsonb,
  '["aluminum_6061", "stainless_steel_304", "brass", "titanium"]'::jsonb,
  '["as_machined", "anodize_clear"]'::jsonb,
  1,
  500,
  5,
  12,
  1.3
FROM acme;

-- Supplier 2: Titan Aero (ITAR-certified, aerospace focus)
WITH titan AS (
  INSERT INTO supplier_profiles (
    id,
    org_id,
    name,
    regions,
    certifications,
    rating,
    active,
    notes
  ) VALUES (
    gen_random_uuid(),
    'YOUR_ORG_ID',
    'Titan Aero Systems',
    ARRAY['us-east'],
    ARRAY['ISO_9001', 'AS9100', 'ITAR'],
    4.8,
    true,
    'Premium aerospace supplier. ITAR-certified. Higher pricing but exceptional quality.'
  ) RETURNING id
)
INSERT INTO process_capabilities (
  id,
  supplier_id,
  process,
  envelope_json,
  materials_json,
  finish_json,
  min_qty,
  max_qty,
  leadtime_days_min,
  leadtime_days_max,
  unit_cost_index
)
SELECT
  gen_random_uuid(),
  titan.id,
  'cnc_milling',
  '{"length": 600, "width": 500, "height": 400}'::jsonb,
  '["aluminum_7075", "titanium", "stainless_steel_316", "inconel"]'::jsonb,
  '["as_machined", "anodize_clear", "anodize_black", "passivate", "alodine"]'::jsonb,
  10,
  500,
  7,
  14,
  1.8
FROM titan;

-- Routing Rule 1: ITAR orders must go to ITAR-certified suppliers
WITH rule_org AS (
  SELECT 'YOUR_ORG_ID'::uuid AS org_id
)
INSERT INTO routing_rules (
  id,
  org_id,
  name,
  priority,
  rule_json,
  active,
  created_by
)
SELECT
  gen_random_uuid(),
  rule_org.org_id,
  'ITAR Compliance Check',
  100, -- High priority
  '{
    "type": "expr",
    "comparison": {
      "field": "order.itar_controlled",
      "op": "EQ",
      "value": true
    },
    "requires": {
      "field": "supplier.certifications",
      "op": "HAS_ANY",
      "value": ["ITAR"]
    }
  }'::jsonb,
  true,
  'YOUR_USER_ID'
FROM rule_org;

-- Routing Rule 2: High-tolerance parts prefer AS9100 suppliers
WITH rule_org AS (
  SELECT 'YOUR_ORG_ID'::uuid AS org_id
)
INSERT INTO routing_rules (
  id,
  org_id,
  name,
  priority,
  rule_json,
  active,
  created_by
)
SELECT
  gen_random_uuid(),
  rule_org.org_id,
  'High Tolerance → AS9100',
  50, -- Medium priority
  '{
    "type": "expr",
    "comparison": {
      "field": "order.tolerances",
      "op": "HAS_ANY",
      "value": ["±0.001", "±0.0005"]
    },
    "prefers": {
      "field": "supplier.certifications",
      "op": "HAS_ANY",
      "value": ["AS9100"]
    }
  }'::jsonb,
  true,
  'YOUR_USER_ID'
FROM rule_org;

-- Sample query to verify seed data
-- SELECT 
--   sp.name,
--   sp.regions,
--   sp.certifications,
--   sp.rating,
--   COUNT(pc.id) AS capability_count
-- FROM supplier_profiles sp
-- LEFT JOIN process_capabilities pc ON pc.supplier_id = sp.id
-- GROUP BY sp.id, sp.name, sp.regions, sp.certifications, sp.rating;
