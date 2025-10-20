# Evidence Register – CNC Quote Platform

**Purpose:** Track audit artifacts supporting SOC 2 and ISO/IEC 27001 control assertions.

| Evidence ID | Artifact | Location | Control Mapping | Owner | Last Reviewed |
|-------------|----------|----------|-----------------|-------|---------------|
| EV-001 | Data retention job execution logs | s3://cnc-quote-audit/retention/ | SOC2 CC8.1, ISO A.12 | Compliance Guild | _TBD_ |
| EV-002 | Incident postmortem reports | docs/runbooks/postmortems/ | SOC2 CC7.4 | SRE Manager | _TBD_ |
| EV-003 | Feature flag review minutes | linear://project/compliance | SOC2 CC6.1 | Product Ops | _TBD_ |
| EV-004 | Queue health metrics export | Grafana snapshot archive | SOC2 CC7.2 | Platform Ops | _TBD_ |
| EV-005 | Access review approvals | s3://cnc-quote-audit/access-reviews/ | ISO A.9 | Security Guild | _TBD_ |
| EV-006 | AI observability telemetry (spans, metrics, drift board) | Grafana board `AI Safety - Revision Assistant`; OTLP export in s3://cnc-quote-audit/otel/ai/; redacted prompt log in Supabase `admin_ai_prompts` | SOC2 CC7.2, ISO A.12.4 | AI Platform Lead | 2025-10-20 |
| EV-007 | AI regression & chaos validation artifacts | `artifacts/ai-regression/`; non-prod Ollama chaos logs in s3://cnc-quote-audit/ai-chaos/ | SOC2 CC7.1, ISO A.12.1 | QA Lead | _TBD_ |
| EV-008 | Dual-control approvals & audit trail | Supabase tables `admin_pricing_revision_approvals`, `admin_pricing_revision_runs` (`approval_state`, `proposal_digest`); Audit action `AI_ASSISTANT_APPROVED` exported via OTLP | SOC2 CC7.2, ISO A.12.4 | AI Platform Lead | _TBD_ |

_Update this table after each quarterly compliance review._

## AI Observability Controls

- **OpenTelemetry Coverage:** API, worker, and Ollama integrations emit spans named `ai.assistant.request`, `ai.assistant.process`, and `ai.assistant.generate` with attributes `org_id`, `trace_id`, `model`, `latency_ms`, and `result_status`. Metrics are exported via OTLP to the observability pipeline and surfaced on Grafana board `AI Safety - Revision Assistant`.
- **Redacted Prompt Storage:** Structured prompts/responses are persisted in Supabase table `admin_ai_prompts` with automated redaction (see `packages/shared/src/ai/redaction.ts`). Hourly exports land in `s3://cnc-quote-audit/otel/ai/` for immutable evidence.
- **Drift Monitoring:** Grafana board tracks latency, failure rate, and drift delta versus deterministic baselines; alerts page on deviation beyond configured SLOs.
- **Regression & Chaos Validation:** Synthetic CAD/pricing fixtures reside in `artifacts/ai-regression/fixtures/` and drive nightly `pnpm qa:ai-regression` suites. Non-production Ollama stacks (`ollama-chaos-{region}`) receive seeded traffic for failover drills via `pnpm qa:seed-ollama-chaos`, with logs replicated to `s3://cnc-quote-audit/ai-chaos/`. Canary rollouts require `pnpm qa:canary-shadow` to compare AI outputs against deterministic baselines before promotion.
