import { Controller, Post, Body, UseGuards, Req, Query, Res, BadRequestException, Logger, Get, Param, NotFoundException } from "@nestjs/common";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { PricingService } from "./pricing.service";
import { PricingEngineV2Service, PricingEngineResponse } from "./pricing-engine-v2.service";
import { PricingPersistenceService } from "./pricing-persistence.service";
import { diffPricingMatrix, computeSelectedSubtotalDelta } from "./pricing-diff.util";
import { PricingCacheService, CacheResult } from "../../../lib/pricing-core/cache.service";
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { OrgGuard } from "../../core/auth/org.guard";
import { Roles } from "../../core/auth/roles.decorator";
import { RolesGuard } from "../../core/auth/roles.guard";
import { PoliciesGuard } from "../../core/auth/policies.guard";
import { Policies } from "../../core/auth/policies.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { PartConfigV1 } from "../../../../../packages/shared/src/contracts/v1";
import { ProcessRecommendationBundle } from "@cnc-quote/shared";
import {
  PricingResponse,
  CncPricingRequest,
  SheetMetalPricingRequest,
  InjectionMoldingPricingRequest
} from "./price-request.types";
import { ProcessRecommendationService } from "./process-recommendation/process-recommendation.service";
import { PricingRationaleSummaryService } from "./pricing-rationale-summary.service";

// Type alias to reduce union repetition per lint suggestion
type LegacyPricingRequest = CncPricingRequest | SheetMetalPricingRequest | InjectionMoldingPricingRequest;

type PricingV2RequestEnvelope = {
  part_config: PartConfigV1;
  geometry?: any;
  quantities: number[];
};

interface CachedPricingPayload {
  pricing: PricingEngineResponse;
  compute_ms: number;
  computed_at: string;
  orchestrator_version: string;
  pricing_factors_version: string;
  catalog_version: string;
  debug?: {
    orchestratorVersion: string | undefined;
    logs: string[];
    factorKeys: string[];
  };
}

interface BuildHashPayloadArgs {
  orgId: string;
  request: PricingV2RequestEnvelope;
  catalogVersion: string;
  pricingFactorsVersion: string;
  shipToRegion?: string | null;
}

type RecommendationPricingSummary = {
  quantity: number;
  unit_price?: number;
  lead_time_days?: number;
  currency?: string;
} | null;

@ApiTags("pricing")
@Controller("price")
@UseGuards(JwtAuthGuard, OrgGuard, PoliciesGuard)
@ApiBearerAuth()
export class PricingController {
  private readonly catalogVersion: string;
  private readonly logger = new Logger(PricingController.name);

  constructor(
    private readonly pricingService: PricingService,
    private readonly pricingEngineV2: PricingEngineV2Service,
    private readonly pricingPersistence: PricingPersistenceService,
    private readonly pricingCache: PricingCacheService,
    private readonly processRecommendation: ProcessRecommendationService,
    private readonly pricingRationaleSummary: PricingRationaleSummaryService,
    private readonly configService: ConfigService,
  ) {
    this.catalogVersion = this.configService.get<string>("CATALOG_VERSION") ?? "unversioned";
  }

  @Post()
  @ApiOperation({
    summary: "Calculate price for a quote",
    description: "Calculate pricing based on process type, materials, quantities, and other factors"
  })
  @ApiResponse({
    status: 200,
    description: "Price calculation successful",
    schema: {
      type: "object",
      properties: {
        unit_price: { type: "number" },
        total_price: { type: "number" },
        min_order_qty: { type: "number" },
        min_order_value: { type: "number" },
        breakdown: {
          type: "object",
          properties: {
            setup_cost: { type: "number" },
            machine_cost: { type: "number" },
            material_cost: { type: "number" },
            finish_cost: { type: "number" },
            qa_cost: { type: "number" },
            margin: { type: "number" },
            overhead: { type: "number" }
          }
        },
        currency: { type: "string" },
        lead_time_days: { type: "number" },
        rush_surcharge: { type: "number" },
        status: { type: "string", enum: ["quoted", "tbd_pending"] },
        explanations: { type: "array", items: { type: "string" } },
        quantity_breaks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              min_qty: { type: "number" },
              max_qty: { type: "number" },
              unit_price: { type: "number" },
              discount_percentage: { type: "number" }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: "Invalid pricing request" })
  @Policies({ action: 'view', resource: 'pricing' })
  async calculatePrice(
    @Req() req: any,
    @Body() request: LegacyPricingRequest,
  ): Promise<PricingResponse> {
    switch (request.process_type) {
      case "milling":
      case "turning":
        return this.pricingService.calculateCncPrice({ ...request, org_id: req.rbac?.orgId });

      case "laser_cutting":
      case "press_brake":
        return this.pricingService.calculateSheetMetalPrice({ ...request, org_id: req.rbac?.orgId });

      case "injection":
        return this.pricingService.calculateInjectionMoldingPrice({ ...request, org_id: req.rbac?.orgId });

      default:
        throw new Error(`Unsupported process type: ${(request as any).process_type}`);
    }
  }

  // === Real-time pricing endpoints ===

  @Get('quotes/:quoteId/rationale')
  @ApiOperation({
    summary: 'Retrieve pricing rationale summary',
    description: 'Returns the advisory pricing rationale summary and deterministic cost sheet snapshot if available',
  })
  @ApiResponse({ status: 200, description: 'Rationale summary ready' })
  @ApiResponse({ status: 404, description: 'Rationale summary not available' })
  @Policies({ action: 'view', resource: 'pricing' })
  async getQuoteRationale(@Req() req: any, @Param('quoteId') quoteId: string) {
    const orgId = req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException('Missing organization context for pricing rationale request');
    }

    const payload = await this.pricingRationaleSummary.getSummary({ quoteId, orgId });
    if (!payload) {
      throw new NotFoundException('Pricing rationale not available');
    }

    return {
      quoteId,
      advisory: payload.summary,
      costSheet: payload.costSheet,
    };
  }

  @Post('v2/calculate')
  @ApiOperation({
    summary: "Calculate pricing using v2 engine",
    description: "Modern pricing calculation with quantity breaks and unified config"
  })
  @ApiResponse({
    status: 200,
    description: "Pricing calculated successfully",
    schema: {
      type: "object",
      properties: {
        pricing: { type: "object" },
        calculation_time_ms: { type: "number" },
        timestamp: { type: "string" }
      }
    }
  })
  @Policies({ action: 'view', resource: 'pricing' })
  async calculateV2Pricing(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { 
      part_config: PartConfigV1; 
      geometry_data?: any; 
      quantities?: number[];
      shipTo?: { country: string; state?: string; city?: string; postalCode?: string };
      customerType?: 'B2B' | 'B2C';
      vatNumber?: string;
    },
    @Query('debug') debug?: string,
    @Query('include_recommendations') includeRecommendations?: string,
    @Query('calculate_tax') calculateTax?: string,
  ) {
    const orgId = req.rbac?.orgId;
    if (!orgId) {
      throw new BadRequestException("Missing organization context for pricing request");
    }

    const debugEnabled = this.parseBoolean(debug);
    const bustRequested = this.parseBoolean(req.headers?.["x-cache-bust"]);
    const traceId = this.extractTraceId(req);
    const quantities = Array.isArray(body.quantities) && body.quantities.length ? body.quantities : [1, 10, 50, 100];
    const includeRecommendationsFlag = this.parseBoolean(includeRecommendations);
    const calculateTaxFlag = this.parseBoolean(calculateTax);

    const requestEnvelope = {
      part_config: body.part_config,
      geometry: body.geometry_data,
      quantities,
      calculateTax: calculateTaxFlag,
      shipTo: body.shipTo,
      customerType: body.customerType,
      vatNumber: body.vatNumber,
    };

    const cacheVersion = this.buildCacheVersion();
    const shipRegion = this.resolveShipRegion(req, body.part_config);
    const hashPayload = this.buildHashPayload({
      orgId,
      request: requestEnvelope,
      catalogVersion: this.catalogVersion,
      pricingFactorsVersion: this.pricingEngineV2.getPricingFactorsVersion(),
      shipToRegion: shipRegion,
    });

    const sensitive = this.isSensitivePart(body.part_config);
    let bypassReason: string | undefined;
    if (debugEnabled) {
      bypassReason = "debug";
    } else if (sensitive) {
      bypassReason = "sensitivity";
    }
    const cacheResult = await this.pricingCache.withCache({
      orgId,
      version: cacheVersion,
      request: hashPayload,
      traceId,
      control: {
        bust: bustRequested,
        bypass: debugEnabled || sensitive,
        cacheable: !debugEnabled && !sensitive,
        hotPath: true,
      },
      compute: async () => this.computePricingPayload(requestEnvelope, debugEnabled),
    });

    this.decorateCacheHeaders(res, cacheResult, cacheVersion, bypassReason);

    const payload =
      cacheResult.response ??
      (await this.computePricingPayload(requestEnvelope, debugEnabled));

    let recommendation: ProcessRecommendationBundle | null = null;
    if (includeRecommendationsFlag) {
      try {
        const selectedQuantity =
          typeof body.part_config?.selected_quantity === "number" && body.part_config.selected_quantity > 0
            ? body.part_config.selected_quantity
            : quantities[0];
        const pricingSummary = this.buildRecommendationPricingSummary(payload.pricing, selectedQuantity);
        recommendation = await this.processRecommendation.recommend({
          orgId,
          partConfig: body.part_config,
          geometryData: body.geometry_data,
          quoteId: body.part_config.quote_id ?? null,
          lineId: body.part_config.id ?? null,
          traceId,
          pricingSummary,
        });
      } catch (error) {
        this.logger.warn(`Process recommendation failed: ${(error as Error)?.message ?? error}`);
      }
    }

    return this.buildPricingResponse(payload, cacheResult, {
      cacheVersion,
      cacheStatus: cacheResult.status,
      source: cacheResult.source,
      debugEnabled,
      traceId,
      bypassReason,
    }, {
      includeRecommendation: includeRecommendationsFlag,
      recommendation,
    });
  }

  private parseBoolean(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      switch (value.trim().toLowerCase()) {
        case "1":
        case "true":
        case "yes":
        case "y":
        case "on":
          return true;
        default:
          return false;
      }
    }
    return false;
  }

  private buildRecommendationPricingSummary(pricing: PricingEngineResponse, quantity: number): RecommendationPricingSummary {
    const matrix = Array.isArray((pricing as any)?.pricing_matrix) ? (pricing as any).pricing_matrix : [];
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return null;
    }
    const targetRow = matrix.find((row: any) => typeof row?.quantity === "number" && row.quantity === quantity) ?? matrix[0];
    if (!targetRow) {
      return null;
    }
    return {
      quantity: typeof targetRow.quantity === "number" ? targetRow.quantity : quantity,
      unit_price: typeof targetRow.unit_price === "number" ? targetRow.unit_price : undefined,
      lead_time_days: typeof targetRow.lead_time_days === "number" ? targetRow.lead_time_days : undefined,
      currency: typeof pricing?.currency === "string" ? pricing.currency : undefined,
    };
  }

  private extractTraceId(req: any): string | undefined {
    if (typeof req?.traceId === "string" && req.traceId.length > 0) {
      return req.traceId;
    }
    if (typeof req?.requestId === "string" && req.requestId.length > 0) {
      return req.requestId;
    }
    const headerKeys = ["x-trace-id", "x-request-id", "traceparent"];
    for (const key of headerKeys) {
      const value = req?.headers?.[key];
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === "string") {
          return value[0];
        }
      } else if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }

  private buildCacheVersion(): string {
    return [
      this.catalogVersion,
      this.pricingEngineV2.getOrchestratorVersion(),
      this.pricingEngineV2.getPricingFactorsVersion(),
    ].join(":");
  }

  private resolveShipRegion(req: any, partConfig: PartConfigV1): string | null {
    const candidates: Array<unknown> = [
      (partConfig as any)?.ship_to_region,
      (partConfig as any)?.shipping?.region,
      req?.headers?.["x-ship-region"],
      req?.headers?.["x-region"],
      req?.rbac?.region,
      req?.org?.region,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const [first] = candidate;
        if (typeof first === "string" && first.length > 0) {
          return first;
        }
      } else if (typeof candidate === "string" && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }

  private buildHashPayload(args: BuildHashPayloadArgs): Record<string, unknown> {
    const { orgId, request, catalogVersion, pricingFactorsVersion, shipToRegion } = args;
    const { part_config, geometry, quantities } = request;
    const materialCode = this.resolveMaterialCode(part_config);
    const finishes = this.extractFinishes(part_config);
    const tolerances = this.extractTolerances(part_config);
    const featureDigest = this.extractFeaturesDigest(geometry);

    return {
      org_id: orgId,
      catalog_version: catalogVersion,
      pricing_factors_version: pricingFactorsVersion,
      part: this.buildPartDigest(part_config, geometry),
      process: part_config.process_type,
      material: materialCode,
      lead_time_option: (part_config as any)?.lead_time ?? part_config.lead_time_option ?? null,
      quantities,
      finishes,
      tolerances,
  ship_to_region: shipToRegion ?? null,
      features: featureDigest,
      revision_id: (part_config as any)?.revision_id ?? null,
      vendor_constraints: (part_config as any)?.vendor_constraints ?? null,
    };
  }

  private resolveMaterialCode(partConfig: PartConfigV1): string | undefined {
    const materialFields = [
      (partConfig as any)?.material_code,
      (partConfig as any)?.material_id,
      (partConfig as any)?.material?.id,
      partConfig.material_spec,
    ];
    for (const value of materialFields) {
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }

  private extractFinishes(partConfig: PartConfigV1): string[] {
    const finishes: string[] = [];
    const pushValue = (value: unknown) => {
      if (typeof value === "string" && value.length > 0) {
        finishes.push(value);
      }
    };

    const finishFields = [
      (partConfig as any)?.finishes,
      (partConfig as any)?.finish_ids,
      (partConfig as any)?.secondary_operations,
    ];
    for (const field of finishFields) {
      if (Array.isArray(field)) {
        field.forEach(pushValue);
      } else {
        pushValue(field);
      }
    }

  return Array.from(new Set(finishes)).sort((a, b) => a.localeCompare(b));
  }

  private extractTolerances(partConfig: PartConfigV1): string[] {
    const tolerances = new Set<string>();
    const fields = [
      partConfig.tolerances,
      (partConfig as any)?.tolerance_ids,
      (partConfig as any)?.gd_tolerances,
    ];
    for (const field of fields) {
      if (Array.isArray(field)) {
        field.filter((item): item is string => typeof item === "string").forEach((item) => tolerances.add(item));
      }
    }
    const toleranceClass = (partConfig as any)?.tolerance_class;
    if (typeof toleranceClass === "string" && toleranceClass.length > 0) {
      tolerances.add(toleranceClass);
    }
  return Array.from(tolerances).sort((a, b) => a.localeCompare(b));
  }

  private extractFeaturesDigest(geometry: any): Record<string, unknown> | null {
    if (!geometry || typeof geometry !== "object") {
      return null;
    }

    const metrics: any = geometry?.metrics ?? geometry;
    if (!metrics || typeof metrics !== "object") {
      return null;
    }

    const digest: Record<string, unknown> = {};
    const assignIfFinite = (key: string, value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        digest[key] = value;
      }
    };

    assignIfFinite("volume_cc", metrics?.volume_cc ?? metrics?.volume);
    assignIfFinite("surface_area_cm2", metrics?.surface_area_cm2 ?? metrics?.surface_area);
    assignIfFinite("bounding_box_volume_cm3", metrics?.bounding_box_volume_cm3 ?? metrics?.bounding_box_volume);
    assignIfFinite("thin_wall_ratio", metrics?.thin_wall_ratio);
    assignIfFinite("long_aspect_ratio", metrics?.long_aspect_ratio);
    assignIfFinite("feature_count", metrics?.feature_count);

    const geometryAny: any = geometry;
    const checksum = geometryAny?.checksum ?? geometryAny?.hash;
    if (typeof checksum === "string" && checksum.length > 0) {
      digest.checksum = checksum;
    }

    return Object.keys(digest).length > 0 ? digest : null;
  }

  private buildPartDigest(partConfig: PartConfigV1, geometry: any): Record<string, unknown> {
    const digest: Record<string, unknown> = {
      part_id: (partConfig as any)?.id ?? null,
      file_id: (partConfig as any)?.file_id ?? null,
      material: this.resolveMaterialCode(partConfig) ?? null,
      process: partConfig.process_type,
      lead_time_option: (partConfig as any)?.lead_time ?? partConfig.lead_time_option ?? null,
      thickness_mm: (partConfig as any)?.stock?.thickness_mm ?? (partConfig as any)?.thickness_mm ?? null,
      dimensions_mm: (partConfig as any)?.dimensions ?? null,
    };

    const quantity = (partConfig as any)?.selected_quantity;
    if (typeof quantity === "number" && Number.isFinite(quantity)) {
      digest.selected_quantity = quantity;
    }

    const toleranceClass = (partConfig as any)?.tolerance_class;
    if (typeof toleranceClass === "string" && toleranceClass.length > 0) {
      digest.tolerance_class = toleranceClass;
    }

    const finishes = this.extractFinishes(partConfig);
    if (finishes.length > 0) {
      digest.finishes = finishes;
    }

    const geometryDigest = this.extractFeaturesDigest(geometry);
    if (geometryDigest) {
      digest.geometry = geometryDigest;
    }

    return digest;
  }

  private isSensitivePart(partConfig: PartConfigV1): boolean {
    const flags = [
      (partConfig as any)?.itar_controlled,
      (partConfig as any)?.sensitive,
      (partConfig as any)?.dfars_required,
      (partConfig as any)?.export_controlled,
    ];
    return flags.some((flag) => this.parseBoolean(flag));
  }

  private async computePricingPayload(
    request: PricingV2RequestEnvelope,
    debugEnabled: boolean,
  ): Promise<CachedPricingPayload> {
    const start = Date.now();
    const pricing = await this.pricingEngineV2.calculatePricing({
      part_config: request.part_config,
      geometry: request.geometry,
      quantities: request.quantities,
      calculateTax: (request as any).calculateTax,
      shipTo: (request as any).shipTo,
      customerType: (request as any).customerType,
      vatNumber: (request as any).vatNumber,
    });
    const elapsed = Date.now() - start;

    const payload: CachedPricingPayload = {
      pricing,
      compute_ms: elapsed,
      computed_at: new Date().toISOString(),
      orchestrator_version: this.pricingEngineV2.getOrchestratorVersion(),
      pricing_factors_version: this.pricingEngineV2.getPricingFactorsVersion(),
      catalog_version: this.catalogVersion,
    };

    if (debugEnabled) {
      const logs = (pricing.pricing_matrix ?? [])
        .flatMap((entry: any) => (Array.isArray(entry?.logs) ? entry.logs : []))
        .filter((log): log is string => typeof log === "string");
      payload.debug = {
        orchestratorVersion: this.pricingEngineV2.getOrchestratorVersion(),
        logs,
        factorKeys: Object.keys(pricing.pricing_matrix?.[0]?.cost_factors ?? {}),
      };
    }

    return payload;
  }

  private decorateCacheHeaders(
    res: Response,
    cacheResult: CacheResult<CachedPricingPayload>,
    cacheVersion: string,
    bypassReason?: string,
  ): void {
  let source: string = cacheResult.source ?? "redis";
    if (cacheResult.status === "miss") {
      source = "compute";
    } else if (cacheResult.status === "bypass") {
      source = bypassReason ?? cacheResult.source ?? "bypass";
    }

    res.setHeader("x-cache", cacheResult.status);
    res.setHeader("x-cache-version", cacheVersion);
    res.setHeader("x-cache-source", source);
    if (cacheResult.hash?.base32) {
      res.setHeader("etag", `W/"${cacheResult.hash.base32}"`);
      res.setHeader("x-cache-hash", cacheResult.hash.base32);
      res.setHeader("x-cache-sha256", cacheResult.hash.sha256Hex);
    }
    if (cacheResult.metadata?.ttlRemainingSeconds !== undefined) {
      res.setHeader("x-cache-ttl", String(cacheResult.metadata.ttlRemainingSeconds));
    }
    if (bypassReason) {
      res.setHeader("x-cache-bypass-reason", bypassReason);
    }

    res.setHeader("cache-control", "private, max-age=0, must-revalidate");
  }

  private buildPricingResponse(
    payload: CachedPricingPayload,
    cacheResult: CacheResult<CachedPricingPayload>,
    context: {
      cacheVersion: string;
      cacheStatus: CacheResult<CachedPricingPayload>["status"];
      source?: string;
      debugEnabled: boolean;
      traceId?: string;
      bypassReason?: string;
    },
    extras?: {
      includeRecommendation?: boolean;
      recommendation?: ProcessRecommendationBundle | null;
    },
  ): Record<string, unknown> {
    let cacheSource: string = cacheResult.source ?? "redis";
    if (cacheResult.status === "miss") {
      cacheSource = "compute";
    } else if (cacheResult.status === "bypass") {
      cacheSource = context.bypassReason ?? cacheResult.source ?? "bypass";
    }

    const response: Record<string, unknown> = {
      pricing: payload.pricing,
      calculation_time_ms: payload.compute_ms,
      timestamp: payload.computed_at,
      meta: {
        orchestrator_version: payload.orchestrator_version,
        pricing_factors_version: payload.pricing_factors_version,
        catalog_version: payload.catalog_version,
        cache_version: context.cacheVersion,
        trace_id: context.traceId ?? null,
      },
      cache: {
        status: cacheResult.status,
        hash: {
          base32: cacheResult.hash.base32,
          sha256: cacheResult.hash.sha256Hex,
        },
        source: cacheSource,
        ttl_remaining_s: cacheResult.metadata?.ttlRemainingSeconds ?? null,
      },
    };

    if (context.debugEnabled && payload.debug) {
      response.debug = payload.debug;
    }

    if (extras?.includeRecommendation) {
      response.process_recommendation = extras.recommendation ?? null;
    }

    return response;
  }

  @Post('v2/batch')
  @ApiOperation({
    summary: "Batch calculate pricing for multiple parts",
    description: "Calculate pricing for multiple part configurations in a single request"
  })
  @ApiResponse({
    status: 200,
    description: "Batch pricing calculated successfully",
    schema: {
      type: "object",
      properties: {
        results: { 
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "number" },
              pricing: { type: "object" },
              error: { type: "string" }
            }
          }
        },
        total_time_ms: { type: "number" },
        successful: { type: "number" },
        failed: { type: "number" }
      }
    }
  })
  @Policies({ action: 'view', resource: 'pricing' })
  async batchCalculateV2Pricing(@Req() req: any, @Body() body: { 
    parts: Array<{ part_config: PartConfigV1; geometry_data?: any; quantities?: number[] }> 
  }) {
    const startTime = Date.now();
    const results: Array<{ index: number; pricing?: any; error?: string }> = [];
    
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 10;
    for (let i = 0; i < body.parts.length; i += BATCH_SIZE) {
      const batch = body.parts.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (part, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const request = {
            part_config: part.part_config,
            geometry: part.geometry_data,
            quantities: part.quantities || [1, 10, 50, 100]
          };
          const pricing = await this.pricingEngineV2.calculatePricing(request);
          return { index: globalIndex, pricing };
        } catch (error) {
          return { index: globalIndex, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    return {
      results,
      total_time_ms: Date.now() - startTime,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('v2/compare')
  @ApiOperation({
    summary: "Compare pricing across different configurations",
    description: "Calculate and compare pricing for different material/finish combinations"
  })
  @ApiResponse({
    status: 200,
    description: "Price comparison completed",
    schema: {
      type: "object",
      properties: {
        base_config: { type: "object" },
        comparisons: {
          type: "array",
          items: {
            type: "object", 
            properties: {
              label: { type: "string" },
              config_changes: { type: "object" },
              pricing: { type: "object" },
              savings_percentage: { type: "number" }
            }
          }
        }
      }
    }
  })
  async comparePricing(@Body() body: {
    base_config: PartConfigV1;
    comparisons: Array<{
      label: string;
      config_changes: Partial<PartConfigV1>;
    }>;
    geometry_data?: any;
    quantities?: number[];
  }) {
    const startTime = Date.now();
    
    const baseRequest = {
      part_config: body.base_config,
      geometry: body.geometry_data,
      quantities: body.quantities || [1, 10, 50, 100]
    };
    
    // Calculate base pricing
    const basePricing = await this.pricingEngineV2.calculatePricing(baseRequest);

    // Calculate comparison pricings
    const comparisons = await Promise.all(
      body.comparisons.map(async (comparison) => {
        const modifiedConfig = { ...body.base_config, ...comparison.config_changes };
        const compareRequest = {
          part_config: modifiedConfig,
          geometry: body.geometry_data,
          quantities: body.quantities || [1, 10, 50, 100]
        };
        
        try {
          const pricing = await this.pricingEngineV2.calculatePricing(compareRequest);

          // Compare first quantity pricing for savings calculation
          const basePrice = (basePricing.pricing_matrix[0] as any)?.total_price || 0;
          const comparePrice = (pricing.pricing_matrix[0] as any)?.total_price || 0;
          
          const savingsPercentage = basePrice > 0 
            ? ((basePrice - comparePrice) / basePrice) * 100
            : 0;

          return {
            label: comparison.label,
            config_changes: comparison.config_changes,
            pricing,
            savings_percentage: savingsPercentage,
          };
        } catch (error) {
          return {
            label: comparison.label,
            config_changes: comparison.config_changes,
            error: error.message,
            savings_percentage: 0,
          };
        }
      })
    );

    return {
      base_config: body.base_config,
      base_pricing: basePricing,
      comparisons,
      calculation_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  // === Realtime batch recalculation (backend authoritative) ===
  @Post('v2/recalculate')
  @ApiOperation({
    summary: 'Batch recalc pricing for existing quote items',
    description: 'Given a quote_id and optional subset of quote_item_ids, recompute pricing matrices, persist, and return minimal patches with subtotal delta.'
  })
  async recalcExistingQuote(@Body() body: { quote_id: string; quote_item_ids?: string[] }) {
    if (!body.quote_id) throw new Error('quote_id required');

    // Fetch current items & configs
    const prevItemsResp: any = await (this as any).supabase?.client
      ?.from('quote_items')
      .select('id, pricing_matrix, config_json')
      .eq('quote_id', body.quote_id);
    if (!prevItemsResp || prevItemsResp.error) throw new Error(prevItemsResp?.error?.message || 'Failed to load items');
    const prevItems = (prevItemsResp.data || []).map(r => ({
      id: r.id,
      matrix: (r.pricing_matrix || []) as any[],
      selected_quantity: r.config_json?.selected_quantity,
      config: r.config_json as PartConfigV1 | undefined
    }));

    const targetItems = body.quote_item_ids?.length ? prevItems.filter(i => body.quote_item_ids!.includes(i.id)) : prevItems;
    const results: any[] = [];

    for (const item of targetItems) {
      if (!item.config) {
        results.push({ quote_item_id: item.id, error: 'missing_config' });
        continue;
      }
      try {
        const quantities = item.config.quantities?.length ? item.config.quantities : [item.config.selected_quantity || 1];
        const engineResp = await this.pricingEngineV2.calculatePricing({
          part_config: item.config,
          geometry: undefined,
          quantities
        } as any);
  const newMatrix = engineResp.pricing_matrix as any[];
        await this.pricingPersistence.persistMatrixAndTotals({
          quote_id: body.quote_id,
          quote_item_id: item.id,
          matrix: newMatrix as any,
          partConfig: item.config,
          traceId: `pricing-recalc:${body.quote_id}:${item.id}:${Date.now()}`,
        });
  const prevMatrix: any[] = item.matrix as any[];
  const patches = diffPricingMatrix(prevMatrix, newMatrix as any);
        const subtotal_delta = computeSelectedSubtotalDelta({
          prevItems: prevItems.map(pi => ({ id: pi.id, matrix: pi.matrix, selected_quantity: pi.selected_quantity })),
          updatedItemId: item.id,
          newMatrix: newMatrix as any,
          newSelectedQuantity: item.config.selected_quantity
        });
        results.push({
          quote_item_id: item.id,
          matrix_patches: patches,
          pricing_version: Date.now(),
          subtotal_delta
        });
      } catch (err: any) {
        results.push({ quote_item_id: item.id, error: err.message });
      }
    }

    return {
      quote_id: body.quote_id,
      results,
      timestamp: new Date().toISOString()
    };
  }

  // === Admin simulation endpoint (lightweight wrapper for UI sandbox) ===
  @Post('admin/simulate')
  @UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
  @Roles('admin', 'org_admin', 'finance', 'reviewer')
  @ApiOperation({
    summary: 'Simulate pricing (admin sandbox)',
    description: 'Allows privileged roles to simulate pricing without persisting quote data.'
  })
  @ApiResponse({ status: 200, description: 'Simulation successful' })
  async simulateAdminPricing(
    @Body()
  body: LegacyPricingRequest & {
      /** Optional override: list of quantities to compute scenario curve */
      quantities?: number[];
      /** When true returns per-quantity matrix using v2 engine for comparison */
      include_v2_matrix?: boolean;
    },
  ) {
    const { quantities = [], include_v2_matrix = false, ...base } = body as any; // base retains dynamic shape

    const simulation = await this.dispatchPrimarySimulation(base as LegacyPricingRequest);
  const baseAny: Record<string, any> = base as unknown as Record<string, any>;
    const v2_matrix = include_v2_matrix
      ? await this.tryBuildV2Matrix(base, quantities, baseAny.quantity)
      : undefined;

    return {
      simulation,
      v2_matrix,
  quantities: quantities.length ? quantities : [ baseAny.quantity ],
      timestamp: new Date().toISOString(),
      engine_versions: { primary: 'legacy_v1', comparison: include_v2_matrix ? 'v2' : undefined },
    };
  }

  private async dispatchPrimarySimulation(
    base: LegacyPricingRequest,
  ): Promise<PricingResponse> {
    const pt = (base as any).process_type;
    if (pt === 'milling' || pt === 'turning') {
      return this.pricingService.calculateCncPrice(base as CncPricingRequest);
    }
    if (pt === 'laser_cutting' || pt === 'press_brake') {
      return this.pricingService.calculateSheetMetalPrice(base as SheetMetalPricingRequest);
    }
    if (pt === 'injection') {
      return this.pricingService.calculateInjectionMoldingPrice(base as InjectionMoldingPricingRequest);
    }
    throw new Error(`Unsupported process_type: ${pt}`);
  }

  private mapLegacyToV2Process(legacy: string): PartConfigV1['process_type'] {
    switch (legacy) {
      case 'milling':
        return 'cnc_milling';
      case 'turning':
        return 'cnc_turning';
      case 'laser_cutting':
      case 'press_brake':
        return 'sheet_metal';
      case 'injection':
        return 'injection_molding' as any; // fallback mapping; adjust if actual enum differs
      default:
        return 'cnc_milling';
    }
  }

  private async tryBuildV2Matrix(
    base: any,
    quantities: number[],
    fallbackQuantity: number,
  ): Promise<any> { // returning generic structure for now
    try {
      const v2Quantities = quantities.length ? quantities : [ fallbackQuantity || 1 ];
      const part_config: PartConfigV1 = {
        process_type: this.mapLegacyToV2Process(base.process_type),
        material: base.material_id || 'material_generic',
        finish: base.finish_ids || [],
        quantities: v2Quantities,
        lead_time: base.is_rush ? 'expedited' : 'standard',
        machining_complexity: 'medium',
      } as any;
      const v2 = await this.pricingEngineV2.calculatePricing({
        part_config,
        geometry: undefined,
        quantities: v2Quantities,
      } as any);
      return v2.pricing_matrix;
    } catch (err: any) {
      return { error: err.message };
    }
  }
}
