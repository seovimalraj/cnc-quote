import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import globby from 'globby';
import {
  JsxAttribute,
  Node,
  Project,
  SyntaxKind,
} from 'ts-morph';

interface FlowIssue {
  route: string;
  file: string;
  element: string;
  attribute: string;
  handler: string;
  issueType: 'missing_handler' | 'missing_import';
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  position: { line: number; column: number };
  suggestion: string;
}

interface RouteFlowReport {
  route: string;
  file: string;
  issues: FlowIssue[];
}

interface AdminFlowAuditReport {
  generatedAt: string;
  routes: RouteFlowReport[];
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

const ADMIN_FILE_PATTERNS = [
  'apps/web/app/(admin)/**/page.tsx',
  'apps/web/app/(admin)/**/layout.tsx',
  'apps/web/app/(admin)/**/loading.tsx',
  'apps/web/app/(admin)/**/error.tsx',
  'apps/web/app/(admin)/**/template.tsx',
  'apps/web/app/(admin)/**/route.ts',
];

const INTERACTION_ATTRIBUTES = new Set([
  'action',
  'formAction',
  'onClick',
  'onSubmit',
  'onChange',
  'onApprove',
  'onReject',
  'onConfirm',
  'onDecline',
  'onAccept',
  'onDelete',
  'onSave',
  'onToggle',
  'onCancel',
  'onResolve',
  'onAssign',
  'onRoute',
]);

const IGNORED_IDENTIFIER_NAMES = new Set([
  'undefined',
  'null',
  'true',
  'false',
  'console',
  'window',
  'document',
  'router',
  'event',
  'e',
  'prev',
  'value',
  'state',
  'props',
]);

function normalizeRoute(relativeFile: string): string {
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
  return `/admin${segments.length > 0 ? `/${segments.join('/')}` : ''}`;
}

function getElementName(attribute: JsxAttribute): string {
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

function collectIdentifiersForAttribute(attribute: JsxAttribute): Node[] {
  const initializer = attribute.getInitializer();
  if (!initializer) {
    return [];
  }
  if (Node.isJsxExpression(initializer)) {
    const expression = initializer.getExpression();
    if (!expression) {
      return [];
    }
    if (Node.isIdentifier(expression)) {
      return [expression];
    }
    return expression.getDescendantsOfKind(SyntaxKind.Identifier);
  }
  return [];
}

function isRelevantIdentifier(node: Node): boolean {
  if (!Node.isIdentifier(node)) {
    return false;
  }
  const name = node.getText();
  if (IGNORED_IDENTIFIER_NAMES.has(name)) {
    return false;
  }
  const parent = node.getParent();
  if (
    parent &&
    Node.isPropertyAccessExpression(parent) &&
    parent.getNameNode() === node
  ) {
    return false;
  }
  return true;
}

function buildSuggestion(handler: string): string {
  const filePath = `apps/web/actions/admin/${handler}.ts`;
  return `Create server action stub at ${filePath} with:\n'use server';\nexport async function ${handler}(formData: FormData) {\n  // TODO: implement ${handler}\n}`;
}

function collectIssuesForFile(relativeFile: string): RouteFlowReport | null {
  const absolutePath = path.join(repoRoot, relativeFile);
  const sourceFile = project.getSourceFile(toPosix(absolutePath));
  if (!sourceFile) {
    return null;
  }
  const route = normalizeRoute(relativeFile);
  const issues: FlowIssue[] = [];

  const attributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attribute of attributes) {
    const attrName = attribute.getName();
    if (!INTERACTION_ATTRIBUTES.has(attrName) && !attrName.startsWith('on')) {
      continue;
    }
    const identifiers = collectIdentifiersForAttribute(attribute)
      .filter(isRelevantIdentifier);

    const seenPositions = new Set<number>();

    for (const identifier of identifiers) {
      const start = identifier.getStart();
      if (seenPositions.has(start)) {
        continue;
      }
      seenPositions.add(start);
      const symbol = identifier.getSymbol();
      if (symbol) {
        continue;
      }
      const handler = identifier.getText();
      const { line, column } = identifier.getSourceFile().getLineAndColumnAtPos(identifier.getStart());
      const elementName = getElementName(attribute);
      issues.push({
        route,
        file: relativeFile,
        element: elementName,
        attribute: attrName,
        handler,
        issueType: 'missing_handler',
        severity: 'high',
        evidence: `${elementName} ${attrName} references ${handler} but no definition/import was found`,
        position: { line, column },
        suggestion: buildSuggestion(handler),
      });
    }
  }

  return { route, file: relativeFile, issues };
}

async function main(): Promise<void> {
  const adminFiles = await globby(ADMIN_FILE_PATTERNS, { cwd: repoRoot });
  const reports: RouteFlowReport[] = [];
  for (const file of adminFiles) {
    const report = collectIssuesForFile(file);
    if (report) {
      reports.push(report);
    }
  }
  reports.sort((a, b) => a.route.localeCompare(b.route));

  const enrichedReports = reports.map((report) => ({
    ...report,
    issues: report.issues.sort((a, b) => a.position.line - b.position.line),
  }));

  const audit: AdminFlowAuditReport = {
    generatedAt: new Date().toISOString(),
    routes: enrichedReports,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'admin-flow-wiring.json');
  await writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Admin Flow Wiring Audit',
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
  ];

  for (const report of enrichedReports) {
    if (report.issues.length === 0) {
      continue;
    }
    markdown.push(`## ${report.route}`);
    markdown.push('');
    markdown.push(`File: ${report.file}`);
    markdown.push('');
    for (const issue of report.issues) {
  markdown.push(`- Line ${issue.position.line}, ${issue.element}`);
  markdown.push(`  - Attribute: \`${issue.attribute}\``);
  markdown.push(`  - Handler: \`${issue.handler}\``);
      markdown.push(`  - Issue: ${issue.evidence}`);
      markdown.push(`  - Suggestion: ${issue.suggestion}`);
    }
    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'admin-flow-wiring.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Admin flow wiring audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
