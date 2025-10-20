#!/usr/bin/env node

/**
 * Pricing Engine Checker
 * Validates pricing calculations and configurations
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';
const WORKER_SECRET = process.env.WORKER_SECRET || 'dev-secret';

async function checkPricing() {
  console.log('💰 Checking Pricing Engine...\n');

  try {
    // Test basic pricing endpoint
    console.log('  → Testing pricing endpoint');
    const response = await fetch(`${API_URL}/api/pricing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
      },
      body: JSON.stringify({
        material: '6061 Aluminum',
        process: 'CNC Milling',
        dimensions: { x: 100, y: 50, z: 25 },
        quantity: 10
      })
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log('    ✅ Pricing calculation successful');
      console.log(`    📊 Price: $${data.total || 'N/A'}`);
    } else {
      console.log(`    ❌ Pricing endpoint failed (${response.status})`);
      return false;
    }

    // Test pricing configuration
    console.log('  → Testing pricing configuration');
    const configResponse = await fetch(`${API_URL}/api/pricing/config`);

    if (configResponse.status === 200) {
      console.log('    ✅ Pricing configuration accessible');
    } else {
      console.log(`    ❌ Pricing config failed (${configResponse.status})`);
      return false;
    }

      console.log('  → Triggering compliance analytics rollup job');
      const rollupResponse = await fetch(`${WORKER_URL}/tasks/compliance-rollup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': WORKER_SECRET,
        },
        body: JSON.stringify({ windowHours: 24 }),
      });

      if (rollupResponse.ok) {
        console.log('    ✅ Compliance rollup job enqueued');
      } else {
        console.log(`    ❌ Compliance rollup enqueue failed (${rollupResponse.status})`);
        return false;
      }

    console.log('\n✅ Pricing Engine check PASSED');
    return true;

  } catch (error) {
    console.log(`❌ Pricing Engine check FAILED: ${error.message}`);
    return false;
  }
}

checkPricing().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);
