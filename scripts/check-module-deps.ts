#!/usr/bin/env tsx
/**
 * Module Dependency Checker
 * Scans NestJS modules for missing imports/providers
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ModuleDependency {
  module: string;
  file: string;
  missingImports: string[];
  missingProviders: string[];
}

async function checkModuleDependencies(): Promise<ModuleDependency[]> {
  const apiPath = path.join(process.cwd(), 'apps/api/src');
  const issues: ModuleDependency[] = [];

  // Find all module files
  const moduleFiles = await glob('**/*.module.ts', { cwd: apiPath, absolute: true });

  for (const moduleFile of moduleFiles) {
    const content = fs.readFileSync(moduleFile, 'utf-8');
    const moduleName = path.basename(moduleFile, '.module.ts');

    // Extract imports array
    const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]/);
    const imports = importsMatch ? importsMatch[1].split(',').map(i => i.trim()).filter(Boolean) : [];

    // Extract providers array
    const providersMatch = content.match(/providers:\s*\[([\s\S]*?)\]/);
    const providers = providersMatch ? providersMatch[1].split(',').map(p => p.trim()).filter(Boolean) : [];

    // Check for common missing dependencies
    const missingImports: string[] = [];
    const missingProviders: string[] = [];

    // Check if services are used but not provided
    const serviceMatches = content.matchAll(/import\s+{\s*(\w+Service)\s*}/g);
    for (const match of serviceMatches) {
      const serviceName = match[1];
      if (!providers.includes(serviceName) && !content.includes(`exports: [${serviceName}]`)) {
        // Check if it's imported from a module
        const isImportedViaModule = imports.some(imp => 
          imp.includes('Module') && imp !== 'Module'
        );
        if (!isImportedViaModule && !content.includes(`@Injectable()`)) {
          missingProviders.push(serviceName);
        }
      }
    }

    if (missingImports.length > 0 || missingProviders.length > 0) {
      issues.push({
        module: moduleName,
        file: path.relative(process.cwd(), moduleFile),
        missingImports,
        missingProviders
      });
    }
  }

  return issues;
}

async function main() {
  console.log('🔍 Checking NestJS module dependencies...\n');
  
  const issues = await checkModuleDependencies();

  if (issues.length === 0) {
    console.log('✅ No obvious dependency issues found!');
    return;
  }

  console.log(`⚠️  Found ${issues.length} potential issues:\n`);

  for (const issue of issues) {
    console.log(`📦 ${issue.module} (${issue.file})`);
    if (issue.missingImports.length > 0) {
      console.log(`   Missing imports: ${issue.missingImports.join(', ')}`);
    }
    if (issue.missingProviders.length > 0) {
      console.log(`   Missing providers: ${issue.missingProviders.join(', ')}`);
    }
    console.log();
  }
}

main().catch(console.error);
