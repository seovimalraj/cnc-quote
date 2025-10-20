# DFM Insight Co-Pilot Implementation Plan

## Mission Alignment
- Objective: Surface deterministic, tenant-safe guidance that complements existing DFM pass/fail outcomes without mutating pricing or compliance status.
- Fault Domain Boundaries: CAD service performs inference; API handles persistence and delivery; Web consumes shared contracts for UI rendering.

## Data & Schema Work (Supabase)
1. Run migration `2025_10_20_002_create_dfm_copilot_tables.sql` to provision:
   - `dfm_annotation_corpus`: curated, optionally tenant-scoped annotations with remediation context.
   - `dfm_copilot_samples`: fine-tuning records linked to corpus entries and geometry hashes.
   - `dfm_copilot_models`: registry for LoRA/adapter artefacts, status transitions, and evaluation metrics.
   - `dfm_copilot_insights`: per-quote inference ledger storing JSON guidance and trace metadata.
2. Validate RLS with `qa:check-rls` ensuring tenant isolation and service-role bypass for workers.
3. Extend seeds (phase 2) with synthetic baseline annotations to unblock bootstrap training.

## Shared Contracts (`packages/shared`)
1. Add Zod schemas and TS types:
   - `DfmInsightGuidance`: structured text blocks, severity, suggested ops.
   - `DfmCopilotInsight`: heading, summary, machine hints, span trace id.
   - `DfmCopilotInferenceRequest`: quote + part identifiers, geometry hash, feature flag token.
   - `DfmCopilotInferenceResponse`: array of insights, model version, latency metrics.
2. Export enums for process type, severity to keep web/api/cad in sync.
3. Regenerate compiled types where consumed (API DTOs, Next.js client types).

## CAD Service (FastAPI + Celery)
1. Introduce feature flag guard (`COPILOT_INFERENCE_ENABLED`) sourced from Supabase config service.
2. New modules:
   - `/app/services/copilot_client.py`: wraps Supabase storage + HuggingFace Inference endpoints; instruments OTel span `cad.dfm.copilot.infer` and Prometheus histogram `dfm_copilot_inference_latency`.
   - `/app/workers/copilot_training.py`: BullMQ-triggered webhook consumer for dataset snapshots (phase 2).
3. Endpoint additions:
   - POST `/dfm/copilot/infer`: accepts `DfmCopilotInferenceRequest`; enqueues Celery task `copilot_infer_async`.
   - Celery task performs: fetch latest published model metadata → hydrate prompt via adapter template → invoke inference (ensure deterministic temperature) → persist result via Supabase REST (service key) into `dfm_copilot_insights`.
4. Telemetry & Observability:
   - Capture `trace_id` from incoming headers; propagate to Supabase insert.
   - Log structured `guidance_count`, `geometry_hash`, `model_version` via Pino adapter.
5. Backpressure and retries: configure Celery queue `dfm_copilot_inference` with exponential retry, dead-letter to `dfm_copilot_inference_dlq`.

## API Service (NestJS)
1. Module: `DfmCopilotModule` with gated controller `POST /v1/dfm/copilot/infer`.
   - Validate feature flag `dfmCopilot.enabled` (wrapping LaunchDarkly/ConfigCat whichever is present).
   - Enforce manual review status unchanged; inference is advisory only.
2. Service flow:
   - Accept request DTO using shared types.
   - Invoke CAD service endpoint via internal HTTP client (BullMQ job `cad-dfm-copilot-inference` for async fan-out).
   - Return 202 Accepted with job id; Web polls `GET /v1/dfm/copilot/insights?quoteId=` to fetch results from Supabase view.
3. Persistence read side:
   - Prisma model mapping `dfm_copilot_insights` (read only) with row-level filters.
   - Provide GraphQL/resolver exposures for web; ensure caching via Redis with geometry hash TTL (invalidate on new CAD upload hash).
4. Observability:
   - Wrap request handling in OTel span `api.dfm.copilot.request` with attributes (org, quote, part, geometry hash).
   - Meter number of insights served via Prometheus counter `dfm_copilot_insights_served_total`.

## Web Application (Next.js)
1. Feature flag gating in server components; hide UI if disabled.
2. Create React query for `/copilot/insights` returning typed data.
3. Render guidance in new panel with severity badges, remediation steps, and trace link (to Grafana/Otel UI).
4. Ensure no pricing metadata mutated; mark messages as "Advisory" with tooltip referencing revision id.

## Worker / Pipelines
1. Extend `apps/worker` queue definitions with `dfmCopilotInferenceQueue` bridging API requests to CAD service.
2. Implement scheduled BullMQ job to snapshot `dfm_annotation_corpus` into S3 (nightly) for offline evaluation.
3. Track training tasks by enqueuing `dfm_copilot_model_training` with Supabase entries set to `status='training'`.

## Testing & QA
1. Unit tests:
   - Shared schema validation for new types (zod parsing success/failure cases).
   - API service tests verifying feature flag gating, Redis cache behavior.
   - CAD service tests mocking inference client and ensuring telemetry emission.
2. Integration tests:
   - End-to-end pipeline harness using synthetic STEP file → manual annotation → inference result persisted.
   - QA script additions under `scripts/qa-runner.cjs` to include `dfmCopilot` suite.
3. Security regression:
   - Update `qa:check-rls` scenarios for new tables.
   - Validate Supabase policies block cross-tenant access.

## Rollout Strategy
1. Phase 0 (Schema only): deploy migration; no service changes.
2. Phase 1 (Read path): deliver API + Web read-only view using mocked data seeded into `dfm_copilot_insights`.
3. Phase 2 (Inference path): enable CAD endpoint + worker queue behind feature flag for pilot customers.
4. Phase 3 (Training automation): add dataset sampling jobs, Supabase storage of adapters, continuous evaluation metrics.

## Open Questions
- Confirm canonical `quote_id`/`part_id` references for Supabase table (quotes vs quote_revisions).
- Determine hosting for LoRA adapters (Supabase storage vs S3) and required IAM scopes.
- Align feature flag provider naming across services to avoid drift (`dfmCopilot`, `dfm_copilot`).
