# Pricing Auth & Guard Hardening

Status: Backlog
Owner: API Platform
Last Updated: 2025-10-23

## Goals
- Consistent, verifiable authorization on all pricing paths
- Simpler QA/self-test surface for CI and monitoring

## Tasks
1. Replace ad-hoc `JwtAuthGuard + OrgGuard + PoliciesGuard` on `PricingController` with:
   - `@UseGuards(AuthGuard('jwt'), RbacGuard('view', 'pricing'))`
   - Ensure `req.user` is populated by `JwtStrategy` and RBAC context is attached (org from header or user default)
2. Update `OrgGuard` to accept `X-Org-Id` header fallback when JWT lacks `org_id` (mirrors `RbacGuard` behavior) and add tests.
3. Add `GET /v1/price/self-test`:
   - Returns `{ ok: true, engine: { orchestratorVersion, factorsVersion }, cache: { ready } }`
   - Protected by `AuthGuard('jwt')` only or allow a health token header for CI environments
4. Expand web proxies to handle health/self-test pass-through for `/api/price/self-test`.
5. CI: Add a QA step that calls `self-test` and v2 calculate with a signed token (service account) and asserts 200.
6. Documentation: Update `docs/QA_GUIDE.md` with auth options for CI and the self-test endpoint flow.

## Acceptance Criteria
- Authenticated requests with `X-Org-Id` succeed across pricing routes.
- Unauthenticated requests are rejected with 401 (except health/self-test as configured).
- `self-test` is callable in CI without exposing sensitive data.
- QA runs are green in prod-like environments exercising real v2 pricing.
