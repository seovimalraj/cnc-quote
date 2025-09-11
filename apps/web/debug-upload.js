#!/usr/bin/env node

/**
 * Debug script to test file upload API locally
 */

async function testFileUpload() {
  console.log('🔍 Testing file upload API...\n');

  const baseUrl = 'http://localhost:3005';

  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed');
      console.log('Environment status:', healthData.environment);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }

  try {
    console.log('\n2. Testing file upload endpoint...');
    const uploadResponse = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test.stl',
        fileSize: 1024,
        contentType: 'model/stl'
      })
    });

    console.log('Response status:', uploadResponse.status);
    console.log('Response headers:', Object.fromEntries(uploadResponse.headers.entries()));

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('✅ File upload API works');
      console.log('Response:', uploadData);
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ File upload API failed');
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.log('❌ File upload request error:', error.message);
  }
}

// Run the test
testFileUpload().catch(console.error);
