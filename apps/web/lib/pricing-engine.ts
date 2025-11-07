/**
 * Real Pricing Calculation Engine
 * Uses actual geometry data to calculate manufacturing costs
 */

import { GeometryData } from './cad-analysis';

export interface MaterialSpec {
  code: string;
  name: string;
  density: number; // g/cm³
  costPerKg: number; // USD per kg
  machinabilityFactor: number; // 1.0 = baseline, higher = harder to machine
}

export interface ProcessConfig {
  type: 'cnc-milling' | 'cnc-turning' | 'sheet-metal' | 'injection-molding';
  setupCost: number; // Fixed cost per job
  hourlyRate: number; // USD per machine hour
  materialWasteFactor: number; // 1.2 = 20% waste
}

export interface FinishOption {
  code: string;
  name: string;
  baseCost: number;
  perAreaCost: number; // USD per cm²
}

export interface PricingInput {
  geometry: GeometryData;
  material: MaterialSpec;
  process: ProcessConfig;
  finish: FinishOption;
  quantity: number;
  tolerance: 'standard' | 'precision' | 'tight';
  leadTimeType: 'economy' | 'standard' | 'expedited';
}

export interface PricingBreakdown {
  materialCost: number;
  machiningCost: number;
  setupCost: number;
  finishCost: number;
  toolingCost: number;
  inspectionCost: number;
  overheadCost: number;
  marginCost: number;
  subtotal: number;
  quantityDiscount: number;
  toleranceUpcharge: number;
  leadTimeMultiplier: number;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays: number;
}

// Material Database
export const MATERIALS: Record<string, MaterialSpec> = {
  'aluminum-6061': {
    code: 'AL-6061',
    name: 'Aluminum 6061-T6',
    density: 2.7,
    costPerKg: 8.50,
    machinabilityFactor: 1.0
  },
  'aluminum-7075': {
    code: 'AL-7075',
    name: 'Aluminum 7075-T6',
    density: 2.81,
    costPerKg: 15.00,
    machinabilityFactor: 1.2
  },
  'stainless-304': {
    code: 'SS-304',
    name: 'Stainless Steel 304',
    density: 8.0,
    costPerKg: 12.00,
    machinabilityFactor: 1.8
  },
  'stainless-316': {
    code: 'SS-316',
    name: 'Stainless Steel 316',
    density: 8.0,
    costPerKg: 18.00,
    machinabilityFactor: 2.0
  },
  'titanium-6al4v': {
    code: 'TI-6AL4V',
    name: 'Titanium Ti-6Al-4V',
    density: 4.43,
    costPerKg: 85.00,
    machinabilityFactor: 4.0
  },
  'brass-360': {
    code: 'BRASS-360',
    name: 'Brass 360',
    density: 8.5,
    costPerKg: 10.00,
    machinabilityFactor: 0.8
  },
  'copper': {
    code: 'COPPER',
    name: 'Copper C110',
    density: 8.96,
    costPerKg: 14.00,
    machinabilityFactor: 1.1
  },
  'plastic-abs': {
    code: 'ABS',
    name: 'ABS Plastic',
    density: 1.05,
    costPerKg: 6.00,
    machinabilityFactor: 0.4
  },
  'plastic-delrin': {
    code: 'DELRIN',
    name: 'Delrin (Acetal)',
    density: 1.41,
    costPerKg: 8.50,
    machinabilityFactor: 0.5
  },
  'nylon': {
    code: 'NYLON',
    name: 'Nylon 6/6',
    density: 1.14,
    costPerKg: 7.00,
    machinabilityFactor: 0.6
  }
};

// Process Configurations
export const PROCESSES: Record<string, ProcessConfig> = {
  'cnc-milling': {
    type: 'cnc-milling',
    setupCost: 75,
    hourlyRate: 85,
    materialWasteFactor: 1.3
  },
  'cnc-turning': {
    type: 'cnc-turning',
    setupCost: 50,
    hourlyRate: 75,
    materialWasteFactor: 1.2
  },
  'sheet-metal': {
    type: 'sheet-metal',
    setupCost: 100,
    hourlyRate: 65,
    materialWasteFactor: 1.15
  },
  'injection-molding': {
    type: 'injection-molding',
    setupCost: 2500,
    hourlyRate: 120,
    materialWasteFactor: 1.05
  }
};

// Finish Options
export const FINISHES: Record<string, FinishOption> = {
  'as-machined': {
    code: 'AS-MACH',
    name: 'As Machined',
    baseCost: 0,
    perAreaCost: 0
  },
  'bead-blasted': {
    code: 'BEAD-BLAST',
    name: 'Bead Blasted',
    baseCost: 15,
    perAreaCost: 0.05
  },
  'anodized-clear': {
    code: 'ANOD-CLEAR',
    name: 'Anodized Type II (Clear)',
    baseCost: 25,
    perAreaCost: 0.08
  },
  'anodized-color': {
    code: 'ANOD-COLOR',
    name: 'Anodized Type II (Color)',
    baseCost: 35,
    perAreaCost: 0.10
  },
  'powder-coated': {
    code: 'POWDER',
    name: 'Powder Coated',
    baseCost: 30,
    perAreaCost: 0.07
  },
  'electropolished': {
    code: 'EPOL',
    name: 'Electropolished',
    baseCost: 45,
    perAreaCost: 0.12
  }
};

/**
 * Calculate comprehensive pricing based on real geometry
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { geometry, material, process, finish, quantity, tolerance, leadTimeType } = input;
  
  // 1. Material Cost
  const volumeCm3 = geometry.volume / 1000; // mm³ to cm³
  const materialWeightKg = (volumeCm3 * material.density) / 1000;
  const materialCostPerUnit = materialWeightKg * material.costPerKg * process.materialWasteFactor;
  
  // 2. Machining Cost
  const machiningTimeHours = geometry.estimatedMachiningTime / 60;
  const machiningCostPerUnit = machiningTimeHours * process.hourlyRate * material.machinabilityFactor;
  
  // 3. Setup Cost (amortized over quantity)
  const setupCostPerUnit = process.setupCost / quantity;
  
  // 4. Finish Cost
  const surfaceAreaCm2 = geometry.surfaceArea / 100;
  const finishCostPerUnit = finish.baseCost + (finish.perAreaCost * surfaceAreaCm2);
  
  // 5. Tooling Cost (for complex parts)
  const complexityMultiplier = {
    simple: 1.0,
    moderate: 1.2,
    complex: 1.5
  }[geometry.complexity];
  const toolingCostPerUnit = (machiningCostPerUnit * 0.15) * complexityMultiplier;
  
  // 6. Inspection Cost (based on tolerance)
  const toleranceInspectionMap = {
    standard: 0.05,
    precision: 0.10,
    tight: 0.15
  };
  const inspectionCostPerUnit = (materialCostPerUnit + machiningCostPerUnit) * toleranceInspectionMap[tolerance];
  
  // 7. Overhead Cost (20% of direct costs)
  const directCosts = materialCostPerUnit + machiningCostPerUnit + setupCostPerUnit + finishCostPerUnit + toolingCostPerUnit + inspectionCostPerUnit;
  const overheadCostPerUnit = directCosts * 0.20;
  
  // 8. Margin (15% of total)
  const costBeforeMargin = directCosts + overheadCostPerUnit;
  const marginCostPerUnit = costBeforeMargin * 0.15;
  
  // Subtotal before adjustments
  const subtotalPerUnit = costBeforeMargin + marginCostPerUnit;
  
  // 9. Quantity Discount
  const quantityDiscountRate = 
    quantity >= 100 ? 0.20 :
    quantity >= 50 ? 0.15 :
    quantity >= 25 ? 0.10 :
    quantity >= 10 ? 0.05 :
    0;
  const quantityDiscount = subtotalPerUnit * quantityDiscountRate;
  
  // 10. Tolerance Upcharge
  const toleranceUpchargeRate = {
    standard: 0,
    precision: 0.15,
    tight: 0.30
  }[tolerance];
  const toleranceUpcharge = subtotalPerUnit * toleranceUpchargeRate;
  
  // 11. Lead Time Multiplier
  const leadTimeMultiplierMap = {
    economy: 0.85,
    standard: 1.0,
    expedited: 1.35
  };
  const leadTimeMultiplier = leadTimeMultiplierMap[leadTimeType];
  
  // Final unit price
  const unitPrice = (subtotalPerUnit - quantityDiscount + toleranceUpcharge) * leadTimeMultiplier;
  const totalPrice = unitPrice * quantity;
  
  // Lead time calculation
  const baseLeadDays = {
    simple: 5,
    moderate: 8,
    complex: 12
  }[geometry.complexity];
  
  const leadTimeAdjustment = {
    economy: 1.5,
    standard: 1.0,
    expedited: 0.6
  }[leadTimeType];
  
  const quantityLeadFactor = Math.ceil(quantity / 50);
  const leadTimeDays = Math.round(baseLeadDays * leadTimeAdjustment * quantityLeadFactor);
  
  return {
    materialCost: Number(materialCostPerUnit.toFixed(2)),
    machiningCost: Number(machiningCostPerUnit.toFixed(2)),
    setupCost: Number(setupCostPerUnit.toFixed(2)),
    finishCost: Number(finishCostPerUnit.toFixed(2)),
    toolingCost: Number(toolingCostPerUnit.toFixed(2)),
    inspectionCost: Number(inspectionCostPerUnit.toFixed(2)),
    overheadCost: Number(overheadCostPerUnit.toFixed(2)),
    marginCost: Number(marginCostPerUnit.toFixed(2)),
    subtotal: Number(subtotalPerUnit.toFixed(2)),
    quantityDiscount: Number(quantityDiscount.toFixed(2)),
    toleranceUpcharge: Number(toleranceUpcharge.toFixed(2)),
    leadTimeMultiplier: Number(leadTimeMultiplier.toFixed(2)),
    unitPrice: Number(unitPrice.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2)),
    leadTimeDays
  };
}

/**
 * Calculate pricing for multiple quantity tiers
 */
export function calculatePricingMatrix(
  geometry: GeometryData,
  material: MaterialSpec,
  process: ProcessConfig,
  finish: FinishOption,
  tolerance: 'standard' | 'precision' | 'tight',
  leadTimeType: 'economy' | 'standard' | 'expedited',
  quantities: number[] = [1, 10, 25, 50, 100]
): PricingBreakdown[] {
  return quantities.map(quantity => 
    calculatePricing({
      geometry,
      material,
      process,
      finish,
      quantity,
      tolerance,
      leadTimeType
    })
  );
}

/**
 * Helper: Get material by name/code
 */
export function getMaterial(nameOrCode: string): MaterialSpec | null {
  const normalized = nameOrCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [key, mat] of Object.entries(MATERIALS)) {
    const keyNorm = key.replace(/[^a-z0-9]/g, '');
    const codeNorm = mat.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameNorm = mat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (keyNorm === normalized || codeNorm === normalized || nameNorm.includes(normalized)) {
      return mat;
    }
  }
  
  // Default to aluminum 6061
  return MATERIALS['aluminum-6061'];
}

/**
 * Helper: Get finish by name/code
 */
export function getFinish(nameOrCode: string): FinishOption {
  const normalized = nameOrCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [key, fin] of Object.entries(FINISHES)) {
    const keyNorm = key.replace(/[^a-z0-9]/g, '');
    const codeNorm = fin.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (keyNorm === normalized || codeNorm === normalized) {
      return fin;
    }
  }
  
  return FINISHES['as-machined'];
}
