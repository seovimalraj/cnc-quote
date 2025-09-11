#!/usr/bin/env node

/**
 * Simple test script to check instant quote page functionality
 * This can be run independently of Playwright
 */

const puppeteer = require('playwright');

async function testInstantQuotePage() {
  console.log('🚀 Starting instant quote page test...');

  const browser = await puppeteer.chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to instant quote page
    console.log('📄 Loading instant quote page...');
    await page.goto('http://localhost:3002/instant-quote');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for JavaScript errors
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Check if main elements are present
    console.log('🔍 Checking page elements...');

    const title = await page.$('h1');
    if (title) {
      const titleText = await title.textContent();
      console.log('✅ Page title found:', titleText);
    } else {
      console.log('❌ Page title not found');
    }

    // Check for file upload area
    const uploadArea = await page.$('input[type="file"], [data-dropzone], .dropzone');
    if (uploadArea) {
      console.log('✅ File upload area found');
    } else {
      console.log('❌ File upload area not found');
    }

    // Check for error messages
    const errorElements = await page.$$('.text-red-500, .text-red-600, .bg-red-50');
    if (errorElements.length > 0) {
      console.log('❌ Found error messages on page:', errorElements.length);
      for (const error of errorElements) {
        const text = await error.textContent();
        console.log('  Error:', text);
      }
    } else {
      console.log('✅ No error messages found');
    }

    // Check for console errors
    if (errors.length > 0) {
      console.log('❌ JavaScript errors found:', errors.length);
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No JavaScript errors found');
    }

    // Try to upload a test file
    console.log('📤 Testing file upload...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      // Create a simple test file
      const testFile = {
        name: 'test.stl',
        mimeType: 'model/stl',
        buffer: Buffer.from('test file content')
      };

      await fileInput.setInputFiles([testFile]);
      console.log('✅ Test file uploaded');

      // Wait a bit and check for any new errors
      await page.waitForTimeout(2000);

      const newErrors = await page.$$('.text-red-500, .text-red-600');
      if (newErrors.length > errorElements.length) {
        console.log('❌ New errors appeared after file upload');
      } else {
        console.log('✅ No new errors after file upload');
      }
    } else {
      console.log('⚠️ File input not found, skipping upload test');
    }

    // Check navigation
    console.log('🧭 Testing navigation...');
    const links = await page.$$('a[href]');
    console.log(`Found ${links.length} links on page`);

    for (const link of links.slice(0, 5)) { // Test first 5 links
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        try {
          const response = await page.request.get(`http://localhost:3002${href}`);
          if (response.status() >= 400) {
            console.log(`❌ Broken link: ${href} (${response.status()})`);
          }
        } catch (error) {
          console.log(`❌ Link error: ${href} (${error.message})`);
        }
      }
    }

    console.log('✅ Navigation test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

// Run the test
testInstantQuotePage().catch(console.error);
