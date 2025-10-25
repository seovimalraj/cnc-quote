import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  CATALOG_SNAPSHOT,
  MultiPartQuotePreviewRequest,
  MultiPartQuotePreviewResponse,
  MultiPartQuotePreviewLineItem,
  CostFactorsV1,
  PricingBreakdownDetailedV1,
  computePricingBreakdown,
  computeFinishCostPerPart,
  applyRiskMargin,
} from '@cnc-quote/shared';
import { AnalyticsService } from "../analytics/analytics.service";
// TODO: Legacy pricing-v1 services removed - need to migrate or remove these dependencies
// import { FeatureExtractionService } from "../../../legacy/pricing-v1/featureExtraction";
// import { ProcessSelectionService } from "../../../legacy/pricing-v1/processSelection";
// import { BOMService } from "../../../legacy/pricing-v1/bomService";

interface InternalMaterialIndex { [code: string]: any }
interface InternalFinishIndex { [code: string]: any }
interface InternalProcessIndex { [code: string]: any }
interface InternalMachineIndex { [processCode: string]: any[] }

@Injectable()
export class QuotePreviewService {
  private readonly logger = new Logger(QuotePreviewService.name);
  private materialIdx: InternalMaterialIndex = {};
  private finishIdx: InternalFinishIndex = {};
  private processIdx: InternalProcessIndex = {};
  private machineIdx: InternalMachineIndex = {};
  private readonly snapshotVersion = CATALOG_SNAPSHOT.version;
  // TODO: Legacy services commented out - need to migrate or replace
  // private readonly featureExtractor = new FeatureExtractionService();
  // private readonly processSelector = new ProcessSelectionService();
  // private readonly bomService = new BOMService();

  constructor(@Optional() private readonly analytics?: AnalyticsService) {
    this.buildIndexes();
  }

  private buildIndexes() {
    for (const m of CATALOG_SNAPSHOT.materials) this.materialIdx[m.code] = m;
    for (const f of CATALOG_SNAPSHOT.finishes) this.finishIdx[f.code] = f;
    for (const p of CATALOG_SNAPSHOT.processes) this.processIdx[p.code] = p;
    for (const mc of CATALOG_SNAPSHOT.machines) {
      if (!this.machineIdx[mc.process_code]) this.machineIdx[mc.process_code] = [];
      this.machineIdx[mc.process_code].push(mc);
    }
  }

  /** Public entry to compute multi-part preview */
  async preview(request: MultiPartQuotePreviewRequest): Promise<MultiPartQuotePreviewResponse> {
    const currency = request.currency || 'USD';
    const lines: MultiPartQuotePreviewLineItem[] = [];

    for (const part of request.parts) {
      const notes: string[] = [];
      const qty = part.quantity || 1;
      if (qty <= 0) {
        notes.push('Quantity adjusted to 1 (non-positive provided)');
      }
      const quantity = qty > 0 ? qty : 1;

      const process = this.processIdx[part.process_code];
      if (!process) {
        lines.push(this.emptyLine(part, quantity, notes.concat(`Unknown process_code ${part.process_code}`)));
        continue;
      }
      const material = this.materialIdx[part.material_code];
      if (!material) {
        lines.push(this.emptyLine(part, quantity, notes.concat(`Unknown material_code ${part.material_code}`)));
        continue;
      }
      const machine = this.selectMachine(part.process_code, part.volume_cc, part.surface_area_cm2);
      if (!machine) {
        lines.push(this.emptyLine(part, quantity, notes.concat('No machine capability found')));
        continue;
      }

      const finishes = (part.finish_codes || []).map(c => this.finishIdx[c]).filter(Boolean);
      const missingFinishes = (part.finish_codes || []).filter(c => !this.finishIdx[c]);
      if (missingFinishes.length) notes.push(`Missing finishes: ${missingFinishes.join(', ')}`);

      // Complexity score heuristic
      const complexity = this.computeComplexity(part);

      // Extract features for DFM analysis
      const geometry = {
        volume_mm3: (part.volume_cc || 100) * 1000, // Convert cc to mm3, default 100cc
        area_mm2: (part.surface_area_cm2 || 500) * 100, // Convert cm2 to mm2, default 500cm2
        bbox_mm: [100, 50, 20] as [number, number, number], // Default bounding box
      };
      // TODO: Legacy featureExtractor removed - using mock data
      const featureResult = { 
        features: [],
        summary: {
          total_features: 0,
          complexity_score: 50,
          dff_violations: []
        }
      };

      // Get process recommendation
      const processCriteria = {
        geometry: {
          volume_cc: part.volume_cc || 100,
          surface_area_cm2: part.surface_area_cm2 || 500,
          bbox_mm: [100, 50, 20] as [number, number, number],
          aspect_ratio: 100 / Math.min(50, 20) // Rough aspect ratio calculation
        },
        features: {
          has_holes: featureResult.features.some(f => f.type === 'hole'),
          has_threads: featureResult.features.some(f => f.type === 'thread'),
          has_pockets: featureResult.features.some(f => f.type === 'pocket'),
          has_bosses: featureResult.features.some(f => f.type === 'boss'),
          has_thin_walls: featureResult.features.some(f => f.type === 'thin_wall'),
          has_undercuts: featureResult.features.some(f => f.type === 'undercut'),
          total_features: featureResult.summary.total_features,
          complexity_score: featureResult.summary.complexity_score
        },
        requirements: {
          material_code: part.material_code,
          quantity,
          tolerance_um: 100, // Default tolerance, could be made configurable
          surface_finish: part.finish_codes?.[0] || null
        }
      };
      // TODO: Legacy processSelector removed - using mock data
      const processRecommendation = {
        recommended: {
          code: part.process_code,
          name: 'CNC Milling',
          confidence: 0.8,
          reasoning: ['Mock process recommendation'],
          limitations: []
        },
        alternatives: [],
        analysis: {
          primary_driver: 'complexity',
          cost_impact: 'moderate',
          lead_time_impact: 'standard',
          quality_notes: []
        }
      }; // await this.processSelector.selectProcess(processCriteria);

      // Generate BOM for this part
      const bomInput = {
        quote_id: 'preview', // Placeholder for preview
        parts: [{
          external_id: part.external_id,
          process_code: part.process_code,
          material_code: part.material_code,
          finish_codes: part.finish_codes,
          quantity: quantity,
          volume_cc: part.volume_cc || 100,
          surface_area_cm2: part.surface_area_cm2 || 500,
          features: {
            detected_features: featureResult.features.map(f => ({
              type: f.type,
              dimensions: f.dimensions ? Object.fromEntries(
                Object.entries(f.dimensions).filter(([_, v]) => v !== undefined)
              ) : undefined,
              machining_difficulty: f.machining_difficulty
            })),
            summary: {
              total_features: featureResult.summary.total_features,
              complexity_score: featureResult.summary.complexity_score
            }
          },
          pricing_breakdown: {
            material_cost: 0, // Will be calculated
            machine_cost: 0,
            finish_cost: 0,
            setup_cost: 0,
            qa_cost: 0
          }
        }]
      };
      // TODO: Legacy bomService removed - using mock data
      const bomData = {
        items: [],
        summary: {
          total_items: 0,
          total_cost: 0,
          categories: {},
          critical_path_lead_time: 0
        }
      }; // await this.bomService.generateBOM(bomInput);

      // Derive cost factor inputs using current heuristic components (Phase 1 translation layer)
      const finishCostAdders: Record<string, number> = {};
      finishes.forEach(f => {
        const total = computeFinishCostPerPart(f, { hourly_rate: machine.hourly_rate } as any, { partSurfaceAreaCm2: part.surface_area_cm2 });
        if (total > 0) finishCostAdders[f.code] = total;
      });

      const costFactors: CostFactorsV1 = {
        machine_rate_per_hour: machine.hourly_rate,
        setup_cost: ((machine.setup_time_min || 30) / 60) * machine.hourly_rate,
        material_price_per_kg: material.cost_per_kg,
        finish_cost_adders: Object.keys(finishCostAdders).length ? finishCostAdders : undefined,
        inspection_cost_per_part: 0.05 * machine.hourly_rate * 0.1, // placeholder minor QA charge
        overhead_percent: machine.overhead_pct,
        // Risk-aware margin: apply uplift of up to +8% absolute margin (i.e., 0.08) scaled by dfm_risk_score (0-1)
  base_margin_percent: applyRiskMargin(machine.margin_pct, part.dfm_risk_score),
        rush_multiplier: undefined,
        quantity_breaks: undefined,
      };

      // Map geometry metrics subset
      const metrics = {
        volume_cc: part.volume_cc,
        surface_area_cm2: part.surface_area_cm2,
        features: part.features,
        sheet: part.sheet,
      };

      // Compute breakdown using shared utility
      let breakdownDetailed: PricingBreakdownDetailedV1;
      try {
        breakdownDetailed = computePricingBreakdown({
          quantity,
          metrics,
          factors: costFactors,
          overrides: {
            machine_time_min: this.estimateMachineTimeMinutes(process.family, part, complexity),
          }
        });
      } catch (err) {
        this.logger.error(`Pricing compute failed: ${err}`);
        lines.push(this.emptyLine(part, quantity, notes.concat('Pricing computation error')));
        continue;
      }

      const unitPrice = breakdownDetailed.unit_price;
      const totalPrice = breakdownDetailed.total_price;

      // Lead time tiers and quantity matrix extracted helpers
      const perLineLeadTimeTiers = this.buildLeadTimeTiers(process, finishes);
      const { selectedTier, priceTiers, leadTimeDays } = this.decorateTiersWithPricing(perLineLeadTimeTiers, unitPrice, totalPrice);
      const quantity_matrix = this.buildQuantityMatrix(part, quantity, perLineLeadTimeTiers, costFactors, process.family, metrics, complexity);

      lines.push({
        part_external_id: part.external_id,
        process_code: part.process_code,
        material_code: part.material_code,
        finish_codes: part.finish_codes || [],
        quantity,
    unit_price: round(unitPrice),
    total_price: round(totalPrice),
  price_tiers: priceTiers,
    lead_time_days: leadTimeDays,
    lead_time_tier: selectedTier,
        complexity_score: round(complexity, 3),
        features: {
          detected_features: featureResult.features.map(f => ({
            type: String(f.type || 'unknown'),
            dimensions: (f.dimensions ? Object.fromEntries(
              Object.entries(f.dimensions).filter(([_, v]) => typeof v === 'number')
            ) : {}) as Record<string, number>,
            machining_difficulty: Number(f.machining_difficulty || 0),
            dff_issues: Array.isArray(f.dff_issues) ? f.dff_issues : [],
          })),
          summary: {
            total_features: featureResult.summary.total_features,
            complexity_score: featureResult.summary.complexity_score,
            dff_violations: featureResult.summary.dff_violations,
          },
        },
        breakdown: {
          material_cost: round(breakdownDetailed.material),
            machine_cost: round(breakdownDetailed.machining),
            finish_cost: round(breakdownDetailed.finish),
            setup_cost: round(breakdownDetailed.setup * quantity), // show total allocated setup
            qa_cost: round(breakdownDetailed.inspection),
            margin: round(breakdownDetailed.margin),
            overhead: round(breakdownDetailed.overhead)
          },
        notes,
        quantity_matrix: quantity_matrix.length > 0 ? quantity_matrix : undefined,
        process_recommendation: {
          recommended_process: {
            code: processRecommendation.recommended.code,
            name: processRecommendation.recommended.name,
            confidence: processRecommendation.recommended.confidence,
            reasoning: processRecommendation.recommended.reasoning,
            limitations: processRecommendation.recommended.limitations,
          },
          alternatives: processRecommendation.alternatives.slice(0, 3).map(alt => ({
            code: alt.code,
            name: alt.name,
            confidence: alt.confidence,
          })),
          analysis: processRecommendation.analysis,
        },
        bom: bomData
      });
    }

    const subtotal = lines.reduce((acc, l) => acc + l.total_price, 0);
    const avgLead = lines.length ? lines.reduce((a, l) => a + l.lead_time_days, 0) / lines.length : 0;
    const maxLead = lines.reduce((max, l) => Math.max(max, l.lead_time_days), 0);

    // Aggregate across fixed economy/standard/premium
    const aggregatePriceTiers = ['economy','standard','premium'].map(code => {
      const pts = lines.map(l => l.price_tiers?.find(pt=>pt.code===code)).filter(Boolean) as any[];
      let defaultMultiplier = 1;
      if (code === 'standard') defaultMultiplier = 1.8;
      else if (code === 'premium') defaultMultiplier = 3;
      if (!pts.length) return { code, label: code.charAt(0).toUpperCase()+code.slice(1), days: 0, price_multiplier: defaultMultiplier, subtotal: 0 };
      const subtotalTier = pts.reduce((a,p)=> a + p.total_price,0);
      const avgDays = Math.round(pts.reduce((a,p)=> a + p.days,0)/pts.length);
      const label = pts[0].label;
      return { code, label, days: avgDays, price_multiplier: pts[0].price_multiplier, subtotal: round(subtotalTier) };
    }).sort((a,b)=>a.days-b.days);

    await this.recordPreviewAnalytics(request, lines, subtotal, currency);

    return {
      currency,
      total_parts: lines.length,
      subtotal: round(subtotal),
      lines,
      aggregate: {
        avg_lead_time_days: round(avgLead, 2),
        max_lead_time_days: maxLead
      },
  lead_time_tiers: aggregatePriceTiers.map(t => ({ code: t.code, label: t.label, days: t.days, price_multiplier: t.price_multiplier })),
      price_tiers: aggregatePriceTiers,
      snapshot_version: this.snapshotVersion
    };
  }

  private emptyLine(part: any, quantity: number, notes: string[]): MultiPartQuotePreviewLineItem {
    return {
      part_external_id: part.external_id,
      process_code: part.process_code,
      material_code: part.material_code,
      finish_codes: part.finish_codes || [],
      quantity,
      unit_price: 0,
      total_price: 0,
      lead_time_days: 0,
      complexity_score: 0,
      features: {
        detected_features: [],
        summary: {
          total_features: 0,
          complexity_score: 0,
          dff_violations: [],
        },
      },
      breakdown: {
        material_cost: 0,
        machine_cost: 0,
        finish_cost: 0,
        setup_cost: 0,
        qa_cost: 0,
        margin: 0,
        overhead: 0
      },
      process_recommendation: {
        recommended_process: {
          code: 'CNC-MILL-3AX',
          name: '3-Axis CNC Milling',
          confidence: 0.5,
          reasoning: ['Default fallback process'],
          limitations: ['Unable to analyze part requirements']
        },
        alternatives: [],
        analysis: {
          primary_driver: 'Unable to analyze part',
          cost_impact: 'Unable to estimate',
          lead_time_impact: 'Unable to estimate',
          quality_notes: ['Analysis failed - please check part specifications']
        }
      },
      notes
    };
  }

  private selectMachine(processCode: string, volumeCc?: number, areaCm2?: number) {
    const machines = this.machineIdx[processCode];
    if (!machines || machines.length === 0) return null;
    // Simple heuristic: choose smallest envelope that still (likely) fits. Without dims we return first.
    return machines[0];
  }

  private estimateMaterialCost(material: any, part: any): number {
    if (!material) return 0;
    // If volume provided use density to get mass
    if (part.volume_cc && material.density_g_cm3) {
      const grams = part.volume_cc * material.density_g_cm3; // since 1 cc == 1 cm3
      const kg = grams / 1000;
      const scrapFactor = 1.15; // assume 15% scrap
      return kg * scrapFactor * material.cost_per_kg;
    }
    // Fallback nominal cost
    return 2.5; // minimal nominal placeholder
  }

  private estimateMachineTimeMinutes(family: string, part: any, complexity: number): number {
    switch (family) {
      case 'cnc': {
        const base = 12; // base minutes
        const materialRemovalFactor = part.removed_material_cc ? Math.min(part.removed_material_cc / 500, 40) : 5;
        return (base + materialRemovalFactor) * complexity;
      }
      case 'turning': {
        // Turning heuristic: cycle time driven by length, diameter, feature count (grooves, holes)
        const length_mm = part.bbox?.max?.z ? Math.abs(part.bbox.max.z - (part.bbox.min?.z || 0)) : 50;
        const diameter_mm = part.bbox?.max?.x ? Math.abs(part.bbox.max.x - (part.bbox.min?.x || 0)) : 30;
        const surfaceSpeedFactor = Math.min(1.8, Math.max(0.6, 80 / (diameter_mm || 1))); // smaller diameter faster
        const passes = Math.max(1, Math.ceil((diameter_mm / 10))); // rough passes
        const featurePenalty = (part.features?.holes || 0) * 0.6 + (part.features?.slots || 0) * 0.4;
        const baseMinutes = (length_mm / 25) * passes * surfaceSpeedFactor + featurePenalty + 6; // 6 min setup handling baseline
        return baseMinutes * complexity;
      }
      case 'sheet_metal': {
        const base = 5;
        const cutLength = part.sheet?.cut_length_mm || 0;
        const thickness = part.sheet?.thickness_mm || 2;
        const areaCm2 = part.sheet?.area_cm2 || (part.surface_area_cm2 ? part.surface_area_cm2 / 2 : 0); // sheet area (one side)
        const cutFactor = cutLength / 350; // faster assumption for laser
        const piercePenalty = (part.sheet?.pierces || 0) * 0.15; // each pierce adds time
        const bendFactor = (part.sheet?.bends || 0) * (0.5 + Math.min(1, thickness / 6));
        const thicknessFactor = Math.pow(thickness / 2, 0.35); // sublinear thickness time scaling
        const handling = Math.min(4, areaCm2 / 800); // large plates add handling time
        return (base + cutFactor + bendFactor + piercePenalty + thicknessFactor + handling) * complexity;
      }
      case 'injection_molding': {
        const cycles = part.molding?.cycle_time_s ? (part.molding.cycle_time_s * (part.quantity || 1)) / 60 : 25;
        return cycles * complexity;
      }
      default:
        return 10 * complexity;
    }
  }

  private computeComplexity(part: any): number {
    let score = 1;
    const features = part.features || {};
    score += (features.holes || 0) * 0.02;
    score += (features.pockets || 0) * 0.05;
    score += (features.slots || 0) * 0.04;
    if (features.faces && features.faces > 6) score += (features.faces - 6) * 0.03;
    if (part.sheet?.bends) score += part.sheet.bends * 0.05;
    if (part.molding?.cavity_count && part.molding.cavity_count > 1) score += (part.molding.cavity_count - 1) * 0.1;
    return Math.min(score, 3); // cap
  }

  private buildLeadTimeTiers(process: any, finishes: any[]) {
    const finishLeadAdd = finishes.reduce((max, f) => Math.max(max, f.lead_time_add_days || 0), 0);
    const productionLead = process.base_lead_time_days + finishLeadAdd;
    const shippingDays = 5;
    const economyDays = productionLead + shippingDays;
    const standardProduction = Math.max(1, Math.round(productionLead * 0.65));
    const premiumProduction = Math.max(1, Math.round(productionLead * 0.4));
    const standardDays = standardProduction + shippingDays;
    const premiumDays = premiumProduction + shippingDays;
    return [
      { code: 'economy', label: 'Economy', days: economyDays, price_multiplier: 1 },
      { code: 'standard', label: 'Standard', days: standardDays, price_multiplier: 1.8 },
      { code: 'premium', label: 'Premium', days: premiumDays, price_multiplier: 3 }
    ].sort((a,b)=>a.days-b.days);
  }

  private decorateTiersWithPricing(tiers: any[], unitPrice: number, totalPrice: number) {
    const priceTiers = tiers.map(t => ({
      code: t.code,
      label: t.label,
      unit_price: round(unitPrice * t.price_multiplier),
      total_price: round(totalPrice * t.price_multiplier),
      days: t.days,
      price_multiplier: t.price_multiplier
    }));
    const selectedTier = tiers[0];
    return { priceTiers, selectedTier, leadTimeDays: selectedTier.days };
  }

  private buildQuantityMatrix(part: any, quantity: number, tiers: any[], costFactors: CostFactorsV1, processFamily: string, metrics: any, complexity: number) {
    const requestedQuantities = part.quantities?.length ? part.quantities : [1,5,10,25];
    const matrixQuantities = Array.from(new Set([...requestedQuantities, quantity])).sort((a,b)=>a-b);
    const quantity_matrix: MultiPartQuotePreviewLineItem['quantity_matrix'] = [];
    for (const q of matrixQuantities) {
      try {
        const bd = computePricingBreakdown({
          quantity: q,
          metrics,
          factors: costFactors,
          overrides: { machine_time_min: this.estimateMachineTimeMinutes(processFamily, part, complexity) }
        });
        const baseUnit = bd.unit_price;
        const baseTotal = bd.total_price;
        const tiersForQ = tiers.map(t => ({
          code: t.code,
          label: t.label,
          unit_price: round(baseUnit * t.price_multiplier),
          total_price: round(baseTotal * t.price_multiplier),
          days: t.days,
          price_multiplier: t.price_multiplier
        }));
        quantity_matrix.push({
          quantity: q,
          unit_price: round(baseUnit),
          total_price: round(baseTotal),
          price_tiers: tiersForQ
        });
      } catch (e) {
        this.logger.warn(`Matrix pricing compute failed for q=${q}: ${e}`);
      }
    }
    return quantity_matrix.length > 0 ? quantity_matrix : undefined;
  }

  private async recordPreviewAnalytics(
    request: MultiPartQuotePreviewRequest,
    lines: MultiPartQuotePreviewLineItem[],
    subtotal: number,
    currency: string,
  ): Promise<void> {
    if (!this.analytics) return;
    try {
      const zeroPriced = lines.filter(line => line.total_price === 0).length;
      const noteCount = lines.reduce((acc, line) => acc + (line.notes?.length || 0), 0);
      const missingCatalogHits = lines.filter(line =>
        (line.notes || []).some(note => note.includes('Unknown') || note.includes('No machine capability')),
      ).length;
      const partExternalIds = request.parts
        .map(part => part.external_id)
        .filter(Boolean)
        .slice(0, 10);
      const maybeQuoteId = (request as any)?.quote_id as string | undefined;

      await this.analytics.trackQuoteEvent({
        event: 'quote_preview_generated',
        quoteId: maybeQuoteId,
        properties: {
          parts_count: lines.length,
          currency,
          subtotal: round(subtotal),
          zero_priced_parts: zeroPriced,
          note_count: noteCount,
          missing_catalog_hits: missingCatalogHits,
          part_external_ids: partExternalIds,
        },
      });
    } catch (error) {
      this.logger.debug(
        `Failed to record quote preview analytics: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

}

function round(n: number, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}
