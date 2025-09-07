-- Function to get abandoned quotes
CREATE OR REPLACE FUNCTION get_abandoned_quotes(cutoff_24h timestamp, cutoff_2h timestamp)
RETURNS TABLE (
  id text,
  organization_id text,
  abandonment_reason text,
  last_activity timestamp,
  days_since_last_activity integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.organization_id,
    CASE
      WHEN q.status = 'Priced' AND q.updated_at < cutoff_2h THEN 'priced_no_lead_select'
      WHEN q.status IN ('Analyzing', 'Priced', 'Needs_Review', 'Reviewed', 'Sent') AND q.updated_at < cutoff_24h THEN 'no_activity_24h'
      ELSE 'other'
    END as abandonment_reason,
    q.updated_at as last_activity,
    EXTRACT(EPOCH FROM (NOW() - q.updated_at))/86400 as days_since_last_activity
  FROM quotes q
  WHERE q.status NOT IN ('Accepted', 'Ordered', 'Expired', 'Abandoned')
    AND (
      (q.status = 'Priced' AND q.updated_at < cutoff_2h)
      OR (q.status IN ('Analyzing', 'Priced', 'Needs_Review', 'Reviewed', 'Sent') AND q.updated_at < cutoff_24h)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get abandonment statistics
CREATE OR REPLACE FUNCTION get_abandonment_stats()
RETURNS TABLE (
  total_abandoned bigint,
  abandoned_today bigint,
  abandoned_this_week bigint,
  abandonment_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'Abandoned') as total_abandoned,
    COUNT(*) FILTER (WHERE status = 'Abandoned' AND updated_at >= CURRENT_DATE) as abandoned_today,
    COUNT(*) FILTER (WHERE status = 'Abandoned' AND updated_at >= CURRENT_DATE - INTERVAL '7 days') as abandoned_this_week,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Abandoned')::numeric /
          COUNT(*)::numeric * 100,
          2
        )
      ELSE 0
    END as abandonment_rate
  FROM quotes
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
