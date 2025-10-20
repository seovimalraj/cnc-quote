# CNC Quote Platform Data Retention & Disposal Policy

**Version:** 1.0.0  
**Status:** Draft for Enterprise Review  
**Owner:** Compliance & Security Guild  
**Last Updated:** 2025-10-20

## Purpose

This document codifies the data retention and destruction controls required to align the CNC Quote Platform with SOC 2 (CC3/CC6/CC8) and ISO/IEC 27001 (A.5, A.8, A.12, A.18). It applies to all services in the monorepo (web, api, worker, cad-service) and any supporting infrastructure (Supabase, Redis, Ollama, object storage).

## Classification & Retention Matrix

| Data Class | Examples | System of Record | Retention Target | Disposal Method | Compliance Mapping |
|------------|----------|------------------|------------------|-----------------|--------------------|
| **Customer Identifiers (PII)** | Name, email, phone, organization metadata | Supabase `public.users`, `public.organizations` | Active lifecycle + 3 years | Logical delete upon churn, hard purge via Supabase scheduled task (`retention:pii:purge`) | SOC2 CC6.1, ISO27001 A.8.2.3 |
| **Quote & Pricing Artifacts** | `quotes`, `quote_revisions`, pricing configs, cost breakdowns | Supabase `public.quotes` schema, S3 archival bucket | Active lifecycle + 7 years | Immutable archive in S3 Glacier, purge after retention window via scheduled batch job | SOC2 CC8.1, ISO27001 A.18.1.3 |
| **CAD Geometry & Manufacturability Data** | STEP/STL files, derived features, DFM runs | Object storage (`cad-files` bucket), Redis (short-term cache) | Active lifecycle + 180 days | Redis entries TTL 48h; S3 lifecycle policy deletes after 180 days | SOC2 CC8.1, ISO27001 A.12.3.1 |
| **Audit & Telemetry Logs** | Admin actions, AI proposals, BullMQ events, OpenTelemetry traces | Elastic SIEM, Supabase `admin_audit_log`, Prometheus | Raw logs: 13 months; Aggregated metrics: 3 years | Cold storage to Glacier after 90 days, purge aggregated metrics after 3 years | SOC2 CC7.2, ISO27001 A.12.4 |
| **Support & Runbook Artifacts** | Incident tickets, on-call notes, postmortems | Linear, Notion (exported to S3) | 5 years | Export, encrypt, purge after retention window | SOC2 CC4.1, ISO27001 A.16.1 |

## Storage & Encryption Controls

- **At Rest:** Supabase (PostgreSQL) leverages AES-256; object storage buckets enforce server-side encryption with customer-managed keys; Redis hosted within VPC using TLS.
- **In Transit:** All services require TLS 1.2+; internal service-to-service traffic goes through mTLS sidecar (nginx-simple.conf per deployment).
- **Key Management:** Keys rotated every 90 days via secrets manager; rotation documented in `docs/runbooks/key-rotation.md`.

## Retention Automation

| Control | Implementation | Evidence |
|---------|----------------|----------|
| PII Redaction | `scripts/retention/purge-pii.ts` (nightly via scheduler) removes stale accounts and anonymizes support tickets | Scheduler logs + Supabase change audit |
| CAD Lifecycle | S3 lifecycle rules (`cad-files-retention.json`), Redis TTL (48h) enforced in `cad-service/main.py` | AWS Config snapshot |
| Quote Archival | Worker cron job `pricing-archives` writes immutable export; stored in Glacier with 7-year retention using customer KMS keys | Glacier inventory reports + KMS rotation attestations |
| Audit Log Vault | `admin_audit_log` table replicated to WORM storage monthly | Replication success metrics |
| Retention Health Check | Nightly BullMQ job `retention-health-audit` cross-checks Supabase/S3 expirations and emits OpenTelemetry span `retention.health` | QA runner report + Grafana dashboard |
| Data Loss Prevention Sweep | `scripts/retention/dlp-scan.ts` runs pre-archive, invoking Macie scan on S3 export prefixes | Macie findings report + CI artifact |

## Deletion & Subject Access Requests

1. Receive request via support channel; log in `compliance_requests` table.
2. Trigger `scripts/runbooks/sar-handler.ts` to export and purge user data; update ticket with timestamp and operator.
3. Execute `scripts/retention/dlp-scan.ts` against the export bundle prior to handoff; remediate findings before release.
4. Record completion in `docs/runbooks/sar-log.md` for audit review.

## Review Cadence

- **Quarterly:** Compliance guild verifies retention jobs, lifecycle policies, and key rotation evidence.
- **Annually:** Internal audit samples three random users/quotes to confirm purge compliance and logs are immutable.
- **Exceptions:** Any retention exception requires approval by Security Officer and recording in `docs/governance/retention-exceptions.yaml`.
- **Continuous:** Retention Grafana board monitored by on-call; deviations from `retention.health` span SLO page automatically to SRE runbook.

## Change Management

All updates to this policy must:

1. Reference an ADR detailing the rationale and impacted services.
2. Obtain sign-off from Security Officer (Accountable) and SRE On-Call Captain (Responsible) via pull request review.
3. Update the evidence register (`docs/governance/evidence-register.md`).

## Contacts

- **Accountable (A):** Chief Security Officer
- **Responsible (R):** Compliance Guild PM + Data Platform Lead
- **Consulted (C):** Legal Counsel, Product Ops
- **Informed (I):** All service owners via #compliance-announcements

## Observability & Enforcement Enhancements

- **OpenTelemetry Instrumentation:** All retention jobs and BullMQ processors emit spans tagged with `retention.class`, `org_id`, and `purge_outcome`. Spans contribute to the `Retention Compliance` Grafana board for live SLA tracking.
- **RLS Enforcement:** Supabase RLS policies deny reads on rows where `retention_status = 'pending_purge'`. QA coverage is enforced via `pnpm qa:check-rls` with fixtures in `scripts/qa-runner.cjs`.
- **Exception Governance:** `docs/governance/retention-exceptions.yaml` lists approved deviations. CI blocks merges if entries lack Security Officer signature or expiration date via `scripts/ci/validate-retention-exceptions.ts`.
- **Encryption Hygiene:** Glacier exports and CAD archives are encrypted with tenant-specific KMS keys rotated every 90 days; rotation evidence captured in `docs/governance/evidence-register.md`.
- **DLP Coverage:** Pre-archive pipeline invokes AWS Macie and blocks export if PII anomalies exceed threshold; incidents page to `docs/runbooks/dlp-response.md` within 24 hours.
- **AI Lifecycle Logs:** `ai_model_runs` and `ai_model_bias_reviews` retain lifecycle metadata for 3 years; nightly QA checks ensure status transitions remain within retention SLOs and tag corresponding runbooks (`docs/governance/ai-ml-posture.md`).
