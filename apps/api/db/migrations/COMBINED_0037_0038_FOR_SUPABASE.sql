-- Apply Migration 0037 + 0038 via Supabase SQL Editor
-- Copy and paste this combined migration into Supabase Dashboard > SQL Editor

-- ============================================================================
-- Migration 0037: Create finish_operations and quote_line_finish_chain tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS finish_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  process text NOT NULL,
  description text,
  cost_formula text NOT NULL,
  lead_days_formula text NOT NULL,
  prerequisites_json jsonb DEFAULT '[]'::jsonb,
  incompatibilities_json jsonb DEFAULT '[]'::jsonb,
  qos_json jsonb DEFAULT '{"mode": "add", "parallel_compatible": false}'::jsonb,
  version integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finish_operations_process ON finish_operations(process);
CREATE INDEX IF NOT EXISTS idx_finish_operations_code ON finish_operations(code);

CREATE TABLE IF NOT EXISTS quote_line_finish_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_line_id uuid NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL REFERENCES finish_operations(id) ON DELETE RESTRICT,
  sequence integer NOT NULL,
  params_json jsonb DEFAULT '{}'::jsonb,
  cost_cents integer DEFAULT 0,
  lead_days integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_line_sequence UNIQUE (quote_line_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_quote_line_finish_chain_line ON quote_line_finish_chain(quote_line_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_finish_chain_operation ON quote_line_finish_chain(operation_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_finish_operations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finish_operations_updated_at
  BEFORE UPDATE ON finish_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_finish_operations_updated_at();

CREATE TRIGGER trigger_quote_line_finish_chain_updated_at
  BEFORE UPDATE ON quote_line_finish_chain
  FOR EACH ROW
  EXECUTE FUNCTION update_finish_operations_updated_at();

-- ============================================================================
-- Migration 0038: Seed common finish operations
-- ============================================================================

INSERT INTO finish_operations (code, name, process, description, cost_formula, lead_days_formula, prerequisites_json, incompatibilities_json, qos_json)
VALUES
-- 1. Bead Blast (surface preparation)
('bead_blast', 'Bead Blast', 'cnc_milling', 'Glass bead blasting for surface preparation and uniform matte finish',
 'tiered(sa,[{upTo:0.1,price:18},{upTo:0.5,price:35},{upTo:2.0,price:90},{upTo:10.0,price:280}])*qty*regionMult(region,"BEAD_BLAST")',
 'ceil(1 + (sa > 1 ? 1 : 0))',
 '[]'::jsonb,
 '["electropolish"]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 2. Anodize Type II (standard anodizing)
('anodize_type_II', 'Anodize Type II', 'cnc_milling', 'Standard anodizing with color options (aluminum only)',
 'tiered(sa,[{upTo:0.1,price:25},{upTo:0.5,price:55},{upTo:2.0,price:140},{upTo:10.0,price:450}])*qty*(color==="black"?1.1:1)*regionMult(region,"ANODIZE")',
 'ceil(3 + (sa > 0.5 ? 2 : 0))',
 '["bead_blast"]'::jsonb,
 '["passivation_ss","powder_coat"]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 3. Anodize Type III (hard anodizing)
('anodize_type_III', 'Anodize Type III (Hard)', 'cnc_milling', 'Hard anodizing for increased wear resistance (aluminum only)',
 'tiered(sa,[{upTo:0.1,price:40},{upTo:0.5,price:85},{upTo:2.0,price:220},{upTo:10.0,price:700}])*qty*regionMult(region,"ANODIZE")',
 'ceil(4 + (sa > 0.5 ? 2 : 0))',
 '["bead_blast"]'::jsonb,
 '["passivation_ss","powder_coat","anodize_type_II"]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 4. Passivation (stainless steel)
('passivation_ss', 'Passivation (Stainless Steel)', 'cnc_milling', 'Chemical passivation for corrosion resistance (stainless steel only)',
 'tiered(sa,[{upTo:0.1,price:15},{upTo:0.5,price:30},{upTo:2.0,price:75},{upTo:10.0,price:200}])*qty*regionMult(region,"PASSIVATE")',
 'ceil(2 + (sa > 1 ? 1 : 0))',
 '[]'::jsonb,
 '["anodize_type_II","anodize_type_III","powder_coat"]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 5. Powder Coat
('powder_coat', 'Powder Coating', 'cnc_milling', 'Durable powder coat finish with color options',
 'tiered(sa,[{upTo:0.1,price:30},{upTo:0.5,price:70},{upTo:2.0,price:180},{upTo:10.0,price:550}])*qty*regionMult(region,"POWDER_COAT")',
 'ceil(3 + (sa > 1 ? 2 : 0))',
 '["bead_blast"]'::jsonb,
 '["anodize_type_II","anodize_type_III","passivation_ss","electropolish"]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 6. Electropolish
('electropolish', 'Electropolishing', 'cnc_milling', 'Electrochemical polishing for ultra-smooth surface',
 'tiered(sa,[{upTo:0.1,price:35},{upTo:0.5,price:80},{upTo:2.0,price:200},{upTo:10.0,price:650}])*qty*regionMult(region,"ELECTROPOLISH")',
 'ceil(3 + (sa > 0.5 ? 2 : 0))',
 '[]'::jsonb,
 '["bead_blast","powder_coat"]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 7. Black Oxide
('black_oxide', 'Black Oxide', 'cnc_milling', 'Black oxide coating for corrosion resistance and appearance',
 'tiered(sa,[{upTo:0.1,price:20},{upTo:0.5,price:45},{upTo:2.0,price:110},{upTo:10.0,price:350}])*qty*regionMult(region,"BLACK_OXIDE")',
 'ceil(2 + (sa > 1 ? 1 : 0))',
 '[]'::jsonb,
 '[]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 8. Chromate Conversion
('chromate_conversion', 'Chromate Conversion (Alodine)', 'cnc_milling', 'Chemical conversion coating for corrosion protection',
 'tiered(sa,[{upTo:0.1,price:12},{upTo:0.5,price:25},{upTo:2.0,price:60},{upTo:10.0,price:180}])*qty*regionMult(region,"CHROMATE")',
 'ceil(1 + (sa > 1 ? 1 : 0))',
 '[]'::jsonb,
 '[]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 9. Zinc Plating
('zinc_plating', 'Zinc Plating', 'cnc_milling', 'Electroplated zinc for corrosion protection',
 'tiered(sa,[{upTo:0.1,price:18},{upTo:0.5,price:40},{upTo:2.0,price:100},{upTo:10.0,price:320}])*qty*regionMult(region,"ZINC_PLATE")',
 'ceil(2 + (sa > 1 ? 1 : 0))',
 '[]'::jsonb,
 '[]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb),

-- 10. Nickel Plating
('nickel_plating', 'Nickel Plating', 'cnc_milling', 'Electroplated nickel for corrosion resistance and appearance',
 'tiered(sa,[{upTo:0.1,price:25},{upTo:0.5,price:55},{upTo:2.0,price:140},{upTo:10.0,price:450}])*qty*regionMult(region,"NICKEL_PLATE")',
 'ceil(3 + (sa > 1 ? 2 : 0))',
 '[]'::jsonb,
 '[]'::jsonb,
 '{"mode":"add","parallel_compatible":false}'::jsonb)

ON CONFLICT (code) DO NOTHING;

-- Success message
SELECT 'Migrations 0037 + 0038 applied successfully!' as status,
       (SELECT COUNT(*) FROM finish_operations) as operations_count,
       (SELECT COUNT(*) FROM quote_line_finish_chain) as chains_count;
