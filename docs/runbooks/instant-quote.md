# Instant Quote Upload Runbook

Date: 2025-10-23
Owner: Web + API

## Scope

Incident response for authenticated CAD upload and quote creation pipeline:
- Web: `/instant-quote` workspace, `MultiFileUpload` component
- API proxy: Next.js app routes under `/api/files/*` and `/api/quotes*`
- Backend: `POST /files/direct`, `POST /quotes`, `POST /quotes/{id}/parts`
- Pricing: `/ws/pricing` and `POST /price/v2/recalculate` via `/api/price/v2/recalculate`

## Symptoms
- Users see 400/401/403 on upload
- Upload progress stalls before completion
- Quote not created after upload completes
- Realtime pricing not streaming on quote page

## Triage Checklist
1) Authentication
- Confirm session exists in browser; verify Supabase token is set (apps) and cookies present
- In the browser devtools: request to `/api/files/direct` includes cookies; proxy injects Authorization and `x-org-id`

2) Proxy health
- Hit `/api/health` for liveness
- Check Nginx upstream routing for `/api/*` and `/ws/pricing`

3) Upload endpoint
- Inspect response body from `/api/files/direct` for error details (content-type JSON)
- Common causes: missing org, unsupported file type, size limits

4) Quote creation
- Verify `POST /api/quotes` or `/api/quotes/{id}/parts` succeeded after upload
- Check retry behavior in client logs (MultiFileUpload logs `Upload error` / `Quote linkage failed`)

5) Pricing channel
- On `/portal/quotes/{id}`, confirm websocket connects and emits `join_quote`
- If drift detected or patches missing, ensure `/api/price/v2/recalculate` returns 200

## Mitigations
- If auth missing: re-login, ensure correct org context; clear cookies and retry
- If proxy 5xx: failover or restart web container; verify API upstream health
- If file validation fails: inform user and confirm supported formats/extensions
- If quote linkage fails: retry from client (built-in 2 retries) or manually add part server-side
- If pricing stalls: force reconcile via `/api/price/v2/recalculate` with the quote_id and item_ids

## Escalation
- Backend on-call for persistent 5xx or queue backlogs
- Web on-call for proxy/header/header-mismatch issues
- Infra on-call for Nginx/SSL/WebSocket issues

## Observability
- Check Sentry for web exceptions
- Review API logs for `/files/direct` and `/quotes*` requests
- Inspect socket server logs for pricing channel errors

## Recovery Verification
- Upload small CAD sample (fixtures: `scripts/fixtures/parts/*.step`)
- Expect: progress to 100%, redirect to `/quotes/{id}`, quote page connects to pricing, initial matrix renders
