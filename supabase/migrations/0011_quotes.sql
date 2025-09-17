-- Quotes and quote items tables
CREATE TABLE quotes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  price_profile_id uuid REFERENCES pricing_profiles(id) NOT NULL,
  dfm_ruleset_id uuid REFERENCES dfm_rules(id),
  total_amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  expires_at timestamptz NOT NULL,
  terms text,
  notes text,
  email_sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE quote_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) NOT NULL,
  file_id uuid REFERENCES files(id) NOT NULL,
  process_type text NOT NULL,
  material_id uuid REFERENCES materials(id) NOT NULL,
  finish_ids uuid[] REFERENCES finishes(id),
  tolerance text,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  lead_time_days integer NOT NULL,
  complexity_multiplier numeric(4,2),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quotes are viewable by authenticated users of the same organization" ON quotes
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Quotes are insertable by authenticated users of the same organization" ON quotes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Quotes are updatable by authenticated users of the same organization" ON quotes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- RLS policies for quote items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote items are viewable by authenticated users of the same organization" ON quote_items
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    quote_id IN (
      SELECT id FROM quotes WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Quote items are insertable by authenticated users of the same organization" ON quote_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    quote_id IN (
      SELECT id FROM quotes WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Quote items are updatable by authenticated users of the same organization" ON quote_items
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    quote_id IN (
      SELECT id FROM quotes WHERE org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes for performance
CREATE INDEX quotes_org_id_idx ON quotes(org_id);
CREATE INDEX quotes_customer_id_idx ON quotes(customer_id);
CREATE INDEX quotes_status_idx ON quotes(status);
CREATE INDEX quote_items_quote_id_idx ON quote_items(quote_id);

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quote_items_updated_at
  BEFORE UPDATE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
