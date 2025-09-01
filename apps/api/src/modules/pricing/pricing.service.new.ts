import { Injectable, Logger } from "@nestjs/common";
import { Parser } from "expr-eval";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { CacheService } from "../../lib/cache/cache.service";
import { ManualReviewService } from "../manual-review/manual-review.service";
import {
  PricingProfile,
  PriceResponse,
  CncPriceRequest,
  SheetMetalPriceRequest,
  InjectionMoldingPriceRequest,
  PriceBreakdown,
} from "@cnc-quote/shared";

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly parser = new Parser();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
    private readonly manualReview: ManualReviewService,
  ) {}

  // Calculate CNC price
  async calculateCncPrice(request: CncPriceRequest): Promise<PriceResponse> {
    const {
      machine_id,
      material_id,
      quantity,
      volume_cc,
      surface_area_cm2,
      removed_material_cc,
      features,
      complexity_multiplier,
      is_rush,
    } = request;

    // Get pricing profile
    const profile = await this.getPricingProfile(machine_id);

    // Get material costs (with caching)
    const materialCost = await this.calculateMaterialCost(material_id, volume_cc);
    const machineCost = this.calculateMachineCost(
      removed_material_cc,
      surface_area_cm2,
      features,
      complexity_multiplier,
      profile,
    );

    const setupCost = profile.setup_cost;
    const finishCost = await this.calculateFinishCost(request.finish_ids || []);
    const qaCost = profile.qa_cost_per_part;

    // Apply quantity breaks
    const quantityDiscount = this.calculateQuantityDiscount(quantity, profile);

    // Calculate unit price
    let unitPrice = (materialCost + machineCost + setupCost / quantity + finishCost + qaCost) / (1 - profile.margin);

    // Apply quantity discount
    unitPrice *= 1 - quantityDiscount;

    // Apply rush surcharge
    if (is_rush) {
      unitPrice *= 1 + profile.rush_surcharge;
    }

    // Apply minimum price guardrails
    unitPrice = Math.max(unitPrice, profile.min_price_per_part, profile.min_order_value / quantity);

    const totalPrice = unitPrice * quantity;

    const priceResult: PriceResponse = {
      unit_price: unitPrice,
      total_price: totalPrice,
      min_order_qty: profile.min_order_qty,
      min_order_value: profile.min_order_value,
      breakdown: {
        setup_cost: setupCost,
        machine_cost: machineCost,
        material_cost: materialCost,
        finish_cost: finishCost,
        qa_cost: qaCost,
        margin: profile.margin,
        overhead: profile.overhead,
      },
      currency: "USD",
      lead_time_days: is_rush ? profile.rush_lead_time : profile.standard_lead_time,
      rush_surcharge: is_rush ? profile.rush_surcharge : undefined,
    };

    // Check for manual review triggers
    const needsReview = await this.manualReview.checkQuoteForReview({
      ...request,
      price: totalPrice,
      currency: "USD",
    });

    if (needsReview) {
      return {
        ...priceResult,
        status: "tbd_pending",
      };
    }

    return priceResult;
  }

  // Calculate Sheet Metal price
  async calculateSheetMetalPrice(request: SheetMetalPriceRequest): Promise<PriceResponse> {
    const {
      machine_id,
      material_id,
      quantity,
      thickness_mm,
      cut_length_mm,
      pierces,
      bends,
      nest_utilization,
      is_rush,
    } = request;

    // Get pricing profile
    const profile = await this.getPricingProfile(machine_id);

    // Calculate material cost based on nest utilization
    const sheetArea = await this.calculateSheetArea(thickness_mm, cut_length_mm, nest_utilization);
    const materialCost = await this.calculateMaterialCost(material_id, sheetArea * thickness_mm);

    // Calculate machine time
    const cutTime = cut_length_mm / profile.cutting_speed_mm_min + (pierces * profile.pierce_time_s) / 60;
    const bendTime = bends ? (bends * profile.bend_time_s) / 60 : 0;
    const machineCost = ((cutTime + bendTime) * profile.machine_rate_per_hour) / 60;

    // Rest of calculations
    const setupCost = profile.setup_cost;
    const finishCost = await this.calculateFinishCost(request.finish_ids || []);
    const qaCost = profile.qa_cost_per_part;

    // Calculate unit price
    let unitPrice = (materialCost + machineCost + setupCost / quantity + finishCost + qaCost) / (1 - profile.margin);

    // Apply minimum price guardrails
    unitPrice = Math.max(unitPrice, profile.min_price_per_part, profile.min_order_value / quantity);

    const totalPrice = unitPrice * quantity;

    const priceResult: PriceResponse = {
      unit_price: unitPrice,
      total_price: totalPrice,
      min_order_qty: profile.min_order_qty,
      min_order_value: profile.min_order_value,
      breakdown: {
        setup_cost: setupCost,
        machine_cost: machineCost,
        material_cost: materialCost,
        finish_cost: finishCost,
        qa_cost: qaCost,
        margin: profile.margin,
        overhead: profile.overhead,
      },
      currency: "USD",
      lead_time_days: is_rush ? profile.rush_lead_time : profile.standard_lead_time,
      rush_surcharge: is_rush ? profile.rush_surcharge : undefined,
    };

    // Check for manual review triggers
    const needsReview = await this.manualReview.checkQuoteForReview({
      ...request,
      price: totalPrice,
      currency: "USD",
    });

    if (needsReview) {
      return {
        ...priceResult,
        status: "tbd_pending",
      };
    }

    return priceResult;
  }

  // Calculate Injection Molding price
  async calculateInjectionMoldingPrice(request: InjectionMoldingPriceRequest): Promise<PriceResponse> {
    const {
      machine_id,
      material_id,
      quantity,
      part_volume_cc,
      shot_weight_g,
      cycle_time_s,
      cavity_count,
      tonnage_required,
      cooling_time_s,
      is_rush,
    } = request;

    // Get pricing profile
    const profile = await this.getPricingProfile(machine_id);

    // Validate tonnage
    if (tonnage_required > profile.max_tonnage) {
      throw new Error("Required tonnage exceeds machine capacity");
    }

    // Calculate material cost per part
    const materialCost = await this.calculateMaterialCost(material_id, shot_weight_g / 1000);

    // Calculate machine time
    const totalCycleTime = cycle_time_s + cooling_time_s;
    const partsPerHour = (3600 / totalCycleTime) * cavity_count;
    const machineCost = profile.machine_rate_per_hour / partsPerHour;

    // Rest of calculations
    const setupCost = profile.setup_cost;
    const finishCost = await this.calculateFinishCost(request.finish_ids || []);
    const qaCost = profile.qa_cost_per_part;

    // Calculate unit price
    let unitPrice = (materialCost + machineCost + setupCost / quantity + finishCost + qaCost) / (1 - profile.margin);

    // Apply minimum price guardrails
    unitPrice = Math.max(unitPrice, profile.min_price_per_part, profile.min_order_value / quantity);

    const totalPrice = unitPrice * quantity;

    const priceResult: PriceResponse = {
      unit_price: unitPrice,
      total_price: totalPrice,
      min_order_qty: profile.min_order_qty,
      min_order_value: profile.min_order_value,
      breakdown: {
        setup_cost: setupCost,
        machine_cost: machineCost,
        material_cost: materialCost,
        finish_cost: finishCost,
        qa_cost: qaCost,
        margin: profile.margin,
        overhead: profile.overhead,
      },
      currency: "USD",
      lead_time_days: is_rush ? profile.rush_lead_time : profile.standard_lead_time,
      rush_surcharge: is_rush ? profile.rush_surcharge : undefined,
    };

    // Check for manual review triggers
    const needsReview = await this.manualReview.checkQuoteForReview({
      ...request,
      price: totalPrice,
      currency: "USD",
    });

    if (needsReview) {
      return {
        ...priceResult,
        status: "tbd_pending",
      };
    }

    return priceResult;
  }

  // Helper methods
  private async getPricingProfile(machineId: string): Promise<PricingProfile> {
    const cacheKey = `pricing_profile:${machineId}`;

    // Try to get from cache first
    const cached = await this.cache.get<PricingProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const { data: profile } = await this.supabase.client
      .from("pricing_profiles")
      .select(
        `
        *,
        quantity_breaks (
          min_qty,
          discount
        )
      `,
      )
      .eq("machine_id", machineId)
      .single();

    if (!profile) {
      throw new Error("No pricing profile found for machine");
    }

    // Cache for 1 hour (3600 seconds)
    await this.cache.set(cacheKey, profile, 3600);

    return profile;
  }

  private async calculateMaterialCost(materialId: string, volume: number): Promise<number> {
    // TODO: Get material price from database
    return volume * 0.1; // Example price per cc
  }

  private calculateMachineCost(
    removedMaterial: number,
    surfaceArea: number,
    features: CncPriceRequest["features"],
    complexityMultiplier: number,
    profile: PricingProfile,
  ): number {
    const baseTime =
      removedMaterial * profile.material_removal_rate_cc_min + surfaceArea * profile.surface_finish_rate_cm2_min;
    const featureTime =
      features.holes * profile.feature_times.hole +
      features.pockets * profile.feature_times.pocket +
      features.slots * profile.feature_times.slot +
      features.faces * profile.feature_times.face;

    const totalTime = (baseTime + featureTime) * complexityMultiplier;
    return (totalTime / 60) * profile.machine_rate_per_hour;
  }

  private async calculateFinishCost(finishIds: string[]): Promise<number> {
    // TODO: Get finish costs from database
    return finishIds.length * 5; // Example $5 per finish
  }

  private calculateQuantityDiscount(quantity: number, profile: PricingProfile): number {
    const break_ = [...profile.quantity_breaks].reverse().find((b) => quantity >= b.min_qty);
    return break_ ? break_.discount : 0;
  }

  private async calculateSheetArea(thickness: number, cutLength: number, nestUtilization: number): Promise<number> {
    return (cutLength * cutLength) / nestUtilization;
  }
}
