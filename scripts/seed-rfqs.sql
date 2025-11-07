-- Seed RFQs and Bids
-- Run with: docker exec cnc-quote_supabase_1 psql -U postgres -d postgres -f /tmp/seed-rfqs.sql

-- First, get existing orders
DO $$
DECLARE
  order_rec RECORD;
  rfq_id_1 UUID;
  rfq_id_2 UUID;
  rfq_id_3 UUID;
BEGIN
  -- Get first 3 orders
  SELECT id INTO order_rec FROM orders ORDER BY created_at DESC LIMIT 1 OFFSET 0;
  
  -- RFQ 1: Open status with 3 bids
  INSERT INTO rfqs (
    order_id,
    display_value,
    materials,
    lead_time,
    parts,
    status,
    closes_at
  ) VALUES (
    order_rec.id,
    1250,
    ARRAY['Aluminum 6061', 'Stainless Steel 304'],
    7,
    '[]'::jsonb,
    'open',
    NOW() + INTERVAL '7 days'
  ) ON CONFLICT (order_id) DO UPDATE SET
    display_value = EXCLUDED.display_value,
    materials = EXCLUDED.materials,
    status = EXCLUDED.status
  RETURNING id INTO rfq_id_1;

  -- Create bids for RFQ 1
  INSERT INTO bids (rfq_id, supplier_id, supplier_name, price, lead_time, notes, quality_score, on_time_rate, status)
  VALUES 
    (rfq_id_1, 'SUPP-001', 'Precision Parts Inc.', 2450.00, 6, 'ISO 9001 certified facility. Rush delivery available.', 4.8, 0.95, 'pending'),
    (rfq_id_1, 'SUPP-002', 'Acme Manufacturing', 2650.00, 7, 'AS9100D certified. Free shipping included.', 4.5, 0.88, 'pending'),
    (rfq_id_1, 'SUPP-003', 'Titan CNC Solutions', 2380.00, 8, 'Volume discounts available. Premium quality.', 4.9, 0.97, 'pending')
  ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET
    price = EXCLUDED.price,
    lead_time = EXCLUDED.lead_time,
    status = EXCLUDED.status;

  -- RFQ 2: Open status with 4 bids
  SELECT id INTO order_rec FROM orders ORDER BY created_at DESC LIMIT 1 OFFSET 1;
  
  INSERT INTO rfqs (
    order_id,
    display_value,
    materials,
    lead_time,
    parts,
    status,
    closes_at
  ) VALUES (
    order_rec.id,
    1875,
    ARRAY['Aluminum 7075', 'Brass'],
    10,
    '[]'::jsonb,
    'open',
    NOW() + INTERVAL '5 days'
  ) ON CONFLICT (order_id) DO UPDATE SET
    display_value = EXCLUDED.display_value,
    materials = EXCLUDED.materials,
    status = EXCLUDED.status
  RETURNING id INTO rfq_id_2;

  -- Create bids for RFQ 2
  INSERT INTO bids (rfq_id, supplier_id, supplier_name, price, lead_time, notes, quality_score, on_time_rate, status)
  VALUES 
    (rfq_id_2, 'SUPP-001', 'Precision Parts Inc.', 3680.00, 9, 'Can expedite to 7 days for additional 15%.', 4.8, 0.95, 'pending'),
    (rfq_id_2, 'SUPP-002', 'Acme Manufacturing', 3950.00, 10, 'Standard lead time. Quality guaranteed.', 4.5, 0.88, 'pending'),
    (rfq_id_2, 'SUPP-003', 'Titan CNC Solutions', 3520.00, 11, 'Best price. Reliable delivery.', 4.9, 0.97, 'accepted'),
    (rfq_id_2, 'SUPP-004', 'ProMach Industries', 3820.00, 9, 'ISO 13485 medical certified.', 4.3, 0.85, 'pending')
  ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET
    price = EXCLUDED.price,
    lead_time = EXCLUDED.lead_time,
    status = EXCLUDED.status;

  -- RFQ 3: Closed status with 2 bids (one accepted, one rejected)
  SELECT id INTO order_rec FROM orders ORDER BY created_at DESC LIMIT 1 OFFSET 2;
  
  INSERT INTO rfqs (
    order_id,
    display_value,
    materials,
    lead_time,
    parts,
    status,
    closes_at
  ) VALUES (
    order_rec.id,
    980,
    ARRAY['Aluminum 6061'],
    13,
    '[]'::jsonb,
    'closed',
    NOW() - INTERVAL '2 days'
  ) ON CONFLICT (order_id) DO UPDATE SET
    display_value = EXCLUDED.display_value,
    materials = EXCLUDED.materials,
    status = EXCLUDED.status
  RETURNING id INTO rfq_id_3;

  -- Create bids for RFQ 3
  INSERT INTO bids (rfq_id, supplier_id, supplier_name, price, lead_time, notes, quality_score, on_time_rate, status)
  VALUES 
    (rfq_id_3, 'SUPP-001', 'Precision Parts Inc.', 1890.00, 12, 'Quick turnaround time.', 4.8, 0.95, 'accepted'),
    (rfq_id_3, 'SUPP-004', 'ProMach Industries', 2050.00, 14, 'Standard processing.', 4.3, 0.85, 'rejected')
  ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET
    price = EXCLUDED.price,
    lead_time = EXCLUDED.lead_time,
    status = EXCLUDED.status;

  RAISE NOTICE 'Successfully seeded 3 RFQs with 9 bids';
END $$;
