-- =====================================================
-- Fix Database Schema for Standalone PostgreSQL
-- Removes auth.users dependencies and creates missing tables
-- =====================================================

-- 1. Drop problematic foreign key constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey CASCADE;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_invited_by_fkey CASCADE;

-- 2. Fix organization_members table
ALTER TABLE organization_members DROP COLUMN IF EXISTS role_enum_migration_temp CASCADE;
ALTER TABLE organization_members ALTER COLUMN role DROP NOT NULL;
ALTER TABLE organization_members ALTER COLUMN role SET DEFAULT 'member';

-- 3. Create quotes table if not exists
CREATE TABLE IF NOT EXISTS quotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  total_amount numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  expires_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON quotes(org_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- 4. Create quote_items table if not exists
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  file_id uuid,
  quantity integer DEFAULT 1,
  unit_price numeric(12,2) DEFAULT 0,
  total_price numeric(12,2) DEFAULT 0,
  material text,
  process text,
  finish text,
  lead_time_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- 5. Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  order_number text UNIQUE,
  status text DEFAULT 'pending',
  total_amount numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  shipped_at timestamptz,
  delivered_at timestamptz,
  tracking_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- 6. Create order_items table if not exists
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  quote_item_id uuid REFERENCES quote_items(id) ON DELETE SET NULL,
  file_id uuid,
  quantity integer DEFAULT 1,
  unit_price numeric(12,2) DEFAULT 0,
  total_price numeric(12,2) DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 7. Create supplier_profiles table if not exists
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  regions text[],
  certifications text[],
  rating numeric(3,2) DEFAULT 0,
  active boolean DEFAULT true,
  capabilities jsonb DEFAULT '{}',
  contact_email text,
  contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_org_id ON supplier_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_active ON supplier_profiles(active);

-- 8. Add updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_items_updated_at ON quote_items;
CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_profiles_updated_at ON supplier_profiles;
CREATE TRIGGER update_supplier_profiles_updated_at BEFORE UPDATE ON supplier_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '✓ Database schema fixed for standalone PostgreSQL' as status;
