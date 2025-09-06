import { PriceTester } from './lib/price-tester';
import path from 'path';
import fs from 'fs/promises';

async function main() {
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const token = process.env.JWT_TOKEN;

  if (!token) {
    console.error('Error: JWT_TOKEN environment variable is required');
    process.exit(1);
  }

  const tester = new PriceTester(apiUrl, token);
  const payloadsDir = path.join(__dirname, 'payloads');
  
  // Load test payloads
  const [cncPayload, sheetPayload, imPayload] = await Promise.all([
    fs.readFile(path.join(payloadsDir, 'payload-cnc.json'), 'utf-8'),
    fs.readFile(path.join(payloadsDir, 'payload-sheet.json'), 'utf-8'),
    fs.readFile(path.join(payloadsDir, 'payload-im.json'), 'utf-8')
  ].map(p => p.then(JSON.parse)));

  // Run tests in parallel
  const results = await Promise.all([
    tester.runTest('CNC', cncPayload),
    tester.runTest('SHEET', sheetPayload),
    tester.runTest('IM', imPayload)
  ]);

  // Write results
  await PriceTester.writeResults(results, __dirname);

  // Log summary

  for (const result of results) {
    if (!result.success && result.error) {
    }
  }  // Exit with status based on all tests passing
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
