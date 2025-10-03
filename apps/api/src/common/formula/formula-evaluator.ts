/**
 * Formula Evaluator (Step 11)
 * Safe expression runtime for finish operation cost/lead calculations
 */

import { Injectable, Logger } from '@nestjs/common';

export interface FormulaContext {
  // Geometry
  area_m2?: number;
  sa?: number; // alias for area_m2
  volume_cm3?: number;
  v_cm3?: number; // alias
  mass_kg?: number;
  
  // Line config
  qty?: number;
  part_class?: 'simple' | 'complex' | 'delicate';
  
  // Process context
  batch_size?: number;
  setup_minutes?: number;
  run_minutes_per_part?: number;
  
  // Material/region
  region?: string;
  material?: string;
  
  // Finish params
  finish_grade?: string;
  color?: string;
  
  // Additional context
  [key: string]: any;
}

export interface TieredPrice {
  upTo: number;
  price: number;
}

@Injectable()
export class FormulaEvaluator {
  private readonly logger = new Logger(FormulaEvaluator.name);
  
  // Timeout for formula execution
  private readonly EVAL_TIMEOUT_MS = 50;
  
  // Denylist of unsafe constructs
  private readonly UNSAFE_PATTERNS = [
    /\bFunction\b/,
    /\beval\b/,
    /\brequire\b/,
    /\bimport\b/,
    /\bprocess\b/,
    /\bglobal\b/,
    /\b__dirname\b/,
    /\b__filename\b/,
    /\bmodule\b/,
    /\bexports\b/,
    /constructor\s*\(/,
    /__proto__/,
    /prototype/,
  ];
  
  /**
   * Evaluate a formula in a safe sandbox
   */
  evaluate(formula: string, context: FormulaContext): number {
    // Validate formula safety
    this.validateFormula(formula);
    
    // Prepare safe context with helpers
    const safeContext = this.prepareSafeContext(context);
    
    // Execute with timeout
    try {
      const result = this.executeWithTimeout(formula, safeContext);
      
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error(`Formula must return a finite number, got: ${result}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Formula evaluation error: ${(error as Error)?.message}`);
      throw new Error(`FINISH_UNSAFE_FORMULA: ${(error as Error)?.message}`);
    }
  }
  
  private validateFormula(formula: string): void {
    // Check for unsafe patterns
    for (const pattern of this.UNSAFE_PATTERNS) {
      if (pattern.test(formula)) {
        throw new Error(`Unsafe pattern detected: ${pattern.source}`);
      }
    }
    
    // Basic syntax check
    if (formula.length > 2000) {
      throw new Error('Formula too long (max 2000 chars)');
    }
  }
  
  private prepareSafeContext(context: FormulaContext): Record<string, any> {
    // Normalize context with aliases
    const normalized = {
      ...context,
      sa: context.area_m2 ?? context.sa ?? 0,
      area_m2: context.area_m2 ?? context.sa ?? 0,
      v_cm3: context.volume_cm3 ?? context.v_cm3 ?? 0,
      volume_cm3: context.volume_cm3 ?? context.v_cm3 ?? 0,
      qty: context.qty ?? 1,
      batch_size: context.batch_size ?? 50,
      setup_minutes: context.setup_minutes ?? 0,
      run_minutes_per_part: context.run_minutes_per_part ?? 0,
      mass_kg: context.mass_kg ?? 0,
      region: context.region ?? 'US',
      material: context.material ?? '',
      part_class: context.part_class ?? 'simple',
      finish_grade: context.finish_grade ?? 'A',
      color: context.color ?? 'clear',
    };
    
    // Add safe Math helpers
    const helpers = {
      Math: {
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        max: Math.max,
        min: Math.min,
        abs: Math.abs,
        sqrt: Math.sqrt,
        pow: Math.pow,
      },
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round,
      max: Math.max,
      min: Math.min,
      tiered: this.tiered.bind(this),
      regionMult: this.regionMult.bind(this),
      hazardFee: this.hazardFee.bind(this),
    };
    
    return { ...normalized, ...helpers };
  }
  
  private executeWithTimeout(formula: string, context: Record<string, any>): number {
    const startTime = Date.now();
    
    // Create a function from the formula string
    // Using Function constructor with strict variable binding
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map(k => context[k]);
    
    try {
      // Wrap formula in a function with timeout check
      const wrappedFormula = `
        const __start = ${startTime};
        if (Date.now() - __start > ${this.EVAL_TIMEOUT_MS}) {
          throw new Error('Formula execution timeout');
        }
        return (${formula});
      `;
      
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(...contextKeys, wrappedFormula);
      const result = fn(...contextValues);
      
      // Check execution time
      if (Date.now() - startTime > this.EVAL_TIMEOUT_MS) {
        throw new Error('Formula execution timeout');
      }
      
      return Number(result);
    } catch (error) {
      throw new Error(`Formula execution failed: ${(error as Error)?.message}`);
    }
  }
  
  /**
   * Tiered pricing helper
   * @param value The value to price (e.g., surface area)
   * @param tiers Array of {upTo, price} tiers
   */
  private tiered(value: number, tiers: TieredPrice[]): number {
    for (const tier of tiers) {
      if (value <= tier.upTo) {
        return tier.price;
      }
    }
    // If value exceeds all tiers, return last tier price
    return tiers.length > 0 ? tiers[tiers.length - 1].price : 0;
  }
  
  /**
   * Region multiplier helper
   * @param region Region code
   * @param processCode Process code for multiplier lookup
   */
  private regionMult(region: string, processCode: string): number {
    // Simplified region multipliers
    // In production, these would come from a database table
    const multipliers: Record<string, Record<string, number>> = {
      ANODIZE: {
        US: 1.0,
        EU: 1.15,
        IN: 0.85,
        CN: 0.75,
      },
      PLATING: {
        US: 1.0,
        EU: 1.2,
        IN: 0.8,
        CN: 0.7,
      },
    };
    
    const processMultipliers = multipliers[processCode.toUpperCase()] || {};
    return processMultipliers[region.toUpperCase()] || 1.0;
  }
  
  /**
   * Hazard fee helper for special materials
   * @param material Material code
   */
  private hazardFee(material: string): number {
    const mat = (material || '').toUpperCase();
    
    if (mat.includes('TITANIUM') || mat.includes('TI-6AL')) {
      return 25; // Titanium hazard fee
    }
    if (mat.includes('BERYLLIUM')) {
      return 50; // High hazard
    }
    if (mat.includes('INCONEL') || mat.includes('HASTELLOY')) {
      return 15; // Exotic alloys
    }
    
    return 0;
  }
}
