import { z } from 'zod';

export const PricingSourceVNextSchema = z.enum(['engine_v2', 'legacy', 'estimate']);

export const PricingMatrixRowVNextSchema = z.object({
  quantity: z.number(),
  unitPrice: z.number().nullable().optional(),
  totalPrice: z.number().nullable().optional(),
  leadTimeDays: z.number().nullable().optional(),
  marginPercentage: z.number().nullable().optional(),
  discountPercentage: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  breakdown: z.record(z.string(), z.unknown()).optional(),
});

export const PricingLeadTimesVNextSchema = z.object({
  standard: z.number().nullable().optional(),
  expedited: z.number().nullable().optional(),
});

export const PricingMinimumsVNextSchema = z.object({
  quantity: z.number().nullable().optional(),
  value: z.number().nullable().optional(),
});

export const PricingTaxLineVNextSchema = z.object({
  quantity: z.number(),
  taxAmount: z.number(),
  taxRate: z.number(),
  taxableAmount: z.number(),
});

export const PricingTaxSummaryVNextSchema = z.object({
  totalTax: z.number(),
  jurisdiction: z.string(),
  provider: z.string(),
  lines: z.array(PricingTaxLineVNextSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PricingComputationVNextSchema = z.object({
  source: PricingSourceVNextSchema,
  currency: z.string(),
  matrix: z.array(PricingMatrixRowVNextSchema),
  leadTimes: PricingLeadTimesVNextSchema.optional(),
  minimums: PricingMinimumsVNextSchema.optional(),
  tax: PricingTaxSummaryVNextSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PricingEstimateRequestVNextSchema = z.object({
  quoteId: z.string().nullable().optional(),
  lineId: z.string().nullable().optional(),
  processType: z.string().optional(),
  materialCode: z.string().optional(),
  quantity: z.number().optional(),
  leadClass: z.string().optional(),
  tolerances: z.record(z.string(), z.unknown()).optional(),
  finishes: z.array(z.string()).optional(),
  cadKey: z.string().nullable().optional(),
});

const POSITIVE_INT = z.number().int().positive();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const coerceInteger = (value: unknown): number | null => {
  const num = coerceNumber(value);
  if (num === null) {
    return null;
  }
  return Math.trunc(num);
};

const dedupeSorted = (values: number[]): number[] =>
  Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)))
    .map((value) => Math.trunc(value))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

const pickCurrency = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const mapCostBreakdown = (value: unknown): Record<string, number> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries: Array<[string, number]> = [];
  for (const [key, raw] of Object.entries(value)) {
    const num = coerceNumber(raw);
    if (num !== null) {
      entries.push([key, Number(num.toFixed(2))]);
    }
  }

  return entries.length ? Object.fromEntries(entries) : undefined;
};

const mapTaxLines = (
  value: unknown,
): Array<{ quantity: number; taxAmount: number; taxRate: number; taxableAmount: number }> | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const lines: Array<{ quantity: number; taxAmount: number; taxRate: number; taxableAmount: number }> = [];

  for (const line of value) {
    if (!isRecord(line)) {
      continue;
    }

    const quantity = coerceNumber(line.quantity);
    const taxAmount = coerceNumber(line.taxAmount ?? line.tax_amount);
    const taxRate = coerceNumber(line.taxRate ?? line.tax_rate);
    const taxableAmount = coerceNumber(line.taxableAmount ?? line.taxable_amount);

    if (
      quantity === null ||
      taxAmount === null ||
      taxRate === null ||
      taxableAmount === null
    ) {
      continue;
    }

    lines.push({
      quantity,
      taxAmount,
      taxRate,
      taxableAmount,
    });
  }

  return lines.length ? lines : null;
};

const cleanMetadata = (value: Record<string, unknown>): Record<string, unknown> | undefined => {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const stableHash = (input: unknown): number => {
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const PricingShipToLightSchema = z.object({
  country: z.string(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
});

export const PricingLineLightSchema = z.object({
  id: z.string(),
  cadKey: z.string().optional().nullable(),
  quantity: POSITIVE_INT.optional(),
  quantities: z.array(POSITIVE_INT).optional(),
  partConfig: z.record(z.string(), z.unknown()).optional(),
  geometry: z.unknown().optional(),
  calculateTax: z.boolean().optional(),
  shipTo: PricingShipToLightSchema.optional(),
  customerType: z.enum(['B2B', 'B2C']).optional(),
  vatNumber: z.string().optional(),
  legacyRequest: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PricingInputLightSchema = z.object({
  quoteId: z.string().optional(),
  currency: z.string().default('USD'),
  lines: z.array(PricingLineLightSchema).min(1),
});

export type PricingLineLight = z.infer<typeof PricingLineLightSchema>;
export type PricingInputLight = z.infer<typeof PricingInputLightSchema>;

const selectLineForV2 = (input: PricingInputLight): PricingLineLight | null =>
  input.lines.find((line) => Boolean(line.partConfig)) ?? null;

const ensureQuantities = (line: PricingLineLight): number[] => {
  if (line.quantities && line.quantities.length) {
    return dedupeSorted(line.quantities);
  }
  if (typeof line.quantity === 'number' && Number.isFinite(line.quantity) && line.quantity > 0) {
    return [Math.trunc(line.quantity)];
  }
  return [1];
};

export function toV2PricingRequest(input: PricingInputLight): Record<string, unknown> {
  const line = selectLineForV2(input);
  if (!line?.partConfig) {
    throw new Error('Missing partConfig for v2 pricing request');
  }

  const quantities = ensureQuantities(line);
  const payload: Record<string, unknown> = {
    part_config: line.partConfig,
    quantities,
  };

  if ('geometry' in line) {
    payload.geometry_data = line.geometry ?? undefined;
  }
  if (typeof line.calculateTax === 'boolean') {
    payload.calculateTax = line.calculateTax;
  }
  if (line.shipTo) {
    payload.shipTo = line.shipTo;
  }
  if (line.customerType) {
    payload.customerType = line.customerType;
  }
  if (line.vatNumber) {
    payload.vatNumber = line.vatNumber;
  }

  return payload;
}

export function toLegacyPricingRequest(input: PricingInputLight): Record<string, unknown> {
  const line = input.lines.find((entry) => Boolean(entry.legacyRequest));
  if (!line?.legacyRequest) {
    throw new Error('Missing legacyRequest payload for legacy pricing fallback');
  }
  return line.legacyRequest;
}

export function fromV2(payload: unknown, fallbackCurrency: string): PricingComputationVNext {
  const envelope = isRecord(payload) ? payload : {};
  const pricing = isRecord(envelope.pricing) ? envelope.pricing : {};
  const currency = pickCurrency(pricing.currency, fallbackCurrency);

  const matrix = Array.isArray(pricing.pricing_matrix)
    ? pricing.pricing_matrix.map((entry: unknown) => {
        const row = isRecord(entry) ? entry : {};
        const rowCurrency = pickCurrency(row.currency, currency);
        return {
          quantity: coerceInteger(row.quantity) ?? 0,
          unitPrice: coerceNumber(row.unit_price),
          totalPrice: coerceNumber(row.total_price),
          leadTimeDays: coerceNumber(row.lead_time_days),
          marginPercentage: coerceNumber(row.margin_percentage),
          discountPercentage: coerceNumber(row.quantity_discount),
          currency: rowCurrency,
          breakdown: mapCostBreakdown(row.cost_factors),
        };
      })
    : [];

  const leadTimesRecord = isRecord(pricing.lead_times) ? pricing.lead_times : null;
  const leadTimes = leadTimesRecord
    ? {
        standard: coerceNumber(leadTimesRecord.standard),
        expedited: coerceNumber(leadTimesRecord.expedited),
      }
    : undefined;

  const minimumsRecord = isRecord(pricing.minimums) ? pricing.minimums : null;
  const minimums = minimumsRecord
    ? {
        quantity: coerceNumber(minimumsRecord.quantity),
        value: coerceNumber(minimumsRecord.value),
      }
    : undefined;

  let tax: PricingComputationVNext['tax'];
  if (isRecord(pricing.tax)) {
    const taxLines = mapTaxLines(pricing.tax.lines);
    const totalTax = coerceNumber(pricing.tax.totalTax ?? pricing.tax.total_tax);
    if (
      taxLines &&
      totalTax !== null &&
      typeof pricing.tax.jurisdiction === 'string' &&
      typeof pricing.tax.provider === 'string'
    ) {
      tax = {
        totalTax,
        jurisdiction: pricing.tax.jurisdiction,
        provider: pricing.tax.provider,
        lines: taxLines,
        metadata: isRecord(pricing.tax.metadata) ? pricing.tax.metadata : undefined,
      };
    }
  }

  const metadata = cleanMetadata({
    meta: envelope.meta,
    cache: envelope.cache,
    calculationTimeMs:
      coerceNumber(envelope.calculation_time_ms ?? envelope.compute_ms ?? envelope.duration_ms) ?? undefined,
    timestamp: envelope.timestamp,
    source: envelope.source,
  });

  return PricingComputationVNextSchema.parse({
    source: 'engine_v2',
    currency,
    matrix,
    leadTimes,
    minimums,
    tax,
    metadata,
  });
}

export function fromLegacy(payload: unknown, fallbackCurrency: string): PricingComputationVNext {
  const envelope = isRecord(payload) ? payload : {};
  const breakdown = mapCostBreakdown(envelope.breakdown);
  const unitPrice = coerceNumber(envelope.unit_price);
  const totalPrice = coerceNumber(envelope.total_price);
  const rawQuantity = coerceInteger(envelope.quantity) ?? coerceInteger(envelope.min_order_qty);
  const quantity = rawQuantity && rawQuantity > 0 ? rawQuantity : 1;
  const leadTimeDays = coerceNumber(envelope.lead_time_days);

  const minimumQuantity = coerceNumber(envelope.min_order_qty);
  const minimumValue = coerceNumber(envelope.min_order_value);
  const minimums =
    minimumQuantity !== null || minimumValue !== null
      ? {
          quantity: minimumQuantity,
          value: minimumValue,
        }
      : undefined;

  const metadata = cleanMetadata({
    status: typeof envelope.status === 'string' ? envelope.status : undefined,
    rushSurcharge: coerceNumber(envelope.rush_surcharge) ?? undefined,
  });

  return PricingComputationVNextSchema.parse({
    source: 'legacy',
    currency: fallbackCurrency,
    matrix: [
      {
        quantity,
        unitPrice,
        totalPrice,
        leadTimeDays,
        marginPercentage: breakdown?.margin ?? null,
        discountPercentage: null,
        currency: fallbackCurrency,
        breakdown,
      },
    ],
    leadTimes: leadTimeDays !== null && leadTimeDays !== undefined ? { standard: leadTimeDays, expedited: null } : undefined,
    minimums,
    metadata,
  });
}

export function computeDeterministicEstimate(input: PricingInputLight): PricingComputationVNext {
  const primaryLine = input.lines[0];
  const quantities = ensureQuantities(primaryLine);
  const baseQuantity = quantities[0] ?? 1;
  const currency = input.currency ?? 'USD';
  const seed = stableHash({
    quoteId: input.quoteId ?? 'quote',
    lineId: primaryLine.id,
    cadKey: primaryLine.cadKey ?? null,
    quantity: baseQuantity,
  });

  const baseUnit = 80 + (seed % 6000) / 100;
  const tiers = quantities.length >= 3 ? quantities : [baseQuantity, baseQuantity * 2, baseQuantity * 5];

  const matrix = tiers.map((qty, index) => {
    const variance = ((seed >> (index * 3)) & 0xff) / 1024;
    const unitPrice = Number((baseUnit * (1 + variance)).toFixed(2));
    const totalPrice = Number((unitPrice * qty).toFixed(2));
    const breakdown = {
      material: Number((unitPrice * 0.34).toFixed(2)),
      machining: Number((unitPrice * 0.26).toFixed(2)),
      finish: Number((unitPrice * 0.12).toFixed(2)),
      inspection: Number((unitPrice * 0.08).toFixed(2)),
      overhead: Number((unitPrice * 0.1).toFixed(2)),
      margin: Number((unitPrice * 0.1).toFixed(2)),
    };

    return {
      quantity: qty,
      unitPrice,
      totalPrice,
      leadTimeDays: 5 + ((seed >> (index + 1)) & 0x3),
      marginPercentage: null,
      discountPercentage: index === 0 ? null : Number((Math.min(20, index * 5)).toFixed(2)),
      currency,
      breakdown,
    };
  });

  const standardLead = matrix[0]?.leadTimeDays ?? 5;

  return PricingComputationVNextSchema.parse({
    source: 'estimate',
    currency,
    matrix,
    leadTimes: {
      standard: standardLead,
      expedited: Math.max(2, standardLead - 2),
    },
    minimums: {
      quantity: 1,
      value: Number((matrix[0]?.unitPrice ?? 0).toFixed(2)),
    },
    metadata: {
      generator: 'deterministic_estimate',
      seed: seed.toString(16),
    },
  });
}

export type PricingComputationVNext = z.infer<typeof PricingComputationVNextSchema>;
export type PricingEstimateRequestVNext = z.infer<typeof PricingEstimateRequestVNextSchema>;
export type PricingShipToLight = z.infer<typeof PricingShipToLightSchema>;
