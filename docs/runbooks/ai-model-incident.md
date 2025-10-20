# AI Model Incident Response Runbook

**Owner:** AI Platform Guild  
**Last Updated:** 2025-10-20

## When to Trigger

- Pricing assistant returns hallucinated or non-deterministic configuration adjustments.  
- Prompt sanitization failures leak PII.  
- Model gateway returns repeated 5xx errors impacting customer flows.  
- Bias review identifies material drift beyond approved thresholds.

## Immediate Actions

1. **Stabilize**
   - Call `POST /ai/models/:modelId/rollback` (or `pnpm ai:rollback --model <id> --target <version>`) to revert to last known good deployment.
   - Disable affected feature flag or route (`admin_pricing_revision_assistant`, `pricing_rationale`) if rollback unavailable.
2. **Contain**
   - Update Supabase `ai_model_runs` record with status `failed` and detailed `error_message`.
   - Capture traceId, runId, and offending prompt digest from `admin_ai_prompts` or logs.
3. **Notify**
   - Page on-call via PagerDuty runbook `AI Platform Incident`.
   - Post incident stub in `#ai-alerts` with traceId, runId, customer impact, and mitigation ETA.

## Diagnosis Checklist

- Inspect `ai_model_runs` history for recent retrains or rollbacks.  
- Review Grafana dashboard `AI Lifecycle` for error spikes.  
- Verify prompt versions (`prompt_versions.system/user`) logged in `admin_ai_prompts` align with Git HEAD.  
- Run `pnpm qa:ai-regression --model <id>` to reproduce locally.  
- Confirm model gateway health via `/control/status` endpoint.

## Remediation

- If guardrail regression, update prompt templates in `packages/shared/src/ai/prompts/*` and retrain.
- If data drift, refresh dataset snapshot referenced in `ai/model-configs/<model>.yaml` and re-run retrain workflow.
- Document root cause, mitigation, and follow-up tasks in `docs/governance/evidence-register.md` under AI incidents.

## Post-Incident

- Conduct retrospective with domain experts within 48 hours.  
- Ensure bias review schedule (`ai_model_bias_reviews`) reflects follow-up sessions.  
- Update this runbook if new steps or tooling were required.
