import { ContractsV1 } from '@cnc-quote/shared';

export interface PricingRowLike {
  quantity: number;
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  breakdown?: any;
  compliance?: ContractsV1.QuoteComplianceSnapshotV1 | null;
}

/**
 * Compute minimal patches between previous and next pricing matrices.
 * Only emits a patch row when a tracked field changes or new quantity appears.
 */
export function diffPricingMatrix(prev: PricingRowLike[], next: PricingRowLike[]): ContractsV1.PricingMatrixRowPatchV1[] {
  const byQtyPrev = new Map<number, PricingRowLike>();
  prev.forEach(r => byQtyPrev.set(r.quantity, r));
  const patches: ContractsV1.PricingMatrixRowPatchV1[] = [];
  for (const row of next) {
    const old = byQtyPrev.get(row.quantity);
    if (!old) {
      patches.push({
        quantity: row.quantity,
        unit_price: row.unit_price,
        total_price: row.total_price,
        lead_time_days: row.lead_time_days,
        breakdown: row.breakdown,
        status: 'ready',
        compliance: row.compliance ?? null,
      });
      continue;
    }
    if (
      old.unit_price !== row.unit_price ||
      old.total_price !== row.total_price ||
      old.lead_time_days !== row.lead_time_days ||
      JSON.stringify(old.breakdown) !== JSON.stringify(row.breakdown) ||
      JSON.stringify(old.compliance) !== JSON.stringify(row.compliance)
    ) {
      patches.push({
        quantity: row.quantity,
        unit_price: row.unit_price,
        total_price: row.total_price,
        lead_time_days: row.lead_time_days,
        breakdown: row.breakdown,
        status: 'ready',
        compliance: row.compliance ?? null,
      });
    }
  }
  return patches;
}

/** Compute subtotal delta by comparing selected quantity row totals. */
export function computeSelectedSubtotalDelta(args: {
  prevItems: { id: string; matrix: PricingRowLike[]; selected_quantity?: number }[];
  updatedItemId: string;
  newMatrix: PricingRowLike[];
  newSelectedQuantity?: number;
}): number {
  let prevSubtotal = 0;
  let newSubtotal = 0;
  for (const it of args.prevItems) {
    const selQty = it.selected_quantity || it.matrix[0]?.quantity;
    const selPrev = it.matrix.find(r => r.quantity === selQty);
    prevSubtotal += selPrev?.total_price || 0;
    if (it.id === args.updatedItemId) {
      const nsq = args.newSelectedQuantity || selQty;
      const newRow = args.newMatrix.find(r => r.quantity === nsq) || args.newMatrix[0];
      newSubtotal += newRow?.total_price || 0;
    } else {
      newSubtotal += selPrev?.total_price || 0;
    }
  }
  return newSubtotal - prevSubtotal;
}
