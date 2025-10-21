/**
 * @module audit/customer-api-trace
 * @ownership platform-observability
 * @description Maps customer-facing web calls to NestJS routes to expose gaps in guards, DTOs, and method parity before quote flows ship to production.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import globby from 'globby';
import {
  ArrowFunction,
  CallExpression,
  ClassDeclaration,
  Decorator,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  MethodDeclaration,
  Node,
  Project,
  PropertyAccessExpression,
  SourceFile,
  SyntaxKind,
  Type,
} from 'ts-morph';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
type BinaryPresence = 'present' | 'missing';
type Presence = BinaryPresence | 'unknown';
type TargetService = 'api' | 'cad-service';
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
  | 'contract_drift'
  | 'rbac_matrix_gap'
  | 'cad_endpoint_gap'
  | 'cad_contract_mismatch';

interface IssueMetadata {
  schemas?: string[];
  tags?: string[];
}

interface IssuePatchPlan {
  files: string[];
  tests: string[];
  runbookUpdates: string[];
}

interface SchemaAuditIssue {
  issueType: ApiIssueType;
  severity: SeverityLevel;
  evidence: string;
  suggestion: string;
  call: {
    file: string;
    line: number;
    column: number;
    method: string;
    normalizedUrl: string;
    route: string;
    targetService: TargetService;
  };
  controller?: {
    file: string;
    method?: string;
    httpMethod?: string;
    apiPath?: string;
    responseModel?: string;
  };
  runbookUrl?: string;
  patchPlan: IssuePatchPlan;
}

interface SchemaAuditReportPayload {
  schema: string;
  generatedAt: string;
  totalIssues: number;
  blockingIssues: number;
  issues: SchemaAuditIssue[];
}

interface SchemaArtifactSummaryEntry {
  schema: string;
  issueCount: number;
  blockingIssueCount: number;
  reportPath: string;
}

interface SchemaAuditArtifactBundle {
  summaries: SchemaArtifactSummaryEntry[];
  summaryRelativePath: string;
  summaryAbsolutePath: string;
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
  traceHeaderStatus: Presence;
  spanInstrumentationStatus: BinaryPresence;
  retryStatus: BinaryPresence;
  sharedContracts: string[];
  targetService: TargetService;
}

interface ApiTraceIssue {
  call: ApiCallDescriptor;
  issueType: ApiIssueType;
  severity: SeverityLevel;
  evidence: string;
  suggestion: string;
  controllerFile?: string;
  controllerMethod?: string;
  runbookUrl?: string;
  metadata?: IssueMetadata;
}

interface CacheMetadata {
  usesPricingCache: boolean;
  buildsHashPayload: boolean;
  requestUsesHashPayload: boolean;
  controlConfiguresTtl: boolean;
  controlMarksHotPath: boolean;
  controlSupportsBust: boolean;
  decoratesCacheHeaders: boolean;
}

interface PolicyRequirementDescriptor {
  action: string | null;
  resource: string | null;
  source: string;
  decorator: string;
  resolved: boolean;
  line?: number;
}

interface ResolvedPathValue {
  text: string;
  isDynamic: boolean;
}
interface ApiRbacDriftRecord {
  action: string;
  resource: string;
  controllers: string[];
  reasons: string[];
  suggestion?: string;
}

interface WebRbacAbilityRecord {
  ability: string;
  action: string;
  resource: string;
  roles: string[];
}

interface WebRbacDriftRecord {
  action: string;
  resource: string;
  roles: string[];
  reasons: string[];
  suggestion?: string;
}

interface RbacMatrixSummary {
  sharedActions: string[];
  sharedResources: string[];
  sharedAbilities: string[];
  apiAbilities: ApiRbacAbilityRecord[];
  apiDrift: ApiRbacDriftRecord[];
  webAbilities: WebRbacAbilityRecord[];
  webDrift: WebRbacDriftRecord[];
  matrixWithoutCoverage: string[];
}

interface SharedRbacMatrix {
  actions: Set<string>;
  resources: Set<string>;
  abilities: Set<string>;
  roleAbilityMap: Map<string, Set<string>>;
}

interface WebRolePermissionInventory {
  abilityRoles: Map<string, Set<string>>;
  abilities: Set<string>;
  drift: WebRbacDriftRecord[];
  abilityRecords: WebRbacAbilityRecord[];
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
    guardIdentifiers: string[];
    bodyTypes: string[];
    bodyDtoMatches: string[][];
    guardSources: string[];
    versions: string[];
    paramNames: string[];
    cacheMetadata: CacheMetadata;
    responseType?: string;
    responseDtoMatches: string[];
    policyRequirements: PolicyRequirementDescriptor[];
  };
  issues: ApiTraceIssue[];
  callContracts?: string[];
  controllerContracts?: string[];
}

interface ControllerRoute {
  file: string;
  className: string;
  methodName: string;
  httpMethod: string;
  path: string;
  apiPath: string;
  isDynamic: boolean;
  statusCodes: number[];
  guarded: boolean;
  guardIdentifiers: string[];
  bodyTypes: string[];
  bodyDtoMatches: string[][];
  guardSources: string[];
  versions: string[];
  paramNames: string[];
  cacheMetadata: CacheMetadata;
  responseType?: string;
  responseDtoMatches: string[];
  policies: PolicyRequirementDescriptor[];
}

interface CadServiceRoute {
  file: string;
  functionName: string;
  method: string;
  path: string;
  prefix: string;
  responseModel?: string;
}

interface PythonPydanticModel {
  file: string;
  fields: Set<string>;
}

interface CadContractMismatchDetail {
  sharedSchema: string;
  pythonModel?: string;
  missingFields: string[];
  extraFields: string[];
}

interface CadServiceCallSummaryEntry {
  method: string;
  path: string;
  callSites: Set<string>;
  callCount: number;
  matchedRoute?: CadServiceRoute;
  contractMismatch?: CadContractMismatchDetail;
  issues: Set<'missing_endpoint' | 'contract_mismatch'>;
}

interface CadContractExpectation {
  consumerPathPattern: RegExp;
  method: string;
  sharedSchema: string;
}

interface CadTouchpointSummary {
  callsAnalyzed: number;
  uniquePaths: Array<{ method: string; path: string; callCount: number }>;
  missingEndpoints: Array<{ method: string; path: string; callSites: string[] }>;
  contractMismatches: Array<{
    method: string;
    path: string;
    callSites: string[];
    detail: CadContractMismatchDetail;
    routeFile?: string;
    routeFunction?: string;
    responseModel?: string;
  }>;
  routesDiscovered: Array<{
    method: string;
    path: string;
    responseModel?: string;
    file: string;
    functionName: string;
  }>;
}

interface CiMetrics {
  schemaVersion: string;
  generatedAt: string;
  callCount: number;
  matchedControllers: number;
  unmatchedCalls: number;
  severityCounts: Record<SeverityLevel, number>;
  issueCounts: Record<ApiIssueType, number>;
  blockingIssueCounts: Record<ApiIssueType, number>;
  highestSeverity: SeverityLevel | null;
  hasBlockingFindings: boolean;
  blockingIssueTypes: ApiIssueType[];
  blockingIssueTotal: number;
  callsWithContractDrift: number;
  callsWithRbacMatrixGaps: number;
}

interface SlackPayload {
  text: string;
  blocks: Array<Record<string, unknown>>;
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
    severityCounts: Record<SeverityLevel, number>;
    callsWithObservabilityGaps: number;
    callsWithResilienceGaps: number;
    callsWithCacheGaps: number;
    callsWithContractDrift: number;
    callsWithRbacMatrixGaps: number;
    blockingIssueTypes: ApiIssueType[];
    highestSeverity: SeverityLevel | null;
  };
  calls: ApiTraceReportEntry[];
  ci: {
    metrics: CiMetrics;
    slackPayload: SlackPayload;
  };
  rbac?: RbacMatrixSummary;
  cad?: CadTouchpointSummary;
  schemaAudit: {
    summaryRelativePath: string;
    entries: SchemaArtifactSummaryEntry[];
  };
}

function collectCustomerApiCalls(): ApiCallDescriptor[] {
  const results: ApiCallDescriptor[] = [];
  const files = globby.sync(CUSTOMER_FILE_PATTERNS, { cwd: repoRoot });

  for (const file of files) {
    const sourceFile = project.getSourceFile(toPosix(path.join(repoRoot, file)));
    if (!sourceFile) {
      continue;
    }
    const route = normalizeRoute(file);
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    const sharedContracts = Array.from(extractSharedContractNames(sourceFile)).filter(
      (name) => sharedDtoNames.has(name) && SHARED_CONTRACT_NAME_PATTERN.test(name),
    );

    for (const call of callExpressions) {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression) && FETCH_ALIASES.has(expression.getText())) {
        const descriptor = buildCallDescriptorFromFetch(call, expression, route, file, sharedContracts);
        if (descriptor) {
          results.push(descriptor);
        }
      } else if (Node.isPropertyAccessExpression(expression)) {
        const expressionName = expression.getName();
        const expressionExpr = expression.getExpression();
        if (Node.isIdentifier(expressionExpr) && AXIOS_ALIASES.has(expressionExpr.getText())) {
          const descriptor = buildCallDescriptorFromAxios(call, expression, route, file, sharedContracts);
          if (descriptor) {
            results.push(descriptor);
          }
        } else if (Node.isIdentifier(expressionExpr) && expressionName === 'open' && isXmlHttpRequestIdentifier(expressionExpr)) {
          const descriptor = buildCallDescriptorFromXmlHttpRequest(call, expressionExpr, route, file, sharedContracts);
          if (descriptor) {
            results.push(descriptor);
          }
        }
      }
    }
  }

  return results;
}

function buildCallDescriptorFromFetch(
  call: CallExpression,
  expression: Identifier,
  route: string,
  file: string,
  sharedContracts: string[],
): ApiCallDescriptor | null {
  const args = call.getArguments();
  if (!args.length) {
    return null;
  }
  const urlNode = args[0];
  const resolvedUrl = resolveUrlFromNode(urlNode);
  if (!resolvedUrl) {
    return null;
  }
  const cadTarget = determineCadTargetService(urlNode, resolvedUrl);
  const normalizedInfo = cadTarget ? normalizeCadServicePath(resolvedUrl) : normalizeApiCallPath(resolvedUrl);
  if (!normalizedInfo) {
    return null;
  }
  const normalizedUrl = cadTarget ? normalizedInfo.normalizedUrl : applyRouteAlias(normalizedInfo.normalizedUrl);
  const isDynamic = normalizedInfo.isDynamic || isPathDynamic(normalizedUrl);
  const { method, hasBody } = inferMethodFromInit(call);
  const finalMethod = method ?? 'GET';
  const { line, column } = call.getSourceFile().getLineAndColumnAtPos(call.getStart());
  const clientExpectedStatuses = collectClientStatusExpectations(call);
  const traceHeaderStatus = determineTraceHeaderStatusForFetch(call);
  const spanInstrumentationStatus = determineSpanStatus(call);
  const retryStatus = determineRetryStatus(call);

  return {
    route,
    file,
    line,
    column,
    method: finalMethod,
    url: resolvedUrl.text,
    normalizedUrl,
    isDynamic,
    evidence: `${expression.getText()}(${resolvedUrl.text})`,
    hasBody,
    clientExpectedStatuses,
    traceHeaderStatus,
    spanInstrumentationStatus,
    retryStatus,
    sharedContracts: sharedContracts.slice(),
    targetService: cadTarget ? 'cad-service' : 'api',
  };
}

function buildCallDescriptorFromAxios(
  call: CallExpression,
  property: PropertyAccessExpression,
  route: string,
  file: string,
  sharedContracts: string[],
): ApiCallDescriptor | null {
  const args = call.getArguments();
  if (!args.length) {
    return null;
  }

  const urlNode = args[0];
  const resolvedUrl = resolveUrlFromNode(urlNode);
  if (!resolvedUrl) {
    return null;
  }

  const cadTarget = determineCadTargetService(urlNode, resolvedUrl);
  const normalizedInfo = cadTarget ? normalizeCadServicePath(resolvedUrl) : normalizeApiCallPath(resolvedUrl);
  if (!normalizedInfo) {
    return null;
  }

  const normalizedUrl = cadTarget ? normalizedInfo.normalizedUrl : applyRouteAlias(normalizedInfo.normalizedUrl);
  const isDynamic = normalizedInfo.isDynamic || isPathDynamic(normalizedUrl);
  const method = inferAxiosMethod(call, property);
  const hasBody = args.length > 1;
  const { line, column } = call.getSourceFile().getLineAndColumnAtPos(call.getStart());
  const clientExpectedStatuses = collectClientStatusExpectations(call);
  const traceHeaderStatus = determineTraceHeaderStatusForAxios(call, method);
  const spanInstrumentationStatus = determineSpanStatus(call);
  const retryStatus = determineRetryStatus(call);
  const expressionExpr = property.getExpression();
  const expressionName = property.getName();

  return {
    route,
    file,
    line,
    column,
    method,
    url: resolvedUrl.text,
    normalizedUrl,
    isDynamic,
    evidence: `${expressionExpr.getText()}.${expressionName}(${resolvedUrl.text})`,
    hasBody,
    clientExpectedStatuses,
    traceHeaderStatus,
    spanInstrumentationStatus,
    retryStatus,
    sharedContracts: sharedContracts.slice(),
    targetService: cadTarget ? 'cad-service' : 'api',
  };
}

function buildCallDescriptorFromXmlHttpRequest(
  call: CallExpression,
  requestIdentifier: Identifier,
  route: string,
  file: string,
  sharedContracts: string[],
): ApiCallDescriptor | null {
  const args = call.getArguments();
  if (args.length < 2) {
    return null;
  }
  const methodLiteral = extractLiteralText(args[0]);
  const resolvedUrl = resolveUrlFromNode(args[1]);
  if (!resolvedUrl) {
    return null;
  }
  const cadTarget = determineCadTargetService(args[1], resolvedUrl);
  const normalizedInfo = cadTarget ? normalizeCadServicePath(resolvedUrl) : normalizeApiCallPath(resolvedUrl);
  if (!normalizedInfo) {
    return null;
  }
  const normalizedUrl = cadTarget ? normalizedInfo.normalizedUrl : applyRouteAlias(normalizedInfo.normalizedUrl);
  const isDynamic = normalizedInfo.isDynamic || isPathDynamic(normalizedUrl);
  const method = (methodLiteral ?? 'GET').toUpperCase();
  const hasBody = hasXmlHttpRequestBody(requestIdentifier, call);
  const { line, column } = call.getSourceFile().getLineAndColumnAtPos(call.getStart());
  const spanInstrumentationStatus = determineSpanStatus(call);
  const retryStatus = determineRetryStatus(call);

  return {
    route,
    file,
    line,
    column,
    method,
    url: resolvedUrl.text,
    normalizedUrl,
    isDynamic,
    evidence: `${requestIdentifier.getText()}.open(${resolvedUrl.text})`,
    hasBody,
    clientExpectedStatuses: [],
    traceHeaderStatus: 'missing',
    spanInstrumentationStatus,
    retryStatus,
    sharedContracts: sharedContracts.slice(),
    targetService: cadTarget ? 'cad-service' : 'api',
  };
}

function resolveUrlFromNode(node: Node): ResolvedPathValue | undefined {
  const resolved = resolveExpressionToPath(node);
  if (resolved) {
    return resolved;
  }
  const literal = extractLiteralText(node);
  return literal ? { text: literal, isDynamic: false } : undefined;
}

function determineCadTargetService(node: Node, resolved: ResolvedPathValue): boolean {
  if (expressionTargetsCadService(node)) {
    return true;
  }
  return /cad-service/i.test(resolved.text);
}
interface ResolutionContext {
  depth: number;
  paramMap: Map<string, ResolvedPathValue>;
  visitedNodes: Set<Node>;
  visitedDeclarations: Set<string>;
}

type FunctionLike = ArrowFunction | FunctionDeclaration | MethodDeclaration | FunctionExpression;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const outputDir = path.join(__dirname, 'output');

const project = new Project({
  tsConfigFilePath: path.join(repoRoot, 'tsconfig.json'),
  skipFileDependencyResolution: true,
  addFilesFromTsConfig: false,
});

const toPosix = (candidate: string): string => candidate.replace(/\\/g, '/');

project.addSourceFilesAtPaths([
  `${toPosix(repoRoot)}/apps/web/app/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/web/src/components/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/web/components/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/web/lib/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/packages/shared/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/api/src/generated/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/worker/src/**/*.{ts,tsx}`,
]);

const sharedDtoNames = collectSharedDtoNames();
const sharedRbacMatrix = collectSharedRbacMatrix();
const webRoleInventory = collectWebRolePermissions();

const CUSTOMER_FILE_PATTERNS = [
  'apps/web/app/get-quote/**/*.{ts,tsx}',
  'apps/web/app/instant-quote/**/*.{ts,tsx}',
  'apps/web/app/dfm-analysis/**/*.{ts,tsx}',
  'apps/web/app/quotes/**/*.{ts,tsx}',
  'apps/web/app/secure-checkout/**/*.{ts,tsx}',
  'apps/web/app/checkout/**/*.{ts,tsx}',
  'apps/web/app/portal/quotes/**/*.{ts,tsx}',
  'apps/web/src/components/**/*.{ts,tsx}',
  'apps/web/lib/**/customer/**/*.{ts,tsx}',
  'apps/web/components/**/customer/**/*.{ts,tsx}',
];

const FETCH_ALIASES = new Set(['fetch']);
const AXIOS_ALIASES = new Set(['axios', 'apiClient', 'customerClient']);
const BLOCKING_SEVERITIES: SeverityLevel[] = ['critical', 'high'];
const SEVERITY_RANK: Record<SeverityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};
const RUNBOOK_RELATIVE_LINK = '../../../docs/runbooks/customer-api-trace-remediation.md';
const RUNBOOK_REPO_PATH = 'docs/runbooks/customer-api-trace-remediation.md';
const RUNBOOK_ANCHORS: Record<ApiIssueType, string> = {
  missing_route: '#missing-route',
  verb_mismatch: '#verb-mismatch',
  status_mismatch: '#status-mismatch',
  permission_gap: '#permission-gap',
  dto_inconsistent: '#dto-inconsistent',
  method_body_mismatch: '#method-body-mismatch',
  observability_gap: '#observability-gap',
  resilience_gap: '#resilience-gap',
  cache_gap: '#cache-gap',
  contract_drift: '#contract-drift',
  rbac_matrix_gap: '#rbac-matrix-gap',
  cad_endpoint_gap: '#cad-endpoint-gap',
  cad_contract_mismatch: '#cad-contract-mismatch',
};

const CAD_ENDPOINT_EXPECTATIONS: CadContractExpectation[] = [
  {
    consumerPathPattern: /^\/api\/cad\/analyze/i,
    method: 'POST',
    sharedSchema: 'CadAnalysisVNextSchema',
  },
  {
    consumerPathPattern: /^\/api\/cad\/analyze(?:\/|$)/i,
    method: 'GET',
    sharedSchema: 'CadAnalysisVNextSchema',
  },
];
const METRICS_SCHEMA_VERSION = '1.0.0';
const API_RESPONSE_DECORATOR_STATUS: Record<string, number> = {
  ApiOkResponse: 200,
  ApiCreatedResponse: 201,
  ApiAcceptedResponse: 202,
  ApiNoContentResponse: 204,
  ApiMovedPermanentlyResponse: 301,
  ApiFoundResponse: 302,
  ApiSeeOtherResponse: 303,
  ApiNotModifiedResponse: 304,
  ApiTemporaryRedirectResponse: 307,
  ApiPermanentRedirectResponse: 308,
  ApiBadRequestResponse: 400,
  ApiUnauthorizedResponse: 401,
  ApiPaymentRequiredResponse: 402,
  ApiForbiddenResponse: 403,
  ApiNotFoundResponse: 404,
  ApiMethodNotAllowedResponse: 405,
  ApiNotAcceptableResponse: 406,
  ApiProxyAuthenticationRequiredResponse: 407,
  ApiRequestTimeoutResponse: 408,
  ApiConflictResponse: 409,
  ApiGoneResponse: 410,
  ApiLengthRequiredResponse: 411,
  ApiPreconditionFailedResponse: 412,
  ApiPayloadTooLargeResponse: 413,
  ApiUriTooLongResponse: 414,
  ApiUnsupportedMediaTypeResponse: 415,
  ApiRangeNotSatisfiableResponse: 416,
  ApiExpectationFailedResponse: 417,
  ApiImATeapotResponse: 418,
  ApiUnprocessableEntityResponse: 422,
  ApiTooManyRequestsResponse: 429,
  ApiInternalServerErrorResponse: 500,
  ApiNotImplementedResponse: 501,
  ApiBadGatewayResponse: 502,
  ApiServiceUnavailableResponse: 503,
  ApiGatewayTimeoutResponse: 504,
};

const HTTP_STATUS_NAME_MAP: Record<string, number> = {
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  MULTI_STATUS: 207,
  ALREADY_REPORTED: 208,
  IM_USED: 226,
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  IM_A_TEAPOT: 418,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

const ISSUE_TYPES: ApiIssueType[] = [
  'missing_route',
  'verb_mismatch',
  'status_mismatch',
  'permission_gap',
  'dto_inconsistent',
  'method_body_mismatch',
  'observability_gap',
  'resilience_gap',
  'cache_gap',
  'contract_drift',
  'rbac_matrix_gap',
  'cad_endpoint_gap',
  'cad_contract_mismatch',
];

const SEVERITY_LEVELS: SeverityLevel[] = ['critical', 'high', 'medium', 'low'];

function normalizeRoute(relativeFile: string): string {
  if (!relativeFile.startsWith('apps/web/app/')) {
    return 'shared-component';
  }
  const withoutPrefix = relativeFile.replace(/^apps\/web\/app\//, '');
  const parts = withoutPrefix.split('/');
  parts.pop();
  const segments: string[] = [];
  for (const part of parts) {
    if (part.startsWith('(') && part.endsWith(')')) {
      continue;
    }
    if (part.startsWith('@')) {
      continue;
    }
    segments.push(part);
  }
  const route = `/${segments.join('/')}`.replace(/\/+/g, '/');
  return route === '' ? '/' : route;
}

function ensureLeadingSlash(value: string): string {
  if (!value.startsWith('/')) {
    return `/${value}`;
  }
  return value;
}

function extractLiteralText(node: Node | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }
  if (Node.isTemplateExpression(node) && node.getTemplateSpans().length === 0) {
    return node.getHead().getLiteralText();
  }
  return undefined;
}

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const withoutHost = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutHost.split(/[?#]/)[0];
  const normalized = ensureLeadingSlash(withoutQuery).replace(/\\/g, '/');
  const collapsed = normalized.replace(/\/{2,}/g, '/');
  const trimmedTrailing = collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
  return trimmedTrailing || '/';
}

function normalizeApiCallPath(resolved: ResolvedPathValue): { normalizedUrl: string; isDynamic: boolean } | undefined {
  const normalized = normalizePath(resolved.text);
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('/api')) {
    return { normalizedUrl: normalized, isDynamic: resolved.isDynamic };
  }

  const apiIndex = normalized.indexOf('/api');
  if (apiIndex > 0) {
    const trimmed = normalized.slice(apiIndex);
    const ensured = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return { normalizedUrl: ensured, isDynamic: true };
  }

  return undefined;
}

function normalizeCadServicePath(resolved: ResolvedPathValue): { normalizedUrl: string; isDynamic: boolean } | undefined {
  let candidate = resolved.text.trim();
  if (!candidate) {
    return undefined;
  }

  if (/^https?:\/\//i.test(candidate)) {
    candidate = candidate.replace(/^https?:\/\/[^/]+/i, '');
  }

  if (candidate.startsWith(':param')) {
    const slashIndex = candidate.indexOf('/');
    candidate = slashIndex >= 0 ? candidate.slice(slashIndex) : '/';
  }

  if (!candidate.startsWith('/')) {
    const slashIndex = candidate.indexOf('/');
    if (slashIndex >= 0) {
      candidate = candidate.slice(slashIndex);
    } else {
      candidate = `/${candidate.replace(/^:+/, '')}`;
    }
  }

  candidate = candidate.split(/[?#]/)[0];
  candidate = candidate.replace(/\\/g, '/');
  candidate = candidate.replace(/\/{2,}/g, '/');

  const normalized = candidate.length > 1 && candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
  return { normalizedUrl: normalized || '/', isDynamic: resolved.isDynamic };
}

function expressionTargetsCadService(node: Node): boolean {
  const rawText = node.getText();
  if (/cadServiceUrl|cad_service_url|CAD_SERVICE_URL|cad-service/i.test(rawText)) {
    return true;
  }

  if (Node.isTemplateExpression(node)) {
    if (/cad-service/i.test(node.getHead().getLiteralText())) {
      return true;
    }
    return node.getTemplateSpans().some((span) => expressionTargetsCadService(span.getExpression()));
  }

  if (Node.isBinaryExpression(node) && node.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
    return expressionTargetsCadService(node.getLeft()) || expressionTargetsCadService(node.getRight());
  }

  if (Node.isPropertyAccessExpression(node)) {
    if (/cadServiceUrl|cad_service_url/i.test(node.getName())) {
      return true;
    }
    return expressionTargetsCadService(node.getExpression());
  }

  if (Node.isCallExpression(node)) {
    return expressionTargetsCadService(node.getExpression());
  }

  if (Node.isIdentifier(node)) {
    return /cadServiceUrl|cad_service_url/i.test(node.getText());
  }

  return false;
}

function applyRouteAlias(path: string): string {
  const alias = CLIENT_ROUTE_ALIASES[path];
  if (!alias) {
    return path;
  }
  return normalizePath(alias);
}

function resolveRunbookUrl(issueType: ApiIssueType, format: 'relative' | 'repo' = 'relative'): string {
  const anchor = RUNBOOK_ANCHORS[issueType] ?? '';
  if (format === 'repo') {
    return `${RUNBOOK_REPO_PATH}${anchor}`;
  }
  return `${RUNBOOK_RELATIVE_LINK}${anchor}`;
}

interface SharedContractUsage {
  web: Set<string>;
  api: Set<string>;
  worker: Set<string>;
}

function ensureSharedContractUsageEntry(map: Map<string, SharedContractUsage>, contract: string): SharedContractUsage {
  let entry = map.get(contract);
  if (!entry) {
    entry = {
      web: new Set<string>(),
      api: new Set<string>(),
      worker: new Set<string>(),
    };
    map.set(contract, entry);
  }
  return entry;
}

function extractSharedContractNames(sourceFile: SourceFile): Set<string> {
  const names = new Set<string>();
  const namespaceAliases = new Set<string>();

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith('@cnc-quote/shared')) {
      continue;
    }

    for (const namedImport of importDecl.getNamedImports()) {
      names.add(namedImport.getName());
    }

    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      namespaceAliases.add(namespaceImport.getText());
    }
  }

  if (!namespaceAliases.size) {
    return names;
  }

  const propertyAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
  for (const propertyAccess of propertyAccesses) {
    const propertyChain: string[] = [];
    let current: Expression | undefined = propertyAccess;
    while (Node.isPropertyAccessExpression(current)) {
      propertyChain.unshift(current.getName());
      current = current.getExpression();
    }
    if (Node.isIdentifier(current) && namespaceAliases.has(current.getText()) && propertyChain.length > 0) {
      names.add(propertyChain[0]);
    }
  }

  return names;
}

function collectWorkerContractUsage(): Map<string, Set<string>> {
  const usage = new Map<string, Set<string>>();
  const workerFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/worker/src/**/*.{ts,tsx}`);

  for (const sourceFile of workerFiles) {
    const names = extractSharedContractNames(sourceFile);
    if (!names.size) {
      continue;
    }
    const relativePath = sourceFile.getFilePath().replace(`${toPosix(repoRoot)}/`, '');
    for (const name of names) {
      if (!sharedDtoNames.has(name) || !SHARED_CONTRACT_NAME_PATTERN.test(name)) {
        continue;
      }
      let entry = usage.get(name);
      if (!entry) {
        entry = new Set<string>();
        usage.set(name, entry);
      }
      entry.add(relativePath);
    }
  }

  return usage;
}

function joinPaths(basePath: string, suffixPath: string): string {
  const base = basePath.trim();
  const suffix = suffixPath.trim();
  if (!base && !suffix) {
    return '/';
  }
  if (!base) {
    return suffix || '/';
  }
  if (!suffix) {
    return base;
  }
  const cleanedBase = base.replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanedSuffix = suffix.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${cleanedBase}/${cleanedSuffix}`;
}

function isPathDynamic(path: string): boolean {
  return path
    .split('/')
    .filter((segment) => segment.length > 0)
    .some((segment) => segment.startsWith(':') || segment === '*' || segment.includes(DYNAMIC_SEGMENT_PLACEHOLDER) || /\{.*\}/.test(segment));
}

function toPatternSegments(path: string): string[] {
  const normalized = normalizePath(path);
  if (normalized === '/' || normalized === '') {
    return ['/'];
  }
  return normalized
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (
        segment === DYNAMIC_SEGMENT_PLACEHOLDER ||
        segment.includes(DYNAMIC_SEGMENT_PLACEHOLDER) ||
        segment.startsWith(':') ||
        segment.startsWith('{') ||
        segment === '*' ||
        /\{.*\}/.test(segment)
      ) {
        return DYNAMIC_SEGMENT_PLACEHOLDER;
      }
      return segment;
    });
}

function segmentsMatch(callSegment: string, routeSegment: string): boolean {
  if (callSegment === routeSegment) {
    return true;
  }
  if (callSegment === DYNAMIC_SEGMENT_PLACEHOLDER || routeSegment === DYNAMIC_SEGMENT_PLACEHOLDER) {
    return true;
  }
  return false;
}

function pathsMatch(callPath: string, routePath: string): boolean {
  const callSegments = toPatternSegments(callPath);
  const routeSegments = toPatternSegments(routePath);
  if (callSegments.length !== routeSegments.length) {
    return false;
  }
  for (let index = 0; index < callSegments.length; index += 1) {
    if (!segmentsMatch(callSegments[index], routeSegments[index])) {
      return false;
    }
  }
  return true;
}

function combineResolvedParts(parts: (ResolvedPathValue | undefined)[]): ResolvedPathValue | undefined {
  const filtered = parts.filter((part): part is ResolvedPathValue => Boolean(part));
  if (!filtered.length) {
    return undefined;
  }
  const combinedText = filtered.map((part) => part.text).join('');
  if (!combinedText) {
    return undefined;
  }
  const isDynamic = filtered.some((part) => part.isDynamic);
  return { text: combinedText, isDynamic };
}

function getDecoratorName(decorator: Decorator): string {
  const expression = decorator.getExpression();
  if (Node.isIdentifier(expression)) {
    return expression.getText();
  }
  if (Node.isCallExpression(expression)) {
    const inner = expression.getExpression();
    return inner.getText();
  }
  return decorator.getName();
}

function isGuardDecorator(decorator: Decorator): boolean {
  const name = getDecoratorName(decorator);
  return GUARD_DECORATORS.has(name) || GUARD_NAME_PATTERN.test(name);
}

function extractIdentifierFromExpression(expression: Expression | undefined): string | undefined {
  if (!expression) {
    return undefined;
  }
  if (Node.isIdentifier(expression)) {
    return expression.getText();
  }
  if (Node.isPropertyAccessExpression(expression)) {
    return expression.getName();
  }
  if (Node.isCallExpression(expression)) {
    return extractIdentifierFromExpression(expression.getExpression());
  }
  if (Node.isArrowFunction(expression) || Node.isFunctionExpression(expression)) {
    const body = expression.getBody();
    if (Node.isIdentifier(body)) {
      return body.getText();
    }
    if (Node.isPropertyAccessExpression(body)) {
      return body.getName();
    }
  }
  return undefined;
}

function extractGuardIdentifiersFromDecorator(decorator: Decorator, accumulator: Set<string>): void {
  if (!isGuardDecorator(decorator)) {
    return;
  }
  const decoratorName = getDecoratorName(decorator);
  const expression = decorator.getExpression();
  if (Node.isCallExpression(expression) && decoratorName === 'UseGuards') {
    for (const arg of expression.getArguments()) {
      const identifier = extractIdentifierFromExpression(arg as Expression);
      if (identifier) {
        accumulator.add(identifier);
      }
    }
    return;
  }
  accumulator.add(decoratorName);
}

function collectVersionValues(decorators: Decorator[]): string[] {
  const values: string[] = [];
  for (const decorator of decorators) {
    const name = getDecoratorName(decorator);
    if (name !== 'Version') {
      continue;
    }
    const args = decorator.getArguments();
    for (const arg of args) {
      if (Node.isArrayLiteralExpression(arg)) {
        for (const element of arg.getElements()) {
          const resolvedElement = resolveExpressionToPath(element, undefined);
          if (resolvedElement?.text) {
            values.push(resolvedElement.text);
          } else {
            const literal = extractLiteralText(element);
            if (literal) {
              values.push(literal);
            }
          }
        }
        continue;
      }
      const resolved = resolveExpressionToPath(arg, undefined);
      if (resolved?.text) {
        values.push(resolved.text);
      } else if (Node.isStringLiteral(arg) || Node.isNoSubstitutionTemplateLiteral(arg)) {
        values.push(arg.getLiteralText());
      }
    }
  }
  return values;
}

function extractControllerBasePath(decorator: Decorator): string {
  const args = decorator.getArguments();
  if (!args.length) {
    return '';
  }
  const firstArg = args[0];
  if (Node.isObjectLiteralExpression(firstArg)) {
    const pathProp = firstArg.getProperty('path');
    if (Node.isPropertyAssignment(pathProp)) {
      const initializer = pathProp.getInitializer();
      const resolved = resolveExpressionToPath(initializer ?? undefined);
      if (resolved?.text) {
        return resolved.text;
      }
      const literal = extractLiteralText(initializer);
      if (literal) {
        return literal;
      }
    }
    return '';
  }
  const resolved = resolveExpressionToPath(firstArg);
  if (resolved?.text) {
    return resolved.text;
  }
  const literal = extractLiteralText(firstArg);
  return literal ?? '';
}

function collectParamNames(method: MethodDeclaration): string[] {
  const names = new Set<string>();
  for (const param of method.getParameters()) {
    const fallbackName = param.getName();
    for (const decorator of param.getDecorators()) {
      const decoratorName = getDecoratorName(decorator);
      if (decoratorName !== 'Param' && !decoratorName.endsWith('Param')) {
        continue;
      }
      const args = decorator.getArguments();
      if (args.length > 0) {
        const resolved = resolveExpressionToPath(args[0]);
        if (resolved?.text) {
          names.add(resolved.text);
          continue;
        }
        const literal = extractLiteralText(args[0]);
        if (literal) {
          names.add(literal);
          continue;
        }
      }
      if (fallbackName) {
        names.add(fallbackName);
      }
    }
  }
  return [...names].sort();
}

function collectGuardMetadata(cls: ClassDeclaration, method: MethodDeclaration): {
  guarded: boolean;
  guardSources: string[];
  guardIdentifiers: string[];
} {
  const guardSources = new Set<string>();
  const guardIdentifiers = new Set<string>();
  const visited = new Set<string>();
  const methodName = method.getName();
  let current: ClassDeclaration | undefined = cls;

  while (current) {
    const classKey = getDeclarationKey(current);
    if (visited.has(classKey)) {
      break;
    }
    visited.add(classKey);
    const className = current.getName() ?? 'AnonymousController';
    for (const decorator of current.getDecorators()) {
      if (!isGuardDecorator(decorator)) {
        continue;
      }
      const guardName = getDecoratorName(decorator);
      guardSources.add(`class ${className}: ${guardName}`);
      extractGuardIdentifiersFromDecorator(decorator, guardIdentifiers);
    }

  const targetMethod = current === cls ? method : methodName ? current.getMethod(methodName) : undefined;
    if (targetMethod) {
      const targetMethodName = targetMethod.getName() ?? methodName ?? 'anonymous';
      for (const decorator of targetMethod.getDecorators()) {
        if (!isGuardDecorator(decorator)) {
          continue;
        }
        const guardName = getDecoratorName(decorator);
        guardSources.add(`method ${className}.${targetMethodName}: ${guardName}`);
        extractGuardIdentifiersFromDecorator(decorator, guardIdentifiers);
      }
    }

    current = current.getBaseClass();
  }

  return {
    guarded: guardSources.size > 0,
    guardSources: [...guardSources].sort(),
    guardIdentifiers: [...guardIdentifiers].sort(),
  };
}

function collectPolicyMetadata(cls: ClassDeclaration, method: MethodDeclaration): PolicyRequirementDescriptor[] {
  const results: PolicyRequirementDescriptor[] = [];
  const visited = new Set<string>();
  const methodName = method.getName();
  let current: ClassDeclaration | undefined = cls;

  while (current) {
    const classKey = getDeclarationKey(current);
    if (visited.has(classKey)) {
      break;
    }
    visited.add(classKey);

    const className = current.getName() ?? 'AnonymousController';
    for (const decorator of current.getDecorators()) {
      results.push(
        ...extractPolicyRequirementsFromDecorator(decorator, `class ${className}`),
      );
    }

    const targetMethod = current === cls ? method : methodName ? current.getMethod(methodName) : undefined;
    if (targetMethod) {
      const methodLabel = `${className}.${targetMethod.getName() ?? methodName ?? 'anonymous'}`;
      for (const decorator of targetMethod.getDecorators()) {
        results.push(
          ...extractPolicyRequirementsFromDecorator(decorator, `method ${methodLabel}`),
        );
      }
    }

    current = current.getBaseClass();
  }

  const deduped = new Map<string, PolicyRequirementDescriptor>();
  for (const descriptor of results) {
    const actionKey = descriptor.action ?? '__missing_action__';
    const resourceKey = descriptor.resource ?? '__missing_resource__';
    const key = `${descriptor.decorator}|${descriptor.source}|${actionKey}|${resourceKey}|${descriptor.line ?? 0}`;
    if (!deduped.has(key)) {
      deduped.set(key, descriptor);
    }
  }

  return [...deduped.values()];
}

function extractPolicyRequirementsFromDecorator(
  decorator: Decorator,
  scope: string,
): PolicyRequirementDescriptor[] {
  const decoratorName = getDecoratorName(decorator);
  if (decoratorName !== 'Policies' && decoratorName !== 'RequirePermissions') {
    return [];
  }

  const line = decorator.getStartLineNumber?.() ?? undefined;
  const descriptors: PolicyRequirementDescriptor[] = [];

  if (decoratorName === 'Policies') {
    for (const arg of decorator.getArguments()) {
      for (const entry of extractPolicyEntriesFromPoliciesArgument(arg as Expression)) {
        descriptors.push({
          action: entry.action ?? null,
          resource: entry.resource ?? null,
          source: `${scope}: @Policies`,
          decorator: '@Policies',
          resolved: Boolean(entry.action && entry.resource),
          line,
        });
      }
    }
  } else if (decoratorName === 'RequirePermissions') {
    for (const arg of decorator.getArguments()) {
      const literal = resolveStringValue(arg as Expression);
      if (!literal) {
        descriptors.push({
          action: null,
          resource: null,
          source: `${scope}: @RequirePermissions`,
          decorator: '@RequirePermissions',
          resolved: false,
          line,
        });
        continue;
      }
      const parsed = parseAbilityString(literal);
      descriptors.push({
        action: parsed.action,
        resource: parsed.resource,
        source: `${scope}: @RequirePermissions`,
        decorator: '@RequirePermissions',
        resolved: Boolean(parsed.action && parsed.resource),
        line,
      });
    }
  }

  return descriptors;
}

function extractPolicyEntriesFromPoliciesArgument(expression: Expression): Array<{ action?: string; resource?: string }> {
  if (Node.isArrayLiteralExpression(expression)) {
    const entries: Array<{ action?: string; resource?: string }> = [];
    for (const element of expression.getElements()) {
      if (Node.isObjectLiteralExpression(element) || Node.isArrayLiteralExpression(element)) {
        entries.push(...extractPolicyEntriesFromPoliciesArgument(element as Expression));
      }
    }
    return entries;
  }

  if (Node.isObjectLiteralExpression(expression)) {
    const actionProp = expression.getProperty('action');
    const resourceProp = expression.getProperty('resource');
    const actionValue = Node.isPropertyAssignment(actionProp)
      ? resolveStringValue(actionProp.getInitializer() as Expression | undefined)
      : undefined;
    const resourceValue = Node.isPropertyAssignment(resourceProp)
      ? resolveStringValue(resourceProp.getInitializer() as Expression | undefined)
      : undefined;
    return [
      {
        action: actionValue ?? undefined,
        resource: resourceValue ?? undefined,
      },
    ];
  }

  const literal = resolveStringValue(expression);
  if (literal) {
    const parsed = parseAbilityString(literal);
    return [
      {
        action: parsed.action ?? undefined,
        resource: parsed.resource ?? undefined,
      },
    ];
  }

  return [];
}

function resolveStringValue(node: Expression | undefined): string | undefined {
  const resolved = resolveExpressionToPath(node);
  if (resolved?.text) {
    return resolved.text;
  }
  return extractLiteralText(node);
}

function parseAbilityString(raw: string): { action: string | null; resource: string | null } {
  const token = raw.trim();
  if (!token) {
    return { action: null, resource: null };
  }
  const parts = token.split(':').map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  if (parts.length === 0) {
    return { action: null, resource: null };
  }
  if (parts.length === 1) {
    return { action: null, resource: parts[0] };
  }
  const action = parts.pop() ?? null;
  const resource = parts.length > 0 ? parts.join(':') : null;
  return {
    action: action ?? null,
    resource,
  };
}

function collectVersionMetadata(cls: ClassDeclaration, method: MethodDeclaration): string[] {
  const versions = new Set<string>();
  const visited = new Set<string>();
  const methodName = method.getName();
  let current: ClassDeclaration | undefined = cls;

  while (current) {
    const classKey = getDeclarationKey(current);
    if (visited.has(classKey)) {
      break;
    }
    visited.add(classKey);

    collectVersionValues(current.getDecorators()).forEach((version) => {
      versions.add(version);
    });

    const targetMethod = current === cls ? method : methodName ? current.getMethod(methodName) : undefined;
    if (targetMethod) {
      collectVersionValues(targetMethod.getDecorators()).forEach((version) => {
        versions.add(version);
      });
    }

    current = current.getBaseClass();
  }

  return [...versions].sort();
}

function collectSharedDtoNames(): Set<string> {
  const dtoNames = new Set<string>();
  const sharedFiles = project.getSourceFiles([
    `${toPosix(repoRoot)}/packages/shared/**/*.{ts,tsx}`,
    `${toPosix(repoRoot)}/apps/api/src/generated/**/*.{ts,tsx}`,
  ]);

  for (const file of sharedFiles) {
    for (const symbol of file.getExportSymbols()) {
      const name = symbol.getName();
      if (name && name !== 'default') {
        dtoNames.add(name);
      }
    }
  }

  return dtoNames;
}

function ensureSet<K>(map: Map<K, Set<string>>, key: K): Set<string> {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const created = new Set<string>();
  map.set(key, created);
  return created;
}

function canonicalizeAction(action: string): string {
  return action.trim().toLowerCase();
}

function canonicalizeResourceName(resource: string): string {
  return resource
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '_');
}

function buildAbilityKey(action: string, resource: string): string {
  return `${action}:${resource}`;
}

function singularizeSegment(segment: string): string[] {
  const variants = new Set<string>();
  variants.add(segment);
  if (segment.endsWith('ies')) {
    variants.add(`${segment.slice(0, -3)}y`);
  }
  if (segment.endsWith('ses')) {
    variants.add(segment.slice(0, -2));
  }
  if (segment.endsWith('es')) {
    variants.add(segment.slice(0, -2));
  }
  if (segment.endsWith('s')) {
    variants.add(segment.slice(0, -1));
  }
  return [...variants];
}

function generateResourceVariants(resource: string): string[] {
  const variants = new Set<string>();
  variants.add(resource);

  const segments = resource.split(':');
  if (segments.length === 0) {
    return [...variants];
  }
  const last = segments.pop() as string;
  const prefix = segments.length ? `${segments.join(':')}:` : '';
  for (const candidate of singularizeSegment(last)) {
    variants.add(`${prefix}${candidate}`);
  }
  return [...variants];
}

function collectSharedRbacMatrix(): SharedRbacMatrix {
  const actions = new Set<string>();
  const resources = new Set<string>();
  const abilities = new Set<string>();
  const roleAbilityMap = new Map<string, Set<string>>();

  const source = project.getSourceFile(`${toPosix(repoRoot)}/packages/shared/src/rbac.types.ts`);
  if (!source) {
    return { actions, resources, abilities, roleAbilityMap };
  }

  const matrixDecl = source.getVariableDeclaration('PERMISSION_MATRIX');
  const initializer = matrixDecl?.getInitializer();
  if (!initializer || !Node.isArrayLiteralExpression(initializer)) {
    return { actions, resources, abilities, roleAbilityMap };
  }

  for (const element of initializer.getElements()) {
    if (!Node.isObjectLiteralExpression(element)) {
      continue;
    }
    const resourceProp = element.getProperty('resource');
    const resourceValue = Node.isPropertyAssignment(resourceProp)
      ? resolveStringValue(resourceProp.getInitializer() as Expression | undefined)
      : undefined;
    if (!resourceValue) {
      continue;
    }
    const canonicalResource = canonicalizeResourceName(resourceValue);
    resources.add(canonicalResource);

    for (const property of element.getProperties()) {
      if (!Node.isPropertyAssignment(property)) {
        continue;
      }
      const propName = property.getNameNode();
      if (!propName) {
        continue;
      }
      const roleName = propName.getText().replace(/['"]/g, '');
      if (roleName === 'resource') {
        continue;
      }
      const initializerNode = property.getInitializer();
      if (!initializerNode || !Node.isArrayLiteralExpression(initializerNode)) {
        continue;
      }
      const abilitySet = ensureSet(roleAbilityMap, roleName);
      for (const actionNode of initializerNode.getElements()) {
        const actionValue = resolveStringValue(actionNode as Expression | undefined);
        if (!actionValue) {
          continue;
        }
        const canonicalAction = canonicalizeAction(actionValue);
        actions.add(canonicalAction);
        const abilityKey = buildAbilityKey(canonicalAction, canonicalResource);
        abilities.add(abilityKey);
        abilitySet.add(abilityKey);
      }
    }
  }

  return { actions, resources, abilities, roleAbilityMap };
}

function collectWebRolePermissions(): WebRolePermissionInventory {
  const abilityRoles = new Map<string, Set<string>>();
  const abilityRecords = new Map<string, { action: string; resource: string }>();
  const driftMap = new Map<string, WebRbacDriftRecord>();

  const source = project.getSourceFile(`${toPosix(repoRoot)}/apps/web/lib/rbac.ts`);
  if (!source) {
    return { abilityRoles, abilities: new Set<string>(), drift, abilityRecords: [] };
  }

  const rolePermissionsDecl = source.getVariableDeclaration('ROLE_PERMISSIONS');
  const initializer = rolePermissionsDecl?.getInitializer();
  if (!initializer || !Node.isObjectLiteralExpression(initializer)) {
    return { abilityRoles, abilities: new Set<string>(), drift, abilityRecords: [] };
  }

  for (const property of initializer.getProperties()) {
    if (!Node.isPropertyAssignment(property)) {
      continue;
    }
    const roleName = property.getNameNode()?.getText().replace(/['"]/g, '');
    if (!roleName) {
      continue;
    }
    const value = property.getInitializer();
    if (!value || !Node.isArrayLiteralExpression(value)) {
      continue;
    }
    for (const element of value.getElements()) {
      if (!Node.isObjectLiteralExpression(element)) {
        continue;
      }
      const actionNode = element.getProperty('action');
      const resourceNode = element.getProperty('resource');
      const actionValue = Node.isPropertyAssignment(actionNode)
        ? resolveStringValue(actionNode.getInitializer() as Expression | undefined)
        : undefined;
      const resourceValue = Node.isPropertyAssignment(resourceNode)
        ? resolveStringValue(resourceNode.getInitializer() as Expression | undefined)
        : undefined;
      if (!actionValue || !resourceValue) {
        continue;
      }
      const canonicalAction = canonicalizeAction(actionValue);
      const canonicalResource = canonicalizeResourceName(resourceValue);
      const abilityKey = buildAbilityKey(canonicalAction, canonicalResource);

      abilityRecords.set(abilityKey, {
        action: canonicalAction,
        resource: canonicalResource,
      });

      ensureSet(abilityRoles, abilityKey).add(roleName);

      const coverage = isAbilityCoveredByMatrix(canonicalAction, canonicalResource);
      if (!coverage.match && !isWildcardAbility(canonicalAction, canonicalResource)) {
        const existing = driftMap.get(abilityKey);
        if (existing) {
          existing.roles.push(roleName);
        } else {
          driftMap.set(abilityKey, {
            action: canonicalAction,
            resource: canonicalResource,
            roles: [roleName],
            reasons: [`Ability ${abilityKey} not present in shared PERMISSION_MATRIX`],
          });
        }
      }
    }
  }

  const abilitiesSet = new Set<string>(abilityRecords.keys());
  const abilityRecordList: WebRbacAbilityRecord[] = [];
  for (const [abilityKey, meta] of abilityRecords.entries()) {
    const roles = [...(abilityRoles.get(abilityKey) ?? new Set<string>())].sort();
    abilityRecordList.push({
      ability: abilityKey,
      action: meta.action,
      resource: meta.resource,
      roles,
    });
  }

  const drift: WebRbacDriftRecord[] = [];
  for (const record of driftMap.values()) {
    const uniqueRoles = [...new Set(record.roles)].sort();
    drift.push({
      action: record.action,
      resource: record.resource,
      roles: uniqueRoles,
      reasons: record.reasons,
      suggestion: record.suggestion,
    });
  }

  return {
    abilityRoles,
    abilities: abilitiesSet,
    drift,
    abilityRecords: abilityRecordList,
  };
}

function isWildcardAbility(action: string | null, resource: string | null): boolean {
  return action === '*' || resource === '*' || action === null || resource === null;
}

function isAbilityCoveredByMatrix(action: string, resource: string): { match: boolean; matchedAbility?: string } {
  if (isWildcardAbility(action, resource)) {
    return { match: true, matchedAbility: undefined };
  }
  const resourceVariants = generateResourceVariants(resource);
  for (const variant of resourceVariants) {
    const abilityKey = buildAbilityKey(action, variant);
    if (sharedRbacMatrix.abilities.has(abilityKey)) {
      return { match: true, matchedAbility: abilityKey };
    }
  }
  return { match: false };
}

function extractDtoMatchesFromType(type: Type, typeText: string): string[] {
  const names = new Set<string>();
  const visited = new Set<number>();

  function visit(current: Type): void {
    const id = current.getId();
    if (visited.has(id)) {
      return;
    }
    visited.add(id);

    const aliasSymbol = current.getAliasSymbol();
    if (aliasSymbol) {
      const aliasName = aliasSymbol.getName();
      if (sharedDtoNames.has(aliasName)) {
        names.add(aliasName);
      }
    }

    const symbol = current.getSymbol();
    if (symbol) {
      const symbolName = symbol.getName();
      if (sharedDtoNames.has(symbolName)) {
        names.add(symbolName);
      }
    }

    current.getUnionTypes().forEach(visit);
    current.getIntersectionTypes().forEach(visit);
    current.getTypeArguments().forEach(visit);
    const arrayElement = current.getArrayElementType();
    if (arrayElement) {
      visit(arrayElement);
    }
    const promiseType = current.getApparentType();
    if (promiseType && promiseType !== current) {
      visit(promiseType);
    }
  }

  visit(type);

  if (!names.size) {
    const tokens = typeText.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
    for (const token of tokens) {
      if (sharedDtoNames.has(token)) {
        names.add(token);
      }
    }
  }

  return [...names].sort();
}

const DTO_VALIDATION_IGNORE_PATTERNS = [
  /^Record<.*>$/,
  /^Partial<.*>$/,
  /^Pick<.*>$/,
  /^Omit<.*>$/,
  /Prisma\./,
  /Express\./,
  /ReadableStream/i,
  /Buffer/,
  /FormData/,
  /File/,
  /Blob/,
  /Request/,
  /Response/,
];

function shouldSkipDtoValidation(typeText: string): boolean {
  const normalized = typeText.replace(/\s+/g, '');
  if (!normalized || normalized === '{}' || normalized === 'void' || normalized === 'unknown') {
    return true;
  }
  return DTO_VALIDATION_IGNORE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function resolveStatusCode(expression: Expression | undefined): number | undefined {
  if (!expression) {
    return undefined;
  }

  if (Node.isNumericLiteral(expression)) {
    const value = Number(expression.getLiteralText());
    return Number.isNaN(value) ? undefined : value;
  }

  if (Node.isPrefixUnaryExpression(expression) && expression.getOperatorToken() === SyntaxKind.MinusToken) {
    const operand = expression.getOperand();
    if (Node.isNumericLiteral(operand)) {
      const value = Number(operand.getLiteralText()) * -1;
      return Number.isNaN(value) ? undefined : value;
    }
  }

  if (Node.isStringLiteral(expression) || Node.isNoSubstitutionTemplateLiteral(expression)) {
    const value = Number(expression.getLiteralText());
    return Number.isNaN(value) ? undefined : value;
  }

  if (Node.isPropertyAccessExpression(expression)) {
    const container = expression.getExpression().getText();
    const name = expression.getName();
    if ((/httpstatus/i.test(container) || /statuscodes/i.test(container)) && HTTP_STATUS_NAME_MAP[name]) {
      return HTTP_STATUS_NAME_MAP[name];
    }
  }

  return undefined;
}

function collectStatusesFromPropertyAccess(propertyAccess: PropertyAccessExpression): number[] {
  const statuses = new Set<number>();
  let currentParent: Node | undefined = propertyAccess.getParent();

  while (Node.isParenthesizedExpression(currentParent)) {
    currentParent = currentParent.getParent();
  }

  if (Node.isBinaryExpression(currentParent)) {
    const right = currentParent.getRight();
    const status = resolveStatusCode(right as Expression);
    if (typeof status === 'number') {
      statuses.add(status);
    }
  } else if (Node.isConditionalExpression(currentParent)) {
    const status = resolveStatusCode(currentParent.getWhenTrue() as Expression);
    if (typeof status === 'number') {
      statuses.add(status);
    }
    const alternateStatus = resolveStatusCode(currentParent.getWhenFalse() as Expression);
    if (typeof alternateStatus === 'number') {
      statuses.add(alternateStatus);
    }
  } else if (Node.isSwitchStatement(currentParent) && currentParent.getExpression() === propertyAccess) {
    const clauses = currentParent.getCaseBlock().getClauses();
    for (const clause of clauses) {
      if (Node.isCaseClause(clause)) {
        const status = resolveStatusCode(clause.getExpression());
        if (typeof status === 'number') {
          statuses.add(status);
        }
      }
    }
  }

  return [...statuses].sort((a, b) => a - b);
}

function resolveResponseBindings(call: CallExpression): Identifier[] {
  const bindings: Identifier[] = [];
  const seen = new Set<string>();

  const addBinding = (identifier: Identifier | undefined): void => {
    if (!identifier) {
      return;
    }
    const name = identifier.getText();
    if (!seen.has(name)) {
      bindings.push(identifier);
      seen.add(name);
    }
  };

  let current: Node = call;
  let parent: Node | undefined = current.getParent();

  while (parent && (Node.isAwaitExpression(parent) || Node.isParenthesizedExpression(parent))) {
    current = parent;
    parent = current.getParent();
  }

  if (parent && Node.isVariableDeclaration(parent)) {
    const nameNode = parent.getNameNode();
    if (Node.isIdentifier(nameNode)) {
      addBinding(nameNode);
    }
  } else if (parent && Node.isBinaryExpression(parent) && parent.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
    const left = parent.getLeft();
    if (Node.isIdentifier(left)) {
      addBinding(left);
    }
  }

  const propertyParent = call.getParent();
  if (propertyParent && Node.isPropertyAccessExpression(propertyParent) && propertyParent.getName() === 'then') {
    const thenCall = propertyParent.getParent();
    if (thenCall && Node.isCallExpression(thenCall)) {
      const firstArg = thenCall.getArguments()[0];
      if (Node.isArrowFunction(firstArg) || Node.isFunctionExpression(firstArg)) {
        const params = firstArg.getParameters();
        if (params.length > 0) {
          const paramName = params[0].getNameNode();
          if (Node.isIdentifier(paramName)) {
            addBinding(paramName);
          }
        }
      }
    }
  }

  return bindings;
}

function collectStatusesForIdentifier(identifier: Identifier, minPosition: number): number[] {
  const statuses = new Set<number>();
  const references = identifier.findReferences();

  for (const reference of references) {
    for (const refNode of reference.getReferences()) {
      const node = refNode.getNode();
      if (node.getSourceFile() !== identifier.getSourceFile()) {
        continue;
      }
      if (node.getStart() < minPosition) {
        continue;
      }
      const propertyAccess = node.getParentIfKind(SyntaxKind.PropertyAccessExpression);
      if (!propertyAccess || propertyAccess.getExpression() !== node) {
        continue;
      }
      if (propertyAccess.getName() !== 'status') {
        continue;
      }
      collectStatusesFromPropertyAccess(propertyAccess).forEach((status) => statuses.add(status));
    }
  }

  return [...statuses].sort((a, b) => a - b);
}

function collectClientStatusExpectations(call: CallExpression): number[] {
  const statuses = new Set<number>();
  const bindings = resolveResponseBindings(call);
  for (const binding of bindings) {
    collectStatusesForIdentifier(binding, call.getStart()).forEach((status) => statuses.add(status));
  }
  return [...statuses].sort((a, b) => a - b);
}

function determineTraceHeaderStatusFromObject(object: ObjectLiteralExpression): Presence {
  const headersProp = object.getProperty('headers');
  if (!headersProp) {
    return 'missing';
  }

  if (Node.isPropertyAssignment(headersProp)) {
    const initializer = headersProp.getInitializer();
    if (!initializer) {
      return 'missing';
    }
    if (Node.isObjectLiteralExpression(initializer)) {
      for (const property of initializer.getProperties()) {
        if (Node.isPropertyAssignment(property)) {
          const nameNode = property.getNameNode();
          const rawName = nameNode?.getText().replace(/['"`]/g, '').toLowerCase();
          if (rawName && TRACE_HEADER_KEYS.has(rawName)) {
            return 'present';
          }
        }
      }
      return 'missing';
    }
    return 'unknown';
  }

  return 'unknown';
}

function determineTraceHeaderStatusFromNode(node: Node | undefined): Presence {
  if (!node) {
    return 'missing';
  }
  if (Node.isObjectLiteralExpression(node)) {
    return determineTraceHeaderStatusFromObject(node);
  }
  return 'unknown';
}

function determineTraceHeaderStatusForFetch(call: CallExpression): Presence {
  const args = call.getArguments();
  if (args.length < 2) {
    return 'missing';
  }
  return determineTraceHeaderStatusFromNode(args[1]);
}

function determineTraceHeaderStatusForAxios(call: CallExpression, methodName: string): Presence {
  const args = call.getArguments();
  if (methodName === 'GET' || methodName === 'DELETE' || methodName === 'HEAD') {
    return determineTraceHeaderStatusFromNode(args[1]);
  }
  if (methodName === 'POST' || methodName === 'PUT' || methodName === 'PATCH') {
    return determineTraceHeaderStatusFromNode(args[2]);
  }
  if (!Node.isPropertyAccessExpression(call.getExpression()) || methodName === 'REQUEST') {
    return determineTraceHeaderStatusFromNode(args[0]);
  }
  return 'missing';
}

function determineSpanStatus(call: CallExpression): BinaryPresence {
  const ancestors = call.getAncestors().filter(Node.isCallExpression);
  for (const ancestor of ancestors) {
    const expressionText = ancestor.getExpression().getText();
    if (SPAN_FUNCTION_PATTERN.test(expressionText)) {
      return 'present';
    }
  }
  return 'missing';
}

function determineRetryStatus(call: CallExpression): BinaryPresence {
  const ancestors = call.getAncestors();
  for (const ancestor of ancestors) {
    if (Node.isCallExpression(ancestor)) {
      const text = ancestor.getExpression().getText();
      if (RETRY_WRAPPER_PATTERN.test(text)) {
        return 'present';
      }
    }
  }
  const expressionText = call.getExpression().getText();
  if (RETRY_WRAPPER_PATTERN.test(expressionText)) {
    return 'present';
  }
  return 'missing';
}

function getDeclarationKey(node: Node): string {
  const sourcePath = node.getSourceFile().getFilePath();
  return `${sourcePath}:${node.getKindName()}:${node.getPos()}`;
}

function collectReturnExpressions(fn: FunctionLike): Expression[] {
  const body = fn.getBody();
  if (!body) {
    return [];
  }
  if (Node.isBlock(body)) {
    return body
      .getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .map((statement) => statement.getExpression())
      .filter((expr): expr is Expression => Boolean(expr));
  }
  return [body as Expression];
}

function resolveFromFunctionLike(
  fn: FunctionLike,
  call: CallExpression,
  context: ResolutionContext,
): ResolvedPathValue | undefined {
  const key = getDeclarationKey(fn);
  if (context.visitedDeclarations.has(key)) {
    return undefined;
  }
  context.visitedDeclarations.add(key);

  const paramMap = new Map(context.paramMap);
  const params = fn.getParameters();
  const args = call.getArguments();

  params.forEach((param, index) => {
    const name = param.getName();
    if (!name) {
      return;
    }
    const arg = args[index];
    if (arg) {
      const resolvedArg = resolveExpressionToPath(arg, {
        ...context,
        depth: context.depth + 1,
        paramMap,
      });
      if (resolvedArg) {
        paramMap.set(name, resolvedArg);
        return;
      }
    }
    paramMap.set(name, { text: DYNAMIC_SEGMENT_PLACEHOLDER, isDynamic: true });
  });

  const nestedContext: ResolutionContext = {
    ...context,
    depth: context.depth + 1,
    paramMap,
  };

  for (const expression of collectReturnExpressions(fn)) {
    const resolved = resolveExpressionToPath(expression, nestedContext);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function resolveFromGetter(getter: GetAccessorDeclaration, context: ResolutionContext): ResolvedPathValue | undefined {
  const key = getDeclarationKey(getter);
  if (context.visitedDeclarations.has(key)) {
    return undefined;
  }
  context.visitedDeclarations.add(key);

  const nestedContext: ResolutionContext = {
    ...context,
    depth: context.depth + 1,
  };

  const body = getter.getBody();
  if (!body) {
    return undefined;
  }

  const returns = body
    .getDescendantsOfKind(SyntaxKind.ReturnStatement)
    .map((statement) => statement.getExpression())
    .filter((expr): expr is Expression => Boolean(expr));

  for (const expression of returns) {
    const resolved = resolveExpressionToPath(expression, nestedContext);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function resolveCallExpression(call: CallExpression, context: ResolutionContext): ResolvedPathValue | undefined {
  const expression = call.getExpression();
  const declarations = new Set<Node>();
  const symbol = expression.getSymbol();
  if (symbol) {
    symbol.getDeclarations().forEach((declaration) => declarations.add(declaration));
  }
  const signatureDeclaration = call.getSignature()?.getDeclaration();
  if (signatureDeclaration) {
    declarations.add(signatureDeclaration);
  }

  for (const declaration of declarations) {
    if (
      Node.isFunctionDeclaration(declaration) ||
      Node.isMethodDeclaration(declaration) ||
      Node.isArrowFunction(declaration) ||
      Node.isFunctionExpression(declaration)
    ) {
      const resolved = resolveFromFunctionLike(declaration as FunctionLike, call, context);
      if (resolved) {
        return resolved;
      }
      continue;
    }

    if (Node.isVariableDeclaration(declaration)) {
      const initializer = declaration.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        const resolved = resolveFromFunctionLike(initializer as FunctionLike, call, context);
        if (resolved) {
          return resolved;
        }
      }
      continue;
    }

    if (Node.isPropertyAssignment(declaration)) {
      const initializer = declaration.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        const resolved = resolveFromFunctionLike(initializer as FunctionLike, call, context);
        if (resolved) {
          return resolved;
        }
      }
      continue;
    }

    if (Node.isGetAccessorDeclaration(declaration)) {
      const fn: FunctionLike = declaration as unknown as MethodDeclaration;
      const resolved = resolveFromFunctionLike(fn, call, context);
      if (resolved) {
        return resolved;
      }
    }
  }

  const firstArg = call.getArguments()[0];
  if (firstArg) {
    const firstResolved = resolveExpressionToPath(firstArg, { ...context, depth: context.depth + 1 });
    if (firstResolved) {
      const isDynamic = firstResolved.isDynamic || call.getArguments().length > 1;
      return { text: firstResolved.text, isDynamic };
    }
  }

  return undefined;
}

function resolveExpressionToPath(node: Node | undefined, context?: ResolutionContext): ResolvedPathValue | undefined {
  if (!node) {
    return undefined;
  }

  const baseContext: ResolutionContext =
    context ?? {
      depth: 0,
      paramMap: new Map(),
      visitedNodes: new Set(),
      visitedDeclarations: new Set(),
    };

  if (baseContext.depth > MAX_RESOLUTION_DEPTH) {
    return undefined;
  }
  if (baseContext.visitedNodes.has(node)) {
    return undefined;
  }
  baseContext.visitedNodes.add(node);

  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return { text: node.getLiteralText(), isDynamic: false };
  }

  if (Node.isTemplateExpression(node)) {
    let text = node.getHead().getLiteralText();
    let isDynamic = false;
    for (const span of node.getTemplateSpans()) {
      const resolvedSpan = resolveExpressionToPath(span.getExpression(), {
        ...baseContext,
        depth: baseContext.depth + 1,
      });
      if (resolvedSpan && !resolvedSpan.isDynamic) {
        text += resolvedSpan.text;
      } else {
        text += DYNAMIC_SEGMENT_PLACEHOLDER;
        isDynamic = true;
      }
      const literalText = span.getLiteral().getLiteralText();
      text += literalText;
      if (resolvedSpan?.isDynamic) {
        isDynamic = true;
      }
    }
    return { text, isDynamic };
  }

  if (Node.isBinaryExpression(node) && node.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
    const left = resolveExpressionToPath(node.getLeft(), { ...baseContext, depth: baseContext.depth + 1 });
    const right = resolveExpressionToPath(node.getRight(), { ...baseContext, depth: baseContext.depth + 1 });
    return combineResolvedParts([left, right]);
  }

  if (Node.isParenthesizedExpression(node)) {
    return resolveExpressionToPath(node.getExpression(), { ...baseContext, depth: baseContext.depth + 1 });
  }

  if (Node.isIdentifier(node)) {
    const name = node.getText();
    const paramMatch = baseContext.paramMap.get(name);
    if (paramMatch) {
      return paramMatch;
    }

    const symbol = node.getSymbol();
    if (!symbol) {
      return undefined;
    }

    for (const declaration of symbol.getDeclarations()) {
      if (Node.isVariableDeclaration(declaration)) {
        const initializer = declaration.getInitializer();
        if (initializer) {
          const resolved = resolveExpressionToPath(initializer, {
            ...baseContext,
            depth: baseContext.depth + 1,
          });
          if (resolved) {
            return resolved;
          }
        }
      }

      if (Node.isPropertyAssignment(declaration)) {
        const initializer = declaration.getInitializer();
        if (initializer) {
          const resolved = resolveExpressionToPath(initializer, {
            ...baseContext,
            depth: baseContext.depth + 1,
          });
          if (resolved) {
            return resolved;
          }
        }
      }

      if (Node.isParameterDeclaration(declaration)) {
        return { text: DYNAMIC_SEGMENT_PLACEHOLDER, isDynamic: true };
      }
    }
    return undefined;
  }

  if (Node.isPropertyAccessExpression(node)) {
    const symbol = node.getSymbol();
    if (symbol) {
      for (const declaration of symbol.getDeclarations()) {
        if (Node.isPropertyAssignment(declaration)) {
          const initializer = declaration.getInitializer();
          if (initializer) {
            const resolved = resolveExpressionToPath(initializer, {
              ...baseContext,
              depth: baseContext.depth + 1,
            });
            if (resolved) {
              return resolved;
            }
          }
        }
        if (Node.isGetAccessorDeclaration(declaration)) {
          const resolved = resolveFromGetter(declaration, {
            ...baseContext,
            depth: baseContext.depth + 1,
          });
          if (resolved) {
            return resolved;
          }
        }
      }
    }
  }

  if (Node.isCallExpression(node)) {
    return resolveCallExpression(node, baseContext);
  }

  return undefined;
}

function inferMethodFromInit(call: CallExpression): { method?: string; hasBody: boolean } {
  const args = call.getArguments();
  if (args.length === 0) {
    return { hasBody: false };
  }
  const secondArg = args[1];
  if (!secondArg || !Node.isObjectLiteralExpression(secondArg)) {
    return { hasBody: false };
  }
  let method: string | undefined;
  let hasBody = false;
  for (const prop of secondArg.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) {
      continue;
    }
    const name = prop.getName();
    if (name === 'method') {
      const valueText = extractLiteralText(prop.getInitializer());
      if (valueText) {
        method = valueText.toUpperCase();
      }
    }
    if (name === 'body') {
      hasBody = true;
    }
  }
  return { method, hasBody };
}

function inferAxiosMethod(call: CallExpression, property: PropertyAccessExpression): string {
  const methodName = property.getName();
  if (methodName) {
    return methodName.toUpperCase();
  }
  return 'GET';
}

function typeMatchesXmlHttpRequest(type: Type | undefined): boolean {
  if (!type) {
    return false;
  }
  const text = type.getText();
  return typeof text === 'string' && text.includes('XMLHttpRequest');
}

function isXmlHttpRequestIdentifier(identifier: Identifier): boolean {
  const symbol = identifier.getSymbol();
  if (!symbol) {
    return false;
  }

  for (const declaration of symbol.getDeclarations()) {
    if (Node.isVariableDeclaration(declaration)) {
      const initializer = declaration.getInitializer();
      if (initializer && Node.isNewExpression(initializer)) {
        const expression = initializer.getExpression();
        if (Node.isIdentifier(expression) && expression.getText() === 'XMLHttpRequest') {
          return true;
        }
      }
      if (typeMatchesXmlHttpRequest(declaration.getType())) {
        return true;
      }
    }

    if (Node.isParameterDeclaration(declaration)) {
      const explicitType = declaration.getTypeNode();
      if (explicitType && explicitType.getText().includes('XMLHttpRequest')) {
        return true;
      }
      if (typeMatchesXmlHttpRequest(declaration.getType())) {
        return true;
      }
    }
  }

  return false;
}

function findEnclosingFunctionLike(node: Node): FunctionLike | undefined {
  return node
    .getAncestors()
    .find((ancestor): ancestor is FunctionLike =>
      Node.isFunctionDeclaration(ancestor) ||
      Node.isMethodDeclaration(ancestor) ||
      Node.isArrowFunction(ancestor) ||
      Node.isFunctionExpression(ancestor),
    );
}

function hasXmlHttpRequestBody(identifier: Identifier, context: Node): boolean {
  const scope = findEnclosingFunctionLike(context) ?? identifier.getSourceFile();
  const calls = scope.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const candidate of calls) {
    const expr = candidate.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) {
      continue;
    }
    if (expr.getName() !== 'send') {
      continue;
    }
    const target = expr.getExpression();
    if (!Node.isIdentifier(target) || target.getText() !== identifier.getText()) {
      continue;
    }
    if (candidate.getArguments().length > 0) {
      return true;
    }
  }
  return false;
}

function getNodeKey(node: Node): string {
  const filePath = node.getSourceFile().getFilePath();
  return `${filePath}:${node.getKindName()}:${node.getStart()}`;
}

function resolveObjectLiteralFromExpression(expression: Expression | undefined, depth = 0, visited = new Set<string>()): ObjectLiteralExpression | undefined {
  if (!expression || depth > 8) {
    return undefined;
  }

  if (Node.isObjectLiteralExpression(expression)) {
    return expression;
  }

  if (Node.isIdentifier(expression)) {
    const symbol = expression.getSymbol();
    if (!symbol) {
      return undefined;
    }
    for (const declaration of symbol.getDeclarations()) {
      const key = getNodeKey(declaration);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      if (Node.isVariableDeclaration(declaration)) {
        const initializer = declaration.getInitializer();
        const resolved = resolveObjectLiteralFromExpression(initializer as Expression | undefined, depth + 1, visited);
        if (resolved) {
          return resolved;
        }
      } else if (Node.isPropertyAssignment(declaration)) {
        const initializer = declaration.getInitializer();
        const resolved = resolveObjectLiteralFromExpression(initializer as Expression | undefined, depth + 1, visited);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  return undefined;
}

function expressionIsTruthy(expression: Expression | undefined): boolean {
  if (!expression) {
    return false;
  }
  const text = expression.getText().trim().toLowerCase();
  if (!text || ['false', '0', 'null', 'undefined', 'void 0'].includes(text)) {
    return false;
  }
  return true;
}

function derivesFromBuildHashPayload(expression: Expression | undefined, depth = 0, visited = new Set<string>()): boolean {
  if (!expression || depth > 12) {
    return false;
  }

  if (Node.isCallExpression(expression)) {
    const callee = expression.getExpression();
    if (
      Node.isPropertyAccessExpression(callee) &&
      callee.getName() === 'buildHashPayload' &&
      (Node.isThisExpression(callee.getExpression()) || Node.isIdentifier(callee.getExpression()) || Node.isPropertyAccessExpression(callee.getExpression()))
    ) {
      return true;
    }
  }

  if (Node.isPropertyAccessExpression(expression)) {
    return derivesFromBuildHashPayload(expression.getExpression(), depth + 1, visited);
  }

  if (Node.isBinaryExpression(expression)) {
    return (
      derivesFromBuildHashPayload(expression.getLeft(), depth + 1, visited) ||
      derivesFromBuildHashPayload(expression.getRight(), depth + 1, visited)
    );
  }

  if (Node.isConditionalExpression(expression)) {
    return (
      derivesFromBuildHashPayload(expression.getWhenTrue(), depth + 1, visited) ||
      derivesFromBuildHashPayload(expression.getWhenFalse(), depth + 1, visited)
    );
  }

  if (Node.isIdentifier(expression)) {
    const symbol = expression.getSymbol();
    if (!symbol) {
      return false;
    }
    for (const declaration of symbol.getDeclarations()) {
      const key = getNodeKey(declaration);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      if (Node.isVariableDeclaration(declaration)) {
        const initializer = declaration.getInitializer();
        if (derivesFromBuildHashPayload(initializer as Expression | undefined, depth + 1, visited)) {
          return true;
        }
      } else if (Node.isPropertyAssignment(declaration)) {
        const initializer = declaration.getInitializer();
        if (derivesFromBuildHashPayload(initializer as Expression | undefined, depth + 1, visited)) {
          return true;
        }
      } else if (Node.isParameterDeclaration(declaration)) {
        // Parameter injection cannot guarantee geometry hashing; treat as unknown
        continue;
      }
    }
  }

  return false;
}

function collectCacheMetadata(method: MethodDeclaration): CacheMetadata {
  let usesPricingCache = false;
  let buildsHashPayload = false;
  let decoratesCacheHeaders = false;
  let requestUsesHashPayload = false;
  let controlConfiguresTtl = false;
  let controlMarksHotPath = false;
  let controlSupportsBust = false;

  method.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) {
      return;
    }

    const expression = node.getExpression();
    if (!Node.isPropertyAccessExpression(expression)) {
      return;
    }

    const propertyName = expression.getName();
    const qualifier = expression.getExpression();

    if (propertyName === 'withCache') {
      if (
        Node.isPropertyAccessExpression(qualifier) &&
        qualifier.getName() === 'pricingCache' &&
        Node.isThisExpression(qualifier.getExpression())
      ) {
        usesPricingCache = true;
      } else if (Node.isIdentifier(qualifier) && qualifier.getText() === 'pricingCache') {
        usesPricingCache = true;
      }

      const args = node.getArguments();
      const configArg = args[0] as Expression | undefined;
      const configLiteral = resolveObjectLiteralFromExpression(configArg);
      if (configLiteral) {
        const requestProp = configLiteral.getProperty('request');
        if (requestProp && Node.isPropertyAssignment(requestProp)) {
          const initializer = requestProp.getInitializer();
          if (derivesFromBuildHashPayload(initializer as Expression | undefined)) {
            requestUsesHashPayload = true;
          }
        }

        const controlProp = configLiteral.getProperty('control');
        if (controlProp && Node.isPropertyAssignment(controlProp)) {
          const controlInitializer = controlProp.getInitializer() as Expression | undefined;
          const controlLiteral = resolveObjectLiteralFromExpression(controlInitializer);
          if (controlLiteral) {
            for (const controlEntry of controlLiteral.getProperties()) {
              if (!Node.isPropertyAssignment(controlEntry)) {
                continue;
              }
              const controlName = controlEntry.getName();
              const controlValue = controlEntry.getInitializer() as Expression | undefined;
              if (controlName === 'ttlSeconds') {
                controlConfiguresTtl = true;
              }
              if (controlName === 'hotPath' && expressionIsTruthy(controlValue)) {
                controlMarksHotPath = true;
                controlConfiguresTtl = true;
              }
              if (controlName === 'bust' && expressionIsTruthy(controlValue)) {
                controlSupportsBust = true;
              }
            }
          }
        }
      }
    } else if (propertyName === 'buildHashPayload' && Node.isThisExpression(qualifier)) {
      buildsHashPayload = true;
    } else if (propertyName === 'decorateCacheHeaders' && Node.isThisExpression(qualifier)) {
      decoratesCacheHeaders = true;
    }
  });

  return {
    usesPricingCache,
    buildsHashPayload,
    decoratesCacheHeaders,
    requestUsesHashPayload,
    controlConfiguresTtl,
    controlMarksHotPath,
    controlSupportsBust,
  };
}

function collectControllerRoutes(): ControllerRoute[] {
  const routes: ControllerRoute[] = [];
  const controllerFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/api/src/**/*.controller.{ts,tsx}`);
  for (const sourceFile of controllerFiles) {
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      const classDecorators = cls.getDecorators();
      const controllerDecorator = classDecorators.find((decorator) => getDecoratorName(decorator) === 'Controller');
      if (!controllerDecorator) {
        continue;
      }

      const basePath = extractControllerBasePath(controllerDecorator);

      for (const method of cls.getMethods()) {
        const methodDecorators = method.getDecorators();
        const httpDecorator = methodDecorators.find((decorator) => {
          const name = getDecoratorName(decorator);
          return ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'].includes(name);
        });
        if (!httpDecorator) {
          continue;
        }

        const decoratorArgs = httpDecorator.getArguments();
        let pathSuffix = '';
        if (decoratorArgs.length > 0) {
          const resolvedPathArg = resolveExpressionToPath(decoratorArgs[0]);
          pathSuffix = resolvedPathArg?.text ?? extractLiteralText(decoratorArgs[0]) ?? '';
        }

        const httpMethod = getDecoratorName(httpDecorator).toUpperCase();
        const combinedPath = joinPaths(basePath, pathSuffix);
        const normalizedPath = normalizePath(combinedPath);
        const apiPath = normalizedPath.startsWith('/api')
          ? normalizedPath
          : normalizePath(normalizedPath === '/' ? '/api' : `/api${normalizedPath}`);
        const statusCodesSet = new Set<number>();
        const httpCodeDecorator = methodDecorators.find((decorator) => getDecoratorName(decorator) === 'HttpCode');
        if (httpCodeDecorator) {
          const statusArg = httpCodeDecorator.getArguments()[0];
          const resolved = resolveStatusCode(statusArg as Expression | undefined);
          if (typeof resolved === 'number') {
            statusCodesSet.add(resolved);
          }
        }

        for (const decorator of methodDecorators) {
          const decoratorName = getDecoratorName(decorator);
          if (decoratorName === 'ApiResponse') {
            const arg = decorator.getArguments()[0];
            if (arg && Node.isObjectLiteralExpression(arg)) {
              const statusProp = arg.getProperty('status');
              if (statusProp && Node.isPropertyAssignment(statusProp)) {
                const value = statusProp.getInitializer();
                const resolved = resolveStatusCode(value as Expression | undefined);
                if (typeof resolved === 'number') {
                  statusCodesSet.add(resolved);
                }
              }
            }
          } else if (decoratorName === 'ApiResponses') {
            const arg = decorator.getArguments()[0];
            if (arg && Node.isArrayLiteralExpression(arg)) {
              for (const element of arg.getElements()) {
                if (Node.isObjectLiteralExpression(element)) {
                  const statusProp = element.getProperty('status');
                  if (statusProp && Node.isPropertyAssignment(statusProp)) {
                    const value = statusProp.getInitializer();
                    const resolved = resolveStatusCode(value as Expression | undefined);
                    if (typeof resolved === 'number') {
                      statusCodesSet.add(resolved);
                    }
                  }
                }
              }
            }
          } else if (API_RESPONSE_DECORATOR_STATUS[decoratorName] !== undefined) {
            statusCodesSet.add(API_RESPONSE_DECORATOR_STATUS[decoratorName]);
          }
        }

        const bodyTypes: string[] = [];
        const bodyDtoMatches: string[][] = [];
        for (const param of method.getParameters()) {
          if (param.getDecorator('Body')) {
            const typeNode = param.getTypeNode();
            const parameterType = param.getType();
            const typeText = typeNode ? typeNode.getText() : parameterType.getText();
            bodyTypes.push(typeText);
            bodyDtoMatches.push(extractDtoMatchesFromType(parameterType, typeText));
          }
        }

  const guardMetadata = collectGuardMetadata(cls, method);
  const policyMetadata = collectPolicyMetadata(cls, method);
        const versions = collectVersionMetadata(cls, method);
        const paramNames = collectParamNames(method);
        const statusCodes = [...statusCodesSet].sort((a, b) => a - b);

        const cacheMetadata = collectCacheMetadata(method);

        const responseType = method.getReturnType();
        const responseTypeText = responseType.getText(method);
        const responseDtoMatches = extractDtoMatchesFromType(responseType, responseTypeText);

        routes.push({
          file: sourceFile.getFilePath().replace(`${toPosix(repoRoot)}/`, ''),
          className: cls.getName() ?? 'AnonymousController',
          methodName: method.getName(),
          httpMethod,
          path: normalizedPath,
          apiPath,
          isDynamic: isPathDynamic(normalizedPath),
          statusCodes,
          guarded: guardMetadata.guarded,
          guardIdentifiers: guardMetadata.guardIdentifiers,
          bodyTypes,
          bodyDtoMatches,
          guardSources: guardMetadata.guardSources,
          versions,
          paramNames,
          cacheMetadata,
          responseType: responseTypeText,
          responseDtoMatches,
          policies: policyMetadata,
        });
      }
    }
  }
  return routes;
}

function requiresCostCacheEnforcement(route: ControllerRoute): boolean {
  if (!route.apiPath.startsWith('/api/price')) {
    return false;
  }
  if (route.apiPath.includes('/admin')) {
    return false;
  }
  if (route.httpMethod !== 'POST') {
    return false;
  }
  return route.apiPath.includes('/v2/calculate');
}

function findControllerMatch(call: ApiCallDescriptor, routes: ControllerRoute[]): ControllerRoute | undefined {
  const callPath = call.normalizedUrl;
  const candidates = routes.filter((route) => pathsMatch(callPath, route.apiPath));
  if (candidates.length === 0) {
    return undefined;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  const verbMatches = candidates.filter((route) => route.httpMethod === call.method);
  if (verbMatches.length === 1) {
    return verbMatches[0];
  }
  if (verbMatches.length > 1) {
    const staticMatch = verbMatches.find((route) => !route.isDynamic);
    return staticMatch ?? verbMatches[0];
  }

  const staticMatch = candidates.find((route) => !route.isDynamic);
  return staticMatch ?? candidates[0];
}

function buildIssue(
  call: ApiCallDescriptor,
  issueType: ApiTraceIssue['issueType'],
  severity: ApiTraceIssue['severity'],
  evidence: string,
  suggestion: string,
  controller?: ControllerRoute,
  metadata?: IssueMetadata,
): ApiTraceIssue {
  const runbookUrl = resolveRunbookUrl(issueType);
  const baseIssue: ApiTraceIssue = {
    call,
    issueType,
    severity,
    evidence,
    suggestion,
    controllerFile: controller?.file,
    controllerMethod: controller ? `${controller.className}.${controller.methodName}` : undefined,
    runbookUrl,
  };
  if (metadata) {
    baseIssue.metadata = {
      ...metadata,
      schemas: metadata.schemas?.filter((schema) => schema && schema.trim().length) ?? metadata.schemas,
    };
  }
  return baseIssue;
}

function toPythonModulePath(filePath: string, cadRoot: string): string {
  const relative = path.relative(cadRoot, filePath).replace(/\\/g, '/');
  return relative.replace(/\.py$/i, '').replace(/\//g, '.');
}

function extractPythonPrefix(args: string): string {
  const prefixMatch = args.match(/prefix\s*=\s*(['"])([^'"]+)\1/);
  if (!prefixMatch) {
    return '';
  }
  const value = prefixMatch[2].trim();
  if (!value) {
    return '';
  }
  return ensureLeadingSlash(value);
}

function extractDecoratorPath(args: string): string | undefined {
  const literalMatch = args.match(/['"](\/[^'"]*)['"]/);
  if (literalMatch) {
    return literalMatch[1];
  }
  const pathArgMatch = args.match(/path\s*=\s*(['"])([^'"]+)\1/);
  if (pathArgMatch) {
    return ensureLeadingSlash(pathArgMatch[2]);
  }
  return undefined;
}

function extractDecoratorResponseModel(args: string): string | undefined {
  const responseModelMatch = args.match(/response_model\s*=\s*([A-Za-z0-9_\.]+)/);
  if (!responseModelMatch) {
    return undefined;
  }
  const candidate = responseModelMatch[1];
  const segments = candidate.split('.');
  return segments[segments.length - 1] ?? candidate;
}

function collectCadServiceRoutes(): CadServiceRoute[] {
  const cadRoot = path.join(repoRoot, 'apps/cad-service');
  if (!existsSync(cadRoot)) {
    return [];
  }

  const pythonFiles = globby.sync(['**/*.py'], { cwd: cadRoot, dot: false, absolute: true });
  interface PythonRouteRecord {
    routerId: string;
    method: string;
    path: string;
    responseModel?: string;
    functionName: string;
    file: string;
  }

  const routerPrefixes = new Map<string, string>();
  const includePrefixes = new Map<string, Set<string>>();
  const pendingRoutes: PythonRouteRecord[] = [];

  for (const absPath of pythonFiles) {
    const fileContents = readFileSync(absPath, 'utf-8');
    const modulePath = toPythonModulePath(absPath, cadRoot);
    const aliasToRouterId = new Map<string, string>();

    const fastApiRegex = /(\w+)\s*=\s*FastAPI\s*\(/g;
    let fastApiMatch: RegExpExecArray | null;
    while ((fastApiMatch = fastApiRegex.exec(fileContents)) !== null) {
      const identifier = fastApiMatch[1];
      const routerId = `${modulePath}::${identifier}`;
      routerPrefixes.set(routerId, '');
      aliasToRouterId.set(identifier, routerId);
    }

    const routerRegex = /(\w+)\s*=\s*APIRouter\s*\(([^)]*)\)/g;
    let routerMatch: RegExpExecArray | null;
    while ((routerMatch = routerRegex.exec(fileContents)) !== null) {
      const identifier = routerMatch[1];
      const args = routerMatch[2] ?? '';
      const routerId = `${modulePath}::${identifier}`;
      const prefix = extractPythonPrefix(args);
      routerPrefixes.set(routerId, prefix);
      aliasToRouterId.set(identifier, routerId);
    }

    const importRegex = /from\s+([A-Za-z0-9_\.]+)\s+import\s+([^\n]+)/g;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importRegex.exec(fileContents)) !== null) {
      const moduleName = importMatch[1];
      const imported = importMatch[2];
      const parts = imported.split(',');
      for (const rawPart of parts) {
        const segment = rawPart.trim();
        if (!segment) {
          continue;
        }
        const aliasSplit = segment.split(/\s+as\s+/i);
        const original = aliasSplit[0].trim();
        const alias = aliasSplit[1] ? aliasSplit[1].trim() : original;
        if (!alias) {
          continue;
        }
        const routerId = `${moduleName}::${original}`;
        aliasToRouterId.set(alias, routerId);
      }
    }

    const includeRegex = /include_router\s*\(\s*([A-Za-z0-9_]+)([^)]*)\)/g;
    let includeMatch: RegExpExecArray | null;
    while ((includeMatch = includeRegex.exec(fileContents)) !== null) {
      const alias = includeMatch[1];
      const args = includeMatch[2] ?? '';
      const routerId = aliasToRouterId.get(alias);
      if (!routerId) {
        continue;
      }
      const prefix = extractPythonPrefix(args);
      const targetSet = ensureSet(includePrefixes, routerId);
      if (prefix) {
        targetSet.add(normalizePath(prefix));
      } else {
        targetSet.add('');
      }
    }

    const decoratorRegex = /@([A-Za-z0-9_]+)\.(get|post|put|delete|patch|options|head)\s*\(([^)]*)\)/g;
    let decoratorMatch: RegExpExecArray | null;
    while ((decoratorMatch = decoratorRegex.exec(fileContents)) !== null) {
      const alias = decoratorMatch[1];
      const method = decoratorMatch[2].toUpperCase();
      const args = decoratorMatch[3] ?? '';
      const routerId = aliasToRouterId.get(alias);
      const rawPath = extractDecoratorPath(args);
      if (!routerId || !rawPath) {
        continue;
      }
      const responseModel = extractDecoratorResponseModel(args);
      const remainder = fileContents.slice(decoratorRegex.lastIndex);
      const functionMatch = remainder.match(/\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/);
      const functionName = functionMatch ? functionMatch[1] : 'anonymous';
      pendingRoutes.push({
        routerId,
        method,
        path: rawPath,
        responseModel,
        functionName,
        file: toPosix(path.relative(repoRoot, absPath)),
      });
    }
  }

  const finalRoutes: CadServiceRoute[] = [];
  const seen = new Set<string>();

  for (const pending of pendingRoutes) {
    const basePrefix = routerPrefixes.get(pending.routerId) ?? '';
    const includeSet = includePrefixes.get(pending.routerId);
    const includeVariants = includeSet && includeSet.size ? [...includeSet] : [''];

    for (const includePrefix of includeVariants) {
      const combinedPrefix = joinPaths(includePrefix, basePrefix);
      const combinedPath = joinPaths(combinedPrefix, pending.path);
      const normalizedPath = normalizePath(combinedPath);
      const normalizedPrefix = combinedPrefix ? normalizePath(combinedPrefix) : '/';
      const dedupeKey = `${pending.method}|${normalizedPath}|${pending.functionName}|${pending.file}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      finalRoutes.push({
        file: pending.file,
        functionName: pending.functionName,
        method: pending.method,
        path: normalizedPath,
        prefix: normalizedPrefix,
        responseModel: pending.responseModel,
      });
    }
  }

  return finalRoutes.sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });
}

function collectCadPythonModels(): Map<string, PythonPydanticModel> {
  const cadRoot = path.join(repoRoot, 'apps/cad-service');
  const models = new Map<string, PythonPydanticModel>();
  if (!existsSync(cadRoot)) {
    return models;
  }

  const pythonFiles = globby.sync(['**/*.py'], { cwd: cadRoot, dot: false, absolute: true });
  const classRegex = /class\s+([A-Za-z0-9_]+)\(BaseModel\):([\s\S]*?)(?=\n(?:class\s|async\s+def\s|def\s|$))/g;

  for (const absPath of pythonFiles) {
    const content = readFileSync(absPath, 'utf-8');
    let match: RegExpExecArray | null;
    while ((match = classRegex.exec(content)) !== null) {
      const modelName = match[1];
      const body = match[2] ?? '';
      const fieldRegex = /^\s{4}([A-Za-z0-9_]+)\s*:/gm;
      const fields = new Set<string>();
      let fieldMatch: RegExpExecArray | null;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        fields.add(fieldMatch[1]);
      }
      models.set(modelName, {
        file: toPosix(path.relative(repoRoot, absPath)),
        fields,
      });
    }
  }

  return models;
}

const cadSchemaFieldCache = new Map<string, string[]>();

function getCadSharedSchemaFields(schemaName: string): string[] {
  const cached = cadSchemaFieldCache.get(schemaName);
  if (cached) {
    return cached;
  }
  for (const sourceFile of project.getSourceFiles()) {
    const declaration = sourceFile.getVariableDeclaration(schemaName);
    if (!declaration) {
      continue;
    }
    const initializer = declaration.getInitializer() as Expression | undefined;
    const fields = extractZodObjectKeys(initializer);
    cadSchemaFieldCache.set(schemaName, fields);
    return fields;
  }
  cadSchemaFieldCache.set(schemaName, []);
  return [];
}

function extractZodObjectKeys(initializer: Expression | undefined): string[] {
  if (!initializer) {
    return [];
  }
  const candidates = [initializer, ...initializer.getDescendantsOfKind(SyntaxKind.CallExpression)];
  for (const candidate of candidates) {
    if (!Node.isCallExpression(candidate)) {
      continue;
    }
    const callee = candidate.getExpression();
    if (!Node.isPropertyAccessExpression(callee) || callee.getName() !== 'object') {
      continue;
    }
    const args = candidate.getArguments();
    if (!args.length || !Node.isObjectLiteralExpression(args[0])) {
      continue;
    }
    const properties = args[0].getProperties();
    const keys: string[] = [];
    for (const property of properties) {
      if (!Node.isPropertyAssignment(property)) {
        continue;
      }
      const nameNode = property.getNameNode();
      if (!nameNode) {
        continue;
      }
      keys.push(nameNode.getText().replace(/['"`]/g, ''));
    }
    return keys;
  }
  return [];
}

function canonicalizeContractFieldName(name: string): string {
  return name.replace(/[_\s-]+/g, '').toLowerCase();
}

function evaluateCadContractMismatch(
  sharedSchema: string,
  sharedFields: string[],
  responseModel: string | undefined,
  pythonModels: Map<string, PythonPydanticModel>,
): CadContractMismatchDetail | null {
  const sharedCanonical = new Map<string, string>();
  for (const field of sharedFields) {
    sharedCanonical.set(canonicalizeContractFieldName(field), field);
  }

  if (!responseModel) {
    return {
      sharedSchema,
      pythonModel: undefined,
      missingFields: [...sharedFields],
      extraFields: [],
    };
  }

  const pythonModel = pythonModels.get(responseModel);
  if (!pythonModel) {
    return {
      sharedSchema,
      pythonModel: responseModel,
      missingFields: [...sharedFields],
      extraFields: [],
    };
  }

  const pythonCanonical = new Map<string, string>();
  for (const field of pythonModel.fields) {
    pythonCanonical.set(canonicalizeContractFieldName(field), field);
  }

  const missingFields = sharedFields.filter((field) => !pythonCanonical.has(canonicalizeContractFieldName(field)));
  const extraFields = Array.from(pythonModel.fields).filter(
    (field) => !sharedCanonical.has(canonicalizeContractFieldName(field)),
  );

  if (missingFields.length || extraFields.length) {
    return {
      sharedSchema,
      pythonModel: responseModel,
      missingFields,
      extraFields,
    };
  }

  return null;
}

function findCadRouteMatch(method: string, pathCandidate: string, cadRoutes: CadServiceRoute[]): CadServiceRoute | undefined {
  const candidates = cadRoutes.filter((route) => route.method === method && pathsMatch(pathCandidate, route.path));
  if (!candidates.length) {
    return undefined;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  const staticMatch = candidates.find((route) => !isPathDynamic(route.path));
  return staticMatch ?? candidates[0];
}

function generateCadTouchpointSummary(
  calls: ApiCallDescriptor[],
  cadRoutes: CadServiceRoute[],
  pythonModels: Map<string, PythonPydanticModel>,
): CadTouchpointSummary | undefined {
  const cadCalls = calls.filter((call) => call.targetService === 'cad-service');
  if (!cadCalls.length) {
    return undefined;
  }

  const summaryEntries = new Map<string, CadServiceCallSummaryEntry>();

  for (const call of cadCalls) {
    const normalizedPath = normalizePath(call.normalizedUrl);
    const key = `${call.method}|${normalizedPath}`;
    let entry = summaryEntries.get(key);
    if (!entry) {
      entry = {
        method: call.method,
        path: normalizedPath,
        callSites: new Set<string>(),
        callCount: 0,
        issues: new Set(),
      };
      summaryEntries.set(key, entry);
    }
    entry.callCount += 1;
    entry.callSites.add(`${call.file}:${call.line}`);
  }

  for (const entry of summaryEntries.values()) {
    const match = findCadRouteMatch(entry.method, entry.path, cadRoutes);
    if (!match) {
      entry.issues.add('missing_endpoint');
      continue;
    }
    entry.matchedRoute = match;
    const expectation = CAD_ENDPOINT_EXPECTATIONS.find(
      (candidate) => candidate.method === entry.method && candidate.consumerPathPattern.test(entry.path),
    );
    if (!expectation) {
      continue;
    }
    const sharedFields = getCadSharedSchemaFields(expectation.sharedSchema);
    if (!sharedFields.length) {
      continue;
    }
    const mismatch = evaluateCadContractMismatch(expectation.sharedSchema, sharedFields, match.responseModel, pythonModels);
    if (mismatch) {
      entry.contractMismatch = mismatch;
      entry.issues.add('contract_mismatch');
    }
  }

  const uniquePaths = Array.from(summaryEntries.values())
    .map((entry) => ({ method: entry.method, path: entry.path, callCount: entry.callCount }))
    .sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

  const missingEndpoints = Array.from(summaryEntries.values())
    .filter((entry) => entry.issues.has('missing_endpoint'))
    .map((entry) => ({
      method: entry.method,
      path: entry.path,
      callSites: [...entry.callSites].sort(),
    }))
    .sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

  const contractMismatches = Array.from(summaryEntries.values())
    .filter((entry) => entry.contractMismatch)
    .map((entry) => ({
      method: entry.method,
      path: entry.path,
      callSites: [...entry.callSites].sort(),
      detail: entry.contractMismatch as CadContractMismatchDetail,
      routeFile: entry.matchedRoute?.file,
      routeFunction: entry.matchedRoute?.functionName,
      responseModel: entry.matchedRoute?.responseModel,
    }))
    .sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

  const routesDiscoveredMap = new Map<string, CadServiceRoute>();
  for (const route of cadRoutes) {
    const key = `${route.method}|${route.path}|${route.functionName}|${route.file}`;
    if (!routesDiscoveredMap.has(key)) {
      routesDiscoveredMap.set(key, route);
    }
  }

  const routesDiscovered = Array.from(routesDiscoveredMap.values()).sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });

  return {
    callsAnalyzed: cadCalls.length,
    uniquePaths,
    missingEndpoints,
    contractMismatches,
    routesDiscovered: routesDiscovered.map((route) => ({
      method: route.method,
      path: route.path,
      responseModel: route.responseModel,
      file: route.file,
      functionName: route.functionName,
    })),
  };
}

interface BuildPatchPlanOptions {
  schema: string;
  issueType: ApiIssueType;
  targetService: TargetService;
  controllerFile?: string;
  runbookUrl?: string;
}

function sanitizeSchemaName(schema: string): string {
  const withDashes = schema
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2');
  return withDashes
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'unknown-schema';
}

function buildPatchPlanForSchema(options: BuildPatchPlanOptions): IssuePatchPlan {
  const { schema, issueType, targetService, controllerFile, runbookUrl } = options;
  const sanitizedSchema = sanitizeSchemaName(schema);
  const baseDir = `/_copilot_fixes/${sanitizedSchema}`;
  const files = new Set<string>([`${baseDir}/schema-alignment.patch`]);

  if (controllerFile) {
    const normalizedController = controllerFile.replace(/\\/g, '/');
    const controllerFragment = normalizedController.replace(/\//g, '__');
    files.add(`${baseDir}/${controllerFragment}.patch`);
  }

  if (targetService === 'cad-service' || issueType === 'cad_contract_mismatch') {
    files.add(`${baseDir}/cad-service-sync.patch`);
  }

  if (issueType === 'contract_drift' || issueType === 'dto_inconsistent') {
    files.add(`${baseDir}/api-contract-sync.patch`);
  }

  const tests = new Set<string>();
  tests.add('pnpm test --filter shared-contracts');
  if (targetService === 'cad-service') {
    tests.add('pnpm test --filter cad-service');
  } else {
    tests.add('pnpm test --filter api');
  }

  const runbookUpdates = new Set<string>();
  runbookUpdates.add('docs/runbooks/customer-api-trace-remediation.md');
  if (runbookUrl) {
    runbookUpdates.add(runbookUrl);
  }

  return {
    files: [...files].sort(),
    tests: [...tests].sort(),
    runbookUpdates: [...runbookUpdates].sort(),
  };
}

function ensureSchemaBucket(map: Map<string, SchemaAuditIssue[]>, schema: string): SchemaAuditIssue[] {
  const existing = map.get(schema);
  if (existing) {
    return existing;
  }
  const created: SchemaAuditIssue[] = [];
  map.set(schema, created);
  return created;
}

function createSchemaIssueFromTrace(schema: string, issue: ApiTraceIssue, entry: ApiTraceReportEntry): SchemaAuditIssue {
  const controller = entry.matchedController;
  const controllerFile = controller?.file ?? issue.controllerFile;
  const patchPlan = buildPatchPlanForSchema({
    schema,
    issueType: issue.issueType,
    targetService: entry.call.targetService,
    controllerFile,
    runbookUrl: issue.runbookUrl,
  });

  const controllerInfo = controller
    ? {
        file: controller.file,
        method: `${controller.className}.${controller.methodName}`,
        httpMethod: controller.httpMethod,
        apiPath: controller.apiPath,
        responseModel: controller.responseType,
      }
    : controllerFile
    ? {
        file: controllerFile,
        method: issue.controllerMethod,
      }
    : undefined;

  return {
    issueType: issue.issueType,
    severity: issue.severity,
    evidence: issue.evidence,
    suggestion: issue.suggestion,
    call: {
      file: entry.call.file,
      line: entry.call.line,
      column: entry.call.column,
      method: entry.call.method,
      normalizedUrl: entry.call.normalizedUrl,
      route: entry.call.route,
      targetService: entry.call.targetService,
    },
    controller: controllerInfo,
    runbookUrl: issue.runbookUrl,
    patchPlan,
  };
}

function createSchemaIssueFromCad(
  schema: string,
  mismatch: CadTouchpointSummary['contractMismatches'][number],
): SchemaAuditIssue {
  const runbookUrl = resolveRunbookUrl('cad_contract_mismatch');
  const patchPlan = buildPatchPlanForSchema({
    schema,
    issueType: 'cad_contract_mismatch',
    targetService: 'cad-service',
    controllerFile: mismatch.routeFile,
    runbookUrl,
  });

  const firstSite = mismatch.callSites[0] ?? '';
  const [rawFile, rawLine] = firstSite.split(':');
  const parsedLine = Number.parseInt(rawLine ?? '', 10);

  const missingFields = mismatch.detail.missingFields.length
    ? mismatch.detail.missingFields.join(', ')
    : 'none';
  const extraFields = mismatch.detail.extraFields.length
    ? mismatch.detail.extraFields.join(', ')
    : 'none';

  return {
    issueType: 'cad_contract_mismatch',
    severity: 'high',
    evidence: `CAD route ${mismatch.method} ${mismatch.path} diverges from ${schema}. Missing fields: ${missingFields}. Extra fields: ${extraFields}.`,
    suggestion: `Align ${mismatch.responseModel ?? 'cad-service response model'} with ${schema} or update the shared contract if the API surface has changed intentionally.`,
    call: {
      file: rawFile ?? 'unknown',
      line: Number.isFinite(parsedLine) ? parsedLine : 0,
      column: 0,
      method: mismatch.method,
      normalizedUrl: mismatch.path,
      route: 'cad-service',
      targetService: 'cad-service',
    },
    controller: mismatch.routeFile
      ? {
          file: mismatch.routeFile,
          method: mismatch.routeFunction,
          httpMethod: mismatch.method,
          apiPath: mismatch.path,
          responseModel: mismatch.responseModel,
        }
      : undefined,
    runbookUrl,
    patchPlan,
  };
}

async function generateSchemaAuditArtifacts(options: {
  traceEntries: ApiTraceReportEntry[];
  cadSummary?: CadTouchpointSummary;
  outputDir: string;
  generatedAt: string;
}): Promise<SchemaAuditArtifactBundle> {
  const { traceEntries, cadSummary, outputDir, generatedAt } = options;
  const schemaIssues = new Map<string, SchemaAuditIssue[]>();

  for (const entry of traceEntries) {
    const fallbackSchemas = new Set<string>();
    entry.call.sharedContracts.forEach((schema) => schema && fallbackSchemas.add(schema));
    (entry.callContracts ?? []).forEach((schema) => schema && fallbackSchemas.add(schema));
    (entry.controllerContracts ?? []).forEach((schema) => schema && fallbackSchemas.add(schema));

    for (const issue of entry.issues) {
      const schemaCandidates = new Set<string>();
      issue.metadata?.schemas?.forEach((schema) => schema && schemaCandidates.add(schema));
      if (!schemaCandidates.size) {
        fallbackSchemas.forEach((schema) => schemaCandidates.add(schema));
      }
      if (!schemaCandidates.size) {
        continue;
      }
      for (const schema of schemaCandidates) {
        const bucket = ensureSchemaBucket(schemaIssues, schema);
        bucket.push(createSchemaIssueFromTrace(schema, issue, entry));
      }
    }
  }

  if (cadSummary) {
    for (const mismatch of cadSummary.contractMismatches) {
      const schema = mismatch.detail.sharedSchema;
      if (!schema) {
        continue;
      }
      const bucket = ensureSchemaBucket(schemaIssues, schema);
      bucket.push(createSchemaIssueFromCad(schema, mismatch));
    }
  }

  const schemaSummaries: SchemaArtifactSummaryEntry[] = [];
  const schemaOutputRoot = path.join(outputDir, 'schemas');
  await mkdir(schemaOutputRoot, { recursive: true });

  for (const [schema, issues] of schemaIssues) {
    const sanitized = sanitizeSchemaName(schema);
    const schemaDir = path.join(schemaOutputRoot, sanitized);
    await mkdir(schemaDir, { recursive: true });

    issues.sort((a, b) => {
      const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) {
        return severityDiff;
      }
      if (a.issueType !== b.issueType) {
        return a.issueType.localeCompare(b.issueType);
      }
      return a.call.normalizedUrl.localeCompare(b.call.normalizedUrl);
    });

    const blockingIssues = issues.filter((issue) => SEVERITY_RANK[issue.severity] >= SEVERITY_RANK.high).length;

    const payload: SchemaAuditReportPayload = {
      schema,
      generatedAt,
      totalIssues: issues.length,
      blockingIssues,
      issues,
    };

    const reportRelativePath = path.join('schemas', sanitized, 'audit-report.json').replace(/\\/g, '/');
    const reportPath = path.join(schemaDir, 'audit-report.json');
    await writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');

    schemaSummaries.push({
      schema,
      issueCount: issues.length,
      blockingIssueCount: blockingIssues,
      reportPath: reportRelativePath,
    });
  }

  schemaSummaries.sort((a, b) => {
    if (b.issueCount !== a.issueCount) {
      return b.issueCount - a.issueCount;
    }
    return a.schema.localeCompare(b.schema);
  });

  const summaryLines = ['# Schema Audit Summary', '', `Generated at: ${generatedAt}`, ''];

  if (!schemaSummaries.length) {
    summaryLines.push('No schema-specific issues were detected during this audit.');
  } else {
    summaryLines.push('| Schema | Issues | Blocking | Report |');
    summaryLines.push('| --- | ---: | ---: | --- |');
    for (const entry of schemaSummaries) {
      summaryLines.push(
        `| ${entry.schema} | ${entry.issueCount} | ${entry.blockingIssueCount} | [audit-report.json](${entry.reportPath}) |`,
      );
    }
  }

  summaryLines.push('');
  const summaryRelativePath = 'audit-summary.md';
  const summaryPath = path.join(outputDir, summaryRelativePath);
  await writeFile(summaryPath, `${summaryLines.join('\n')}\n`, 'utf-8');

  return {
    summaries: schemaSummaries,
    summaryRelativePath,
    summaryAbsolutePath: summaryPath,
  };
}

async function main(): Promise<void> {
  const calls = collectCustomerApiCalls();
  const routes = collectControllerRoutes();
  const cadRoutes = collectCadServiceRoutes();
  const cadPythonModels = collectCadPythonModels();
  const workerContractUsage = collectWorkerContractUsage();
  const sharedContractUsage = new Map<string, SharedContractUsage>();
  for (const [contract, files] of workerContractUsage) {
    const entry = ensureSharedContractUsageEntry(sharedContractUsage, contract);
    for (const file of files) {
      entry.worker.add(file);
    }
  }
  const traceEntries: ApiTraceReportEntry[] = [];

  const issueCounts = Object.fromEntries(ISSUE_TYPES.map((type) => [type, 0])) as Record<ApiIssueType, number>;
  const severityCounts = Object.fromEntries(SEVERITY_LEVELS.map((severity) => [severity, 0])) as Record<SeverityLevel, number>;
  const blockingIssueCounts = Object.fromEntries(ISSUE_TYPES.map((type) => [type, 0])) as Record<ApiIssueType, number>;
  const apiAbilityUsage = new Map<string, Set<string>>();
  const apiRbacDriftAggregates = new Map<
    string,
    { action: string; resource: string; controllers: Set<string>; reasons: Set<string>; suggestion?: string }
  >();
  const matchedControllerKeys = new Set<string>();
  const guardedControllerKeys = new Set<string>();
  const unguardedControllerKeys = new Set<string>();
  let unmatchedCalls = 0;
  let callsWithObservabilityGaps = 0;
  let callsWithResilienceGaps = 0;
  let callsWithCacheGaps = 0;
  let callsWithContractDrift = 0;
  let callsWithRbacMatrixGaps = 0;
  const blockingIssueTypes = new Set<ApiIssueType>();
  let highestSeverity: SeverityLevel | null = null;

  for (const call of calls) {
    const match = findControllerMatch(call, routes);
    const issues: ApiTraceIssue[] = [];
    const callContracts = new Set(call.sharedContracts.filter((name) => sharedDtoNames.has(name)));
    let callHasObservabilityGap = false;
    let callHasResilienceGap = false;
    let callHasCacheGap = false;
    let callHasContractDrift = false;
    let callHasRbacMatrixGapLocal = false;
    for (const contract of callContracts) {
      const usageEntry = ensureSharedContractUsageEntry(sharedContractUsage, contract);
      usageEntry.web.add(call.file);
    }
    const controllerContractNames = new Set<string>();
    const policyReports = match ? match.policies.map((policy) => ({ ...policy })) : [];

    if (!match) {
      issues.push(
        buildIssue(
          call,
          'missing_route',
          'high',
          `No NestJS controller route matches ${call.method} ${call.normalizedUrl}`,
          `Add @${call.method}('${call.normalizedUrl.replace(/^\/api/, '')}') handler or adjust client request path.`,
        ),
      );
    } else {
      if (match.httpMethod !== call.method) {
        issues.push(
          buildIssue(
            call,
            'verb_mismatch',
            'medium',
            `Client calls ${call.method} ${call.normalizedUrl} but controller uses ${match.httpMethod}`,
            `Align client verb or update controller decorator @${match.httpMethod}('${match.apiPath}')`,
            match,
          ),
        );
      } else if (match.statusCodes.length) {
        const expectedStatus = DEFAULT_STATUS_BY_METHOD[call.method] ?? 200;
        if (!match.statusCodes.includes(expectedStatus)) {
          issues.push(
            buildIssue(
              call,
              'status_mismatch',
              'medium',
              `Controller declares HttpCode ${match.statusCodes.join(', ')} but ${call.method} traditionally expects ${expectedStatus}`,
              `Adjust @HttpCode on ${match.className}.${match.methodName} (${match.apiPath}) or update client handling`,
              match,
            ),
          );
        }
      }

      if (!match.guarded) {
        issues.push(
          buildIssue(
            call,
            'permission_gap',
            'high',
            `Controller ${match.className}.${match.methodName} lacks guard/policy decorators for ${match.apiPath}`,
            `Add @UseGuards / @Policies decorators, inherit guard middleware, or document why ${match.apiPath} is intentionally public.`,
            match,
          ),
        );
      }

      if (call.method === 'GET' && call.hasBody) {
        issues.push(
          buildIssue(
            call,
            'method_body_mismatch',
            'medium',
            'GET request supplies a body payload which many runtimes ignore',
            'Move payload into query params or switch to POST.',
            match,
          ),
        );
      }

      match.bodyTypes.forEach((type, index) => {
        const dtoMatches = match.bodyDtoMatches[index] ?? [];
        if (/\bany\b/.test(type) || /unknown/.test(type)) {
          issues.push(
            buildIssue(
              call,
              'dto_inconsistent',
              'medium',
              `Controller parameter typed as ${type}`,
              'Introduce explicit DTO in packages/shared or tighten method signature.',
              match,
            ),
          );
        } else if (!shouldSkipDtoValidation(type) && dtoMatches.length === 0) {
          issues.push(
            buildIssue(
              call,
              'dto_inconsistent',
              'medium',
              `Request body parameter resolved to ${type} without shared/prisma DTO alignment`,
              'Refactor to import contracts from packages/shared or generate prisma-zod DTOs to match API surface.',
              match,
            ),
          );
        }
      });

      match.bodyDtoMatches.forEach((dtoList) => {
        dtoList.forEach((dto) => {
          controllerContractNames.add(dto);
        });
      });
      (match.responseDtoMatches ?? []).forEach((dto) => {
        controllerContractNames.add(dto);
      });
      for (const contract of controllerContractNames) {
        if (!sharedDtoNames.has(contract)) {
          continue;
        }
        const usageEntry = ensureSharedContractUsageEntry(sharedContractUsage, contract);
        usageEntry.api.add(match.file);
      }

      const controllerDescriptor = `${match.className}.${match.methodName} (${match.file})`;
      const requiresAbilityMetadata = match.guardIdentifiers.some((identifier) => RBAC_GUARD_IDENTIFIERS.has(identifier));
      if (requiresAbilityMetadata && policyReports.length === 0) {
        const evidence = `${controllerDescriptor} applies RBAC guards (${match.guardIdentifiers.join(', ')}) without @Policies/@RequirePermissions metadata.`;
        issues.push(
          buildIssue(
            call,
            'rbac_matrix_gap',
            'high',
            evidence,
            'Add @Policies or @RequirePermissions entries that reference shared PERMISSION_MATRIX abilities.',
            match,
          ),
        );
        callHasRbacMatrixGapLocal = true;
        const driftKey = `missing:${controllerDescriptor}`;
        const driftRecord = apiRbacDriftAggregates.get(driftKey) ?? {
          action: 'unknown',
          resource: 'unknown',
          controllers: new Set<string>(),
          reasons: new Set<string>(),
          suggestion: 'Attach @Policies/@RequirePermissions definitions aligned with PERMISSION_MATRIX.',
        };
        driftRecord.controllers.add(controllerDescriptor);
        driftRecord.reasons.add(evidence);
        apiRbacDriftAggregates.set(driftKey, driftRecord);
      }

      for (const policy of policyReports) {
        const canonicalAction = policy.action ? canonicalizeAction(policy.action) : null;
        const canonicalResource = policy.resource ? canonicalizeResourceName(policy.resource) : null;
        policy.action = canonicalAction;
        policy.resource = canonicalResource;

        if (!canonicalAction || !canonicalResource) {
          policy.resolved = false;
          const missingParts = !canonicalAction && !canonicalResource
            ? 'action and resource'
            : !canonicalAction
            ? 'action'
            : 'resource';
          const evidence = `${controllerDescriptor} policy ${policy.decorator} is missing ${missingParts} metadata.`;
          issues.push(
            buildIssue(
              call,
              'rbac_matrix_gap',
              'high',
              evidence,
              'Ensure each RBAC policy defines both action and resource values present in PERMISSION_MATRIX.',
              match,
            ),
          );
          callHasRbacMatrixGapLocal = true;
          const driftKey = `invalid:${controllerDescriptor}`;
          const driftRecord = apiRbacDriftAggregates.get(driftKey) ?? {
            action: 'unknown',
            resource: 'unknown',
            controllers: new Set<string>(),
            reasons: new Set<string>(),
            suggestion: 'Populate missing action/resource metadata on controller policies.',
          };
          driftRecord.controllers.add(controllerDescriptor);
          driftRecord.reasons.add(evidence);
          apiRbacDriftAggregates.set(driftKey, driftRecord);
          continue;
        }

        if (isWildcardAbility(canonicalAction, canonicalResource)) {
          policy.resolved = true;
          continue;
        }

        const abilityCandidate = buildAbilityKey(canonicalAction, canonicalResource);
        const coverage = isAbilityCoveredByMatrix(canonicalAction, canonicalResource);
        const usageAbilityKey = coverage.match && coverage.matchedAbility ? coverage.matchedAbility : abilityCandidate;
        ensureSet(apiAbilityUsage, usageAbilityKey).add(controllerDescriptor);

        if (coverage.match) {
          policy.resolved = true;
          continue;
        }

        policy.resolved = false;
        const evidence = `${controllerDescriptor} references RBAC ability ${abilityCandidate} missing from PERMISSION_MATRIX.`;
        issues.push(
          buildIssue(
            call,
            'rbac_matrix_gap',
            'high',
            evidence,
            'Add the ability to packages/shared/src/rbac.types.ts and synchronize policy seeders.',
            match,
          ),
        );
        callHasRbacMatrixGapLocal = true;
        const driftKey = `ability:${abilityCandidate}`;
        const driftRecord = apiRbacDriftAggregates.get(driftKey) ?? {
          action: canonicalAction,
          resource: canonicalResource,
          controllers: new Set<string>(),
          reasons: new Set<string>(),
          suggestion: 'Add ability to PERMISSION_MATRIX and update PolicySeeder to assign roles.',
        };
        driftRecord.action = canonicalAction;
        driftRecord.resource = canonicalResource;
        driftRecord.controllers.add(controllerDescriptor);
        driftRecord.reasons.add(evidence);
        apiRbacDriftAggregates.set(driftKey, driftRecord);
      }

      const controllerStatusSet = new Set(match.statusCodes);
      const expectedDefaultStatus = DEFAULT_STATUS_BY_METHOD[call.method] ?? 200;
      if (!controllerStatusSet.size) {
        controllerStatusSet.add(expectedDefaultStatus);
      }
      const missingStatuses = call.clientExpectedStatuses.filter((status) => !controllerStatusSet.has(status));
      if (missingStatuses.length) {
        issues.push(
          buildIssue(
            call,
            'status_mismatch',
            'medium',
            `Client handles HTTP ${missingStatuses.join(', ')} but ${match.className}.${match.methodName} lacks matching @HttpCode/@ApiResponse metadata`,
            `Annotate ${match.className}.${match.methodName} with @HttpCode/${missingStatuses.join(', ')} or add @ApiResponse entries so ${match.apiPath} advertises handled statuses.`,
            match,
          ),
        );
      }

      if (call.traceHeaderStatus === 'missing') {
        issues.push(
          buildIssue(
            call,
            'observability_gap',
            'medium',
            `${call.method} ${call.normalizedUrl} dispatches without trace propagation headers`,
            'Include x-trace-id or x-request-id via shared telemetry helpers before issuing the request.',
            match,
          ),
        );
      }
      if (call.traceHeaderStatus === 'unknown') {
        issues.push(
          buildIssue(
            call,
            'observability_gap',
            'low',
            `Unable to confirm trace header propagation for ${call.method} ${call.normalizedUrl}`,
            'Ensure request config merges trace headers from observability context.',
            match,
          ),
        );
      }
      if (call.spanInstrumentationStatus === 'missing') {
        issues.push(
          buildIssue(
            call,
            'observability_gap',
            'low',
            `${call.method} ${call.normalizedUrl} executes outside an OpenTelemetry span`,
            'Wrap the call in tracer.startActiveSpan or withSpan instrumentation to preserve trace continuity.',
            match,
          ),
        );
      }
      if (call.retryStatus === 'missing') {
        issues.push(
          buildIssue(
            call,
            'resilience_gap',
            'low',
            `${call.method} ${call.normalizedUrl} lacks retry/backoff handling`,
            'Wrap the transport in withRetry or introduce exponential backoff aligned with BullMQ policies.',
            match,
          ),
        );
      }

      if (match && requiresCostCacheEnforcement(match)) {
        const cacheMetadata = match.cacheMetadata;
        if (!cacheMetadata.usesPricingCache) {
          issues.push(
            buildIssue(
              call,
              'cache_gap',
              'critical',
              `${match.className}.${match.methodName} skips pricingCache.withCache so ${match.apiPath} bypasses Redis cost caching`,
              'Wrap the compute path in pricingCache.withCache so cost breakdowns persist with deterministic geometry hashing.',
              match,
            ),
          );
        } else {
          if (!cacheMetadata.buildsHashPayload) {
            issues.push(
              buildIssue(
                call,
                'cache_gap',
                'high',
                `${match.className}.${match.methodName} misses buildHashPayload usage so geometry diffs cannot bust Redis cache`,
                'Construct cache keys via buildHashPayload to include geometry checksum and pricing factor versions before invoking pricingCache.withCache.',
                match,
              ),
            );
          }
          if (!cacheMetadata.requestUsesHashPayload) {
            issues.push(
              buildIssue(
                call,
                'cache_gap',
                'high',
                `${match.className}.${match.methodName} forwards pricingCache.withCache request data without buildHashPayload so Redis keys may omit geometry hash inputs`,
                'Pass the geometry digest from buildHashPayload directly into pricingCache.withCache request to enforce deterministic geometry-keyed caching.',
                match,
              ),
            );
          }
          if (!cacheMetadata.controlConfiguresTtl) {
            issues.push(
              buildIssue(
                call,
                'cache_gap',
                'high',
                `${match.className}.${match.methodName} omits TTL or hotPath flags on pricingCache.withCache so Redis entries may not expire predictably`,
                'Set control.ttlSeconds or control.hotPath on pricingCache.withCache to enforce Redis expiry aligned with cost policy.',
                match,
              ),
            );
          }
          if (!cacheMetadata.controlSupportsBust) {
            issues.push(
              buildIssue(
                call,
                'cache_gap',
                'medium',
                `${match.className}.${match.methodName} lacks a bust flag in pricingCache.withCache control block so geometry diffs cannot invalidate cached breakdowns`,
                'Include control.bust toggled by cache-bust headers or geometry version deltas to trigger Redis invalidation.',
                match,
              ),
            );
          }
          if (!cacheMetadata.decoratesCacheHeaders) {
            issues.push(
              buildIssue(
                call,
                'cache_gap',
                'medium',
                `${match.className}.${match.methodName} does not surface cache headers (x-cache / ttl) back to the client`,
                'Publish cache metadata through decorateCacheHeaders so clients can honor TTL and cache status.',
                match,
              ),
            );
          }
        }
      }

      const workerAlignedContracts = Array.from(callContracts).filter((contract) => {
        const entry = sharedContractUsage.get(contract);
        return Boolean(entry && entry.worker.size);
      });
      const driftContracts = workerAlignedContracts.filter((contract) => !controllerContractNames.has(contract));

      if (driftContracts.length) {
        const workerFiles = new Set<string>();
        for (const contract of driftContracts) {
          const entry = sharedContractUsage.get(contract);
          if (entry) {
            for (const file of entry.worker) {
              workerFiles.add(file);
            }
          }
        }
        const workerFileList = Array.from(workerFiles).slice(0, 5).join(', ') || 'worker processors';
        const evidenceContracts = driftContracts.join(', ');
        issues.push(
          buildIssue(
            call,
            'contract_drift',
            'high',
            `Shared contracts ${evidenceContracts} are used by customer panels (${call.file}) and worker processors (${workerFileList}) but are missing from ${match.className}.${match.methodName} [${match.file}].`,
            `Align ${match.className}.${match.methodName} with shared contracts ${evidenceContracts} or update worker consumers to match the controller DTOs.`,
            match,
            { schemas: driftContracts },
          ),
        );
      }
    }

    traceEntries.push({
      call,
      matchedController: match
        ? {
            file: match.file,
            className: match.className,
            methodName: match.methodName,
            httpMethod: match.httpMethod,
            path: match.path,
            apiPath: match.apiPath,
            statusCodes: match.statusCodes,
            guarded: match.guarded,
            guardIdentifiers: match.guardIdentifiers,
            bodyTypes: match.bodyTypes,
            bodyDtoMatches: match.bodyDtoMatches,
            guardSources: match.guardSources,
            versions: match.versions,
            paramNames: match.paramNames,
            cacheMetadata: match.cacheMetadata,
            responseType: match.responseType,
            responseDtoMatches: match.responseDtoMatches,
            policyRequirements: policyReports,
          }
        : undefined,
      issues,
      callContracts: [...callContracts],
      controllerContracts: [...controllerContractNames],
    });

    if (match) {
      const controllerKey = `${match.file}#${match.className}.${match.methodName}`;
      matchedControllerKeys.add(controllerKey);
      if (match.guarded) {
        guardedControllerKeys.add(controllerKey);
        unguardedControllerKeys.delete(controllerKey);
      } else if (!guardedControllerKeys.has(controllerKey)) {
        unguardedControllerKeys.add(controllerKey);
      }
    } else {
      unmatchedCalls += 1;
    }

    for (const issue of issues) {
      issueCounts[issue.issueType] += 1;
      severityCounts[issue.severity] += 1;

      if (!highestSeverity) {
        highestSeverity = issue.severity;
      } else if (SEVERITY_RANK[issue.severity] > SEVERITY_RANK[highestSeverity]) {
        highestSeverity = issue.severity;
      }

      if (BLOCKING_SEVERITIES.includes(issue.severity)) {
        blockingIssueTypes.add(issue.issueType);
        blockingIssueCounts[issue.issueType] += 1;
      }

      if (issue.issueType === 'observability_gap') {
        callHasObservabilityGap = true;
      } else if (issue.issueType === 'resilience_gap') {
        callHasResilienceGap = true;
      } else if (issue.issueType === 'cache_gap') {
        callHasCacheGap = true;
      } else if (issue.issueType === 'contract_drift') {
        callHasContractDrift = true;
      } else if (issue.issueType === 'rbac_matrix_gap') {
        callHasRbacMatrixGapLocal = true;
      }
    }
    if (callHasObservabilityGap) {
      callsWithObservabilityGaps += 1;
    }
    if (callHasResilienceGap) {
      callsWithResilienceGaps += 1;
    }
    if (callHasCacheGap) {
      callsWithCacheGaps += 1;
    }
    if (callHasContractDrift) {
      callsWithContractDrift += 1;
    }
    if (callHasRbacMatrixGapLocal) {
      callsWithRbacMatrixGaps += 1;
    }
  }

  const cadSummary = generateCadTouchpointSummary(calls, cadRoutes, cadPythonModels);
  if (cadSummary) {
    if (cadSummary.missingEndpoints.length) {
      const missingCount = cadSummary.missingEndpoints.length;
      issueCounts.cad_endpoint_gap += missingCount;
      severityCounts.high += missingCount;
      blockingIssueCounts.cad_endpoint_gap += missingCount;
      blockingIssueTypes.add('cad_endpoint_gap');
      if (!highestSeverity || SEVERITY_RANK.high > SEVERITY_RANK[highestSeverity]) {
        highestSeverity = 'high';
      }
    }
    if (cadSummary.contractMismatches.length) {
      const mismatchCount = cadSummary.contractMismatches.length;
      issueCounts.cad_contract_mismatch += mismatchCount;
      severityCounts.high += mismatchCount;
      if (!highestSeverity || SEVERITY_RANK.high > SEVERITY_RANK[highestSeverity]) {
        highestSeverity = 'high';
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const blockingIssueTotal = Object.values(blockingIssueCounts).reduce((sum, value) => sum + value, 0);
  const totalIssueCount = Object.values(issueCounts).reduce((sum, value) => sum + value, 0);

  const apiAbilities: ApiRbacAbilityRecord[] = [];
  for (const [abilityKey, controllers] of apiAbilityUsage.entries()) {
    const [actionPart, ...resourceParts] = abilityKey.split(':');
    const action = actionPart && actionPart.trim().length ? actionPart : 'unknown';
    const resourceCandidate = resourceParts.length ? resourceParts.join(':') : '';
    const resource = resourceCandidate && resourceCandidate.trim().length ? resourceCandidate : 'unknown';
    apiAbilities.push({
      ability: abilityKey,
      action,
      resource,
      controllers: [...controllers].sort(),
    });
  }
  apiAbilities.sort((a, b) => a.ability.localeCompare(b.ability));

  const apiDrift: ApiRbacDriftRecord[] = [];
  for (const drift of apiRbacDriftAggregates.values()) {
    apiDrift.push({
      action: drift.action,
      resource: drift.resource,
      controllers: [...drift.controllers].sort(),
      reasons: [...drift.reasons].sort(),
      suggestion: drift.suggestion,
    });
  }
  apiDrift.sort((a, b) => buildAbilityKey(a.action, a.resource).localeCompare(buildAbilityKey(b.action, b.resource)));

  const webAbilities = [...webRoleInventory.abilityRecords].sort((a, b) => a.ability.localeCompare(b.ability));
  const webDrift = [...webRoleInventory.drift].sort((a, b) =>
    buildAbilityKey(a.action, a.resource).localeCompare(buildAbilityKey(b.action, b.resource)),
  );

  const matrixWithoutCoverage = [...sharedRbacMatrix.abilities]
    .filter((ability) => !apiAbilityUsage.has(ability) && !webRoleInventory.abilities.has(ability))
    .sort();

  const rbacSummary: RbacMatrixSummary = {
    sharedActions: [...sharedRbacMatrix.actions].sort(),
    sharedResources: [...sharedRbacMatrix.resources].sort(),
    sharedAbilities: [...sharedRbacMatrix.abilities].sort(),
    apiAbilities,
    apiDrift,
    webAbilities,
    webDrift,
    matrixWithoutCoverage,
  };

  const metrics: CiMetrics = {
    schemaVersion: METRICS_SCHEMA_VERSION,
    generatedAt,
    callCount: calls.length,
    matchedControllers: matchedControllerKeys.size,
    unmatchedCalls,
    severityCounts,
    issueCounts,
    blockingIssueCounts,
    highestSeverity,
    hasBlockingFindings: blockingIssueTotal > 0,
    blockingIssueTypes: [...blockingIssueTypes],
    blockingIssueTotal,
    callsWithContractDrift,
    callsWithRbacMatrixGaps,
  };

  const slackSummaryLines = [
    `*Highest severity:* ${highestSeverity ?? 'none'}`,
    `*Blocking issues:* ${blockingIssueTotal}`,
    `*Critical:* ${severityCounts.critical}  *High:* ${severityCounts.high}  *Medium:* ${severityCounts.medium}  *Low:* ${severityCounts.low}`,
    `*Contract drift calls:* ${callsWithContractDrift}`,
    `*RBAC matrix gap calls:* ${callsWithRbacMatrixGaps}`,
  ];

  if (cadSummary) {
    slackSummaryLines.push(`*CAD calls analyzed:* ${cadSummary.callsAnalyzed}`);
    slackSummaryLines.push(`*CAD missing endpoints:* ${cadSummary.missingEndpoints.length}`);
    slackSummaryLines.push(`*CAD contract mismatches:* ${cadSummary.contractMismatches.length}`);
  }

  if (metrics.blockingIssueTypes.length) {
    const runbookHints = metrics.blockingIssueTypes
      .map((issueType) => `- ${issueType.replace(/_/g, ' ')} -> ${resolveRunbookUrl(issueType, 'repo')}`)
      .join('\n');
    slackSummaryLines.push(`*Runbooks:*\n${runbookHints}`);
  }

  const slackPayload: SlackPayload = {
    text: metrics.hasBlockingFindings
      ? `Customer API trace audit detected ${blockingIssueTotal} blocking issues`
      : 'Customer API trace audit completed without blocking issues',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Customer API Trace Audit* (calls analyzed: ${calls.length})\n${slackSummaryLines.join('\n')}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Total issues: ${totalIssueCount} | Matched controllers: ${matchedControllerKeys.size} | Unmatched calls: ${unmatchedCalls}`,
          },
        ],
      },
    ],
  };

  await mkdir(outputDir, { recursive: true });
  const schemaArtifacts = await generateSchemaAuditArtifacts({
    traceEntries,
    cadSummary,
    outputDir,
    generatedAt,
  });

  const report: CustomerApiTraceReport = {
    generatedAt,
    summary: {
      callCount: calls.length,
      matchedControllers: matchedControllerKeys.size,
      unmatchedCalls,
      guardedControllers: guardedControllerKeys.size,
      unguardedControllers: unguardedControllerKeys.size,
      issueCounts,
      severityCounts,
      callsWithObservabilityGaps,
      callsWithResilienceGaps,
      callsWithCacheGaps,
      callsWithContractDrift,
      callsWithRbacMatrixGaps,
      blockingIssueTypes: [...blockingIssueTypes],
      highestSeverity,
    },
    calls: traceEntries,
    ci: {
      metrics,
      slackPayload,
    },
    rbac: rbacSummary,
    ...(cadSummary ? { cad: cadSummary } : {}),
    schemaAudit: {
      summaryRelativePath: schemaArtifacts.summaryRelativePath,
      entries: schemaArtifacts.summaries,
    },
  };

  const jsonPath = path.join(outputDir, 'customer-api-trace.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  const metricsPath = path.join(outputDir, 'customer-api-trace.metrics.json');
  await writeFile(metricsPath, `${JSON.stringify(report.ci, null, 2)}\n`, 'utf-8');
  const slackPath = path.join(outputDir, 'customer-api-trace.slack.json');
  await writeFile(slackPath, `${JSON.stringify(report.ci.slackPayload, null, 2)}\n`, 'utf-8');

  const severityCountSchemaProperties = Object.fromEntries(
    SEVERITY_LEVELS.map((level) => [level, { type: 'integer', minimum: 0 }]),
  );
  const issueCountSchemaProperties = Object.fromEntries(ISSUE_TYPES.map((type) => [type, { type: 'integer', minimum: 0 }]));

  const metricsSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://schemas.cnc-quote.local/customer-api-trace-ci.json',
    title: 'CustomerApiTraceCiEnvelope',
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'generatedAt', 'metrics', 'slackPayload'],
    properties: {
      schemaVersion: { type: 'string' },
      generatedAt: { type: 'string', format: 'date-time' },
      metrics: {
        type: 'object',
        additionalProperties: false,
        required: [
          'callCount',
          'matchedControllers',
          'unmatchedCalls',
          'severityCounts',
          'issueCounts',
          'blockingIssueCounts',
          'highestSeverity',
          'hasBlockingFindings',
          'blockingIssueTypes',
          'blockingIssueTotal',
          'callsWithContractDrift',
          'callsWithRbacMatrixGaps',
        ],
        properties: {
          callCount: { type: 'integer', minimum: 0 },
          matchedControllers: { type: 'integer', minimum: 0 },
          unmatchedCalls: { type: 'integer', minimum: 0 },
          severityCounts: {
            type: 'object',
            additionalProperties: false,
            required: SEVERITY_LEVELS,
            properties: severityCountSchemaProperties,
          },
          issueCounts: {
            type: 'object',
            additionalProperties: false,
            required: ISSUE_TYPES,
            properties: issueCountSchemaProperties,
          },
          blockingIssueCounts: {
            type: 'object',
            additionalProperties: false,
            required: ISSUE_TYPES,
            properties: issueCountSchemaProperties,
          },
          highestSeverity: {
            anyOf: [
              { type: 'string', enum: SEVERITY_LEVELS },
              { type: 'null' },
            ],
          },
          hasBlockingFindings: { type: 'boolean' },
          blockingIssueTypes: {
            type: 'array',
            uniqueItems: true,
            items: { type: 'string', enum: ISSUE_TYPES },
          },
          blockingIssueTotal: { type: 'integer', minimum: 0 },
          callsWithContractDrift: { type: 'integer', minimum: 0 },
          callsWithRbacMatrixGaps: { type: 'integer', minimum: 0 },
        },
      },
      slackPayload: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'blocks'],
        properties: {
          text: { type: 'string' },
          blocks: {
            type: 'array',
            items: { type: 'object' },
          },
        },
      },
    },
  } as const;

  const schemaPath = path.join(outputDir, 'customer-api-trace.metrics.schema.json');
  await writeFile(schemaPath, `${JSON.stringify(metricsSchema, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Customer API Trace Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Calls analyzed: ${report.summary.callCount}`,
    `- Matched controllers: ${report.summary.matchedControllers}`,
    `- Unmatched calls: ${report.summary.unmatchedCalls}`,
    `- Guarded controllers: ${report.summary.guardedControllers}`,
    `- Unguarded controllers: ${report.summary.unguardedControllers}`,
    `- Issues detected: ${ISSUE_TYPES.map((type) => `${type.replace(/_/g, ' ')} ${report.summary.issueCounts[type]}`).join(', ')}`,
    `- Severity spread: ${SEVERITY_LEVELS.map((level) => `${level} ${report.summary.severityCounts[level]}`).join(', ')}`,
    `- Calls with observability gaps: ${report.summary.callsWithObservabilityGaps}`,
  `- Calls with resilience gaps: ${report.summary.callsWithResilienceGaps}`,
  `- Calls with cache gaps: ${report.summary.callsWithCacheGaps}`,
    `- Calls with contract drift: ${report.summary.callsWithContractDrift}`,
    `- Calls with RBAC matrix gaps: ${report.summary.callsWithRbacMatrixGaps}`,
    `- Highest severity detected: ${report.summary.highestSeverity ?? 'none'}`,
    `- Blocking issue types: ${report.summary.blockingIssueTypes.length ? report.summary.blockingIssueTypes.join(', ') : 'none'}`,
    '',
    '## CI Artifacts',
    '',
    '- Metrics: `customer-api-trace.metrics.json`',
    '- Slack payload: `customer-api-trace.slack.json`',
    '- Metrics schema: `customer-api-trace.metrics.schema.json`',
    '- Schema audit summary: `audit-summary.md` (per-schema reports under `schemas/`)',
    '',
  ];

  if (schemaArtifacts.summaries.length) {
    markdown.push('## Schema Audit Overview');
    markdown.push('');
    markdown.push('| Schema | Issues | Blocking | Report |');
    markdown.push('| --- | ---: | ---: | --- |');
    for (const entry of schemaArtifacts.summaries) {
      markdown.push(`| ${entry.schema} | ${entry.issueCount} | ${entry.blockingIssueCount} | [audit-report.json](${entry.reportPath}) |`);
    }
    markdown.push('');
  } else {
    markdown.push('## Schema Audit Overview');
    markdown.push('');
    markdown.push('No schema-specific issues were detected during this audit.');
    markdown.push('');
  }

  if (cadSummary) {
    markdown.push('## CAD Service Touchpoints');
    markdown.push('');
    markdown.push(`- CAD calls analyzed: ${cadSummary.callsAnalyzed}`);
    markdown.push(`- CAD routes discovered: ${cadSummary.routesDiscovered.length}`);
    markdown.push(`- Missing CAD endpoints: ${cadSummary.missingEndpoints.length}`);
    markdown.push(`- CAD contract mismatches: ${cadSummary.contractMismatches.length}`);
    markdown.push('');

    if (cadSummary.missingEndpoints.length) {
      markdown.push('### Missing CAD Endpoints');
      markdown.push('');
      for (const item of cadSummary.missingEndpoints) {
        const callSites = item.callSites.length ? item.callSites.join(', ') : 'unknown call sites';
        markdown.push(`- ${item.method} ${item.path} (call sites: ${callSites})`);
      }
      markdown.push('');
    }

    if (cadSummary.contractMismatches.length) {
      markdown.push('### CAD Contract Mismatches');
      markdown.push('');
      for (const item of cadSummary.contractMismatches) {
        const missing = item.detail.missingFields.length ? item.detail.missingFields.join(', ') : 'none';
        const extra = item.detail.extraFields.length ? item.detail.extraFields.join(', ') : 'none';
        const pythonModel = item.detail.pythonModel ?? 'not declared';
        const callSites = item.callSites.length ? item.callSites.join(', ') : 'unknown call sites';
        markdown.push(
          `- ${item.method} ${item.path} -> shared ${item.detail.sharedSchema} vs python ${pythonModel} (missing: ${missing}; extra: ${extra}) [call sites: ${callSites}]`,
        );
      }
      markdown.push('');
    }
  }

  for (const entry of traceEntries) {
    const { call, matchedController, issues } = entry;
    markdown.push(`## ${call.method} ${call.normalizedUrl}`);
    markdown.push('');
    markdown.push(`- Source: ${call.file} (route ${call.route}, line ${call.line})`);
    markdown.push(`- Has Body: ${call.hasBody ? 'yes' : 'no'}`);
    markdown.push(`- Dynamic URL: ${call.isDynamic ? 'yes' : 'no'}`);
    markdown.push(`- Original URL: ${call.url}`);
    markdown.push(`- Normalized Path: ${call.normalizedUrl}`);
    markdown.push(`- Evidence: ${call.evidence}`);
    markdown.push(
      `- Client Expected Statuses: ${call.clientExpectedStatuses.length ? call.clientExpectedStatuses.join(', ') : 'none recorded'}`,
    );
    markdown.push(`- Trace Header: ${call.traceHeaderStatus}`);
    markdown.push(`- Span Instrumentation: ${call.spanInstrumentationStatus}`);
    markdown.push(`- Retry Handling: ${call.retryStatus}`);
    markdown.push(`- Shared Contracts: ${call.sharedContracts.length ? call.sharedContracts.join(', ') : 'none detected'}`);

    if (matchedController) {
      markdown.push(`- Controller: ${matchedController.className}.${matchedController.methodName} (${matchedController.httpMethod})`);
      markdown.push(`- File: ${matchedController.file}`);
      markdown.push(`- Route Path: ${matchedController.path}`);
      markdown.push(`- API Path: ${matchedController.apiPath}`);
      markdown.push(`- Guarded: ${matchedController.guarded ? 'yes' : 'no'}`);
      if (matchedController.statusCodes.length) {
        markdown.push(`- Declared Status Codes: ${matchedController.statusCodes.join(', ')}`);
      }
      if (matchedController.bodyTypes.length) {
        markdown.push(
          `- Body Types: ${matchedController.bodyTypes
            .map((type, index) => {
              const dtoMatches = matchedController.bodyDtoMatches?.[index] ?? [];
              return dtoMatches.length ? `${type} [${dtoMatches.join(', ')}]` : type;
            })
            .join('; ')}`,
        );
      }
      if (matchedController.guardSources.length) {
        markdown.push(`- Guard Sources: ${matchedController.guardSources.join('; ')}`);
      }
      if (matchedController.guardIdentifiers.length) {
        markdown.push(`- Guard Identifiers: ${matchedController.guardIdentifiers.join(', ')}`);
      }
      if (matchedController.versions.length) {
        markdown.push(`- Versions: ${matchedController.versions.join(', ')}`);
      }
      if (matchedController.paramNames.length) {
        markdown.push(`- Route Params: ${matchedController.paramNames.join(', ')}`);
      }
      if (matchedController.responseType) {
        markdown.push(`- Response Type: ${matchedController.responseType}`);
      }
      if (matchedController.responseDtoMatches.length) {
        markdown.push(`- Response DTOs: ${matchedController.responseDtoMatches.join(', ')}`);
      }
      const cacheMeta = matchedController.cacheMetadata;
      if (cacheMeta) {
        markdown.push(
          `- Cache Instrumentation: pricingCache=${cacheMeta.usesPricingCache ? 'yes' : 'no'}, buildHash=${cacheMeta.buildsHashPayload ? 'yes' : 'no'}, requestHash=${cacheMeta.requestUsesHashPayload ? 'yes' : 'no'}, ttl=${cacheMeta.controlConfiguresTtl ? 'yes' : 'no'}, hotPath=${cacheMeta.controlMarksHotPath ? 'yes' : 'no'}, bustFlag=${cacheMeta.controlSupportsBust ? 'yes' : 'no'}, cacheHeaders=${cacheMeta.decoratesCacheHeaders ? 'yes' : 'no'}`,
        );
      }
      if (matchedController.policyRequirements.length) {
        markdown.push('- Policy Requirements:');
        for (const policy of matchedController.policyRequirements) {
          const abilityDescriptor = policy.action && policy.resource ? `${policy.action}:${policy.resource}` : 'unknown';
          markdown.push(
            `  - ${policy.decorator} ${abilityDescriptor} (${policy.resolved ? 'aligned' : 'drift'}) via ${policy.source}`,
          );
        }
      } else {
        markdown.push('- Policy Requirements: none detected');
      }
    } else {
      markdown.push('- Controller: not found');
    }

    if (issues.length) {
      markdown.push('- Issues:');
      for (const issue of issues) {
        markdown.push(`  - ${issue.issueType}: ${issue.evidence}`);
        markdown.push(`    - Suggestion: ${issue.suggestion}`);
        const controllerLabel = issue.controllerMethod
          ? issue.controllerFile
            ? `${issue.controllerMethod} [${issue.controllerFile}]`
            : issue.controllerMethod
          : 'not matched';
        markdown.push(`    - Controller: ${controllerLabel}`);
        if (issue.runbookUrl) {
          markdown.push(`    - Runbook: [view](${issue.runbookUrl})`);
        }
      }
    }

    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'customer-api-trace.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  const schemaSummaryPath = schemaArtifacts.summaryAbsolutePath;
  const schemaReportsDir = path.join(outputDir, 'schemas');

  // eslint-disable-next-line no-console
  console.log(
    `Customer API trace audit written to ${jsonPath}, ${markdownPath}, ${metricsPath}, ${slackPath}, ${schemaPath}, ${schemaSummaryPath}, and per-schema reports at ${schemaReportsDir}`,
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
