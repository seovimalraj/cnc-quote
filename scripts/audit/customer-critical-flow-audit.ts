import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import globby from 'globby';
import {
  CallExpression,
  JsxAttribute,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
} from 'ts-morph';

interface FlowIssue {
  stage: string;
  route: string;
  file: string;
  issueType: 'missing_handler' | 'dead_link' | 'todo' | 'debug_statement';
  severity: 'critical' | 'high' | 'medium' | 'low';
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
  `${toPosix(repoRoot)}/apps/web/components/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/web/lib/**/*.{ts,tsx}`,
]);

const FLOW_SEGMENTS: Array<{ stage: string; label: string; patterns: string[] }> = [
  {
    stage: 'rfq_intake',
    label: 'RFQ Intake',
    patterns: ['apps/web/app/get-quote/**/*.{ts,tsx}'],
  },
  {
    stage: 'cad_upload',
    label: 'CAD Upload',
    patterns: ['apps/web/app/instant-quote/**/*.{ts,tsx}'],
  },
  {
    stage: 'dfm_review',
    label: 'DFM Review',
    patterns: ['apps/web/app/dfm-analysis/**/*.{ts,tsx}'],
  },
  {
    stage: 'pricing_review',
    label: 'Pricing & Quote Review',
    patterns: ['apps/web/app/quotes/**/*.{ts,tsx}', 'apps/web/app/portal/quotes/**/*.{ts,tsx}'],
  },
  {
    stage: 'checkout',
    label: 'Secure Checkout',
    patterns: ['apps/web/app/secure-checkout/**/*.{ts,tsx}', 'apps/web/app/checkout/**/*.{ts,tsx}'],
  },
];

const INTERACTION_ATTRIBUTES = new Set([
  'action',
  'formAction',
  'onClick',
  'onSubmit',
  'onChange',
  'onAccept',
  'onDecline',
  'onApprove',
  'onReject',
  'onUpload',
  'onSave',
  'onSend',
  'onCancel',
  'onUpdate',
]);

const IGNORED_IDENTIFIERS = new Set([
  'undefined',
  'null',
  'true',
  'false',
  'console',
  'window',
  'document',
  'event',
  'e',
  'prev',
  'value',
  'state',
  'props',
]);

const ROUTE_METHODS = new Set(['push', 'replace', 'prefetch']);
const ROUTE_ACTION_SUGGESTION_PREFIX = `Create guarded stub under apps/web/actions/customer/NAME.ts with:\n'use server';\nexport async function NAME(payload: unknown) {\n  // TODO: implement customer flow handler\n}`;

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

function buildRouteIndex(): Set<string> {
  const routes = new Set<string>();
  const files = globby.sync(['apps/web/app/**/page.tsx', 'apps/web/app/**/route.ts'], { cwd: repoRoot });
  for (const file of files) {
    const route = normalizeRoute(file);
    routes.add(route.replace(/\/$/, '') || '/');
  }
  return routes;
}

function collectIdentifiers(attribute: JsxAttribute): Node[] {
  const initializer = attribute.getInitializer();
  if (!initializer || !Node.isJsxExpression(initializer)) {
    return [];
  }
  const expr = initializer.getExpression();
  if (!expr) {
    return [];
  }
  if (Node.isIdentifier(expr)) {
    return [expr];
  }
  return expr.getDescendantsOfKind(SyntaxKind.Identifier);
}

function isRelevantIdentifier(node: Node): boolean {
  if (!Node.isIdentifier(node)) {
    return false;
  }
  const name = node.getText();
  if (IGNORED_IDENTIFIERS.has(name)) {
    return false;
  }
  const parent = node.getParent();
  if (parent && Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) {
    return false;
  }
  return true;
}

function elementName(attribute: JsxAttribute): string {
  const opening = attribute.getFirstAncestorByKind(SyntaxKind.JsxOpeningElement);
  if (opening) {
    return opening.getTagNameNode()?.getText() ?? 'Unknown';
  }
  const selfClosing = attribute.getFirstAncestorByKind(SyntaxKind.JsxSelfClosingElement);
  if (selfClosing) {
    return selfClosing.getTagNameNode()?.getText() ?? 'Unknown';
  }
  return 'Unknown';
}

function buildMissingHandlerIssues(
  sourceFile: SourceFile,
  route: string,
  relativeFile: string,
  stage: string,
): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const attributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attribute of attributes) {
    const name = attribute.getName();
    if (!INTERACTION_ATTRIBUTES.has(name) && !name.startsWith('on')) {
      continue;
    }
    const identifiers = collectIdentifiers(attribute).filter(isRelevantIdentifier);
    const seen = new Set<number>();
    for (const identifier of identifiers) {
      const start = identifier.getStart();
      if (seen.has(start)) {
        continue;
      }
      seen.add(start);
      const symbol = identifier.getSymbol();
      if (symbol) {
        continue;
      }
      const handler = identifier.getText();
      const { line, column } = sourceFile.getLineAndColumnAtPos(identifier.getStart());
      const element = elementName(attribute);
      issues.push({
        stage,
        route,
        file: relativeFile,
        issueType: 'missing_handler',
        severity: 'high',
        evidence: `${element} ${name} references ${handler} but no definition/import was found`,
        suggestion: ROUTE_ACTION_SUGGESTION_PREFIX.replace(/NAME/g, handler),
        position: { line, column },
      });
    }
  }
  return issues;
}

function extractLiteral(node: Node | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }
  if (Node.isTemplateExpression(node)) {
    const spans = node.getTemplateSpans();
    if (spans.length === 0) {
      return node.getHead().getLiteralText();
    }
    return undefined;
  }
  return undefined;
}

function normalizeTargetPath(candidate: string): string {
  const trimmed = candidate.split('?')[0].split('#')[0];
  return trimmed.replace(/\/$/, '') || '/';
}

function buildDeadLinkIssues(
  sourceFile: SourceFile,
  route: string,
  relativeFile: string,
  stage: string,
  routeIndex: Set<string>,
): FlowIssue[] {
  const issues: FlowIssue[] = [];

  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of callExpressions) {
    const expression = call.getExpression();
    if (Node.isPropertyAccessExpression(expression)) {
      const methodName = expression.getName();
      if (!ROUTE_METHODS.has(methodName)) {
        continue;
      }
      const callee = expression.getExpression().getText();
      if (!/router/i.test(callee)) {
        continue;
      }
      const arg = call.getArguments()[0];
      const literal = extractLiteral(arg);
      if (!literal || !literal.startsWith('/') || literal.startsWith('/api')) {
        continue;
      }
      const normalized = normalizeTargetPath(literal);
      if (!routeIndex.has(normalized)) {
        const { line, column } = sourceFile.getLineAndColumnAtPos(call.getStart());
        issues.push({
          stage,
          route,
          file: relativeFile,
          issueType: 'dead_link',
          severity: 'critical',
          evidence: `router.${methodName} targets ${literal} but no page.tsx route exists`,
          suggestion: `Add apps/web/app${normalized === '/' ? '/page.tsx' : `${normalized}/page.tsx`} or adjust navigation path`,
          position: { line, column },
        });
      }
    }
  }

  const linkAttributes = sourceFile
    .getDescendantsOfKind(SyntaxKind.JsxAttribute)
    .filter((attr) => attr.getName() === 'href');

  for (const attr of linkAttributes) {
    const initializer = attr.getInitializer();
    if (!initializer || !Node.isJsxExpression(initializer)) {
      continue;
    }
    const literal = extractLiteral(initializer.getExpression());
    if (!literal || !literal.startsWith('/') || literal.startsWith('/api')) {
      continue;
    }
    const normalized = normalizeTargetPath(literal);
    if (!routeIndex.has(normalized)) {
      const { line, column } = sourceFile.getLineAndColumnAtPos(attr.getStart());
      issues.push({
        stage,
        route,
        file: relativeFile,
        issueType: 'dead_link',
        severity: 'high',
        evidence: `<Link href="${literal}"> points to missing route`,
        suggestion: `Provision apps/web/app${normalized === '/' ? '/page.tsx' : `${normalized}/page.tsx`} or gate the link`,
        position: { line, column },
      });
    }
  }

  return issues;
}

function buildTodoIssues(
  sourceFile: SourceFile,
  route: string,
  relativeFile: string,
  stage: string,
): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const text = sourceFile.getFullText();
  const regex = /(TODO|FIXME|PLACEHOLDER|placeholder)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const position = sourceFile.getLineAndColumnAtPos(match.index);
    issues.push({
      stage,
      route,
      file: relativeFile,
      issueType: 'todo',
      severity: 'medium',
      evidence: `Found ${match[0]} marker in file`,
      suggestion: 'Replace placeholder with implemented customer flow logic guarded by feature flag or server action.',
      position,
    });
  }
  return issues;
}

function buildDebugIssues(
  sourceFile: SourceFile,
  route: string,
  relativeFile: string,
  stage: string,
): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of callExpressions) {
    const expression = call.getExpression();
    if (Node.isPropertyAccessExpression(expression)) {
      const left = expression.getExpression().getText();
      const name = expression.getName();
      if (left === 'console' && ['log', 'error', 'warn', 'debug'].includes(name)) {
        const { line, column } = sourceFile.getLineAndColumnAtPos(call.getStart());
        issues.push({
          stage,
          route,
          file: relativeFile,
          issueType: 'debug_statement',
          severity: 'low',
          evidence: `Detected console.${name} call`,
          suggestion: 'Replace console usage with structured analytics/telemetry and guard behind debug feature flag.',
          position: { line, column },
        });
      }
    }
  }
  return issues;
}

async function main(): Promise<void> {
  const routeIndex = buildRouteIndex();
  const stages: StageReport[] = [];
  const warnings: string[] = [];

  for (const segment of FLOW_SEGMENTS) {
    const files = globby.sync(segment.patterns, { cwd: repoRoot });
    const issues: FlowIssue[] = [];
    for (const file of files) {
      const sourceFile = project.getSourceFile(toPosix(path.join(repoRoot, file)));
      if (!sourceFile) {
        continue;
      }
      const route = normalizeRoute(file);
      issues.push(
        ...buildMissingHandlerIssues(sourceFile, route, file, segment.stage),
        ...buildDeadLinkIssues(sourceFile, route, file, segment.stage, routeIndex),
        ...buildTodoIssues(sourceFile, route, file, segment.stage),
        ...buildDebugIssues(sourceFile, route, file, segment.stage),
      );
    }
    if (files.length === 0) {
      warnings.push(`No files matched patterns for stage ${segment.label}.`);
    }
    const sortedIssues = issues.sort((a, b) => {
      if (!a.position || !b.position || a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      return a.position.line - b.position.line;
    });
    stages.push({
      stage: segment.stage,
      label: segment.label,
      files,
      issues: sortedIssues,
    });
  }

  const report: CustomerCriticalFlowReport = {
    generatedAt: new Date().toISOString(),
    stages,
    warnings: warnings.length ? warnings : undefined,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'customer-critical-flow.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Customer Critical Flow Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
  ];

  if (warnings.length) {
    markdown.push('## Warnings', '');
    for (const warning of warnings) {
      markdown.push(`- ${warning}`);
    }
    markdown.push('');
  }

  for (const stage of stages) {
    markdown.push(`## ${stage.label}`);
    markdown.push('');
    if (stage.files.length === 0) {
      markdown.push('_No files inspected for this stage._', '');
      continue;
    }
    markdown.push(`Files inspected (${stage.files.length}):`);
    for (const file of stage.files) {
      markdown.push(`- ${file}`);
    }
    markdown.push('');
    if (stage.issues.length === 0) {
      markdown.push('_No issues detected._', '');
      continue;
    }
    for (const issue of stage.issues) {
      const location = issue.position ? ` (line ${issue.position.line})` : '';
      markdown.push(`- **${issue.issueType}**${location} — ${issue.evidence}`);
      markdown.push(`  - Suggestion: ${issue.suggestion}`);
    }
    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'customer-critical-flow.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Customer critical flow audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
