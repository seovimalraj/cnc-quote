#!/bin/bash
set -e

CONTAINER="cnc-quote_supabase_1"
DATABASE="cnc_quote"
MIGRATIONS_DIR="/root/cnc-quote/apps/api/db/migrations"

echo "Running migrations in order..."

# Array of migrations to run
migrations=(
  "0003_materials_and_mapping.sql"
  "0004_tolerances_leadtimes_profiles.sql"
  "0005_features_and_tbd.sql"
  "0006_complexity.sql"
  "0007_files.sql"
  "0008_pricing_profiles.sql"
  "0009_dfm_rules.sql"
  "0010_widget_origins.sql"
  "0011_quotes.sql"
  "0012_orders_payments.sql"
  "0013_qap_templates.sql"
  "0014_quote_outcomes_and_margins.sql"
  "0015_manual_review.sql"
  "0018_job_queue.sql"
  "0021_user_accounts_invitations.sql"
  "0023_quote_revisions.sql"
  "0025_rbac_core.sql"
  "0027_quote_status_extensions.sql"
  "0029_rbac_v1.sql"
  "0032_pricing_cache.sql"
)

for migration in "${migrations[@]}"; do
  echo ""
  echo "=== Running $migration ==="
  docker exec -i $CONTAINER psql -U postgres -d $DATABASE < "$MIGRATIONS_DIR/$migration" 2>&1 | grep -E "(CREATE|ALTER|INSERT|ERROR)" | head -20 || true
  echo "✓ $migration processed"
done

echo ""
echo "=== Migration Summary ==="
docker exec $CONTAINER psql -U postgres -d $DATABASE -c "
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
" | head -50

echo ""
echo "Migration batch complete!"
