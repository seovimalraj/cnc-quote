import { SloCalculator } from './lib/slo-calculator';
import { CadPipelineTester } from './lib/cad-pipeline-tester';
import { PaymentTester } from './lib/payment-tester';
import fs from 'fs/promises';
import path from 'path';

interface SloConfig {
  ttfp_p95_target: number;     // Time to first price P95 target (ms)
  cad_p95_target: number;      // CAD analysis P95 target (ms)
  order_p95_target: number;    // Payment to order P95 target (ms)
  runs: number;                // Number of test runs
}

async function main() {
  // Configuration
  const config: SloConfig = {
    ttfp_p95_target: 2000,    // 2 seconds
    cad_p95_target: 20000,    // 20 seconds
    order_p95_target: 10000,  // 10 seconds
    runs: 20
  };

  // Initialize SLO calculator
  const calculator = new SloCalculator();
  calculator.addSlo('time_to_first_price', config.ttfp_p95_target);
  calculator.addSlo('cad_analysis_time', config.cad_p95_target);
  calculator.addSlo('payment_to_order', config.order_p95_target);

  // Initialize testers
  const cadTester = new CadPipelineTester(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    process.env.API_URL!,
    process.env.JWT_TOKEN!
  );

  const paymentTester = new PaymentTester({
    stripeSecret: process.env.STRIPE_SECRET_KEY!,
    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookEndpoint: `${process.env.API_URL}/api/payments/stripe/webhook`,
    apiUrl: process.env.API_URL!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_ANON_KEY!,
    token: process.env.JWT_TOKEN!
  });

  // Run tests
  for (let i = 0; i < config.runs; i++) {
    try {
      // Test 1: Time to first price
      const ttfpStart = Date.now();
      const cadResult = await cadTester.runTest(path.join(__dirname, 'test-files/bracket.step'));
      
      if (cadResult.success) {
        calculator.addMeasurement('time_to_first_price', {
          duration: Date.now() - ttfpStart,
          success: true
        });
        
        // Test 2: CAD analysis time
        calculator.addMeasurement('cad_analysis_time', {
          duration: cadResult.timings.analysisDuration,
          success: true
        });

        // Test 3: Payment to order time
        const paymentResult = await paymentTester.runTest(cadResult.fileId);
        
        if (paymentResult.success) {
          calculator.addMeasurement('payment_to_order', {
            duration: paymentResult.timings.totalDuration,
            success: true
          });
        } else {
          calculator.addMeasurement('payment_to_order', {
            duration: 0,
            success: false,
            error: paymentResult.error
          });
        }
      } else {
        ['time_to_first_price', 'cad_analysis_time'].forEach(slo => {
          calculator.addMeasurement(slo, {
            duration: 0,
            success: false,
            error: cadResult.error
          });
        });
      }
    } catch (error: any) {
      ['time_to_first_price', 'cad_analysis_time', 'payment_to_order'].forEach(slo => {
        calculator.addMeasurement(slo, {
          duration: 0,
          success: false,
          error: { message: error.message }
        });
      });
    }

    // Small delay between runs to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate results
  const metrics = calculator.calculateMetrics();
  const passed = calculator.verifyThresholds();

  // Prepare report
  const report = {
    timestamp: new Date().toISOString(),
    config,
    metrics,
    passed
  };

  // Write report
  await fs.writeFile(
    path.join(__dirname, 'slos-report.json'),
    JSON.stringify(report, null, 2)
  );

  Object.entries(metrics).forEach(([slo, data]) => {
  });

  process.exit(passed ? 0 : 1);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
