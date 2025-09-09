#!/usr/bin/env node

/**
 * CAD Pipeline Checker
 * Validates CAD processing and analysis pipeline
 */

import fetch from 'node-fetch';

const CAD_URL = process.env.CAD_URL || 'http://localhost:8000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function checkCAD() {
  console.log('🔧 Checking CAD Pipeline...\n');

  try {
    // Test CAD service health
    console.log('  → Testing CAD service health');
    const healthResponse = await fetch(`${CAD_URL}/health`);

    if (healthResponse.status !== 200) {
      console.log(`    ❌ CAD service not healthy (${healthResponse.status})`);
      return false;
    }
    console.log('    ✅ CAD service healthy');

    // Test CAD analysis endpoint
    console.log('  → Testing CAD analysis');
    const analysisResponse = await fetch(`${CAD_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: 'test-file-url',
        analysis_type: 'dfm'
      })
    });

    if (analysisResponse.status === 200 || analysisResponse.status === 202) {
      console.log('    ✅ CAD analysis endpoint responsive');
    } else {
      console.log(`    ❌ CAD analysis failed (${analysisResponse.status})`);
      return false;
    }

    // Test API to CAD integration
    console.log('  → Testing API-CAD integration');
    const apiResponse = await fetch(`${API_URL}/api/cad/status`);

    if (apiResponse.status === 200) {
      console.log('    ✅ API-CAD integration working');
    } else {
      console.log(`    ⚠️  API-CAD integration may have issues (${apiResponse.status})`);
    }

    console.log('\n✅ CAD Pipeline check PASSED');
    return true;

  } catch (error) {
    console.log(`❌ CAD Pipeline check FAILED: ${error.message}`);
    return false;
  }
}

checkCAD().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);
