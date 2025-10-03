/**
 * Step 20: Tax Adapter Interface
 * Pluggable adapter pattern for external tax providers
 */

export interface TaxAddress {
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
  street?: string;
}

export interface TaxLineItem {
  lineId: string;
  amount: number;
  quantity: number;
  taxCode?: string; // Product tax code (e.g., HSN for India, commodity code for EU)
  description?: string;
}

export interface TaxCalculationInput {
  orgId: string;
  currency: string;
  shipFrom: TaxAddress;
  shipTo: TaxAddress;
  billTo?: TaxAddress;
  lines: TaxLineItem[];
  customerType?: 'B2B' | 'B2C';
  vatNumber?: string; // For EU VAT validation
  exemptionCertificate?: string;
}

export interface TaxLineResult {
  lineId: string;
  taxAmount: number;
  taxRate: number;
  taxableAmount: number;
  jurisdiction: string;
  taxType: string; // e.g., 'VAT', 'GST', 'Sales Tax'
  taxName?: string; // e.g., 'CGST', 'SGST', 'IGST'
}

export interface TaxCalculationResult {
  totalTax: number;
  currency: string;
  lines: TaxLineResult[];
  jurisdiction: string;
  provider: string;
  calculatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Tax adapter interface for pluggable providers
 */
export interface ITaxAdapter {
  /**
   * Provider name (e.g., 'taxjar', 'avalara', 'stub')
   */
  readonly name: string;

  /**
   * Calculate tax for a transaction
   */
  calculateTax(input: TaxCalculationInput): Promise<TaxCalculationResult>;

  /**
   * Validate address (optional)
   */
  validateAddress?(address: TaxAddress): Promise<{ valid: boolean; normalized?: TaxAddress }>;

  /**
   * Validate VAT number (EU only, optional)
   */
  validateVATNumber?(vatNumber: string, country: string): Promise<{ valid: boolean; companyName?: string }>;
}

/**
 * Tax adapter error
 */
export class TaxAdapterError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: string,
    message: string,
    public readonly details?: any,
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = 'TaxAdapterError';
  }
}
