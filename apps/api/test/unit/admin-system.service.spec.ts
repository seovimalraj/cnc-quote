import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminSystemService, LegalDocument } from '../../src/modules/admin-system/admin-system.service';
import { AdminHealthService, HealthStatus } from '../../src/modules/admin-health/admin-health.service';
import { SupabaseService } from '../../src/lib/supabase/supabase.service';
import { CacheService } from '../../src/lib/cache/cache.service';

describe('AdminSystemService', () => {
  let service: AdminSystemService;
  let adminHealthServiceMock: Record<string, jest.Mock>;
  let supabaseFromMock: jest.Mock;
  let supabaseServiceMock: SupabaseService;
  let cacheServiceMock: CacheService;
  let configServiceMock: ConfigService;
  let storageFromMock: jest.Mock;
  let cacheStore: Map<string, any>;

  let legalRows: any[];
  let storageListResponse: { data: any[]; error: any | null };
  let storageDownloadResponse: { data: { text: () => Promise<string> } | null; error: any | null };
  let metricsGaugeResponse: { data: Array<{ value: number }>; error: any | null };

  beforeEach(() => {
    jest.clearAllMocks();
    cacheStore = new Map();

    legalRows = [
      {
        id: 'doc-terms',
        slug: 'terms',
        type: 'terms_of_service',
        title: 'Terms of Service',
        version: '1.2.0',
        content_md: '# Terms',
        updated_at: '2025-09-05T00:00:00Z',
        effective_date: '2025-09-05T00:00:00Z',
        metadata: { version: '1.2.0' },
      },
    ];

    storageListResponse = { data: [], error: null };
    storageDownloadResponse = { data: null, error: null };
    metricsGaugeResponse = { data: [], error: null };

    cacheServiceMock = {
      get: jest.fn(async (key: string) => cacheStore.get(key)),
      set: jest.fn(async (key: string, value: any) => {
        cacheStore.set(key, value);
      }),
      del: jest.fn(async (key: string) => {
        cacheStore.delete(key);
      }),
      reset: jest.fn(async () => {
        cacheStore.clear();
      }),
      keys: jest.fn(async () => Array.from(cacheStore.keys())),
    } as unknown as CacheService;

    const createQueryResponse = (response: { data: any; error: any | null }) => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return this;
      },
      or() {
        return this;
      },
      order() {
        return this;
      },
      limit: () => Promise.resolve(response),
    });

    supabaseFromMock = jest.fn((table: string) => {
      if (table === 'metrics_gauges') {
        return createQueryResponse(metricsGaugeResponse);
      }

      if (table === 'legal_documents') {
        return createQueryResponse({ data: [...legalRows], error: null });
      }

      if (table === 'system_events') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      return createQueryResponse({ data: [], error: null });
    });

    storageFromMock = jest.fn(() => ({
      list: jest.fn(async () => storageListResponse),
      download: jest.fn(async () => storageDownloadResponse),
    }));

    supabaseServiceMock = {
      client: {
        from: supabaseFromMock,
        storage: {
          from: storageFromMock,
        },
      },
    } as unknown as SupabaseService;

    adminHealthServiceMock = {
      getApiHealth: jest.fn(),
      getCadHealth: jest.fn(),
      getDbHealth: jest.fn(),
      getQueuesHealth: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    service = new AdminSystemService(
      supabaseServiceMock,
      cacheServiceMock,
      adminHealthServiceMock as unknown as AdminHealthService,
      configServiceMock,
    );
  });

  const buildHealth = (status: HealthStatus['status'], latency = 25, meta?: Record<string, any>): HealthStatus => ({
    service: 'test',
    status,
    latency_ms: latency,
    last_heartbeat: new Date().toISOString(),
    notes: null,
    meta,
  });

  it('aggregates health summary using real probe data and caches the result', async () => {
    adminHealthServiceMock.getApiHealth.mockResolvedValue(buildHealth('ok', 45));
    adminHealthServiceMock.getCadHealth.mockResolvedValue(buildHealth('warn', 120));
    adminHealthServiceMock.getDbHealth.mockResolvedValue(buildHealth('ok', 18));
    adminHealthServiceMock.getQueuesHealth.mockResolvedValue(buildHealth('ok', 10, { total_waiting: 15 }));

    const summary = await service.getSystemHealthSummary();

    expect(summary.overall_status).toBe('degraded');
    expect(summary.services.api.status).toBe('healthy');
    expect(summary.services.cad.status).toBe('degraded');
    expect(summary.services.queues.depth).toBe(15);

    expect(adminHealthServiceMock.getApiHealth).toHaveBeenCalledTimes(1);

    const cachedSummary = await service.getSystemHealthSummary();
    expect(cachedSummary).toBe(summary);
    expect(adminHealthServiceMock.getApiHealth).toHaveBeenCalledTimes(1);
  });

  it('returns legal documents from Supabase table and memoizes the response', async () => {
    const doc = await service.getLegalDocument('terms');

    expect(doc).toMatchObject({
      id: 'doc-terms',
      title: 'Terms of Service',
      version: '1.2.0',
    } as Partial<LegalDocument>);

    const tableCalls = supabaseFromMock.mock.calls.filter(([table]) => table === 'legal_documents').length;

    await service.getLegalDocument('terms');

    const tableCallsAfterCache = supabaseFromMock.mock.calls.filter(([table]) => table === 'legal_documents').length;
    expect(tableCallsAfterCache).toBe(tableCalls);
  });

  it('falls back to Supabase storage when table data is unavailable', async () => {
    legalRows = [];
    const updatedAt = '2025-09-06T00:00:00Z';
    storageListResponse = {
      data: [
        {
          name: 'privacy-v1.0.0.md',
          updated_at: updatedAt,
          metadata: {
            version: '1.0.0',
            effective_date: '2025-09-05T00:00:00Z',
          },
        },
      ],
      error: null,
    };
    storageDownloadResponse = {
      data: {
        text: async () => '# Privacy Policy\nFallback content',
      },
      error: null,
    };

    const document = await service.getLegalDocument('privacy');

    expect(storageFromMock).toHaveBeenCalledWith('legal-documents');
    expect(document.title).toBe('Privacy');
    expect(document.version).toBe('1.0.0');
    expect(document.content).toContain('Fallback content');
  });

  it('throws NotFoundException when neither table nor storage contain the document', async () => {
    legalRows = [];
    storageListResponse = { data: [], error: null };
    storageDownloadResponse = { data: null, error: { message: 'not found' } };

    await expect(service.getLegalDocument('aup')).rejects.toBeInstanceOf(NotFoundException);
  });
});
