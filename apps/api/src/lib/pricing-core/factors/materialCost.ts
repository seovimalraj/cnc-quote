import { Factor, FactorCtx, PriceBreakdownItem } from "../types";
import { createTraceEntry } from "../trace";

export class MaterialCostFactor implements Factor {
  code = 'materialCost';

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config } = ctx;

    // Get material config
    const materialCfg = config.materialBase[cfg.materialCode];
    if (!materialCfg) {
      throw new Error(`Unknown material code: ${cfg.materialCode}`);
    }

    // Calculate volume in cm³ (geometry is in mm³)
    const volumeCm3 = cfg.geometry.volume_mm3 / 1000;

    // Calculate material cost
    const materialCost = volumeCm3 * materialCfg.pricePerCm3;

    // Create breakdown item
    const item: PriceBreakdownItem = {
      code: 'material',
      label: `Material (${cfg.materialCode})`,
      amount: materialCost,
      meta: {
        volumeCm3,
        pricePerCm3: materialCfg.pricePerCm3,
      },
    };

    // Create trace entry
    const trace = createTraceEntry(
      this.code,
      { materialCode: cfg.materialCode, volumeMm3: cfg.geometry.volume_mm3 },
      { materialCost, volumeCm3, pricePerCm3: materialCfg.pricePerCm3 },
      `Calculated material cost for ${volumeCm3.toFixed(2)} cm³ of ${cfg.materialCode}`
    );

    return { items: [item], trace: [trace] };
  }
}