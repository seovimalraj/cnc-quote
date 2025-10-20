import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import globby from 'globby';
import {
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  VariableDeclaration,
} from 'ts-morph';

interface RouteActionRef {
  name: string;
  source?: string;
  inferredServerAction: boolean;
}

interface SupplierRouteEntry {
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

interface SupplierSurfaceReport {
  generatedAt: string;
  supplierRoutes: SupplierRouteEntry[];
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
  'apps/web/app/(supplier)/**/route.ts',
];

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const INTERACTION_IDENTIFIERS = ['useTransition', 'useFormState', 'useOptimistic', 'router', 'fetch'];

function isUseDirective(statement: Node, directive: string): boolean {
  if (!Node.isExpressionStatement(statement)) {
    return false;
  }
  const expression = statement.getExpression();
  return Node.isStringLiteral(expression) && expression.getLiteralText() === directive;
}

function fileHasDirective(sourceFile: SourceFile, directive: string): boolean {
  for (const statement of sourceFile.getStatements()) {
    if (!Node.isExpressionStatement(statement)) {
      continue;
    }
    if (isUseDirective(statement, directive)) {
      return true;
    }
  }
  return false;
}

function getDefaultExportName(sourceFile: SourceFile): string | undefined {
  const defaultExportSymbol = sourceFile.getDefaultExportSymbol();
  if (!defaultExportSymbol) {
    return undefined;
  }
  const declarations = defaultExportSymbol.getDeclarations();
  for (const declaration of declarations) {
    if (Node.isFunctionDeclaration(declaration) || Node.isClassDeclaration(declaration)) {
      return declaration.getName() ?? 'default';
    }
    if (Node.isExportAssignment(declaration)) {
      const expr = declaration.getExpression();
      if (Node.isIdentifier(expr)) {
        return expr.getText();
      }
      if (Node.isCallExpression(expr) || Node.isArrowFunction(expr)) {
        return 'default';
      }
    }
  }
  return 'default';
}

function hasUseServerDirective(body: Node | undefined): boolean {
  if (!body) {
    return false;
  }
  if (Node.isBlock(body)) {
    const statements = body.getStatements();
    if (statements.length === 0) {
      return false;
    }
    return statements.some((stmt) => isUseDirective(stmt, 'use server'));
  }
  if (Node.isArrowFunction(body) && body.isBodyBlock()) {
    return hasUseServerDirective(body.getBody());
  }
  return false;
}

function inferServerActionFromVariable(declaration: VariableDeclaration): RouteActionRef | null {
  const name = declaration.getName();
  const initializer = declaration.getInitializer();
  if (!initializer) {
    return null;
  }
  if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
    const isAsync = Node.isArrowFunction(initializer)
      ? initializer.isAsync()
      : initializer.isAsync();
    const hasDirective = hasUseServerDirective(initializer.getBody());
    if (isAsync || hasDirective) {
      return {
        name,
        inferredServerAction: hasDirective || isAsync,
      };
    }
  }
  return null;
}

function collectExportedServerActions(sourceFile: SourceFile): RouteActionRef[] {
  const results: RouteActionRef[] = [];
  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isExported()) {
      continue;
    }
    const name = fn.getName();
    if (!name) {
      continue;
    }
    const isAsync = fn.isAsync();
    const hasDirective = hasUseServerDirective(fn.getBody());
    if (isAsync || hasDirective) {
      results.push({ name, inferredServerAction: hasDirective || isAsync });
    }
  }
  for (const variable of sourceFile.getVariableDeclarations()) {
    if (!variable.isExported()) {
      continue;
    }
    const action = inferServerActionFromVariable(variable);
    if (action) {
      results.push(action);
    }
  }
  return results;
}

function collectExportedMetadataKeys(sourceFile: SourceFile): string[] {
  const keys: string[] = [];
  const exportedVars = sourceFile.getVariableStatements().filter((stmt) => stmt.isExported());
  for (const statement of exportedVars) {
    for (const declaration of statement.getDeclarations()) {
      const name = declaration.getNameNode()?.getText();
      if (name === 'metadata' || name === 'dynamic' || name === 'revalidate' || name === 'runtime') {
        keys.push(name);
      }
    }
  }
  if (sourceFile.getFunction('generateMetadata')?.isExported()) {
    keys.push('generateMetadata');
  }
  if (sourceFile.getFunction('generateStaticParams')?.isExported()) {
    keys.push('generateStaticParams');
  }
  return keys;
}

function collectImportedHandlers(sourceFile: SourceFile): RouteActionRef[] {
  const handlers: RouteActionRef[] = [];
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const namedImports = importDecl.getNamedImports();
    for (const named of namedImports) {
      const name = named.getName();
      const matchesAction = /Action$/.test(name) || name.startsWith('handle') || name.endsWith('Handler');
      const looksLikeActionsModule = /actions?\//.test(moduleSpecifier) || moduleSpecifier.includes('actions');
      if (matchesAction || looksLikeActionsModule) {
        handlers.push({
          name,
          source: moduleSpecifier,
          inferredServerAction: looksLikeActionsModule || matchesAction,
        });
      }
    }
  }
  return handlers;
}

function collectImportedUtilities(sourceFile: SourceFile): string[] {
  const utilities: string[] = [];
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const isRelative = moduleSpecifier.startsWith('../') || moduleSpecifier.startsWith('./');
    const targetsLib = moduleSpecifier.includes('/lib/') || moduleSpecifier.includes('apps/web/lib') || moduleSpecifier.startsWith('@cnc-quote/lib');
    if (targetsLib || (isRelative && moduleSpecifier.includes('/lib/'))) {
      utilities.push(moduleSpecifier);
    }
  }
  return Array.from(new Set(utilities)).sort();
}

function collectHookUsage(sourceFile: SourceFile): string[] {
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  const seen = new Set<string>();
  for (const identifier of identifiers) {
    const text = identifier.getText();
    if (INTERACTION_IDENTIFIERS.includes(text)) {
      seen.add(text);
    }
  }
  return Array.from(seen);
}

function normalizeRoute(relativeFile: string): {
  route: string;
  params: string[];
} {
  const withoutPrefix = relativeFile.replace(/^apps\/web\/app\//, '');
  const parts = withoutPrefix.split('/');
  const fileName = parts.pop() ?? '';
  const segments: string[] = [];
  const params: string[] = [];

  for (const part of parts) {
    if (part.startsWith('(') && part.endsWith(')')) {
      continue;
    }
    if (part.startsWith('@')) {
      continue;
    }
    segments.push(part);
    if (part.startsWith('[') && part.endsWith(']')) {
      params.push(part.slice(1, -1));
    }
  }

  if (fileName.startsWith('[') && fileName.includes('].tsx')) {
    const param = fileName.substring(1, fileName.indexOf(']'));
    params.push(param);
  }

  const routePath = `/supplier${segments.length > 0 ? `/${segments.join('/')}` : ''}`;
  return { route: routePath, params };
}

function determineFileType(relativeFile: string): SupplierRouteEntry['fileType'] {
  if (relativeFile.endsWith('/page.tsx')) return 'page';
  if (relativeFile.endsWith('/layout.tsx')) return 'layout';
  if (relativeFile.endsWith('/loading.tsx')) return 'loading';
  if (relativeFile.endsWith('/error.tsx')) return 'error';
  if (relativeFile.endsWith('/template.tsx')) return 'template';
  return 'route';
}

function collectHttpHandlers(sourceFile: SourceFile): string[] | undefined {
  const handlers: string[] = [];
  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isExported()) {
      continue;
    }
    const name = fn.getName();
    if (name && HTTP_METHODS.has(name)) {
      handlers.push(name);
    }
  }
  return handlers.length ? handlers : undefined;
}

function extractSupplierRouteEntry(relativeFile: string): SupplierRouteEntry | null {
  const absolutePath = path.join(repoRoot, relativeFile);
  const sourceFile = project.getSourceFile(toPosix(absolutePath));
  if (!sourceFile) {
    return null;
  }
  const { route, params } = normalizeRoute(relativeFile);
  const isClient = fileHasDirective(sourceFile, 'use client');
  const componentName = getDefaultExportName(sourceFile);
  const exportedMetadata = collectExportedMetadataKeys(sourceFile);
  const serverActions = collectExportedServerActions(sourceFile);
  const importedHandlers = collectImportedHandlers(sourceFile);
  const importedUtilities = collectImportedUtilities(sourceFile);
  const hooksUsed = collectHookUsage(sourceFile);
  const fileType = determineFileType(relativeFile);
  const httpHandlers = fileType === 'route' ? collectHttpHandlers(sourceFile) : undefined;

  return {
    route,
    file: relativeFile,
    fileType,
    componentName,
    exportedMetadata: exportedMetadata.length ? exportedMetadata : undefined,
    params: params.length ? params : undefined,
    isClientComponent: isClient,
    exportsServerActions: serverActions,
    importedHandlers,
    importedUtilities,
    hooksUsed,
    httpHandlers,
  };
}

async function main(): Promise<void> {
  const supplierFiles = await globby(SUPPLIER_FILE_PATTERNS, { cwd: repoRoot });
  const supplierRoutes: SupplierRouteEntry[] = [];

  for (const file of supplierFiles) {
    const entry = extractSupplierRouteEntry(file);
    if (entry) {
      supplierRoutes.push(entry);
    }
  }

  supplierRoutes.sort((a, b) => a.route.localeCompare(b.route));

  const report: SupplierSurfaceReport = {
    generatedAt: new Date().toISOString(),
    supplierRoutes,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'supplier-surface-map.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Supplier Surface Map',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Routes',
    '',
  ];

  for (const routeEntry of supplierRoutes) {
    markdown.push(`### ${routeEntry.route}`);
    markdown.push('');
    markdown.push(`- File: ${routeEntry.file}`);
    markdown.push(`- Type: ${routeEntry.fileType}`);
    if (routeEntry.componentName) {
      markdown.push(`- Component: ${routeEntry.componentName}`);
    }
    markdown.push(`- Client Component: ${routeEntry.isClientComponent ? 'yes' : 'no'}`);
    if (routeEntry.params?.length) {
      markdown.push(`- Params: ${routeEntry.params.join(', ')}`);
    }
    if (routeEntry.exportedMetadata?.length) {
      markdown.push(`- Exported Metadata: ${routeEntry.exportedMetadata.join(', ')}`);
    }
    if (routeEntry.httpHandlers?.length) {
      markdown.push(`- HTTP Handlers: ${routeEntry.httpHandlers.join(', ')}`);
    }
    if (routeEntry.exportsServerActions.length) {
      markdown.push(`- Server Actions: ${routeEntry.exportsServerActions.map((a) => a.name).join(', ')}`);
    }
    if (routeEntry.importedHandlers.length) {
      const handlers = routeEntry.importedHandlers.map((handler) => `${handler.name} (${handler.source ?? 'unknown'})`);
      markdown.push(`- Imported Handlers: ${handlers.join(', ')}`);
    }
    if (routeEntry.importedUtilities.length) {
      markdown.push(`- Utilities: ${routeEntry.importedUtilities.join(', ')}`);
    }
    if (routeEntry.hooksUsed.length) {
      markdown.push(`- Hooks: ${routeEntry.hooksUsed.join(', ')}`);
    }
    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'supplier-surface-map.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Supplier surface map written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
