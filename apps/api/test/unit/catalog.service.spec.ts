import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService, MaterialCatalogItem, FinishCatalogItem } from './catalog.service';
import { MaterialsService } from './materials.service';
import { FinishesService } from './finishes.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let materialsServiceMock: Record<string, jest.Mock>;
  let finishesServiceMock: Record<string, jest.Mock>;
  let supabaseServiceMock: SupabaseService;

  beforeEach(async () => {
    materialsServiceMock = {
      getMaterials: jest.fn(),
      getMaterial: jest.fn(),
    };

    finishesServiceMock = {
      getFinishes: jest.fn(),
      getFinish: jest.fn(),
    };

    supabaseServiceMock = {} as SupabaseService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: MaterialsService, useValue: materialsServiceMock },
        { provide: FinishesService, useValue: finishesServiceMock },
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should transform real materials to catalog format', async () => {
    materialsServiceMock.getMaterials.mockResolvedValue([
      {
        id: 'mat-1',
        code: 'AL6061',
        name: 'Aluminum 6061-T6',
        category: { code: 'aluminum' },
        cost_per_kg_base: 4.5,
        density_kg_m3: 2700,
        is_active: true,
        processes: ['cnc_milling'],
      },
    ]);

    const result = await service.getMaterials();

    expect(result).toEqual([
      {
        id: 'AL6061',
        name: 'Aluminum 6061-T6',
        category: 'aluminum',
        cost_per_kg: 4.5,
        density: 2.7,
        availability: true,
        lead_time_days: 1,
        processes: ['cnc_milling'],
      },
    ] as MaterialCatalogItem[]);
  });

  it('should transform real finishes to catalog format', async () => {
    finishesServiceMock.getFinishes.mockResolvedValue([
      {
        id: 'fin-1',
        name: 'Clear Anodize',
        process: 'Anodize',
        rate_per_area_usd_m2: 0.12,
        lead_time_days: 3,
      },
    ]);

    const result = await service.getFinishes();

    expect(result).toEqual([
      {
        id: 'fin-1',
        name: 'Clear Anodize',
        category: 'anodize',
        cost_per_area: 0.12,
        lead_time_days: 3,
        processes: ['anodize'],
      },
    ] as FinishCatalogItem[]);
  });

  it('should handle material lookup by ID', async () => {
    materialsServiceMock.getMaterial.mockResolvedValue({
      id: 'mat-1',
      code: 'AL6061',
      name: 'Aluminum 6061-T6',
      category: { code: 'aluminum' },
      cost_per_kg_base: 4.5,
      density_kg_m3: 2700,
      is_active: true,
      processes: ['cnc_milling'],
    });

    const result = await service.getMaterialById('mat-1');

    expect(result?.id).toBe('AL6061');
  });

  it('should return null for unknown material ID', async () => {
    materialsServiceMock.getMaterial.mockRejectedValue(new Error('Not found'));

    const result = await service.getMaterialById('unknown');

    expect(result).toBeNull();
  });

  it('should handle finish lookup by ID', async () => {
    finishesServiceMock.getFinish.mockResolvedValue({
      id: 'fin-1',
      name: 'Clear Anodize',
      process: 'Anodize',
      rate_per_area_usd_m2: 0.12,
      lead_time_days: 3,
    });

    const result = await service.getFinishById('fin-1');

    expect(result?.id).toBe('fin-1');
  });

  it('should return null for unknown finish ID', async () => {
    finishesServiceMock.getFinish.mockRejectedValue(new Error('Not found'));

    const result = await service.getFinishById('unknown');

    expect(result).toBeNull();
  });
});