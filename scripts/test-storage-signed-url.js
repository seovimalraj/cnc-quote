#!/usr/bin/env node

/**
 * Storage Signed URL Test
 * Validates signed URL generation and usage
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testStorageSignedUrl() {
  console.log('🔗 Testing Storage Signed URLs...\n');

  try {
    // Test signed URL generation
    console.log('  → Testing signed URL generation');
    const generateResponse = await fetch(`${API_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'test-file.step',
        contentType: 'application/step'
      })
    });

    if (generateResponse.status === 200) {
      const data = await generateResponse.json();
      if (data.signedUrl) {
        console.log('    ✅ Signed URL generated successfully');

        // Test signed URL usage (PUT request)
        console.log('  → Testing signed URL upload');
        const uploadResponse = await fetch(data.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/step',
          },
          body: 'test file content'
        });

        if (uploadResponse.status === 200) {
          console.log('    ✅ Signed URL upload successful');
        } else {
          console.log(`    ❌ Signed URL upload failed (${uploadResponse.status})`);
          return false;
        }

        // Test file access via API
        console.log('  → Testing file access via API');
        if (data.fileId) {
          const accessResponse = await fetch(`${API_URL}/api/files/${data.fileId}`);

          if (accessResponse.status === 200) {
            console.log('    ✅ File accessible via API');
          } else {
            console.log(`    ❌ File access failed (${accessResponse.status})`);
            return false;
          }
        }

      } else {
        console.log('    ❌ No signed URL in response');
        return false;
      }
    } else {
      console.log(`    ❌ Signed URL generation failed (${generateResponse.status})`);
      return false;
    }

    console.log('\n✅ Storage Signed URL test PASSED');
    return true;

  } catch (error) {
    console.log(`❌ Storage Signed URL test FAILED: ${error.message}`);
    return false;
  }
}

testStorageSignedUrl().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);
