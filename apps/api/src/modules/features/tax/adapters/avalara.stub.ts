/**
 * Step 20: Avalara Stub Adapter
 * Deterministic stub for EU VAT and other global taxes
 */

import {
  ITaxAdapter,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxAddress,
  TaxAdapterError,
} from './adapter.interface';

/**
 * EU VAT standard rates (stub data)
 */
const EU_VAT_RATES: Record<string, number> = {
  AT: 0.20, // Austria
  BE: 0.21, // Belgium
  BG: 0.20, // Bulgaria
  HR: 0.25, // Croatia
  CY: 0.19, // Cyprus
  CZ: 0.21, // Czech Republic
  DK: 0.25, // Denmark
  EE: 0.20, // Estonia
  FI: 0.24, // Finland
  FR: 0.20, // France
  DE: 0.19, // Germany
  GR: 0.24, // Greece
  HU: 0.27, // Hungary
  IE: 0.23, // Ireland
  IT: 0.22, // Italy
  LV: 0.21, // Latvia
  LT: 0.21, // Lithuania
  LU: 0.17, // Luxembourg
  MT: 0.18, // Malta
  NL: 0.21, // Netherlands
  PL: 0.23, // Poland
  PT: 0.23, // Portugal
  RO: 0.19, // Romania
  SK: 0.20, // Slovakia
  SI: 0.22, // Slovenia
  ES: 0.21, // Spain
  SE: 0.25, // Sweden
  GB: 0.20, // United Kingdom (post-Brexit, still VAT)
};

/**
 * India GST rates (stub data)
 * Simplified: using 18% as standard rate for manufacturing
 */
const INDIA_GST_RATE = 0.18;

/**
 * Avalara stub adapter (EU VAT + India GST + other regions)
 */
export class AvalaraStubAdapter implements ITaxAdapter {
  readonly name = 'avalara-stub';

  async calculateTax(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    const country = input.shipTo.country?.toUpperCase();

    if (!country) {
      throw new TaxAdapterError(
        this.name,
        'INVALID_ADDRESS',
        'Ship-to country is required',
      );
    }

    // Route to appropriate calculator
    if (this.isEUCountry(country)) {
      return this.calculateEUVAT(input);
    } else if (country === 'IN') {
      return this.calculateIndiaGST(input);
    } else if (country === 'US') {
      // US handled by TaxJar stub
      throw new TaxAdapterError(
        this.name,
        'UNSUPPORTED_COUNTRY',
        'US tax should be calculated by TaxJar adapter',
      );
    } else {
      // Default: no tax for other countries (stub)
      return this.calculateZeroTax(input);
    }
  }

  /**
   * Calculate EU VAT
   */
  private async calculateEUVAT(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    const country = input.shipTo.country!.toUpperCase();
    const vatRate = EU_VAT_RATES[country];

    if (!vatRate) {
      throw new TaxAdapterError(
        this.name,
        'INVALID_COUNTRY',
        `Unknown EU country: ${country}`,
      );
    }

    // B2B with valid VAT number: Reverse charge (0% VAT)
    if (input.customerType === 'B2B' && input.vatNumber) {
      const vatValid = await this.validateVATNumber(input.vatNumber, country);
      if (vatValid.valid) {
        return {
          totalTax: 0,
          currency: input.currency,
          lines: input.lines.map((line) => ({
            lineId: line.lineId,
            taxAmount: 0,
            taxRate: 0,
            taxableAmount: line.amount,
            jurisdiction: country,
            taxType: 'VAT',
            taxName: 'Reverse Charge',
          })),
          jurisdiction: country,
          provider: this.name,
          calculatedAt: new Date(),
          metadata: {
            note: 'B2B reverse charge - customer liable for VAT',
            vatNumber: input.vatNumber,
          },
        };
      }
    }

    // B2C or B2B without valid VAT: Apply standard VAT rate
    const lines = input.lines.map((line) => {
      const taxableAmount = line.amount;
      const taxAmount = Number((taxableAmount * vatRate).toFixed(2));

      return {
        lineId: line.lineId,
        taxAmount,
        taxRate: vatRate,
        taxableAmount,
        jurisdiction: country,
        taxType: 'VAT',
        taxName: 'Standard VAT',
      };
    });

    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);

    return {
      totalTax: Number(totalTax.toFixed(2)),
      currency: input.currency,
      lines,
      jurisdiction: country,
      provider: this.name,
      calculatedAt: new Date(),
      metadata: {
        note: 'Standard EU VAT rate applied',
        vatRate,
      },
    };
  }

  /**
   * Calculate India GST
   */
  private async calculateIndiaGST(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    const shipToState = input.shipTo.state?.toUpperCase();
    const shipFromState = input.shipFrom.state?.toUpperCase();

    if (!shipToState || !shipFromState) {
      throw new TaxAdapterError(
        this.name,
        'INVALID_ADDRESS',
        'State is required for India GST calculation',
      );
    }

    // Intra-state: CGST + SGST (9% + 9% = 18%)
    // Inter-state: IGST (18%)
    const isInterState = shipToState !== shipFromState;
    const gstRate = INDIA_GST_RATE;

    const lines = input.lines.map((line) => {
      const taxableAmount = line.amount;
      const taxAmount = Number((taxableAmount * gstRate).toFixed(2));

      if (isInterState) {
        return {
          lineId: line.lineId,
          taxAmount,
          taxRate: gstRate,
          taxableAmount,
          jurisdiction: `IN-${shipToState}`,
          taxType: 'GST',
          taxName: 'IGST',
        };
      } else {
        // Split equally between CGST and SGST
        return {
          lineId: line.lineId,
          taxAmount,
          taxRate: gstRate,
          taxableAmount,
          jurisdiction: `IN-${shipToState}`,
          taxType: 'GST',
          taxName: 'CGST/SGST',
        };
      }
    });

    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);

    return {
      totalTax: Number(totalTax.toFixed(2)),
      currency: input.currency,
      lines,
      jurisdiction: `IN-${shipToState}`,
      provider: this.name,
      calculatedAt: new Date(),
      metadata: {
        note: isInterState ? 'Inter-state IGST applied' : 'Intra-state CGST + SGST applied',
        gstRate,
        shipFromState,
        shipToState,
      },
    };
  }

  /**
   * Calculate zero tax for unsupported countries
   */
  private async calculateZeroTax(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    return {
      totalTax: 0,
      currency: input.currency,
      lines: input.lines.map((line) => ({
        lineId: line.lineId,
        taxAmount: 0,
        taxRate: 0,
        taxableAmount: line.amount,
        jurisdiction: input.shipTo.country!,
        taxType: 'None',
        taxName: 'No Tax',
      })),
      jurisdiction: input.shipTo.country!,
      provider: this.name,
      calculatedAt: new Date(),
      metadata: {
        note: 'Country not supported - no tax applied (stub)',
      },
    };
  }

  /**
   * Check if country is in EU
   */
  private isEUCountry(country: string): boolean {
    return Object.keys(EU_VAT_RATES).includes(country.toUpperCase());
  }

  /**
   * Validate VAT number (stub)
   */
  async validateVATNumber(vatNumber: string, country: string): Promise<{ valid: boolean; companyName?: string }> {
    // Stub validation: Check format only
    const cleanVat = vatNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const countryCode = cleanVat.substring(0, 2);

    const valid = countryCode === country.toUpperCase() && cleanVat.length >= 8;

    return {
      valid,
      companyName: valid ? 'Test Company (Stub)' : undefined,
    };
  }

  async validateAddress(address: TaxAddress): Promise<{ valid: boolean; normalized?: TaxAddress }> {
    const valid = Boolean(address.country);
    return {
      valid,
      normalized: valid ? address : undefined,
    };
  }
}
