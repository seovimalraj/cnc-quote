/**
 * PricingCoreModule
 * 
 * Shared pricing infrastructure that both PricingModule and AdminPricingModule depend on.
 * This breaks the circular dependency between them.
 * 
 * Contains:
 * - Pricing queue configuration
 * - Shared pricing types/contracts
 * - Common pricing utilities
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const PRICING_QUEUE_NAME = 'pricing';
export const PRICING_RECALC_JOB = 'pricing-recalc';
export const PRICING_RECALC_QUEUE = 'pricing-recalc';

@Module({
  imports: [
    // Register the pricing queue so both PricingModule and AdminPricingModule can use it
    BullModule.registerQueue({
      name: PRICING_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: PRICING_RECALC_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class PricingCoreModule {}
