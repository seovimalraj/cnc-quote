-- Analytics events table for tracking user behavior
CREATE TABLE analytics_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type text NOT NULL,
  quote_id uuid REFERENCES quotes(id),
  organization_id uuid REFERENCES organizations(id),
  properties jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Checkout sessions table for tracking payment sessions
CREATE TABLE checkout_sessions (
  id text PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) NOT NULL,
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  stripe_session_id text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL,
  billing_info jsonb,
  shipping_info jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failed_at timestamptz
);

-- Update orders table to include Stripe fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS billing_info jsonb,
ADD COLUMN IF NOT EXISTS shipping_info jsonb;

-- Update quotes table to include more status options
ALTER TABLE quotes
ADD CONSTRAINT status_check CHECK (status IN ('draft', 'analyzing', 'priced', 'needs_review', 'reviewed', 'sent', 'accepted', 'ordered', 'expired', 'abandoned'));

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Analytics events policies
CREATE POLICY "Analytics events are viewable by authenticated users of the same organization" ON analytics_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Analytics events are insertable by authenticated users" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Checkout sessions policies
CREATE POLICY "Checkout sessions are viewable by authenticated users of the same organization" ON checkout_sessions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Checkout sessions are insertable by authenticated users of the same organization" ON checkout_sessions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_analytics_events_quote_id ON analytics_events(quote_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

CREATE INDEX idx_checkout_sessions_quote_id ON checkout_sessions(quote_id);
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_created_at ON checkout_sessions(created_at);
