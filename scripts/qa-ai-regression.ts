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

async function loadFixtures(dir: string): Promise<PricingRegressionFixture[]> {
  const entries = await fs.readdir(dir);
  const fixtures: PricingRegressionFixture[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir, entry), 'utf-8');
    const parsed = JSON.parse(raw) as PricingRegressionFixture;
    if (parsed.type !== 'pricing') continue;
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
    console.log(`🧪  Running fixture ${fixture.id}${fixture.description ? ` – ${fixture.description}` : ''}`);

    const breakdown = computePricingBreakdown({
      quantity: fixture.input.quantity,
      metrics: fixture.input.metrics,
      factors: fixture.input.factors,
      tolerance_multiplier: fixture.input.toleranceMultiplier,
    });

    const { passed, failures } = compareBreakdowns(fixture, breakdown);
    if (!passed) {
      failed += 1;
      for (const message of failures) {
        console.error(`   ❌ ${message}`);
      }
    } else {
      console.log('   ✅ Regression match');
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
