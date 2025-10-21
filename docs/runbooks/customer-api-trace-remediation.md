# Customer API Trace Remediation Guide

This runbook outlines immediate fixes and long-term safeguards for each finding raised by `scripts/audit/customer-api-trace.ts`. Use it during triage to unblock deploys and keep the CNC quote flow deterministic and observable.

## Missing Route

**Symptoms**
- Customer web call has no matching NestJS controller route.
- Audit shows `missing_route` with high severity.

**Immediate Response**
- Confirm the frontend path and HTTP verb in `apps/web`.
- Add or update the corresponding controller decorator (e.g., `@Post('/api/price/v2/calculate')`).
- Run `pnpm lint` and `pnpm test` for the affected module.

**Long-Term Safeguards**
- Backfill an integration test that exercises the new endpoint.
- If the route is intentionally missing, feature-flag the client call and document the flag owner.

## Verb Mismatch

**Symptoms**
- Client verb differs from the controller decorator.
- Audit shows `verb_mismatch` (medium severity).

**Immediate Response**
- Align controller decorator to the intended verb or adjust the client call.
- Ensure idempotent verbs (`GET`, `HEAD`) never mutate state.

**Long-Term Safeguards**
- Store shared route definitions in `packages/shared` to avoid drift.
- Add a unit test that fails when the controller verb changes unexpectedly.

## Status Mismatch

**Symptoms**
- Controller lacks declared status codes handled by the client.
- Audit lists `status_mismatch` (medium severity).

**Immediate Response**
- Add `@HttpCode` or `@ApiResponse` decorators to cover the statuses the client expects.
- Update client handling if the status should no longer be consumed.

**Long-Term Safeguards**
- Use shared enums for status codes to avoid magic numbers.
- Extend contract tests to assert documented statuses.

## Permission Gap

**Symptoms**
- Controller exposed without guards or policies.
- Audit reports `permission_gap` (high severity).

**Immediate Response**
- Add appropriate guard decorators (`@UseGuards`, `@Policies`, `@RequirePermissions`).
- Validate RLS policies for the associated Prisma queries.

**Long-Term Safeguards**
- Include guard checks in module unit tests.
- Document intentional public routes in `docs/governance` with owner approval.

## DTO Inconsistent

**Symptoms**
- Controller uses `any`/`unknown` payloads or missing shared DTO references.
- Audit marks `dto_inconsistent` (medium severity).

**Immediate Response**
- Replace loose types with shared DTOs from `packages/shared` or generated Prisma Zod schemas.
- Run `pnpm generate` if new Prisma DTOs are required.

**Long-Term Safeguards**
- Add type-only imports to enforce DTO usage across controllers.
- Update contract validation tests to fail when DTOs drift.

## Method Body Mismatch

**Symptoms**
- GET request sending a body payload.
- Audit records `method_body_mismatch` (medium severity).

**Immediate Response**
- Move payload to query parameters or convert the route to POST.
- Re-run the affected journey fixture to confirm alignment.

**Long-Term Safeguards**
- Introduce lint rules or shared helpers preventing bodies on `fetch` GET calls.
- Document any unavoidable exceptions with architectural approval.

## Observability Gap

**Symptoms**
- Missing trace headers or span instrumentation.
- Audit highlights `observability_gap` (medium or low severity).

**Immediate Response**
- Inject trace headers (e.g., `x-trace-id`) using shared telemetry helpers.
- Wrap the call in `tracer.startActiveSpan` or `withSpan`.

**Long-Term Safeguards**
- Add OpenTelemetry middleware for the client abstraction in `apps/web`.
- Ensure span coverage metrics are enforced in CI via `scripts/check-observability.js`.

## Resilience Gap

**Symptoms**
- Client call lacks retry/backoff handling.
- Audit flags `resilience_gap` (low severity).

**Immediate Response**
- Wrap transport in `withRetry` or the shared exponential backoff helper.
- Align retry policy with BullMQ job semantics.

**Long-Term Safeguards**
- Add contract tests validating retry behaviour for transient 5xx failures.
- Document retry policies per endpoint in `docs/runbooks/observability.md`.

## Cache Gap

**Symptoms**
- Pricing controller bypasses or misconfigures Redis cost caching.
- Audit raises `cache_gap` (critical/high/medium severity).

**Immediate Response**
- Wrap the controller logic with `pricingCache.withCache`.
- Ensure `buildHashPayload`, `request.buildHashPayload`, and `control.ttlSeconds`/`control.hotPath`/`control.bust` are set.
- Call `decorateCacheHeaders` so clients observe cache hints.

**Long-Term Safeguards**
- Add regression tests that mock Redis and assert cache keys include geometry hashes.
- Monitor Redis hit ratio dashboards; alert when TTL drift exceeds policy.

## Contract Drift

**Symptoms**
- Customer panels and worker processors import the same shared contract, but the Nest controller omits it.
- Audit reports `contract_drift` (high severity) and lists worker file paths.

**Immediate Response**
- Update the controller method to validate against the shared Zod schema or DTO exported from `packages/shared`.
- Confirm the worker processor parses the same schema version; regenerate types if the contract changed.
- Rerun `pnpm ts-node scripts/audit/customer-api-trace.ts` to verify the drift clears.

**Long-Term Safeguards**
- Centralize queue payload and response types in `packages/shared`, referenced by both API and worker.
- Extend integration tests to assert controller responses satisfy the shared Zod schema.
- Document contract ownership and versioning in `/docs/governance`, including release coordination steps.
