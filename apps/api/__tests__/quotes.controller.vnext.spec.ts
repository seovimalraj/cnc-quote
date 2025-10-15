import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';

import { ContractsVNext } from '@cnc-quote/shared';

import { createNestApp } from './test-utils/createNestApp';

let app: Awaited<ReturnType<typeof createNestApp>>;

describe('GET /api/quotes/:id?view=vnext', () => {
  before(async () => {
    const quote: ContractsVNext.QuoteSummaryVNext = {
      id: 'q_123',
      orgId: 'org_001',
      customerId: 'cust_001',
      status: 'ready',
      totals: { subtotal: 0, total: 0, currency: 'USD' },
      notes: null,
      terms: null,
      lines: [
        {
          id: 'line_1',
          quoteId: 'q_123',
          fileId: 'file_1',
          selection: {
            processType: null,
            materialId: null,
            materialSpec: null,
            finishIds: [],
            toleranceClass: null,
            inspectionLevel: null,
            leadTimeOption: null,
            secondaryOperations: [],
            surfaceFinish: null,
            machiningComplexity: null,
            selectedQuantity: null,
            quantities: [],
          },
          pricing: {
            status: 'pending',
            currency: 'USD',
            matrix: [],
          },
          dfm: {
            status: 'pending',
            issues: [],
          },
          audit: {
            createdAt: '2024-10-01T12:00:00.000Z',
            updatedAt: '2024-10-01T12:00:00.000Z',
          },
        },
      ],
      meta: {
        expiresAt: null,
        createdAt: '2024-10-01T12:00:00.000Z',
        updatedAt: '2024-10-01T12:00:00.000Z',
        acceptedAt: null,
        rejectedAt: null,
        emailSentAt: null,
      },
    };

    app = await createNestApp({
      quotesService: {
        getQuoteSummaryVNext: async () => quote,
      },
    });
  });

  after(async () => {
    await app.close();
  });

  it('returns QuoteSummaryVNext payload when view=vnext', async () => {
    const res = await request(app.getHttpServer()).get('/api/quotes/q_123?view=vnext');

    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'q_123');
    assert.equal(res.body.lines.length, 1);
    assert.equal(res.body.status, 'ready');
    assert.doesNotThrow(() => ContractsVNext.QuoteSummarySchema.parse(res.body));
  });
});
