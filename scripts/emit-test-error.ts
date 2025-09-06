import * as Sentry from '@sentry/node';
import { createClient } from '@supabase/supabase-js';
import PostHog from 'posthog-node';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

interface TestResult {
  success: boolean;
  sentryIssues: {
    web?: string;
    api?: string;
  };
  posthogEvents: string[];
  healthStatus: {
    api: boolean;
    cad: boolean;
    queues: boolean;
    stripe: boolean;
    database: boolean;
  };
}

async function main() {
  // Initialize clients
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: 'test'
  });

  const posthog = new PostHog(
    process.env.POSTHOG_API_KEY!,
    { host: process.env.POSTHOG_HOST }
  );

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // Get auth token
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!
  });

  if (!session) {
    throw new Error('Failed to authenticate');
  }

  const result: TestResult = {
    success: false,
    sentryIssues: {},
    posthogEvents: [],
    healthStatus: {
      api: false,
      cad: false,
      queues: false,
      stripe: false,
      database: false
    }
  };

  try {
    // Step 1: Emit test errors

    // API error
    try {
      throw new Error('Test API Error');
    } catch (error: any) {
      Sentry.withScope(scope => {
        scope.setTag('org_id', session.user.user_metadata.org_id);
        scope.setTag('request_id', 'test-api-request');
        Sentry.captureException(error);
      });
    }

    // Web error (via API endpoint)
    await fetch(`${process.env.API_URL}/api/test/error`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    // Wait for Sentry to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get Sentry issues
    const sentryResponse = await fetch(
      `https://sentry.io/api/0/projects/${process.env.SENTRY_ORG}/${process.env.SENTRY_PROJECT}/issues/?query=test+error&statsPeriod=1h`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`
        }
      }
    );

    const issues = await sentryResponse.json();
    result.sentryIssues = {
      api: issues.find((i: any) => i.title.includes('API'))?.permalink,
      web: issues.find((i: any) => i.title.includes('Web'))?.permalink
    };

    // Step 2: Generate PostHog events

    posthog.capture({
      distinctId: 'test-user',
      event: 'file_upload',
      properties: {
        org_id: session.user.user_metadata.org_id,
        file_type: 'step'
      }
    });

    posthog.capture({
      distinctId: 'test-user',
      event: 'quote_created',
      properties: {
        org_id: session.user.user_metadata.org_id,
        process: 'cnc'
      }
    });

    // Step 3: Check system health page

    const browser = await puppeteer.launch({
      headless: 'new'
    });

    try {
      const page = await browser.newPage();
      
      // Login
      await page.goto(`${process.env.WEB_URL}/admin/login`);
      await page.fill('[data-test="email"]', process.env.ADMIN_EMAIL!);
      await page.fill('[data-test="password"]', process.env.ADMIN_PASSWORD!);
      await page.click('[data-test="submit"]');
      
      // Navigate to health page
      await page.goto(`${process.env.WEB_URL}/admin/system-health`);
      await page.waitForSelector('[data-test="health-status"]');

      // Take screenshot
      await page.screenshot({
        path: path.join(__dirname, 'system-health-screenshot.png'),
        fullPage: true
      });

      // Check status indicators
      result.healthStatus.api = await page.$eval('[data-test="api-status"]', el => el.classList.contains('status-ok'));
      result.healthStatus.cad = await page.$eval('[data-test="cad-status"]', el => el.classList.contains('status-ok'));
      result.healthStatus.queues = await page.$eval('[data-test="queues-status"]', el => el.classList.contains('status-ok'));
      result.healthStatus.stripe = await page.$eval('[data-test="stripe-status"]', el => el.classList.contains('status-ok'));
      result.healthStatus.database = await page.$eval('[data-test="db-status"]', el => el.classList.contains('status-ok'));

      // Save PostHog funnel screenshot
      await page.goto(`${process.env.WEB_URL}/admin/analytics/funnels`);
      await page.waitForSelector('[data-test="funnel-chart"]');
      await page.screenshot({
        path: path.join(__dirname, 'posthog-funnel.png'),
        fullPage: true
      });

    } finally {
      await browser.close();
    }

    // Step 4: Write results
    result.success = 
      !!result.sentryIssues.api &&
      !!result.sentryIssues.web &&
      Object.values(result.healthStatus).every(status => status);

    await fs.writeFile(
      path.join(__dirname, 'sentry-issues-links.txt'),
      Object.entries(result.sentryIssues)
        .map(([type, url]) => `${type}: ${url}`)
        .join('\n')
    );

    Object.entries(result.healthStatus).forEach(([service, status]) => {
    });

  } catch (error) {
    console.error('Test failed:', error);
    result.success = false;
  }

  // Cleanup
  posthog.shutdown();
  process.exit(result.success ? 0 : 1);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
