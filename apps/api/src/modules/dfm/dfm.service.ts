import { Injectable, Logger } from "@nestjs/common";
import { Parser } from "expr-eval";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { CacheService } from "../../lib/cache/cache.service";
import {
  DfmRule,
  DfmValidationResponse,
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
  DfmValidationRequest,
  DfmBatchValidation,
  DfmBatchValidationResponse,
  DfmRuleEvaluationContext,
  DfmValidationIssue,
  DfmSelectionHint,
} from "@cnc-quote/shared";
import { GeometryService } from "../geometry/geometry.service";

// Severity enum values
const SEVERITY_BLOCK = 'block';
const SEVERITY_WARN = 'warn';

type FeatureSelectionKind = 'mesh' | 'hole' | 'pocket' | 'min_wall';

interface FeatureSelectionEntry {
  id: string;
  type: FeatureSelectionKind;
  triangle_indices: number[];
  tooltip?: string;
}

interface MeshSelectionContext {
  meshId: string;
  meshVersion: string;
  triangleCount: number;
  features: FeatureSelectionEntry[];
  defaultSelection: FeatureSelectionEntry;
}

const MAX_TRIANGLE_SAMPLES = 200;
const DEFAULT_TRIANGLE_BUDGET = 480;

// Convert a strongly typed params object to a loose record type for expr-eval
function toDfmParams<T>(params: T): Record<string, number> {
  return params as unknown as Record<string, number>;
}

@Injectable()
export class DfmService {
  private readonly logger = new Logger(DfmService.name);
  private readonly parser = new Parser();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
    private readonly geometryService: GeometryService,
  ) {}

  private sampleTriangleRange(start: number, end: number, total: number, maxSamples = MAX_TRIANGLE_SAMPLES): number[] {
    if (total <= 0) {
      return [0];
    }
    const clampedStart = Math.max(0, Math.min(start, total - 1));
    const clampedEnd = Math.max(clampedStart + 1, Math.min(end, total));
    const span = Math.max(1, clampedEnd - clampedStart);
    const step = Math.max(1, Math.floor(span / maxSamples));
    const result: number[] = [];
    for (let i = clampedStart; i < clampedEnd && result.length < maxSamples; i += step) {
      result.push(i);
    }
    if (result.length === 0) {
      result.push(clampedStart);
    }
    return result;
  }

  private buildFeatureSelections(geometryData: any, triangleBudget: number) {
    const holes = Array.isArray(geometryData?.holes) ? geometryData.holes : [];
    const pockets = Array.isArray(geometryData?.pockets) ? geometryData.pockets : [];
    const candidates: Array<{ id: string; type: FeatureSelectionKind; tooltip?: string }> = [];

    holes.forEach((hole: any, index: number) => {
      const id = typeof hole?.id === 'string' ? hole.id : `hole-${index + 1}`;
      candidates.push({ id, type: 'hole', tooltip: `Hole ${id}` });
    });

    pockets.forEach((pocket: any, index: number) => {
      const id = typeof pocket?.id === 'string' ? pocket.id : `pocket-${index + 1}`;
      candidates.push({ id, type: 'pocket', tooltip: `Pocket ${id}` });
    });

    if (geometryData?.min_wall?.global_min_mm) {
      candidates.push({ id: 'min-wall', type: 'min_wall', tooltip: `Min wall ${geometryData.min_wall.global_min_mm}mm` });
    }

    const featureCount = candidates.length;
    const minBudget = featureCount > 0 ? featureCount * 48 : DEFAULT_TRIANGLE_BUDGET;
    const totalTriangles = Math.max(triangleBudget || 0, minBudget);
    const chunk = Math.max(24, Math.floor(totalTriangles / Math.max(featureCount || 1, 1)));
    let cursor = 0;

    const features: FeatureSelectionEntry[] = candidates.map((candidate, index) => {
      const start = cursor;
      let end = start + chunk;
      if (index === candidates.length - 1) {
        end = totalTriangles;
      }
      if (end <= start) {
        end = start + chunk;
      }
      cursor = end;
      return {
        id: candidate.id,
        type: candidate.type,
        triangle_indices: this.sampleTriangleRange(start, end, totalTriangles),
        tooltip: candidate.tooltip,
      };
    });

    const defaultSelection: FeatureSelectionEntry = {
      id: 'mesh::all',
      type: 'mesh',
      triangle_indices: this.sampleTriangleRange(0, totalTriangles, totalTriangles),
      tooltip: 'Entire mesh',
    };

    return { features, defaultSelection };
  }

  private async prepareMeshSelectionContext(request: DfmValidationRequest): Promise<MeshSelectionContext | null> {
    const geometryData: any = request.geometry_data;
    if (!geometryData || typeof geometryData !== 'object') {
      return null;
    }
    const source = geometryData.source || {};
    const meshId = String(source.part_id ?? source.file_sha256 ?? request.quote_id ?? 'mesh');
    const lods: string[] = Array.isArray(source.mesh_available_lods) ? source.mesh_available_lods : ['low'];
    const lod = lods.includes('low') ? 'low' : lods[0];

    let metadata: any = null;
    if (source.part_id && request.organization_id) {
      try {
        metadata = await this.geometryService.fetchMeshMetadata(String(source.part_id), request.organization_id, lod as 'low' | 'med' | 'high');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Mesh metadata unavailable for part ${source.part_id}: ${message}`);
      }
    }

    const triangleCount = Number(metadata?.triangle_count ?? metadata?.triangles ?? 0) || 0;
    const approxTriangles = Number(source.approx_triangles ?? 0) || 0;
    const triangleBudget = triangleCount > 0 ? triangleCount : approxTriangles;
    const { features, defaultSelection } = this.buildFeatureSelections(geometryData, triangleBudget);
    const meshVersion = (metadata?.mesh_version as string | undefined)
      ?? (source.mesh_version_hint as string | undefined)
      ?? `${source.file_sha256 ?? meshId}:${lod}`;

    return {
      meshId,
      meshVersion,
      triangleCount: triangleCount || defaultSelection.triangle_indices.length,
      features,
      defaultSelection,
    };
  }

  private computeSelectionHint(
    context: MeshSelectionContext | null,
    rule: DfmRule,
    issue: { name: string; message: string },
  ): DfmSelectionHint | undefined {
    if (!context) {
      return undefined;
    }
    const text = `${issue.name ?? ''} ${issue.message ?? ''} ${rule?.name ?? ''} ${rule?.description ?? ''}`.toLowerCase();
    const findByType = (type: FeatureSelectionKind) => context.features.find((f) => f.type === type);

    let selection: FeatureSelectionEntry | undefined;
    if (text.includes('hole')) {
      selection = findByType('hole');
    }
    if (!selection && (text.includes('pocket') || text.includes('slot'))) {
      selection = findByType('pocket');
    }
    if (!selection && (text.includes('wall') || text.includes('thin'))) {
      selection = findByType('min_wall');
    }
    selection = selection ?? context.features[0] ?? context.defaultSelection;

    return {
      mesh_id: context.meshId,
      mesh_version: context.meshVersion,
      feature_id: selection.type === 'mesh' ? undefined : selection.id,
      triangle_indices: selection.triangle_indices,
      face_indices: [],
      tooltip: selection.tooltip,
    };
  }

  private async evaluateRuleForIssue(
    rule: DfmRule,
    context: DfmRuleEvaluationContext,
    request: DfmValidationRequest,
    resolveMeshContext: () => Promise<MeshSelectionContext | null>,
  ): Promise<DfmValidationIssue | null> {
    try {
      const ruleStartTime = Date.now();
      const expr = this.parser.parse(rule.condition);
      const evaluationContext = {
        ...toDfmParams(context.geometry),
        ...toDfmParams(context.material || {}),
        ...toDfmParams(context.process || {}),
        ...toDfmParams(context.design || {}),
      };
      const result = expr.evaluate(evaluationContext);

      if (result === true) {
        const evaluationTime = Date.now() - ruleStartTime;
        const issue: DfmValidationIssue = {
          rule_id: rule.id,
          name: rule.name,
          severity: rule.severity,
          message: rule.message,
          details: {
            evaluation_time_ms: evaluationTime,
            context,
          },
        };

        try {
          const meshContext = await resolveMeshContext();
          const selectionHint = this.computeSelectionHint(meshContext, rule, issue);
          if (selectionHint) {
            issue.selection_hint = selectionHint;
          }
        } catch (hintError) {
          const message = hintError instanceof Error ? hintError.message : String(hintError);
          this.logger.debug(`Unable to attach selection hint for rule ${rule.id}: ${message}`);
        }

        return issue;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error evaluating rule ${rule.id}: ${message}`);
    }
    return null;
  }

  private async getRules(processType: string): Promise<DfmRule[]> {
    const cacheKey = `dfm_rules:${processType}`;

    // Try to get from cache first
    const cached = await this.cache.get<DfmRule[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const { data: rules } = await this.supabase.client.from("dfm_rules").select("*").eq("process_type", processType);

    // Cache for 1 hour
    if (rules) {
      await this.cache.set(cacheKey, rules, 3600);
    }

    return rules || [];
  }

  async validateCnc(params: CncDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules("cnc");
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(toDfmParams(params));

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    return {
      valid: !issues.some((i) => i.severity === SEVERITY_BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateSheetMetal(params: SheetMetalDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules("sheet_metal");
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(toDfmParams(params));

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    return {
      valid: !issues.some((i) => i.severity === SEVERITY_BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateInjectionMolding(params: InjectionMoldingDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules("injection_molding");
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(toDfmParams(params));

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    return {
      valid: !issues.some((i) => i.severity === SEVERITY_BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateDesign(request: DfmValidationRequest): Promise<DfmValidationResponse> {
    const startTime = Date.now();
    const rules = await this.getRules(request.process_type);
    const issues = [];
    let manualReviewRequired = false;

    // Create evaluation context
    const context: DfmRuleEvaluationContext = {
      geometry: request.geometry_data,
      material: request.material_properties,
      process: request.design_parameters,
      design: request.design_parameters,
    };

    let meshContextPromise: Promise<MeshSelectionContext | null> | null = null;
    const resolveMeshContext = async () => {
      meshContextPromise ??= this.prepareMeshSelectionContext(request);
      return meshContextPromise;
    };

    for (const rule of rules) {
      if (request.skip_rules?.includes(rule.id)) {
        continue;
      }

      const issue = await this.evaluateRuleForIssue(rule, context, request, resolveMeshContext);
      if (issue) {
        issues.push(issue);
        if (rule.triggers_manual_review) {
          manualReviewRequired = true;
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const blockerCount = issues.filter(i => i.severity === SEVERITY_BLOCK).length;
    const warningCount = issues.filter(i => i.severity === SEVERITY_WARN).length;

    return {
      valid: blockerCount === 0,
      issues,
      manual_review_required: manualReviewRequired,
      summary: {
        total_issues: issues.length,
        blocker_count: blockerCount,
        warning_count: warningCount,
        info_count: 0, // Not implemented yet
      },
      processing_time_ms: processingTime,
    };
  }

  /**
   * Advanced DFM Analysis with manufacturability scoring and recommendations
   */
  async analyzeDesignAdvanced(request: DfmValidationRequest): Promise<DfmValidationResponse & {
    manufacturability_score: number;
    recommendations: Array<{
      type: 'process' | 'material' | 'design' | 'finish';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      impact: {
        cost_savings_percent?: number;
        lead_time_reduction_days?: number;
        quality_improvement?: string;
      };
      alternatives?: Array<{
        option: string;
        cost_impact: number;
        feasibility_score: number;
      }>;
    }>;
    cost_impact_analysis: {
      current_estimated_cost: number;
      optimized_cost: number;
      savings_potential_percent: number;
      cost_breakdown: {
        material_cost: number;
        machining_cost: number;
        finishing_cost: number;
        overhead_cost: number;
      };
    };
    process_recommendations: Array<{
      process: string;
      suitability_score: number;
      reasoning: string[];
      estimated_cost: number;
      estimated_lead_time_days: number;
    }>;
  }> {
    // Start with basic validation
    const basicValidation = await this.validateDesign(request);

    // Calculate manufacturability score (0-100, higher is better)
    const manufacturabilityScore = await this.calculateManufacturabilityScore(request, basicValidation);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(request, basicValidation);

    // Analyze cost impact
    const costImpactAnalysis = await this.analyzeCostImpact(request, basicValidation);

    // Get process recommendations
    const processRecommendations = await this.getProcessRecommendations(request);

    return {
      ...basicValidation,
      manufacturability_score: manufacturabilityScore,
      recommendations,
      cost_impact_analysis: costImpactAnalysis,
      process_recommendations: processRecommendations,
    };
  }

  private async calculateManufacturabilityScore(
    request: DfmValidationRequest,
    validation: DfmValidationResponse
  ): Promise<number> {
    let score = 100; // Start with perfect score

    score -= this.calculateIssueDeductions(validation);
    score += this.calculateGeometryBonus(request.geometry_data);
    score += this.calculateMaterialBonus(request.material_properties);

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, score));
  }

  private calculateIssueDeductions(validation: DfmValidationResponse): number {
    let deductions = 0;
    for (const issue of validation.issues) {
      switch (issue.severity) {
        case SEVERITY_BLOCK:
          deductions += 25; // Major deduction for blocking issues
          break;
        case SEVERITY_WARN:
          deductions += 10; // Moderate deduction for warnings
          break;
        default:
          deductions += 2; // Minor deduction for info issues
      }
    }
    return deductions;
  }

  private calculateGeometryBonus(geometry: any): number {
    if (!geometry) return 0;

    let bonus = 0;
    const aspectRatio = (geometry.aspect_ratio as number) || 1;
    const features = geometry.features as { holes?: number; pockets?: number } || {};
    const featureCount = (features.holes || 0) + (features.pockets || 0);
    const surfaceAreaRatio = ((geometry.surface_area_cm2 as number) || 0) / ((geometry.volume_cc as number) || 1);

    // Deduct for high aspect ratios
    if (aspectRatio > 5) bonus -= 5;
    if (aspectRatio > 10) bonus -= 10;

    // Deduct for many features
    if (featureCount > 10) bonus -= 5;
    if (featureCount > 20) bonus -= 10;

    // Deduct for complex surface area ratios
    if (surfaceAreaRatio > 10) bonus -= 5;

    return bonus;
  }

  private calculateMaterialBonus(material: any): number {
    if (!material) return 0;

    let bonus = 0;
    // Bonus for common/easy materials
    if (material.material_type === 'aluminum') bonus += 5;
    if (material.material_type === 'steel' && (material.hardness as number) < 200) bonus += 3;

    return bonus;
  }

  private async generateRecommendations(
    request: DfmValidationRequest,
    validation: DfmValidationResponse
  ): Promise<Array<{
    type: 'process' | 'material' | 'design' | 'finish';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: {
      cost_savings_percent?: number;
      lead_time_reduction_days?: number;
      quality_improvement?: string;
    };
    alternatives?: Array<{
      option: string;
      cost_impact: number;
      feasibility_score: number;
    }>;
  }>> {
    const recommendations = [];

    // Analyze blocking issues first
    const blockingIssues = validation.issues.filter(i => i.severity === SEVERITY_BLOCK);
    for (const issue of blockingIssues) {
      if (issue.message.includes('wall thickness')) {
        recommendations.push({
          type: 'design',
          priority: 'high',
          title: 'Increase Wall Thickness',
          description: 'Current wall thickness is below minimum manufacturable limit. Consider increasing to at least 1.5mm.',
          impact: {
            cost_savings_percent: 15,
            quality_improvement: 'Prevents part failure and improves structural integrity',
          },
          alternatives: [
            { option: 'Increase to 1.5mm', cost_impact: 5, feasibility_score: 95 },
            { option: 'Add ribbing structure', cost_impact: 25, feasibility_score: 85 },
            { option: 'Change material to allow thinner walls', cost_impact: -10, feasibility_score: 75 },
          ],
        });
      }

      if (issue.message.includes('tool reach')) {
        recommendations.push({
          type: 'design',
          priority: 'high',
          title: 'Reduce Feature Depth',
          description: 'Feature depth exceeds maximum tool reach. Consider reducing depth or splitting into multiple operations.',
          impact: {
            cost_savings_percent: 30,
            lead_time_reduction_days: 2,
          },
          alternatives: [
            { option: 'Reduce depth by 20%', cost_impact: 10, feasibility_score: 90 },
            { option: 'Split into two operations', cost_impact: 40, feasibility_score: 80 },
            { option: 'Use specialized tooling', cost_impact: 60, feasibility_score: 70 },
          ],
        });
      }
    }

    // Add general recommendations based on geometry
    const geometry = request.geometry_data;
    if (geometry?.aspect_ratio && (geometry.aspect_ratio as number) > 8) {
      recommendations.push({
        type: 'design',
        priority: 'medium',
        title: 'Optimize Aspect Ratio',
        description: 'High aspect ratio may cause vibration and reduced accuracy. Consider redesigning for better stability.',
        impact: {
          quality_improvement: 'Improved machining accuracy and surface finish',
          cost_savings_percent: 8,
        },
      });
    }

    // Material recommendations
    if (request.material_properties?.material_type === 'titanium') {
      recommendations.push({
        type: 'material',
        priority: 'medium',
        title: 'Consider Alternative Materials',
        description: 'Titanium is expensive and difficult to machine. Consider aluminum or steel alternatives for cost reduction.',
        impact: {
          cost_savings_percent: 60,
        },
        alternatives: [
          { option: 'Aluminum 6061', cost_impact: -70, feasibility_score: 90 },
          { option: 'Steel 1018', cost_impact: -80, feasibility_score: 85 },
          { option: 'Stainless Steel 304', cost_impact: -50, feasibility_score: 95 },
        ],
      });
    }

    return recommendations;
  }

  private async analyzeCostImpact(
    request: DfmValidationRequest,
    validation: DfmValidationResponse
  ): Promise<{
    current_estimated_cost: number;
    optimized_cost: number;
    savings_potential_percent: number;
    cost_breakdown: {
      material_cost: number;
      machining_cost: number;
      finishing_cost: number;
      overhead_cost: number;
    };
  }> {
    // Simplified cost estimation - in real implementation, this would use pricing engine
    const geometry = request.geometry_data;
    const material = request.material_properties;

    // Base calculations
    const volume = (geometry?.volume_cc as number) || 100;
    const surfaceArea = (geometry?.surface_area_cm2 as number) || 500;
    const features = geometry?.features as { holes?: number; pockets?: number } || {};
    const featureCount = (features.holes || 0) + (features.pockets || 0);

    // Material cost (simplified)
    let materialCostPerCc = 0.003; // default
    if (material?.material_type === 'aluminum') {
      materialCostPerCc = 0.002;
    } else if (material?.material_type === 'steel') {
      materialCostPerCc = 0.001;
    }
    const materialCost = volume * materialCostPerCc;

    // Machining cost based on complexity
    const baseMachiningRate = 50; // $/hour
    const aspectRatio = (geometry?.aspect_ratio as number) || 1;
    const complexityMultiplier = 1 + (featureCount * 0.1) + (aspectRatio * 0.05);
    const machiningHours = (surfaceArea / 100) * complexityMultiplier; // Rough estimate
    const machiningCost = machiningHours * baseMachiningRate;

    // Finishing cost
    const finishingCost = surfaceArea * 0.01; // $0.01 per cm²

    // Overhead
    const overheadCost = (materialCost + machiningCost + finishingCost) * 0.2;

    const currentCost = materialCost + machiningCost + finishingCost + overheadCost;

    // Calculate optimized cost (reduce complexity penalties)
    const optimizedComplexityMultiplier = Math.max(1, complexityMultiplier * 0.7);
    const optimizedMachiningHours = (surfaceArea / 100) * optimizedComplexityMultiplier;
    const optimizedMachiningCost = optimizedMachiningHours * baseMachiningRate;
    const optimizedCost = materialCost + optimizedMachiningCost + finishingCost + overheadCost;

    const savingsPercent = ((currentCost - optimizedCost) / currentCost) * 100;

    return {
      current_estimated_cost: Math.round(currentCost * 100) / 100,
      optimized_cost: Math.round(optimizedCost * 100) / 100,
      savings_potential_percent: Math.round(savingsPercent * 100) / 100,
      cost_breakdown: {
        material_cost: Math.round(materialCost * 100) / 100,
        machining_cost: Math.round(machiningCost * 100) / 100,
        finishing_cost: Math.round(finishingCost * 100) / 100,
        overhead_cost: Math.round(overheadCost * 100) / 100,
      },
    };
  }

  private async getProcessRecommendations(request: DfmValidationRequest): Promise<Array<{
    process: string;
    suitability_score: number;
    reasoning: string[];
    estimated_cost: number;
    estimated_lead_time_days: number;
  }>> {
    const recommendations = [];
    const geometry = request.geometry_data;
    const material = request.material_properties;

    // Add recommendations for different processes
    if (geometry && material) {
      recommendations.push(this.getCncMillingRecommendation(geometry, material));
    }

    if (geometry?.max_depth && (geometry.max_depth as number) < 5) {
      recommendations.push(this.getSheetMetalRecommendation(geometry, material));
    }

    if (geometry?.volume_cc && (geometry.volume_cc as number) < 500) {
      recommendations.push(this.getInjectionMoldingRecommendation(geometry, material));
    }

    // Sort by suitability score
    return recommendations.sort((a, b) => b.suitability_score - a.suitability_score);
  }

  private getCncMillingRecommendation(geometry: any, material: any) {
    const volumeCc = geometry.volume_cc as number;
    const cncScore = this.calculateProcessSuitability('cnc_milling', geometry, material);
    return {
      process: 'CNC Milling',
      suitability_score: cncScore,
      reasoning: [
        'Good for complex 3D geometries',
        'High precision and surface finish',
        'Suitable for most materials',
        volumeCc && volumeCc > 1000 ? 'May be expensive for large parts' : 'Cost-effective for medium parts',
      ],
      estimated_cost: volumeCc ? volumeCc * 0.05 : 50,
      estimated_lead_time_days: volumeCc ? Math.max(3, volumeCc / 200) : 5,
    };
  }

  private getSheetMetalRecommendation(geometry: any, material: any) {
    const surfaceAreaCm2 = geometry.surface_area_cm2 as number;
    const sheetMetalScore = this.calculateProcessSuitability('sheet_metal', geometry, material);
    return {
      process: 'Sheet Metal Fabrication',
      suitability_score: sheetMetalScore,
      reasoning: [
        'Cost-effective for thin-walled parts',
        'Fast production for simple geometries',
        'Good for high-volume production',
        'Limited to 2.5D geometries',
      ],
      estimated_cost: surfaceAreaCm2 ? surfaceAreaCm2 * 0.02 : 30,
      estimated_lead_time_days: 2,
    };
  }

  private getInjectionMoldingRecommendation(geometry: any, material: any) {
    const volumeCc = geometry.volume_cc as number;
    const injectionScore = this.calculateProcessSuitability('injection_molding', geometry, material);
    return {
      process: 'Injection Molding',
      suitability_score: injectionScore,
      reasoning: [
        'Most cost-effective for high volumes (>1000 pcs)',
        'Excellent surface finish',
        'Complex geometries possible',
        'High upfront tooling cost',
      ],
      estimated_cost: volumeCc ? volumeCc * 0.01 + 5000 : 100, // Tooling cost included
      estimated_lead_time_days: 14, // Includes tooling time
    };
  }

  private calculateProcessSuitability(
    process: string,
    geometry: any,
    material: any
  ): number {
    switch (process) {
      case 'cnc_milling':
        return this.calculateCncMillingSuitability(geometry, material);
      case 'sheet_metal':
        return this.calculateSheetMetalSuitability(geometry, material);
      case 'injection_molding':
        return this.calculateInjectionMoldingSuitability(geometry, material);
      default:
        return 50; // Base score
    }
  }

  private calculateCncMillingSuitability(geometry: any, material: any): number {
    let score = 50; // Base score

    const volumeCc = geometry?.volume_cc as number;
    const features = geometry?.features as { holes?: number } || {};

    if (volumeCc && volumeCc < 10000) score += 20;
    if (features.holes && features.holes < 20) score += 15;
    if (material?.material_type === 'aluminum') score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private calculateSheetMetalSuitability(geometry: any, material: any): number {
    let score = 50; // Base score

    const maxDepth = geometry?.max_depth as number;
    const surfaceAreaCm2 = geometry?.surface_area_cm2 as number;
    const volumeCc = geometry?.volume_cc as number;

    if (maxDepth && maxDepth < 3) score += 25;
    if (surfaceAreaCm2 && volumeCc && surfaceAreaCm2 > volumeCc) score += 15;
    if (material?.material_type === 'steel') score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private calculateInjectionMoldingSuitability(geometry: any, material: any): number {
    let score = 50; // Base score

    const volumeCc = geometry?.volume_cc as number;
    const features = geometry?.features as { undercuts?: number } || {};

    if (volumeCc && volumeCc < 100) score += 20;
    if (features.undercuts === 0) score += 15;
    if (material?.material_type === 'plastic') score += 10;

    return Math.min(100, Math.max(0, score));
  }

  async validateBatch(batchRequest: DfmBatchValidation): Promise<DfmBatchValidationResponse> {
    const startTime = Date.now();

    const results = batchRequest.parallel_processing
      ? await this.processBatchParallel(batchRequest)
      : await this.processBatchSequential(batchRequest);

    const summary = this.calculateBatchSummary(results);

    const processingTime = Date.now() - startTime;

    return {
      results,
      summary: {
        ...summary,
        total_requests: batchRequest.requests.length,
      },
      processing_time_ms: processingTime,
    };
  }

  private async processBatchParallel(batchRequest: DfmBatchValidation): Promise<DfmValidationResponse[]> {
    const promises = batchRequest.requests.map(request =>
      this.validateDesign(request).catch(error => {
        this.logger.error(`Batch validation error for quote ${request.quote_id}: ${error.message}`);
        return this.createErrorResponse(error.message);
      })
    );

    if (batchRequest.fail_fast) {
      try {
        return await Promise.all(promises);
      } catch (error) {
        this.logger.error(`Batch validation failed: ${error.message}`);
        throw error;
      }
    } else {
      const settledResults = await Promise.allSettled(promises);
      return settledResults.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : this.createErrorResponse(result.reason.message)
      );
    }
  }

  private async processBatchSequential(batchRequest: DfmBatchValidation): Promise<DfmValidationResponse[]> {
    const results: DfmValidationResponse[] = [];

    for (const request of batchRequest.requests) {
      try {
        const result = await this.validateDesign(request);
        results.push(result);

        if (!result.valid && batchRequest.fail_fast) {
          break;
        }
      } catch (error) {
        this.logger.error(`Sequential validation error for quote ${request.quote_id}: ${error.message}`);
        results.push(this.createErrorResponse(error.message));

        if (batchRequest.fail_fast) {
          break;
        }
      }
    }

    return results;
  }

  private createErrorResponse(errorMessage: string): DfmValidationResponse {
    return {
      valid: false,
      issues: [{
        rule_id: 'system-error',
        name: 'Validation Error',
        severity: SEVERITY_BLOCK,
        message: `Failed to validate design: ${errorMessage}`,
      }],
      manual_review_required: true,
    };
  }

  private calculateBatchSummary(results: DfmValidationResponse[]) {
    const successfulValidations = results.filter(r => r.valid).length;
    const failedValidations = results.length - successfulValidations;

    let totalIssues = 0;
    let manualReviewsRequired = 0;

    for (const result of results) {
      totalIssues += result.issues?.length || 0;
      if (result.manual_review_required) {
        manualReviewsRequired++;
      }
    }

    return {
      successful_validations: successfulValidations,
      failed_validations: failedValidations,
      total_issues: totalIssues,
      manual_reviews_required: manualReviewsRequired,
    };
  }

  async getDfmRules(
    orgId: string,
    filters?: {
      processType?: string;
      severity?: 'warn' | 'block';
      activeOnly?: boolean;
    }
  ): Promise<DfmRule[]> {
    let query = this.supabase.client
      .from('dfm_rules')
      .select('*')
      .eq('organization_id', orgId);

    if (filters?.processType) {
      query = query.eq('process_type', filters.processType);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.activeOnly) {
      // Assuming there's an 'active' field, or we can filter by created_at/updated_at
      query = query.not('updated_at', 'is', null);
    }

    const { data: rules, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching DFM rules: ${error.message}`);
      throw error;
    }

    return rules || [];
  }

  async createDfmRule(
    orgId: string,
    ruleData: Omit<DfmRule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<DfmRule> {
    const newRule = {
      ...ruleData,
      organization_id: orgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: rule, error } = await this.supabase.client
      .from('dfm_rules')
      .insert(newRule)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating DFM rule: ${error.message}`);
      throw error;
    }

    // Invalidate cache
    const cacheKey = `dfm_rules:${ruleData.process_type}`;
    await this.cache.del(cacheKey);

    return rule;
  }

  async createDfmRequest(
    orgId: string,
    userId: string,
    request: {
      fileId: string;
      materialId: string;
      tolerancePack: string;
      surfaceFinish: string;
      industry: string;
      certifications: string[];
      criticality: string;
      notes?: string;
    }
  ) {
    // Verify file exists and belongs to organization
    const { data: fileData, error: fileError } = await this.supabase.client
      .from('dfm_files')
      .select('*')
      .eq('id', request.fileId)
      .eq('organization_id', orgId)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found or access denied');
    }

    const { data: material, error: materialError } = await this.supabase.client
      .from('dfm_material_options')
      .select('id, code, name, published')
      .eq('id', request.materialId)
      .single();

    if (materialError || !material) {
      throw new Error('Material option not found');
    }

    if (!material.published) {
      throw new Error('Material option is not published');
    }

    // Create DFM request
    const { data: dfmRequest, error: requestError } = await this.supabase.client
      .from('dfm_requests')
      .insert({
        file_id: request.fileId,
        file_name: fileData.file_name,
        organization_id: orgId,
        user_id: userId,
        material_id: material.id,
        material_code: material.code,
        material_name: material.name,
        tolerance_pack: request.tolerancePack,
        surface_finish: request.surfaceFinish,
        industry: request.industry,
        certifications: request.certifications,
        criticality: request.criticality,
        notes: request.notes,
        status: 'Queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      this.logger.error(`Failed to create DFM request: ${requestError.message}`);
      throw new Error('Failed to create DFM request');
    }

    // Enqueue the analysis job
    try {
      await this.enqueueDfmAnalysis({
        requestId: dfmRequest.id,
        fileId: request.fileId,
        downloadUrl: '', // Will be populated by the job processor
      });
    } catch (enqueueError) {
      this.logger.error(`Failed to enqueue DFM analysis: ${enqueueError.message}`);
      // Update status to error
      await this.supabase.client
        .from('dfm_requests')
        .update({ status: 'Error', updated_at: new Date().toISOString() })
        .eq('id', dfmRequest.id);
      throw new Error('Failed to enqueue analysis job');
    }

    return {
      id: dfmRequest.id,
      status: dfmRequest.status,
      materialCode: dfmRequest.material_code,
      message: 'DFM analysis request created and queued successfully'
    };
  }

  async enqueueDfmAnalysis(jobData: {
    requestId: string;
    fileId: string;
    downloadUrl: string;
  }) {
    // Import the queue service
    // This would need to be injected properly, but for now we'll use a simple approach
    // In a real implementation, you'd inject the queue in the constructor

    // For now, we'll simulate the queue operation
    this.logger.log(`Enqueuing DFM analysis job for request ${jobData.requestId}`);

    // Update request status to Analyzing
    await this.supabase.client
      .from('dfm_requests')
      .update({
        status: 'Analyzing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobData.requestId);

    return {
      task_id: `dfm_${jobData.requestId}_${Date.now()}`,
      status: 'enqueued',
      message: 'DFM analysis job enqueued successfully'
    };
  }

  async getDfmRequestStatus(requestId: string, orgId: string) {
    const { data: request, error } = await this.supabase.client
      .from('dfm_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .single();

    if (error || !request) {
      throw new Error('DFM request not found or access denied');
    }

    // Calculate progress based on status
    let progress = 0;
    switch (request.status) {
      case 'Queued':
        progress = 10;
        break;
      case 'Analyzing':
        progress = 50;
        break;
      case 'Complete':
        progress = 100;
        break;
      case 'Error':
        break;
    }

    return {
      id: request.id,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      progress
    };
  }

  async getDfmResult(requestId: string, orgId: string) {
    // First verify the request exists and belongs to the organization
    const { data: request, error: requestError } = await this.supabase.client
      .from('dfm_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .single();

    if (requestError || !request) {
      throw new Error('DFM request not found or access denied');
    }

    if (request.status !== 'Complete') {
      throw new Error('DFM analysis is not yet complete');
    }

    // Get the result
    const { data: result, error: resultError } = await this.supabase.client
      .from('dfm_results')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (resultError || !result) {
      throw new Error('DFM result not found');
    }

    return result;
  }

  async getDfmResultWithSession(requestId: string, userId: string) {
    // First verify the request exists and belongs to the user
    const { data: request, error: requestError } = await this.supabase.client
      .from('dfm_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();

    if (requestError || !request) {
      throw new Error('DFM request not found or access denied');
    }

    if (request.status !== 'Complete') {
      throw new Error('DFM analysis is not yet complete');
    }

    // Get the result
    const { data: result, error: resultError } = await this.supabase.client
      .from('dfm_results')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (resultError || !result) {
      throw new Error('DFM result not found');
    }

    return result;
  }

  // ===== PUBLIC DFM OPTIONS METHODS =====

  async getPublishedOptions(optionType: string): Promise<any[]> {
    const tableName = this.getTableName(optionType);

    const columns = this.getOptionColumns(optionType);

    const { data, error } = await this.supabase.client
      .from(tableName)
      .select(columns)
      .eq('published', true)
      .order('name');

    if (error) {
      this.logger.error(`Error fetching published ${optionType} options:`, error);
      throw new Error(`Failed to fetch published ${optionType} options`);
    }

    return data || [];
  }

  private getTableName(optionType: string): string {
    const tableMap = {
      tolerances: 'dfm_tolerance_options',
      finishes: 'dfm_finish_options',
      industries: 'dfm_industry_options',
      certifications: 'dfm_certification_options',
      criticality: 'dfm_criticality_options',
      materials: 'dfm_material_options',
    };

    const tableName = tableMap[optionType];
    if (!tableName) {
      throw new Error(`Invalid option type: ${optionType}`);
    }

    return tableName;
  }

  private getOptionColumns(optionType: string): string {
    if (optionType === 'criticality') {
      return 'id, name, description, value';
    }

    if (optionType === 'materials') {
      return 'id, code, name, description, category, is_metal, density_g_cm3, elastic_modulus_gpa, hardness_hv, max_operating_temp_c, machinability_rating, notes';
    }

    return 'id, name, description';
  }

  // === New methods for unified contracts integration ===

  /**
   * Analyze quote item for DFM and store result in unified format
   */
  async analyzeQuoteItem(quoteItemId: string, geometryData?: any): Promise<any> {
    this.logger.log(`Analyzing DFM for quote item ${quoteItemId}`);

    // Get quote item config
    const { data: quoteItem, error } = await this.supabase.client
      .from('quote_items')
      .select('part_config')
      .eq('id', quoteItemId)
      .single();

    if (error) {
      this.logger.error(`Failed to get quote item ${quoteItemId}: ${error.message}`);
      throw error;
    }

    const partConfig = quoteItem?.part_config;
    if (!partConfig?.process_type) {
      throw new Error('Quote item missing part configuration');
    }

    // Build DFM validation request from part config
    const dfmRequest = this.buildDfmRequest(partConfig, geometryData);
    
    // Perform DFM validation
    const dfmResponse = await this.validateDesign(dfmRequest);

    // Convert to unified DfmResultV1 format
    const unifiedResult = this.convertToUnifiedFormat(dfmResponse, geometryData);

    // Store result in quote_items.dfm_result
    await this.storeDfmResultInQuoteItem(quoteItemId, unifiedResult);

    return unifiedResult;
  }

  /**
   * Get DFM result for quote item in unified format
   */
  async getQuoteItemDfmResult(quoteItemId: string): Promise<any> {
    const { data, error } = await this.supabase.client
      .from('quote_items')
      .select('dfm_result')
      .eq('id', quoteItemId)
      .single();

    if (error) {
      this.logger.error(`Failed to get DFM result for quote item ${quoteItemId}: ${error.message}`);
      throw error;
    }

    return data?.dfm_result || null;
  }

  /**
   * Update DFM issue status (dismissed, fixed, etc.)
   */
  async updateDfmIssueStatus(
    quoteItemId: string, 
    issueId: string, 
    status: 'dismissed' | 'fixed' | 'acknowledged'
  ): Promise<any> {
    const currentResult = await this.getQuoteItemDfmResult(quoteItemId);
    if (!currentResult) {
      throw new Error('No DFM result found for quote item');
    }

    // Update the specific issue status
    if (currentResult.issues) {
      currentResult.issues = currentResult.issues.map((issue: any) => {
        if (issue.id === issueId) {
          return { ...issue, status, updated_at: new Date().toISOString() };
        }
        return issue;
      });
    }

    // Recalculate overall score
    const { score, rating } = this.calculateUnifiedScore(currentResult.issues || []);
    currentResult.overall_score = score;
    currentResult.manufacturability = rating;

    // Store updated result
    await this.storeDfmResultInQuoteItem(quoteItemId, currentResult);

    return currentResult;
  }

  /**
   * Build DFM validation request from part config
   */
  private buildDfmRequest(partConfig: any, geometryData?: any): DfmValidationRequest {
    const materialProperties: Record<string, any> = {};

    if (partConfig.material_id) materialProperties.material_id = partConfig.material_id;
    if (partConfig.material_code) materialProperties.code = partConfig.material_code;
    if (partConfig.material_name) materialProperties.name = partConfig.material_name;
    if (partConfig.material_density) materialProperties.density_g_cm3 = partConfig.material_density;
    if (partConfig.material_category) materialProperties.category = partConfig.material_category;
    if (partConfig.material_notes) materialProperties.notes = partConfig.material_notes;

    if (!Object.keys(materialProperties).length) {
      materialProperties.material = partConfig.material;
    }

    materialProperties.finish = partConfig.finish || partConfig.surface_finish;

    const baseRequest: DfmValidationRequest = {
      quote_id: 'temp_quote_id',
      organization_id: 'temp_org_id', 
      process_type: partConfig.process_type === 'cnc_machining' ? 'cnc' : partConfig.process_type,
      geometry_data: geometryData || {},
      material_properties: materialProperties,
      design_parameters: {
        quantity: partConfig.quantity || 1,
        tolerance: partConfig.tolerance || '+/-0.1mm',
        surface_finish: partConfig.surface_finish || 'standard',
        ...(partConfig.cnc_params || {})
      }
    };

    return baseRequest;
  }

  /**
   * Convert legacy DFM response to unified format
   */
  private convertToUnifiedFormat(dfmResponse: DfmValidationResponse, geometryData?: any): any {
    const issues = dfmResponse.issues?.map((issue: any, index: number) => ({
      id: `dfm_${Date.now()}_${index}`,
      type: this.mapSeverityToType(issue.severity),
      category: issue.category || 'general',
      severity: issue.severity,
      message: issue.message,
      suggested_fix: issue.fix || issue.suggestion,
      location: issue.location || { feature: 'Unknown' },
      cost_impact: this.estimateCostImpact(issue.severity)
    })) || [];

    const { score, rating } = this.calculateUnifiedScore(issues);

    return {
      overall_score: score,
      manufacturability: rating,
      issues,
      time_estimate: {
        setup_hours: geometryData?.estimated_setup_hours || 0.5,
        machining_hours: geometryData?.estimated_machining_hours || 1.0,
        total_hours: (geometryData?.estimated_setup_hours || 0.5) + (geometryData?.estimated_machining_hours || 1.0)
      },
      material_usage: {
        waste_percentage: geometryData?.waste_percentage || 10,
        optimization_suggestions: dfmResponse.issues?.map(i => i.suggestion).filter(Boolean) || []
      }
    };
  }

  /**
   * Store DFM result in quote item
   */
  private async storeDfmResultInQuoteItem(quoteItemId: string, dfmResult: any) {
    const { error } = await this.supabase.client
      .from('quote_items')
      .update({
        dfm_result: dfmResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteItemId);

    if (error) {
      this.logger.error(`Failed to store DFM result for quote item ${quoteItemId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate unified manufacturability score
   */
  private calculateUnifiedScore(issues: any[]): { score: number; rating: string } {
    const activeIssues = issues.filter((issue: any) => 
      !issue.status || issue.status === 'acknowledged'
    );

    let totalImpact = 0;
    activeIssues.forEach((issue: any) => {
      const severityWeight = {
        'low': 1,
        'medium': 3,
        'high': 5,
        'critical': 10
      }[issue.severity] || 1;
      
      totalImpact += (issue.cost_impact || 0) * severityWeight;
    });

    const score = Math.max(0, 10 - totalImpact);
    
    let rating: string;
    if (score >= 9) rating = 'excellent';
    else if (score >= 7) rating = 'good';
    else if (score >= 5) rating = 'fair';
    else rating = 'poor';

    return { score, rating };
  }

  /**
   * Map severity to issue type
   */
  private mapSeverityToType(severity: string): string {
    const mapping = {
      'critical': 'error',
      'high': 'warning', 
      'medium': 'warning',
      'low': 'info'
    };
    return mapping[severity] || 'info';
  }

  /**
   * Estimate cost impact based on severity
   */
  private estimateCostImpact(severity: string): number {
    const impacts = {
      'critical': 0.25,  // 25% cost impact
      'high': 0.15,      // 15% cost impact
      'medium': 0.08,    // 8% cost impact
      'low': 0.03        // 3% cost impact
    };
    return impacts[severity] || 0.05;
  }
}
