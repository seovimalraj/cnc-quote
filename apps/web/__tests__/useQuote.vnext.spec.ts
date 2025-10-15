import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { ContractsVNext } from '@cnc-quote/shared';
import { useQuote } from '../src/providers/useQuote';

const server = setupServer(
  http.get('http://localhost/api/quotes/:id', ({ params, request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('view') !== 'vnext') {
      return HttpResponse.json({ error: 'expected view=vnext' }, { status: 400 });
    }

    const payload: ContractsVNext.QuoteSummaryVNext = {
      id: String(params.id),
      orgId: 'org_1',
      customerId: 'cust_1',
      status: 'ready',
      totals: { currency: 'USD', subtotal: 0, total: 0 },
      notes: null,
      terms: null,
      lines: [
        {
          id: 'line-1',
          quoteId: String(params.id),
          fileId: 'file-1',
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

    return HttpResponse.json(payload);
  }),
);

describe('useQuote (vnext)', () => {
  before(() => server.listen());
  after(() => server.close());
  afterEach(() => server.resetHandlers());

  it('fetches QuoteSummaryVNext via ?view=vnext', async () => {
    const data = await useQuote('q_123', { baseUrl: 'http://localhost' });

    assert.equal(data.id, 'q_123');
    assert.equal(data.status, 'ready');
    assert.equal(data.lines.length, 1);
    assert.doesNotThrow(() => ContractsVNext.QuoteSummarySchema.parse(data));
  });
});
