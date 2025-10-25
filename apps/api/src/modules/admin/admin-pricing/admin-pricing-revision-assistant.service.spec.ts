import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { AdminPricingRevisionAssistantService } from './admin-pricing-revision-assistant.service';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AdminFeatureFlagsService } from "../admin-feature-flags/admin-feature-flags.service";
import { AdminPricingService } from './admin-pricing.service';
import { ADMIN_PRICING_REVISION_QUEUE } from './admin-pricing-revision.queue';
import type { AdminPricingConfig } from '@cnc-quote/shared';

const FEATURE_FLAG_KEY = 'admin_pricing_revision_assistant';

describe('AdminPricingRevisionAssistantService', () => {
  let service: AdminPricingRevisionAssistantService;
  let supabase: { client: { from: jest.Mock } };
  let featureFlags: { evaluateFeatureFlag: jest.Mock };
  let adminPricing: { getConfig: jest.Mock };
  let queue: { add: jest.Mock; getWorkers: jest.Mock };

  const baseConfig: AdminPricingConfig = {
    version: 'v5',
    machines: {
      '3axis': {
        name: '3-Axis Mill',
        hourly_rate: 55,
        setup_rate: 35,
        min_setup_min: 20,
        feed_rate_map: {},
      },
    },
    materials: {
      aluminum6061: {
        grade: '6061-T6',
        stock_forms: [],
        finish_compat: [],
        buy_price: 6,
        waste_factor_percent: 12,
        machinability: 90,
      },
    },
    finishes: {
      anodized: {
        model: 'per_part',
        rate: 12,
        min_lot: 1,
        region_allowed: [],
      },
    },
    tolerance_packs: {
      standard: {
        cycle_time_multiplier: 1,
        surface_default: 1,
      },
    },
    inspection: {
      base_usd: 60,
      per_dim_usd: 6,
      program_min: 120,
    },
    speed_region: {
      us: {
        standard: {
          multiplier: 1,
          leadtime_days: 5,
        },
      },
    },
    risk_matrix: {
      default: {
        risk_percent: 5,
        risk_flat: 10,
        time_multiplier: 1,
      },
    },
    overhead_margin: {
      overhead_percent: 15,
      target_margin_percent: 22,
    },
  };

  const createInsertChain = (result: { data: any[] | null; error: any }) => {
    const limit = jest.fn().mockResolvedValue(result);
    const select = jest.fn().mockReturnValue({ limit });
    const insert = jest.fn().mockReturnValue({ select });
    return { insert, select, limit };
  };

  beforeEach(async () => {
    supabase = { client: { from: jest.fn() } };
    featureFlags = { evaluateFeatureFlag: jest.fn() };
    adminPricing = { getConfig: jest.fn() };
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getWorkers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPricingRevisionAssistantService,
        { provide: SupabaseService, useValue: supabase },
        { provide: AdminFeatureFlagsService, useValue: featureFlags },
        { provide: AdminPricingService, useValue: adminPricing },
        { provide: getQueueToken(ADMIN_PRICING_REVISION_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get(AdminPricingRevisionAssistantService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const buildRunRow = () => {
    const timestamp = new Date().toISOString();
    return {
      id: '11111111-2222-3333-4444-555555555555',
      status: 'queued',
      instructions: 'Tighten expedited margins for EU',
      focus_areas: ['eu'],
      base_version: baseConfig.version,
      base_config: baseConfig,
      proposal_config: null,
      adjustments: null,
      diff_summary: null,
      notes: null,
      error_message: null,
      requested_by: null,
      requested_by_email: null,
      trace_id: 'trace-run',
      feature_flag_key: FEATURE_FLAG_KEY,
      created_at: timestamp,
      updated_at: timestamp,
      started_at: null,
      completed_at: null,
    };
  };

  it('rejects when feature flag disabled', async () => {
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: false });

    await expect(
      service.requestProposal({ version: 1, instructions: 'noop' }, { userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(queue.getWorkers).not.toHaveBeenCalled();
    expect(adminPricing.getConfig).not.toHaveBeenCalled();
  });

  it('rejects when worker availability cannot be confirmed', async () => {
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: true });
    queue.getWorkers.mockResolvedValue([]);

    await expect(
      service.requestProposal({ version: 1, instructions: 'noop' }, { userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(queue.getWorkers).toHaveBeenCalledTimes(1);
    expect(adminPricing.getConfig).not.toHaveBeenCalled();
    expect(supabase.client.from).not.toHaveBeenCalled();
  });

  it('persists run and enqueues job when request is valid', async () => {
    const row = buildRunRow();
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: true });
    queue.getWorkers.mockResolvedValue([{ id: 'worker-1' }]);
    adminPricing.getConfig.mockResolvedValue({ version: baseConfig.version, config: baseConfig });

    const insertChain = createInsertChain({ data: [row], error: null });
    supabase.client.from.mockImplementation((table: string) => {
      if (table !== 'admin_pricing_revision_runs') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        insert: insertChain.insert,
      };
    });

    const result = await service.requestProposal(
      { version: 1, instructions: 'Tighten expedited margins', focusAreas: ['eu'] },
      { userId: 'admin-1', email: 'ops@example.com' },
      'trace-request',
    );

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        instructions: 'Tighten expedited margins',
        feature_flag_key: FEATURE_FLAG_KEY,
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'admin-pricing-revision-generate',
      expect.objectContaining({ runId: row.id, traceId: row.trace_id }),
      expect.objectContaining({ jobId: expect.stringContaining(row.id) }),
    );
    expect(result.runId).toEqual(row.id);
    expect(result.status).toBe('queued');
    expect(result.baseVersion).toBe(baseConfig.version);
  });

  it('propagates persistence errors from Supabase', async () => {
    featureFlags.evaluateFeatureFlag.mockResolvedValue({ enabled: true });
    queue.getWorkers.mockResolvedValue([{ id: 'worker-1' }]);
    adminPricing.getConfig.mockResolvedValue({ version: baseConfig.version, config: baseConfig });

    const insertChain = createInsertChain({ data: null, error: { message: 'failed' } });
    supabase.client.from.mockImplementation((table: string) => {
      if (table !== 'admin_pricing_revision_runs') {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        insert: insertChain.insert,
      };
    });

    await expect(
      service.requestProposal({ version: 1, instructions: 'test' }, { userId: 'ops-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(queue.add).not.toHaveBeenCalled();
  });
});
