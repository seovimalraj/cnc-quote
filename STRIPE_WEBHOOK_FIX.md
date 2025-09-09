# Stripe Webhook Configuration Fix

## Problem
Stripe webhook signature validation is failing, causing payment processing to fail.

## Root Cause
The `STRIPE_WEBHOOK_SECRET` environment variable is either:
1. Not set
2. Set to the wrong value
3. The webhook endpoint secret in Stripe dashboard doesn't match

## Solution Steps

### 1. Check Environment Variables
Ensure the following environment variables are set correctly:

```bash
# Required environment variables
STRIPE_SECRET_KEY=sk_live_...          # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook endpoint secret
STRIPE_PUBLISHABLE_KEY=pk_live_...     # Publishable key
```

### 2. Get Webhook Endpoint Secret from Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers > Webhooks**
3. Find your webhook endpoint (should point to `/api/payments/webhook`)
4. Click on the endpoint to view details
5. Copy the **Signing secret** (starts with `whsec_`)

### 3. Update Environment Variables

Update your environment configuration with the correct webhook secret:

```bash
# In your .env file or environment configuration
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

### 4. Test Webhook Locally (Development)

If testing locally, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI if not already installed
# Then login and forward webhooks
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook
```

The CLI will provide a webhook signing secret that you should use for local development.

### 5. Verify Webhook Events

After updating the secret, test with a real payment to ensure:
- Webhook signature verification passes
- Payment events are processed correctly
- No 400 errors in webhook logs

### 6. Production Deployment

For production deployment:
1. Ensure the production webhook endpoint is configured in Stripe
2. Use the production webhook signing secret
3. Test with a small payment to verify everything works
4. Monitor webhook logs for any signature verification failures

## Files to Check
- `/apps/web/src/app/api/payments/webhook/route.ts` - Webhook handler
- Environment configuration files
- Stripe dashboard webhook settings

## Testing
After applying the fix, run the QA suite again to verify the payment tests pass:

```bash
pnpm qa:check-payment
```
