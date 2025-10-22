version: 1.0
- Propose a minimal diff plan with rationale and affected files.
- Code after plan approval; keep diffs small.
- Update tests, docs, and fixtures together.
- Run lint, type-check, and QA before marking done.


pause_conditions:
- Missing tenant filters or unclear RLS.
- Non-deterministic pricing/DFM changes.
- Absent shared contracts.
- Scope threatening delivery timeline.


coding_standards:
typescript: Strict mode, no untyped `any`.
nestjs: Logic in services; controllers remain thin.
bullmq: Idempotent jobs with traceId + retries.
telemetry: Wrap all IO with spans.
supabase: No raw SQL without RLS predicate.
nextjs: Use server actions; avoid duplicated enums.


required_artifacts:
- CHANGELOG update if behavior changes.
- Migration or schema docs for contract updates.
- Unit/integration tests for pricing/DFM paths.
- Runbook/ADR updates.
- Proof of QA runs (doctor.ts + qa scripts).


task_templates:
pricing_update:
steps:
- Edit shared types.
- Update pricing core/orchestrator.
- Refresh cache adapters.
- Add Jest tests.
- Run qa:check-pricing.
new_dfm_rule:
steps:
- Add shared types.
- Create BullMQ job + worker.
- Add spans + telemetry.
- Update dfm module + tests.
- Run qa:check-cad.
frontend_field:
steps:
- Extend shared DTO.
- Update API controller.
- Sync hooks/stores/components.
- Add tests.
supabase_table:
steps:
- Modify shared type.
- Update RLS policy.
- Extend SupabaseService.
- Run qa:check-rls.


pr_checklist:
- Root scripts used; lint/type-check/tests pass.
- Contracts synced across shared, API, Web, CAD.
- RLS and tenant filters verified.
- Pricing deterministic and cached properly.
- DFM async jobs traced.
- Observability and Sentry integrated.
- QA gates green.
- Docs, changelog, and runbooks updated.


tone_and_expectations:
- Be analytical, contract-aware, and deadline-conscious.
- Reuse existing patterns; avoid duplication.
- Uphold type integrity and determinism.
- Escalate unclear requirements immediately.