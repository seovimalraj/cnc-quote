import { Test, TestingModule } from "@nestjs/testing";
import { DfmService } from "./dfm.service";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { CacheService } from "../../lib/cache/cache.service";
import { Severity } from "@cnc-quote/shared";

describe("DfmService", () => {
  let service: DfmService;
  let supabase: SupabaseService;
  let cache: CacheService;

  const mockRules = [
    {
      id: "1",
      name: "Min Wall Thickness",
      description: "Check if wall thickness is below minimum for material",
      process_type: "cnc",
      severity: Severity.BLOCK,
      condition: "min_wall_thickness < 1.0",
      message: "Wall thickness must be at least 1mm",
      triggers_manual_review: false,
    },
    {
      id: "2",
      name: "Tool Reach Depth",
      description: "Check if features are beyond max tool reach",
      process_type: "cnc",
      severity: Severity.WARN,
      condition: "max_tool_reach_depth > 150",
      message: "Feature depth exceeds maximum tool reach of 150mm",
      triggers_manual_review: true,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DfmService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ data: mockRules }),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<DfmService>(DfmService);
    supabase = module.get<SupabaseService>(SupabaseService);
    cache = module.get<CacheService>(CacheService);
  });

  it("should validate CNC rules correctly", async () => {
    const params = {
      min_wall_thickness: 0.5,
      max_tool_reach_depth: 200,
      drill_grid_spacing: 3.0,
      slot_aspect_ratio: 8.0,
      pocket_aspect_ratio: 5.0,
    };

    const result = await service.validateCnc(params);

    expect(result.valid).toBeFalsy();
    expect(result.issues).toHaveLength(2);
    expect(result.manual_review_required).toBeTruthy();
  });

  it("should handle empty rules gracefully", async () => {
    // Mock the private _client property
    Object.defineProperty(supabase, '_client', {
      get: () => ({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [] }),
      }),
    });

    const params = {
      min_wall_thickness: 2.0,
      max_tool_reach_depth: 100,
      drill_grid_spacing: 3.0,
      slot_aspect_ratio: 8.0,
      pocket_aspect_ratio: 5.0,
    };

    const result = await service.validateCnc(params);

    expect(result.valid).toBeTruthy();
    expect(result.issues).toHaveLength(0);
    expect(result.manual_review_required).toBeFalsy();
  });

  it("should use cached rules when available", async () => {
    jest.spyOn(cache, "get").mockResolvedValue(mockRules);

    const params = {
      min_wall_thickness: 0.5,
      max_tool_reach_depth: 200,
      drill_grid_spacing: 3.0,
      slot_aspect_ratio: 8.0,
      pocket_aspect_ratio: 5.0,
    };

    await service.validateCnc(params);

    expect(cache.get).toHaveBeenCalledWith("dfm_rules:cnc");
    expect(supabase.client.from).not.toHaveBeenCalled();
  });
});
