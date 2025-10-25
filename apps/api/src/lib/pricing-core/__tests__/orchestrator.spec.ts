// @ts-nocheck
/// <reference types="jest" />
import { PricingOrchestrator } from "../orchestrator";
import { QuoteConfig, PricingCacheAdapter, PricingResult, Factor } from "../types";

class InMemoryCache implements PricingCacheAdapter {
  private store = new Map<string, PricingResult>();

  async get(key: string): Promise<PricingResult | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: PricingResult): Promise<void> {
    this.store.set(key, value);
  }
}

describe('PricingOrchestrator', () => {
  let orchestrator: PricingOrchestrator;

  beforeEach(() => {
    orchestrator = new PricingOrchestrator();
  });

  describe('Basic CNC Milling Quote', () => {
    const baseConfig: QuoteConfig = {
      id: 'test-quote-1',
      orgId: 'test-org',
      processCode: 'CNC-MILL-3AX',
      materialCode: 'aluminum_6061',
      quantity: 10,
      geometry: {
        volume_mm3: 100000, // 100 cm³
        area_mm2: 50000,
        bbox_mm: [100, 50, 20],
      },
      tolerance: {
        band_um: 100,
      },
      finishes: ['anodize'],
      leadClass: 'standard',
      currency: 'USD',
      risk: {
        dfm_risk_score: 0.2,
      },
    };

    it('should calculate complete price breakdown', async () => {
      const result = await orchestrator.calculatePrice(baseConfig);

      expect(result.total).toBeGreaterThan(0);
      expect(result.currency).toBe('USD');
      expect(result.breakdown).toHaveLength(10); // material, machining, complexity, feature_efficiency, dfm_penalty, hole_machining, undercut_penalty, finish, risk, quantity
      expect(result.trace).toHaveLength(7);
      expect(result.version).toBe('1.0.0');
      expect(result.inputHash).toBeDefined();
      expect(result.timings_ms).toBeDefined();
    });

    it('should include material cost', async () => {
      const result = await orchestrator.calculatePrice(baseConfig);

      const materialItem = result.breakdown.find(item => item.code === 'material');
      expect(materialItem).toBeDefined();
      expect(materialItem!.amount).toBeGreaterThan(0);
      expect(materialItem!.meta).toHaveProperty('volumeCm3', 100);
    });

    it('should include machining cost', async () => {
      const result = await orchestrator.calculatePrice(baseConfig);

      const machiningItem = result.breakdown.find(item => item.code === 'machining');
      expect(machiningItem).toBeDefined();
      expect(machiningItem!.amount).toBeGreaterThan(0);
      expect(machiningItem!.meta).toHaveProperty('totalMin');
    });

    it('should include finish cost', async () => {
      const result = await orchestrator.calculatePrice(baseConfig);

      const finishItem = result.breakdown.find(item => item.code.startsWith('finish_'));
      expect(finishItem).toBeDefined();
      expect(finishItem!.amount).toBeGreaterThan(0);
    });

    it('should apply risk uplift', async () => {
      const result = await orchestrator.calculatePrice(baseConfig);

      const riskItem = result.breakdown.find(item => item.code === 'risk_uplift');
      expect(riskItem).toBeDefined();
      expect(riskItem!.amount).toBeGreaterThan(0);
      expect(riskItem!.meta).toHaveProperty('riskScore', 0.2);
    });

    it('should apply quantity discount', async () => {
      const result = await orchestrator.calculatePrice(baseConfig);

      const discountItem = result.breakdown.find(item => item.code === 'quantity_discount');
      expect(discountItem).toBeDefined();
      expect(discountItem!.amount).toBeLessThan(0); // Negative for discount
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero risk score', async () => {
      const config: QuoteConfig = {
        id: 'test-zero-risk',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      const riskItem = result.breakdown.find(item => item.code === 'risk_uplift');
      expect(riskItem?.amount ?? 0).toBe(0);
    });

    it('should handle no finishes', async () => {
      const config: QuoteConfig = {
        id: 'test-no-finishes',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        finishes: [],
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      const finishItems = result.breakdown.filter(item => item.code.startsWith('finish_'));
      expect(finishItems).toHaveLength(0);
    });

    it('should handle large quantity discount', async () => {
      const config: QuoteConfig = {
        id: 'test-large-quantity',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 10000, // Very large quantity
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      const discountItem = result.breakdown.find(item => item.code === 'quantity_discount');
      expect(discountItem!.amount).toBeLessThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw on unknown material', async () => {
      const config: QuoteConfig = {
        id: 'test-bad-material',
        orgId: 'test-org',
        processCode: 'cnc_mill',
        materialCode: 'unknown_material',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        currency: 'USD',
      };

      await expect(orchestrator.calculatePrice(config)).rejects.toThrow('Unknown material code');
    });

    it('should throw on unknown process', async () => {
      const config: QuoteConfig = {
        id: 'test-bad-process',
        orgId: 'test-org',
        processCode: 'unknown_process' as any,
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        currency: 'USD',
      };

      await expect(orchestrator.calculatePrice(config)).rejects.toThrow('Unknown process code');
    });

    it('should throw on unknown finish', async () => {
      const config: QuoteConfig = {
        id: 'test-bad-finish',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        finishes: ['unknown_finish'],
        currency: 'USD',
      };

      await expect(orchestrator.calculatePrice(config)).rejects.toThrow('Unknown finish code');
    });
  });

  describe('Multi-Process Support', () => {
    it('should handle 5-axis CNC milling', async () => {
      const config: QuoteConfig = {
        id: 'test-5axis',
        orgId: 'test-org',
        processCode: 'CNC-MILL-5AX',
        materialCode: 'titanium',
        quantity: 1,
        geometry: {
          volume_mm3: 5000,
          area_mm2: 2000,
          bbox_mm: [50, 20, 10],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown.find(item => item.code === 'machining')!.meta!.hourlyRate).toBe(125);
    });

    it('should handle injection molding with steel', async () => {
      const config: QuoteConfig = {
        id: 'test-injection-steel',
        orgId: 'test-org',
        processCode: 'INJ-MOLD-STEEL',
        materialCode: 'abs',
        quantity: 1000,
        geometry: {
          volume_mm3: 10000,
          area_mm2: 3000,
          bbox_mm: [40, 30, 20],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown.find(item => item.code === 'machining')!.meta!.hourlyRate).toBe(200);
    });

    it('should handle SLA 3D printing', async () => {
      const config: QuoteConfig = {
        id: 'test-sla',
        orgId: 'test-org',
        processCode: '3DP-SLA',
        materialCode: 'abs',
        quantity: 1,
        geometry: {
          volume_mm3: 2000,
          area_mm2: 1000,
          bbox_mm: [20, 15, 10],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown.find(item => item.code === 'machining')!.meta!.hourlyRate).toBe(75);
    });

    it('should apply tolerance cost adjustments', async () => {
      const config: QuoteConfig = {
        id: 'test-tolerance',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        tolerance: {
          band: 'fine',
          category: 'linear',
          featureCategory: 'hole',
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      const toleranceItem = result.breakdown.find(item => item.code === 'tolerance_adjustment');
      expect(toleranceItem).toBeDefined();
      expect(toleranceItem!.amount).toBeGreaterThan(0);
      expect(toleranceItem!.meta).toHaveProperty('band', 'fine');
      expect(toleranceItem!.meta).toHaveProperty('category', 'linear');
    });

    it('should apply feature-based pricing adjustments', async () => {
      const config: QuoteConfig = {
        id: 'test-features',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 10000, // Larger volume to trigger feature detection
          area_mm2: 800, // High surface area suggests holes/pockets
          bbox_mm: [50, 40, 20],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      // Should include feature-related breakdown items
      const featureItems = result.breakdown.filter(item =>
        item.code.includes('complexity') ||
        item.code.includes('feature') ||
        item.code.includes('hole') ||
        item.code.includes('dfm')
      );

      expect(featureItems.length).toBeGreaterThan(0);

      // Trace should include feature extraction info
      const featureTrace = result.trace.find(t => t.factor === 'featurePricing');
      expect(featureTrace).toBeDefined();
      expect(featureTrace!.output).toHaveProperty('featureCount');
      expect(featureTrace!.output).toHaveProperty('complexityScore');
    });

    it('should handle complex geometry with multiple features', async () => {
      const config: QuoteConfig = {
        id: 'test-complex-geometry',
        orgId: 'test-org',
        processCode: 'CNC-MILL-5AX',
        materialCode: 'titanium',
        quantity: 1,
        geometry: {
          volume_mm3: 50000, // Very large volume
          area_mm2: 5000, // Very high surface area suggests many features
          bbox_mm: [100, 80, 50],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      // Complex geometry should result in higher costs
      expect(result.total).toBeGreaterThan(0);

      // Should have feature extraction trace
      const featureTrace = result.trace.find(t => t.factor === 'featurePricing');
      expect(featureTrace).toBeDefined();
      expect(featureTrace!.output.complexityScore).toBeGreaterThan(1);
    });
    it('should generate valid trace', async () => {
      const config: QuoteConfig = {
        id: 'test-trace',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        currency: 'USD',
      };

      const result = await orchestrator.calculatePrice(config);

      expect(result.trace).toHaveLength(7);
      result.trace.forEach(entry => {
        expect(entry.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(entry.factor).toBeDefined();
        expect(entry.inputHash).toMatch(/^[a-f0-9]{64}$/);
        expect(typeof entry.output).toBe('object');
      });
    });
  });

  describe('Caching behaviour', () => {
    it('should reuse cached results and avoid re-running factors', async () => {
      const cache = new InMemoryCache();
      let executions = 0;

      const stubFactor: Factor = {
        code: 'stub_factor',
        async run() {
          executions += 1;
          return {
            items: [
              {
                code: 'stub',
                label: 'Stubbed result',
                amount: 42,
              },
            ],
            trace: [],
          };
        },
      };

      orchestrator = new PricingOrchestrator({
        factors: [stubFactor],
        cache,
      });

      const cfg: QuoteConfig = {
        id: 'cache-test',
        orgId: 'test-org',
        processCode: 'CNC-MILL-3AX',
        materialCode: 'aluminum_6061',
        quantity: 1,
        geometry: {
          volume_mm3: 1000,
          area_mm2: 1000,
          bbox_mm: [10, 10, 10],
        },
        currency: 'USD',
      };

      const first = await orchestrator.calculatePrice(cfg);
      const second = await orchestrator.calculatePrice(cfg);

      expect(first.cacheHit).toBe(false);
      expect(second.cacheHit).toBe(true);
      expect(second.cacheKey).toBe(first.cacheKey);
      expect(executions).toBe(1);
      expect(second.total).toBe(first.total);
    });
  });
});
