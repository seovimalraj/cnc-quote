import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry } from '../src/lib/retry';

describe('withRetry', () => {
  it('retries on failure and eventually succeeds', async () => {
  let calls = 0;
  const fn = async () => {
    calls += 1;
    if (calls < 3) throw new Error('fail');
    return 'ok';
  };
    const result = await withRetry(fn, { retries: 3, baseDelayMs: 1 });
    assert.equal(result, 'ok');
    assert.equal(calls, 3);
  });

  it('stops on non-retryable error', async () => {
    let calls = 0;
    const fn = async () => {
      calls += 1;
      const e: any = new Error('bad request');
      e.status = 400;
      throw e;
    };
    await assert.rejects(() => withRetry(fn, { retries: 3, baseDelayMs: 1, shouldRetry: (err) => (err as any)?.status >= 500 }), /bad request/);
    assert.equal(calls, 1);
  });
});
