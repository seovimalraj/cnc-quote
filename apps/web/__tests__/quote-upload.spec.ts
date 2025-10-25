import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from '../src/lib/retry';

// This test simulates a retryable fetch for quote creation
describe('quote create retry flow (simulated)', () => {
  it('retries once and succeeds', async () => {
    let calls = 0;
    const fakeFetch = async () => {
      calls += 1;
      if (calls < 2) {
        const e: any = new Error('server error');
        e.status = 502;
        throw e;
      }
      return { id: 'q-123', items: [{ id: 'qi-1' }] };
    };
    const data = await withRetry(fakeFetch, { retries: 2, baseDelayMs: 1, shouldRetry: (e) => (e as any)?.status >= 500 });
    assert.equal(data.id, 'q-123');
    assert.equal(calls, 2);
  });
});
