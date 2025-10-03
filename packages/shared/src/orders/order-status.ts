import { z } from 'zod';

// Canonical order status values
export const ORDER_STATUSES = [
  'NEW',
  'PAID',
  'IN_PRODUCTION',
  'QC',
  'SHIPPED',
  'COMPLETE',
  'CANCELLED'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const orderStatusSchema = z.enum(ORDER_STATUSES);

// Allowed transitions map
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PAID', 'CANCELLED'],
  PAID: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['QC', 'CANCELLED'],
  QC: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETE'],
  COMPLETE: [],
  CANCELLED: []
};

export interface OrderStatusTransitionValidation {
  allowed: boolean;
  reason?: string;
}

export function validateOrderStatusTransition(from: OrderStatus, to: OrderStatus): OrderStatusTransitionValidation {
  if (from === to) {
    return { allowed: true };
  }
  const allowedNext = ORDER_STATUS_TRANSITIONS[from] || [];
  if (allowedNext.includes(to)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Transition from ${from} to ${to} is not permitted. Allowed: ${allowedNext.join(', ') || '∅'}`
  };
}

export const parseOrderStatus = (value: unknown): OrderStatus => orderStatusSchema.parse(value);

// Timeline event structure (shared contract)
export interface OrderStatusHistoryEvent {
  id?: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  notes?: string | null;
  changedBy: string; // user id or system
  createdAt?: string; // ISO
}

export const orderStatusHistoryEventSchema = z.object({
  id: z.string().uuid().optional(),
  orderId: z.string().uuid(),
  fromStatus: orderStatusSchema.nullable(),
  toStatus: orderStatusSchema,
  notes: z.string().max(2000).nullable().optional(),
  changedBy: z.string(),
  createdAt: z.string().datetime().optional()
});

export const ORDER_FINAL_STATES: OrderStatus[] = ['COMPLETE', 'CANCELLED'];

export function isFinalOrderState(status: OrderStatus): boolean {
  return ORDER_FINAL_STATES.includes(status);
}
