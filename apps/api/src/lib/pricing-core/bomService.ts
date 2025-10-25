import { Injectable, Logger } from '@nestjs/common';

export interface BOMItem {
  id: string;
  category: 'material' | 'operation' | 'tooling' | 'quality' | 'packaging' | 'overhead';
  name: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  lead_time_days?: number;
  specifications?: Record<string, any>;
}

export interface BOMSummary {
  total_items: number;
  total_cost: number;
  categories: {
    material: { count: number; cost: number };
    operation: { count: number; cost: number };
    tooling: { count: number; cost: number };
    quality: { count: number; cost: number };
    packaging: { count: number; cost: number };
    overhead: { count: number; cost: number };
  };
  critical_path_lead_time: number;
  material_cost_breakdown: Array<{
    material_code: string;
    quantity_kg: number;
    cost: number;
    supplier: string;
  }>;
}

export interface BOMData {
  items: BOMItem[];
  summary: BOMSummary;
  metadata: {
    generated_at: string;
    version: string;
    quote_id: string;
  };
}

export interface BOMGenerationInput {
  quote_id: string;
  parts: Array<{
    external_id?: string;
    process_code: string;
    material_code: string;
    finish_codes?: string[];
    quantity: number;
    volume_cc: number;
    surface_area_cm2: number;
    features: {
      detected_features: Array<{
        type: string;
        dimensions?: Record<string, number>;
        machining_difficulty: number;
      }>;
      summary: {
        total_features: number;
        complexity_score: number;
      };
    };
    pricing_breakdown: {
      material_cost: number;
      machine_cost: number;
      finish_cost: number;
      setup_cost: number;
      qa_cost: number;
    };
  }>;
  shipping_info?: {
    destination: string;
    method: string;
  };
}

@Injectable()
export class BOMService {
  private readonly logger = new Logger(BOMService.name);

  /**
   * Generate complete Bill of Materials for a quote
   */
  async generateBOM(input: BOMGenerationInput): Promise<BOMData> {
    const items: BOMItem[] = [];

    // Generate BOM items for each part
    for (const part of input.parts) {
      const partItems = await this.generatePartBOM(part);
      items.push(...partItems);
    }

    // Add packaging and shipping items
    if (input.shipping_info) {
      const packagingItems = this.generatePackagingBOM(input.parts, input.shipping_info);
      items.push(...packagingItems);
    }

    // Add overhead items
    const overheadItems = this.generateOverheadBOM(items);
    items.push(...overheadItems);

    // Calculate summary
    const summary = this.calculateBOMSummary(items);

    return {
      items,
      summary,
      metadata: {
        generated_at: new Date().toISOString(),
        version: '1.0.0',
        quote_id: input.quote_id
      }
    };
  }

  private async generatePartBOM(part: BOMGenerationInput['parts'][0]): Promise<BOMItem[]> {
    const items: BOMItem[] = [];

    // Raw material
    const materialItem = await this.generateMaterialBOM(part);
    if (materialItem) items.push(materialItem);

    // Manufacturing operations
    const operationItems = this.generateOperationBOM(part);
    items.push(...operationItems);

    // Tooling requirements
    const toolingItems = this.generateToolingBOM(part);
    items.push(...toolingItems);

    // Quality control
    const qualityItems = this.generateQualityBOM(part);
    items.push(...qualityItems);

    return items;
  }

  private async generateMaterialBOM(part: BOMGenerationInput['parts'][0]): Promise<BOMItem | null> {
    // Calculate material volume with waste factor
    const volumeM3 = (part.volume_cc * part.quantity) / 1000000; // Convert cc to m³
    const wasteFactor = 1.1; // 10% waste
    const totalVolumeM3 = volumeM3 * wasteFactor;

    // Estimate density and cost (simplified - would use catalog data)
    const materialDensity = this.getMaterialDensity(part.material_code);
    const materialCostPerKg = this.getMaterialCostPerKg(part.material_code);

    const totalWeightKg = totalVolumeM3 * materialDensity * 1000; // Convert m³ to kg
    const totalCost = totalWeightKg * materialCostPerKg;

    return {
      id: `material-${part.external_id || 'unknown'}`,
      category: 'material',
      name: `${part.material_code} Raw Material`,
      description: `Raw material stock for ${part.quantity} parts with 10% waste factor`,
      quantity: totalWeightKg,
      unit_cost: materialCostPerKg,
      total_cost: totalCost,
      supplier: this.getMaterialSupplier(part.material_code),
      lead_time_days: 3, // Standard material lead time
      specifications: {
        material_code: part.material_code,
        volume_m3: totalVolumeM3,
        density_kg_m3: materialDensity,
        waste_factor: wasteFactor
      }
    };
  }

  private generateOperationBOM(part: BOMGenerationInput['parts'][0]): BOMItem[] {
    const items: BOMItem[] = [];

    // Primary machining operation
    const machiningTime = this.estimateMachiningTime(part);
    const machineRate = this.getMachineRate(part.process_code);

    items.push({
      id: `operation-${part.external_id || 'unknown'}-machining`,
      category: 'operation',
      name: `${part.process_code} Machining`,
      description: `Primary manufacturing operation for ${part.quantity} parts`,
      quantity: machiningTime * part.quantity, // Total hours
      unit_cost: machineRate,
      total_cost: machiningTime * part.quantity * machineRate,
      lead_time_days: Math.ceil((machiningTime * part.quantity) / 8), // Assuming 8-hour workdays
      specifications: {
        process_code: part.process_code,
        time_per_part_hours: machiningTime,
        total_parts: part.quantity,
        complexity_score: part.features.summary.complexity_score
      }
    });

    // Setup time (one-time)
    const setupTime = this.estimateSetupTime(part);
    items.push({
      id: `operation-${part.external_id || 'unknown'}-setup`,
      category: 'operation',
      name: 'Machine Setup',
      description: 'One-time setup and programming time',
      quantity: setupTime,
      unit_cost: machineRate,
      total_cost: setupTime * machineRate,
      specifications: {
        setup_type: 'initial_setup',
        complexity_factor: part.features.summary.complexity_score
      }
    });

    // Finishing operations
    if (part.finish_codes && part.finish_codes.length > 0) {
      for (const finish of part.finish_codes) {
        const finishTime = this.estimateFinishTime(finish, part.surface_area_cm2);
        const finishRate = this.getFinishRate(finish);

        items.push({
          id: `operation-${part.external_id || 'unknown'}-finish-${finish}`,
          category: 'operation',
          name: `${finish} Finishing`,
          description: `Surface finishing operation: ${finish}`,
          quantity: finishTime * part.quantity,
          unit_cost: finishRate,
          total_cost: finishTime * part.quantity * finishRate,
          lead_time_days: 1, // Finishing typically quick
          specifications: {
            finish_code: finish,
            surface_area_cm2: part.surface_area_cm2,
            time_per_part_hours: finishTime
          }
        });
      }
    }

    return items;
  }

  private generateToolingBOM(part: BOMGenerationInput['parts'][0]): BOMItem[] {
    const items: BOMItem[] = [];

    // Cutting tools based on features
    const toolCount = this.estimateToolCount(part.features);
    const toolCost = toolCount * 50; // $50 per tool average

    if (toolCount > 0) {
      items.push({
        id: `tooling-${part.external_id || 'unknown'}-cutting-tools`,
        category: 'tooling',
        name: 'Cutting Tools',
        description: `End mills, drills, and cutting tools for ${toolCount} operations`,
        quantity: toolCount,
        unit_cost: 50,
        total_cost: toolCost,
        supplier: 'Tooling Supplier Inc.',
        lead_time_days: 2,
        specifications: {
          tool_types: ['end_mills', 'drills', 'reamers'],
          feature_count: part.features.summary.total_features
        }
      });
    }

    // Workholding fixtures
    const fixtureCost = this.estimateFixtureCost(part);
    if (fixtureCost > 0) {
      items.push({
        id: `tooling-${part.external_id || 'unknown'}-fixtures`,
        category: 'tooling',
        name: 'Workholding Fixtures',
        description: 'Custom or standard fixtures for part holding',
        quantity: 1,
        unit_cost: fixtureCost,
        total_cost: fixtureCost,
        lead_time_days: 5,
        specifications: {
          fixture_type: 'custom_vise',
          complexity_score: part.features.summary.complexity_score
        }
      });
    }

    return items;
  }

  private generateQualityBOM(part: BOMGenerationInput['parts'][0]): BOMItem[] {
    const items: BOMItem[] = [];

    // Inspection time based on features and complexity
    const inspectionTime = this.estimateInspectionTime(part);
    const inspectionRate = 75; // $75/hour for QC technician

    items.push({
      id: `quality-${part.external_id || 'unknown'}-inspection`,
      category: 'quality',
      name: 'Quality Inspection',
      description: 'Dimensional and visual inspection of finished parts',
      quantity: inspectionTime * part.quantity,
      unit_cost: inspectionRate,
      total_cost: inspectionTime * part.quantity * inspectionRate,
      lead_time_days: 1,
      specifications: {
        inspection_type: 'dimensional_visual',
        feature_count: part.features.summary.total_features,
        time_per_part_hours: inspectionTime
      }
    });

    // Measurement tools
    const measurementCost = this.estimateMeasurementCost(part);
    if (measurementCost > 0) {
      items.push({
        id: `quality-${part.external_id || 'unknown'}-measurement`,
        category: 'quality',
        name: 'Measurement Tools',
        description: 'Calipers, micrometers, and other measurement instruments',
        quantity: 1,
        unit_cost: measurementCost,
        total_cost: measurementCost,
        supplier: 'Precision Tools Co.',
        specifications: {
          tool_types: ['caliper', 'micrometer', 'height_gauge']
        }
      });
    }

    return items;
  }

  private generatePackagingBOM(parts: BOMGenerationInput['parts'], shipping: any): BOMItem[] {
    const items: BOMItem[] = [];

    // Calculate total volume and weight for packaging
    const totalVolume = parts.reduce((sum, part) => sum + (part.volume_cc * part.quantity), 0);
    const totalWeight = parts.reduce((sum, part) => {
      const density = this.getMaterialDensity(part.material_code);
      return sum + (part.volume_cc * part.quantity * density / 1000000); // kg
    }, 0);

    // Packaging materials
    const boxCost = Math.ceil(totalVolume / 10000) * 5; // $5 per box
    items.push({
      id: 'packaging-boxes',
      category: 'packaging',
      name: 'Shipping Boxes',
      description: 'Cardboard boxes for part shipment',
      quantity: Math.ceil(totalVolume / 10000),
      unit_cost: 5,
      total_cost: boxCost,
      supplier: 'Packaging Supplies Ltd.',
      specifications: {
        box_type: 'standard_cardboard',
        total_volume_cc: totalVolume
      }
    });

    // Protective materials
    const protectiveCost = totalWeight * 2; // $2/kg for foam/peanuts
    items.push({
      id: 'packaging-protective',
      category: 'packaging',
      name: 'Protective Packaging',
      description: 'Foam, peanuts, and other protective materials',
      quantity: totalWeight,
      unit_cost: 2,
      total_cost: protectiveCost,
      supplier: 'Packaging Supplies Ltd.',
      specifications: {
        material_type: 'foam_and_peanuts',
        total_weight_kg: totalWeight
      }
    });

    return items;
  }

  private generateOverheadBOM(allItems: BOMItem[]): BOMItem[] {
    const items: BOMItem[] = [];

    // Calculate total direct costs
    const totalDirectCost = allItems.reduce((sum, item) => sum + item.total_cost, 0);

    // Facility overhead (typically 20-30% of direct costs)
    const facilityOverhead = totalDirectCost * 0.25;
    items.push({
      id: 'overhead-facility',
      category: 'overhead',
      name: 'Facility Overhead',
      description: 'Building rent, utilities, and maintenance',
      quantity: 1,
      unit_cost: facilityOverhead,
      total_cost: facilityOverhead,
      specifications: {
        overhead_rate: 0.25,
        base_cost: totalDirectCost
      }
    });

    // Administrative overhead
    const adminOverhead = totalDirectCost * 0.15;
    items.push({
      id: 'overhead-admin',
      category: 'overhead',
      name: 'Administrative Overhead',
      description: 'Management, accounting, and administrative costs',
      quantity: 1,
      unit_cost: adminOverhead,
      total_cost: adminOverhead,
      specifications: {
        overhead_rate: 0.15,
        base_cost: totalDirectCost
      }
    });

    return items;
  }

  private calculateBOMSummary(items: BOMItem[]): BOMSummary {
    const categories = {
      material: { count: 0, cost: 0 },
      operation: { count: 0, cost: 0 },
      tooling: { count: 0, cost: 0 },
      quality: { count: 0, cost: 0 },
      packaging: { count: 0, cost: 0 },
      overhead: { count: 0, cost: 0 }
    };

    let maxLeadTime = 0;
    const materialBreakdown: BOMSummary['material_cost_breakdown'] = [];

    for (const item of items) {
      categories[item.category].count++;
      categories[item.category].cost += item.total_cost;

      if (item.lead_time_days && item.lead_time_days > maxLeadTime) {
        maxLeadTime = item.lead_time_days;
      }

      // Collect material breakdown
      if (item.category === 'material' && item.specifications) {
        materialBreakdown.push({
          material_code: item.specifications.material_code,
          quantity_kg: item.quantity,
          cost: item.total_cost,
          supplier: item.supplier || 'Unknown'
        });
      }
    }

    return {
      total_items: items.length,
      total_cost: Object.values(categories).reduce((sum, cat) => sum + cat.cost, 0),
      categories,
      critical_path_lead_time: maxLeadTime,
      material_cost_breakdown: materialBreakdown
    };
  }

  // Helper methods for estimations
  private getMaterialDensity(materialCode: string): number {
    const densities: Record<string, number> = {
      'aluminum_6061': 2700,
      'steel_1018': 7850,
      'stainless_304': 8000,
      'titanium': 4500,
      'brass': 8500,
      'plastic_abs': 1050,
      'plastic_pc': 1200
    };
    return densities[materialCode.toLowerCase()] || 2700; // Default to aluminum
  }

  private getMaterialCostPerKg(materialCode: string): number {
    const costs: Record<string, number> = {
      'aluminum_6061': 3.50,
      'steel_1018': 1.20,
      'stainless_304': 4.00,
      'titanium': 25.00,
      'brass': 5.50,
      'plastic_abs': 2.00,
      'plastic_pc': 3.00
    };
    return costs[materialCode.toLowerCase()] || 3.50;
  }

  private getMaterialSupplier(materialCode: string): string {
    const suppliers: Record<string, string> = {
      'aluminum_6061': 'Aluminum Suppliers Inc.',
      'steel_1018': 'Steel Works Corp.',
      'stainless_304': 'Stainless Steel Co.',
      'titanium': 'Titanium Specialists',
      'brass': 'Metal Alloys Ltd.',
      'plastic_abs': 'Plastic Materials Inc.',
      'plastic_pc': 'Engineering Plastics Co.'
    };
    return suppliers[materialCode.toLowerCase()] || 'Material Supplier';
  }

  private estimateMachiningTime(part: BOMGenerationInput['parts'][0]): number {
    // Base time per part based on volume and complexity
    const baseTime = (part.volume_cc / 1000) * 0.5; // 0.5 hours per 1000cc
    const complexityMultiplier = 1 + (part.features.summary.complexity_score / 10);
    const featureMultiplier = 1 + (part.features.summary.total_features * 0.1);

    return baseTime * complexityMultiplier * featureMultiplier;
  }

  private estimateSetupTime(part: BOMGenerationInput['parts'][0]): number {
    // Setup time based on complexity
    const baseSetup = 2; // 2 hours base
    const complexityMultiplier = 1 + (part.features.summary.complexity_score / 5);
    return baseSetup * complexityMultiplier;
  }

  private getMachineRate(processCode: string): number {
    const rates: Record<string, number> = {
      'CNC-MILL-3AX': 75,
      'CNC-MILL-5AX': 125,
      'CNC-TURN': 65,
      'SHEET-METAL': 45
    };
    return rates[processCode] || 75;
  }

  private estimateFinishTime(finishCode: string, surfaceArea: number): number {
    const timePerCm2: Record<string, number> = {
      'anodize': 0.001,
      'powder_coat': 0.002,
      'paint': 0.0015,
      'polish': 0.005
    };
    return (timePerCm2[finishCode] || 0.001) * surfaceArea;
  }

  private getFinishRate(finishCode: string): number {
    const rates: Record<string, number> = {
      'anodize': 25,
      'powder_coat': 30,
      'paint': 20,
      'polish': 40
    };
    return rates[finishCode] || 25;
  }

  private estimateToolCount(features: any): number {
    let count = 0;
    for (const feature of features.detected_features) {
      switch (feature.type) {
        case 'hole': count += 2; break; // Drill + reamer
        case 'pocket': count += 1; break; // End mill
        case 'thread': count += 1; break; // Tap
        case 'boss': count += 1; break; // End mill
      }
    }
    return Math.max(count, 1); // At least 1 tool
  }

  private estimateFixtureCost(part: BOMGenerationInput['parts'][0]): number {
    // Fixture cost based on complexity
    const baseCost = 100;
    const complexityMultiplier = 1 + (part.features.summary.complexity_score / 5);
    return Math.round(baseCost * complexityMultiplier);
  }

  private estimateInspectionTime(part: BOMGenerationInput['parts'][0]): number {
    // Inspection time based on features
    const baseTime = 0.25; // 15 minutes per part
    const featureMultiplier = 1 + (part.features.summary.total_features * 0.1);
    return baseTime * featureMultiplier;
  }

  private estimateMeasurementCost(part: BOMGenerationInput['parts'][0]): number {
    // Cost of measurement tools needed
    const baseCost = 200;
    const featureMultiplier = 1 + (part.features.summary.total_features * 0.05);
    return Math.round(baseCost * featureMultiplier);
  }
}