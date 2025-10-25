import { PricingContext, PricingFactor } from "../../core/types";

interface MaterialRecord {
  density: number;
  costPerKg: number;
}

const MATERIALS: Record<string, MaterialRecord> = {
  AL6061: { density: 2700, costPerKg: 7.2 },
  AL5052: { density: 2680, costPerKg: 6.9 },
  SS304: { density: 7900, costPerKg: 14.5 },
};

export const MaterialCostFactor: PricingFactor = {
  name: 'material_cost',
  stage: 'cost',
  order: 30,
  applies: () => true,
  compute: (ctx: PricingContext) => {
  const materialSnapshot = ctx.input.material;
    const fallbackKey = normalizeMaterialKey(ctx.input.materialCode);
    const fallbackMaterial = MATERIALS[fallbackKey] ?? MATERIALS.AL6061;

    const density = materialSnapshot?.densityKgM3 ?? fallbackMaterial.density;
  const costPerKg = materialSnapshot?.costPerKg ?? fallbackMaterial.costPerKg;

    const massKg = estimateMassKg(ctx.input.features, density);
    const costPerPart = toMoney(massKg * costPerKg);
    const quantity = Math.max(1, ctx.input.quantity);
    ctx.subtotalCost += costPerPart;
    ctx.breakdown.push({
      key: 'material_cost',
      label: 'Material Cost',
      amount: costPerPart,
      meta: {
        massKg,
        density,
        costPerKg,
        quantity,
        source: materialSnapshot?.source ?? 'fallback',
      },
    });
  },
};

function normalizeMaterialKey(value: string | undefined): string {
  if (!value) return 'AL6061';
  const trimmed = value.trim().toUpperCase();
  if (MATERIALS[trimmed]) {
    return trimmed;
  }
  return trimmed.replace(/[^A-Z0-9]/g, '') || 'AL6061';
}

function estimateMassKg(features: Record<string, any> | undefined, density: number): number {
  const volumeMm3 = Number(features?.volume_mm3 ?? 0);
  let metersCubed: number;

  if (Number.isFinite(volumeMm3) && volumeMm3 > 0) {
    metersCubed = volumeMm3 / 1e9;
  } else {
    const volumeCc = Number(features?.volume_cc ?? features?.volume_cm3 ?? 0);
    metersCubed = Number.isFinite(volumeCc) && volumeCc > 0 ? volumeCc / 1e6 : 0;
  }

  return Number((metersCubed * density).toFixed(4));
}

function toMoney(value: number): number {
  return Number(value.toFixed(2));
}
