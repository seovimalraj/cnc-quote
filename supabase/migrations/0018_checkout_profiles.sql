-- Store organization-scoped billing and shipping addresses
CREATE TABLE IF NOT EXISTS organization_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label text,
  attention text,
  company text,
  street1 text NOT NULL,
  street2 text,
  city text NOT NULL,
  state text,
  postal_code text NOT NULL,
  country text NOT NULL,
  phone text,
  address_type text NOT NULL DEFAULT 'shipping' CHECK (address_type IN ('billing', 'shipping', 'other')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_addresses_org ON organization_addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_addresses_type ON organization_addresses(address_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_addresses_default
  ON organization_addresses(organization_id, address_type)
  WHERE is_default;

ALTER TABLE organization_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization addresses selectable by members" ON organization_addresses
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization addresses insertable by members" ON organization_addresses
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization addresses updatable by members" ON organization_addresses
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization addresses deletable by members" ON organization_addresses
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_organization_addresses_updated_at
  BEFORE UPDATE ON organization_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Store saved payment methods (non-PCI metadata only)
CREATE TABLE IF NOT EXISTS organization_payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  method_type text NOT NULL CHECK (method_type IN ('card', 'paypal', 'ach')),
  provider text,
  label text,
  brand text,
  last4 text,
  expiry_month smallint,
  expiry_year smallint,
  email text,
  external_id text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_payment_methods_org ON organization_payment_methods(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_payment_methods_default
  ON organization_payment_methods(organization_id, method_type)
  WHERE is_default;

ALTER TABLE organization_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization payment methods selectable by members" ON organization_payment_methods
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization payment methods insertable by members" ON organization_payment_methods
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization payment methods updatable by members" ON organization_payment_methods
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization payment methods deletable by members" ON organization_payment_methods
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_organization_payment_methods_updated_at
  BEFORE UPDATE ON organization_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
