-- Create analytics events table for DFM funnel tracking
CREATE TABLE analytics_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('dfm', 'quote', 'user', 'admin')),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  organization_id uuid REFERENCES organizations(id),
  dfm_request_id uuid REFERENCES dfm_requests(id),
  properties jsonb DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Create indexes for performance
CREATE INDEX idx_analytics_events_event_type_timestamp ON analytics_events(event_type, timestamp);
CREATE INDEX idx_analytics_events_dfm_request_id ON analytics_events(dfm_request_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_organization_id ON analytics_events(organization_id);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "Admins can view analytics events for their org" ON analytics_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT org_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Add rate limiting table for abuse prevention
CREATE TABLE rate_limits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier text NOT NULL, -- IP address, user ID, or email
  action text NOT NULL, -- 'dfm_submit', 'lead_create', etc.
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, action, window_start)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_identifier_action_window ON rate_limits(identifier, action, window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Add function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action text,
  p_limit integer,
  p_window_minutes integer
) RETURNS boolean AS $$
DECLARE
  window_start timestamptz;
  current_count integer;
BEGIN
  window_start := date_trunc('minute', now()) - (p_window_minutes || ' minutes')::interval;

  -- Get current count for this window
  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start >= window_start;

  -- If under limit, increment counter
  IF current_count < p_limit THEN
    INSERT INTO rate_limits (identifier, action, window_start, request_count)
    VALUES (p_identifier, p_action, date_trunc('minute', now()), 1)
    ON CONFLICT (identifier, action, window_start)
    DO UPDATE SET
      request_count = rate_limits.request_count + 1,
      updated_at = now();
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
