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

### 2.4. Pricing Compliance Analytics Rollup
`pnpm qa:check-pricing` now validates the pricing API and triggers the nightly compliance rollup job via the worker health endpoint. Ensure `WORKER_URL` and `WORKER_SECRET` are set when running against non-default environments so the script can enqueue the BullMQ rollup. The job should succeed before QA sign-off to confirm compliance analytics coverage.

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
