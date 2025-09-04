import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import {
  PricingResponse,
  CncPricingRequest,
  SheetMetalPricingRequest,
  InjectionMoldingPricingRequest
} from "./price-request.types";

@ApiTags("pricing")
@Controller("price")
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

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
  async calculatePrice(
    @Body() request: CncPricingRequest | SheetMetalPricingRequest | InjectionMoldingPricingRequest,
  ): Promise<PricingResponse> {
    switch (request.process_type) {
      case "milling":
      case "turning":
        return this.pricingService.calculateCncPrice(request);

      case "laser_cutting":
      case "press_brake":
        return this.pricingService.calculateSheetMetalPrice(request);

      case "injection":
        return this.pricingService.calculateInjectionMoldingPrice(request);

      default:
        throw new Error(`Unsupported process type: ${(request as any).process_type}`);
    }
  }
}
