import { buildDefaultOrchestrator, PricingInput } from "../index";

const { describe, it, expect } = globalThis as Record<string, any>;

const baselineInputs = [
  {
    name: 'Al_6061_block_mill',
    input: {
      orgId: 'o1',
      partId: 'p1',
      process: 'cnc_milling' as const,
      materialCode: 'AL6061',
      quantity: 10,
      features: { holes: { count: 6 }, pockets: { count: 2 }, volume_mm3: 1.8e6 },
    },
  },
  {
    name: 'Steel_shaft_turn',
    input: {
      orgId: 'o1',
      partId: 'p2',
      process: 'turning' as const,
      materialCode: 'SS304',
      quantity: 5,
      features: { turn_ops: 3, volume_mm3: 9e5 },
      tolerances: { shaft_dia: { value: 0.05, unit: 'mm' as const } },
    },
  },
  {
    name: 'Sheet_bracket',
    input: {
      orgId: 'o1',
      partId: 'p3',
      process: 'sheet' as const,
      materialCode: 'AL5052',
      quantity: 25,
      features: { bends: 4, pierces: 60, volume_mm3: 7e5 },
    },
  },
] satisfies Array<{ name: string; input: PricingInput }>;

describe('PricingOrchestrator', () => {
  it('is deterministic and ordered', async () => {
    const orchestrator = buildDefaultOrchestrator();
    const first = await orchestrator.run(baselineInputs[0].input);
    const second = await orchestrator.run(baselineInputs[0].input);
    expect(first).toEqual(second);

    const expectedOrder = [
      'setup_time',
      'machine_time',
      'material_cost',
      'finish_cost',
      'tolerance_multiplier',
      'overhead',
      'risk_markup',
      'margin',
    ];

    const actualOrder = first.breakdown.map((line) => line.key);
    const intersection = expectedOrder.filter((key) => actualOrder.includes(key));
    expect(actualOrder).toEqual(intersection);
  });

  it.each(baselineInputs)('produces positive totals for %s', async ({ input }) => {
    const orchestrator = buildDefaultOrchestrator();
    const result = await orchestrator.run(input);
    expect(result.price).toBeGreaterThan(0);
    expect(result.subtotalCost).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('applies tolerance adjustments when tolerance summary provided', async () => {
    const orchestrator = buildDefaultOrchestrator();
    const toleranceInput = {
      orgId: 'o-tol',
      partId: 'p-tol',
      process: 'cnc_milling' as const,
      materialCode: 'AL6061',
      quantity: 5,
      features: { holes: { count: 2 }, pockets: { count: 1 }, volume_mm3: 1.8e6 },
      toleranceProfile: {
        band: 'precision',
        category: 'linear',
        source: 'class',
        multipliers: { machining: 1.2, setup: 1.1, inspection: 1.3 },
      },
      toleranceEntries: [
        {
          key: 'hole:diameter:0',
          featureId: 'h1',
          featureType: 'hole' as const,
          appliesTo: 'diameter' as const,
          unit: 'mm' as const,
          value: 0.02,
          rawValue: 0.02,
          rawUnit: 'mm' as const,
          source: 'structured' as const,
          reviewRequired: false,
          fitCode: 'H7',
          notes: 'ISO fit',
        },
      ],
      toleranceMatches: [
        {
          entryKey: 'hole:diameter:0',
          featureType: 'hole' as const,
          appliesTo: 'diameter' as const,
          unit: 'mm' as const,
          value: 0.02,
          rawValue: 0.02,
          rawUnit: 'mm' as const,
          source: 'structured' as const,
          affects: ['machine_time', 'setup_time'],
          multiplier: 1.3,
          rowId: 101,
          catalogVersion: 1,
          reviewRequired: false,
          fitCode: 'H7',
          notes: 'tight hole',
        },
      ],
      toleranceSummary: {
        machineMultiplier: 1.3,
        setupMultiplier: 1.15,
        inspectionMultiplier: 1.2,
        riskMultiplier: 1,
        entryCount: 1,
        tightestValueMm: 0.02,
        sources: { structured: 1 },
        matchedRowIds: [101],
        reviewRequired: false,
        baseMultipliers: { machining: 1.2, setup: 1.1, inspection: 1.3 },
      },
      toleranceCatalogVersion: 1,
      tolerances: { hole: { value: 0.02, unit: 'mm' as const } },
    } satisfies PricingInput;

    const result = await orchestrator.run(toleranceInput);

    const toleranceLine = result.breakdown.find((line) => line.key === 'tolerance_multiplier');
    expect(toleranceLine).toBeDefined();

    const machineLine = result.breakdown.find((line) => line.key === 'machine_time');
    expect(machineLine?.meta?.toleranceMultiplier).toBeCloseTo(1.3, 4);
    expect(machineLine?.meta?.toleranceMinutesDelta).toBeCloseTo(8.4, 2);

    const setupLine = result.breakdown.find((line) => line.key === 'setup_time');
    expect(setupLine?.meta?.toleranceMultiplier).toBeCloseTo(1.15, 4);
    expect(setupLine?.meta?.toleranceMinutesDelta).toBeCloseTo(3.99, 2);

    const summary = toleranceInput.toleranceSummary;
    const machineDeltaExpected = Number(
      ((machineLine?.amount ?? 0) * (summary.machineMultiplier - 1)).toFixed(2),
    );
    const setupDeltaExpected = Number(
      ((setupLine?.amount ?? 0) * (summary.setupMultiplier - 1)).toFixed(2),
    );
    const expectedTotal = Number((machineDeltaExpected + setupDeltaExpected).toFixed(2));
    expect(toleranceLine?.amount).toBeCloseTo(expectedTotal, 2);

    expect(result.logs.some((log) => log.includes('tolerance_multiplier applied'))).toBe(true);
  });
});
