#!/usr/bin/env node

/**
 * Performance SLO Checker
 * Validates that performance Service Level Objectives are met
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';

interface SLOMetric {
  name: string;
  endpoint: string;
  method?: string;
  body?: any;
  targetMs: number;
  description: string;
}

const sloMetrics: SLOMetric[] = [
  {
    name: 'Quote Creation',
    endpoint: '/api/quotes',
    method: 'POST',
    body: { material: 'test', process: 'test' },
    targetMs: 2000,
    description: 'Quote creation should complete within 2 seconds'
  },
  {
    name: 'DFM Analysis',
    endpoint: '/api/dfm/validate',
    method: 'POST',
    body: { process_type: 'cnc', features: [] },
    targetMs: 5000,
    description: 'DFM validation should complete within 5 seconds'
  },
  {
    name: 'Pricing Calculation',
    endpoint: '/api/pricing/calculate',
    method: 'POST',
    body: { material: '6061 Aluminum', dimensions: { x: 10, y: 10, z: 10 } },
    targetMs: 1000,
    description: 'Pricing calculation should complete within 1 second'
  },
  {
    name: 'File Upload',
    endpoint: '/api/files/upload',
    method: 'POST',
    body: { file: 'test' },
    targetMs: 3000,
    description: 'File upload should complete within 3 seconds'
  }
];

async function checkSLOs() {
  console.log('⚡ Checking Performance SLOs...\n');

  let allPassed = true;

  for (const metric of sloMetrics) {
    try {
      console.log(`  → ${metric.name}`);

      const startTime = Date.now();

      const response = await fetch(`${API_URL}${metric.endpoint}`, {
        method: metric.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: metric.body ? JSON.stringify(metric.body) : undefined
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`    ⏱️  Duration: ${duration}ms (target: ${metric.targetMs}ms)`);

      if (response.status >= 200 && response.status < 300) {
        if (duration <= metric.targetMs) {
          console.log(`    ✅ PASSED - ${metric.description}`);
        } else {
          console.log(`    ❌ FAILED - Exceeded target time`);
          allPassed = false;
        }
      } else {
        console.log(`    ❌ FAILED - HTTP ${response.status}`);
        allPassed = false;
      }

    } catch (error) {
      console.log(`    ❌ ERROR: ${error.message}`);
      allPassed = false;
    }
  }

  console.log(`\n${allPassed ? '✅' : '❌'} SLO Check ${allPassed ? 'PASSED' : 'FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

checkSLOs().catch(console.error);
