# Quality Assurance (QA) Guide

This guide outlines the testing strategy and procedures for ensuring the quality of the CNC Quote Platform.

## 1. Testing Strategy

Our QA strategy is based on a multi-layered approach to testing:

-   **Unit Tests**: Focus on individual functions and components in isolation. They are fast and form the foundation of our testing pyramid.
-   **Integration Tests**: Test the interaction between different parts of the system, such as the API and the database.
-   **End-to-End (E2E) Tests**: Simulate real user scenarios by testing the application from the user's perspective, through the browser.
-   **Manual QA**: Exploratory testing and verification of complex user flows by the QA team.

## 2. Running Tests

### 2.1. Running All Tests
From the root of the project, you can run all tests (unit and E2E) with:
```bash
pnpm test
```

### 2.2. Running Unit Tests
Unit tests are written with Jest for the backend. To run them:
```bash
pnpm --filter @cnc-quote/api test
```

### 2.3. Running E2E Tests
E2E tests are written with Playwright.

#### Headless Mode
To run the E2E tests in a headless browser (as in a CI environment):
```bash
pnpm --filter @cnc-quote/web test:e2e
```

#### UI Mode
For debugging, it's useful to run the tests in UI mode, which provides a visual interface to step through the tests:
```bash
pnpm --filter @cnc-quote/web test:e2e:ui
```

### 2.4. Pricing and Compliance QA
Use the consolidated script to validate pricing paths and the compliance rollup job:

```bash
pnpm qa:check-pricing
```

The script supports the following environment variables:

- `WEB_URL` (default `http://localhost:3000`): Web app base URL. The script posts to `WEB_URL/api/pricing` which proxies to the backend when available and falls back to a deterministic estimate when the upstream API is unavailable.
- `API_URL` (default `http://localhost:3001`): API base URL. Used to query `/v1/monitoring/health` for a non-fatal health check.
- `WORKER_URL` (default `http://localhost:3001`): Worker health server URL. Used to trigger the compliance analytics rollup via `/tasks/compliance-rollup`.
- `WORKER_SECRET` (default `dev-secret`): Secret header for the worker task trigger.

Behavior notes:

- If the web pricing route isn’t available in the current environment, the script will skip the pricing check with a warning and continue.
- The API health check is non-fatal and provides visibility only.
- The compliance rollup trigger is also non-fatal in environments where the worker health server isn’t running; a warning is logged and the script continues.

This keeps QA runs green across local/dev where not all services may be running while still exercising the production paths when available. In pre-release and prod-like environments, ensure all URLs point to live services so the script validates end-to-end.

### 2.5. Admin Recalc Smoke (dry-run)

Run a non-destructive smoke test that previews and enqueues an org-scoped dry-run pricing recalc, then polls for completion and writes an artifact:

```bash
pnpm qa:check-recalc
```

Environment variables:

- `API_URL` (default `http://localhost:3001`): API base URL.
- `JWT_TOKEN` (required): Bearer token with admin privileges for the target org.

The script performs:

- `POST /admin/pricing/recalc/preview` to fetch eligible count, a sample of quote IDs (first 100), and min/max created_at.
- `POST /admin/pricing/recalc` with `dryRun: true` to enqueue a run and then polls `GET /admin/pricing/recalc-runs/:id` until it completes or times out.
- Writes `artifacts/recalc-smoke.json` with summary details.

Notes:

- This test exits successfully even if the run ends `partial` or is still running after the timeout in dev environments, to keep smoke runs non-blocking. Use metrics and run records to investigate failures.

## 3. QA Test Cases and Scenarios

Our test suite covers the following key areas of the application.

### 3.1. User Authentication
-   User registration and login.
-   Password reset.
-   Role-based access control (e.g., ensuring a regular user cannot access the admin dashboard).

### 3.2. File Upload and Analysis
-   Uploading single and multiple CAD files.
-   Verification of supported and unsupported file types.
-   Correctness of the DFM analysis results.

### 3.3. Quoting
-   Instant quote generation for different part geometries and configurations.
-   Accuracy of the pricing calculation.
-   Functionality of quantity and lead time adjustments.

### 3.4. Ordering and Payments
-   Checkout process with PayPal integration.
-   Order creation and status updates.

### 3.5. Admin Functionality
-   User and organization management.
-   Catalog and pricing configuration changes.
-   Order fulfillment workflow.

A detailed list of test cases can be found in our test management tool.

## 4. Reporting and Tracking Issues

-   **Issue Tracker**: We use GitHub Issues to track bugs and feature requests.
-   **Bug Report Template**: When reporting a bug, please include:
    -   A clear and descriptive title.
    -   Steps to reproduce the issue.
    -   Expected behavior.
    -   Actual behavior.
    -   Screenshots or videos if applicable.
    -   Information about the environment (e.g., browser, OS).

-   **Triage**: The development team triages new issues and assigns them a priority.

By following these procedures, we can maintain a high level of quality and ensure a reliable and robust platform for our users.
