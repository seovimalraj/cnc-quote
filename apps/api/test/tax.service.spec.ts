/**
 * Step 20: Tax Service Unit Tests
 * Test US, EU, and India tax calculations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TaxService } from '../../../src/tax/tax.service';
import { TaxJarStubAdapter } from '../../../src/tax/adapters/taxjar.stub';
import { AvalaraStubAdapter } from '../../../src/tax/adapters/avalara.stub';

describe('TaxService', () => {
  let service: TaxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxService],
    }).compile();

    service = module.get<TaxService>(TaxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('US Sales Tax', () => {
    it('should calculate CA sales tax at 7.25%', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'USD',
        shipTo: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
          postalCode: '94102',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 1000,
            quantity: 10,
            description: 'CNC Milled Part',
          },
        ],
      });

      expect(result.totalTax).toBeCloseTo(72.5, 2); // $1000 * 0.0725
      expect(result.provider).toBe('taxjar-stub');
      expect(result.jurisdiction).toBe('US-CA');
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].taxRate).toBe(0.0725);
      expect(result.lines[0].taxAmount).toBeCloseTo(72.5, 2);
    });

    it('should calculate NY sales tax at 4%', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'USD',
        shipTo: {
          country: 'US',
          state: 'NY',
          postalCode: '10001',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 500,
            quantity: 5,
          },
        ],
      });

      expect(result.totalTax).toBeCloseTo(20, 2); // $500 * 0.04
      expect(result.jurisdiction).toBe('US-NY');
      expect(result.lines[0].taxRate).toBe(0.04);
    });

    it('should apply zero tax for no-tax states', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'USD',
        shipTo: {
          country: 'US',
          state: 'DE', // Delaware - no sales tax
          postalCode: '19901',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 1000,
            quantity: 10,
          },
        ],
      });

      expect(result.totalTax).toBe(0);
      expect(result.jurisdiction).toBe('US-DE');
      expect(result.lines[0].taxRate).toBe(0);
    });

    it('should handle invalid state', async () => {
      await expect(
        service.computeTax({
          orgId: 'test-org',
          currency: 'USD',
          shipTo: {
            country: 'US',
            state: 'INVALID',
            postalCode: '00000',
          },
          lines: [{ lineId: 'line1', amount: 100, quantity: 1 }],
        }),
      ).rejects.toThrow();
    });
  });

  describe('EU VAT', () => {
    it('should calculate Germany standard VAT at 19%', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'EUR',
        shipTo: {
          country: 'DE',
          postalCode: '10115',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 1000,
            quantity: 10,
          },
        ],
        customerType: 'B2C',
      });

      expect(result.totalTax).toBeCloseTo(190, 2); // €1000 * 0.19
      expect(result.provider).toBe('avalara-stub');
      expect(result.jurisdiction).toBe('DE');
      expect(result.lines[0].taxRate).toBe(0.19);
    });

    it('should apply reverse charge for B2B with valid VAT', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'EUR',
        shipTo: {
          country: 'FR',
          postalCode: '75001',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 1000,
            quantity: 10,
          },
        ],
        customerType: 'B2B',
        vatNumber: 'FR12345678901',
      });

      expect(result.totalTax).toBe(0); // Reverse charge - buyer pays VAT
      expect(result.jurisdiction).toBe('FR');
      expect(result.lines[0].taxRate).toBe(0);
    });

    it('should apply standard VAT for B2B without valid VAT', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'EUR',
        shipTo: {
          country: 'IT',
          postalCode: '00100',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 1000,
            quantity: 10,
          },
        ],
        customerType: 'B2B',
        // No VAT number provided
      });

      expect(result.totalTax).toBeCloseTo(220, 2); // €1000 * 0.22 (Italy standard rate)
      expect(result.jurisdiction).toBe('IT');
      expect(result.lines[0].taxRate).toBe(0.22);
    });

    it('should calculate VAT for all EU countries', async () => {
      const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE', 'AT'];

      for (const country of euCountries) {
        const result = await service.computeTax({
          orgId: 'test-org',
          currency: 'EUR',
          shipTo: {
            country,
            postalCode: '00000',
          },
          lines: [{ lineId: 'line1', amount: 1000, quantity: 10 }],
          customerType: 'B2C',
        });

        expect(result.totalTax).toBeGreaterThan(0);
        expect(result.jurisdiction).toBe(country);
        expect(result.provider).toBe('avalara-stub');
      }
    });
  });

  describe('India GST', () => {
    it('should calculate IGST for inter-state at 18%', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'INR',
        shipTo: {
          country: 'IN',
          state: 'MH', // Maharashtra (ship to)
          postalCode: '400001',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 10000,
            quantity: 10,
          },
        ],
      });

      // Ship from CA (default), ship to MH - inter-state
      expect(result.totalTax).toBeCloseTo(1800, 2); // ₹10000 * 0.18
      expect(result.provider).toBe('avalara-stub');
      expect(result.jurisdiction).toContain('IN-');
      expect(result.lines[0].taxRate).toBe(0.18);
    });

    it('should calculate CGST+SGST for intra-state at 18%', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'INR',
        shipTo: {
          country: 'IN',
          state: 'KA', // Karnataka
          postalCode: '560001',
        },
        lines: [
          {
            lineId: 'line1',
            amount: 10000,
            quantity: 10,
          },
        ],
      });

      // For intra-state: CGST 9% + SGST 9% = 18% total
      expect(result.totalTax).toBeCloseTo(1800, 2);
      expect(result.jurisdiction).toContain('IN-');
      expect(result.lines[0].taxRate).toBe(0.18);
    });

    it('should handle multiple line items', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'INR',
        shipTo: {
          country: 'IN',
          state: 'DL', // Delhi
          postalCode: '110001',
        },
        lines: [
          { lineId: 'line1', amount: 5000, quantity: 5 },
          { lineId: 'line2', amount: 3000, quantity: 3 },
          { lineId: 'line3', amount: 2000, quantity: 2 },
        ],
      });

      const expectedTotal = (5000 + 3000 + 2000) * 0.18;
      expect(result.totalTax).toBeCloseTo(expectedTotal, 2);
      expect(result.lines).toHaveLength(3);
      expect(result.lines.reduce((sum, line) => sum + line.taxAmount, 0)).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Error Handling', () => {
    it('should return zero tax for unsupported countries', async () => {
      const result = await service.computeTax({
        orgId: 'test-org',
        currency: 'AUD',
        shipTo: {
          country: 'AU', // Australia - not supported
          postalCode: '2000',
        },
        lines: [{ lineId: 'line1', amount: 1000, quantity: 10 }],
      });

      expect(result.totalTax).toBe(0);
      expect(result.provider).toBe('avalara-stub');
    });

    it('should validate required fields', async () => {
      await expect(
        service.computeTax({
          orgId: 'test-org',
          currency: 'USD',
          shipTo: {
            country: 'US',
            // Missing state
          },
          lines: [{ lineId: 'line1', amount: 1000, quantity: 10 }],
        }),
      ).rejects.toThrow();
    });
  });

  describe('VAT Number Validation', () => {
    it('should validate EU VAT number format', async () => {
      const validResult = await service.validateVATNumber('DE', 'DE123456789');
      expect(validResult.valid).toBe(true);

      const invalidResult = await service.validateVATNumber('DE', 'INVALID');
      expect(invalidResult.valid).toBe(false);
    });

    it('should reject VAT validation for non-EU countries', async () => {
      const result = await service.validateVATNumber('US', 'US123456789');
      expect(result.valid).toBe(false);
    });
  });
});
