import { Test, TestingModule } from "@nestjs/testing";
import { PricingService } from "./pricing.service";
import { SupabaseService } from "../../lib/supabase/supabase.service";

describe("PricingService", () => {
  let service: PricingService;
  let _supabase: SupabaseService;

  const mockProfile = {
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
              single: jest.fn().mockResolvedValue({ data: mockProfile }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    supabase = module.get<SupabaseService>(SupabaseService);
  });

  it("should calculate CNC price correctly", async () => {
    const request = {
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
    const request = {
      process_type: "sheet_metal",
      machine_id: "456",
      material_id: "789",
      quantity: 1,
      thickness_mm: 2,
      sheet_area_cm2: 500,
      features: {
        bends: 4,
        holes: 6,
        slots: 2,
        corners: 8,
      },
      complexity_multiplier: 1.1,
    };

    const result = await service.calculateSheetMetalPrice(request);

    expect(result.unit_price).toBeGreaterThan(0);
    expect(result.total_price).toBe(result.unit_price * request.quantity);
    expect(result.breakdown).toEqual(
      expect.objectContaining({
        setup_cost: expect.any(Number),
        machine_cost: expect.any(Number),
        material_cost: expect.any(Number),
        bending_cost: expect.any(Number),
        qa_cost: expect.any(Number),
        margin: expect.any(Number),
        overhead: expect.any(Number),
      }),
    );
  });

  it("should calculate injection molding price correctly", async () => {
    const request = {
      process_type: "injection_molding",
      machine_id: "456",
      material_id: "789",
      quantity: 1000,
      volume_cc: 50,
      mold_complexity: 1.5,
      cavities: 4,
      features: {
        undercuts: 2,
        side_actions: 1,
        textures: 1,
      },
      complexity_multiplier: 1.3,
    };

    const result = await service.calculateInjectionMoldingPrice(request);

    expect(result.unit_price).toBeGreaterThan(0);
    expect(result.total_price).toBe(result.unit_price * request.quantity);
    expect(result.breakdown).toEqual(
      expect.objectContaining({
        mold_cost: expect.any(Number),
        setup_cost: expect.any(Number),
        machine_cost: expect.any(Number),
        material_cost: expect.any(Number),
        qa_cost: expect.any(Number),
        margin: expect.any(Number),
        overhead: expect.any(Number),
      }),
    );
  });

  it("should apply quantity breaks correctly", async () => {
    const baseRequest = {
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
    };

    // Test different quantities
    const quantities = [1, 10, 50, 100, 500];
    const results = await Promise.all(
      quantities.map((qty) =>
        service.calculateCncPrice({
          ...baseRequest,
          quantity: qty,
        }),
      ),
    );

    // Price per unit should decrease with quantity
    const unitPrices = results.map((r) => r.unit_price);
    for (let i = 1; i < unitPrices.length; i++) {
      expect(unitPrices[i]).toBeLessThan(unitPrices[i - 1]);
    }
  });

  it("should apply minimum order value", async () => {
    const request = {
      process_type: "milling",
      machine_id: "456",
      material_id: "789",
      quantity: 1,
      volume_cc: 10, // Small part
      surface_area_cm2: 20,
      removed_material_cc: 3,
      features: {
        holes: 0,
        pockets: 0,
        slots: 0,
        faces: 1,
      },
      complexity_multiplier: 1.0,
    };

    const result = await service.calculateCncPrice(request);
    expect(result.total_price).toBeGreaterThanOrEqual(mockProfile.min_order_value);
  });

  it("should apply rush surcharge correctly", async () => {
    const baseRequest = {
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
      complexity_multiplier: 1.0,
    };

    const normalResult = await service.calculateCncPrice(baseRequest);
    const rushResult = await service.calculateCncPrice({
      ...baseRequest,
      is_rush: true,
    });

    expect(rushResult.unit_price).toBeGreaterThan(normalResult.unit_price);
    expect(rushResult.lead_time_days).toBeLessThan(normalResult.lead_time_days);
  });
});
