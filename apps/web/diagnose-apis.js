#!/usr/bin/env node

/**
 * Diagnostic script to test API endpoints and file upload functionality
 */

async function testAPIEndpoints() {
  console.log('🔍 Testing API endpoints...\n');

  const baseUrl = 'http://localhost:3002';

  // Test 1: Check if instant quote page loads
  try {
    console.log('1. Testing instant quote page...');
    const response = await fetch(`${baseUrl}/instant-quote`);
    if (response.ok) {
      console.log('✅ Instant quote page loads successfully');
    } else {
      console.log(`❌ Instant quote page failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Instant quote page error: ${error.message}`);
  }

  // Test 2: Check file upload API
  try {
    console.log('\n2. Testing file upload API...');
    const response = await fetch(`${baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test.stl',
        fileSize: 1024,
        contentType: 'model/stl'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ File upload API works');
      console.log(`   File ID: ${data.fileId}`);
      console.log(`   Signed URL: ${data.signedUrl ? 'Generated' : 'Missing'}`);
    } else {
      console.log(`❌ File upload API failed: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ File upload API error: ${error.message}`);
  }

  // Test 3: Check quote creation API
  try {
    console.log('\n3. Testing quote creation API...');
    const response = await fetch(`${baseUrl}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'web',
        guestEmail: null
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Quote creation API works');
      console.log(`   Quote ID: ${data.id}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Price: ${data.totalValue || 'Not set'}`);
    } else {
      console.log(`❌ Quote creation API failed: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Quote creation API error: ${error.message}`);
  }

  // Test 4: Check Supabase connection (if available)
  try {
    console.log('\n4. Testing Supabase connection...');
    // This would require the Supabase client, but let's check if the env vars are set
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log('✅ Supabase environment variables are set');
    } else {
      console.log('❌ Supabase environment variables missing');
    }
  } catch (error) {
    console.log(`❌ Supabase test error: ${error.message}`);
  }

  console.log('\n🏁 API diagnostics completed');
}

// Run diagnostics
testAPIEndpoints().catch(console.error);
