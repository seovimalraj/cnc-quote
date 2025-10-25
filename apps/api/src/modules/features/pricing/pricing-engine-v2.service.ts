import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { ContractsV1, MaterialRegion } from '@cnc-quote/shared';
import { GeometryService, GeometryMetrics } from "../../domain/geometry/geometry.service";
import { resolveToleranceMapping, ToleranceCategory } from "../../../lib/pricing-core/tolerance";
import { NormalizedToleranceMap, parseTolerances, StructuredToleranceEntry } from "../../../lib/dfm-core/tolerance.parser";
// import { buildDefaultOrchestrator, PricingBreakdownLine, PricingInput, PricingOrchestrator } from './pricing.service' /* TODO: was legacy/pricing-v1 */;
// Stub types from legacy pricing-v1 (commented out imports above)
type PricingBreakdownLine = any;
type PricingInput = any;
type PricingOrchestrator = any;
const buildDefaultOrchestrator = (): PricingOrchestrator => ({} as any);

import {
  PricingToleranceEntry,
  PricingToleranceMatch,
  PricingToleranceProfile,
  PricingToleranceSummary,
  ToleranceSource,
} from "../../../lib/pricing-core/core/types";
import {
  ToleranceCostBookRepository,
  ToleranceAppliesTo,
  ToleranceFeatureType,
  ToleranceProcess,
  ToleranceUnit,
} from "../../../lib/pricing-core/repositories/tolerance-cost-book.repo";
import {
  IssueTag,
  PersistedRiskResult,
  RiskContribution,
  RiskSeverity,
  RiskVector,
  RISK_DIMENSIONS,
  RISK_SEVERITY_MARKUP,
} from "../dfm/risk.model";
import { TaxService } from "../tax/tax.service";
import { PricingConfigService } from "../admin/admin/admin-pricing/pricing-config.service";

type QuoteComplianceSnapshotV1 = ContractsV1.QuoteComplianceSnapshotV1;
type QuoteComplianceAlertV1 = ContractsV1.QuoteComplianceAlertV1;
type QuoteComplianceSurchargeV1 = ContractsV1.QuoteComplianceSurchargeV1;
type SupplierCapabilityV1 = ContractsV1.SupplierCapabilityV1;

export interface PricingEngineRequest {
  part_config: ContractsV1.PartConfigV1;
  geometry?: GeometryMetrics;
  quantities: number[];
  calculateTax?: boolean;
  shipTo?: {
    country: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };
  customerType?: 'B2B' | 'B2C';
  vatNumber?: string;
}

const KNOWN_FEATURE_TYPES: ReadonlySet<ToleranceFeatureType> = new Set([
  'hole',
  'slot',
  'pocket',
  'flatness',
  'position',
  'thread',
  'profile',
]);

const KNOWN_APPLIES_TO: ReadonlySet<ToleranceAppliesTo> = new Set([
  'diameter',
  'width',
  'depth',
  'runout',
  'flatness',
  'true_position',
  'pitch',
  'generic',
]);

export interface PricingEngineResponse {
  pricing_matrix: EnginePricingBreakdown[];
  lead_times: {
    standard: number;
    expedited: number;
  };
  minimums: {
    quantity: number;
    value: number;
  };
  currency: string;
  tax?: {
    totalTax: number;
    jurisdiction: string;
    provider: string;
    lines: Array<{
      quantity: number;
      taxAmount: number;
      taxRate: number;
      taxableAmount: number;
    }>;
    metadata?: Record<string, any>;
  };
  pricing_config?: {
    version: string;
    status: 'draft' | 'published' | 'default';
  };
}

export interface MaterialCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  cost_per_kg: number;
  base_cost_per_kg: number;
  region_multiplier: number;
  density: number; // kg/m³
  availability: boolean;
  lead_time_days: number;
  processes: ContractsV1.ProcessType[];
  isFallback?: boolean;
}

export interface FinishCatalogItem {
  id: string;
  name: string;
  cost_per_part?: number;
  cost_per_area?: number; // per cm²
  lead_time_days: number;
  processes: ContractsV1.ProcessType[];
}

type PricingMaterialRow = {
  id: string;
  code: string;
  category_id?: string | null;
  name: string;
  processes: string[] | null;
  available_regions: string[] | null;
  density_kg_m3: number;
  cost_per_kg_base: number;
  is_active: boolean;
  category?:
    | { id: string; code: string; name: string }
    | { id: string; code: string; name: string }[]
    | null;
  region_multipliers?: Array<{ region: string; multiplier: number | string } | null> | null;
};

interface EnginePricingBreakdown {
  quantity: number;
  cost_factors: {
    material: number;
    machining: number;
    setup: number;
    finish: number;
    inspection: number;
    overhead: number;
    margin: number;
    risk_markup?: number;
  };
  unit_price: number;
  total_price: number;
  margin_percentage: number;
  quantity_discount: number;
  currency: string;
  tolerance: {
    band: string;
    category: string;
    source: string;
    multipliers: {
      machining: number;
      setup: number;
      inspection: number;
    };
    catalog_version?: number;
    entries?: PricingToleranceEntry[];
    matches?: PricingToleranceMatch[];
    summary?: PricingToleranceSummary;
  };
  breakdown?: PricingBreakdownLine[];
  logs?: string[];
  time_minutes?: number;
  orchestrator_version?: string;
  risk?: {
    severity: RiskSeverity;
    score: number;
    markup_multiplier: number;
    contributions: RiskContribution[];
    tags: IssueTag[];
  };
  pricing_config_version?: string;
  pricing_config_status?: 'draft' | 'published' | 'default';
  compliance?: QuoteComplianceSnapshotV1;
}

interface PricingRiskSnapshot {
  vector: RiskVector;
  score: number;
  severity: RiskSeverity;
  contributions: RiskContribution[];
  markupMultiplier: number;
  tags: IssueTag[];
}

interface ConfigStatusSnapshot {
  version: string;
  status: 'draft' | 'published' | 'default';
}

const ZERO_RISK_VECTOR: RiskVector = {
  thin_walls: 0,
  deep_pockets: 0,
  small_holes: 0,
  tight_tolerances: 0,
  material_hardness: 0,
};

@Injectable()
export class PricingEngineV2Service {
  private readonly logger = new Logger(PricingEngineV2Service.name);
  private readonly breakdownEnabled = process.env.PRICING_BREAKDOWN_ENABLE !== 'false';
  private readonly orchestratorVersion: string;
  private readonly pricingFactorsVersion: string;
  private readonly marginFloorPercent: number;
  private readonly discountAlertThreshold: number;
  private readonly expediteLeadTimeGuardrail: number;
  private static readonly MATERIAL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MATERIAL_CACHE_MAX_ENTRIES = 256;
  private static readonly RISK_SEVERITY_ORDER: ReadonlyArray<RiskSeverity> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private readonly materialCache = new Map<string, { value: MaterialCatalogItem; expiresAt: number }>();
  private readonly supplierConsumerEnabled: boolean;
  private static readonly SUPPLIER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private supplierCapabilityCache = new Map<string, { value: SupplierCapabilityV1; expiresAt: number }>();
  private orchestratorRef: { version: string; instance: PricingOrchestrator } | null = null;
  private activeConfigStatus: ConfigStatusSnapshot | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly geometryService: GeometryService,
    private readonly toleranceCostBook: ToleranceCostBookRepository,
    private readonly taxService: TaxService,
    @Optional() private readonly pricingConfig?: PricingConfigService,
  ) {
    this.orchestratorVersion = this.getEnv('PRICING_PIPELINE_V', '3.0.0');
    this.pricingFactorsVersion = this.getEnv('PRICING_FACTORS_VERSION', '1.0.0');
    this.marginFloorPercent = this.parseNumberEnv('PRICING_MARGIN_FLOOR', 0.24);
    this.discountAlertThreshold = this.parseNumberEnv('PRICING_DISCOUNT_ALERT_THRESHOLD', 0.22);
    this.expediteLeadTimeGuardrail = this.parseNumberEnv('PRICING_EXPEDITE_ALERT_DAYS', 2);
    // Feature-flag supplier capability consumer, default OFF for safety
    this.supplierConsumerEnabled = this.getEnv('SUPPLIER_CONSUMER_ENABLED', 'false') === 'true';
  }

  getOrchestratorVersion(): string {
    return this.orchestratorVersion;
  }

  getPricingFactorsVersion(): string {
    return this.pricingFactorsVersion;
  }

  /**
   * Fallback config when PricingConfigService is unavailable.
   * Provides minimal defaults for instant quote functionality.
   */
  private getMinimalDefaultConfig() {
    return {
      config: {
        version: '1.0.0-default',
        machines: {},
        materials: {},
        finishes: {},
        tolerance_packs: {},
        inspection: { base_usd: 0, per_dim_usd: 0, program_min: 0 },
        speed_region: {},
        risk_matrix: {},
        overhead_margin: { overhead_percent: 0.15, target_margin_percent: 0.25 },
      },
      status: 'default' as const,
      version: '1.0.0-default',
    };
  }

  private async resolveOrchestrator(): Promise<PricingOrchestrator> {
    // Use default config if PricingConfigService not available (minimal runtime)
    const snapshot = this.pricingConfig 
      ? await this.pricingConfig.getActiveConfig()
      : this.getMinimalDefaultConfig();
    
    const isFreshLoad = !this.orchestratorRef || this.orchestratorRef.version !== snapshot.version;
    this.activeConfigStatus = {
      version: snapshot.version,
      status: snapshot.status,
    };

    if (!isFreshLoad) {
      this.orchestratorRef.instance.setConfig(snapshot.config);
      return this.orchestratorRef.instance;
    }

    if (snapshot.status !== 'published') {
      this.logger.warn(
        `No published pricing config detected; using ${snapshot.status} version ${snapshot.version} for runtime pricing`,
      );
    } else {
      this.logger.log(`Loading published pricing config version ${snapshot.version} into pricing engine`);
    }

    const orchestrator = buildDefaultOrchestrator();
    this.orchestratorRef = {
      version: snapshot.version,
      instance: orchestrator,
    };
    return orchestrator;
  }

  private getEnv(key: string, fallback: string): string {
    const value = this.config.get<string>(key);
    return value && value.length > 0 ? value : fallback;
  }

  private parseNumberEnv(key: string, fallback: number): number {
    const raw = this.getEnv(key, fallback.toString());
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Calculate pricing for multiple quantities
   */
  async calculatePricing(request: PricingEngineRequest): Promise<PricingEngineResponse> {
    const { part_config, geometry, quantities, calculateTax, shipTo, customerType, vatNumber } = request;

    const pricing_matrix: EnginePricingBreakdown[] = [];
    const riskSnapshot = await this.loadRiskSnapshot(part_config);
    const orchestrator = await this.resolveOrchestrator();

    for (const quantity of quantities) {
      const breakdown = await this.calculateQuantityPricing(
        part_config,
        geometry,
        quantity,
        riskSnapshot,
        orchestrator,
      );
      pricing_matrix.push(breakdown);
    }

    // Calculate lead times based on process and priority
    const leadTimeOption = (part_config as any).lead_time ?? part_config.lead_time_option;
    const lead_times = this.calculateLeadTimes(part_config.process_type, leadTimeOption);

    // Get minimum order requirements
    const minimums = await this.getOrderMinimums(part_config.process_type);

    const response: PricingEngineResponse = {
      pricing_matrix,
      lead_times,
      minimums,
      currency: 'USD',
      pricing_config: this.activeConfigStatus
        ? {
            version: this.activeConfigStatus.version,
            status: this.activeConfigStatus.status,
          }
        : undefined,
    };

    // Calculate tax if requested
    if (calculateTax && shipTo) {
      try {
        const taxResult = await this.taxService.computeTax({
          orgId: (part_config as any).org_id || 'default',
          currency: 'USD',
          shipTo,
          lines: pricing_matrix.map((breakdown) => ({
            lineId: `qty_${breakdown.quantity}`,
            amount: breakdown.total_price,
            quantity: breakdown.quantity,
            description: `${part_config.process_type} - Quantity ${breakdown.quantity}`,
          })),
          customerType,
          vatNumber,
        });

        response.tax = {
          totalTax: taxResult.totalTax,
          jurisdiction: taxResult.jurisdiction || 'unknown',
          provider: taxResult.provider || 'none',
          lines: taxResult.lines?.map((line) => {
            const breakdown = pricing_matrix.find((b) => `qty_${b.quantity}` === line.lineId);
            return {
              quantity: breakdown?.quantity || 0,
              taxAmount: line.taxAmount,
              taxRate: line.taxRate,
              taxableAmount: breakdown?.total_price || 0,
            };
          }) || [],
          metadata: taxResult.metadata,
        };

        this.logger.log(
          `Tax calculated for ${shipTo.country}: $${taxResult.totalTax.toFixed(2)} (${taxResult.provider})`,
        );
      } catch (error) {
        this.logger.error(`Tax calculation failed: ${error.message}`, error.stack);
        // Don't fail the entire pricing request if tax fails
        response.tax = {
          totalTax: 0,
          jurisdiction: 'unknown',
          provider: 'none',
          lines: [],
          metadata: { error: error.message },
        };
      }
    }

    return response;
  }

  /**
   * Calculate pricing for a specific quantity
   */
  private async calculateQuantityPricing(
    part_config: ContractsV1.PartConfigV1,
    geometry: GeometryMetrics | undefined,
    quantity: number,
    riskSnapshot: PricingRiskSnapshot | null,
    orchestrator: PricingOrchestrator,
  ): Promise<EnginePricingBreakdown> {
    const leadTimeOption = (part_config as any).lead_time ?? part_config.lead_time_option;
    const materialCode = this.resolveMaterialCode(part_config);
    const materialRegion = this.resolveMaterialRegion(part_config);
    const materialDetail = await this.getMaterialById(materialCode, materialRegion);

    if (!this.breakdownEnabled) {
      return this.calculateQuantityPricingLegacy(
        part_config,
        geometry,
        quantity,
        riskSnapshot,
        materialDetail,
        materialRegion,
      );
    }

    const dominantFeature = this.determineDominantFeature(geometry);
    const toleranceDetails = resolveToleranceMapping({
      toleranceIds: part_config.tolerances,
      toleranceClass: part_config.tolerance_class,
      featureCategory: dominantFeature,
      defaultCategory: this.defaultToleranceCategoryForProcess(part_config.process_type),
    });

    const pricingInput = await this.buildPricingInput(
      part_config,
      geometry,
      quantity,
      toleranceDetails,
      riskSnapshot,
      {
        code: materialCode,
        detail: materialDetail,
        region: materialRegion,
      },
    );

    try {
      // Optional: Guarded supplier capability check (does not affect price; enriches compliance metadata only)
      const supplierMeta = await this.maybeCheckSupplierCapability(part_config);

      const orchestratorResult = await orchestrator.run(pricingInput, {
        flags: this.buildFlagMap(part_config),
      });

      const breakdownMap = this.indexBreakdown(orchestratorResult.breakdown);
      const riskUpliftLine = breakdownMap.get('risk_uplift');
      const riskUpliftAmount = riskUpliftLine?.amount ?? 0;
      const quantityDiscount = this.calculateQuantityDiscount(quantity, part_config.process_type);

      const unitPriceBeforeDiscount = orchestratorResult.price;
      const unitPrice = this.toMoney(unitPriceBeforeDiscount * (1 - quantityDiscount));
      const totalPrice = this.toMoney(unitPrice * Math.max(1, quantity));

      const marginLine = breakdownMap.get('margin');
      const marginAmount = marginLine?.amount ?? 0;
      const marginPct =
        typeof marginLine?.meta?.marginPct === 'number'
          ? marginLine.meta.marginPct
          : this.deriveMarginPercentage(orchestratorResult.subtotalCost, marginAmount);

      const response: EnginePricingBreakdown = {
        quantity,
        cost_factors: {
          material: breakdownMap.get('material_cost')?.amount ?? 0,
          machining: breakdownMap.get('machine_time')?.amount ?? 0,
          setup: breakdownMap.get('setup_time')?.amount ?? 0,
          finish: breakdownMap.get('finish_cost')?.amount ?? 0,
          inspection: 0,
          overhead: breakdownMap.get('overhead')?.amount ?? 0,
          margin: marginAmount,
          ...(riskUpliftAmount > 0 ? { risk_markup: this.toMoney(riskUpliftAmount) } : {}),
        },
        unit_price: unitPrice,
        total_price: totalPrice,
        margin_percentage: Number(marginPct.toFixed(4)),
        quantity_discount: quantityDiscount,
        currency: 'USD',
        tolerance: {
          band: toleranceDetails.band,
          category: toleranceDetails.category,
          source: toleranceDetails.source,
          multipliers: {
            machining:
              pricingInput.toleranceSummary?.machineMultiplier ?? toleranceDetails.mapping.baseMultiplier,
            setup:
              pricingInput.toleranceSummary?.setupMultiplier ?? toleranceDetails.mapping.setupMultiplier,
            inspection:
              pricingInput.toleranceSummary?.inspectionMultiplier ?? toleranceDetails.mapping.inspectionMultiplier,
          },
          catalog_version: pricingInput.toleranceCatalogVersion,
          entries: pricingInput.toleranceEntries,
          matches: pricingInput.toleranceMatches,
          summary: pricingInput.toleranceSummary,
        },
        breakdown: orchestratorResult.breakdown,
        logs: orchestratorResult.logs,
        time_minutes: orchestratorResult.timeMinutes,
        orchestrator_version: this.orchestratorVersion,
        pricing_config_version: this.activeConfigStatus?.version,
        pricing_config_status: this.activeConfigStatus?.status,
      };

      if (riskSnapshot) {
        response.risk = {
          severity: riskSnapshot.severity,
          score: riskSnapshot.score,
          markup_multiplier: riskSnapshot.markupMultiplier,
          contributions: riskSnapshot.contributions,
          tags: riskSnapshot.tags,
        };
      }

      response.compliance = this.buildComplianceSnapshot({
        part: part_config,
        quantity,
        currency: 'USD',
        unitPrice,
        unitPriceBeforeDiscount,
        totalPrice,
        marginPercent: response.margin_percentage,
        quantityDiscount,
        riskSnapshot,
        riskUpliftAmount: riskUpliftAmount > 0 ? this.toMoney(riskUpliftAmount) : undefined,
        riskUpliftPercent:
          typeof riskUpliftLine?.meta?.upliftPct === 'number'
            ? Number(Number(riskUpliftLine.meta.upliftPct).toFixed(4))
            : undefined,
        pricingConfigStatus: this.activeConfigStatus,
        leadTimeOption: typeof leadTimeOption === 'string' ? leadTimeOption : undefined,
      });

      // Append supplier metadata if present
      if (supplierMeta) {
        if (!response.compliance) {
          response.compliance = this.buildComplianceSnapshot({
            part: part_config,
            quantity,
            currency: 'USD',
            unitPrice,
            unitPriceBeforeDiscount,
            totalPrice,
            marginPercent: response.margin_percentage,
            quantityDiscount,
            riskSnapshot,
            pricingConfigStatus: this.activeConfigStatus,
            leadTimeOption: typeof leadTimeOption === 'string' ? leadTimeOption : undefined,
          });
        }
        response.compliance.metadata = {
          ...(response.compliance.metadata ?? {}),
          ...supplierMeta,
        };
      }

      this.emitTelemetry(part_config, quantity, orchestratorResult);

      return response;
    } catch (error) {
      this.logger.warn(
        `Pricing orchestrator failed for part=${part_config.id} qty=${quantity}: ${error.message}`,
      );
      return this.calculateQuantityPricingLegacy(
        part_config,
        geometry,
        quantity,
        riskSnapshot,
        materialDetail,
        materialRegion,
      );
    }
  }

  /**
   * Legacy fallback pricing computation
   */
  private async calculateQuantityPricingLegacy(
    part_config: ContractsV1.PartConfigV1,
    geometry: GeometryMetrics | undefined,
    quantity: number,
    riskSnapshot: PricingRiskSnapshot | null,
    materialDetail?: MaterialCatalogItem | null,
    materialRegion?: MaterialRegion,
  ): Promise<EnginePricingBreakdown> {
    const leadTimeOption = (part_config as any).lead_time ?? part_config.lead_time_option;
    const process_type = part_config.process_type;
    const materialCode =
      part_config.material_id ??
      (part_config as any).material ??
      (part_config as any).material_id ??
      'AL6061';

    const finishIds: string[] = [];
    if (Array.isArray(part_config.finish_ids)) {
      finishIds.push(...part_config.finish_ids);
    } else if (Array.isArray((part_config as any).finish_ids)) {
      finishIds.push(...(part_config as any).finish_ids);
    } else if (Array.isArray((part_config as any).finish)) {
      finishIds.push(...(part_config as any).finish);
    }

    const effectiveRegion = materialRegion ?? this.resolveMaterialRegion(part_config);
    const material_cost = await this.calculateMaterialCost(
      materialCode,
      geometry,
      effectiveRegion,
      materialDetail,
    );
    const machining_cost = await this.calculateMachiningCost(process_type, geometry, part_config);
    const setup_cost = await this.getSetupCost(process_type);
    const finish_cost = finishIds.length > 0 ? await this.calculateFinishCost(finishIds, geometry) : 0;

    const dominantFeature = this.determineDominantFeature(geometry);
    const toleranceDetails = resolveToleranceMapping({
      toleranceIds: part_config.tolerances,
      toleranceClass: part_config.tolerance_class,
      featureCategory: dominantFeature,
      defaultCategory: this.defaultToleranceCategoryForProcess(process_type),
    });

    const adjustedMachiningCost = machining_cost * toleranceDetails.mapping.baseMultiplier;
    const adjustedSetupCost = setup_cost * toleranceDetails.mapping.setupMultiplier;
    const setup_cost_per_part = adjustedSetupCost / Math.max(quantity, 1);
    const inspection_cost_per_part = this.calculateInspectionCost(
      part_config.inspection_level,
      process_type,
      toleranceDetails.mapping.inspectionMultiplier,
    );

    // Calculate quantity discounts
    const quantity_discount = this.calculateQuantityDiscount(quantity, process_type);

    const overhead_base = material_cost + adjustedMachiningCost + setup_cost_per_part;
    const overhead = overhead_base * 0.15;

    const baseUnitCostBeforeMargin =
      material_cost +
      adjustedMachiningCost +
      setup_cost_per_part +
      finish_cost +
      inspection_cost_per_part +
      overhead;

    let unit_cost_before_margin = baseUnitCostBeforeMargin;
    let riskMarkupAmount = 0;
    let riskMarkupPercent = 0;
    if (riskSnapshot && riskSnapshot.markupMultiplier > 1) {
      const delta = riskSnapshot.markupMultiplier - 1;
      riskMarkupAmount = unit_cost_before_margin * delta;
      unit_cost_before_margin += riskMarkupAmount;
      riskMarkupPercent = delta;
    }

    const margin_percentage = await this.getMarginPercentage(process_type, unit_cost_before_margin);
    const margin_value = unit_cost_before_margin * margin_percentage;

    let unit_price = unit_cost_before_margin + margin_value;
    const priceBeforeDiscount = unit_price;
    if (quantity_discount > 0) {
      unit_price *= 1 - quantity_discount;
    }

    const total_price = unit_price * quantity;

    const response: EnginePricingBreakdown = {
      quantity,
      cost_factors: {
        material: material_cost,
        machining: adjustedMachiningCost,
        setup: setup_cost_per_part,
        finish: finish_cost,
        inspection: inspection_cost_per_part,
        overhead,
        margin: margin_value,
        ...(riskMarkupAmount > 0 ? { risk_markup: riskMarkupAmount } : {}),
      },
      unit_price,
      total_price,
      margin_percentage,
      quantity_discount,
      currency: 'USD',
      tolerance: {
        band: toleranceDetails.band,
        category: toleranceDetails.category,
        source: toleranceDetails.source,
        multipliers: {
          machining: toleranceDetails.mapping.baseMultiplier,
          setup: toleranceDetails.mapping.setupMultiplier,
          inspection: toleranceDetails.mapping.inspectionMultiplier,
        },
      },
    };

    if (riskSnapshot) {
      response.risk = {
        severity: riskSnapshot.severity,
        score: riskSnapshot.score,
        markup_multiplier: riskSnapshot.markupMultiplier,
        contributions: riskSnapshot.contributions,
        tags: riskSnapshot.tags,
      };
    }

  const complianceUnitPrice = this.toMoney(unit_price);
  const complianceTotalPrice = this.toMoney(total_price);
  const unitPriceBeforeDiscount = this.toMoney(priceBeforeDiscount);

  response.unit_price = complianceUnitPrice;
  response.total_price = complianceTotalPrice;

    response.compliance = this.buildComplianceSnapshot({
      part: part_config,
      quantity,
      currency: 'USD',
      unitPrice: complianceUnitPrice,
      unitPriceBeforeDiscount,
      totalPrice: complianceTotalPrice,
      marginPercent: response.margin_percentage,
  quantityDiscount: quantity_discount,
      riskSnapshot,
      riskUpliftAmount: riskMarkupAmount > 0 ? this.toMoney(riskMarkupAmount) : undefined,
      riskUpliftPercent: riskMarkupPercent > 0 ? Number(riskMarkupPercent.toFixed(4)) : undefined,
      pricingConfigStatus: this.activeConfigStatus,
      leadTimeOption: typeof leadTimeOption === 'string' ? leadTimeOption : undefined,
    });

    return response;
  }

  private async buildPricingInput(
    part_config: ContractsV1.PartConfigV1,
    geometry: GeometryMetrics | undefined,
    quantity: number,
    toleranceDetails: ReturnType<typeof resolveToleranceMapping>,
    riskSnapshot: PricingRiskSnapshot | null,
    materialContext: {
      code: string;
      detail: MaterialCatalogItem | null;
      region?: MaterialRegion;
    },
  ): Promise<PricingInput> {
    const finishes = this.resolveFinishes(part_config);
    const process = this.mapProcess(part_config.process_type);
    const materialCode = materialContext.code;
    const materialDetail = materialContext.detail;
    const materialRegion = materialContext.region;

    const toleranceProfile = this.buildToleranceProfile(toleranceDetails);
    const toleranceSnapshot = this.buildToleranceSnapshot(toleranceDetails);

    const toleranceContext = await this.buildToleranceContext({
      partConfig: part_config,
      process,
      toleranceProfile,
    });

    const features = this.buildFeatureSnapshot(
      geometry,
      part_config,
      riskSnapshot,
      toleranceContext.summary,
    );

    if (toleranceContext.summary) {
      features.tolerance_summary = toleranceContext.summary;
      features.tolerance_sources = toleranceContext.summary.sources;
      features.tolerance_review_required = toleranceContext.summary.reviewRequired;
    }
    if (toleranceContext.entries.length > 0) {
      features.tolerance_entries = toleranceContext.entries.slice(0, 25);
    }

    return {
      orgId: (part_config as any).org_id ?? part_config.quote_id ?? 'unknown',
      partId: part_config.id,
      process,
      materialCode,
      quantity,
      finishes,
      features,
      tolerances: toleranceSnapshot,
      toleranceProfile,
      toleranceEntries: toleranceContext.entries,
      toleranceMatches: toleranceContext.matches,
      toleranceSummary: toleranceContext.summary,
      toleranceCatalogVersion: toleranceContext.catalogVersion,
      region: materialRegion ?? (part_config as any).region ?? undefined,
      catalogVersion: (part_config.pricing as any)?.version,
      material: materialDetail
        ? {
            id: materialDetail.id,
            code: materialDetail.code,
            name: materialDetail.name,
            densityKgM3: Number(materialDetail.density) || 0,
            costPerKg: Number(materialDetail.cost_per_kg) || 0,
            baseCostPerKg: Number(materialDetail.base_cost_per_kg) || 0,
            regionMultiplier: Number(materialDetail.region_multiplier) || 1,
            leadTimeDays: Number(materialDetail.lead_time_days) || 0,
            source: materialDetail.isFallback ? 'fallback' : 'catalog',
          }
        : undefined,
    };
  }

  private mapProcess(process: ContractsV1.ProcessType): PricingInput['process'] {
    if (process === 'cnc_turning') return 'turning';
    if (process.startsWith('sheet')) return 'sheet';
    return 'cnc_milling';
  }

  private buildToleranceSnapshot(
    toleranceDetails: ReturnType<typeof resolveToleranceMapping>,
  ): PricingInput['tolerances'] {
    const value = this.toleranceBandToValue(toleranceDetails.band);
    return {
      [toleranceDetails.category]: { value, unit: 'mm' },
    };
  }

  private buildFeatureSnapshot(
    geometry: GeometryMetrics | undefined,
    part_config: ContractsV1.PartConfigV1,
    riskSnapshot: PricingRiskSnapshot | null,
    toleranceSummary?: PricingToleranceSummary,
  ): Record<string, any> {
    const baseRiskVector = this.deriveRiskVector(geometry, toleranceSummary);
    const resolvedRiskVector = riskSnapshot?.vector
      ? {
          ...riskSnapshot.vector,
          tight_tolerances: Number(
            Math.max(
              typeof (riskSnapshot.vector as any).tight_tolerances === 'number'
                ? (riskSnapshot.vector as any).tight_tolerances
                : 0,
              baseRiskVector.tight_tolerances,
            ).toFixed(2),
          ),
        }
      : baseRiskVector;

    if (!geometry) {
      const base: Record<string, any> = { risk_vector: resolvedRiskVector };
      if (riskSnapshot) {
        base.risk = this.serializeRiskSnapshot(riskSnapshot);
      }
      if (toleranceSummary) {
        base.tolerance = toleranceSummary;
      }
      return base;
    }

    const primitive = geometry.primitive_features || {};
    const metrics: any = (geometry as any).metrics ?? geometry;

    const volumeCc = this.safeNumber(
      metrics?.volume_cc ?? metrics?.volume ?? (geometry as any)?.volume_cc ?? geometry.volume,
    );
    const volumeMm3Source = this.safeNumber(metrics?.volume_mm3 ?? (geometry as any)?.volume_mm3);
    const volumeMm3 = volumeMm3Source > 0
      ? this.roundNumber(volumeMm3Source, 3)
      : this.roundNumber(volumeCc * 1000, 3);

    const surfaceAreaCm2 = this.safeNumber(
      metrics?.surface_area_cm2 ?? metrics?.surface_area ?? (geometry as any)?.surface_area_cm2 ?? geometry.surface_area,
    );
    const surfaceAreaMm2Source = this.safeNumber(metrics?.surface_area_mm2 ?? (geometry as any)?.surface_area_mm2);
    const surfaceAreaMm2 = surfaceAreaMm2Source > 0
      ? this.roundNumber(surfaceAreaMm2Source, 3)
      : this.roundNumber(surfaceAreaCm2 * 100, 3);

    const snapshot: Record<string, any> = {
      volume_mm3: volumeMm3,
      volume_cc: this.roundNumber(volumeCc, 3),
      surface_area_mm2: surfaceAreaMm2,
      surface_area_cm2: this.roundNumber(surfaceAreaCm2, 3),
      thickness_mm: geometry.thickness ?? (part_config as any).sheet_thickness_mm,
      holes: { count: primitive.holes ?? 0 },
      pockets: { count: primitive.pockets ?? 0 },
      slots: { count: primitive.slots ?? 0 },
      bends: primitive.bends ?? (part_config as any).bend_count ?? 0,
      risk_vector: resolvedRiskVector,
    };

    if (primitive.cuts !== undefined) {
      snapshot.cuts = { count: primitive.cuts };
    }

    if (riskSnapshot) {
      snapshot.risk = this.serializeRiskSnapshot(riskSnapshot);
    }

    if (toleranceSummary) {
      snapshot.tolerance = toleranceSummary;
    }

    return snapshot;
  }

  /**
   * Compiles a deterministic compliance snapshot per quantity row so downstream consumers can audit
   * guardrail breaches (margin, manual overrides, risk uplifts, lead times) without rehydrating
   * pricing context. This keeps compliance alerts co-located with the pricing payload we persist.
   */
  private buildComplianceSnapshot(params: {
    part: ContractsV1.PartConfigV1;
    quantity: number;
    currency: string;
    unitPrice: number;
    unitPriceBeforeDiscount: number;
    totalPrice: number;
    marginPercent: number;
    quantityDiscount: number;
    riskSnapshot: PricingRiskSnapshot | null;
    riskUpliftAmount?: number;
    riskUpliftPercent?: number;
    pricingConfigStatus?: ConfigStatusSnapshot | null;
    leadTimeOption?: string;
  }): QuoteComplianceSnapshotV1 {
    const {
      part,
      quantity,
      currency,
      unitPrice,
      unitPriceBeforeDiscount,
      totalPrice,
      marginPercent,
      quantityDiscount,
      riskSnapshot,
      riskUpliftAmount,
      riskUpliftPercent,
      pricingConfigStatus,
      leadTimeOption,
    } = params;

    const normalizedUnitPrice = this.toMoney(unitPrice);
    const normalizedUnitPriceBeforeDiscount = this.toMoney(unitPriceBeforeDiscount);
    const normalizedTotalPrice = this.toMoney(totalPrice);
    const marginFloor = Number(this.marginFloorPercent.toFixed(4));
    const normalizedMargin = Number(Number(marginPercent ?? 0).toFixed(4));
    const normalizedDiscount = Number(Number(quantityDiscount ?? 0).toFixed(4));

    let normalizedRiskUpliftPercent =
      typeof riskUpliftPercent === 'number'
        ? Number(Number(riskUpliftPercent).toFixed(4))
        : undefined;
    if (
      normalizedRiskUpliftPercent === undefined &&
      riskSnapshot &&
      riskSnapshot.markupMultiplier > 1
    ) {
      normalizedRiskUpliftPercent = Number((riskSnapshot.markupMultiplier - 1).toFixed(4));
    }

    const leadOptionRaw =
      typeof leadTimeOption === 'string'
        ? leadTimeOption
        : (part as any).lead_time ?? part.lead_time_option ?? 'standard';
    const leadOptionNormalized = typeof leadOptionRaw === 'string' ? leadOptionRaw.toLowerCase() : 'standard';
    const expedited = leadOptionNormalized === 'expedited' || leadOptionNormalized === 'rush';
    const leadTimes = this.calculateLeadTimes(part.process_type, expedited ? 'expedited' : 'standard');

    const alerts: QuoteComplianceAlertV1[] = [];
    const toPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

    if (normalizedMargin + 1e-6 < marginFloor) {
      alerts.push({
        code: 'margin_floor_breach',
        severity: 'critical',
        message: `Margin ${toPercent(normalizedMargin)} below guardrail ${toPercent(marginFloor)}`,
        metadata: {
          margin_percent: normalizedMargin,
          margin_floor_percent: marginFloor,
        },
      });
    } else if (normalizedMargin < marginFloor + 0.03) {
      alerts.push({
        code: 'margin_floor_breach',
        severity: 'warning',
        message: `Margin ${toPercent(normalizedMargin)} within 3.0% of guardrail ${toPercent(marginFloor)}`,
        metadata: {
          margin_percent: normalizedMargin,
          margin_floor_percent: marginFloor,
          proximity: Number((normalizedMargin - marginFloor).toFixed(4)),
        },
      });
    }

    const overrides = part.overrides;
    let manualOverrideApplied = false;
    let manualOverridePercent: number | undefined;
    let leadTimeOverrideDays: number | undefined;
    if (overrides && (typeof overrides.unit_price === 'number' || typeof overrides.margin_percent === 'number')) {
      manualOverrideApplied = true;
      if (typeof overrides.margin_percent === 'number') {
        manualOverridePercent = Number(overrides.margin_percent.toFixed(4));
      } else if (
        typeof overrides.unit_price === 'number' &&
        normalizedUnitPriceBeforeDiscount > 0
      ) {
        manualOverridePercent = Number(
          ((overrides.unit_price - normalizedUnitPriceBeforeDiscount) / normalizedUnitPriceBeforeDiscount).toFixed(4),
        );
      }

      alerts.push({
        code: 'manual_override_applied',
        severity: 'warning',
        message: `Manual override present for quantity ${quantity}`,
        metadata: {
          unit_override: overrides.unit_price ?? null,
          margin_override: overrides.margin_percent ?? null,
        },
      });
    }

    if (overrides && typeof overrides.lead_time_days === 'number') {
      leadTimeOverrideDays = overrides.lead_time_days;
      if (!manualOverrideApplied) {
        manualOverrideApplied = true;
      }
      alerts.push({
        code: 'lead_time_override',
        severity: 'critical',
        message: `Manual lead time override set to ${overrides.lead_time_days} days`,
        metadata: {
          lead_time_override_days: overrides.lead_time_days,
          selected_quantity: part.selected_quantity,
        },
      });
    }

    if (normalizedDiscount > 0 && normalizedDiscount >= this.discountAlertThreshold) {
      alerts.push({
        code: 'manual_discount_high',
        severity: 'warning',
        message: `Quantity discount ${toPercent(normalizedDiscount)} exceeds guardrail ${toPercent(this.discountAlertThreshold)}`,
        metadata: {
          quantity,
          threshold: this.discountAlertThreshold,
        },
      });
    }

    const surcharges: QuoteComplianceSurchargeV1[] = [];
    if (typeof riskUpliftAmount === 'number' && riskUpliftAmount > 0) {
      surcharges.push({
        code: 'risk_uplift',
        label: 'DFM risk uplift',
        amount: this.toMoney(riskUpliftAmount),
        metadata: normalizedRiskUpliftPercent !== undefined ? { percent: normalizedRiskUpliftPercent } : undefined,
      });
    }

    if (normalizedRiskUpliftPercent !== undefined && normalizedRiskUpliftPercent > 0) {
      const riskSeverity = riskSnapshot?.severity ?? null;
      const severity: QuoteComplianceAlertV1['severity'] = riskSeverity === 'CRITICAL'
        ? 'critical'
        : riskSeverity === 'HIGH'
        ? 'warning'
        : 'info';
      alerts.push({
        code: 'risk_markup_applied',
        severity,
        message: `Applied ${toPercent(normalizedRiskUpliftPercent)} risk uplift${riskSeverity ? ` (${riskSeverity})` : ''}`,
        metadata: {
          risk_severity: riskSeverity,
          risk_score: riskSnapshot?.score ?? null,
        },
      });
    }

    const dfmSeverity = this.resolveDfmSeverity(part, riskSnapshot);
    if (dfmSeverity === 'HIGH' || dfmSeverity === 'CRITICAL') {
      alerts.push({
        code: 'dfm_high_risk',
        severity: dfmSeverity === 'CRITICAL' ? 'critical' : 'warning',
        message: `DFM risk flagged at ${dfmSeverity} severity`,
      });
    }

    if (expedited && leadTimes.expedited <= this.expediteLeadTimeGuardrail) {
      alerts.push({
        code: 'lead_time_capacity_risk',
        severity: leadTimes.expedited <= 1 ? 'critical' : 'warning',
        message: `Expedited lead time ${leadTimes.expedited} days meets capacity guardrail (${this.expediteLeadTimeGuardrail} days)`,
        metadata: {
          standard_days: leadTimes.standard,
          expedited_days: leadTimes.expedited,
        },
      });
    }

    const dfmIssueTags = new Set<string>();
    for (const tag of riskSnapshot?.tags ?? []) {
      if (tag?.code) {
        dfmIssueTags.add(tag.code);
      }
    }
    for (const issue of part.dfm?.issues ?? []) {
      if (issue?.category) {
        dfmIssueTags.add(issue.category);
      }
    }
    const dfmIssueTagList = dfmIssueTags.size > 0 ? Array.from(dfmIssueTags).sort() : undefined;

    const metadata: Record<string, unknown> = {
      process_type: part.process_type,
      part_id: part.id,
      quote_id: part.quote_id,
      selected_quantity: part.selected_quantity,
      orchestrator_version: this.orchestratorVersion,
      lead_time_option: expedited ? 'expedited' : 'standard',
    };
    if (leadTimeOverrideDays !== undefined) {
      metadata.lead_time_override_days = leadTimeOverrideDays;
    }
    if (pricingConfigStatus?.version) {
      metadata.pricing_config_version = pricingConfigStatus.version;
    }
    if (pricingConfigStatus?.status) {
      metadata.pricing_config_status = pricingConfigStatus.status;
    }
    if (riskSnapshot) {
      metadata.risk_score = riskSnapshot.score;
      metadata.risk_severity = riskSnapshot.severity;
    }

    return {
      quantity,
      currency,
      unit_price: normalizedUnitPrice,
      price_before_discounts: normalizedUnitPriceBeforeDiscount,
      total_price: normalizedTotalPrice,
      margin_percent: normalizedMargin,
      margin_floor_percent: marginFloor,
      discount_percent: normalizedDiscount > 0 ? normalizedDiscount : undefined,
      manual_override_applied: manualOverrideApplied || undefined,
      manual_override_percent:
        manualOverrideApplied && manualOverridePercent !== undefined
          ? Number(manualOverridePercent.toFixed(4))
          : undefined,
      lead_time_override_days: leadTimeOverrideDays,
      risk_uplift_percent:
        normalizedRiskUpliftPercent !== undefined ? Number(normalizedRiskUpliftPercent.toFixed(4)) : undefined,
      lead_time_option: expedited ? 'expedited' : 'standard',
      expedited,
      lead_time_standard_days: leadTimes.standard,
      lead_time_expedited_days: leadTimes.expedited,
      dfm_risk_severity: dfmSeverity ?? undefined,
      dfm_issue_tags: dfmIssueTagList,
      surcharges: surcharges.length > 0 ? surcharges : undefined,
      alerts,
      metadata,
    };
  }

  /**
   * Guarded supplier capability consumer. If enabled and supplier_id present on part_config,
   * loads org+supplier capability with TTL cache and adds compliance alerts when process/material
   * appear unsupported. Does not change pricing behavior.
   */
  private async maybeCheckSupplierCapability(part_config: ContractsV1.PartConfigV1): Promise<Record<string, unknown> | null> {
    try {
      if (!this.supplierConsumerEnabled) return null;
      const supplierId = (part_config as any).supplier_id as string | undefined;
      const orgId = (part_config as any).org_id as string | undefined;
      if (!supplierId || !orgId) return null;

      const capability = await this.getSupplierCapability(orgId, supplierId);
      if (!capability) return { supplier_capability_checked: true, supplier_id: supplierId, supplier_capability_found: false };

      const out: Record<string, unknown> = {
        supplier_capability_checked: true,
        supplier_id: supplierId,
        supplier_capability_found: true,
      };
      // Process check
      const process = part_config.process_type;
      if (Array.isArray(capability.processes) && capability.processes.length > 0) {
        const ok = capability.processes.includes(process);
        out.supplier_capability_process_ok = ok;
        out.supplier_capability_process = process;
      }

      // Material check (skip if best_available or unknown)
      const materialCode = this.resolveMaterialCode(part_config);
      if (materialCode && materialCode !== 'best_available' && Array.isArray(capability.materials) && capability.materials.length > 0) {
        const ok = capability.materials.includes(materialCode);
        out.supplier_capability_material_ok = ok;
        out.supplier_capability_material = materialCode;
      }

      return out;
    } catch (err) {
      // best-effort only
      this.logger.debug(`supplier capability check skipped: ${(err as Error)?.message}`);
      return null;
    }
  }

  private async getSupplierCapability(orgId: string, supplierId: string): Promise<SupplierCapabilityV1 | null> {
    const cacheKey = `${orgId}:${supplierId}`;
    const now = Date.now();
    const cached = this.supplierCapabilityCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('supplier_capabilities')
        .select('*')
        .eq('org_id', orgId)
        .eq('supplier_id', supplierId)
        .limit(1)
        .maybeSingle();
      if (error) {
        this.logger.debug(`supplier capability load error: ${error.message}`);
        return null;
      }
      if (!data) return null;
      const row = data as any;
      const cap: SupplierCapabilityV1 = {
        version: 1,
        orgId,
        supplierId,
        processes: row.processes ?? [],
        materials: row.materials ?? [],
        machineGroups: row.machine_groups ?? [],
        throughputPerWeek: row.throughput_per_week ?? 0,
        leadDays: row.lead_days ?? 0,
        certifications: row.certifications ?? [],
        regions: row.regions ?? [],
        envelope: row.envelope ?? undefined,
        notes: row.notes ?? undefined,
        active: Boolean(row.active),
        updatedBy: row.updated_by ?? null,
        updatedAt: row.updated_at ?? undefined,
        createdAt: row.created_at ?? undefined,
      } as any;
      this.supplierCapabilityCache.set(cacheKey, { value: cap, expiresAt: now + PricingEngineV2Service.SUPPLIER_CACHE_TTL_MS });
      // prune occasionally
      if (this.supplierCapabilityCache.size > 512) {
        for (const [k, v] of this.supplierCapabilityCache.entries()) {
          if (v.expiresAt <= now) this.supplierCapabilityCache.delete(k);
        }
      }
      return cap;
    } catch (err) {
      this.logger.debug(`supplier capability load unexpected error: ${(err as Error)?.message}`);
      return null;
    }
  }

  private resolveDfmSeverity(
    part: ContractsV1.PartConfigV1,
    riskSnapshot: PricingRiskSnapshot | null,
  ): RiskSeverity | null {
    let severity: RiskSeverity | null = riskSnapshot?.severity ?? null;
    const escalate = (candidate: RiskSeverity) => {
      if (!severity) {
        severity = candidate;
        return;
      }
      const order = PricingEngineV2Service.RISK_SEVERITY_ORDER;
      const currentIndex = order.indexOf(severity as RiskSeverity);
      const candidateIndex = order.indexOf(candidate);
      if (candidateIndex > currentIndex) {
        severity = candidate;
      }
    };

    for (const issue of part.dfm?.issues ?? []) {
      if (issue?.severity === 'critical') {
        escalate('CRITICAL');
      } else if (issue?.severity === 'warn') {
        escalate('MEDIUM');
      } else if (issue?.severity === 'info') {
        escalate('LOW');
      }
    }

    return severity;
  }

  private deriveRiskVector(geometry: GeometryMetrics | undefined, toleranceSummary?: PricingToleranceSummary) {
    const primitive = geometry?.primitive_features ?? {};
    let thinWalls = 0;
    if (geometry?.thickness && geometry.thickness > 0) {
      thinWalls = geometry.thickness < 1.5 ? 1 : 0;
    }
    const deepPockets = Math.min(1, (primitive.pockets ?? 0) / 10);
    const smallHoles = Math.min(1, (primitive.holes ?? 0) / 12);
    const tightToleranceScore = toleranceSummary
      ? Math.min(1, Math.max(0, (toleranceSummary.machineMultiplier - 1) * 5))
      : 0;

    return {
      thin_walls: Number(thinWalls.toFixed(2)),
      deep_pockets: Number(deepPockets.toFixed(2)),
      small_holes: Number(smallHoles.toFixed(2)),
      tight_tolerances: Number(tightToleranceScore.toFixed(2)),
      material_hardness: 0,
    };
  }

  private resolveFinishes(part_config: ContractsV1.PartConfigV1): string[] {
    const finishes: string[] = [];
    if (Array.isArray(part_config.finish_ids)) {
      finishes.push(...part_config.finish_ids);
    }
    if (finishes.length === 0 && Array.isArray((part_config as any).finish_ids)) {
      finishes.push(...(part_config as any).finish_ids);
    }
    if (finishes.length === 0 && Array.isArray((part_config as any).finish)) {
      finishes.push(...(part_config as any).finish);
    }
    return finishes;
  }

  private resolveMaterialCode(part_config: ContractsV1.PartConfigV1): string {
    const candidate =
      part_config.material_id ??
      (part_config as any).material ??
      (part_config as any).material_id;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
    return 'AL6061';
  }

  private buildToleranceProfile(
    toleranceDetails: ReturnType<typeof resolveToleranceMapping>,
  ): PricingToleranceProfile {
    return {
      band: toleranceDetails.band,
      category: toleranceDetails.category,
      source: toleranceDetails.source,
      multipliers: {
        machining: Number(toleranceDetails.mapping.baseMultiplier ?? 1),
        setup: Number(toleranceDetails.mapping.setupMultiplier ?? 1),
        inspection: Number(toleranceDetails.mapping.inspectionMultiplier ?? 1),
      },
    };
  }

  private async buildToleranceContext(params: {
    partConfig: ContractsV1.PartConfigV1;
    process: PricingInput['process'];
    toleranceProfile: PricingToleranceProfile;
  }): Promise<{
    entries: PricingToleranceEntry[];
    matches: PricingToleranceMatch[];
    summary?: PricingToleranceSummary;
    catalogVersion?: number;
  }> {
    let normalized: NormalizedToleranceMap = {};
    const structured = this.extractStructuredTolerances(params.partConfig);
    if (structured && structured.length > 0) {
      normalized = parseTolerances(structured);
    }

    const toleranceNotes = this.collectToleranceNotes(params.partConfig);
    if (toleranceNotes.length > 0) {
      const freeTextMap = parseTolerances(toleranceNotes.join('\n'), 'mm');
      normalized = this.mergeNormalizedToleranceMaps(normalized, freeTextMap);
    }

    const entries = this.convertNormalizedTolerances(normalized);
    const { matches, catalogVersion } = await this.lookupToleranceMatches(params.process, entries);
    const summary = this.computeToleranceSummary(params.toleranceProfile, entries, matches);

    return {
      entries,
      matches,
      summary,
      catalogVersion,
    };
  }

  private extractStructuredTolerances(part_config: ContractsV1.PartConfigV1): StructuredToleranceEntry[] | undefined {
    const rawCandidates =
      (part_config as any).structured_tolerances ??
      (part_config as any).tolerance_details ??
      (part_config as any).tolerance_entries ??
      (part_config as any).dfm?.structured_tolerances ??
      null;

    if (!Array.isArray(rawCandidates)) {
      return undefined;
    }

    const entries: StructuredToleranceEntry[] = [];
    for (const raw of rawCandidates) {
      if (!raw) continue;
      const featureType = this.normalizeFeatureType(raw.featureType ?? raw.feature_type);
      if (!featureType) {
        continue;
      }
      const unit = this.normalizeToleranceUnit(raw.unit ?? raw.unit_type ?? raw.units);
      if (!unit) {
        continue;
      }
      const value = Number(raw.value ?? raw.tolerance ?? raw.amount);
      if (!Number.isFinite(value) || value <= 0) {
        continue;
      }
      const appliesTo = (raw.appliesTo ?? raw.applies_to ?? 'generic') as StructuredToleranceEntry['appliesTo'];
      entries.push({
        featureId: typeof raw.featureId === 'string' ? raw.featureId : undefined,
        featureType,
        appliesTo,
        value,
        unit,
      });
    }

    return entries.length > 0 ? entries : undefined;
  }

  private collectToleranceNotes(part_config: ContractsV1.PartConfigV1): string[] {
    const notes: string[] = [];
    const push = (value: unknown) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          notes.push(trimmed);
        }
      }
    };

    push((part_config as any).tolerance_notes);
    push((part_config as any).notes?.tolerance);
    push((part_config as any).notes?.manufacturing);
    push((part_config as any).manufacturing_notes);

    const dfmIssues = part_config.dfm?.issues;
    if (Array.isArray(dfmIssues)) {
      for (const issue of dfmIssues) {
        push(issue?.message);
        push(issue?.recommendation);
      }
    }

    const metadataNotes = (part_config as any).metadata?.tolerances;
    if (Array.isArray(metadataNotes)) {
      metadataNotes.forEach(push);
    } else {
      push(metadataNotes);
    }

    return notes;
  }

  private mergeNormalizedToleranceMaps(
    base: NormalizedToleranceMap,
    incoming: NormalizedToleranceMap,
  ): NormalizedToleranceMap {
    const merged: NormalizedToleranceMap = { ...base };
    for (const [key, value] of Object.entries(incoming)) {
      if (!merged[key]) {
        merged[key] = value;
      }
    }
    return merged;
  }

  private convertNormalizedTolerances(map: NormalizedToleranceMap): PricingToleranceEntry[] {
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
      key,
      featureId: value.featureId,
      featureType: value.featureType,
      appliesTo: value.appliesTo,
      unit: value.unit,
      value: value.value,
      rawValue: value.rawValue,
      rawUnit: value.rawUnit,
      source: value.source as ToleranceSource,
      reviewRequired: value.reviewRequired,
      fitCode: value.fitCode,
      notes: value.notes,
    }));
  }

  private async lookupToleranceMatches(
    process: PricingInput['process'],
    entries: PricingToleranceEntry[],
  ): Promise<{ matches: PricingToleranceMatch[]; catalogVersion?: number }> {
    const toleranceProcess = this.mapProcessToToleranceProcess(process);
    if (!toleranceProcess) {
      return { matches: [], catalogVersion: undefined };
    }

    const matches: PricingToleranceMatch[] = [];
    let catalogVersion: number | undefined;

    for (const entry of entries) {
      const appliesTo = this.coerceAppliesTo(entry.appliesTo);
      if (!appliesTo) {
        continue;
      }

      const unitType: ToleranceUnit = entry.unit === 'deg' ? 'deg' : 'mm';
      const rows = await this.toleranceCostBook.findMatches(
        toleranceProcess,
        entry.featureType,
        appliesTo,
        unitType,
        entry.value,
      );

      for (const row of rows) {
        matches.push({
          entryKey: entry.key,
          featureType: row.featureType,
          appliesTo: row.appliesTo,
          unit: entry.unit,
          value: entry.value,
          rawValue: entry.rawValue,
          rawUnit: entry.rawUnit,
          source: entry.source,
          affects: row.affects,
          multiplier: row.multiplier,
          rowId: row.id,
          catalogVersion: row.catalogVersion,
          reviewRequired: entry.reviewRequired,
          fitCode: entry.fitCode,
          notes: entry.notes ?? row.notes ?? null,
        });
        catalogVersion = row.catalogVersion;
      }
    }

    if (!catalogVersion) {
      try {
        catalogVersion = await this.toleranceCostBook.getCatalogVersion();
      } catch (error) {
        this.logger.debug('tolerance catalog version fallback failed', { error: (error as Error).message });
      }
    }

    return { matches, catalogVersion };
  }

  private computeToleranceSummary(
    profile: PricingToleranceProfile,
    entries: PricingToleranceEntry[],
    matches: PricingToleranceMatch[],
  ): PricingToleranceSummary {
    const machineBase = profile.multipliers.machining ?? 1;
    const setupBase = profile.multipliers.setup ?? 1;
    const inspectionBase = profile.multipliers.inspection ?? 1;

    let machine = machineBase;
    let setup = setupBase;
    let inspection = inspectionBase;
    let risk = 1;

    const sources: Partial<Record<ToleranceSource, number>> = {};
    let tightestValue: number | undefined;

    for (const entry of entries) {
      sources[entry.source] = (sources[entry.source] ?? 0) + 1;
      if (entry.unit === 'mm') {
        tightestValue = tightestValue === undefined ? entry.value : Math.min(tightestValue, entry.value);
      }
    }

    for (const match of matches) {
      if (match.affects.includes('machine_time')) {
        machine = Math.max(machine, match.multiplier);
      }
      if (match.affects.includes('setup_time')) {
        setup = Math.max(setup, match.multiplier);
      }
      if (match.affects.includes('risk')) {
        risk = Math.max(risk, match.multiplier);
      }
    }

    return {
      machineMultiplier: this.roundMultiplier(machine),
      setupMultiplier: this.roundMultiplier(setup),
      inspectionMultiplier: this.roundMultiplier(inspection),
      riskMultiplier: this.roundMultiplier(risk),
      entryCount: entries.length,
      tightestValueMm: tightestValue !== undefined ? Number(tightestValue.toFixed(4)) : undefined,
      sources,
      matchedRowIds: matches.map((match) => match.rowId),
      reviewRequired:
        entries.some((entry) => entry.reviewRequired) || matches.some((match) => match.reviewRequired === true),
      baseMultipliers: profile.multipliers,
    };
  }

  private mapProcessToToleranceProcess(process: PricingInput['process']): ToleranceProcess | null {
    if (process === 'cnc_milling') return 'cnc_milling';
    if (process === 'turning') return 'turning';
    if (process === 'sheet') return 'sheet_metal';
    return null;
  }

  private normalizeFeatureType(value: unknown): ToleranceFeatureType | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    return KNOWN_FEATURE_TYPES.has(normalized as ToleranceFeatureType)
      ? (normalized as ToleranceFeatureType)
      : null;
  }

  private normalizeToleranceUnit(value: unknown): ToleranceUnit | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'mm' || normalized === 'millimeter' || normalized === 'millimetre') {
      return 'mm';
    }
    if (normalized === 'deg' || normalized === 'degree' || normalized === 'degrees') {
      return 'deg';
    }
    if (normalized === 'µm' || normalized === 'um' || normalized === 'micron' || normalized === 'microns') {
      return 'um';
    }
    return null;
  }

  private coerceAppliesTo(value: unknown): ToleranceAppliesTo | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    return KNOWN_APPLIES_TO.has(normalized as ToleranceAppliesTo)
      ? (normalized as ToleranceAppliesTo)
      : null;
  }

  private roundMultiplier(value: number): number {
    return Number(value.toFixed(4));
  }

  private buildFlagMap(part_config: ContractsV1.PartConfigV1): Record<string, boolean> {
    const leadTime = (part_config as any).lead_time ?? part_config.lead_time_option;
    const express = leadTime === 'expedited' || leadTime === 'rush';
    return { 'leadtime.express': Boolean(express) };
  }

  private indexBreakdown(lines: PricingBreakdownLine[] = []) {
    const map = new Map<string, PricingBreakdownLine>();
    for (const line of lines) {
      map.set(line.key, line);
    }
    return map;
  }

  private deriveMarginPercentage(subtotal: number, marginAmount: number): number {
    if (subtotal <= 0) return 0;
    return marginAmount / subtotal;
  }

  private toMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private emitTelemetry(
    part_config: ContractsV1.PartConfigV1,
    quantity: number,
    result: { price: number; subtotalCost: number; timeMinutes: number; breakdown: any[]; logs?: string[] },
  ) {
    const payload = {
      traceId: (part_config as any).trace_id ?? part_config.id,
      orgId: (part_config as any).org_id ?? 'unknown',
      partId: part_config.id,
      process: part_config.process_type,
      quantity,
      subtotalCost: result.subtotalCost,
      price: result.price,
      timeMinutes: result.timeMinutes,
      factorKeys: result.breakdown.map((line) => line.key),
      orchestratorVersion: this.orchestratorVersion,
      pricingConfigVersion: this.activeConfigStatus?.version ?? 'unknown',
      pricingConfigStatus: this.activeConfigStatus?.status ?? 'unknown',
    };

    this.logger.debug(`pricing.orchestrator ${JSON.stringify(payload)}`);
  }

  private toleranceBandToValue(band: string): number {
    const mapping: Record<string, number> = {
      coarse: 0.3,
      medium: 0.1,
      fine: 0.05,
      precision: 0.02,
      ultra_precision: 0.01,
    };
    return mapping[band] ?? 0.1;
  }

  /**
   * Calculate material cost based on geometry and material properties
   */
  private async calculateMaterialCost(
    material_id: string,
    geometry?: GeometryMetrics,
    region?: MaterialRegion,
    resolvedMaterial?: MaterialCatalogItem | null,
  ): Promise<number> {
    if (!geometry) return 10; // Default material cost

    const material = resolvedMaterial ?? (await this.getMaterialById(material_id, region));
    if (!material) return 10;

    // Calculate material volume needed (including waste)
    const part_volume = geometry.volume / 1000000; // Convert cm³ to m³
    const waste_factor = geometry.material_usage?.waste_percentage 
      ? 1 + (geometry.material_usage.waste_percentage / 100)
      : 1.2; // Default 20% waste

    const material_volume_needed = part_volume * waste_factor;
    const material_mass = material_volume_needed * material.density;
    
    return material_mass * material.cost_per_kg;
  }

  /**
   * Calculate machining cost based on process and geometry
   */
  private async calculateMachiningCost(
    process_type: ContractsV1.ProcessType,
    geometry: GeometryMetrics | undefined,
    part_config: ContractsV1.PartConfigV1,
  ): Promise<number> {
    if (!geometry) return 20; // Default machining cost

    const machine_rate_per_minute = await this.getMachineRate(process_type);
    let machining_time_minutes = 0;

    switch (process_type) {
      case 'cnc_milling':
        machining_time_minutes = this.calculateCncMillingTime(geometry, part_config);
        break;
      case 'cnc_turning':
        machining_time_minutes = this.calculateCncTurningTime(geometry, part_config);
        break;
      case 'sheet_metal':
      case 'sheet_metal_laser':
      case 'sheet_metal_brake':
        machining_time_minutes = this.calculateSheetMetalTime(geometry, part_config);
        break;
      default:
        machining_time_minutes = 30; // Default 30 minutes
    }

    return machining_time_minutes * machine_rate_per_minute;
  }

  private determineDominantFeature(geometry: GeometryMetrics | undefined): string | undefined {
    if (!geometry) return undefined;
    const summary: any = (geometry as any).feature_summary;
    if (summary?.dominant_feature) {
      return summary.dominant_feature;
    }

    const primitive = geometry.primitive_features || {};
    let dominant: string | undefined;
    let highest = 0;

    for (const [feature, value] of Object.entries(primitive)) {
      if (typeof value === 'number' && value > highest) {
        dominant = feature;
        highest = value;
      }
    }

    return dominant;
  }

  private defaultToleranceCategoryForProcess(process: ContractsV1.ProcessType): ToleranceCategory {
    switch (process) {
      case 'cnc_turning':
        return 'concentricity';
      case 'sheet_metal':
      case 'sheet_metal_laser':
      case 'sheet_metal_brake':
        return 'flatness';
      default:
        return 'linear';
    }
  }

  private calculateInspectionCost(
    inspectionLevel: ContractsV1.InspectionLevel,
    processType: ContractsV1.ProcessType,
    toleranceInspectionMultiplier: number,
  ): number {
    let baseCost = 5.5;
    if (processType.startsWith('cnc')) {
      baseCost = 6;
    } else if (processType.includes('sheet')) {
      baseCost = 4.5;
    }
    const levelMultiplierMap: Record<ContractsV1.InspectionLevel, number> = {
      basic: 1,
      enhanced: 1.45,
      full: 2.1,
    } as const;

    const levelMultiplier = levelMultiplierMap[inspectionLevel] || 1;
    return baseCost * levelMultiplier * toleranceInspectionMultiplier;
  }

  /**
   * Calculate CNC milling time based on geometry and features
   */
  private calculateCncMillingTime(geometry: GeometryMetrics, part_config: ContractsV1.PartConfigV1): number {
    const base_time = 18; // Slightly lower base, complexity will add
    const volume_time = geometry.volume * 0.1; // 0.1 min per cm³ (placeholder)
    const features = geometry.primitive_features || {} as any;
    const feature_time = (features.holes || 0) * 1.8 + (features.pockets || 0) * 4.5 + (features.slots || 0) * 2.5;
    let finish_multiplier = 1.0;
    if (part_config.surface_finish === 'fine') {
      finish_multiplier = 1.25;
    } else if (part_config.surface_finish === 'improved') {
      finish_multiplier = 1.1;
    }

    let complexity_multiplier = 1.0;
    if (part_config.machining_complexity === 'high') {
      complexity_multiplier = 1.5;
    } else if (part_config.machining_complexity === 'low') {
      complexity_multiplier = 0.85;
    }
    return (base_time + volume_time + feature_time) * finish_multiplier * complexity_multiplier;
  }

  /**
   * Calculate CNC turning time
   */
  private calculateCncTurningTime(geometry: GeometryMetrics, part_config: ContractsV1.PartConfigV1): number {
    const base_time = 15;
    const length_factor = Math.abs(geometry.bbox.max.x - geometry.bbox.min.x) * 0.2;
    const diameter_factor = Math.max(
      Math.abs(geometry.bbox.max.y - geometry.bbox.min.y),
      Math.abs(geometry.bbox.max.z - geometry.bbox.min.z)
    ) * 0.1;
    
    return base_time + length_factor + diameter_factor;
  }

  /**
   * Calculate sheet metal processing time
   */
  private calculateSheetMetalTime(geometry: GeometryMetrics, part_config: ContractsV1.PartConfigV1): number {
    const surface_area = geometry.surface_area || 0; // cm²
    const cutting_time = surface_area * 0.009; // Slightly faster base
    const features = geometry.primitive_features || {} as any;
    const bend_count = part_config.bend_count ?? features.bends ?? 0;
    const bend_time = bend_count * 1.4; // per bend minutes
    const hole_time = (features.holes || 0) * 0.45;
    const thickness_mm = part_config.sheet_thickness_mm ?? 1;
    let thickness_multiplier = 1.0;
    if (thickness_mm > 6) {
      thickness_multiplier = 1.35;
    } else if (thickness_mm > 3) {
      thickness_multiplier = 1.2;
    }
    return (cutting_time + bend_time + hole_time) * thickness_multiplier;
  }

  /**
   * Calculate finish cost based on finish types and geometry
   */
  private async calculateFinishCost(
    finish_ids: string[],
    geometry?: GeometryMetrics,
  ): Promise<number> {
    let total_cost = 0;

    for (const finish_id of finish_ids) {
      const finish = await this.getFinishById(finish_id);
      if (!finish) continue;

      if (finish.cost_per_part) {
        total_cost += finish.cost_per_part;
      } else if (finish.cost_per_area && geometry) {
        total_cost += finish.cost_per_area * geometry.surface_area;
      }
    }

    return total_cost;
  }

  /**
   * Calculate quantity discount based on quantity and process
   */
  private calculateQuantityDiscount(quantity: number, process_type: ContractsV1.ProcessType): number {
    // Quantity break tiers
    const breaks = {
      cnc_milling: [
        { min_qty: 1, discount: 0 },
        { min_qty: 5, discount: 0.05 },
        { min_qty: 10, discount: 0.10 },
        { min_qty: 25, discount: 0.15 },
        { min_qty: 50, discount: 0.20 },
        { min_qty: 100, discount: 0.25 },
      ],
      cnc_turning: [
        { min_qty: 1, discount: 0 },
        { min_qty: 10, discount: 0.08 },
        { min_qty: 25, discount: 0.15 },
        { min_qty: 50, discount: 0.22 },
        { min_qty: 100, discount: 0.30 },
      ],
      sheet_metal: [
        { min_qty: 1, discount: 0 },
        { min_qty: 25, discount: 0.10 },
        { min_qty: 50, discount: 0.18 },
        { min_qty: 100, discount: 0.25 },
        { min_qty: 250, discount: 0.30 },
      ],
    };

    const process_breaks = breaks[process_type] || breaks.cnc_milling;
    
    // Find the highest discount tier the quantity qualifies for
    let discount = 0;
    for (const tier of process_breaks) {
      if (quantity >= tier.min_qty) {
        discount = tier.discount;
      }
    }

    return discount;
  }

  private async loadRiskSnapshot(part_config: ContractsV1.PartConfigV1): Promise<PricingRiskSnapshot | null> {
    const orgId = (part_config as any).org_id ?? (part_config as any).organization_id;
    const quoteId = part_config.quote_id;
    const lineId = part_config.id;

    if (!orgId || !quoteId || !lineId) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('dfm_risk_results')
        .select('risk_vector, score, severity, issue_tags, config_version, process')
        .eq('org_id', orgId)
        .eq('quote_id', quoteId)
        .eq('line_id', lineId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.warn(
          `Failed to load risk snapshot for part=${lineId} quote=${quoteId}: ${error.message}`,
        );
        return null;
      }

      if (!data) {
        return null;
      }

      const record = data as PersistedRiskResult;
      const vector = this.normalizeRiskVector(record.risk_vector);
      const weights = await this.loadRiskWeights(record.config_version, record.process || part_config.process_type);
      const contributions = this.calculateRiskContributions(weights, vector);
      const markupMultiplier = Number((1 + (RISK_SEVERITY_MARKUP[record.severity] ?? 0)).toFixed(3));

  const tags = Array.isArray(record.issue_tags) ? record.issue_tags : [];

      return {
        vector,
        score: Number(record.score ?? 0),
        severity: record.severity,
        contributions,
        markupMultiplier,
        tags,
      };
    } catch (error) {
      this.logger.warn(
        `Unexpected error loading risk snapshot for part=${part_config.id}: ${(error as Error)?.message}`,
      );
      return null;
    }
  }

  private serializeRiskSnapshot(snapshot: PricingRiskSnapshot) {
    return {
      severity: snapshot.severity,
      score: snapshot.score,
      markup: snapshot.markupMultiplier,
      contributions: snapshot.contributions,
      tags: snapshot.tags,
      vector: snapshot.vector,
    };
  }

  private async loadRiskWeights(
    configId: string | null | undefined,
    process: string,
  ): Promise<Record<string, number>> {
    if (configId) {
      try {
        const { data, error } = await this.supabase.client
          .from('dfm_risk_configs')
          .select('weights_json')
          .eq('id', configId)
          .maybeSingle();

        if (!error && data?.weights_json) {
          return data.weights_json as Record<string, number>;
        }
      } catch (error) {
        this.logger.debug(
          `Failed loading risk config by id=${configId}: ${(error as Error)?.message}`,
        );
      }
    }

    try {
      const { data, error } = await this.supabase.client
        .from('dfm_risk_configs')
        .select('weights_json')
        .eq('process', process)
        .order('effective_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.debug(
          `Failed loading risk config for process=${process}: ${error.message}`,
        );
        return {};
      }

      return data?.weights_json as Record<string, number> ?? {};
    } catch (error) {
      this.logger.debug(
        `Unexpected error loading risk config for process=${process}: ${(error as Error)?.message}`,
      );
      return {};
    }
  }

  private calculateRiskContributions(
    weights: Record<string, number>,
    vector: RiskVector,
  ): RiskContribution[] {
    const weightSum = RISK_DIMENSIONS.reduce(
      (sum, dimension) => sum + Number(weights?.[dimension] ?? 0),
      0,
    );
    const safeWeightSum = weightSum > 0 ? weightSum : 1;

    return RISK_DIMENSIONS.map((dimension) => {
      const weight = Number(weights?.[dimension] ?? 0);
      const value = Number(vector?.[dimension] ?? 0);
      const scoreComponent = Number(((100 * weight * value) / safeWeightSum).toFixed(2));
      return {
        dimension,
        weight: Number(weight.toFixed(4)),
        value: Number(value.toFixed(4)),
        scoreComponent,
      };
    });
  }

  private normalizeRiskVector(raw: unknown): RiskVector {
    if (!raw || typeof raw !== 'object') {
      return ZERO_RISK_VECTOR;
    }

    const safe = (value: unknown) => {
      const num = Number(value);
      return Number.isFinite(num) ? Number(num.toFixed(4)) : 0;
    };

    const vector = raw as Partial<RiskVector>;
    return {
      thin_walls: safe(vector.thin_walls),
      deep_pockets: safe(vector.deep_pockets),
      small_holes: safe(vector.small_holes),
      tight_tolerances: safe(vector.tight_tolerances),
      material_hardness: safe(vector.material_hardness),
    };
  }

  /**
   * Calculate lead times based on process and priority
   */
  private calculateLeadTimes(
    process_type: ContractsV1.ProcessType,
    priority?: 'standard' | 'expedited' | 'rush',
  ): { standard: number; expedited: number } {
    const base_lead_times = {
      cnc_milling: { standard: 7, expedited: 3 },
      cnc_turning: { standard: 5, expedited: 2 },
      sheet_metal: { standard: 5, expedited: 2 },
      injection_molding: { standard: 14, expedited: 7 },
    };

    return base_lead_times[process_type] || { standard: 7, expedited: 3 };
  }

  private safeNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private roundNumber(value: number, decimals = 3): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  // Helper methods to fetch data from Supabase
  private async getMaterialById(
    material_id: string,
    region?: MaterialRegion,
  ): Promise<MaterialCatalogItem | null> {
    const identifier = (material_id ?? '').trim();
    if (!identifier) {
      return null;
    }

    const normalizedRegion = this.normalizeMaterialRegion(region);
    const cacheKey = this.buildMaterialCacheKey(identifier, normalizedRegion);
    const cached = this.materialCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const row = await this.fetchMaterialRow(identifier, true);
    let material: MaterialCatalogItem | null = null;

    if (row) {
      material = this.mapMaterialRow(row, normalizedRegion);
    } else {
      material = this.buildFallbackMaterial(identifier);
    }

    if (!material) {
      return null;
    }

    this.materialCache.set(cacheKey, {
      value: material,
      expiresAt: Date.now() + PricingEngineV2Service.MATERIAL_CACHE_TTL_MS,
    });

    if (this.materialCache.size > PricingEngineV2Service.MATERIAL_CACHE_MAX_ENTRIES) {
      const oldest = this.materialCache.keys().next().value;
      if (oldest) {
        this.materialCache.delete(oldest);
      }
    }

    return material;
  }

  private buildMaterialCacheKey(materialId: string, region?: MaterialRegion): string {
    return `${materialId.toLowerCase()}::${region ?? 'default'}`;
  }

  private async fetchMaterialRow(
    identifier: string,
    allowAliasLookup: boolean,
  ): Promise<PricingMaterialRow | null> {
    if (!this.supabase?.client) {
      return null;
    }

    const select = `
      id,
      code,
      category_id,
      name,
      processes,
      available_regions,
      density_kg_m3,
      cost_per_kg_base,
      is_active,
      category:material_categories ( id, code, name ),
      region_multipliers:material_region_multipliers ( region, multiplier )
    `;

    const trimmed = identifier.trim();
    const client = this.supabase.client;
    const query = client.from('material_properties').select(select).limit(1);

    const isUuid = PricingEngineV2Service.UUID_REGEX.test(trimmed);
    const { data, error } = isUuid
      ? await query.eq('id', trimmed).maybeSingle()
      : await query.eq('code', trimmed.toUpperCase()).maybeSingle();

    if (error && error.code !== 'PGRST116') {
      this.logger.warn(`Failed to fetch material ${identifier}: ${error.message}`);
    }

    if (data) {
      return data as unknown as PricingMaterialRow;
    }

    if (!allowAliasLookup || isUuid) {
      return null;
    }

    const aliasMatch = await this.lookupMaterialAlias(trimmed);
    if (!aliasMatch) {
      return null;
    }

    return this.fetchMaterialRow(aliasMatch, false);
  }

  private async lookupMaterialAlias(alias: string): Promise<string | null> {
    if (!this.supabase?.client) {
      return null;
    }

    const candidates = new Set<string>([
      alias,
      alias.toUpperCase(),
      alias.toLowerCase(),
    ]);

    for (const candidate of candidates) {
      const { data, error } = await this.supabase.client
        .from('material_aliases')
        .select('material_id')
        .eq('alias', candidate)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        this.logger.warn(`Failed alias lookup for material ${alias}: ${error.message}`);
        continue;
      }

      if (data?.material_id) {
        return data.material_id;
      }
    }

    return null;
  }

  private mapMaterialRow(row: PricingMaterialRow, region?: MaterialRegion): MaterialCatalogItem {
    const processes = this.normalizeProcesses(row.processes);
    const baseCost = Number(row.cost_per_kg_base ?? 0);
    const multiplier = this.resolveRegionMultiplier(row.region_multipliers, region);
    const appliedCost = Number((baseCost * multiplier).toFixed(4));
  const density = Number(row.density_kg_m3 ?? 0);
  const categoryNode = Array.isArray(row.category) ? row.category[0] : row.category;
  const categorySource = categoryNode?.code ?? row.category_id ?? 'uncategorized';
    const category = typeof categorySource === 'string' ? categorySource : 'uncategorized';

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: category.toLowerCase(),
      cost_per_kg: appliedCost,
      base_cost_per_kg: Number(baseCost.toFixed(4)),
      region_multiplier: multiplier,
      density,
      availability: Boolean(row.is_active),
      lead_time_days: this.estimateMaterialLeadTime(region),
      processes,
    };
  }

  private resolveRegionMultiplier(
    multipliers: PricingMaterialRow['region_multipliers'],
    region?: MaterialRegion,
  ): number {
    if (!region || !Array.isArray(multipliers) || multipliers.length === 0) {
      return 1;
    }

    const match = multipliers.find((entry) => {
      if (!entry || typeof entry.region !== 'string') {
        return false;
      }
      return entry.region.trim().toUpperCase() === region;
    });

    const multiplier = match?.multiplier;
    if (multiplier !== undefined && multiplier !== null) {
      const value = Number(multiplier);
      if (Number.isFinite(value) && value > 0) {
        return Number(value.toFixed(4));
      }
    }

    return 1;
  }

  private normalizeProcesses(values: string[] | null | undefined): ContractsV1.ProcessType[] {
    if (!Array.isArray(values)) {
      return ['cnc_milling', 'cnc_turning', 'sheet_metal'];
    }

    const allowed: Record<string, ContractsV1.ProcessType> = {
      cnc_milling: 'cnc_milling',
      milling: 'cnc_milling',
      cnc_turning: 'cnc_turning',
      turning: 'cnc_turning',
      sheet_metal: 'sheet_metal',
      sheet_metal_laser: 'sheet_metal_laser',
      sheet_metal_brake: 'sheet_metal_brake',
    };

    const normalized = new Set<ContractsV1.ProcessType>();
    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }
      const key = value.trim().toLowerCase();
      const mapped = allowed[key];
      if (mapped) {
        normalized.add(mapped);
      }
    }

    if (normalized.size === 0) {
      normalized.add('cnc_milling');
    }

    return Array.from(normalized);
  }

  private estimateMaterialLeadTime(region?: MaterialRegion): number {
    switch (region) {
      case 'EU':
      case 'UK':
        return 4;
      case 'IN':
        return 5;
      case 'CA':
        return 3;
      case 'AU':
        return 6;
      default:
        return 2;
    }
  }

  private buildFallbackMaterial(materialId: string): MaterialCatalogItem | null {
    if (!materialId) {
      return null;
    }

    const fallback: MaterialCatalogItem = {
      id: materialId,
      code: 'AL_6061_T6',
      name: 'Aluminum 6061-T6',
      category: 'aluminum',
      cost_per_kg: 4.5,
      base_cost_per_kg: 4.5,
      region_multiplier: 1,
      density: 2700,
      availability: true,
      lead_time_days: 2,
      processes: ['cnc_milling', 'cnc_turning', 'sheet_metal'],
      isFallback: true,
    };

    this.logger.debug(`Using fallback material mapping for ${materialId}`);
    return fallback;
  }

  private normalizeMaterialRegion(value: unknown): MaterialRegion | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      return undefined;
    }
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }

    if (['US', 'EU', 'IN', 'UK', 'CA', 'AU'].includes(normalized)) {
      return normalized as MaterialRegion;
    }

    const aliasMap: Record<string, MaterialRegion> = {
      USA: 'US',
      UNITED_STATES: 'US',
      UNITED_STATES_OF_AMERICA: 'US',
      EUROPE: 'EU',
      INDIA: 'IN',
      UNITED_KINGDOM: 'UK',
      GREAT_BRITAIN: 'UK',
      CANADA: 'CA',
      AUSTRALIA: 'AU',
    };

    return aliasMap[normalized.replace(/\s+/g, '_')] ?? undefined;
  }

  private resolveMaterialRegion(partConfig: ContractsV1.PartConfigV1): MaterialRegion | undefined {
    const cfg = partConfig as Record<string, any>;
    const candidates: unknown[] = [
      cfg.region,
      cfg.ship_to_region,
      cfg.material_region,
      cfg.shipping_region,
      cfg.customer_region,
      cfg.org_region,
      cfg?.pricing?.region,
    ];

    for (const candidate of candidates) {
      const resolved = this.normalizeMaterialRegion(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return undefined;
  }

  private async getFinishById(finish_id: string): Promise<FinishCatalogItem | null> {
    // Mock data for now
    return {
      id: finish_id,
      name: 'Anodize Type II',
      cost_per_area: 0.15, // per cm²
      lead_time_days: 3,
      processes: ['cnc_milling', 'cnc_turning', 'sheet_metal'],
    };
  }

  private async getMachineRate(process_type: ContractsV1.ProcessType): Promise<number> {
    // Mock machine rates per minute
    const rates = {
      cnc_milling: 1.25,
      cnc_turning: 1.00,
      sheet_metal: 0.75,
      injection_molding: 0.50,
    };

    return rates[process_type] || 1.00;
  }

  private async getSetupCost(process_type: ContractsV1.ProcessType): Promise<number> {
    const setup_costs = {
      cnc_milling: 150,
      cnc_turning: 100,
      sheet_metal: 75,
      injection_molding: 500,
    };

    return setup_costs[process_type] || 100;
  }

  private async getMarginPercentage(process_type: ContractsV1.ProcessType, unit_cost: number): Promise<number> {
    // Dynamic margin based on cost and process
    let base_margin = 0.35; // 35% base margin

    // Adjust margin based on unit cost
    if (unit_cost < 10) base_margin = 0.40;
    else if (unit_cost > 100) base_margin = 0.30;

    return base_margin;
  }

  private async getOrderMinimums(process_type: ContractsV1.ProcessType): Promise<{ quantity: number; value: number }> {
    const minimums = {
      cnc_milling: { quantity: 1, value: 25 },
      cnc_turning: { quantity: 1, value: 25 },
      sheet_metal: { quantity: 5, value: 50 },
      injection_molding: { quantity: 100, value: 500 },
    };

    return minimums[process_type] || { quantity: 1, value: 25 };
  }
}
