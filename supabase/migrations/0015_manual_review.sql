-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Manual review rules table
CREATE TABLE IF NOT EXISTS manual_review_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  process TEXT, -- casting, forging, stamping
  feature TEXT, -- specific feature name or null for any
  min_quantity INTEGER, -- trigger if qty >= this value
  max_quantity INTEGER, -- trigger if qty <= this value
  min_size NUMERIC, -- in mm
  max_size NUMERIC, -- in mm
  material TEXT, -- specific material or null for any
  message TEXT NOT NULL, -- custom message shown to customer
  sla_hours INTEGER NOT NULL DEFAULT 4, -- time to review in hours
  slack_channel TEXT, -- optional Slack channel for notifications
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual review tasks table
CREATE TABLE IF NOT EXISTS manual_review_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES quotes(id),
  rule_id UUID NOT NULL REFERENCES manual_review_rules(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  assignee_id UUID REFERENCES users(id),
  due_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE manual_review_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_review_tasks ENABLE ROW LEVEL SECURITY;

-- Rules access
CREATE POLICY "Org users can view rules" ON manual_review_rules
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY "Admins can manage rules" ON manual_review_rules
  FOR ALL USING (
    org_id = auth.jwt() ->> 'org_id'::text
    AND (auth.jwt() ->> 'is_admin')::boolean = true
  );

-- Tasks access
CREATE POLICY "Org users can view tasks" ON manual_review_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_id
    AND q.org_id = auth.jwt() ->> 'org_id'::text
  ));

CREATE POLICY "Estimators can update tasks" ON manual_review_tasks
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM quotes q
    WHERE q.id = quote_id
    AND q.org_id = auth.jwt() ->> 'org_id'::text
    AND (auth.jwt() ->> 'is_admin')::boolean = true
  ));

-- Add notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'manual_review_required';
