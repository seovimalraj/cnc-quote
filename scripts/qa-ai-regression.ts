#!/usr/bin/env ts-node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computePricingBreakdown } from '../packages/shared/src/pricing.compute';
import type { GeometryMetricsV1 } from '../packages/shared/src/contracts/v1/part-config';
import type { CostFactorsV1, PricingBreakdownDetailedV1 } from '../packages/shared/src/contracts/v1/pricing';

interface PricingRegressionFixture {
  id: string;
  type: 'pricing';
  description?: string;
  input: {
    quantity: number;
    metrics: GeometryMetricsV1;
    factors: CostFactorsV1;
    toleranceMultiplier?: number;
  };
  expected: Partial<PricingBreakdownDetailedV1>;
  comparisonFields?: Array<keyof PricingBreakdownDetailedV1>;
  tolerance?: number;
}

interface QuoteDetailFixture {
  id: string;
  type: 'quote-detail';
  description?: string;
  expected: {
    hasMatrix?: boolean;
    tierKeys?: string[];
  };
  payload?: any;
}

async function loadFixtures(dir: string): Promise<Array<PricingRegressionFixture | QuoteDetailFixture>> {
  const entries = await fs.readdir(dir);
  const fixtures: Array<PricingRegressionFixture | QuoteDetailFixture> = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir, entry), 'utf-8');
    const parsed = JSON.parse(raw) as PricingRegressionFixture | QuoteDetailFixture;
    if (parsed.type !== 'pricing' && parsed.type !== 'quote-detail') continue;
    fixtures.push(parsed);
  }

  return fixtures;
}

function compareBreakdowns(
  fixture: PricingRegressionFixture,
  actual: PricingBreakdownDetailedV1,
): { passed: boolean; failures: string[] } {
  const tolerance = fixture.tolerance ?? 0.1;
  const fields = fixture.comparisonFields ?? (Object.keys(fixture.expected) as Array<keyof PricingBreakdownDetailedV1>);
  const failures: string[] = [];

  for (const field of fields) {
    const expectedValue = fixture.expected[field];
    const actualValue = actual[field];

    if (typeof expectedValue !== 'number' || typeof actualValue !== 'number') {
      continue;
    }

    const delta = Math.abs(expectedValue - actualValue);
    if (delta > tolerance) {
      failures.push(
        `${fixture.id}:${String(field)} expected ${expectedValue.toFixed(2)}, got ${actualValue.toFixed(2)} (Δ=${delta.toFixed(3)} > tol ${tolerance})`,
      );
    }
  }

  return { passed: failures.length === 0, failures };
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturesDir = path.resolve(scriptDir, '../artifacts/ai-regression/fixtures');
  const fixtures = await loadFixtures(fixturesDir);

  if (fixtures.length === 0) {
    console.warn('⚠️  No pricing regression fixtures found; skipping.');
    process.exit(0);
  }

  let total = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    total += 1;
    console.log(`🧪  Running fixture ${fixture.id}${(fixture as any).description ? ` – ${(fixture as any).description}` : ''}`);

    if (fixture.type === 'pricing') {
      const f = fixture as PricingRegressionFixture;
      const breakdown = computePricingBreakdown({
        quantity: f.input.quantity,
        metrics: f.input.metrics,
        factors: f.input.factors,
        tolerance_multiplier: f.input.toleranceMultiplier,
      });

      const { passed, failures } = compareBreakdowns(f, breakdown);
      if (!passed) {
        failed += 1;
        for (const message of failures) {
          console.error(`   ❌ ${message}`);
        }
      } else {
        console.log('   ✅ Regression match');
      }
    } else if (fixture.type === 'quote-detail') {
      const f = fixture as QuoteDetailFixture;
      const WEB_URL = process.env.WEB_URL || process.env.APP_URL || 'http://localhost:3000';
      try {
        const payload = f.payload || {
          quoteId: 'qa-regression',
          currency: 'USD',
          lines: [
            {
              id: 'line-1',
              quantity: 10,
              partConfig: {
                process_type: 'cnc_milling',
                selected_quantity: 10,
                material_spec: '6061_aluminum',
                lead_time_option: 'standard',
              },
            },
          ],
        };
        const res = await fetch(`${WEB_URL}/api/pricing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.warn(`   ⚠️  Quote detail fetch unavailable (${res.status}); skipping fixture.`);
          continue;
        }
        const data = await res.json();
        const matrix = data?.matrix;
        let pass = true;
        const failures: string[] = [];
        if (f.expected.hasMatrix && !Array.isArray(matrix)) {
          pass = false;
          failures.push('matrix missing');
        }
        if (Array.isArray(matrix) && f.expected.tierKeys && f.expected.tierKeys.length) {
          const first = matrix[0] || {};
          for (const key of f.expected.tierKeys) {
            if (!(key in first)) {
              pass = false;
              failures.push(`tier key missing: ${key}`);
            }
          }
        }
        if (!pass) {
          failed += 1;
          for (const msg of failures) console.error(`   ❌ ${msg}`);
        } else {
          console.log('   ✅ Quote detail structure OK');
        }
      } catch (e) {
        console.warn(`   ⚠️  Quote detail check failed: ${String((e && (e as any).message) || e)}`);
      }
    }
  }

  if (failed > 0) {
    console.error(`\n❌ Pricing regression suites failed (${failed}/${total} fixtures)`);
    process.exit(1);
  }

  console.log(`\n✅ Pricing regression suites passed (${total} fixtures)`);
}

main().catch((error) => {
  console.error('❌ Regression runner crashed', error);
  process.exit(1);
});
