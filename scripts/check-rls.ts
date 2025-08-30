import { RlsChecker, type TestResult } from './lib/rls-checker';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  // Load configuration
  const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    apiUrl: process.env.API_URL || 'http://localhost:3000'
  };

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    process.exit(1);
  }

  const checker = new RlsChecker(config);

  // Test cases
  await checker.runTest(
    'Quote Access',
    '/api/quotes/Q123456', // Replace with a real quote ID
    'org1@example.com',    // Replace with real test credentials
    'password123',
    'org2@example.com',
    'password123'
  );

  await checker.runTest(
    'Order Access',
    '/api/orders/O123456', // Replace with a real order ID
    'org1@example.com',    // Replace with real test credentials
    'password123',
    'org2@example.com',
    'password123'
  );

  // Get results and write to file
  const results = checker.getResults();
  const outputPath = path.join(__dirname, '..', 'rls-check.json');
  
  await fs.writeFile(
    outputPath,
    JSON.stringify(results, null, 2)
  );

  // Exit with appropriate code
  process.exit(results.success ? 0 : 1);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
