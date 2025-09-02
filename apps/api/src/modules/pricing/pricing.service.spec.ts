import { Test, TestingModule } from "@nestjs/testing";
import { PricingService } from "./pricing.service";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { ManualReviewService } from "../manual-review/manual-review.service";
import { CacheService } from "../../lib/cache/cache.service";
import { InjectionMoldingPricingRequest, CncPricingRequest, SheetMetalPricingRequest } from "./price-request.types";

describe("PricingService", () => {
  let service: PricingService;
  let _supabase: SupabaseService;
  const _mockProfile = {
    id: "123",
    machine_id: "456",
    setup_cost: 100,
    machine_rate_per_hour: 150,
    min_order_qty: 1,
    min_order_value: 100,
    min_price_per_part: 10,
    margin: 0.3,
    overhead: 0.1,
    quantity_breaks: [],
  };

  const mockPricingProfile = {
    id: "123",
    machine_id: "456",
    setup_cost: 100,
    machine_rate_per_hour: 150,
    min_order_qty: 1,
    min_order_value: 100,
    min_price_per_part: 10,
    margin: 0.3,
    overhead: 0.1,
    rush_surcharge: 0.5,
    standard_lead_time: 10,
    rush_lead_time: 3,
    material_removal_rate_cc_min: 5.0,
    surface_finish_rate_cm2_min: 10.0,
    feature_times: { hole: 30, pocket: 60, slot: 45, face: 20 },
    qa_cost_per_part: 5,
    max_tonnage: 100, // For injection molding
    cutting_speed_mm_min: 1000, // For sheet metal
    pierce_time_s: 2, // For sheet metal
    bend_time_s: 5, // For sheet metal
    quantity_breaks: [
      { min_qty: 10, discount: 0.05 },
      { min_qty: 50, discount: 0.1 },
      { min_qty: 100, discount: 0.15 },
      { min_qty: 500, discount: 0.2 },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockImplementation(async () => {
                return { data: mockPricingProfile };
              }),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockImplementation(async (key) => {
              if (key.includes("material")) return { price_per_cc: 0.1 };
              if (key.includes("finish")) return { cost_per_unit: 5 };
              return null;
            }),
            set: jest.fn().mockResolvedValue(undefined),
            getCacheKey: jest.fn().mockReturnValue("test-key"),
          },
        },
        {
          provide: ManualReviewService,
          useValue: {
            shouldReviewPrice: jest.fn().mockResolvedValue(false),
            checkQuoteForReview: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    _supabase = module.get<SupabaseService>(SupabaseService);
  });

  it("should calculate CNC price correctly", async () => {
    const request: CncPricingRequest = {
      process_type: "milling",
      machine_id: "456",
      material_id: "789",
      quantity: 1,
      volume_cc: 100,
      surface_area_cm2: 200,
      removed_material_cc: 30,
      features: {
        holes: 2,
        pockets: 1,
        slots: 1,
        faces: 4,
      },
      complexity_multiplier: 1.2,
    };

    const result = await service.calculateCncPrice(request);

    expect(result.unit_price).toBeGreaterThan(0);
    expect(result.total_price).toBe(result.unit_price * request.quantity);
    expect(result.breakdown).toEqual(
      expect.objectContaining({
        setup_cost: expect.any(Number),
        machine_cost: expect.any(Number),
        material_cost: expect.any(Number),
        finish_cost: expect.any(Number),
        qa_cost: expect.any(Number),
        margin: expect.any(Number),
        overhead: expect.any(Number),
      }),
    );
  });

  it("should calculate sheet metal price correctly", async () => {
    const request: SheetMetalPricingRequest = {
      process_type: "laser_cutting",
      machine_id: "456",
      material_id: "789",
      quantity: 1,
      thickness_mm: 2,
      sheet_area_cm2: 100,
      cut_length_mm: 500,
      pierces: 6,
      features: {
        holes: 6,
        bends: 4,
        slots: 2,
        corners: 8,
      },
      nest_utilization: 0.8,
      finish_ids: ["finish1", "finish2"],
      is_rush: false,
      complexity_multiplier: 1.0,
    };

    const result = await service.calculateSheetMetalPrice(request);

    expect(result.unit_price).toBeGreaterThan(0);
    expect(result.total_price).toBe(result.unit_price * request.quantity);
    expect(result.breakdown).toEqual(
      expect.objectContaining({
        setup_cost: expect.any(Number),
        machine_cost: expect.any(Number),
        material_cost: expect.any(Number),
        qa_cost: expect.any(Number),
        margin: expect.any(Number),
        overhead: expect.any(Number),
        finish_cost: expect.any(Number),
      }),
    );
  });

  it("should calculate injection molding price correctly", async () => {
    const request: InjectionMoldingPricingRequest = {
      process_type: "injection",
      machine_id: "456",
      material_id: "789",
      quantity: 1000,
      part_volume_cc: 50,
      mold_complexity: 1.5,
      cavity_count: 4,
      cycle_time_s: 30,
      cooling_time_s: 15,
      tonnage_required: 50,
      shot_weight_g: 100,
      finish_ids: ["finish1", "finish2"],
      features: {
        undercuts: 2,
        side_actions: 1,
        textures: 1,
      },
      complexity_multiplier: 1.3,
      volume_cc: 75, // Total volume including runners and gates
      is_rush: false,
    };

    const result = await service.calculateInjectionMoldingPrice(request);

    expect(result.unit_price).toBeGreaterThan(0);
    expect(result.total_price).toBe(result.unit_price * request.quantity);
    expect(result.breakdown).toMatchObject({
      setup_cost: expect.any(Number),
      machine_cost: expect.any(Number),
      material_cost: expect.any(Number),
      qa_cost: expect.any(Number),
      margin: expect.any(Number),
      overhead: expect.any(Number),
      finish_cost: expect.any(Number),
    });
  });

  it("should calculate CNC price correctly with quantity breaks", async () => {
    const request: CncPricingRequest = {
      process_type: "milling",
      machine_id: "456",
      material_id: "789",
      volume_cc: 100,
      surface_area_cm2: 200,
      removed_material_cc: 30,
      features: {
        holes: 2,
        pockets: 1,
        slots: 1,
        faces: 4,
      },
      complexity_multiplier: 1.0,
      quantity: 5,
      is_rush: false,
    };

    const result = await service.calculateCncPrice(request);

    expect(result.unit_price).toBeGreaterThan(0);
    expect(result.total_price).toBe(result.unit_price * request.quantity);
    expect(result.breakdown).toMatchObject({
      setup_cost: expect.any(Number),
      machine_cost: expect.any(Number),
      material_cost: expect.any(Number),
      qa_cost: expect.any(Number),
      margin: expect.any(Number),
      overhead: expect.any(Number),
    });
    expect(result.total_price).toBeGreaterThanOrEqual(mockPricingProfile.min_order_value);
  });

  it("should apply rush pricing correctly", async () => {
    const baseRequest: CncPricingRequest = {
      process_type: "milling",
      machine_id: "456",
      material_id: "789",
      volume_cc: 100,
      surface_area_cm2: 200,
      removed_material_cc: 30,
      features: {
        holes: 2,
        pockets: 1,
        slots: 1,
        faces: 4,
      },
      complexity_multiplier: 1.0,
      quantity: 1,
      is_rush: false,
    };

    const normalResult = await service.calculateCncPrice(baseRequest);
    const rushResult = await service.calculateCncPrice({
      ...baseRequest,
      is_rush: true,
    });

    expect(rushResult.total_price).toBeGreaterThan(normalResult.total_price);
    expect(rushResult.rush_surcharge).toBeDefined();
    expect(rushResult.rush_surcharge).toBeGreaterThan(0);
    expect(rushResult.unit_price).toBeGreaterThan(normalResult.unit_price);
    expect(rushResult.lead_time_days).toBeLessThan(normalResult.lead_time_days);
  });
});
