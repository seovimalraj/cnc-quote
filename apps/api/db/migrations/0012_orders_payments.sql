-- Orders and related tables
CREATE TYPE order_status AS ENUM (
  'new',
  'in_production',
  'qa',
  'packed',
  'shipped',
  'complete',
  'hold'
);

CREATE TABLE orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  quote_id uuid REFERENCES quotes(id) NOT NULL,
  status order_status NOT NULL DEFAULT 'new',
  total_amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) NOT NULL,
  quote_item_id uuid REFERENCES quote_items(id) NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_status_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) NOT NULL,
  old_status order_status,
  new_status order_status NOT NULL,
  notes text,
  changed_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) NOT NULL,
  tracking_number text,
  carrier text,
  tracking_url text,
  shipped_at timestamptz NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Orders are viewable by authenticated users of the same organization" ON orders
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Orders are insertable by authenticated users of the same organization" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Orders are updatable by authenticated users of the same organization" ON orders
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Order items are viewable by users who can view the order" ON order_items
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Order items are insertable by users who can update the order" ON order_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Status history policies
CREATE POLICY "Status history is viewable by users who can view the order" ON order_status_history
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Payments policies
CREATE POLICY "Payments are viewable by users who can view the order" ON payments
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Shipments policies
CREATE POLICY "Shipments are viewable by users who can view the order" ON shipments
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX orders_org_id_idx ON orders(org_id);
CREATE INDEX orders_customer_id_idx ON orders(customer_id);
CREATE INDEX orders_quote_id_idx ON orders(quote_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_status_history_order_id_idx ON order_status_history(order_id);
CREATE INDEX payments_order_id_idx ON payments(order_id);
CREATE INDEX shipments_order_id_idx ON shipments(order_id);

-- Timestamps triggers
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
