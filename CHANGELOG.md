## Unreleased

### Admin Pricing: Publish triggers repricing (Phase 4 kickoff)

- Shared contract `ContractsV1.PricingRecalcJobV1` added to standardize background repricing payloads.
- API now enqueues a pricing recalculation job on pricing config publish (org-scoped) via existing `pricing` queue.
- Pricing queue processor recognizes new job `recalculate-org-quotes` and safely accepts/logs for future processing.
- No customer-facing changes yet; reprice execution is stubbed pending worker iteration.

### Admin Pricing: Recalc preview and tracing

- Added `POST /admin/pricing/recalc/preview` to estimate blast radius (eligible item count) for scoped/dry-run repricing.
- Recalc worker now emits OTEL span events per item (success/failure) and aggregates processed/succeeded/failed/skipped for observability.
- Added Prometheus metrics for admin repricing runs and per-item outcomes/durations; available via the existing metrics endpoint.

### Admin Pricing: Preview guardrails, circuit-breaker, and QA smoke

- `POST /admin/pricing/recalc/preview` now returns `sampleQuoteIds` (first 100) and `minCreatedAt`/`maxCreatedAt` to assess blast radius.
- Recalc worker implements a circuit-breaker: early-stops the run if failure rate over the last N attempted items exceeds a configurable threshold.
	- Config via env: `PRICING_RECALC_CIRCUIT_WINDOW` (default 50), `PRICING_RECALC_CIRCUIT_THRESHOLD` (default 0.5).
	- Emits OTEL event `pricing.recalc.circuit_tripped` and increments `admin_pricing_recalc_circuit_tripped_total`.
- New QA script `pnpm qa:check-recalc` enqueues a dry-run and polls status, writing `artifacts/recalc-smoke.json`. Added to `qa-config.json` functional suites.

## 2025-10-23

### Web: Instant Quote Landing Gate

- Added server-side gating for `/instant-quote`: unauthenticated users now see a landing page with sign-in/sign-up calls to action.
- Authenticated users continue to the Instant Quote workspace.
- Documentation updated: `docs/INSTANT_QUOTE_SPEC.md` and `README.md` note the gated flow and required environment variables.
- This is a customer-facing behavior change; ensure Supabase environment values are configured in deployment.

### Authenticated Upload & Quote Creation

- Route alias: `/quotes/{id}` now redirects to `/portal/quotes/{id}` for a clean post-upload path.
- Enhanced Instant Quote to pass orgId/accessToken/baseUrl and to use `/api/*` proxies for all fetch/XHR.
- Added retry/backoff to uploads and quote creation with improved error states and logging.
- Persisted pricing store to sessionStorage (Zustand persist) for instant hydration after redirect.
- Added `/api/price/v2/recalculate` proxy; updated reconcile calls to use proxy.
- Added unit tests for retry logic and quote creation retry path.
- New runbook: `docs/runbooks/instant-quote.md` for incident response to upload failures.
