/**
 * @module SupplierQueueAudit
 * @ownership PlatformGovernance
 * @description Ensures supplier domain queues have both producers (API) and consumers (workers) registered with consistent BullMQ names.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  Node,
  Project,
  SourceFile,
  SyntaxKind,
} from 'ts-morph';

interface QueueUsageRecord {
  queueName?: string;
  alias?: string;
  key: string;
  kind: 'producer' | 'consumer' | 'scheduler';
  file: string;
  line: number;
  column: number;
  evidence: string;
  supplierReasons: string[];
}

interface QueueAuditIssue {
  type: 'missing_producer' | 'missing_consumer' | 'unresolved_queue_name';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

interface QueueAuditEntry {
  queueKey: string;
  queueNames: string[];
  aliases: string[];
  records: QueueUsageRecord[];
  issues: QueueAuditIssue[];
}

interface SupplierQueueAuditReport {
  generatedAt: string;
  queues: QueueAuditEntry[];
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

const SOURCE_TEXT_CACHE = new Map<string, string>();

project.addSourceFilesAtPaths([
  `${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/worker/src/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/packages/shared/src/**/*.{ts,tsx}`,
]);

const SUPPLIER_KEYWORDS = [
  'supplier',
  'suppliers',
  'rfq',
  'dfm',
  'routing',
  'order-routing',
  'orders-routing',
  'quote-routing',
  'marketplace',
  'compliance',
  'fulfillment',
];

function resolveQueueToken(node: Node): { key: string; queueName?: string; alias?: string } {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    const queueName = node.getLiteralText();
    return { key: queueName, queueName };
  }
  if (Node.isTemplateExpression(node)) {
    if (node.getTemplateSpans().length === 0) {
      const queueName = node.getHead().getLiteralText();
      return { key: queueName, queueName };
    }
    const literalPart = node.getHead().getLiteralText();
    return { key: literalPart || node.getText(), alias: node.getText() };
  }
  if (Node.isIdentifier(node)) {
    const alias = node.getText();
    const type = node.getType();
    try {
      if (type && typeof (type as any).isStringLiteral === 'function' && type.isStringLiteral()) {
        const literalValue = (type as any).getLiteralValue?.();
        if (typeof literalValue === 'string' && literalValue.length > 0) {
          return { key: literalValue, queueName: literalValue, alias };
        }
      }
      if (type && typeof (type as any).getLiteralValue === 'function') {
        const literalValue = (type as any).getLiteralValue();
        if (typeof literalValue === 'string' && literalValue.length > 0) {
          return { key: literalValue, queueName: literalValue, alias };
        }
      }
    } catch (error) {
      // best-effort resolution; fall through to alias usage
    }
    return { key: alias, alias };
  }
  return { key: node.getText(), alias: node.getText() };
}

function determineSupplierReasons(
  filePath: string,
  queueName: string | undefined,
  alias: string | undefined,
  sourceFile: SourceFile,
): string[] {
  const reasons = new Set<string>();
  const lowerFile = filePath.toLowerCase();
  const tokenCandidates = [queueName ?? '', alias ?? ''];
  for (const token of tokenCandidates) {
    const lower = token.toLowerCase();
    for (const keyword of SUPPLIER_KEYWORDS) {
      if (lower && lower.includes(keyword)) {
        reasons.add(`queue token contains "${keyword}"`);
      }
    }
  }
  for (const keyword of SUPPLIER_KEYWORDS) {
    if (lowerFile.includes(keyword)) {
      reasons.add(`file path includes "${keyword}"`);
    }
  }
  const cacheKey = sourceFile.getFilePath();
  let lowerText = SOURCE_TEXT_CACHE.get(cacheKey);
  if (!lowerText) {
    lowerText = sourceFile.getText().toLowerCase();
    SOURCE_TEXT_CACHE.set(cacheKey, lowerText);
  }
  if (lowerText.includes('supplier')) {
    reasons.add('file body references "supplier"');
  }
  return Array.from(reasons);
}

function recordUsage(
  usages: QueueUsageRecord[],
  callSite: Node,
  valueNode: Node,
  kind: QueueUsageRecord['kind'],
  reasonHint?: string,
): void {
  const sourceFile = valueNode.getSourceFile();
  const { key, queueName, alias } = resolveQueueToken(valueNode);
  const filePath = sourceFile.getFilePath().replace(`${toPosix(repoRoot)}/`, '');
  const supplierReasons = determineSupplierReasons(filePath, queueName, alias, sourceFile);
  if (reasonHint && !supplierReasons.includes(reasonHint)) {
    supplierReasons.push(reasonHint);
  }
  if (supplierReasons.length === 0) {
    return;
  }
  const { line, column } = sourceFile.getLineAndColumnAtPos(valueNode.getStart());
  usages.push({
    key,
    queueName,
    alias,
    kind,
    file: filePath,
    line,
    column,
    evidence: callSite.getText().slice(0, 160),
    supplierReasons,
  });
}

function collectApiQueueUsages(): QueueUsageRecord[] {
  const usages: QueueUsageRecord[] = [];
  const apiFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`);
  for (const sourceFile of apiFiles) {
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of callExpressions) {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression) && expression.getText() === 'InjectQueue') {
        const args = call.getArguments();
        if (args[0]) {
          recordUsage(usages, call, args[0], 'producer', 'queue injected in API module');
        }
        continue;
      }
      if (Node.isPropertyAccessExpression(expression)) {
        const property = expression.getName();
        if (property === 'registerQueue' || property === 'registerQueueAsync') {
          const args = call.getArguments();
          for (const arg of args) {
            if (!Node.isObjectLiteralExpression(arg)) {
              continue;
            }
            const nameProp = arg.getProperty('name');
            if (nameProp && Node.isPropertyAssignment(nameProp)) {
              const initializer = nameProp.getInitializer();
              if (initializer) {
                recordUsage(usages, call, initializer, 'producer', 'BullModule.registerQueue name');
              }
            }
          }
          continue;
        }
      }
      if (Node.isIdentifier(expression) && expression.getText() === 'Queue') {
        const args = call.getArguments();
        if (args[0]) {
          recordUsage(usages, call, args[0], 'producer', 'direct Queue instantiation');
        }
        continue;
      }
    }
    const newExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);
    for (const newExpr of newExpressions) {
      const expression = newExpr.getExpression();
      if (!Node.isIdentifier(expression)) {
        continue;
      }
      const exprName = expression.getText();
      if (exprName === 'Queue' || exprName === 'QueueScheduler') {
        const kind = exprName === 'Queue' ? 'producer' : 'scheduler';
        const args = newExpr.getArguments();
        if (args[0]) {
          recordUsage(usages, newExpr, args[0], kind, `API new ${exprName}`);
        }
      }
    }
  }
  return usages;
}

function collectWorkerQueueUsages(): QueueUsageRecord[] {
  const usages: QueueUsageRecord[] = [];
  const workerFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/worker/src/**/*.{ts,tsx}`);
  for (const sourceFile of workerFiles) {
    const newExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);
    for (const newExpr of newExpressions) {
      const expression = newExpr.getExpression();
      if (!Node.isIdentifier(expression)) {
        continue;
      }
      const exprName = expression.getText();
      if (exprName === 'Worker') {
        const args = newExpr.getArguments();
        if (args[0]) {
          recordUsage(usages, newExpr, args[0], 'consumer', 'BullMQ Worker registration');
        }
      } else if (exprName === 'Queue') {
        const args = newExpr.getArguments();
        if (args[0]) {
          recordUsage(usages, newExpr, args[0], 'producer', 'Worker queue instantiation');
        }
      } else if (exprName === 'QueueScheduler') {
        const args = newExpr.getArguments();
        if (args[0]) {
          recordUsage(usages, newExpr, args[0], 'scheduler', 'Worker queue scheduler');
        }
      }
    }
  }
  return usages;
}

function deduplicate<T>(values: (T | undefined)[]): T[] {
  const result: T[] = [];
  for (const value of values) {
    if (value !== undefined && !result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

function generateReport(): SupplierQueueAuditReport {
  const apiUsages = collectApiQueueUsages();
  const workerUsages = collectWorkerQueueUsages();
  const allUsages = [...apiUsages, ...workerUsages];
  const grouped = new Map<string, QueueUsageRecord[]>();

  for (const usage of allUsages) {
    if (!grouped.has(usage.key)) {
      grouped.set(usage.key, []);
    }
    grouped.get(usage.key)!.push(usage);
  }

  const entries: QueueAuditEntry[] = [];

  for (const [queueKey, records] of grouped) {
    const queueNames = deduplicate(records.map((record) => record.queueName));
    const aliases = deduplicate(records.map((record) => record.alias));
    const hasProducer = records.some((record) => record.kind === 'producer');
    const hasConsumer = records.some((record) => record.kind === 'consumer');
    const issues: QueueAuditIssue[] = [];

    if (!hasProducer) {
      issues.push({
        type: 'missing_producer',
        severity: 'high',
        message: `Queue "${queueKey}" has no supplier-scoped producer registration`,
        suggestion: 'Register queue via BullModule.registerQueue or instantiate Queue in supplier API module',
      });
    }

    if (!hasConsumer) {
      issues.push({
        type: 'missing_consumer',
        severity: 'high',
        message: `Queue "${queueKey}" has no supplier-scoped worker/consumer`,
        suggestion: 'Create BullMQ Worker in apps/worker/src/queues to consume supplier jobs',
      });
    }

    if (!queueNames.length) {
      issues.push({
        type: 'unresolved_queue_name',
        severity: 'medium',
        message: `Queue "${queueKey}" resolves only via alias; ensure constant is exported from packages/shared`,
        suggestion: 'Define queue name constant in packages/shared and re-export for API and worker parity',
      });
    }

    entries.push({
      queueKey,
      queueNames,
      aliases,
      records,
      issues,
    });
  }

  entries.sort((a, b) => a.queueKey.localeCompare(b.queueKey));

  return {
    generatedAt: new Date().toISOString(),
    queues: entries,
  };
}

async function main(): Promise<void> {
  const report = generateReport();
  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'supplier-queue-audit.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Supplier Queue Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
  ];

  for (const entry of report.queues) {
    markdown.push(`## Queue: ${entry.queueKey}`);
    if (entry.queueNames.length) {
      markdown.push(`- Resolved Names: ${entry.queueNames.join(', ')}`);
    }
    if (entry.aliases.length) {
      markdown.push(`- Aliases: ${entry.aliases.join(', ')}`);
    }
    markdown.push('- Records:');
    for (const record of entry.records) {
      markdown.push(`  - [${record.kind}] ${record.file}:${record.line} — ${record.evidence}`);
      markdown.push(`    - Reasons: ${record.supplierReasons.join('; ')}`);
    }
    if (entry.issues.length) {
      markdown.push('- Issues:');
      for (const issue of entry.issues) {
        markdown.push(`  - (${issue.severity}) ${issue.message}`);
        markdown.push(`    - Suggestion: ${issue.suggestion}`);
      }
    }
    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'supplier-queue-audit.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Supplier queue audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
