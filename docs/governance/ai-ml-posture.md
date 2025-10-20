# AI & ML Operational Posture

**Version:** 1.0.0  
**Owner:** AI Platform Guild  
**Last Reviewed:** 2025-10-20

## Objectives

- Guarantee every prompt and model configuration is version-controlled with traceable approvals.  
- Automate model retraining, rollback, and bias review workflows across environments.  
- Provide domain experts with recurring checkpoints to evaluate model drift, bias, and guardrail efficacy.  
- Define incident response expectations for AI misbehavior and critical regressions.

## Versioned Assets

| Asset | Location | Review Cadence | Owners |
|-------|----------|----------------|--------|
| Pricing rationale prompts | `packages/shared/src/ai/prompts/pricing-rationale.ts` | Quarterly or on pricing change | Pricing Platform + Finance Ops |
| Admin pricing revision prompts | `packages/shared/src/ai/prompts/admin-pricing-revision.ts` | Monthly or on proposal schema updates | Pricing Platform + RevOps |
| Model configs (pricing rationale) | `ai/model-configs/pricing-rationale.yaml` | After each retrain | AI Platform + Finance Ops |
| Model configs (admin pricing) | `ai/model-configs/admin-pricing-revision.yaml` | After each retrain | AI Platform + RevOps |

Every change to these artifacts requires:

1. Git pull request with linked Jira/Linear reference.  
2. Approval from accountable domain experts (see owners).  
3. Update to the evidence register in `docs/governance/evidence-register.md`.

## Automated Lifecycle Workflows

| Workflow | Entry point | Queue | Target | Notes |
|----------|-------------|-------|--------|-------|
| Retrain | `POST /ai/models/:modelId/retrain` or `pnpm ai:train` | `ai-model-lifecycle` | Model gateway `/control/retrain` | Requires dataset parity and prompt version alignment. |
| Rollback | `POST /ai/models/:modelId/rollback` | `ai-model-lifecycle` | Model gateway `/control/rollback` | Target version must exist in artifact bucket. |
| Bias Review | Scheduled cron (`model.biasReviewCron`) or `POST /ai/models/:modelId/bias-review` | `ai-model-lifecycle` | Supabase `ai_model_bias_reviews` | Creates review ticket for domain experts. |

All lifecycle runs are persisted in Supabase tables `ai_model_runs` and `ai_model_bias_reviews` with service-role RLS.

## Bias & Drift Review Checklist

1. Pull latest `ai_model_bias_reviews` entry and associated `ai_model_runs` record.  
2. Validate prompts used (`prompt_versions.system` & `prompt_versions.user`) match approved Git versions.  
3. Compare model output metrics (precision/recall, pricing delta) against baseline dashboards.  
4. Execute `pnpm qa:ai-regression` focused on model domain fixtures.  
5. Record outcome and action items in the review entry and in `docs/governance/evidence-register.md`.

## Incident Response

- **Trigger:** Any hallucinated pricing adjustment, policy violation, or severity-1 customer report.  
- **Immediate Actions:**
  1. Invoke `docs/runbooks/ai-model-incident.md`.  
  2. Schedule rollback via `POST /ai/models/:modelId/rollback`.  
  3. Issue communication in `#ai-alerts` with traceId and runId.  
- **Post-Incident:** File root-cause analysis within 48 hours, attach to `ai_model_runs.error_message` record, update guardrails if applicable.

## Audit Evidence

- `ai_model_runs` table (status transitions, reason, trace IDs).  
- `ai_model_bias_reviews` table (stakeholders, checklist completion).  
- Prompt audit rows stored in `admin_ai_prompts`.  
- Git history of `packages/shared/src/ai/prompts/*` and `ai/model-configs/*`.

## Tooling

- `pnpm ai:train --model <modelId>` – CLI helper to enqueue retrain jobs.  
- `pnpm ai:rollback --model <modelId> --target <version>` – CLI helper to enqueue rollback jobs.  
- `pnpm ai:bias-review --model <modelId>` – CLI helper to trigger ad-hoc bias reviews.  
- Grafana dashboard `AI Lifecycle` visualizes `ai_model_runs` latency and failure rates.

## Change Management

All updates to this document require approval from the AI Platform Guild lead and security officer. Include evidence references and update the `docs/governance/evidence-register.md` entry for section `AI & ML Operational Posture`.
