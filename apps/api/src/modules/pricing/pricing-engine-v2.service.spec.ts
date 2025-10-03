import { PricingEngineV2Service } from './pricing-engine-v2.service';
import { ContractsV1 } from '@cnc-quote/shared';

const globalRef = globalThis as Record<string, any>;
const { describe, it, expect, beforeEach } = globalRef;

const createBasePartConfig = (overrides: Partial<ContractsV1.PartConfigV1> = {}): ContractsV1.PartConfigV1 => {
  const now = new Date().toISOString();
  return {
    id: 'part-1',
    quote_id: 'quote-1',
    file_id: 'file-1',
    process_type: 'cnc_milling',
    material_id: 'aluminum_6061',
    material_spec: undefined,
    finish_ids: [],
    tolerance_class: 'standard',
    tolerances: [],
    quantities: [1, 10],
    selected_quantity: 1,
    lead_time_option: 'standard',
    secondary_operations: [],
    inspection_level: 'basic',
    surface_finish: 'standard',
    machining_complexity: 'medium',
    sheet_thickness_mm: undefined,
    bend_count: undefined,
    material_gauge: undefined,
    geometry: {
      metrics: {
        volume_cc: 12,
        surface_area_cm2: 32,
        bbox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 50, y: 40, z: 20 },
        },
        features: {
          holes: 4,
          pockets: 2,
          slots: 1,
        },
      },
    },
    dfm: { status: 'pending', issues: [] },
    pricing: { status: 'pending', matrix: [], currency: 'USD' },
    overrides: undefined,
    audit: { created_at: now, updated_at: now },
    ...overrides,
  };
};

const createGeometry = (overrides: Record<string, any> = {}) => ({
  ...baseGeometry(),
  ...overrides,
});

const baseGeometry = () => ({
  volume: 120, // cm^3
  surface_area: 820,
  bbox: {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 50, y: 40, z: 20 },
  },
  primitive_features: {
    holes: 4,
    pockets: 2,
    slots: 1,
    faces: 10,
    bends: 0,
  },
});

describe('PricingEngineV2Service tolerance integration', () => {
  let service: PricingEngineV2Service;

  beforeEach(() => {
  const mockFnFactory = typeof globalRef.jest?.fn === 'function' ? globalRef.jest.fn : undefined;
  const getEnv = mockFnFactory ? mockFnFactory(() => undefined) : (() => undefined);
  const config = { get: getEnv } as any;
    const supabase = {} as any;
    const geometryService = {} as any;
    const toleranceRepo = {
      findMatches: async () => [],
      getCatalogVersion: async () => 1,
    } as any;
    service = new PricingEngineV2Service(config, supabase, geometryService, toleranceRepo);
  });

  it('applies tolerance multipliers for precision class resulting in higher machining and inspection cost', async () => {
    const geometry = baseGeometry();

    const standardConfig = createBasePartConfig({ tolerance_class: 'standard', inspection_level: 'basic' });
    const precisionConfig = createBasePartConfig({ tolerance_class: 'precision', inspection_level: 'enhanced' });

    const standardResult = await service.calculatePricing({
      part_config: standardConfig,
      geometry,
      quantities: [10],
    });

    const precisionResult = await service.calculatePricing({
      part_config: precisionConfig,
      geometry,
      quantities: [10],
    });

    const standardRow = standardResult.pricing_matrix[0];
    const precisionRow = precisionResult.pricing_matrix[0];

    expect(precisionRow.tolerance?.band).toBe('precision');
    expect(precisionRow.tolerance?.category).toBe('flatness');
    expect(precisionRow.tolerance?.source).toBe('class');

    expect(precisionRow.tolerance?.summary?.machineMultiplier ?? 0).toBeGreaterThan(
      standardRow.tolerance?.summary?.machineMultiplier ?? 0,
    );
    expect(precisionRow.tolerance?.summary?.setupMultiplier ?? 0).toBeGreaterThan(
      standardRow.tolerance?.summary?.setupMultiplier ?? 0,
    );
    expect(precisionRow.tolerance?.summary?.inspectionMultiplier ?? 0).toBeGreaterThan(
      standardRow.tolerance?.summary?.inspectionMultiplier ?? 0,
    );
    expect(precisionRow.cost_factors.margin).toBeGreaterThan(standardRow.cost_factors.margin);
  });

  it('derives tolerance category from dominant feature summary for sheet metal parts', async () => {
    const geometry = createGeometry({
      primitive_features: {
        holes: 2,
        pockets: 0,
        slots: 0,
        faces: 18,
        bends: 6,
      },
      feature_summary: {
        counts: {
          faces: 18,
          bends: 6,
        },
        dominant_feature: 'faces',
      },
    });

    const sheetConfig = createBasePartConfig({
      id: 'part-sheet',
      process_type: 'sheet_metal',
      tolerance_class: 'standard',
      inspection_level: 'full',
      surface_finish: 'standard',
    });

    const result = await service.calculatePricing({
      part_config: sheetConfig,
      geometry,
      quantities: [5],
    });

    const row = result.pricing_matrix[0];

    expect(row.tolerance?.band).toBe('medium');
    expect(row.tolerance?.category).toBe('flatness');
    expect(row.tolerance?.multipliers.machining).toBeGreaterThan(0.9);
  });

  it('falls back to default material data when Supabase is unavailable', async () => {
    const geometry = baseGeometry();
    const result = await service.calculatePricing({
      part_config: createBasePartConfig({ material_id: 'AL6061' }),
      geometry,
      quantities: [1],
    });

    const row = result.pricing_matrix[0];
    const materialLine = row.breakdown?.find((line) => line.key === 'material_cost');

    expect(materialLine?.amount ?? 0).toBeGreaterThan(0);
    expect(materialLine?.meta?.source).toBe('fallback');
  });

  it('derives material mass from cm^3 geometry volume for fallback materials', async () => {
    const geometry = baseGeometry();
    const result = await service.calculatePricing({
      part_config: createBasePartConfig({ material_id: 'AL6061' }),
      geometry,
      quantities: [1],
    });

    const row = result.pricing_matrix[0];
    const materialLine = row.breakdown?.find((line) => line.key === 'material_cost');

    expect(materialLine?.meta?.massKg).toBeCloseTo(0.324, 3);
    expect(materialLine?.amount).toBeGreaterThan(0);
  });

  it('prefers ship_to_region when resolving material catalog entries', async () => {
    const jestFactory = globalRef.jest;
    if (!jestFactory?.fn) {
      return;
    }

    const geometry = baseGeometry();
    const partConfig = createBasePartConfig({ material_id: 'MAT-123' });
    (partConfig as any).ship_to_region = 'eu';

    const materialStub = {
      id: 'MAT-123',
      code: 'MAT-123',
      name: 'Stub Material',
      category: 'metal',
      cost_per_kg: 7.2,
      base_cost_per_kg: 7.2,
      region_multiplier: 1.1,
      density: 2700,
      availability: true,
      lead_time_days: 4,
      processes: ['cnc_milling'],
    };

    const getMaterialSpy = jestFactory.fn().mockResolvedValue(materialStub);
    (service as any).getMaterialById = getMaterialSpy;

    await service.calculatePricing({
      part_config: partConfig,
      geometry,
      quantities: [1],
    });

    expect(getMaterialSpy).toHaveBeenCalled();
    const regionArg = getMaterialSpy.mock.calls[0]?.[1];
    expect(regionArg).toBe('EU');
  });
});
