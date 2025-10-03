-- Step 11: Seed common finish operations
-- Migration: 2025_10_01_002_seed_finish_operations

BEGIN;

INSERT INTO public.finish_operations (code, name, process, description, cost_formula, lead_days_formula, prerequisites_json, incompatibilities_json, qos_json) VALUES
  (
    'bead_blast',
    'Bead Blast',
    'cnc',
    'Abrasive media blasting for uniform matte finish',
    'Math.ceil(setup_minutes/60)*25 + qty*Math.max(4, run_minutes_per_part/60*35)',
    'Math.max(0.5, Math.ceil(qty/batch_size)*0.25)',
    '[]'::jsonb,
    '["electropolish"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'anodize_type_II',
    'Anodize Type II',
    'cnc',
    'Standard anodizing for aluminum parts',
    'tiered(sa,[{"upTo":0.1,"price":18},{"upTo":0.5,"price":40},{"upTo":1.0,"price":60}])*qty*(color==="black"?1.1:1)*regionMult(region,"ANODIZE")',
    '1 + (qty>50?0.5:0)',
    '["bead_blast"]'::jsonb,
    '[]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'anodize_type_III',
    'Anodize Type III (Hard)',
    'cnc',
    'Hard anodizing for enhanced durability',
    'tiered(sa,[{"upTo":0.1,"price":28},{"upTo":0.5,"price":60},{"upTo":1.0,"price":95}])*qty*regionMult(region,"ANODIZE")',
    '1.5 + (qty>50?0.5:0)',
    '["bead_blast"]'::jsonb,
    '[]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'passivation_ss',
    'Passivation (Stainless Steel)',
    'cnc',
    'Chemical treatment to improve corrosion resistance',
    '20 + qty*3 + hazardFee(material)',
    '0.5',
    '[]'::jsonb,
    '["anodize_type_II","anodize_type_III"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'powder_coat',
    'Powder Coating',
    'cnc',
    'Durable electrostatic coating',
    'Math.ceil(setup_minutes/60)*40 + qty*tiered(sa,[{"upTo":0.1,"price":12},{"upTo":0.5,"price":25},{"upTo":1.0,"price":40}])*(color==="custom"?1.25:1)',
    '1 + (qty>100?1:0)',
    '["bead_blast"]'::jsonb,
    '["anodize_type_II","anodize_type_III","passivation_ss"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'electropolish',
    'Electropolishing',
    'cnc',
    'Electrochemical surface finishing for smooth, clean surface',
    '50 + qty*tiered(sa,[{"upTo":0.1,"price":15},{"upTo":0.5,"price":35},{"upTo":1.0,"price":55}])',
    '1.5',
    '[]'::jsonb,
    '["bead_blast","powder_coat"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'black_oxide',
    'Black Oxide',
    'cnc',
    'Chemical conversion coating for mild corrosion protection',
    '15 + qty*2.5',
    '0.5',
    '[]'::jsonb,
    '["anodize_type_II","anodize_type_III","passivation_ss","powder_coat"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'chromate_conversion',
    'Chromate Conversion (Chem Film)',
    'cnc',
    'Thin protective coating for aluminum',
    '12 + qty*2',
    '0.5',
    '[]'::jsonb,
    '["anodize_type_II","anodize_type_III","powder_coat"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'zinc_plating',
    'Zinc Plating',
    'cnc',
    'Electroplated zinc for corrosion resistance',
    '25 + qty*tiered(sa,[{"upTo":0.1,"price":8},{"upTo":0.5,"price":18},{"upTo":1.0,"price":30}])',
    '1',
    '[]'::jsonb,
    '["anodize_type_II","anodize_type_III","passivation_ss","powder_coat","electropolish"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  ),
  (
    'nickel_plating',
    'Nickel Plating',
    'cnc',
    'Electroplated nickel for wear resistance',
    '35 + qty*tiered(sa,[{"upTo":0.1,"price":12},{"upTo":0.5,"price":28},{"upTo":1.0,"price":45}])',
    '1.5',
    '[]'::jsonb,
    '["anodize_type_II","anodize_type_III","passivation_ss","powder_coat","electropolish"]'::jsonb,
    '{"mode":"sum"}'::jsonb
  );

COMMIT;
