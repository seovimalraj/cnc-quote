import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import examples from '../../admin/examples.json';
import type { ReviewListResponse } from '../../admin/types';
import { listQueryZ } from '../../admin/validation';
import { normalizeReviewListParams } from '../../admin/api';

const { list_success: listSuccess, error_validation: errorValidation } = examples;

describe('admin review contract', () => {
  it('accepts default query params', () => {
    const parsed = listQueryZ.parse({});
    assert.equal(parsed.sort, 'createdAt');
    assert.equal(parsed.order, 'desc');
    assert.equal(parsed.limit, 25);
  });

  it('rejects limit above cap', () => {
    assert.throws(() => listQueryZ.parse({ limit: 101 }), /<=100/);
  });

  it('parses multi-value filters', () => {
    const parsed = listQueryZ.parse({
      lane: ['APPROVED', 'IN_REVIEW'],
      priority: ['HIGH', 'EXPEDITE'],
      hasDFM: 'true',
    });

    assert.deepEqual(parsed.lane, ['APPROVED', 'IN_REVIEW']);
    assert.deepEqual(parsed.priority, ['HIGH', 'EXPEDITE']);
    assert.equal(parsed.hasDFM, true);
  });

  it('matches review list response snapshot', () => {
    const payload = listSuccess as ReviewListResponse;
    assert.equal(Array.isArray(payload.data), true);
    assert.equal(typeof payload.meta.limit, 'number');
    assert.equal(typeof payload.stats.totalRows, 'number');
  });

  it('includes validation error contract', () => {
    assert.equal(errorValidation.code, 'VALIDATION_ERROR');
    assert.equal(typeof errorValidation.error, 'string');
    assert.equal(Array.isArray(errorValidation.details), true);
  });

  it('normalizes array filters deterministically', () => {
    const { cacheKey, searchParams } = normalizeReviewListParams({
      lane: ['IN_REVIEW', 'APPROVED'],
      status: ['priority', 'dfm'],
      order: 'asc',
    });

    assert.equal(
      cacheKey,
      'lane=APPROVED&lane=IN_REVIEW&limit=25&order=asc&sort=createdAt&status=dfm&status=priority',
    );
    assert.deepEqual(searchParams.getAll('status'), ['dfm', 'priority']);
  });

  it('rejects invalid sort fields', () => {
    assert.throws(() => normalizeReviewListParams({ sort: 'invalid-field' as any }));
  });
});
