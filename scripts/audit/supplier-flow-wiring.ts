/**
 * @module SupplierFlowWiringAudit
 * @ownership PlatformGovernance
 * @description Validates supplier-facing UI interactions resolve to concrete handlers, preserving deterministic action wiring.
 */
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

interface SupplierFlowAuditReport {
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

const SUPPLIER_FILE_PATTERNS = [
  'apps/web/app/(supplier)/**/page.tsx',
  'apps/web/app/(supplier)/**/layout.tsx',
  'apps/web/app/(supplier)/**/loading.tsx',
  'apps/web/app/(supplier)/**/error.tsx',
  'apps/web/app/(supplier)/**/template.tsx',
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

function normalizeSupplierRoute(relativeFile: string): string {
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
  return `/supplier${segments.length > 0 ? `/${segments.join('/')}` : ''}`;
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

function buildSuggestion(handler: string): string {
  const filePath = `apps/web/actions/supplier/${handler}.ts`;
  return `Create server action stub at ${filePath} with:\n'use server';\nexport async function ${handler}(formData: FormData) {\n  // TODO: implement ${handler}\n}`;
}

function collectIssues(relativeFile: string): RouteFlowReport | null {
  const sourceFile = project.getSourceFile(toPosix(path.join(repoRoot, relativeFile)));
  if (!sourceFile) {
    return null;
  }
  const route = normalizeSupplierRoute(relativeFile);
  const issues: FlowIssue[] = [];
  const jsxa = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attribute of jsxa) {
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
        route,
        file: relativeFile,
        element,
        attribute: name,
        handler,
        issueType: 'missing_handler',
        severity: 'high',
        evidence: `${element} ${name} references ${handler} but no definition/import was found`,
        position: { line, column },
        suggestion: buildSuggestion(handler),
      });
    }
  }
  return { route, file: relativeFile, issues };
}

async function main(): Promise<void> {
  const supplierFiles = await globby(SUPPLIER_FILE_PATTERNS, { cwd: repoRoot });
  const reports: RouteFlowReport[] = [];
  for (const file of supplierFiles) {
    const report = collectIssues(file);
    if (report) {
      reports.push({
        ...report,
        issues: report.issues.sort((a, b) => a.position.line - b.position.line),
      });
    }
  }
  reports.sort((a, b) => a.route.localeCompare(b.route));

  const audit: SupplierFlowAuditReport = {
    generatedAt: new Date().toISOString(),
    routes: reports,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'supplier-flow-wiring.json');
  await writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Supplier Flow Wiring Audit',
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
  ];

  for (const report of reports) {
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

  const markdownPath = path.join(outputDir, 'supplier-flow-wiring.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Supplier flow wiring audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
