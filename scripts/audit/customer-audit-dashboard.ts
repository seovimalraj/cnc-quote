import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

interface RouteActionRef {
  name: string;
}

interface CustomerRouteEntry {
  route: string;
  file: string;
  fileType: 'page' | 'layout' | 'loading' | 'error' | 'template' | 'route';
  componentName?: string;
  exportedMetadata?: string[];
  params?: string[];
  isClientComponent: boolean;
  exportsServerActions: RouteActionRef[];
  importedHandlers: RouteActionRef[];
  importedUtilities: string[];
  hooksUsed: string[];
  httpHandlers?: string[];
}

interface CustomerSurfaceReport {
  generatedAt: string;
  customerRoutes: CustomerRouteEntry[];
  warnings?: string[];
}

interface FlowIssue {
  stage: string;
  route: string;
  file: string;
  issueType: 'missing_handler' | 'dead_link' | 'todo' | 'debug_statement';
  severity: Severity;
  evidence: string;
  suggestion: string;
  position?: { line: number; column: number };
}

interface StageReport {
  stage: string;
  label: string;
  files: string[];
  issues: FlowIssue[];
}

interface CustomerCriticalFlowReport {
  generatedAt: string;
  stages: StageReport[];
  warnings?: string[];
}

type Presence = 'present' | 'missing' | 'unknown';
type BinaryPresence = 'present' | 'missing';

type ApiIssueType =
  | 'missing_route'
  | 'verb_mismatch'
  | 'status_mismatch'
  | 'permission_gap'
  | 'dto_inconsistent'
  | 'method_body_mismatch'
  | 'observability_gap'
  | 'resilience_gap'
  | 'cache_gap'
  | 'contract_drift';

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
  traceHeaderStatus: Presence;
  spanInstrumentationStatus: BinaryPresence;
  retryStatus: BinaryPresence;
  sharedContracts: string[];
}

interface ApiTraceIssue {
  call: ApiCallDescriptor;
  issueType: ApiIssueType;
  severity: Severity;
  evidence: string;
  suggestion: string;
  controllerFile?: string;
  controllerMethod?: string;
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
      requestUsesHashPayload: boolean;
      controlConfiguresTtl: boolean;
      controlMarksHotPath: boolean;
      controlSupportsBust: boolean;
    };
    responseType?: string;
    responseDtoMatches?: string[];
  };
  issues: ApiTraceIssue[];
}

interface CustomerApiTraceReport {
  generatedAt: string;
  summary: {
    callCount: number;
    matchedControllers: number;
    unmatchedCalls: number;
    guardedControllers: number;
    unguardedControllers: number;
    issueCounts: Record<ApiIssueType, number>;
    severityCounts: Record<Severity, number>;
    callsWithObservabilityGaps: number;
    callsWithResilienceGaps: number;
    callsWithCacheGaps: number;
    callsWithContractDrift?: number;
    blockingIssueTypes?: ApiIssueType[];
    highestSeverity?: Severity;
  };
  calls: ApiTraceReportEntry[];
  ci?: {
    metrics: {
      schemaVersion: string;
      generatedAt: string;
      callCount: number;
      matchedControllers: number;
      unmatchedCalls: number;
      severityCounts: Record<Severity, number>;
      issueCounts: Record<ApiIssueType, number>;
      blockingIssueCounts: Record<ApiIssueType, number>;
      highestSeverity: Severity | null;
      hasBlockingFindings: boolean;
      blockingIssueTypes: ApiIssueType[];
      blockingIssueTotal: number;
      callsWithContractDrift: number;
    };
    slackPayload: {
      text: string;
      blocks: Array<Record<string, unknown>>;
    };
  };
}

type Severity = 'critical' | 'high' | 'medium' | 'low';
type DashboardSource = 'surface' | 'flow' | 'api';

interface DashboardFinding {
  id: string;
  source: DashboardSource;
  severity: Severity;
  type: string;
  summary: string;
  suggestion?: string;
  route?: string;
  file?: string;
  stage?: string;
  method?: string;
  url?: string;
  line?: number;
  column?: number;
  controller?: string;
  metadata?: Record<string, unknown>;
}

interface SeverityCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface SourceSummary {
  total: number;
  bySeverity: SeverityCount;
}

interface SurfaceRouteDetail {
  route: string;
  file: string;
  primaryComponent?: string;
  serverActions: string[];
}

interface CustomerAuditDashboard {
  generatedAt: string;
  missingArtifacts?: string[];
  summary: {
    totalFindings: number;
    findingsBySeverity: SeverityCount;
    findingsBySource: Record<DashboardSource, SourceSummary>;
    issueTypeCounts: Record<string, number>;
    hasCriticalFindings: boolean;
    hasHighFindings: boolean;
    ciRecommendation: 'fail' | 'warn' | 'pass';
    topFindings: DashboardFinding[];
  };
  artifacts: {
    surface?: {
      path: string;
      generatedAt: string;
      totalRoutes: number;
      clientComponents: number;
      serverActionCount: number;
      httpRouteHandlers: number;
      warnings?: string[];
      routes: SurfaceRouteDetail[];
    };
    flow?: {
      path: string;
      generatedAt: string;
      stageCount: number;
      filesInspected: number;
      issueCount: number;
      issueTypeCounts: Record<string, number>;
      warnings?: string[];
    };
    api?: {
      path: string;
      generatedAt: string;
      callCount: number;
      matchedControllers: number;
      unmatchedCalls: number;
      guardedControllers: number;
      unguardedControllers: number;
      issueCount: number;
      issueTypeCounts: Record<string, number>;
      severityCounts: SeverityCount;
      observabilityGapCalls: number;
      resilienceGapCalls: number;
      cacheGapCalls: number;
    };
    journey?: {
      path: string;
      generatedAt: string;
      journeyCount: number;
      missingCalls: number;
      blockingIssues: number;
    };
  };
  findings: DashboardFinding[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const outputDir = path.join(__dirname, 'output');

const SURFACE_REPORT = path.join(outputDir, 'customer-surface-map.json');
const FLOW_REPORT = path.join(outputDir, 'customer-critical-flow.json');
const API_REPORT = path.join(outputDir, 'customer-api-trace.json');
const DASHBOARD_REPORT = path.join(outputDir, 'customer-audit-dashboard.json');

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
const severityRank = new Map<Severity, number>(severityOrder.map((severity, index) => [severity, index]));

async function readJsonIfPresent<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function emptySeverityCount(): SeverityCount {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
}

function toRelative(pathname: string): string {
  return path.relative(repoRoot, pathname).replace(/\\/g, '/');
}

async function main(): Promise<void> {
  const [surfaceReport, flowReport, apiReport] = await Promise.all([
    readJsonIfPresent<CustomerSurfaceReport>(SURFACE_REPORT),
    readJsonIfPresent<CustomerCriticalFlowReport>(FLOW_REPORT),
    readJsonIfPresent<CustomerApiTraceReport>(API_REPORT),
  ]);
  const journeyReport = await readJsonIfPresent<any>(path.join(outputDir, 'customer-journey-validation.json'));

  const missingArtifacts: string[] = [];
  if (!surfaceReport) missingArtifacts.push(toRelative(SURFACE_REPORT));
  if (!flowReport) missingArtifacts.push(toRelative(FLOW_REPORT));
  if (!apiReport) missingArtifacts.push(toRelative(API_REPORT));
  if (!journeyReport) missingArtifacts.push(toRelative(path.join(outputDir, 'customer-journey-validation.json')));

  const findings: DashboardFinding[] = [];
  const issueTypeCounts: Record<string, number> = {};

  if (surfaceReport?.warnings?.length) {
    for (const warning of surfaceReport.warnings) {
      const id = `surface-warning:${warning}`;
      findings.push({
        id,
        source: 'surface',
        severity: 'medium',
        type: 'surface_warning',
        summary: warning,
      });
      issueTypeCounts.surface_warning = (issueTypeCounts.surface_warning ?? 0) + 1;
    }
  }

  let surfaceArtifact: CustomerAuditDashboard['artifacts']['surface'];
  if (surfaceReport) {
    const clientComponents = surfaceReport.customerRoutes.filter((route) => route.isClientComponent).length;
    const serverActionCount = surfaceReport.customerRoutes.reduce(
      (total, route) => total + route.exportsServerActions.length,
      0,
    );
    const httpRouteHandlers = surfaceReport.customerRoutes.reduce((total, route) => total + (route.httpHandlers?.length ?? 0), 0);
    const surfaceRoutes: SurfaceRouteDetail[] = surfaceReport.customerRoutes.map((route) => ({
      route: route.route,
      file: route.file,
      primaryComponent: route.componentName,
      serverActions: route.exportsServerActions.map((action) => action.name),
    }));
    surfaceArtifact = {
      path: toRelative(SURFACE_REPORT),
      generatedAt: surfaceReport.generatedAt,
      totalRoutes: surfaceReport.customerRoutes.length,
      clientComponents,
      serverActionCount,
      httpRouteHandlers,
      warnings: surfaceReport.warnings,
      routes: surfaceRoutes,
    };
  }

  const flowIssueTypeCounts: Record<string, number> = {};
  let flowArtifact: CustomerAuditDashboard['artifacts']['flow'];
  if (flowReport) {
    const filesInspected = new Set<string>();
    for (const stage of flowReport.stages) {
      stage.files.forEach((file) => filesInspected.add(file));
      for (const issue of stage.issues) {
        const id = `flow:${stage.stage}:${issue.file}:${issue.issueType}:${issue.position?.line ?? 0}:${issue.position?.column ?? 0}`;
        findings.push({
          id,
          source: 'flow',
          severity: issue.severity,
          type: issue.issueType,
          summary: issue.evidence,
          suggestion: issue.suggestion,
          route: issue.route,
          file: issue.file,
          stage: stage.label,
          line: issue.position?.line,
          column: issue.position?.column,
        });
        flowIssueTypeCounts[issue.issueType] = (flowIssueTypeCounts[issue.issueType] ?? 0) + 1;
        issueTypeCounts[issue.issueType] = (issueTypeCounts[issue.issueType] ?? 0) + 1;
      }
    }
    if (flowReport.warnings?.length) {
      for (const warning of flowReport.warnings) {
        const id = `flow-warning:${warning}`;
        findings.push({
          id,
          source: 'flow',
          severity: 'medium',
          type: 'flow_warning',
          summary: warning,
        });
        flowIssueTypeCounts.flow_warning = (flowIssueTypeCounts.flow_warning ?? 0) + 1;
        issueTypeCounts.flow_warning = (issueTypeCounts.flow_warning ?? 0) + 1;
      }
    }
    flowArtifact = {
      path: toRelative(FLOW_REPORT),
      generatedAt: flowReport.generatedAt,
      stageCount: flowReport.stages.length,
      filesInspected: filesInspected.size,
      issueCount: Object.values(flowIssueTypeCounts).reduce((total, count) => total + count, 0),
      issueTypeCounts: flowIssueTypeCounts,
      warnings: flowReport.warnings,
    };
  }

  const apiIssueTypeCounts: Record<string, number> = {};
  let apiArtifact: CustomerAuditDashboard['artifacts']['api'];
  if (apiReport) {
    const matchedControllers = new Set<string>();
    const guardedControllers = new Set<string>();
    const unguardedControllers = new Set<string>();
    let unmatchedCalls = 0;
    const apiSeverityCounts = emptySeverityCount();
    const observabilityGapCalls = new Set<string>();
    const resilienceGapCalls = new Set<string>();
  const cacheGapCalls = new Set<string>();

    for (const entry of apiReport.calls) {
      const controllerKey = entry.matchedController
        ? `${entry.matchedController.file}#${entry.matchedController.className}.${entry.matchedController.methodName}`
        : undefined;
      if (entry.matchedController) {
        matchedControllers.add(controllerKey!);
        if (entry.matchedController.guarded) {
          guardedControllers.add(controllerKey!);
          unguardedControllers.delete(controllerKey!);
        } else if (!guardedControllers.has(controllerKey!)) {
          unguardedControllers.add(controllerKey!);
        }
      } else {
        unmatchedCalls += 1;
      }
      const callKey = `${entry.call.file}:${entry.call.line}:${entry.call.method}:${entry.call.normalizedUrl}`;
      for (const issue of entry.issues) {
        const id = `api:${entry.call.file}:${entry.call.line}:${issue.issueType}`;
        findings.push({
          id,
          source: 'api',
          severity: issue.severity,
          type: issue.issueType,
          summary: issue.evidence,
          suggestion: issue.suggestion,
          route: entry.call.route,
          file: entry.call.file,
          method: entry.call.method,
          url: entry.call.normalizedUrl,
          line: entry.call.line,
          column: entry.call.column,
          controller:
            issue.controllerMethod ??
            (entry.matchedController ? `${entry.matchedController.className}.${entry.matchedController.methodName}` : undefined),
          metadata: {
            hasBody: entry.call.hasBody,
            clientExpectedStatuses: entry.call.clientExpectedStatuses,
            traceHeaderStatus: entry.call.traceHeaderStatus,
            spanInstrumentationStatus: entry.call.spanInstrumentationStatus,
            retryStatus: entry.call.retryStatus,
            controllerFile: issue.controllerFile ?? entry.matchedController?.file,
            controllerMethod:
              issue.controllerMethod ??
              (entry.matchedController
                ? `${entry.matchedController.className}.${entry.matchedController.methodName}`
                : undefined),
            controllerGuarded: entry.matchedController?.guarded ?? null,
          },
        });
        apiIssueTypeCounts[issue.issueType] = (apiIssueTypeCounts[issue.issueType] ?? 0) + 1;
        issueTypeCounts[issue.issueType] = (issueTypeCounts[issue.issueType] ?? 0) + 1;
        apiSeverityCounts[issue.severity] += 1;
        if (issue.issueType === 'observability_gap') {
          observabilityGapCalls.add(callKey);
        }
        if (issue.issueType === 'resilience_gap') {
          resilienceGapCalls.add(callKey);
        }
        if (issue.issueType === 'cache_gap') {
          cacheGapCalls.add(callKey);
        }
      }
    }

    const apiSummary = apiReport.summary;
    const totalIssues = Object.values(apiIssueTypeCounts).reduce((total, count) => total + count, 0);
    const summaryIssueTotal = apiSummary
      ? Object.values(apiSummary.issueCounts).reduce((total, count) => total + count, 0)
      : undefined;
    const severityCountsFromSummary: SeverityCount | null = apiSummary
      ? {
          critical: apiSummary.severityCounts.critical ?? 0,
          high: apiSummary.severityCounts.high ?? 0,
          medium: apiSummary.severityCounts.medium ?? 0,
          low: apiSummary.severityCounts.low ?? 0,
        }
      : null;

    apiArtifact = {
      path: toRelative(API_REPORT),
      generatedAt: apiReport.generatedAt,
      callCount: apiSummary?.callCount ?? apiReport.calls.length,
      matchedControllers: apiSummary?.matchedControllers ?? matchedControllers.size,
      unmatchedCalls: apiSummary?.unmatchedCalls ?? unmatchedCalls,
      guardedControllers: apiSummary?.guardedControllers ?? guardedControllers.size,
      unguardedControllers: apiSummary?.unguardedControllers ?? unguardedControllers.size,
      issueCount: summaryIssueTotal ?? totalIssues,
      issueTypeCounts: apiSummary?.issueCounts ?? apiIssueTypeCounts,
      severityCounts: severityCountsFromSummary ?? apiSeverityCounts,
      observabilityGapCalls: apiSummary?.callsWithObservabilityGaps ?? observabilityGapCalls.size,
      resilienceGapCalls: apiSummary?.callsWithResilienceGaps ?? resilienceGapCalls.size,
      cacheGapCalls: apiSummary?.callsWithCacheGaps ?? cacheGapCalls.size,
    };
  }

  let journeyArtifact: CustomerAuditDashboard['artifacts']['journey'];
  if (journeyReport) {
    const journeyResults = Array.isArray(journeyReport) ? journeyReport : [];
    let missingCalls = 0;
    let blockingIssues = 0;
    for (const result of journeyResults) {
      missingCalls += result.missingCalls ?? 0;
      const issues = Array.isArray(result.issues) ? result.issues : [];
      for (const issue of issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          blockingIssues += 1;
        }
        const id = `journey:${result.journeyId}:${issue.order}:${issue.issueType}`;
        findings.push({
          id,
          source: 'api',
          severity: issue.severity ?? 'medium',
          type: `journey_${issue.issueType}`,
          summary: issue.evidence ?? 'Journey validation issue',
          suggestion: issue.suggestion,
          route: undefined,
          file: undefined,
          method: issue.method,
          url: issue.url,
          metadata: {
            journeyId: result.journeyId,
            order: issue.order,
          },
        });
        issueTypeCounts[`journey_${issue.issueType}`] = (issueTypeCounts[`journey_${issue.issueType}`] ?? 0) + 1;
      }
    }
    journeyArtifact = {
      path: toRelative(path.join(outputDir, 'customer-journey-validation.json')),
      generatedAt: journeyResults[0]?.generatedAt ?? new Date().toISOString(),
      journeyCount: journeyResults.length,
      missingCalls,
      blockingIssues,
    };
  }

  const findingsBySeverity: SeverityCount = emptySeverityCount();
  const findingsBySource: Record<DashboardSource, SourceSummary> = {
    surface: { total: 0, bySeverity: emptySeverityCount() },
    flow: { total: 0, bySeverity: emptySeverityCount() },
    api: { total: 0, bySeverity: emptySeverityCount() },
  };

  for (const finding of findings) {
    findingsBySeverity[finding.severity] += 1;
    const sourceSummary = findingsBySource[finding.source];
    sourceSummary.total += 1;
    sourceSummary.bySeverity[finding.severity] += 1;
  }

  findings.sort((left, right) => {
    const leftRank = severityRank.get(left.severity) ?? severityOrder.length;
    const rightRank = severityRank.get(right.severity) ?? severityOrder.length;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    if (left.source !== right.source) {
      return left.source.localeCompare(right.source);
    }
    return left.summary.localeCompare(right.summary);
  });

  const hasCriticalFindings = findingsBySeverity.critical > 0;
  const hasHighFindings = findingsBySeverity.high > 0;
  const ciRecommendation: 'fail' | 'warn' | 'pass' = hasCriticalFindings || hasHighFindings
    ? 'fail'
    : findings.length > 0
    ? 'warn'
    : 'pass';

  const dashboard: CustomerAuditDashboard = {
    generatedAt: new Date().toISOString(),
    missingArtifacts: missingArtifacts.length ? missingArtifacts : undefined,
    summary: {
      totalFindings: findings.length,
      findingsBySeverity,
      findingsBySource,
      issueTypeCounts,
      hasCriticalFindings,
      hasHighFindings,
      ciRecommendation,
      topFindings: findings.slice(0, 10),
    },
    artifacts: {
      surface: surfaceArtifact,
      flow: flowArtifact,
      api: apiArtifact,
      journey: journeyArtifact,
    },
    findings,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(DASHBOARD_REPORT, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Customer audit dashboard written to ${toRelative(DASHBOARD_REPORT)}`);

  const missingCount = dashboard.missingArtifacts?.length ?? 0;
  if (missingCount > 0) {
    // eslint-disable-next-line no-console
    console.warn(`Customer audit dashboard missing ${missingCount} artifacts: ${dashboard.missingArtifacts?.join(', ')}`);
  }

  const { ciRecommendation, hasCriticalFindings, hasHighFindings } = dashboard.summary;
  const hasBlockingFindings = ciRecommendation === 'fail' || hasCriticalFindings || hasHighFindings;

  if (hasBlockingFindings || missingCount > 0) {
    const reasonParts = [];
    if (hasBlockingFindings) {
      reasonParts.push(`CI recommendation = ${ciRecommendation}`);
    }
    if (missingCount > 0) {
      reasonParts.push('missing upstream artifacts');
    }
    // eslint-disable-next-line no-console
    console.error(`Customer audit dashboard gating failure: ${reasonParts.join(' ; ')}`);
    process.exitCode = 1;
  } else if (ciRecommendation === 'warn') {
    // eslint-disable-next-line no-console
    console.warn('Customer audit dashboard reports warnings; review findings before deploy.');
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
