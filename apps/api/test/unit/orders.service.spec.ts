import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { SupabaseService } from '../../src/lib/supabase/supabase.service';
import { NotifyService } from '../../src/modules/notify/notify.service';
import { QapService } from '../../src/modules/qap/qap.service';

// Create minimal mocks
const mockSupabaseClient = () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    from: jest.fn().mockImplementation(() => chain),
  };
  return chain;
};

class SupabaseServiceMock {
  client = mockSupabaseClient();
}

class NotifyServiceMock {
  sendOrderNotification = jest.fn().mockResolvedValue(undefined);
}

class QapServiceMock {
  generateQapDocument = jest.fn();
}

describe('OrdersService.updateOrderStatus', () => {
  let service: OrdersService;
  let supabase: SupabaseServiceMock;

  beforeEach(async () => {
    supabase = new SupabaseServiceMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SupabaseService, useValue: supabase },
        { provide: NotifyService, useClass: NotifyServiceMock },
        { provide: QapService, useClass: QapServiceMock },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('updates status on valid transition and writes history', async () => {
    // Current order stub
    supabase.client.single
      .mockResolvedValueOnce({ data: { id: 'o1', status: 'draft', total_amount: 100, currency: 'usd' } }) // fetch existing
      .mockResolvedValueOnce({ data: { id: 'o1', status: 'approved', total_amount: 100, currency: 'usd' } }); // after update

    supabase.client.update.mockReturnThis();
    supabase.client.insert.mockReturnThis();

    const updated = await service.updateOrderStatus('o1', 'PAID', 'user1', 'paid via test');
    expect(updated.status).toBe('approved'); // mapped from PAID
    expect(supabase.client.insert).toHaveBeenCalledWith({
      order_id: 'o1',
      new_status: 'approved',
      notes: 'paid via test',
      changed_by: 'user1',
    });
  });

  it('rejects invalid transition', async () => {
    supabase.client.single.mockResolvedValueOnce({ data: { id: 'o1', status: 'draft', total_amount: 100, currency: 'usd' } });
    await expect(service.updateOrderStatus('o1', 'QC', 'user1')).rejects.toThrow(/not permitted/i);
  });
});
