#!/usr/bin/env node

/**
 * Payment Flow Checker
 * Validates payment processing and webhook handling
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function checkPayment() {
  console.log('💳 Checking Payment Flow...\n');

  try {
    // Test payment configuration
    console.log('  → Testing payment configuration');
    const configResponse = await fetch(`${API_URL}/api/payments/config`);

    if (configResponse.status === 200) {
      console.log('    ✅ Payment configuration accessible');
    } else {
      console.log(`    ❌ Payment config failed (${configResponse.status})`);
      return false;
    }

    // Test checkout session creation (mock)
    console.log('  → Testing checkout session creation');
    const checkoutResponse = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote_id: 'test-quote-123',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel'
      })
    });

    if (checkoutResponse.status === 200) {
      const data = await checkoutResponse.json();
      if (data.url && data.url.includes('checkout.stripe.com')) {
        console.log('    ✅ Checkout session creation successful');
      } else {
        console.log('    ❌ Invalid checkout session response');
        return false;
      }
    } else {
      console.log(`    ❌ Checkout session failed (${checkoutResponse.status})`);
      return false;
    }

    // Test webhook endpoint
    console.log('  → Testing webhook endpoint');
    const webhookResponse = await fetch(`${API_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_123' } }
      })
    });

    if (webhookResponse.status === 200 || webhookResponse.status === 400) {
      console.log('    ✅ Webhook endpoint responsive');
    } else {
      console.log(`    ❌ Webhook endpoint failed (${webhookResponse.status})`);
      return false;
    }

    console.log('\n✅ Payment Flow check PASSED');
    return true;

  } catch (error) {
    console.log(`❌ Payment Flow check FAILED: ${error.message}`);
    return false;
  }
}

checkPayment().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);
