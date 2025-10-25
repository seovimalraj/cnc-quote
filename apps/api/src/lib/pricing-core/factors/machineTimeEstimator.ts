import { Factor, FactorCtx, PriceBreakdownItem } from "../types";
import { createTraceEntry } from "../trace";

export class MachineTimeEstimatorFactor implements Factor {
  code = 'machineTimeEstimator';

  async run(ctx: FactorCtx): Promise<{ items: PriceBreakdownItem[]; trace: any[] }> {
    const { cfg, config } = ctx;

    // Get machine config for process
    const machineCfg = config.machine[cfg.processCode];
    if (!machineCfg) {
      throw new Error(`Unknown process code: ${cfg.processCode}`);
    }

    // Calculate volume in cm³
    const volumeCm3 = cfg.geometry.volume_mm3 / 1000;

    // Calculate run time in minutes
    const runMin = volumeCm3 * machineCfg.runMinPerCm3;

    // Total time = setup + run
    const totalMin = machineCfg.setupMin + runMin;

    // Calculate cost at hourly rate
    const hourlyRate = machineCfg.hourlyRate;
    const timeCost = (totalMin / 60) * hourlyRate;

    // Create breakdown item
    const item: PriceBreakdownItem = {
      code: 'machining',
      label: `Machining (${cfg.processCode})`,
      amount: timeCost,
      meta: {
        setupMin: machineCfg.setupMin,
        runMin,
        totalMin,
        hourlyRate,
        volumeCm3,
      },
    };

    // Create trace entry
    const trace = createTraceEntry(
      this.code,
      {
        processCode: cfg.processCode,
        volumeMm3: cfg.geometry.volume_mm3,
        quantity: cfg.quantity,
      },
      {
        timeCost,
        totalMin,
        setupMin: machineCfg.setupMin,
        runMin,
        hourlyRate,
      },
      `Estimated ${totalMin.toFixed(1)} min machining time at $${hourlyRate}/hr`
    );

    return { items: [item], trace: [trace] };
  }
}