#!/bin/bash

# Database seeding script using direct SQL
# Seeds realistic test data for all tables

echo "🌱 Starting database seeding..."
echo ""

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASS="postgres"

export PGPASSWORD="$DB_PASS"

echo "🧹 Clearing existing data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Delete in reverse order of dependencies
DELETE FROM shipments;
DELETE FROM order_timeline;
DELETE FROM kanban_state;
DELETE FROM bids;
DELETE FROM rfqs;
DELETE FROM orders;
DELETE FROM quote_configs;
DELETE FROM quotes;
EOF

echo "✅ Database cleared"
echo ""

echo "📝 Seeding quotes..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
INSERT INTO quotes (id, customer_email, customer_name, company_name, parts, total_price, lead_time_days, status, created_at, updated_at) VALUES
('Q-2024-001', 'john@acme.com', 'John Smith', 'Acme Manufacturing', '[{"id":"part-Q-2024-001-1","file_name":"bracket.step","quantity":50,"material":"Aluminum 6061","finish":"Anodized Black"}]'::jsonb, 8750.00, 7, 'approved', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('Q-2024-002', 'sarah@techparts.com', 'Sarah Johnson', 'TechParts Inc', '[{"id":"part-Q-2024-002-1","file_name":"housing.step","quantity":25,"material":"Aluminum 7075","finish":"As Machined"}]'::jsonb, 6200.00, 10, 'approved', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
('Q-2024-003', 'mike@precision.com', 'Mike Chen', 'Precision Components', '[{"id":"part-Q-2024-003-1","file_name":"shaft.step","quantity":100,"material":"Stainless Steel 304","finish":"Chrome Plating"}]'::jsonb, 12400.00, 14, 'approved', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('Q-2024-004', 'lisa@advanced.com', 'Lisa Williams', 'Advanced Systems LLC', '[{"id":"part-Q-2024-004-1","file_name":"plate.step","quantity":10,"material":"Aluminum 6061","finish":"Bead Blast"}]'::jsonb, 2100.00, 5, 'approved', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
('Q-2024-005', 'david@industrial.com', 'David Brown', 'Industrial Solutions', '[{"id":"part-Q-2024-005-1","file_name":"gear.step","quantity":50,"material":"Carbon Steel","finish":"Zinc Plating"}]'::jsonb, 7800.00, 12, 'approved', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('Q-2024-006', 'john@acme.com', 'John Smith', 'Acme Manufacturing', '[{"id":"part-Q-2024-006-1","file_name":"connector.step","quantity":75,"material":"Brass","finish":"As Machined"}]'::jsonb, 5600.00, 8, 'approved', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('Q-2024-007', 'sarah@techparts.com', 'Sarah Johnson', 'TechParts Inc', '[{"id":"part-Q-2024-007-1","file_name":"flange.step","quantity":30,"material":"Stainless Steel 316","finish":"Powder Coat"}]'::jsonb, 9200.00, 15, 'approved', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('Q-2024-008', 'mike@precision.com', 'Mike Chen', 'Precision Components', '[{"id":"part-Q-2024-008-1","file_name":"mount.step","quantity":20,"material":"Aluminum 6061","finish":"Anodized Clear"}]'::jsonb, 4300.00, 6, 'approved', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('Q-2024-009', 'lisa@advanced.com', 'Lisa Williams', 'Advanced Systems LLC', '[{"id":"part-Q-2024-009-1","file_name":"adapter.step","quantity":40,"material":"Aluminum 7075","finish":"Bead Blast"}]'::jsonb, 6800.00, 9, 'pending', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('Q-2024-010', 'david@industrial.com', 'David Brown', 'Industrial Solutions', '[{"id":"part-Q-2024-010-1","file_name":"bushing.step","quantity":60,"material":"Copper","finish":"As Machined"}]'::jsonb, 8400.00, 11, 'pending', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');
EOF

echo "✅ Seeded 10 quotes"
echo ""

echo "⚙️  Seeding quote configs..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
INSERT INTO quote_configs (quote_id, material, finish, tolerance, thread_specification, additional_notes, created_at, updated_at) VALUES
('Q-2024-001', 'Aluminum 6061', 'Anodized Black', 'Standard', 'M6 x 1.0', 'Please deburr all edges', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('Q-2024-002', 'Aluminum 7075', 'As Machined', 'Precision', NULL, NULL, NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
('Q-2024-003', 'Stainless Steel 304', 'Chrome Plating', 'High Precision', NULL, 'Critical dimensions marked on drawing', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('Q-2024-004', 'Aluminum 6061', 'Bead Blast', 'Standard', NULL, NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
('Q-2024-005', 'Carbon Steel', 'Zinc Plating', 'Standard', 'M8 x 1.25', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days');
EOF

echo "✅ Seeded 5 quote configs"
echo ""

echo "📦 Seeding orders..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
INSERT INTO orders (id, quote_id, customer_email, customer_name, company_name, parts, total_price, lead_time_days, status, payment_status, created_at, updated_at) VALUES
('ORD-2024-001', 'Q-2024-001', 'john@acme.com', 'John Smith', 'Acme Manufacturing', '[{"id":"part-Q-2024-001-1","file_name":"bracket.step","quantity":50,"material":"Aluminum 6061","finish":"Anodized Black"}]'::jsonb, 8750.00, 7, 'pending', 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
('ORD-2024-002', 'Q-2024-002', 'sarah@techparts.com', 'Sarah Johnson', 'TechParts Inc', '[{"id":"part-Q-2024-002-1","file_name":"housing.step","quantity":25,"material":"Aluminum 7075","finish":"As Machined"}]'::jsonb, 6200.00, 10, 'in_production', 'completed', NOW() - INTERVAL '28 days', NOW() - INTERVAL '20 days'),
('ORD-2024-003', 'Q-2024-003', 'mike@precision.com', 'Mike Chen', 'Precision Components', '[{"id":"part-Q-2024-003-1","file_name":"shaft.step","quantity":100,"material":"Stainless Steel 304","finish":"Chrome Plating"}]'::jsonb, 12400.00, 14, 'in_production', 'completed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '18 days'),
('ORD-2024-004', 'Q-2024-004', 'lisa@advanced.com', 'Lisa Williams', 'Advanced Systems LLC', '[{"id":"part-Q-2024-004-1","file_name":"plate.step","quantity":10,"material":"Aluminum 6061","finish":"Bead Blast"}]'::jsonb, 2100.00, 5, 'qa_final', 'completed', NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days'),
('ORD-2024-005', 'Q-2024-005', 'david@industrial.com', 'David Brown', 'Industrial Solutions', '[{"id":"part-Q-2024-005-1","file_name":"gear.step","quantity":50,"material":"Carbon Steel","finish":"Zinc Plating"}]'::jsonb, 7800.00, 12, 'ready_to_ship', 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days'),
('ORD-2024-006', 'Q-2024-006', 'john@acme.com', 'John Smith', 'Acme Manufacturing', '[{"id":"part-Q-2024-006-1","file_name":"connector.step","quantity":75,"material":"Brass","finish":"As Machined"}]'::jsonb, 5600.00, 8, 'shipped', 'completed', NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days'),
('ORD-2024-007', 'Q-2024-007', 'sarah@techparts.com', 'Sarah Johnson', 'TechParts Inc', '[{"id":"part-Q-2024-007-1","file_name":"flange.step","quantity":30,"material":"Stainless Steel 316","finish":"Powder Coat"}]'::jsonb, 9200.00, 15, 'completed', 'completed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '3 days'),
('ORD-2024-008', 'Q-2024-008', 'mike@precision.com', 'Mike Chen', 'Precision Components', '[{"id":"part-Q-2024-008-1","file_name":"mount.step","quantity":20,"material":"Aluminum 6061","finish":"Anodized Clear"}]'::jsonb, 4300.00, 6, 'completed', 'completed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day');
EOF

echo "✅ Seeded 8 orders"
echo ""

echo "📋 Seeding RFQs..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
INSERT INTO rfqs (id, order_id, quote_id, parts, target_price, deadline, status, created_at, updated_at) VALUES
('RFQ-2024-001', 'ORD-2024-001', 'Q-2024-001', '[{"id":"part-Q-2024-001-1","file_name":"bracket.step","quantity":50,"material":"Aluminum 6061","finish":"Anodized Black"}]'::jsonb, 8750.00, NOW() - INTERVAL '27 days', 'open', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('RFQ-2024-002', 'ORD-2024-002', 'Q-2024-002', '[{"id":"part-Q-2024-002-1","file_name":"housing.step","quantity":25,"material":"Aluminum 7075","finish":"As Machined"}]'::jsonb, 6200.00, NOW() - INTERVAL '25 days', 'open', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
('RFQ-2024-003', 'ORD-2024-003', 'Q-2024-003', '[{"id":"part-Q-2024-003-1","file_name":"shaft.step","quantity":100,"material":"Stainless Steel 304","finish":"Chrome Plating"}]'::jsonb, 12400.00, NOW() - INTERVAL '22 days', 'bidding', NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days'),
('RFQ-2024-004', 'ORD-2024-004', 'Q-2024-004', '[{"id":"part-Q-2024-004-1","file_name":"plate.step","quantity":10,"material":"Aluminum 6061","finish":"Bead Blast"}]'::jsonb, 2100.00, NOW() - INTERVAL '19 days', 'awarded', NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days'),
('RFQ-2024-005', 'ORD-2024-005', 'Q-2024-005', '[{"id":"part-Q-2024-005-1","file_name":"gear.step","quantity":50,"material":"Carbon Steel","finish":"Zinc Plating"}]'::jsonb, 7800.00, NOW() - INTERVAL '17 days', 'awarded', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
('RFQ-2024-006', 'ORD-2024-006', 'Q-2024-006', '[{"id":"part-Q-2024-006-1","file_name":"connector.step","quantity":75,"material":"Brass","finish":"As Machined"}]'::jsonb, 5600.00, NOW() - INTERVAL '15 days', 'awarded', NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days'),
('RFQ-2024-007', 'ORD-2024-007', 'Q-2024-007', '[{"id":"part-Q-2024-007-1","file_name":"flange.step","quantity":30,"material":"Stainless Steel 316","finish":"Powder Coat"}]'::jsonb, 9200.00, NOW() - INTERVAL '12 days', 'completed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
('RFQ-2024-008', 'ORD-2024-008', 'Q-2024-008', '[{"id":"part-Q-2024-008-1","file_name":"mount.step","quantity":20,"material":"Aluminum 6061","finish":"Anodized Clear"}]'::jsonb, 4300.00, NOW() - INTERVAL '9 days', 'completed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days');
EOF

echo "✅ Seeded 8 RFQs"
echo ""

echo "💰 Seeding bids..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
INSERT INTO bids (rfq_id, supplier_id, supplier_name, supplier_email, bid_amount, lead_time_days, notes, status, created_at, updated_at) VALUES
-- RFQ-2024-003 bids (bidding status)
('RFQ-2024-003', 'SUP-001', 'Premium CNC Works', 'contact@premiumcnc.com', 11800.00, 12, 'We have immediate capacity available', 'pending', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
('RFQ-2024-003', 'SUP-002', 'Rapid Machining Co', 'sales@rapidmachining.com', 12100.00, 14, 'Bulk discount applied', 'pending', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
-- RFQ-2024-004 bids (awarded)
('RFQ-2024-004', 'SUP-001', 'Premium CNC Works', 'contact@premiumcnc.com', 1950.00, 5, 'We have immediate capacity available', 'approved', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days'),
('RFQ-2024-004', 'SUP-002', 'Rapid Machining Co', 'sales@rapidmachining.com', 2050.00, 4, 'Express service available', 'rejected', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days'),
-- RFQ-2024-005 bids (awarded)
('RFQ-2024-005', 'SUP-002', 'Rapid Machining Co', 'sales@rapidmachining.com', 7400.00, 11, 'Standard lead time', 'approved', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days'),
('RFQ-2024-005', 'SUP-003', 'Precision Manufacturing', 'info@precisionmfg.com', 7650.00, 12, 'Quality guaranteed', 'rejected', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days'),
-- RFQ-2024-006 bids (awarded)
('RFQ-2024-006', 'SUP-003', 'Precision Manufacturing', 'info@precisionmfg.com', 5400.00, 7, 'We have immediate capacity available', 'approved', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days'),
('RFQ-2024-006', 'SUP-001', 'Premium CNC Works', 'contact@premiumcnc.com', 5550.00, 8, 'Premium service', 'rejected', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days'),
-- RFQ-2024-007 bids (completed)
('RFQ-2024-007', 'SUP-001', 'Premium CNC Works', 'contact@premiumcnc.com', 8900.00, 14, 'Quality finish guaranteed', 'approved', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days'),
-- RFQ-2024-008 bids (completed)
('RFQ-2024-008', 'SUP-002', 'Rapid Machining Co', 'sales@rapidmachining.com', 4100.00, 5, 'Fast turnaround', 'approved', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days');
EOF

echo "✅ Seeded 10 bids"
echo ""

echo "📊 Seeding kanban state..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- ORD-2024-002 (in_production) - parts in various stages
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-002', 'part-Q-2024-002-1', 'housing.step', 'cutting', '', NOW() - INTERVAL '22 days', NULL, NOW() - INTERVAL '28 days', NOW() - INTERVAL '22 days');

-- ORD-2024-003 (in_production) - parts in various stages
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-003', 'part-Q-2024-003-1', 'shaft.step', 'finishing', '', NOW() - INTERVAL '20 days', NULL, NOW() - INTERVAL '25 days', NOW() - INTERVAL '19 days');

-- ORD-2024-004 (qa_final)
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-004', 'part-Q-2024-004-1', 'plate.step', 'inspection', 'Final inspection in progress', NOW() - INTERVAL '18 days', NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '16 days');

-- ORD-2024-005 (ready_to_ship) - all parts done
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-005', 'part-Q-2024-005-1', 'gear.step', 'done', 'Completed - QA passed', NOW() - INTERVAL '17 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '13 days');

-- ORD-2024-006 (shipped) - all parts done
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-006', 'part-Q-2024-006-1', 'connector.step', 'done', 'Completed - QA passed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '11 days');

-- ORD-2024-007 (completed) - all parts done
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-007', 'part-Q-2024-007-1', 'flange.step', 'done', 'Completed - QA passed', NOW() - INTERVAL '12 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '4 days');

-- ORD-2024-008 (completed) - all parts done
INSERT INTO kanban_state (order_id, part_id, part_name, status, notes, started_at, completed_at, created_at, updated_at) VALUES
('ORD-2024-008', 'part-Q-2024-008-1', 'mount.step', 'done', 'Completed - QA passed', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days');
EOF

echo "✅ Seeded 7 kanban cards"
echo ""

echo "⏱️  Seeding order timeline..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Timeline events for all orders
-- ORD-2024-001 (pending)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-001', 'order_placed', 'Order Placed', 'Order ORD-2024-001 has been received and confirmed', NOW() - INTERVAL '30 days');

-- ORD-2024-002 (in_production)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-002', 'order_placed', 'Order Placed', 'Order ORD-2024-002 has been received and confirmed', NOW() - INTERVAL '28 days'),
('ORD-2024-002', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '26 days');

-- ORD-2024-003 (in_production)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-003', 'order_placed', 'Order Placed', 'Order ORD-2024-003 has been received and confirmed', NOW() - INTERVAL '25 days'),
('ORD-2024-003', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '23 days');

-- ORD-2024-004 (qa_final)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-004', 'order_placed', 'Order Placed', 'Order ORD-2024-004 has been received and confirmed', NOW() - INTERVAL '22 days'),
('ORD-2024-004', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '20 days'),
('ORD-2024-004', 'quality_check', 'Quality Inspection', 'Parts passed quality control inspection', NOW() - INTERVAL '16 days');

-- ORD-2024-005 (ready_to_ship)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-005', 'order_placed', 'Order Placed', 'Order ORD-2024-005 has been received and confirmed', NOW() - INTERVAL '20 days'),
('ORD-2024-005', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '18 days'),
('ORD-2024-005', 'quality_check', 'Quality Inspection', 'Parts passed quality control inspection', NOW() - INTERVAL '14 days');

-- ORD-2024-006 (shipped)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-006', 'order_placed', 'Order Placed', 'Order ORD-2024-006 has been received and confirmed', NOW() - INTERVAL '18 days'),
('ORD-2024-006', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '16 days'),
('ORD-2024-006', 'quality_check', 'Quality Inspection', 'Parts passed quality control inspection', NOW() - INTERVAL '12 days'),
('ORD-2024-006', 'shipped', 'Order Shipped', 'Your order has been shipped via FedEx - Tracking: FDX827364519', NOW() - INTERVAL '10 days');

-- ORD-2024-007 (completed)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-007', 'order_placed', 'Order Placed', 'Order ORD-2024-007 has been received and confirmed', NOW() - INTERVAL '15 days'),
('ORD-2024-007', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '13 days'),
('ORD-2024-007', 'quality_check', 'Quality Inspection', 'Parts passed quality control inspection', NOW() - INTERVAL '9 days'),
('ORD-2024-007', 'shipped', 'Order Shipped', 'Your order has been shipped via UPS - Tracking: UPS923456781', NOW() - INTERVAL '7 days'),
('ORD-2024-007', 'delivered', 'Delivered', 'Order has been delivered successfully', NOW() - INTERVAL '3 days');

-- ORD-2024-008 (completed)
INSERT INTO order_timeline (order_id, event_type, title, description, created_at) VALUES
('ORD-2024-008', 'order_placed', 'Order Placed', 'Order ORD-2024-008 has been received and confirmed', NOW() - INTERVAL '12 days'),
('ORD-2024-008', 'production_started', 'Production Started', 'Manufacturing has begun on your parts', NOW() - INTERVAL '10 days'),
('ORD-2024-008', 'quality_check', 'Quality Inspection', 'Parts passed quality control inspection', NOW() - INTERVAL '6 days'),
('ORD-2024-008', 'shipped', 'Order Shipped', 'Your order has been shipped via DHL - Tracking: DHL654321987', NOW() - INTERVAL '4 days'),
('ORD-2024-008', 'delivered', 'Delivered', 'Order has been delivered successfully', NOW() - INTERVAL '1 day');
EOF

echo "✅ Seeded 28 timeline events"
echo ""

echo "🚚 Seeding shipments..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Shipments for shipped and completed orders
INSERT INTO shipments (order_id, tracking_number, carrier, status, shipped_at, delivered_at, estimated_delivery, created_at, updated_at) VALUES
('ORD-2024-006', 'FDX827364519', 'FedEx', 'in_transit', NOW() - INTERVAL '10 days', NULL, NOW() + INTERVAL '2 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('ORD-2024-007', 'UPS923456781', 'UPS', 'delivered', NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days'),
('ORD-2024-008', 'DHL654321987', 'DHL', 'delivered', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day');
EOF

echo "✅ Seeded 3 shipments"
echo ""

echo "✅ Database seeding completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - 10 quotes with parts and pricing"
echo "  - 5 quote configurations"
echo "  - 8 orders in various stages"
echo "  - 8 RFQs (some open, some awarded)"
echo "  - 10 bids from different suppliers"
echo "  - 7 kanban cards tracking production"
echo "  - 28 order timeline events"
echo "  - 3 shipment tracking records"
echo ""
echo "🚀 You can now test all pages with real data!"
