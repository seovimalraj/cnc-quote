/**
 * @module audit/customer-journey-validate
 * @ownership platform-observability
 * @description Validates deterministic customer journey fixtures against the API trace audit to ensure regression coverage for critical quote flows.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

interface JourneyCallExpectation {
  order: number;
  route: string;
  file: string;
  method: string;
  url: string;
  expectedController?: string;
  expectations?: {
    status?: number[];
  };
}

interface JourneyFixture {
  journeyId: string;
  description?: string;
  calls: JourneyCallExpectation[];
}

interface ApiCallDescriptor {
  route: string;
  file: string;
  line: number;
  column: number;
  method: string;
  url: string;
  normalizedUrl: string;
  isDynamic: boolean;
  evidence: string;
  hasBody: boolean;
  clientExpectedStatuses: number[];
  traceHeaderStatus: 'present' | 'missing' | 'unknown';
  spanInstrumentationStatus: 'present' | 'missing';
  retryStatus: 'present' | 'missing';
}

interface ApiTraceIssue {
  issueType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  suggestion: string;
  controllerFile?: string;
  sharedContracts?: string[];
  runbookUrl?: string;
}

interface ApiTraceReportEntry {
  call: ApiCallDescriptor;
  matchedController?: {
    file: string;
    className: string;
    methodName: string;
    httpMethod: string;
    path: string;
    apiPath: string;
    statusCodes: number[];
    guarded: boolean;
    bodyTypes: string[];
    bodyDtoMatches: string[][];
    guardSources: string[];
    versions: string[];
    paramNames: string[];
    cacheMetadata?: {
      usesPricingCache: boolean;
      buildsHashPayload: boolean;
      decoratesCacheHeaders: boolean;
    };
  };
  issues: ApiTraceIssue[];
}

interface CustomerApiTraceReport {
  generatedAt: string;
  summary: {
    callCount: number;
  };
  calls: ApiTraceReportEntry[];
}

interface JourneyValidationIssue {
  journeyId: string;
  order: number;
  method: string;
  url: string;
  issueType: 'missing_call' | 'controller_mismatch' | 'status_mismatch' | 'observability_gap' | 'resilience_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  suggestion: string;
}

interface JourneyValidationResult {
  journeyId: string;
  description?: string;
  generatedAt: string;
  fixtures: number;
  matchedCalls: number;
  missingCalls: number;
  issues: JourneyValidationIssue[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const outputDir = path.join(__dirname, 'output');
const fixturesDir = path.join(__dirname, '../fixtures/customer');

async function loadFixtures(): Promise<JourneyFixture[]> {
  const fixtureFiles = await readFixtureFiles();
  const fixtures: JourneyFixture[] = [];

  for (const file of fixtureFiles) {
    const raw = await readFile(file, 'utf-8');
    try {
      const parsed = JSON.parse(raw) as JourneyFixture;
      fixtures.push(parsed);
    } catch (error) {
      throw new Error(`Failed to parse fixture ${file}: ${(error as Error).message}`);
    }
  }

  return fixtures;
}

async function readFixtureFiles(): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(fixturesDir, { withFileTypes: true });
  return files
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(fixturesDir, entry.name));
}

async function loadApiTraceReport(): Promise<CustomerApiTraceReport> {
  const reportPath = path.join(outputDir, 'customer-api-trace.json');
  const raw = await readFile(reportPath, 'utf-8');
  return JSON.parse(raw) as CustomerApiTraceReport;
}

function normalizeUrl(value: string): string {
  return value.replace(/https?:\/\/[^/]+/i, '');
}

function matchCall(expected: JourneyCallExpectation, entries: ApiTraceReportEntry[]): ApiTraceReportEntry | undefined {
  const normalized = normalizeUrl(expected.url);
  return entries.find((entry) => entry.call.method === expected.method && entry.call.normalizedUrl === normalized);
}

function buildIssue(journeyId: string, order: number, method: string, url: string, details: Partial<JourneyValidationIssue>): JourneyValidationIssue {
  return {
    journeyId,
    order,
    method,
    url,
    issueType: details.issueType ?? 'missing_call',
    severity: details.severity ?? 'high',
    evidence: details.evidence ?? 'Issue detected',
    suggestion: details.suggestion ?? 'Review journey fixture against API trace output.',
  };
}

async function validateFixtures(): Promise<JourneyValidationResult[]> {
  const fixtures = await loadFixtures();
  const apiReport = await loadApiTraceReport();
  const results: JourneyValidationResult[] = [];

  for (const fixture of fixtures) {
    const issues: JourneyValidationIssue[] = [];
    let matchedCalls = 0;

    for (const call of fixture.calls) {
      const entry = matchCall(call, apiReport.calls);
      if (!entry) {
        issues.push(
          buildIssue(fixture.journeyId, call.order, call.method, call.url, {
            issueType: 'missing_call',
            severity: 'critical',
            evidence: `Journey expected ${call.method} ${call.url} but no matching client call was traced.`,
            suggestion: 'Ensure the client flow still issues this request or update fixture to reflect new behavior.',
          }),
        );
        continue;
      }

      matchedCalls += 1;

      if (call.expectedController) {
        const matchedController = entry.matchedController
          ? `${entry.matchedController.className}.${entry.matchedController.methodName}`
          : undefined;
        if (!matchedController || matchedController !== call.expectedController) {
          issues.push(
            buildIssue(fixture.journeyId, call.order, call.method, call.url, {
              issueType: 'controller_mismatch',
              severity: 'high',
              evidence: `Expected controller ${call.expectedController} but resolved to ${matchedController ?? 'none'}.`,
              suggestion: 'Align route mapping or update fixture expectations.',
            }),
          );
        }
      }

      if (call.expectations?.status?.length) {
        const controllerStatuses = entry.matchedController?.statusCodes ?? [];
        const missingStatuses = call.expectations.status.filter((status) => !controllerStatuses.includes(status));
        if (missingStatuses.length) {
          issues.push(
            buildIssue(fixture.journeyId, call.order, call.method, call.url, {
              issueType: 'status_mismatch',
              severity: 'medium',
              evidence: `Expected statuses ${call.expectations.status.join(', ')} but controller advertises ${controllerStatuses.join(', ') || 'none'}.`,
              suggestion: 'Update controller @HttpCode/@ApiResponse annotations or adjust fixture expectations.',
            }),
          );
        }
      }

      const hasObservabilityGap = entry.issues.some((issue) => issue.issueType === 'observability_gap');
      if (hasObservabilityGap) {
        issues.push(
          buildIssue(fixture.journeyId, call.order, call.method, call.url, {
            issueType: 'observability_gap',
            severity: 'medium',
            evidence: `Audit reported observability gaps for ${call.method} ${call.url}.`,
            suggestion: 'Propagate trace headers and wrap transport in OpenTelemetry spans.',
          }),
        );
      }

      const hasResilienceGap = entry.issues.some((issue) => issue.issueType === 'resilience_gap');
      if (hasResilienceGap) {
        issues.push(
          buildIssue(fixture.journeyId, call.order, call.method, call.url, {
            issueType: 'resilience_gap',
            severity: 'low',
            evidence: `Audit reported missing retry/backoff for ${call.method} ${call.url}.`,
            suggestion: 'Wrap transport with withRetry or consistent backoff helper.',
          }),
        );
      }
    }

    const missingCalls = fixture.calls.length - matchedCalls;
    results.push({
      journeyId: fixture.journeyId,
      description: fixture.description,
      generatedAt: new Date().toISOString(),
      fixtures: fixture.calls.length,
      matchedCalls,
      missingCalls,
      issues,
    });
  }

  return results;
}

async function main(): Promise<void> {
  const results = await validateFixtures();
  const outputPath = path.join(outputDir, 'customer-journey-validation.json');
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, 'utf-8');

  let blockingIssueCount = 0;
  for (const result of results) {
    for (const issue of result.issues) {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        blockingIssueCount += 1;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Journey validation written to ${path.relative(repoRoot, outputPath).replace(/\\/g, '/')}`);
  if (blockingIssueCount > 0) {
    // eslint-disable-next-line no-console
    console.error(`Journey validation detected ${blockingIssueCount} blocking issues.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
