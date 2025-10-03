/**
 * Step 20: TaxJar Stub Adapter
 * Deterministic stub for development and testing
 */

import {
  ITaxAdapter,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxAddress,
  TaxAdapterError,
} from './adapter.interface';

/**
 * US State sales tax rates (stub data)
 */
const US_STATE_TAX_RATES: Record<string, number> = {
  AL: 0.04, // Alabama
  AK: 0.00, // Alaska
  AZ: 0.056, // Arizona
  AR: 0.065, // Arkansas
  CA: 0.0725, // California
  CO: 0.029, // Colorado
  CT: 0.0635, // Connecticut
  DE: 0.00, // Delaware
  FL: 0.06, // Florida
  GA: 0.04, // Georgia
  HI: 0.04, // Hawaii
  ID: 0.06, // Idaho
  IL: 0.0625, // Illinois
  IN: 0.07, // Indiana
  IA: 0.06, // Iowa
  KS: 0.065, // Kansas
  KY: 0.06, // Kentucky
  LA: 0.0445, // Louisiana
  ME: 0.055, // Maine
  MD: 0.06, // Maryland
  MA: 0.0625, // Massachusetts
  MI: 0.06, // Michigan
  MN: 0.06875, // Minnesota
  MS: 0.07, // Mississippi
  MO: 0.04225, // Missouri
  MT: 0.00, // Montana
  NE: 0.055, // Nebraska
  NV: 0.0685, // Nevada
  NH: 0.00, // New Hampshire
  NJ: 0.06625, // New Jersey
  NM: 0.05125, // New Mexico
  NY: 0.04, // New York
  NC: 0.0475, // North Carolina
  ND: 0.05, // North Dakota
  OH: 0.0575, // Ohio
  OK: 0.045, // Oklahoma
  OR: 0.00, // Oregon
  PA: 0.06, // Pennsylvania
  RI: 0.07, // Rhode Island
  SC: 0.06, // South Carolina
  SD: 0.045, // South Dakota
  TN: 0.07, // Tennessee
  TX: 0.0625, // Texas
  UT: 0.0485, // Utah
  VT: 0.06, // Vermont
  VA: 0.053, // Virginia
  WA: 0.065, // Washington
  WV: 0.06, // West Virginia
  WI: 0.05, // Wisconsin
  WY: 0.04, // Wyoming
  DC: 0.06, // District of Columbia
};

/**
 * TaxJar stub adapter
 */
export class TaxJarStubAdapter implements ITaxAdapter {
  readonly name = 'taxjar-stub';

  async calculateTax(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    // Validate input
    if (!input.shipTo.country) {
      throw new TaxAdapterError(
        this.name,
        'INVALID_ADDRESS',
        'Ship-to country is required',
      );
    }

    // Only support US for TaxJar stub
    if (input.shipTo.country !== 'US') {
      throw new TaxAdapterError(
        this.name,
        'UNSUPPORTED_COUNTRY',
        `Country ${input.shipTo.country} not supported by TaxJar stub`,
      );
    }

    const state = input.shipTo.state?.toUpperCase();
    if (!state) {
      throw new TaxAdapterError(
        this.name,
        'INVALID_ADDRESS',
        'State is required for US addresses',
      );
    }

    const taxRate = US_STATE_TAX_RATES[state];
    if (taxRate === undefined) {
      throw new TaxAdapterError(
        this.name,
        'INVALID_STATE',
        `Unknown state: ${state}`,
      );
    }

    // Calculate tax for each line
    const lines = input.lines.map((line) => {
      const taxableAmount = line.amount;
      const taxAmount = Number((taxableAmount * taxRate).toFixed(2));

      return {
        lineId: line.lineId,
        taxAmount,
        taxRate,
        taxableAmount,
        jurisdiction: `${input.shipTo.state}, US`,
        taxType: 'Sales Tax',
        taxName: 'State Sales Tax',
      };
    });

    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);

    return {
      totalTax: Number(totalTax.toFixed(2)),
      currency: input.currency,
      lines,
      jurisdiction: `${input.shipTo.state}, US`,
      provider: this.name,
      calculatedAt: new Date(),
      metadata: {
        note: 'This is a stub calculation for development only',
        stateRate: taxRate,
      },
    };
  }

  async validateAddress(address: TaxAddress): Promise<{ valid: boolean; normalized?: TaxAddress }> {
    // Stub validation - just check required fields
    const valid = Boolean(
      address.country &&
      (address.country !== 'US' || address.state),
    );

    return {
      valid,
      normalized: valid ? address : undefined,
    };
  }
}
