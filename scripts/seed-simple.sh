#!/bin/bash

echo "🌱 Seeding database with test data..."
echo ""

docker exec -i cnc-quote_supabase_1 psql -U postgres -d postgres << 'EOF'

-- Clear existing data
DELETE FROM shipments;
DELETE FROM order_timeline;
DELETE FROM kanban_state;
DELETE FROM bids;
DELETE FROM rfqs;
DELETE FROM orders;
DELETE FROM quote_configs;
DELETE FROM quotes;

-- Insert test quotes
INSERT INTO quotes (id, email, files, status, created_at, updated_at) VALUES
(gen_random_uuid(), 'john@acme.com', '[{"name":"bracket.step","path":"/uploads/bracket.step","size":245000,"mimeType":"application/octet-stream"}]'::jsonb, 'ordered', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
(gen_random_uuid(), 'sarah@techparts.com', '[{"name":"housing.step","path":"/uploads/housing.step","size":189000,"mimeType":"application/octet-stream"}]'::jsonb, 'ordered', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
(gen_random_uuid(), 'mike@precision.com', '[{"name":"shaft.step","path":"/uploads/shaft.step","size":312000,"mimeType":"application/octet-stream"}]'::jsonb, 'ordered', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days');

-- Insert test orders
INSERT INTO orders (id, customer_email, customer_name, customer_company, parts, total_price, status, payment_status, created_at, updated_at) VALUES
('ORD-2024-001', 'john@acme.com', 'John Smith', 'Acme Manufacturing', '[{"id":"part-1","file_name":"bracket.step","quantity":50,"material":"Aluminum 6061","finish":"Anodized Black"}]'::jsonb, 8750.00, 'pending', 'paid', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
('ORD-2024-002', 'sarah@techparts.com', 'Sarah Johnson', 'TechParts Inc', '[{"id":"part-2","file_name":"housing.step","quantity":25,"material":"Aluminum 7075","finish":"As Machined"}]'::jsonb, 6200.00, 'rfq', 'paid', NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days'),
('ORD-2024-003', 'mike@precision.com', 'Mike Chen', 'Precision Components', '[{"id":"part-3","file_name":"shaft.step","quantity":100,"material":"Stainless Steel 304","finish":"Chrome Plating"}]'::jsonb, 12400.00, 'production', 'paid', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days');

-- Insert test RFQs
INSERT INTO rfqs (id, order_id, display_value, materials, lead_time, parts, status, closes_at, created_at, updated_at) VALUES
('RFQ-2024-001', 'ORD-2024-001', 8750.00, ARRAY['Aluminum 6061'], 7, '[{"id":"part-1","file_name":"bracket.step","quantity":50,"material":"Aluminum 6061","finish":"Anodized Black"}]'::jsonb, 'open', NOW() + INTERVAL '3 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),
('RFQ-2024-002', 'ORD-2024-002', 6200.00, ARRAY['Aluminum 7075'], 10, '[{"id":"part-2","file_name":"housing.step","quantity":25,"material":"Aluminum 7075","finish":"As Machined"}]'::jsonb, 'open', NOW() + INTERVAL '4 days', NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),
('RFQ-2024-003', 'ORD-2024-003', 12400.00, ARRAY['Stainless Steel 304'], 14, '[{"id":"part-3","file_name":"shaft.step","quantity":100,"material":"Stainless Steel 304","finish":"Chrome Plating"}]'::jsonb, 'awarded', NOW() - INTERVAL '5 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '20 days');

-- Temporarily disable FK constraint for seeding
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_supplier_id_fkey;

-- Insert test bids (using dummy supplier IDs)
INSERT INTO bids (id, rfq_id, supplier_id, supplier_name, price, lead_time, notes, quality_score, on_time_rate, status, created_at, updated_at) VALUES
('BID-2024-001', 'RFQ-2024-003', gen_random_uuid(), 'Premium CNC Works', 11800.00, 12, 'We have immediate capacity available', 95, 98, 'approved', NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days'),
('BID-2024-002', 'RFQ-2024-003', gen_random_uuid(), 'Rapid Machining Co', 12100.00, 14, 'Bulk discount applied', 92, 94, 'rejected', NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days');

-- Note: In production, supplier_id would reference actual auth.users

-- Insert kanban state for production order
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, created_at, updated_at) VALUES
('ORD-2024-003', 'part-3', 'shaft.step', 'cutting', 'In progress', NOW() - INTERVAL '18 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days');

-- Insert timeline events
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-001', 'order_placed', 'Order Placed', 'Order ORD-2024-001 has been received and confirmed', NOW() - INTERVAL '30 days'),
('ORD-2024-002', 'order_placed', 'Order Placed', 'Order ORD-2024-002 has been received and confirmed', NOW() - INTERVAL '28 days'),
('ORD-2024-002', 'rfq_created', 'RFQ Created', 'Request for quotes sent to suppliers', NOW() - INTERVAL '27 days'),
('ORD-2024-003', 'order_placed', 'Order Placed', 'Order ORD-2024-003 has been received and confirmed', NOW() - INTERVAL '25 days'),
('ORD-2024-003', 'rfq_created', 'RFQ Created', 'Request for quotes sent to suppliers', NOW() - INTERVAL '23 days'),
('ORD-2024-003', 'bid_approved', 'Bid Approved', 'Supplier bid approved - production starting', NOW() - INTERVAL '20 days'),
('ORD-2024-003', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '18 days');

SELECT 'Database seeded successfully!' as message;
EOF

echo ""
echo "✅ Database seeded with test data!"
echo ""
echo "📊 You can now view:"
echo "   - Orders in portal/orders"
echo "   - RFQs in supplier/rfqs"
echo "   - Production tracking in supplier/production/ORD-2024-003"
echo "   - Order timeline in portal/orders/ORD-2024-003"
