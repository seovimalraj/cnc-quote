/**
 * @module audit/customer-api-trace
 * @ownership platform-observability
 * @description Maps customer-facing web calls to NestJS routes to expose gaps in guards, DTOs, and method parity before quote flows ship to production.
 */

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
  evidence: string;
  hasBody: boolean;
}

interface ApiTraceIssue {
  call: ApiCallDescriptor;
  issueType: 'missing_route' | 'verb_mismatch' | 'status_mismatch' | 'permission_gap' | 'dto_inconsistent' | 'method_body_mismatch';
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
    guarded: boolean;
    bodyTypes: string[];
  };
  issues: ApiTraceIssue[];
}

interface CustomerApiTraceReport {
  generatedAt: string;
  calls: ApiTraceReportEntry[];
}

interface ControllerRoute {
  file: string;
  className: string;
  methodName: string;
  httpMethod: string;
  path: string;
  statusCodes: number[];
  guarded: boolean;
  bodyTypes: string[];
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

const CUSTOMER_FILE_PATTERNS = [
  'apps/web/app/get-quote/**/*.{ts,tsx}',
  'apps/web/app/instant-quote/**/*.{ts,tsx}',
  'apps/web/app/dfm-analysis/**/*.{ts,tsx}',
  'apps/web/app/quotes/**/*.{ts,tsx}',
  'apps/web/app/secure-checkout/**/*.{ts,tsx}',
  'apps/web/app/checkout/**/*.{ts,tsx}',
  'apps/web/app/portal/quotes/**/*.{ts,tsx}',
  'apps/web/lib/**/customer/**/*.{ts,tsx}',
  'apps/web/components/**/customer/**/*.{ts,tsx}',
];

const FETCH_ALIASES = new Set(['fetch']);
const AXIOS_ALIASES = new Set(['axios', 'apiClient', 'customerClient']);

const DEFAULT_STATUS_BY_METHOD: Record<string, number> = {
  GET: 200,
  HEAD: 200,
  POST: 201,
  PUT: 200,
  PATCH: 200,
  DELETE: 204,
  OPTIONS: 204,
};

const GUARD_DECORATORS = new Set(['UseGuards', 'Policies', 'RequirePermissions', 'Roles']);

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

function extractLiteralText(node: Node | undefined): string | undefined {
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

    for (const call of callExpressions) {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression) && FETCH_ALIASES.has(expression.getText())) {
        const args = call.getArguments();
        if (args.length === 0) {
          continue;
        }
        const urlNode = args[0];
        const url = extractLiteralText(urlNode);
        if (!url || !url.startsWith('/api')) {
          continue;
        }
        const { method, hasBody } = inferMethodFromInit(call);
        const finalMethod = method ?? 'GET';
        const { line, column } = sourceFile.getLineAndColumnAtPos(call.getStart());
        results.push({
          route,
          file,
          line,
          column,
          method: finalMethod,
          url,
          evidence: `${expression.getText()}(${url})`,
          hasBody,
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
          if (!url || !url.startsWith('/api')) {
            continue;
          }
          const method = inferAxiosMethod(call, expression);
          const hasBody = args.length > 1;
          const { line, column } = sourceFile.getLineAndColumnAtPos(call.getStart());
          results.push({
            route,
            file,
            line,
            column,
            method,
            url,
            evidence: `${expressionExpr.getText()}.${expressionName}(${url})`,
            hasBody,
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
      const classDecorators = cls.getDecorators();
      const controllerDecorator = classDecorators.find((decorator) => decorator.getName() === 'Controller');
      if (!controllerDecorator) {
        continue;
      }
      const basePathArg = controllerDecorator.getArguments()[0];
      const basePath = extractLiteralText(basePathArg) ?? '';
      const classHasGuards = classDecorators.some((decorator) => GUARD_DECORATORS.has(decorator.getName()));

      for (const method of cls.getMethods()) {
        const methodDecorators = method.getDecorators();
        const httpDecorator = methodDecorators.find((decorator) => {
          const name = decorator.getName();
          return ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'].includes(name);
        });
        if (!httpDecorator) {
          continue;
        }
        const decoratorArgs = httpDecorator.getArguments();
        const pathArg = decoratorArgs[0];
        const pathSuffix = extractLiteralText(pathArg) ?? '';
        const httpMethod = httpDecorator.getName().toUpperCase();
        const fullPath = `${basePath}${pathSuffix}`.replace(/\/+/g, '/');
        const statusCodes: number[] = [];
        const httpCodeDecorator = methodDecorators.find((decorator) => decorator.getName() === 'HttpCode');
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
        const methodHasGuards = methodDecorators.some((decorator) => GUARD_DECORATORS.has(decorator.getName()));
        const bodyTypes: string[] = [];
        for (const param of method.getParameters()) {
          if (param.getDecorator('Body')) {
            const typeNode = param.getTypeNode();
            if (typeNode) {
              bodyTypes.push(typeNode.getText());
            } else {
              const type = param.getType().getText();
              bodyTypes.push(type);
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
          guarded: classHasGuards || methodHasGuards,
          bodyTypes,
        });
      }
    }
  }
  return routes;
}

function findControllerMatch(call: ApiCallDescriptor, routes: ControllerRoute[]): ControllerRoute | undefined {
  const normalizedUrl = call.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*/, '').replace(/#.*/, '');
  return routes.find((route) => {
    const candidate = route.path.startsWith('/api') ? route.path : `/api${route.path}`;
    return normalizedUrl === candidate || normalizedUrl === candidate.replace(/^\/api/, '');
  });
}

function buildIssue(
  call: ApiCallDescriptor,
  issueType: ApiTraceIssue['issueType'],
  severity: ApiTraceIssue['severity'],
  evidence: string,
  suggestion: string,
  controller?: ControllerRoute,
): ApiTraceIssue {
  return {
    call,
    issueType,
    severity,
    evidence,
    suggestion,
    controllerFile: controller?.file,
    controllerMethod: controller ? `${controller.className}.${controller.methodName}` : undefined,
  };
}

async function main(): Promise<void> {
  const calls = collectCustomerApiCalls();
  const routes = collectControllerRoutes();
  const traceEntries: ApiTraceReportEntry[] = [];

  for (const call of calls) {
    const match = findControllerMatch(call, routes);
    const issues: ApiTraceIssue[] = [];

    if (!match) {
      issues.push(
        buildIssue(
          call,
          'missing_route',
          'high',
          `No NestJS controller route matches ${call.method} ${call.url}`,
          `Add @${call.method}('${call.url.replace(/^\/api/, '')}') handler or adjust client request path.`,
        ),
      );
    } else {
      if (match.httpMethod !== call.method) {
        issues.push(
          buildIssue(
            call,
            'verb_mismatch',
            'medium',
            `Client calls ${call.method} ${call.url} but controller uses ${match.httpMethod}`,
            `Align client verb or update controller decorator @${match.httpMethod}('${match.path}')`,
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
              `Adjust @HttpCode on ${match.className}.${match.methodName} or update client handling`,
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
            `Controller ${match.className}.${match.methodName} lacks guard/policy decorators for ${call.url}`,
            'Add @UseGuards / @Policies decorators or document why route is intentionally public.',
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

      for (const type of match.bodyTypes) {
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
            guarded: match.guarded,
            bodyTypes: match.bodyTypes,
          }
        : undefined,
      issues,
    });
  }

  const report: CustomerApiTraceReport = {
    generatedAt: new Date().toISOString(),
    calls: traceEntries,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'customer-api-trace.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Customer API Trace Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
  ];

  for (const entry of traceEntries) {
    const { call, matchedController, issues } = entry;
    markdown.push(`## ${call.method} ${call.url}`);
    markdown.push('');
    markdown.push(`- Source: ${call.file} (route ${call.route}, line ${call.line})`);
    markdown.push(`- Has Body: ${call.hasBody ? 'yes' : 'no'}`);
    if (matchedController) {
      markdown.push(`- Controller: ${matchedController.className}.${matchedController.methodName} (${matchedController.httpMethod})`);
      markdown.push(`- File: ${matchedController.file}`);
      markdown.push(`- Guarded: ${matchedController.guarded ? 'yes' : 'no'}`);
      if (matchedController.statusCodes.length) {
        markdown.push(`- Declared Status Codes: ${matchedController.statusCodes.join(', ')}`);
      }
      if (matchedController.bodyTypes.length) {
        markdown.push(`- Body Types: ${matchedController.bodyTypes.join(', ')}`);
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

  const markdownPath = path.join(outputDir, 'customer-api-trace.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Customer API trace audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
