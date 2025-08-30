import { CadPipelineTester } from './lib/cad-pipeline-tester';
import path from 'path';

async function main() {
  // Validate environment
  const requiredEnv = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'API_URL',
    'JWT_TOKEN'
  ];

  for (const env of requiredEnv) {
    if (!process.env[env]) {
      console.error(`Error: ${env} environment variable is required`);
      process.exit(1);
    }
  }

  const tester = new CadPipelineTester(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    process.env.API_URL!,
    process.env.JWT_TOKEN!
  );

  // Test files (these should be in your test-files directory)
  const testFiles = [
    {
      name: 'Bracket',
      path: path.join(__dirname, 'test-files', 'bracket.step')
    },
    {
      name: 'Sheet Part',
      path: path.join(__dirname, 'test-files', 'sheet-part.dxf')
    },
    {
      name: 'Complex Part',
      path: path.join(__dirname, 'test-files', 'complex-part.stl')
    }
  ];

  console.log('Starting CAD Pipeline Tests\n');
  const results = [];

  for (const file of testFiles) {
    console.log(`Testing ${file.name}...`);
    
    const result = await tester.runTest(file.path);
    results.push({
      fileName: file.name,
      ...result
    });

    if (result.success) {
      console.log('✓ Success');
      console.log(`  Upload time:    ${result.timings.uploadDuration}ms`);
      console.log(`  Analysis time:  ${result.timings.analysisDuration}ms`);
      console.log(`  GLTF time:      ${result.timings.gltfDuration}ms`);
      console.log(`  Total time:     ${result.timings.totalDuration}ms`);
      
      if (result.metrics.bbox && result.metrics.volume_cm3) {
        console.log('  Metrics:');
        console.log(`    Volume:    ${result.metrics.volume_cm3.toFixed(2)} cm³`);
        console.log(`    Bounding:  [${result.metrics.bbox.map(n => n.toFixed(2)).join(', ')}]`);
      }
    } else {
      console.log('✗ Failed');
      console.log('  Error:', result.error.message);
    }
    console.log('');
  }

  // Write report
  const reportPath = path.join(__dirname, 'cad-analyze-report.json');
  await CadPipelineTester.writeReport(results, reportPath);
  console.log(`Report written to: ${reportPath}`);

  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
