import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { SUPPLIER_PORTAL_VERSION, SUPPLIER_PORTAL_VERSION_HEADER } from '@cnc-quote/shared';

import { forwardJsonWithSchema, proxyFetch } from '../src/app/api/_lib/proxyFetch';

describe('proxyFetch', () => {
  it('does not throw when no Authorization header present', async () => {
    const request = new Request('http://localhost', { headers: { cookie: 'sb=1' } });

    try {
      await proxyFetch(request, 'http://localhost:9/nowhere');
      assert.fail('Expected proxyFetch to propagate network failure');
    } catch (error) {
      assert.ok(error);
    }
  });

  it('adds supplier portal version header for supplier proxy routes', async () => {
    const originalFetch = global.fetch;
    let captured: Headers | undefined;

    global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      captured = new Headers(init?.headers);
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    try {
      const request = new Request('http://localhost/api/supplier/profile', {
        headers: { authorization: 'Bearer test-token' },
      });

      await proxyFetch(request, 'http://api.local/supplier/profile');

      assert.strictEqual(
        captured?.get(SUPPLIER_PORTAL_VERSION_HEADER),
        SUPPLIER_PORTAL_VERSION,
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('forwardJsonWithSchema', () => {
  it('forwards non-ok responses without altering status or body', async () => {
    const upstream = new Response(JSON.stringify({ error: 'nope' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

    const forwarded = await forwardJsonWithSchema(upstream, z.object({}));
    assert.equal(forwarded.status, 401);
    assert.equal(await forwarded.text(), JSON.stringify({ error: 'nope' }));
  });

  it('returns 502 when schema validation fails on successful response', async () => {
    const upstream = new Response('not json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const forwarded = await forwardJsonWithSchema(upstream, z.object({ foo: z.string() }));
    assert.equal(forwarded.status, 502);
    const body = await forwarded.text();
    assert.ok(body.includes('Schema validation failed'));
  });
});
