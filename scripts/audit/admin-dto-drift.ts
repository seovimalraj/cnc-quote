import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import globby from 'globby';
import {
  Node,
  Project,
  InterfaceDeclaration,
  TypeLiteralNode,
  PropertySignature,
  ObjectLiteralExpression,
  PropertyAssignment,
  ShorthandPropertyAssignment,
} from 'ts-morph';

interface PropertyDefinition {
  name: string;
}

interface DefinitionBase {
  name: string;
  file: string;
  kind: 'interface' | 'type' | 'zod' | 'dto' | 'api-zod';
  properties: PropertyDefinition[];
}

interface SharedDefinition extends DefinitionBase {
  usage: Array<{ file: string; route: string }>; // admin files using the type
}

interface DefinitionComparison {
  shared: SharedDefinition;
  apiDto?: DefinitionBase;
  apiZod?: DefinitionBase;
  issues: DriftIssue[];
}

interface DriftIssue {
  issueType: 'missing_dto' | 'missing_property' | 'extra_property' | 'missing_validator';
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  suggestion: string;
  targetFile?: string;
  property?: string;
}

interface DriftReport {
  generatedAt: string;
  comparisons: DefinitionComparison[];
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
  `${toPosix(repoRoot)}/packages/shared/src/**/*.{ts,tsx}`,
  `${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`,
]);

const ADMIN_FILE_PATTERNS = [
  'apps/web/app/(admin)/**/*.{ts,tsx}',
  'apps/web/components/**/*.{ts,tsx}',
  'apps/web/lib/**/*.{ts,tsx}',
];

function relativePath(filePath: string): string {
  return toPosix(path.relative(repoRoot, filePath));
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

function getPropertyNameFromAssignment(prop: PropertyAssignment | ShorthandPropertyAssignment): string | undefined {
  if (Node.isPropertyAssignment(prop)) {
    const nameNode = prop.getNameNode();
    if (Node.isIdentifier(nameNode) || Node.isStringLiteral(nameNode) || Node.isNumericLiteral(nameNode)) {
      return nameNode.getText().replace(/^['"]|['"]$/g, '');
    }
    return nameNode.getText();
  }
  if (Node.isShorthandPropertyAssignment(prop)) {
    return prop.getName();
  }
  return undefined;
}

function collectPropertiesFromInterface(iface: InterfaceDeclaration): PropertyDefinition[] {
  const properties: PropertyDefinition[] = [];
  for (const prop of iface.getProperties()) {
    const name = prop.getName();
    if (name) {
      properties.push({ name });
    }
  }
  return properties;
}

function collectPropertiesFromTypeLiteral(typeLiteral: TypeLiteralNode): PropertyDefinition[] {
  const properties: PropertyDefinition[] = [];
  for (const member of typeLiteral.getMembers()) {
    if (Node.isPropertySignature(member)) {
      const name = member.getName();
      if (name) {
        properties.push({ name });
      }
    }
  }
  return properties;
}

function extractObjectLiteralFromZodCall(initializer: Node | undefined): ObjectLiteralExpression | undefined {
  if (!initializer) {
    return undefined;
  }
  if (Node.isCallExpression(initializer)) {
    const expr = initializer.getExpression();
    if (Node.isPropertyAccessExpression(expr)) {
      const methodName = expr.getName();
      if (methodName === 'object' || methodName === 'strictObject') {
        const objectArg = initializer.getArguments()[0];
        if (objectArg && Node.isObjectLiteralExpression(objectArg)) {
          return objectArg;
        }
      }
    }
    if (Node.isCallExpression(expr)) {
      return extractObjectLiteralFromZodCall(expr);
    }
  }
  return undefined;
}

function collectPropertiesFromZod(initializer: Node | undefined): PropertyDefinition[] {
  const objectLiteral = extractObjectLiteralFromZodCall(initializer);
  if (!objectLiteral) {
    return [];
  }
  const properties: PropertyDefinition[] = [];
  for (const prop of objectLiteral.getProperties()) {
    if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
      const name = getPropertyNameFromAssignment(prop as PropertyAssignment | ShorthandPropertyAssignment);
      if (name) {
        properties.push({ name });
      }
    }
  }
  return properties;
}

function definitionKey(name: string, file: string): string {
  return `${name}::${file}`;
}

function collectSharedDefinitions(): Map<string, SharedDefinition> {
  const sharedDefinitions = new Map<string, SharedDefinition>();
  const adminFiles = globby.sync(ADMIN_FILE_PATTERNS, { cwd: repoRoot });

  for (const adminFile of adminFiles) {
    const sourceFile = project.getSourceFile(toPosix(path.join(repoRoot, adminFile)));
    if (!sourceFile) {
      continue;
    }
    const route = adminFile.startsWith('apps/web/app') ? normalizeAdminRoute(adminFile) : 'shared-component';
    const importDeclarations = sourceFile.getImportDeclarations();
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (!moduleSpecifier.includes('@cnc-quote/shared')) {
        continue;
      }
      for (const namedImport of importDecl.getNamedImports()) {
        const nameNode = namedImport.getNameNode();
        const symbol = nameNode.getSymbol();
        if (!symbol) {
          continue;
        }
        const declarations = symbol.getDeclarations();
        for (const declaration of declarations) {
          const def = convertDeclarationToDefinition(declaration);
          if (!def) {
            continue;
          }
          const key = definitionKey(def.name, def.file);
          const existing = sharedDefinitions.get(key);
          if (existing) {
            const alreadyRecorded = existing.usage.some((usage) => usage.file === adminFile);
            if (!alreadyRecorded) {
              existing.usage.push({ file: adminFile, route });
            }
          } else {
            sharedDefinitions.set(key, {
              ...def,
              usage: [{ file: adminFile, route }],
            });
          }
        }
      }
    }
  }

  return sharedDefinitions;
}

function convertDeclarationToDefinition(declaration: Node): DefinitionBase | null {
  if (Node.isInterfaceDeclaration(declaration)) {
    return {
      name: declaration.getName() ?? 'AnonymousInterface',
      file: relativePath(declaration.getSourceFile().getFilePath()),
      kind: 'interface',
      properties: collectPropertiesFromInterface(declaration),
    };
  }
  if (Node.isTypeAliasDeclaration(declaration)) {
    const typeNode = declaration.getTypeNode();
    if (typeNode && Node.isTypeLiteralNode(typeNode)) {
      return {
        name: declaration.getName(),
        file: relativePath(declaration.getSourceFile().getFilePath()),
        kind: 'type',
        properties: collectPropertiesFromTypeLiteral(typeNode),
      };
    }
  }
  if (Node.isVariableDeclaration(declaration)) {
    const initializer = declaration.getInitializer();
    const properties = collectPropertiesFromZod(initializer);
    if (properties.length > 0) {
      return {
        name: declaration.getName(),
        file: relativePath(declaration.getSourceFile().getFilePath()),
        kind: 'zod',
        properties,
      };
    }
  }
  return null;
}

function collectApiDtoDefinitions(): DefinitionBase[] {
  const definitions: DefinitionBase[] = [];
  const apiSourceFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`);
  for (const sourceFile of apiSourceFiles) {
    for (const cls of sourceFile.getClasses()) {
      if (!cls.isExported()) {
        continue;
      }
      const className = cls.getName();
      if (!className) {
        continue;
      }
      if (!/Dto|Response|Request/i.test(className)) {
        continue;
      }
      const properties: PropertyDefinition[] = [];
      for (const prop of cls.getProperties()) {
        const name = prop.getName();
        if (name) {
          properties.push({ name });
        }
      }
      definitions.push({
        name: className,
        file: relativePath(sourceFile.getFilePath()),
        kind: 'dto',
        properties,
      });
    }
  }
  return definitions;
}

function collectApiZodDefinitions(): DefinitionBase[] {
  const definitions: DefinitionBase[] = [];
  const apiSourceFiles = project.getSourceFiles(`${toPosix(repoRoot)}/apps/api/src/**/*.{ts,tsx}`);
  for (const sourceFile of apiSourceFiles) {
    for (const variable of sourceFile.getVariableDeclarations()) {
      const initializer = variable.getInitializer();
      const properties = collectPropertiesFromZod(initializer);
      if (properties.length === 0) {
        continue;
      }
      definitions.push({
        name: variable.getName(),
        file: relativePath(sourceFile.getFilePath()),
        kind: 'api-zod',
        properties,
      });
    }
  }
  return definitions;
}

function normalizeName(name: string): string {
  return name
    .replace(/Dto$/i, '')
    .replace(/Request$/i, '')
    .replace(/Response$/i, '')
    .replace(/Schema$/i, '')
    .replace(/Interface$/i, '')
    .replace(/Type$/i, '')
    .replace(/Model$/i, '')
    .replace(/Result$/i, '')
    .replace(/Data$/i, '')
  .replace(/[-_]/g, '')
    .toLowerCase();
}

function findBestMatch(shared: DefinitionBase, candidates: DefinitionBase[]): DefinitionBase | undefined {
  const normalizedShared = normalizeName(shared.name);
  const direct = candidates.find((candidate) => normalizeName(candidate.name) === normalizedShared);
  if (direct) {
    return direct;
  }
  const byFileName = candidates.find((candidate) => {
    const sharedBase = path.basename(shared.file, path.extname(shared.file));
    const candidateBase = path.basename(candidate.file, path.extname(candidate.file));
    return normalizeName(candidateBase) === normalizedShared;
  });
  if (byFileName) {
    return byFileName;
  }
  return candidates.find((candidate) => normalizeName(candidate.name).includes(normalizedShared));
}

function compareProperties(shared: DefinitionBase, apiDef: DefinitionBase | undefined, issueTypeBase: 'missing_dto' | 'missing_validator'): DriftIssue[] {
  const issues: DriftIssue[] = [];
  if (!apiDef) {
    issues.push({
      issueType: issueTypeBase,
      severity: issueTypeBase === 'missing_dto' ? 'high' : 'medium',
      evidence: `No matching ${issueTypeBase === 'missing_dto' ? 'Nest DTO' : 'API validator'} found for ${shared.name}`,
      suggestion: issueTypeBase === 'missing_dto'
        ? `Create DTO class for ${shared.name} under apps/api/src matching shared properties`
        : `Add Zod schema aligned with ${shared.name} under apps/api/src`,
    });
    return issues;
  }

  const sharedProps = new Set(shared.properties.map((prop) => prop.name));
  const apiProps = new Set(apiDef.properties.map((prop) => prop.name));

  const missingInApi = Array.from(sharedProps).filter((prop) => !apiProps.has(prop));
  const extraInApi = Array.from(apiProps).filter((prop) => !sharedProps.has(prop));

  for (const prop of missingInApi) {
    issues.push({
      issueType: 'missing_property',
      severity: 'medium',
      evidence: `${prop} present in ${shared.name} but missing in ${apiDef.name}`,
      suggestion: `Add property ${prop} to ${apiDef.name} in ${apiDef.file} or update shared type`,
      targetFile: apiDef.file,
      property: prop,
    });
  }

  for (const prop of extraInApi) {
    issues.push({
      issueType: 'extra_property',
      severity: 'low',
      evidence: `${prop} present in ${apiDef.name} but absent from ${shared.name}`,
      suggestion: `Confirm ${prop} should exist. If yes, export via shared; otherwise remove from ${apiDef.name}`,
      targetFile: apiDef.file,
      property: prop,
    });
  }

  return issues;
}

async function main(): Promise<void> {
  const sharedDefinitions = collectSharedDefinitions();
  const apiDtoDefinitions = collectApiDtoDefinitions();
  const apiZodDefinitions = collectApiZodDefinitions();

  const comparisons: DefinitionComparison[] = [];

  for (const shared of sharedDefinitions.values()) {
    if (shared.properties.length === 0) {
      continue;
    }
    const matchedDto = findBestMatch(shared, apiDtoDefinitions);
    const matchedZod = findBestMatch(shared, apiZodDefinitions);
    const issues: DriftIssue[] = [];

    issues.push(...compareProperties(shared, matchedDto, 'missing_dto'));
    issues.push(...compareProperties(shared, matchedZod, 'missing_validator'));

    comparisons.push({
      shared,
      apiDto: matchedDto,
      apiZod: matchedZod,
      issues,
    });
  }

  const report: DriftReport = {
    generatedAt: new Date().toISOString(),
    comparisons,
  };

  await mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'admin-dto-drift.json');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  const markdown: string[] = [
    '# Admin DTO / Schema Drift Audit',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
  ];

  for (const comparison of comparisons) {
    if (comparison.issues.length === 0) {
      continue;
    }
    markdown.push(`## ${comparison.shared.name}`);
    markdown.push('');
    markdown.push(`- Shared Type: ${comparison.shared.name} (${comparison.shared.file})`);
    if (comparison.apiDto) {
      markdown.push(`- DTO: ${comparison.apiDto.name} (${comparison.apiDto.file})`);
    } else {
      markdown.push('- DTO: not found');
    }
    if (comparison.apiZod) {
      markdown.push(`- API Zod: ${comparison.apiZod.name} (${comparison.apiZod.file})`);
    } else {
      markdown.push('- API Zod: not found');
    }
    markdown.push('- Usage:');
    for (const usage of comparison.shared.usage) {
      markdown.push(`  - ${usage.route} (${usage.file})`);
    }
    if (comparison.issues.length) {
      markdown.push('- Issues:');
      for (const issue of comparison.issues) {
        markdown.push(`  - ${issue.issueType}: ${issue.evidence}`);
        markdown.push(`    - Suggestion: ${issue.suggestion}`);
      }
    }
    markdown.push('');
  }

  const markdownPath = path.join(outputDir, 'admin-dto-drift.md');
  await writeFile(markdownPath, `${markdown.join('\n')}\n`, 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`Admin DTO/schema drift audit written to ${jsonPath} and ${markdownPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
