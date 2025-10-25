/**
 * Step 20: Tax Service
 * Core tax calculation service with pluggable adapter pattern
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ITaxAdapter,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxAddress,
  TaxAdapterError,
} from './adapters/adapter.interface';
import { TaxJarStubAdapter } from './adapters/taxjar.stub';
import { AvalaraStubAdapter } from './adapters/avalara.stub';

export interface ComputeTaxInput {
  orgId: string;
  currency: string;
  shipTo: TaxAddress;
  shipFrom?: TaxAddress;
  billTo?: TaxAddress;
  lines: Array<{
    lineId: string;
    amount: number;
    quantity: number;
    taxCode?: string;
    description?: string;
  }>;
  customerType?: 'B2B' | 'B2C';
  vatNumber?: string;
  exemptionCertificate?: string;
}

export interface TaxResult {
  totalTax: number;
  currency: string;
  lines: Array<{
    lineId: string;
    taxAmount: number;
    taxRate: number;
    jurisdiction: string;
  }>;
  jurisdiction: string;
  provider: string;
  calculatedAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);
  private readonly adapters: Map<string, ITaxAdapter> = new Map();
  private readonly defaultShipFrom: TaxAddress;

  constructor() {
    // Register adapters
    this.registerAdapter(new TaxJarStubAdapter());
    this.registerAdapter(new AvalaraStubAdapter());

    // Default ship-from address (can be configured per org in production)
    this.defaultShipFrom = {
      country: 'US',
      state: 'CA',
      city: 'San Francisco',
      postalCode: '94102',
    };

    this.logger.log('Tax service initialized with adapters: ' + Array.from(this.adapters.keys()).join(', '));
  }

  /**
   * Register a tax adapter
   */
  registerAdapter(adapter: ITaxAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Compute tax for a transaction
   */
  async computeTax(input: ComputeTaxInput): Promise<TaxResult> {
    try {
      // Select adapter based on configuration and destination
      const adapter = this.selectAdapter(input.shipTo.country);

      if (!adapter) {
        this.logger.warn(`No tax adapter available for country: ${input.shipTo.country}`);
        return this.getZeroTaxResult(input);
      }

      // Prepare input for adapter
      const adapterInput: TaxCalculationInput = {
        orgId: input.orgId,
        currency: input.currency,
        shipFrom: input.shipFrom || this.defaultShipFrom,
        shipTo: input.shipTo,
        billTo: input.billTo,
        lines: input.lines,
        customerType: input.customerType,
        vatNumber: input.vatNumber,
        exemptionCertificate: input.exemptionCertificate,
      };

      // Calculate tax
      const result = await adapter.calculateTax(adapterInput);

      this.logger.log(
        `Tax calculated for ${input.shipTo.country}: ${result.totalTax} ${result.currency} (${result.provider})`,
      );

      // Convert to service result format
      return {
        totalTax: result.totalTax,
        currency: result.currency,
        lines: result.lines.map((line) => ({
          lineId: line.lineId,
          taxAmount: line.taxAmount,
          taxRate: line.taxRate,
          jurisdiction: line.jurisdiction,
        })),
        jurisdiction: result.jurisdiction,
        provider: result.provider,
        calculatedAt: result.calculatedAt,
        metadata: result.metadata,
      };
    } catch (error) {
      if (error instanceof TaxAdapterError) {
        this.logger.error(`Tax adapter error: ${error.message}`, error.stack);
        throw error;
      }

      this.logger.error(`Unexpected error calculating tax: ${error.message}`, error.stack);
      throw new Error('Failed to calculate tax');
    }
  }

  /**
   * Select appropriate adapter based on country and configuration
   */
  private selectAdapter(country: string): ITaxAdapter | undefined {
    const provider = process.env.TAX_PROVIDER || 'stub';

    // Route based on country
    if (country === 'US') {
      return this.adapters.get('taxjar-stub');
    } else {
      return this.adapters.get('avalara-stub');
    }
  }

  /**
   * Get zero tax result (fallback)
   */
  private getZeroTaxResult(input: ComputeTaxInput): TaxResult {
    return {
      totalTax: 0,
      currency: input.currency,
      lines: input.lines.map((line) => ({
        lineId: line.lineId,
        taxAmount: 0,
        taxRate: 0,
        jurisdiction: input.shipTo.country,
      })),
      jurisdiction: input.shipTo.country,
      provider: 'none',
      calculatedAt: new Date(),
      metadata: {
        note: 'No tax adapter available - returning zero tax',
      },
    };
  }

  /**
   * Validate tax address
   */
  async validateAddress(address: TaxAddress, country?: string): Promise<{ valid: boolean; normalized?: TaxAddress }> {
    const targetCountry = country || address.country;
    const adapter = this.selectAdapter(targetCountry);

    if (!adapter || !adapter.validateAddress) {
      // Basic validation if no adapter
      return {
        valid: Boolean(address.country),
        normalized: address,
      };
    }

    return adapter.validateAddress(address);
  }

  /**
   * Validate VAT number (EU)
   */
  async validateVATNumber(vatNumber: string, country: string): Promise<{ valid: boolean; companyName?: string }> {
    const adapter = this.adapters.get('avalara-stub');

    if (!adapter || !adapter.validateVATNumber) {
      return { valid: false };
    }

    return adapter.validateVATNumber(vatNumber, country);
  }
}
