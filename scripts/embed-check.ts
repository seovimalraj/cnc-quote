import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

interface TestConfig {
  embedTestUrl: string;
  widgetUrl: string;
  allowedOrigins: string[];
  disallowedOrigins: string[];
}

interface TestResult {
  origin: string;
  allowed: boolean;
  success: boolean;
  cspBlocked: boolean;
  corsBlocked: boolean;
  receivedPriceUpdate: boolean;
  logs: string[];
}

async function runTest(browser: puppeteer.Browser, config: TestConfig, origin: string): Promise<TestResult> {
  const page = await browser.newPage();
  const result: TestResult = {
    origin,
    allowed: config.allowedOrigins.includes(origin),
    success: false,
    cspBlocked: false,
    corsBlocked: false,
    receivedPriceUpdate: false,
    logs: []
  };

  try {
    // Listen for console logs
    page.on('console', (msg) => {
      const text = msg.text();
      result.logs.push(text);
      
      // Check for specific events
      if (text.includes('[ERROR] Failed to load')) {
        result.corsBlocked = true;
      }
      if (text.includes('Content Security Policy')) {
        result.cspBlocked = true;
      }
      if (text.includes('[SUCCESS] Received price update')) {
        result.receivedPriceUpdate = true;
      }
    });

    // Navigate to test page with parameters
    const testUrl = new URL(config.embedTestUrl);
    testUrl.searchParams.set('widget_url', config.widgetUrl);
    testUrl.searchParams.set('mock_origin', origin);
    
    await page.goto(testUrl.toString(), {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for potential price update or error
    await page.waitForTimeout(5000);

    // Get success status
    result.success = 
      result.allowed === !result.cspBlocked && 
      result.allowed === !result.corsBlocked &&
      result.allowed === result.receivedPriceUpdate;

  } catch (error: any) {
    result.logs.push(`Test error: ${error.message}`);
    result.success = false;
  } finally {
    await page.close();
  }

  return result;
}

async function main() {
  // Configuration
  const config: TestConfig = {
    embedTestUrl: process.env.EMBED_TEST_URL || 'http://localhost:3000/embed-test.html',
    widgetUrl: process.env.WIDGET_URL || 'http://localhost:3000/widget',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    disallowedOrigins: (process.env.DISALLOWED_ORIGINS || 'http://evil.com,http://untrusted.com').split(',')
  };

  console.log('Starting widget embed tests...\n');
  console.log('Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const results = [];
    
    // Test allowed origins
    for (const origin of config.allowedOrigins) {
      console.log(`Testing allowed origin: ${origin}...`);
      const result = await runTest(browser, config, origin);
      results.push(result);
      
      if (result.success) {
        console.log('✓ Test passed');
      } else {
        console.log('✗ Test failed');
        if (result.cspBlocked) console.log('  - Blocked by CSP');
        if (result.corsBlocked) console.log('  - Blocked by CORS');
      }
      console.log('');
    }

    // Test disallowed origins
    for (const origin of config.disallowedOrigins) {
      console.log(`Testing disallowed origin: ${origin}...`);
      const result = await runTest(browser, config, origin);
      results.push(result);
      
      if (result.success) {
        console.log('✓ Test passed (properly blocked)');
      } else {
        console.log('✗ Test failed (not properly blocked)');
      }
      console.log('');
    }

    // Write log files
    for (const result of results) {
      const filename = `embed-${result.allowed ? 'allowed' : 'blocked'}.log`;
      await fs.writeFile(
        path.join(__dirname, filename),
        result.logs.join('\n')
      );
    }

    // Exit with success if all tests passed
    const allPassed = results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);

  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
