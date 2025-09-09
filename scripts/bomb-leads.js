#!/usr/bin/env node

/**
 * Lead Rate Limit Testing Script
 * Tests the rate limiting for lead creation
 */

import fetch from 'node-fetch';
import { program } from 'commander';

program
  .option('--count <number>', 'Number of requests to send', '10')
  .option('--email <email>', 'Email to use for testing', 'spam@acme.com')
  .option('--api-url <url>', 'API URL', 'http://localhost:3001');

program.parse();

const options = program.opts();

async function bombLeads() {
  const { count, email, apiUrl } = options;
  console.log(`🚀 Bombing leads with ${count} requests using email: ${email}`);

  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < parseInt(count); i++) {
    try {
      const response = await fetch(`${apiUrl}/api/quotes/from-dfm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
        },
        body: JSON.stringify({
          dfm_request_id: `test-${i}`,
          email: email,
          phone: '+1234567890'
        })
      });

      if (response.status === 429) {
        rateLimitedCount++;
        console.log(`  ${i + 1}. ✅ Rate limited (429)`);
      } else if (response.status === 200) {
        successCount++;
        console.log(`  ${i + 1}. ❌ Success (${response.status})`);
      } else {
        errorCount++;
        console.log(`  ${i + 1}. ⚠️  Error (${response.status})`);
      }

      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      errorCount++;
      console.log(`  ${i + 1}. ❌ Network error: ${error.message}`);
    }
  }

  console.log('\n📊 Results:');
  console.log(`   Success: ${successCount}`);
  console.log(`   Rate limited: ${rateLimitedCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (rateLimitedCount > 0) {
    console.log('✅ Rate limiting is working!');
    process.exit(0);
  } else {
    console.log('❌ Rate limiting not detected');
    process.exit(1);
  }
}

bombLeads().catch(console.error);
