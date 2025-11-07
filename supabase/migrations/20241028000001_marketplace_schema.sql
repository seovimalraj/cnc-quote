-- Marketplace Schema Migration
-- Date: 2024-10-28
-- Description: Complete marketplace schema for RFQ bidding system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- QUOTES TABLE
-- Stores initial quote requests from customers
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  files JSONB NOT NULL,  -- [{name: string, path: string, size: number, mimeType: string}]
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, configured, ordered
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_email ON quotes(email);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- =====================================================
-- QUOTE CONFIGURATIONS
-- Stores per-part configuration from quote-config page
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  parts JSONB NOT NULL,  -- Array of part configurations
  total_price DECIMAL(10,2) NOT NULL,
  max_lead_time INTEGER NOT NULL,  -- Days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quote_id)
);

CREATE INDEX idx_quote_configs_quote_id ON quote_configs(quote_id);

-- =====================================================
-- ORDERS TABLE
-- Created when customer completes checkout
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,  -- e.g., "ORD-2024-001"
  quote_id UUID REFERENCES quotes(id),
  customer_id UUID REFERENCES auth.users(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_company TEXT,
  shipping_address JSONB,  -- {line1, line2, city, state, zip, country}
  parts JSONB NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, rfq, production, shipped, delivered, cancelled
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid, paid, refunded
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- RFQS (Request for Quotes) TABLE
-- Generated from orders and sent to suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,  -- e.g., "RFQ-2024-001"
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  display_value DECIMAL(10,2) NOT NULL,  -- Masked order value shown to suppliers
  materials TEXT[] NOT NULL,
  lead_time INTEGER NOT NULL,  -- Required lead time in days
  parts JSONB NOT NULL,  -- Part specs without customer identity
  status TEXT NOT NULL DEFAULT 'open',  -- open, closed, awarded
  min_bid_count INTEGER DEFAULT 3,
  closes_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rfqs_order_id ON rfqs(order_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_closes_at ON rfqs(closes_at);
CREATE INDEX idx_rfqs_created_at ON rfqs(created_at DESC);

-- =====================================================
-- BIDS TABLE
-- Supplier bids on RFQs
-- =====================================================
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,  -- e.g., "BID-2024-001"
  rfq_id TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES auth.users(id),
  supplier_name TEXT NOT NULL,  -- Masked name like "Supplier A"
  price DECIMAL(10,2) NOT NULL,
  lead_time INTEGER NOT NULL,  -- Promised lead time in days
  notes TEXT,
  capabilities JSONB,  -- Supplier capabilities
  certifications TEXT[],
  quality_score INTEGER DEFAULT 85 CHECK (quality_score >= 0 AND quality_score <= 100),
  on_time_rate INTEGER DEFAULT 92 CHECK (on_time_rate >= 0 AND on_time_rate <= 100),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, withdrawn
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_bids_rfq_id ON bids(rfq_id);
CREATE INDEX idx_bids_supplier_id ON bids(supplier_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_created_at ON bids(created_at DESC);

-- =====================================================
-- KANBAN STATE TABLE
-- Tracks production progress per part
-- =====================================================
CREATE TABLE IF NOT EXISTS kanban_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  part_id TEXT NOT NULL,
  part_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup',  -- setup, cutting, finishing, inspection, done
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id, part_id)
);

CREATE INDEX idx_kanban_order_id ON kanban_state(order_id);
CREATE INDEX idx_kanban_status ON kanban_state(status);
CREATE INDEX idx_kanban_assigned_to ON kanban_state(assigned_to);

-- =====================================================
-- ORDER TIMELINE EVENTS TABLE
-- Tracks all status changes and events for customer visibility
-- =====================================================
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- order_placed, rfq_created, bid_received, bid_approved, production_started, part_completed, shipped, delivered
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_timeline_order_id ON order_timeline(order_id);
CREATE INDEX idx_timeline_created_at ON order_timeline(created_at DESC);

-- =====================================================
-- SHIPMENTS TABLE
-- Tracks shipping information
-- =====================================================
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  tracking_url TEXT,
  status TEXT DEFAULT 'pending',  -- pending, in_transit, delivered, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- QUOTES POLICIES
-- Public can create quotes (no auth required initially)
CREATE POLICY "Anyone can create quotes" ON quotes
  FOR INSERT WITH CHECK (true);

-- Users can view their own quotes by email
CREATE POLICY "Users view own quotes" ON quotes
  FOR SELECT USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- ORDERS POLICIES
-- Customers can view their own orders
CREATE POLICY "customers_view_own_orders" ON orders
  FOR SELECT USING (
    auth.uid() = customer_id OR
    customer_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Customers can create orders
CREATE POLICY "customers_create_orders" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id OR
    customer_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- RFQS POLICIES
-- Suppliers can view open RFQs
CREATE POLICY "suppliers_view_open_rfqs" ON rfqs
  FOR SELECT USING (
    status = 'open' AND
    (auth.jwt()->>'role' = 'supplier' OR auth.jwt()->>'role' = 'admin')
  );

-- Admin can view all RFQs
CREATE POLICY "admin_view_all_rfqs" ON rfqs
  FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- BIDS POLICIES
-- Suppliers can create bids
CREATE POLICY "suppliers_create_bids" ON bids
  FOR INSERT WITH CHECK (
    auth.uid() = supplier_id AND
    auth.jwt()->>'role' = 'supplier'
  );

-- Suppliers can view their own bids
CREATE POLICY "suppliers_view_own_bids" ON bids
  FOR SELECT USING (
    auth.uid() = supplier_id OR
    auth.jwt()->>'role' = 'admin'
  );

-- Admin can update bid status
CREATE POLICY "admin_update_bids" ON bids
  FOR UPDATE USING (auth.jwt()->>'role' = 'admin');

-- KANBAN POLICIES
-- Suppliers can view kanban for their orders
CREATE POLICY "suppliers_view_assigned_kanban" ON kanban_state
  FOR SELECT USING (
    auth.uid() = assigned_to OR
    auth.jwt()->>'role' = 'admin'
  );

-- Suppliers can update kanban state
CREATE POLICY "suppliers_update_kanban" ON kanban_state
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    auth.jwt()->>'role' = 'admin'
  );

-- ORDER TIMELINE POLICIES
-- Customers can view timeline for their orders
CREATE POLICY "customers_view_own_timeline" ON order_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_timeline.order_id
      AND (orders.customer_id = auth.uid() OR
           orders.customer_email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- SHIPMENTS POLICIES
-- Customers can view shipments for their orders
CREATE POLICY "customers_view_own_shipments" ON shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id
      AND (orders.customer_id = auth.uid() OR
           orders.customer_email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_configs_updated_at BEFORE UPDATE ON quote_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_updated_at BEFORE UPDATE ON kanban_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create timeline event on order status change
CREATE OR REPLACE FUNCTION create_order_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO order_timeline (order_id, event_type, title, description)
    VALUES (NEW.id, 'order_placed', 'Order Placed', 'Your order has been received and is being processed.');
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO order_timeline (order_id, event_type, title, description)
    VALUES (
      NEW.id,
      'status_changed',
      'Order Status Updated',
      'Order status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_timeline AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION create_order_timeline_event();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE quotes IS 'Initial quote requests from customers with uploaded CAD files';
COMMENT ON TABLE quote_configs IS 'Per-part configuration from quote configuration page';
COMMENT ON TABLE orders IS 'Customer orders created after checkout';
COMMENT ON TABLE rfqs IS 'Request for Quotes sent to suppliers with masked customer data';
COMMENT ON TABLE bids IS 'Supplier bids on RFQs';
COMMENT ON TABLE kanban_state IS 'Production progress tracking per part';
COMMENT ON TABLE order_timeline IS 'Event timeline for customer order tracking';
COMMENT ON TABLE shipments IS 'Shipping and delivery information';
