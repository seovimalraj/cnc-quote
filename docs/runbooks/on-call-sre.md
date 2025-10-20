# On-Call SRE Runbook – CNC Quote Platform

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Platform Operations (Accountable: SRE Manager)  
**Last Updated:** 2025-10-20

---

## Mission

Provide repeatable steps for Site Reliability Engineers to detect, triage, communicate, and remediate production incidents across the CNC Quote Platform while maintaining compliance with SOC 2 CC7/CC8 and ISO/IEC 27001 A.16.

## Scope

- Apps: `apps/api`, `apps/web`, `apps/worker`, `apps/cad-service`
- Infrastructure: Supabase (PostgreSQL + Storage), Redis, BullMQ queues, Ollama inference nodes, CDN/Edge
- Data Classes: PII, pricing configs, CAD artifacts, audit logs (refer to `docs/governance/data-retention-policy.md`)

## Readiness Checklist (Start of Shift)

1. Confirm PagerDuty schedule handoff and acknowledge you are primary.
2. Review open incidents in Linear (`INC-*`) and outstanding action items.
3. Check latest deployments (Turborepo dashboard) for risk context.
4. Validate observability stack health: Grafana dashboards (SLO, Queue Backlog), Prometheus alerts, OpenTelemetry collector status.
5. Ensure access to:
   - Supabase SQL editor (read-only)
   - Kubernetes/Docker host bastion (MFA enforced)
   - Secrets manager (read audit logs; do not rotate outside change window)

## Severity Matrix

| Severity | Example | SLA | Notification |
|----------|---------|-----|--------------|
| Sev-0 | Full region outage, data loss risk | 15 min | Phone bridge + Exec channel |
| Sev-1 | API 5xx > 5%, queue backlog > 10k jobs | 30 min | #incident-war-room |
| Sev-2 | Degraded feature (AI assistant slow), single tenant impact | 2 hrs | #platform-ops |
| Sev-3 | Non-prod outage, false alarm | 1 business day | Update Linear ticket |

## Incident Response Flow

1. **Acknowledge Alert** (PagerDuty within SLA).
2. **Establish Channel**: `/ops incident-start` Slack command -> auto creates Zoom bridge + linear ticket.
3. **Initial Assessment**
   - Review Grafana dashboards.
   - Trace requests with OpenTelemetry (query by `traceId`).
   - Inspect BullMQ queue depths via `apps/web` admin console.
4. **Stabilize**
   - Perform safe rollback (`pnpm deploy --target=<service> --env=prod`).
   - Scale resources (Redis, workers) through Terraform Cloud run (requires change control approval unless Sev-0).
   - Disable feature flags (via Admin Feature Flags UI) if AI components misbehave.
5. **Communicate**
   - Update incident channel thread every 15 min.
   - Notify stakeholders according to RACI (`docs/governance/raci-matrix.yaml`).
6. **Evidence Collection**
   - Capture screenshots/log excerpts.
   - Link to relevant queries/dashboards in Linear ticket for SOC/ISO evidence.
7. **Resolution**
   - Confirm metrics return to baseline for 30 minutes.
   - Document root cause, detection gaps, remediation tasks in ticket.
8. **Post-Incident**
   - Schedule postmortem within 3 business days.
   - Update `docs/runbooks/postmortem-template.md` with findings.
   - Check if data retention or legal hold needed; coordinate with Compliance Guild.

## Playbooks by Failure Mode

- **Supabase Degradation**
  - Check status (`status.supabase.com`).
  - Failover to read replica (documented in `infra/runbook-supabase-failover.md`).
  - Purge long-running transactions; ensure retention jobs paused if required.
- **Redis Saturation**
  - Inspect key eviction; increase memory or clear ephemeral caches (`pnpm scripts/redis:flush-safe`).
  - Validate background jobs catching up once pressure relieved.
- **Ollama Unresponsive**
  - Toggle feature flag `admin_pricing_revision_assistant` to off.
  - Restart container (`kubectl rollout restart deployment/ollama`).
  - Verify worker jobs fail gracefully; capture failure metrics.
- **Queue Backlog**
  - Scale workers (set `WORKER_CONCURRENCY_DEFAULT`) with change approval.
  - Retry/clean jobs via admin console or BullMQ CLI.

## Compliance Notes

- All incident timelines and actions must be recorded in Linear ticket comments for audit readiness.
- Evidence (logs, screenshots) stored in `s3://cnc-quote-audit/incidents/<incident-id>/` within 12 hours of closure.
- Retain incident records for 5 years as per data retention policy.

## Contacts & Escalation

- **Primary On-Call:** PagerDuty schedule `CNC-SRE-Primary`
- **Secondary:** PagerDuty schedule `CNC-SRE-Backup`
- **Duty Manager (Accountable):** SRE Manager – escalate if Sev-0 or breach of SLA.
- **Consulted:** Compliance Guild (for data exposure), Product Ops (customer comms), Legal (if PII exposure).

## Review Cadence

- Weekly: 15-minute on-call sync covering new alerts, runbook gaps.
- Monthly: Chaos test a random playbook and log evidence.
- Quarterly: Audit runbook against SOC/ISO requirements; update RACI assignments.

## Revision History

| Date | Version | Author | Notes |
|------|---------|--------|-------|
| 2025-10-20 | 1.0.0 | Platform Ops | Initial enterprise runbook |
