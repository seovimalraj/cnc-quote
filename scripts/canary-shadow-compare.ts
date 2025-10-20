#!/usr/bin/env ts-node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface ShadowConfig {
  method: string;
  path: string;
  payload?: unknown;
  responseField?: string;
  allowedDelta?: number;
}

interface FixtureWithShadow {
  id: string;
  shadow?: ShadowConfig;
}

async function readFixtures(dir: string): Promise<FixtureWithShadow[]> {
  const entries = await fs.readdir(dir);
  const fixtures: FixtureWithShadow[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir, entry), 'utf-8');
    const parsed = JSON.parse(raw) as FixtureWithShadow;
    if (parsed.shadow) {
      fixtures.push(parsed);
    }
  }

  return fixtures;
}

async function invoke(baseUrl: string, shadow: ShadowConfig): Promise<unknown> {
  const url = `${baseUrl.replace(/\/$/, '')}${shadow.path.startsWith('/') ? shadow.path : `/${shadow.path}`}`;
  const response = await fetch(url, {
    method: shadow.method ?? 'GET',
    headers: { 'content-type': 'application/json' },
    body: shadow.payload ? JSON.stringify(shadow.payload) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Request to ${url} failed (${response.status})`);
  }

  const data = await response.json();
  return shadow.responseField ? resolvePath(data, shadow.responseField) : data;
}

function resolvePath(obj: unknown, pathExpr: string): unknown {
  const segments = pathExpr.split('.');
  let current: any = obj;
  for (const segment of segments) {
    if (current == null) return undefined;
    current = current[segment];
  }
  return current;
}

function ensureNumeric(value: unknown, label: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} is not numeric`);
  }
  return value;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturesDir = path.resolve(scriptDir, '../artifacts/ai-regression/fixtures');
  const fixtures = await readFixtures(fixturesDir);

  if (fixtures.length === 0) {
    console.warn('⚠️  No fixtures with shadow configuration found.');
    process.exit(0);
  }

  const baselineUrl = process.env.SHADOW_BASELINE_URL ?? 'http://localhost:3001';
  const canaryUrl = process.env.SHADOW_CANARY_URL ?? 'http://localhost:4001';

  console.log(`🔍 Comparing baseline (${baselineUrl}) vs canary (${canaryUrl})`);

  let failures = 0;

  for (const fixture of fixtures) {
    if (!fixture.shadow) continue;
    const { shadow } = fixture;

    console.log(`   • ${fixture.id} → ${shadow.method?.toUpperCase() ?? 'GET'} ${shadow.path}`);
    try {
      const [baselineResult, canaryResult] = await Promise.all([
        invoke(baselineUrl, shadow),
        invoke(canaryUrl, shadow),
      ]);

      const baselineValue = ensureNumeric(baselineResult, 'baseline response');
      const canaryValue = ensureNumeric(canaryResult, 'canary response');
      const delta = Math.abs(baselineValue - canaryValue);
      const allowedDelta = shadow.allowedDelta ?? 1;

      if (delta > allowedDelta) {
        failures += 1;
        console.error(
          `     ❌ Drift detected. Baseline=${baselineValue.toFixed(2)}, Canary=${canaryValue.toFixed(2)}, Δ=${delta.toFixed(2)} > ${allowedDelta}`,
        );
      } else {
        console.log(
          `     ✅ Within tolerance. Baseline=${baselineValue.toFixed(2)}, Canary=${canaryValue.toFixed(2)}, Δ=${delta.toFixed(2)} (≤ ${allowedDelta})`,
        );
      }
    } catch (error) {
      failures += 1;
      console.error(`     ❌ Shadow comparison failed: ${(error as Error).message}`);
    }
  }

  if (failures > 0) {
    console.error(`\n❌ Canary shadow comparisons failed (${failures} scenario(s))`);
    process.exit(1);
  }

  console.log('\n✅ Canary shadow comparisons passed');
}

main().catch((error) => {
  console.error('❌ Canary shadow script crashed', error);
  process.exit(1);
});
