/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';

// Minimal global declarations to satisfy TypeScript in this isolated test without relying on tsconfig types resolution quirks
// Jest provides these at runtime; we only need them for type checking here.
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;
import { PricingGateway } from '../../pricing.gateway';
// Mock the pricing engine service BEFORE importing it in Nest context
jest.mock('../../pricing-engine-v2.service', () => ({
  PricingEngineV2Service: class {
    async calculatePricing(req: any) {
      return {
        pricing_matrix: (req.quantities || [1]).map((q: number) => ({
          quantity: q,
          unit_price: 100,
          total_price: 100 * q,
          lead_time_days: 10,
          breakdown: { material: 40 }
        }))
      };
    }
  }
}));
jest.mock('../../pricing-persistence.service', () => ({
  PricingPersistenceService: class {
    async persistMatrixAndTotals() { /* no-op */ }
  }
}));
import { PricingEngineV2Service } from './pricing-engine-v2.service';
import { PricingPersistenceService } from './pricing-persistence.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { ContractsV1 } from '@cnc-quote/shared';

// Lightweight fake socket server harness
class FakeServer {
  public emitted: Array<{ event: string; payload: any }> = [];
  to() { return this; }
  emit(event: string, payload: any) { this.emitted.push({ event, payload }); }
}

describe('PricingGateway', () => {
  let gateway: PricingGateway;
  let fakeServer: FakeServer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingGateway,
        {
          provide: PricingEngineV2Service,
          useValue: {
            calculatePricing: async (req: any) => ({
              pricing_matrix: (req.quantities || [1]).map((q: number) => ({
                quantity: q,
                unit_price: 100,
                total_price: 100 * q,
                lead_time_days: 10,
                breakdown: { material: 40 }
              }))
            })
          }
        },
        {
          provide: PricingPersistenceService,
          useValue: {
            persistMatrixAndTotals: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { id: 'quote1' } }),
                // For quote_items fetch
                then: undefined
              })
            }
          }
        }
      ]
    }).compile();

    gateway = module.get(PricingGateway);
    fakeServer = new FakeServer();
    // @ts-ignore assign test double
    gateway.server = fakeServer as any;
    // Patch supabase quote_items response specifically
    const supabase = module.get<SupabaseService>(SupabaseService);
    // Mock chain for quote_items
    // we need a distinct mock for .from('quote_items') vs others
  (gateway as any).supabase.client.from = jest.fn((table: string) => {
      if (table === 'quote_items') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [
                { id: 'item1', pricing_matrix: [ { quantity: 1, unit_price: 100, total_price: 100, lead_time_days: 10, breakdown: { material: 40 } } ], config_json: { selected_quantity: 1 } }
              ],
              error: null
            })
          })
        };
      }
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'quote1' }, error: null }) }) })
      } as any;
    });
  });

  it('emits optimistic then final update with latency & correlation', async () => {
  const client: any = {
      id: 'sock1',
      handshake: { auth: { token: process.env.JWT_SECRET ? 'invalid.fake.token' : 'devtoken' } },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

  // Seed authenticated user directly (bypass JWT complexity for unit test)
  (gateway as any).connectedUsers.set(client.id, { user_id: 'u1', org_id: 'o1' });
    // Track before
    await gateway.handleRecalculate({ quote_id: 'quote1', quote_item_id: 'item1' }, client);
    // Wait debounce flush
    await new Promise(r => setTimeout(r, 300));

  const pricingEvents = fakeServer.emitted.filter(e => e.event === 'pricing_event').map(e => e.payload as ContractsV1.PricingOptimisticEventV1 | ContractsV1.PricingUpdateEventV1);
    expect(pricingEvents.length).toBeGreaterThanOrEqual(2);
    const optimisticEvt = pricingEvents.find(e => e.kind === 'pricing:optimistic');
    const finalEvt = pricingEvents.find(e => e.kind === 'pricing:update');
    expect(optimisticEvt).toBeTruthy();
    expect(finalEvt).toBeTruthy();
    expect(finalEvt!.correlation_id).toBeDefined();
    // correlation id used in optimistic first
    expect(optimisticEvt!.correlation_id).toBe(finalEvt!.correlation_id);
    // latency_ms measured
    expect((finalEvt as any).payload.latency_ms).toBeGreaterThanOrEqual(0);
  });
});
