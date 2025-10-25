/* eslint-disable */
import { ManualReviewService } from './manual-review.service';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ManualReviewRuleType } from './manual-review.types';

// Provide minimal global Jest typings for isolated compilation
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;
declare const jest: any;

describe('ManualReviewService.escalatePricingGuardrail', () => {
  let service: ManualReviewService;
  let supabaseFrom: jest.Mock;
  let notifyService: { sendReviewNotification: jest.Mock };

  beforeEach(() => {
    supabaseFrom = jest.fn();
    const supabase = { client: { from: supabaseFrom } } as unknown as SupabaseService;
    notifyService = {
      sendReviewNotification: jest.fn().mockResolvedValue(undefined),
    } as any;

    service = new ManualReviewService(supabase, notifyService as unknown as NotifyService, new EventEmitter2());
  });

  it('creates guardrail rule and task when none exist', async () => {
    let insertedRulePayload: any;
    let insertedTaskPayload: any;

    // 1) No existing rule
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_rules');
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const secondEq = jest.fn().mockReturnValue({ maybeSingle });
      const firstEq = jest.fn().mockReturnValue({ eq: secondEq });
      const select = jest.fn().mockReturnValue({ eq: firstEq });
      return { select };
    });

    // 2) Insert new rule
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_rules');
      const single = jest.fn().mockImplementation(async () => ({
        data: {
          id: 'rule-1',
          org_id: 'org-1',
          name: 'Pricing Compliance Guardrail',
          description: 'System guardrail generated from pricing compliance events',
          message: 'Pricing compliance guardrail triggered. Manual review required before release.',
          sla_hours: 4,
          type: ManualReviewRuleType.PRICE,
          conditions: { sla_hours: 4, reason: 'pricing_compliance_guardrail', severity: 'critical' },
          active: true,
          priority: 1,
        },
        error: null,
      }));
      const select = jest.fn().mockImplementation(() => ({ single }));
      const insert = jest.fn().mockImplementation((rows: any[]) => {
        insertedRulePayload = rows;
        return { select };
      });
      return { insert };
    });

    // 3) No existing task for quote/rule
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_tasks');
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const secondEq = jest.fn().mockReturnValue({ maybeSingle });
      const firstEq = jest.fn().mockReturnValue({ eq: secondEq });
      const select = jest.fn().mockReturnValue({ eq: firstEq });
      return { select };
    });

    // 4) Insert task
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_tasks');
      const single = jest.fn().mockResolvedValue({ data: { id: 'task-1' }, error: null });
      const select = jest.fn().mockImplementation(() => ({ single }));
      const insert = jest.fn().mockImplementation((rows: any[]) => {
        insertedTaskPayload = rows;
        return { select };
      });
      return { insert };
    });

    // 5) Update quote status (idempotent)
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('quotes');
      const neq = jest.fn().mockResolvedValue({ error: null });
      const eq = jest.fn().mockReturnValue({ neq });
      const update = jest.fn().mockReturnValue({ eq });
      return { update };
    });

    const result = await service.escalatePricingGuardrail({
      orgId: 'org-1',
      quoteId: 'quote-1',
      quoteItemId: 'item-1',
      traceId: 'trace-123',
      triggeredAt: new Date('2025-01-01T00:00:00Z'),
      events: [
        {
          code: 'quote_margin_floor_breach',
          message: 'Margin below floor',
          quantity: 10,
        },
      ],
      eventIds: ['evt-1'],
      quoteSnapshot: { status: 'draft' },
    });

    expect(result).toEqual({ action: 'created', taskId: 'task-1' });
    expect(insertedRulePayload[0]).toMatchObject({
      name: 'Pricing Compliance Guardrail',
      type: ManualReviewRuleType.PRICE,
      conditions: expect.objectContaining({ reason: 'pricing_compliance_guardrail' }),
    });
    expect(insertedTaskPayload[0]).toMatchObject({
      quote_id: 'quote-1',
      rule_id: 'rule-1',
      status: 'pending',
    });
    expect(typeof insertedTaskPayload[0].notes).toBe('string');
    expect(insertedTaskPayload[0].notes).toContain('quote_margin_floor_breach');
    expect(notifyService.sendReviewNotification).toHaveBeenCalledTimes(1);
    expect(notifyService.sendReviewNotification.mock.calls[0][0]).toMatchObject({
      quoteId: 'quote-1',
      ruleId: 'rule-1',
    });
  });

  it('updates existing pending task instead of creating a new one', async () => {
    const existingTask = { id: 'task-9', status: 'pending', notes: 'Existing guardrail' };
    let updatedTaskPayload: any;

    // 1) Existing rule located
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_rules');
      const maybeSingle = jest.fn().mockResolvedValue({
        data: {
          id: 'rule-9',
          org_id: 'org-1',
          sla_hours: 4,
          conditions: { sla_hours: 4 },
        },
        error: null,
      });
      const secondEq = jest.fn().mockReturnValue({ maybeSingle });
      const firstEq = jest.fn().mockReturnValue({ eq: secondEq });
      const select = jest.fn().mockReturnValue({ eq: firstEq });
      return { select };
    });

    // 2) Existing pending task found
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_tasks');
      const maybeSingle = jest.fn().mockResolvedValue({ data: existingTask, error: null });
      const secondEq = jest.fn().mockReturnValue({ maybeSingle });
      const firstEq = jest.fn().mockReturnValue({ eq: secondEq });
      const select = jest.fn().mockReturnValue({ eq: firstEq });
      return { select };
    });

    // 3) Update the existing task with merged notes
    supabaseFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('manual_review_tasks');
      const eq = jest.fn().mockImplementation((_column: string, value: string) => {
        expect(value).toBe(existingTask.id);
        return Promise.resolve({ data: { id: existingTask.id }, error: null });
      });
      const update = jest.fn().mockImplementation((payload: any) => {
        updatedTaskPayload = payload;
        return { eq };
      });
      return { update };
    });

    const result = await service.escalatePricingGuardrail({
      orgId: 'org-1',
      quoteId: 'quote-1',
      quoteItemId: 'item-1',
      traceId: 'trace-xyz',
      triggeredAt: new Date('2025-01-01T00:00:00Z'),
      events: [
        {
          code: 'lead_time_override_detected',
          message: 'Lead override',
          quantity: 2,
        },
      ],
      eventIds: ['evt-7'],
    });

    expect(result).toEqual({ action: 'updated', taskId: existingTask.id });
    expect(updatedTaskPayload.notes).toContain('lead_time_override_detected');
    expect(notifyService.sendReviewNotification).not.toHaveBeenCalled();
  });
});
