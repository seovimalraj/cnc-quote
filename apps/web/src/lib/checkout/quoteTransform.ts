import { ContractsVNext } from '@cnc-quote/shared';

export interface CheckoutQuoteLine {
  id: string;
  file_name: string;
  quantity: number;
  material: string;
  finish: string;
  lead_option: string;
  lead_time_days: number | null;
  price_per_unit: number;
  line_total: number;
  currency: string;
}

export interface CheckoutQuoteSummary {
  id: string;
  status: ContractsVNext.QuoteLifecycleStatusVNext;
  parts_count: number;
  item_subtotal: number;
  estimated_shipping: number;
  estimated_tax: number;
  discounts: number;
  total_due: number;
  currency: string;
  has_blockers: boolean;
  selected_lead_time: {
    region: string;
    speed: string;
    business_days: number;
  };
  lines: CheckoutQuoteLine[];
  selected_shipping_rate: ContractsVNext.ShippingRateVNext | null;
  source: ContractsVNext.QuoteSummaryVNext;
}

const toTitleCase = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Unspecified';
  }

  return raw
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const normalizeFinish = (finishIds: string[] | undefined): string => {
  if (!finishIds || finishIds.length === 0) {
    return 'None';
  }
  return finishIds.map(toTitleCase).join(', ');
};

const pickSelectedQuantity = (line: ContractsVNext.QuoteLineVNext): number => {
  const selection = line.selection;
  if (typeof selection.selectedQuantity === 'number' && Number.isFinite(selection.selectedQuantity)) {
    return selection.selectedQuantity;
  }
  if (Array.isArray(selection.quantities) && selection.quantities.length > 0) {
    const candidate = selection.quantities.find((qty) => typeof qty === 'number' && qty > 0);
    if (candidate) {
      return candidate;
    }
  }
  return 1;
};

const pickPricingRow = (
  line: ContractsVNext.QuoteLineVNext,
  selectedQuantity: number,
): ContractsVNext.PricingComputationVNext['matrix'][number] | null => {
  const matrix = Array.isArray(line.pricing.matrix) ? line.pricing.matrix : [];
  if (matrix.length === 0) {
    return null;
  }
  return matrix.find((row) => row.quantity === selectedQuantity) ?? matrix[0] ?? null;
};

const computeUnitPrice = (row: ContractsVNext.PricingComputationVNext['matrix'][number] | null, quantity: number): number => {
  if (row && typeof row.unitPrice === 'number') {
    return row.unitPrice;
  }
  if (row && typeof row.totalPrice === 'number' && quantity > 0) {
    return Number((row.totalPrice / quantity).toFixed(2));
  }
  return 0;
};

const computeTotalPrice = (
  row: ContractsVNext.PricingComputationVNext['matrix'][number] | null,
  quantity: number,
  unitPrice: number,
): number => {
  if (row && typeof row.totalPrice === 'number') {
    return row.totalPrice;
  }
  return Number((unitPrice * quantity).toFixed(2));
};

const hasCriticalDfm = (line: ContractsVNext.QuoteLineVNext): boolean => {
  if (line.dfm?.status === 'failed') {
    return true;
  }
  const issues = Array.isArray(line.dfm?.issues) ? line.dfm?.issues : [];
  return issues.some((issue) => issue.severity === 'critical');
};

export function transformQuoteToCheckoutSummary(quote: ContractsVNext.QuoteSummaryVNext): CheckoutQuoteSummary {
  const currency = quote.totals.currency ?? 'USD';
  const subtotal = quote.totals.subtotal ?? 0;
  const total = quote.totals.total ?? subtotal;

  const lines: CheckoutQuoteLine[] = quote.lines.map((line, index) => {
    const quantity = pickSelectedQuantity(line);
    const pricingRow = pickPricingRow(line, quantity);
    const unitPrice = computeUnitPrice(pricingRow, quantity);
    const lineTotal = computeTotalPrice(pricingRow, quantity, unitPrice);

    return {
      id: line.id,
      file_name: line.fileId ?? `Part ${index + 1}`,
      quantity,
      material: toTitleCase(line.selection.materialId),
      finish: normalizeFinish(line.selection.finishIds),
      lead_option: toTitleCase(line.selection.leadTimeOption),
      lead_time_days: pricingRow?.leadTimeDays ?? null,
      price_per_unit: unitPrice,
      line_total: lineTotal,
      currency,
    };
  });

  const primaryLine = lines[0];
  const selectedLeadTime = {
    region: 'Primary',
    speed: primaryLine ? primaryLine.lead_option : 'Standard',
    business_days: primaryLine?.lead_time_days ?? 0,
  };

  const hasBlockers = quote.lines.some(hasCriticalDfm);

  return {
    id: quote.id,
    status: quote.status,
    parts_count: lines.length,
    item_subtotal: subtotal,
    estimated_shipping: 0,
    estimated_tax: 0,
    discounts: 0,
    total_due: total,
    currency,
    has_blockers: hasBlockers,
    selected_lead_time: selectedLeadTime,
    lines,
    selected_shipping_rate: null,
    source: quote,
  };
}
