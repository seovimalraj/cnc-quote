import { Injectable } from "@nestjs/common";
import { CncPriceRequest, SheetMetalPriceRequest, InjectionMoldingPriceRequest } from "@cnc-quote/shared";
import { z } from "zod";

@Injectable()
export class ValidationService {
  private cncSchema = z.object({
    process_type: z.enum(["milling", "turning"]),
    machine_id: z.string().uuid(),
    material_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    volume_cc: z.number().positive(),
    surface_area_cm2: z.number().positive(),
    removed_material_cc: z.number().nonnegative(),
    features: z.object({
      holes: z.number().int().nonnegative(),
      pockets: z.number().int().nonnegative(),
      slots: z.number().int().nonnegative(),
      faces: z.number().int().nonnegative(),
    }),
    complexity_multiplier: z.number().min(1).max(3),
    finish_ids: z.array(z.string().uuid()).optional(),
    is_rush: z.boolean().optional(),
  });

  private sheetMetalSchema = z.object({
    process_type: z.enum(["laser", "punch", "waterjet"]),
    machine_id: z.string().uuid(),
    material_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    thickness_mm: z.number().positive(),
    cut_length_mm: z.number().positive(),
    pierces: z.number().int().nonnegative(),
    bends: z.number().int().nonnegative().optional(),
    nest_utilization: z.number().min(0).max(1),
    finish_ids: z.array(z.string().uuid()).optional(),
    is_rush: z.boolean().optional(),
  });

  private injectionMoldingSchema = z.object({
    process_type: z.literal("injection_molding"),
    machine_id: z.string().uuid(),
    material_id: z.string().uuid(),
    quantity: z.number().int().min(100), // Minimum order quantity for IM
    part_volume_cc: z.number().positive(),
    shot_weight_g: z.number().positive(),
    cycle_time_s: z.number().positive(),
    cavity_count: z.number().int().positive(),
    tonnage_required: z.number().positive(),
    cooling_time_s: z.number().positive(),
    finish_ids: z.array(z.string().uuid()).optional(),
    is_rush: z.boolean().optional(),
  });

  validateCncRequest(request: CncPriceRequest) {
    return this.cncSchema.parse(request);
  }

  validateSheetMetalRequest(request: SheetMetalPriceRequest) {
    return this.sheetMetalSchema.parse(request);
  }

  validateInjectionMoldingRequest(request: InjectionMoldingPriceRequest) {
    return this.injectionMoldingSchema.parse(request);
  }
}
