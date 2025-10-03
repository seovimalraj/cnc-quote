-- Quote revisions table (Phase 2)
CREATE TABLE quote_revisions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  revision_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','proposed','applied','discarded')),
  reason text,
  created_by uuid REFERENCES auth.users(id),
  diff_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  UNIQUE(quote_id, revision_number)
);

-- RLS
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote revisions selectable by org members" ON quote_revisions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND quote_id IN (
      SELECT id FROM quotes WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Quote revisions insertable by org members" ON quote_revisions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND quote_id IN (
      SELECT id FROM quotes WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Quote revisions updatable by org members" ON quote_revisions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND quote_id IN (
      SELECT id FROM quotes WHERE org_id IN (
        SELECT org_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX quote_revisions_quote_id_idx ON quote_revisions(quote_id);
CREATE INDEX quote_revisions_status_idx ON quote_revisions(status);
