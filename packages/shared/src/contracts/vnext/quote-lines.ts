import { z } from 'zod';

import { QuoteLinePricingVNextSchema, QuoteLineVNextSchema } from './quote';

export const LinePricingVNextSchema = QuoteLinePricingVNextSchema;
export const QuoteLineUpdateVNextSchema = QuoteLineVNextSchema;

export type LinePricingVNext = z.infer<typeof LinePricingVNextSchema>;
export type QuoteLineUpdateVNext = z.infer<typeof QuoteLineUpdateVNextSchema>;