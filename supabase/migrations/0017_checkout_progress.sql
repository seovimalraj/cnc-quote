-- Checkout progress tracking for portal checkout wizard
CREATE TABLE IF NOT EXISTS checkout_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_progress_quote_step
  ON checkout_progress(quote_id, step_id);

CREATE INDEX IF NOT EXISTS idx_checkout_progress_org
  ON checkout_progress(organization_id);

ALTER TABLE checkout_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checkout progress viewable by org members"
  ON checkout_progress
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Checkout progress upsertable by org members"
  ON checkout_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Checkout progress updatable by org members"
  ON checkout_progress
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

CREATE POLICY "Checkout progress deletable by org members"
  ON checkout_progress
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_checkout_progress_updated_at
  BEFORE UPDATE ON checkout_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
