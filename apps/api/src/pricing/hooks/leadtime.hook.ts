/**
 * Step 12: Lead Time Pricing Hook
 * Integrates dynamic lead time calculation into pricing orchestrator
 */

import { Injectable, Logger } from '@nestjs/common';
import { LeadtimeService } from '../../leadtime/leadtime.service';
import {
  PricingHookInput,
  LeadClass,
  LeadtimeResponse,
} from '@cnc-quote/shared';

export interface LeadtimePricingContext {
  process: string;
  orgId: string;
  basePrice: number;
  estimatedMinutes: number;
  machineGroup: string;
  desiredClass?: LeadClass;
}

export interface LeadtimePricingResult {
  leadtimeOptions: LeadtimeResponse;
  selectedOption?: {
    class: LeadClass;
    priceDelta: number;
    promisedShipDate: string;
    surgeApplied: boolean;
    utilizationWindow: number;
  };
  lineItem?: {
    type: 'leadtime_adjustment';
    description: string;
    amount: number;
    metadata: Record<string, any>;
  };
}

@Injectable()
export class LeadtimeHook {
  private readonly logger = new Logger(LeadtimeHook.name);

  constructor(private readonly leadtimeService: LeadtimeService) {}

  /**
   * Execute lead time pricing hook
   * This should be called as a terminal hook in the pricing orchestrator
   */
  async execute(
    context: LeadtimePricingContext,
  ): Promise<LeadtimePricingResult> {
    const startTime = Date.now();

    try {
      // Compute all available lead time options
      const input: PricingHookInput = {
        process: context.process,
        orgId: context.orgId,
        basePrice: context.basePrice,
        estimatedMinutes: context.estimatedMinutes,
        machineGroup: context.machineGroup,
        desiredClass: context.desiredClass,
      };

      const leadtimeOptions = await this.leadtimeService.computeOptions(input);

      // If user specified a desired class, select it
      let selectedOption: LeadtimePricingResult['selectedOption'];
      let lineItem: LeadtimePricingResult['lineItem'];

      if (context.desiredClass) {
        const option = leadtimeOptions.options.find(
          (opt) => opt.class === context.desiredClass,
        );

        if (option) {
          selectedOption = {
            class: option.class,
            priceDelta: option.priceDelta,
            promisedShipDate: option.shipDate,
            surgeApplied: option.surgeApplied,
            utilizationWindow: option.utilizationWindow,
          };

          // Create line item for price delta
          if (option.priceDelta !== 0) {
            lineItem = {
              type: 'leadtime_adjustment',
              description: this.formatLineItemDescription(option),
              amount: option.priceDelta,
              metadata: {
                leadClass: option.class,
                days: option.days,
                shipDate: option.shipDate,
                surgeApplied: option.surgeApplied,
                utilizationWindow: option.utilizationWindow,
              },
            };
          }

          // Emit telemetry
          this.emitClassSelectedEvent({
            class: option.class,
            days: option.days,
            priceDelta: option.priceDelta,
            surgeApplied: option.surgeApplied,
            utilizationWindow: option.utilizationWindow,
          });
        } else {
          this.logger.warn(
            `Desired lead time class '${context.desiredClass}' not available`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Lead time hook executed in ${duration}ms`);

      return {
        leadtimeOptions,
        selectedOption,
        lineItem,
      };
    } catch (error) {
      this.logger.error(
        `Lead time hook failed: ${error.message}`,
        error.stack,
      );

      // Return minimal fallback
      return {
        leadtimeOptions: {
          options: [],
          basePrice: context.basePrice,
          currency: 'INR',
        },
      };
    }
  }

  /**
   * Format line item description for invoice
   */
  private formatLineItemDescription(option: {
    class: LeadClass;
    days: number;
    surgeApplied: boolean;
  }): string {
    const className =
      option.class === 'econ'
        ? 'Economy'
        : option.class === 'standard'
        ? 'Standard'
        : 'Express';

    if (option.surgeApplied) {
      return `${className} Lead Time (${option.days} days) - Surge Pricing`;
    }

    if (option.class === 'econ') {
      return `${className} Lead Time (${option.days} days) - Economy Discount`;
    }

    return `${className} Lead Time (${option.days} days)`;
  }

  /**
   * Emit telemetry event for class selection
   */
  private emitClassSelectedEvent(data: {
    class: LeadClass;
    days: number;
    priceDelta: number;
    surgeApplied: boolean;
    utilizationWindow: number;
  }): void {
    this.logger.debug(
      `LEADTIME_CLASS_SELECTED: class=${data.class}, days=${data.days}, delta=${data.priceDelta}, surge=${data.surgeApplied}, util=${data.utilizationWindow}`,
    );
  }
}
