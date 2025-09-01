import { Test, TestingModule } from "@nestjs/testing";
import { DfmService } from "../../src/modules/dfm/dfm.service";
import { PricingService } from "../../src/modules/pricing/pricing.service";
import { SupabaseService } from "../../src/lib/supabase/supabase.service";

describe("DfmService", () => {
  let service: DfmService;
  let _pricingService: PricingService;
  let _supabaseService: SupabaseService;

  const mockSupabaseService = {
    client: {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    },
  };

  const mockPricingService = {
    calculateLeadTime: jest.fn(),
    calculateComplexityFactor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DfmService,
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<DfmService>(DfmService);
    _pricingService = module.get<PricingService>(PricingService);
    _supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("analyzePart", () => {
    const mockPartData = {
      volume: 100,
      boundingBox: { x: 10, y: 10, z: 10 },
      features: {
        holes: [
          { diameter: 5, depth: 10 },
          { diameter: 3, depth: 15 },
        ],
        pockets: [{ width: 20, length: 30, depth: 5 }],
      },
    };

    const mockMaterialRules = {
      id: "alu-6061",
      min_wall_thickness: 1.5,
      min_hole_diameter: 2,
      max_depth_to_diameter: 4,
      min_corner_radius: 1,
    };

    beforeEach(() => {
      mockSupabaseService.client.single.mockResolvedValue({
        data: mockMaterialRules,
        error: null,
      });
    });

    it("should identify thin walls", async () => {
      const result = await service.analyzePart("alu-6061", {
        ...mockPartData,
        minWallThickness: 1.0, // Below minimum
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "THIN_WALL",
          severity: "ERROR",
        }),
      );
    });

    it("should identify small holes", async () => {
      const result = await service.analyzePart("alu-6061", {
        ...mockPartData,
        features: {
          ...mockPartData.features,
          holes: [{ diameter: 1, depth: 5 }], // Below minimum
        },
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: "SMALL_HOLE",
          severity: "ERROR",
        }),
      );
    });

    it("should calculate manufacturability score", async () => {
      mockPricingService.calculateComplexityFactor.mockResolvedValue(1.5);

      const result = await service.analyzePart("alu-6061", mockPartData);

      expect(result.manufacturabilityScore).toBeGreaterThan(0);
      expect(result.manufacturabilityScore).toBeLessThanOrEqual(100);
    });

    it("should estimate lead time", async () => {
      mockPricingService.calculateLeadTime.mockResolvedValue(5);

      const result = await service.analyzePart("alu-6061", mockPartData);

      expect(result.estimatedLeadTime).toBe(5);
    });
  });
});
