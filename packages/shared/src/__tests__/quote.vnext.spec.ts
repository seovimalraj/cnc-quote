import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { QuoteSummaryVNextSchema } from '../contracts/vnext';
import { toQuoteSummaryVNext } from '../contracts/mappers';

const rawFixturePath = join(__dirname, 'fixtures/quote.bundle.raw.json');
const expectedFixturePath = join(__dirname, 'fixtures/quote.bundle.vnext.json');
const raw = JSON.parse(readFileSync(rawFixturePath, 'utf-8')) as any;
const expected = JSON.parse(readFileSync(expectedFixturePath, 'utf-8')) as any;

describe('contracts/vnext', () => {
  it('maps raw bundle to QuoteSummaryVNext', () => {
    const out = toQuoteSummaryVNext(raw);
    const parsed = QuoteSummaryVNextSchema.parse(out);
    const sanitized = JSON.parse(JSON.stringify(parsed));
    assert.deepEqual(sanitized, expected);
  });
});
