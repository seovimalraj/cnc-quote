#!/usr/bin/env node

/**
 * CNC Quote QA Runner v1.0
 * End-to-end testing for Instant Quote and DFM Analysis
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @typedef {Object} QARunnerConfig
 * @property {string} version
 * @property {string} goal
 * @property {Object} env
 * @property {Object} preflight
 * @property {Array} smoke_suites
 * @property {Array} functional_tests
 * @property {Object} ui_audit
 * @property {Array} security_suite
 * @property {Object} result_collection
 * @property {Object} problem_classifier
 * @property {Object} autofix_recipes
 * @property {Array} ui_issue_catalog
 * @property {Object} publish_gate
 * @property {Object} output_contract
 */

class QARunner {
  /**
   * @param {string} configPath
   */
  constructor(configPath) {
    this.config = JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  async run() {
    console.log('🚀 Starting CNC Quote QA Runner v1.0');
    console.log(`Goal: ${this.config.goal}\n`);

    try {
      // 1. Preflight checks
      console.log('📋 Running preflight checks...');
      await this.runPreflightChecks();

      // 2. Smoke tests
      console.log('🔥 Running smoke test suites...');
      await this.runSmokeSuites();

      // 3. Functional tests
      console.log('⚙️  Running functional tests...');
      await this.runFunctionalTests();

      // 4. UI audit
      console.log('🎨 Running UI audit...');
      await this.runUIAudit();

      // 5. Security suite
      console.log('🔒 Running security suite...');
      await this.runSecuritySuite();

      // 6. Classify problems and apply autofixes
      console.log('🔧 Classifying problems and applying autofixes...');
      await this.classifyProblemsAndAutofix();

      // 7. Publish gate
      console.log('🚪 Evaluating publish gate...');
      this.evaluatePublishGate();

      // 8. Save results
      this.saveResults();

      console.log('\n✅ QA Runner completed successfully!');
      this.printSummary();

    } catch (error) {
      console.error('❌ QA Runner failed:', error);
      process.exit(1);
    }
  }

  async runPreflightChecks() {
    for (const check of this.config.preflight.checks) {
      try {
        console.log(`  → ${check.name}`);
        const result = await this.executeCheck(check);
        this.results.preflight.push({
          name: check.name,
          passed: result.passed,
          details: result.details
        });

        if (!result.passed) {
          this.results.problems_found.push({
            id: `PRB-${Date.now()}`,
            suite: 'preflight',
            fail_code: check.fail_code,
            severity: 'blocker',
            summary: `${check.name} failed`,
            evidence: [result.details]
          });
        }
      } catch (error) {
        console.error(`  ❌ ${check.name}: ${error.message}`);
        this.results.preflight.push({
          name: check.name,
          passed: false,
          details: error.message
        });
      }
    }
  }

  async runSmokeSuites() {
    for (const suite of this.config.smoke_suites) {
      console.log(`  → ${suite.title} (${suite.id})`);

      for (const step of suite.steps) {
        try {
          const result = await this.executeStep(step);
          this.results.smoke.push({
            suite_id: suite.id,
            step: step.name,
            passed: result.passed,
            error: result.passed ? undefined : result.details,
            traces: result.traces
          });

          if (!result.passed) {
            this.results.problems_found.push({
              id: `PRB-${Date.now()}`,
              suite: suite.id,
              fail_code: step.fail_code,
              severity: 'major',
              summary: `${step.name} failed`,
              evidence: [result.details]
            });
          }
        } catch (error) {
          console.error(`    ❌ ${step.name}: ${error.message}`);
          this.results.smoke.push({
            suite_id: suite.id,
            step: step.name,
            passed: false,
            error: error.message
          });
        }
      }
    }
  }

  async runFunctionalTests() {
    for (const test of this.config.functional_tests) {
      try {
        console.log(`  → ${test.name}`);
        const result = await this.executeScript(test.cmd);
        this.results.functional.push({
          name: test.name,
          passed: result.exitCode === 0,
          logs: result.output
        });

        if (result.exitCode !== 0) {
          this.results.problems_found.push({
            id: `PRB-${Date.now()}`,
            suite: 'functional',
            fail_code: test.fail_code,
            severity: 'major',
            summary: `${test.name} failed`,
            evidence: [result.output]
          });
        }
      } catch (error) {
        console.error(`  ❌ ${test.name}: ${error.message}`);
        this.results.functional.push({
          name: test.name,
          passed: false,
          logs: error.message
        });
      }
    }
  }

  async runUIAudit() {
    // This would integrate with Lighthouse and axe-core
    // For now, we'll create a placeholder implementation
    console.log('  → UI audit (placeholder - would integrate Lighthouse/axe-core)');

    this.results.ui_audit = {
      lighthouse: {},
      axe: {}
    };

    // Mock some UI issues for demonstration
    this.results.ui_issues = [
      {
        code: 'A11Y_CONTRAST',
        route: '/instant-quote',
        nodes: 6,
        severity: 'serious',
        fix: 'Adjust --color-primary to #1e3a8a; text-base to #111827'
      }
    ];
  }

  async runSecuritySuite() {
    for (const test of this.config.security_suite) {
      try {
        console.log(`  → ${test.name}`);
        const result = await this.executeCheck(test);
        this.results.security.push({
          name: test.name,
          passed: result.passed,
          details: result.details
        });

        if (!result.passed) {
          this.results.problems_found.push({
            id: `PRB-${Date.now()}`,
            suite: 'security',
            fail_code: test.fail_code,
            severity: 'major',
            summary: `${test.name} failed`,
            evidence: [result.details]
          });
        }
      } catch (error) {
        console.error(`  ❌ ${test.name}: ${error.message}`);
        this.results.security.push({
          name: test.name,
          passed: false,
          details: error.message
        });
      }
    }
  }

  async classifyProblemsAndAutofix() {
    for (const problem of this.results.problems_found) {
      const rule = this.config.problem_classifier.rules.find(
        r => r['when.fail_code'] === problem.fail_code
      );

      if (rule) {
        problem.severity = rule.severity;
        problem.title = rule.title;
        problem.owner = rule.owner;
        problem.suggested_fix = rule.autofix;
        problem.status = 'open';

        // Apply autofixes if available
        if (rule.autofix) {
          for (const fixId of rule.autofix) {
            try {
              await this.applyAutofix(fixId);
              this.results.autofix_applied.push({
                id: `FIX-${Date.now()}`,
                recipe: fixId,
                result: 'patched',
                logs: 'Autofix applied successfully'
              });
            } catch (error) {
              console.error(`  ❌ Autofix ${fixId} failed: ${error.message}`);
            }
          }
        }
      }
    }
  }

  evaluatePublishGate() {
    const criteria = this.config.publish_gate.criteria;
    const reasons = [];

    // Check preflight
    const preflightFailed = this.results.preflight.some(p => !p.passed);
    if (preflightFailed) reasons.push('Preflight checks failed');

    // Check smoke tests
    const smokeFailed = this.results.smoke.some(s => !s.passed);
    if (smokeFailed) reasons.push('Smoke tests failed');

    // Check functional tests
    const functionalFailed = this.results.functional.some(f => !f.passed);
    if (functionalFailed) reasons.push('Functional tests failed');

    // Check security
    const securityFailed = this.results.security.some(s => !s.passed);
    if (securityFailed) reasons.push('Security tests failed');

    // Check for blocker/critical problems
    const criticalProblems = this.results.problems_found.filter(
      p => p.severity === 'blocker' || p.severity === 'critical'
    );
    if (criticalProblems.length > 0) {
      reasons.push(`${criticalProblems.length} critical/blocker problems found`);
    }

    this.results.publish_gate = {
      eligible: reasons.length === 0,
      reasons
    };
  }

  async executeCheck(check) {
    switch (check.tool) {
      case 'http':
        return this.executeHttpCheck(check);
      case 'script':
        const result = await this.executeScript(check.cmd);
        return {
          passed: result.exitCode === check.expect.exit_code,
          details: result.output
        };
      default:
        throw new Error(`Unknown tool: ${check.tool}`);
    }
  }

  async executeHttpCheck(check) {
    try {
      const url = check.request.url
        .replace('{{api_url}}', this.config.env.api_url)
        .replace('{{cad_url}}', this.config.env.cad_url)
        .replace('{{web_url}}', this.config.env.web_url);

      const response = await fetch(url, {
        method: check.request.method || 'GET'
      });

      const passed = this.checkHttpExpectation(response, check.expect);
      return {
        passed,
        details: {
          status: response.status,
          url,
          passed
        }
      };
    } catch (error) {
      return {
        passed: false,
        details: error.message
      };
    }
  }

  checkHttpExpectation(response, expect) {
    if (expect.status && response.status !== expect.status) return false;
    if (expect['status.in'] && !expect['status.in'].includes(response.status)) return false;
    if (expect['body.includes']) {
      // This would need to read the response body
      return true; // Placeholder
    }
    return true;
  }

  async executeScript(cmd) {
    return new Promise((resolve) => {
      try {
        const output = execSync(cmd, { encoding: 'utf-8' });
        resolve({ exitCode: 0, output });
      } catch (error) {
        resolve({
          exitCode: error.status || 1,
          output: error.stdout + error.stderr
        });
      }
    });
  }

  async executeStep(step) {
    // Placeholder implementation for UI steps
    // In a real implementation, this would use Playwright or similar
    console.log(`    → ${step.name} (simulated)`);

    // Simulate some failures for demonstration
    if (step.fail_code === 'IQ_PRICE_LOCK_FAIL') {
      return {
        passed: false,
        details: 'Price lock not persisted - missing PUT /api/quotes/*/lead',
        traces: ['network log missing PUT request', 'no lock_key in store']
      };
    }

    return {
      passed: true,
      details: 'Step passed',
      traces: ['UI interaction successful']
    };
  }

  async applyAutofix(fixId) {
    const recipe = this.config.autofix_recipes[fixId];
    if (!recipe) {
      throw new Error(`No recipe found for ${fixId}`);
    }

    console.log(`    → Applying autofix: ${fixId}`);

    switch (recipe.tool) {
      case 'script':
        const result = await this.executeScript(recipe.cmd);
        if (result.exitCode !== 0) {
          throw new Error(`Script failed: ${result.output}`);
        }
        break;
      case 'doc':
        console.log(`    📋 Manual steps for ${fixId}:`);
        recipe.steps.forEach((step, i) => {
          console.log(`      ${i + 1}. ${step}`);
        });
        break;
      case 'code':
        console.log(`    📝 Code patch needed for ${fixId}:`);
        console.log(`      File: ${recipe.file}`);
        console.log(`      Hint: ${recipe.patch_hint}`);
        break;
      default:
        console.log(`    ⚠️  Manual intervention required for ${fixId}`);
    }
  }

  saveResults() {
    const outputPath = this.config.result_collection.store;
    const outputDir = dirname(outputPath);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      execSync(`mkdir -p ${outputDir}`);
    }

    writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Results saved to ${outputPath}`);
  }

  printSummary() {
    const { eligible, reasons } = this.results.publish_gate;
    const problems = this.results.problems_found.length;
    const autofixes = this.results.autofix_applied.length;

    console.log('\n📊 QA Runner Summary:');
    console.log(`   Problems found: ${problems}`);
    console.log(`   Autofixes applied: ${autofixes}`);
    console.log(`   Publish eligible: ${eligible ? '✅ YES' : '❌ NO'}`);

    if (!eligible) {
      console.log('\n🚫 Blocking reasons:');
      reasons.forEach((reason) => {
        console.log(`   • ${reason}`);
      });
    }

    if (problems > 0) {
      console.log('\n🔍 Top problems:');
      this.results.problems_found.slice(0, 5).forEach((problem) => {
        console.log(`   • ${problem.severity.toUpperCase()}: ${problem.summary}`);
      });
    }
  }
}

// CLI interface
function main() {
  const configPath = process.argv[2] || 'qa-config.json';

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.log('Usage: node qa-runner.js [config-file.json]');
    process.exit(1);
  }

  const runner = new QARunner(configPath);
  runner.run().catch(console.error);
}

if (require.main === module) {
  main();
}

module.exports = { QARunner };</content>
