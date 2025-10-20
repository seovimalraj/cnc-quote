import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import globby from 'globby';
import {
  CallExpression,
  Node,
  Project,
  PropertyAccessExpression,
  SyntaxKind,
} from 'ts-morph';

interface ApiCallDescriptor {
  route: string;
  file: string;
  line: number;
  column: number;
  method: string;
  url: string;
  inferredStatusCodes?: number[];
  evidence: string;
}

interface ApiTraceIssue {
  call: ApiCallDescriptor;
  issueType: 'missing_route' | 'verb_mismatch' | 'status_mismatch';
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  suggestion: string;
  controllerFile?: string;
  controllerMethod?: string;
}

interface ApiTraceReportEntry {
  call: ApiCallDescriptor;
  matchedController?: {
    file: string;
    className: string;
    methodName: string;
    httpMethod: string;
    statusCodes: number[];
  };
  issues: ApiTraceIssue[];
}

interface AdminApiTraceReport {
  generatedAt: string;
  calls: ApiTraceReportEntry[];
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
  `${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`,
]);

const ADMIN_FILE_PATTERNS = [
  'apps/web/app/(admin)/**/*.{ts,tsx}',
  'apps/web/components/**/*.{ts,tsx}',
  'apps/web/lib/**/*.{ts,tsx}',
];

const FETCH_ALIASES = new Set(['fetch']);
const AXIOS_ALIASES = new Set(['axios', 'apiClient']);

interface ControllerRoute {
  file: string;
  className: string;
  methodName: string;
  httpMethod: string;
  path: string;
  statusCodes: number[];
}

function normalizeAdminRoute(relativeFile: string): string {
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

function extractLiteralText(node: Node | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }
  if (Node.isTemplateExpression(node)) {
    const head = node.getHead().getLiteralText();
    if (node.getTemplateSpans().length === 0) {
      return head;
    }
    return undefined;
  }
  return undefined;
}

function inferMethodFromInit(call: CallExpression): string | undefined {
  const args = call.getArguments();
  if (args.length === 0) {
    return undefined;
  }
  const secondArg = args[1];
  if (!secondArg) {
    return undefined;
  }
  if (Node.isObjectLiteralExpression(secondArg)) {
    const methodProp = secondArg.getProperty('method');
    if (methodProp && Node.isPropertyAssignment(methodProp)) {
      const valueText = extractLiteralText(methodProp.getInitializer());
      if (valueText) {
        return valueText.toUpperCase();
      }
    }
  }
  return undefined;
}

function inferAxiosMethod(call: CallExpression, property: PropertyAccessExpression): string {
  const methodName = property.getName();
  if (methodName) {
    return methodName.toUpperCase();
  }
  return 'GET';
}

function collectAdminApiCalls(): ApiCallDescriptor[] {
  const results: ApiCallDescriptor[] = [];
  const adminFiles = globby.sync(ADMIN_FILE_PATTERNS, { cwd: repoRoot });

  for (const file of adminFiles) {
    const sourceFile = project.getSourceFile(toPosix(path.join(repoRoot, file)));
    if (!sourceFile) {
      continue;
    }
    const route = file.startsWith('apps/web/app') ? normalizeAdminRoute(file) : 'shared-component';
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression) && FETCH_ALIASES.has(expression.getText())) {
        const args = call.getArguments();
        if (args.length === 0) {
          continue;
        }
        const urlNode = args[0];
        const url = extractLiteralText(urlNode);
        if (!url) {
          continue;
        }
        const method = inferMethodFromInit(call) ?? 'GET';
        const { line, column } = sourceFile.getLineAndColumnAtPos(call.getStart());
        results.push({
          route,
          file,
          line,
          column,
          method,
          url,
          evidence: `${expression.getText()}(${url})`,
        });
      } else if (Node.isPropertyAccessExpression(expression)) {
        const expressionName = expression.getName();
        const expressionExpr = expression.getExpression();
        if (Node.isIdentifier(expressionExpr) && AXIOS_ALIASES.has(expressionExpr.getText())) {
          const args = call.getArguments();
          if (args.length === 0) {
            continue;
          }
          const urlNode = args[0];
          const url = extractLiteralText(urlNode);
          if (!url) {
            continue;
          }
          const method = inferAxiosMethod(call, expression);
          const { line, column } = sourceFile.getLineAndColumnAtPos(call.getStart());
          results.push({
            route,
            file,
            line,
            column,
            method,
            url,
            evidence: `${expressionExpr.getText()}.${expressionName}(${url})`,
          });
        }
      }
    }
  }

  return results;
}

function collectControllerRoutes(): ControllerRoute[] {
  const routes: ControllerRoute[] = [];
  const controllerFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/api/src/**/*.controller.{ts,tsx}`);
  for (const sourceFile of controllerFiles) {
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      const classDecorator = cls.getDecorator('Controller');
      if (!classDecorator) {
        continue;
      }
      const basePathArg = classDecorator.getArguments()[0];
      const basePath = extractLiteralText(basePathArg) ?? '';
      for (const method of cls.getMethods()) {
        const methodDecorators = method.getDecorators();
        for (const decorator of methodDecorators) {
          const name = decorator.getName();
          const httpMethod = name.toUpperCase();
          const decoratorArgs = decorator.getArguments();
          const pathArg = decoratorArgs[0];
          const pathSuffix = extractLiteralText(pathArg) ?? '';
          const fullPath = `${basePath}${pathSuffix}`.replace(/\/+/g, '/');
          const statusCodes: number[] = [];
          const httpCodeDecorator = method.getDecorator('HttpCode');
          if (httpCodeDecorator) {
            const statusArg = httpCodeDecorator.getArguments()[0];
            const statusText = statusArg?.getText();
            if (statusText) {
              const parsed = Number(statusText);
              if (!Number.isNaN(parsed)) {
                statusCodes.push(parsed);
              }
            }
          }
          routes.push({
            file: sourceFile.getFilePath().replace(`${toPosix(repoRoot)}/`, ''),
            className: cls.getName() ?? 'AnonymousController',
            methodName: method.getName(),
            httpMethod,
            path: fullPath.startsWith('/') ? fullPath : `/${fullPath}`,
            statusCodes,
          });
        }
      }
    }
  }
  return routes;
}

function findControllerMatch(call: ApiCallDescriptor, routes: ControllerRoute[]): ControllerRoute | undefined {
  return routes.find((route) => {
    const normalizedUrl = call.url.replace(/^\/api/, '');
    const normalizedRoute = route.path.replace(/^\/api/, '');
    return normalizedUrl === normalizedRoute;
  });
}

function buildIssueForMissingRoute(call: ApiCallDescriptor): ApiTraceIssue {
  return {
    call,
    issueType: 'missing_route',
    severity: 'high',
    evidence: `No NestJS controller route matches ${call.method} ${call.url}`,
    suggestion: `Add @${call.method}(${call.url}) to relevant controller or adjust client call`,
  };
}

function buildIssueForVerbMismatch(call: ApiCallDescriptor, route: ControllerRoute): ApiTraceIssue {
  return {
    call,
    issueType: 'verb_mismatch',
    severity: 'medium',
    evidence: `Client calls ${call.method} ${call.url} but controller uses ${route.httpMethod}`,
    suggestion: `Align client call or controller decorator @${route.httpMethod}(${route.path})`,
    controllerFile: route.file,
    controllerMethod: route.methodName,
  };
}

function buildIssueForStatusMismatch(
  call: ApiCallDescriptor,
  route: ControllerRoute,
  expectedStatus: number,
): ApiTraceIssue {
  return {
    call,
    issueType: 'status_mismatch',
    severity: 'medium',
    evidence: `Client calling ${call.method} ${call.url} expects ~${expectedStatus} but controller declares HttpCode ${route.statusCodes.join(', ')}`,
    suggestion: `Update @HttpCode on ${route.className}.${route.methodName} or adjust client handling`,
    controllerFile: route.file,
    controllerMethod: route.methodName,
  };
}

const DEFAULT_STATUS_BY_METHOD: Record<string, number> = {
  GET: 200,
  HEAD: 200,
  POST: 201,
  PUT: 200,
  PATCH: 200,
  DELETE: 204,
  OPTIONS: 204,
};

async function main(): Promise<void> {
  const calls = collectAdminApiCalls();
  const routes = collectControllerRoutes();
  const traceEntries: ApiTraceReportEntry[] = [];

  for (const call of calls) {
    const match = findControllerMatch(call, routes);
    const issues: ApiTraceIssue[] = [];
    if (!match) {
      issues.push(buildIssueForMissingRoute(call));
    } else {
      if (match.httpMethod !== call.method) {
        issues.push(buildIssueForVerbMismatch(call, match));
      } else if (match.statusCodes.length) {
        const expectedStatus = DEFAULT_STATUS_BY_METHOD[call.method] ?? 200;
        if (!match.statusCodes.includes(expectedStatus)) {
          issues.push(buildIssueForStatusMismatch(call, match, expectedStatus));
        }
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
            statusCodes: match.statusCodes,
          }
        : undefined,
      issues,
    });
  }

  const report: AdminApiTraceReport = {
    generatedAt: new Date().toISOString(),
    calls: traceEntries,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'admin-api-trace.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Admin API Trace Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
  ];

  for (const entry of traceEntries) {
    const { call, matchedController, issues } = entry;
    markdown.push(`## ${call.method} ${call.url}`);
    markdown.push('');
    markdown.push(`- Source: ${call.file} (route ${call.route}, line ${call.line})`);
    if (matchedController) {
      markdown.push(`- Controller: ${matchedController.className}.${matchedController.methodName} (${matchedController.httpMethod})`);
      if (matchedController.statusCodes.length) {
        markdown.push(`- Declared Status Codes: ${matchedController.statusCodes.join(', ')}`);
      }
    } else {
      markdown.push('- Controller: not found');
    }
    if (issues.length) {
      markdown.push('- Issues:');
      for (const issue of issues) {
        markdown.push(`  - ${issue.issueType}: ${issue.evidence}`);
        markdown.push(`    - Suggestion: ${issue.suggestion}`);
      }
    }
    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'admin-api-trace.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Admin API trace audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
