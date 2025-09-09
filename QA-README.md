# CNC Quote QA Runner v1.0

A comprehensive end-to-end testing framework for the CNC Quote platform, focusing on Instant Quote and DFM Analysis features.

## Overview

The QA Runner performs automated testing across multiple dimensions:

- **Preflight Checks**: Service availability and basic connectivity
- **Smoke Tests**: End-to-end user journey validation
- **Functional Tests**: Core business logic verification
- **UI Audit**: Accessibility and performance validation
- **Security Suite**: Security configuration verification
- **Publish Gate**: Production readiness assessment

## Quick Start

```bash
# Run full QA suite
pnpm qa

# Run individual checks
pnpm qa:check-rls
pnpm qa:check-pricing
pnpm qa:check-cad
pnpm qa:check-payment
pnpm qa:check-slos
pnpm qa:check-observability

# Test specific functionality
pnpm qa:test-storage-signed-url
pnpm qa:bomb-leads --count 10 --email spam@test.com
```

## Configuration

The QA Runner is configured via `qa-config.json`:

```json
{
  "env": {
    "web_url": "http://localhost:3000",
    "api_url": "http://localhost:3001",
    "cad_url": "http://localhost:8000",
    "auth": {
      "admin_email": "admin@example.com",
      "admin_password_env": "ADMIN_PASSWORD",
      "customer_email": "qa@company.com",
      "customer_password_env": "CUSTOMER_PASSWORD"
    }
  }
}
```

## Test Suites

### 1. Instant Quote E2E (`INSTANT_QUOTE_E2E`)
Tests the complete instant quote user journey:
- File upload and validation
- Lead capture modal
- Price locking
- Checkout session creation

### 2. DFM Analysis E2E (`DFM_ANALYSIS_E2E`)
Tests the dedicated DFM analysis flow:
- Form population and validation
- Analysis execution
- Results display
- QAP and report downloads

### 3. Functional Tests
- **RLS Policies**: Database security validation
- **Pricing Engine**: Calculation accuracy
- **CAD Pipeline**: Analysis processing
- **Payment Flow**: Transaction handling
- **Performance SLOs**: Response time validation
- **Observability**: Monitoring and logging

### 4. Security Suite
- CORS/CSP/HSTS headers validation
- Signed file URL enforcement
- Rate limiting verification

## Problem Classification & Autofixes

The QA Runner automatically:

1. **Classifies Problems**: Maps failures to severity levels and owners
2. **Applies Autofixes**: Runs automated remediation scripts
3. **Generates Reports**: Creates detailed problem and fix reports

### Example Problem Classification

```json
{
  "id": "PRB-001",
  "suite": "INSTANT_QUOTE_E2E",
  "fail_code": "IQ_PRICE_LOCK_FAIL",
  "severity": "major",
  "summary": "Price lock not persisted",
  "suggested_fix": "ENSURE_PUT_LEAD_ENDPOINT",
  "owner": "api"
}
```

## Autofix Recipes

Common automated fixes include:

- **API/CAD Service Restart**: `RESTART_API`, `RESTART_CAD`
- **Security Headers**: `ADD_CSP_HSTS_XFO`
- **Database Policies**: `RUN_PNPM_CHECK_RLS`
- **Performance**: `ENABLE_PRICE_CACHE`, `BATCH_CAD_TASKS`
- **File Handling**: `ALLOWLIST_MIME_TYPES`, `FORCE_SIGNED_URLS`

## Publish Gate

The QA Runner implements a strict publish gate that checks:

- ✅ All preflight checks pass
- ✅ E2E smoke tests pass 100%
- ✅ Functional tests exit with code 0
- ✅ UI audit meets Lighthouse thresholds
- ✅ Security suite passes
- ✅ No blocker/critical problems

### Gate Actions

**On Pass:**
- Tag release
- Trigger blue-green deployment
- Invalidate caches

**On Fail:**
- Create blocking report
- Assign owners to problems
- Allow subset re-runs after fixes

## Output & Reporting

Results are stored in `artifacts/qa-results.json`:

```json
{
  "preflight": [...],
  "smoke": [...],
  "functional": [...],
  "ui_audit": {...},
  "security": [...],
  "problems_found": [...],
  "autofix_applied": [...],
  "publish_gate": {
    "eligible": false,
    "reasons": ["IQ_PRICE_LOCK_FAIL", "A11Y_CONTRAST"]
  }
}
```

## Environment Setup

Ensure these services are running:

```bash
# Start all services
pnpm dev

# Or individually
cd apps/api && pnpm dev      # API on :3001
cd apps/web && pnpm dev      # Web on :3000
cd apps/cad-service && python main.py  # CAD on :8000
```

## Custom Configuration

Create a custom config file:

```bash
cp qa-config.json qa-config.staging.json
# Edit qa-config.staging.json with staging URLs
node scripts/qa-runner.js qa-config.staging.json
```

## Troubleshooting

### Common Issues

1. **Services not reachable**: Check ports and startup logs
2. **Authentication failures**: Verify test credentials
3. **File upload issues**: Check storage configuration
4. **Rate limiting**: Wait for cooldown or adjust test parameters

### Debug Mode

```bash
DEBUG=qa:* pnpm qa
```

## Contributing

When adding new tests:

1. Update `qa-config.json` with new test definitions
2. Add corresponding check scripts in `scripts/`
3. Update problem classification rules
4. Add autofix recipes for common failures
5. Test the full QA suite locally

## Integration

The QA Runner integrates with:

- **CI/CD**: Automated testing in deployment pipelines
- **Monitoring**: Real-time dashboards and alerts
- **Ticketing**: Automatic issue creation for failures
- **Notifications**: Slack/email alerts for gate status</content>
<parameter name="filePath">/workspaces/cnc-quote/QA-README.md
