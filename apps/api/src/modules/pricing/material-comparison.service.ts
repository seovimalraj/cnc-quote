import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { MaterialsService } from '../catalog/materials.service';
import { PricingService } from './pricing.service';

export interface MaterialComparisonRequest {
  /** Current material ID */
  materialId: string;
  
  /** Process type to filter compatible materials */
  processType: string;
  
  /** Geometry parameters for pricing */
  geometry: {
    volume_cc: number;
    surface_area_cm2: number;
    removed_material_cc?: number;
  };
  
  /** Feature complexity */
  features?: {
    holes?: number;
    pockets?: number;
    slots?: number;
    faces?: number;
  };
  
  /** Quantity for pricing */
  quantity: number;
  
  /** Machine ID */
  machineId: string;
  
  /** Region for pricing */
  region?: 'US' | 'EU' | 'IN' | 'UK' | 'CA' | 'AU';
  
  /** Maximum number of alternatives */
  limit?: number;
}

export interface MaterialComparisonItem {
  /** Material details */
  material: {
    id: string;
    code: string;
    name: string;
    category: string;
  };
  
  /** Mechanical properties */
  properties: {
    density_kg_m3: number;
    machinability_index: number;
    hardness_hb?: number;
    tensile_mpa?: number;
    yield_strength?: number;
  };
  
  /** Pricing information */
  pricing: {
    unit_price: number;
    material_cost: number;
    machining_cost: number;
    total_cost: number;
    lead_time_days: number;
  };
  
  /** Comparison metrics */
  comparison: {
    cost_delta_pct: number;
    cost_delta_usd: number;
    weight_g: number;
    weight_delta_pct: number;
    machinability_score: number;
    strength_score: number;
  };
  
  /** Compatibility flags */
  compatibility: {
    available: boolean;
    process_compatible: boolean;
    region_available: boolean;
    finish_compatible: boolean;
    warnings: string[];
  };
  
  /** Recommendation score (0-100) */
  score: number;
  
  /** Best value flag */
  is_best_value: boolean;
}

export interface MaterialComparisonResponse {
  /** Current material (baseline) */
  current: MaterialComparisonItem;
  
  /** Alternative materials */
  alternatives: MaterialComparisonItem[];
  
  /** Comparison metadata */
  metadata: {
    total_alternatives: number;
    best_value_id: string;
    cheapest_id: string;
    strongest_id: string;
    most_machinable_id: string;
  };
}

@Injectable()
export class MaterialComparisonService {
  private readonly logger = new Logger(MaterialComparisonService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly materialsService: MaterialsService,
    private readonly pricingService: PricingService
  ) {}

  /**
   * Compare materials and return alternatives
   */
  async compareMaterials(
    request: MaterialComparisonRequest
  ): Promise<MaterialComparisonResponse> {
    const { materialId, processType, geometry, features, quantity, machineId, region, limit = 5 } = request;
    
    this.logger.log(`Comparing materials for ${materialId} (process: ${processType})`);
    
    try {
      // 1. Get current material details
  const currentMaterial = await this.materialsService.getMaterial(materialId);
      
      if (!currentMaterial) {
        throw new Error(`Material ${materialId} not found`);
      }
      
      // 2. Calculate baseline pricing
      const currentPricing = await this.calculatePricing({
        materialId,
        machineId,
        geometry,
        features,
        quantity,
      });
      
      // 3. Find compatible alternative materials
      const alternatives = await this.findCompatibleMaterials({
        processType,
        region,
        excludeId: materialId,
        limit: limit + 5, // Get more, then filter
      });
      
      // 4. Calculate pricing for all alternatives
      const alternativesWithPricing = await Promise.all(
        alternatives.map(async (material) => {
          try {
            const pricing = await this.calculatePricing({
              materialId: material.id,
              machineId,
              geometry,
              features,
              quantity,
            });
            
            return {
              material,
              pricing,
            };
          } catch (error) {
            this.logger.warn(`Failed to price material ${material.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
          }
        })
      );
      
      // Filter out failures
      const validAlternatives = alternativesWithPricing.filter((alt) => alt !== null);
      
      // 5. Build comparison items
      const currentItem = this.buildComparisonItem(
        currentMaterial,
        currentPricing,
        currentMaterial,
        currentPricing,
        processType
      );
      
      const alternativeItems = validAlternatives.map((alt) =>
        this.buildComparisonItem(
          alt.material,
          alt.pricing,
          currentMaterial,
          currentPricing,
          processType
        )
      );
      
      // 6. Calculate scores and rank
      const rankedAlternatives = alternativeItems
        .map((item) => ({
          ...item,
          score: this.calculateScore(item, currentItem),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // 7. Identify best value
      const bestValue = rankedAlternatives.reduce((best, current) =>
        current.score > best.score ? current : best
      );
      
      const cheapest = rankedAlternatives.reduce((cheap, current) =>
        current.pricing.total_cost < cheap.pricing.total_cost ? current : cheap
      );
      
      const strongest = rankedAlternatives.reduce((strong, current) =>
        (current.properties.tensile_mpa || 0) > (strong.properties.tensile_mpa || 0) ? current : strong
      );
      
      const mostMachinable = rankedAlternatives.reduce((mach, current) =>
        current.properties.machinability_index > mach.properties.machinability_index ? current : mach
      );
      
      // Mark best value
      bestValue.is_best_value = true;
      
      return {
        current: currentItem,
        alternatives: rankedAlternatives,
        metadata: {
          total_alternatives: alternativeItems.length,
          best_value_id: bestValue.material.id,
          cheapest_id: cheapest.material.id,
          strongest_id: strongest.material.id,
          most_machinable_id: mostMachinable.material.id,
        },
      };
    } catch (error) {
      this.logger.error(`Material comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Find compatible materials for comparison
   */
  private async findCompatibleMaterials(options: {
    processType: string;
    region?: string;
    excludeId: string;
    limit: number;
  }): Promise<any[]> {
    const { processType, region, excludeId, limit } = options;
    
    // Query materials from database
  const { data: materials, error } = await this.supabase.client
      .from('material_properties')
      .select(`
        id,
        category_id,
        code,
        name,
        standard,
        processes,
        available_regions,
        density_kg_m3,
        machinability_index,
        hardness_hb,
        tensile_mpa,
        cost_per_kg_base,
        is_active,
        category:material_categories ( id, code, name )
      `)
      .eq('is_active', true)
      .contains('processes', [processType])
      .neq('id', excludeId)
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to query materials: ${error.message}`);
    }
    
    // Filter by region if specified
    let filteredMaterials = materials || [];
    
    if (region) {
      filteredMaterials = filteredMaterials.filter((m) =>
        (m.available_regions || []).includes(region)
      );
    }
    
    return filteredMaterials;
  }

  /**
   * Calculate pricing for a material
   */
  private async calculatePricing(params: {
    materialId: string;
    machineId: string;
    geometry: any;
    features?: any;
    quantity: number;
  }): Promise<any> {
    const { materialId, machineId, geometry, features, quantity } = params;
    
    // Call pricing service
    const priceRequest = {
      process_type: 'milling',
      machine_id: machineId,
      material_id: materialId,
      quantity,
      volume_cc: geometry.volume_cc,
      surface_area_cm2: geometry.surface_area_cm2,
      removed_material_cc: geometry.removed_material_cc || geometry.volume_cc,
      features: features || { holes: 0, pockets: 0, slots: 0, faces: 6 },
      complexity_multiplier: 1.0,
    };
    
  const priceResponse = await this.pricingService.calculateCncPrice(priceRequest as any);
    
    return {
      unit_price: priceResponse.unit_price,
      material_cost: priceResponse.breakdown?.material_cost || 0,
      machining_cost: priceResponse.breakdown?.machine_cost || 0,
      total_cost: priceResponse.unit_price * quantity,
      lead_time_days: priceResponse.lead_time_days || 10,
    };
  }

  /**
   * Build comparison item
   */
  private buildComparisonItem(
    material: any,
    pricing: any,
    baseMaterial: any,
    basePricing: any,
    processType: string
  ): MaterialComparisonItem {
    // Calculate cost delta
    const costDeltaUsd = pricing.unit_price - basePricing.unit_price;
    const costDeltaPct = (costDeltaUsd / basePricing.unit_price) * 100;
    
    // Calculate weight (assume 100mm cube for simplicity)
    const volumeCm3 = 1000; // 10cm x 10cm x 10cm
    const weight_g = (material.density_kg_m3 / 1000) * volumeCm3;
    const baseWeight_g = (baseMaterial.density_kg_m3 / 1000) * volumeCm3;
    const weightDeltaPct = ((weight_g - baseWeight_g) / baseWeight_g) * 100;
    
    // Normalize scores (0-100)
    const machinabilityScore = material.machinability_index;
    const strengthScore = material.tensile_mpa ? Math.min((material.tensile_mpa / 1000) * 100, 100) : 50;
    
    // Check compatibility
    const processCompatible = (material.processes || []).includes(processType);
    const regionAvailable = true; // Simplified
    const finishCompatible = true; // Simplified
    
    const warnings: string[] = [];
    if (!processCompatible) warnings.push('Process may not be compatible');
    if (material.machinability_index < 50) warnings.push('Low machinability - longer cycle time');
    if (costDeltaPct > 50) warnings.push('Significantly more expensive');
    
    return {
      material: {
        id: material.id,
        code: material.code,
        name: material.name,
        category: material.category?.name || 'Unknown',
      },
      properties: {
        density_kg_m3: material.density_kg_m3,
        machinability_index: material.machinability_index,
        hardness_hb: material.hardness_hb,
        tensile_mpa: material.tensile_mpa,
      },
      pricing,
      comparison: {
        cost_delta_pct: costDeltaPct,
        cost_delta_usd: costDeltaUsd,
        weight_g,
        weight_delta_pct: weightDeltaPct,
        machinability_score: machinabilityScore,
        strength_score: strengthScore,
      },
      compatibility: {
        available: material.is_active,
        process_compatible: processCompatible,
        region_available: regionAvailable,
        finish_compatible: finishCompatible,
        warnings,
      },
      score: 0, // Calculated later
      is_best_value: false,
    };
  }

  /**
   * Calculate recommendation score (0-100)
   */
  private calculateScore(item: MaterialComparisonItem, baseline: MaterialComparisonItem): number {
    // Weighted scoring algorithm
    const weights = {
      cost: 0.4, // 40% weight on cost
      machinability: 0.3, // 30% weight on machinability
      strength: 0.2, // 20% weight on strength
      compatibility: 0.1, // 10% weight on compatibility
    };
    
    // Cost score (lower is better, normalize to 0-100)
    const costScore = Math.max(0, 100 - Math.abs(item.comparison.cost_delta_pct));
    
    // Machinability score (higher is better)
    const machinabilityScore = item.comparison.machinability_score;
    
    // Strength score (higher is better)
    const strengthScore = item.comparison.strength_score;
    
    // Compatibility score
    const compatibilityScore =
      (item.compatibility.process_compatible ? 25 : 0) +
      (item.compatibility.region_available ? 25 : 0) +
      (item.compatibility.finish_compatible ? 25 : 0) +
      (item.compatibility.warnings.length === 0 ? 25 : 0);
    
    // Calculate weighted score
    const totalScore =
      costScore * weights.cost +
      machinabilityScore * weights.machinability +
      strengthScore * weights.strength +
      compatibilityScore * weights.compatibility;
    
    return Math.round(totalScore);
  }
}
