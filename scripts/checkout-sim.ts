import { PaymentTester } from './lib/payment-tester';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  // Validate environment
  const requiredEnv = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'API_URL',
    'JWT_TOKEN',
    'TEST_QUOTE_ID'
  ];

  for (const env of requiredEnv) {
    if (!process.env[env]) {
      console.error(`Error: ${env} environment variable is required`);
      process.exit(1);
    }
  }

  // Initialize tester
  const tester = new PaymentTester({
    stripeSecret: process.env.STRIPE_SECRET_KEY!,
    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY!,
    webhookEndpoint: `${process.env.API_URL}/api/payments/stripe/webhook`,
    apiUrl: process.env.API_URL!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_ANON_KEY!,
    token: process.env.JWT_TOKEN!
  });

  console.log('Starting payment pipeline test...\n');
  console.log(`Testing with quote ID: ${process.env.TEST_QUOTE_ID}`);

  // Run test
  const result = await tester.runTest(process.env.TEST_QUOTE_ID!);

  // Log results
  if (result.success) {
    console.log('✓ Test passed\n');
  } else {
    console.log('✗ Test failed\n');
    if (result.error) {
      console.log('Error:', result.error);
      console.log('');
    }
  }

  console.log('Checkout Details:');
  console.log(`  Session ID: ${result.checkout.sessionId}`);
  console.log(`  URL: ${result.checkout.url}`);
  console.log('');

  console.log('Payment Details:');
  console.log(`  ID: ${result.payment.id}`);
  console.log(`  Status: ${result.payment.status}`);
  console.log(`  Amount: ${result.payment.amount / 100} ${result.payment.currency.toUpperCase()}`);
  console.log('');

  console.log('Webhook Details:');
  console.log(`  Received: ${result.webhook.received}`);
  console.log(`  Status: ${result.webhook.statusCode}`);
  console.log(`  Event: ${result.webhook.eventType}`);
  console.log('');

  console.log('Order Details:');
  console.log(`  Order ID: ${result.order.orderId}`);
  console.log(`  Status: ${result.order.status}`);
  console.log(`  Amount: ${result.order.amount} ${result.order.currency}`);
  console.log('');

  // Write result files
  await Promise.all([
    fs.writeFile(
      path.join(__dirname, 'stripe-webhook.json'),
      JSON.stringify({
        paymentIntentId: result.payment.id,
        eventType: result.webhook.eventType,
        statusCode: result.webhook.statusCode,
        timestamp: new Date().toISOString()
      }, null, 2)
    ),
    fs.writeFile(
      path.join(__dirname, 'order-created.json'),
      JSON.stringify({
        orderId: result.order.orderId,
        quoteId: result.order.quoteId,
        paymentId: result.order.paymentId,
        status: result.order.status,
        amount: result.order.amount,
        currency: result.order.currency,
        timestamp: new Date().toISOString()
      }, null, 2)
    )
  ]);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
