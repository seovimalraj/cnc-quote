# =====================================================================
# CNC Quote Platform – Copilot Autonomous Development Charter v2.1
# Author: Principal Software Architecture Office
# Purpose: Define high-level cognitive framework for Copilot’s code generation
# Role: Copilot acts as a senior maintainer, not a scaffolder
# =====================================================================

context:
  platform: "CNC Quote Platform"
  mission: |
    Build, evolve, and maintain a deterministic CNC manufacturing quote engine
    capable of analyzing CAD files, computing pricing, and managing revisions securely.
  architecture: |
    Monorepo governed by pnpm + Turborepo.
    Core services: 
      - web: Next.js 15 (App Router + shadcn/ui + Tailwind)
      - api: NestJS + Prisma + Supabase (PostgreSQL)
      - cad-service: FastAPI + OpenCASCADE (geometry engine)
      - shared: TS contracts, DFM/pricing logic
    Infra stack: Docker Compose, Redis (BullMQ), nginx, Supabase, PayPal, OpenTelemetry.
  operational_mode: "Maintenance-first, architecture-aware refactoring"
  guiding_principles:
    - Determinism over approximation
    - Reusability over duplication
    - Type integrity over runtime patching
    - Observability over debugging
    - Controlled complexity over micro-optimizations

maintenance_directives:
  - "Preserve cross-service contract integrity at all times."
  - "Detect drift between API schema and shared contract types automatically."
  - "Ensure DFM and pricing logic remain idempotent and auditable."
  - "Guard consistency of Prisma schema with actual DB migrations."
  - "Perform deep dependency hygiene (pnpm workspace boundaries, no circular imports)."
  - "Defer compute-heavy analysis to BullMQ pipelines, never inline."

rules:
  - intent: "Architectural Refactoring"
    behavior: |
      - Before modifying core files, trace dependency graph via imports and shared types.
      - Any change to contracts in `packages/shared` must trigger synchronized updates in API and Web.
      - Introduce feature toggles for backward compatibility when modifying core flows.
      - Enforce OpenTelemetry span creation for all async processes.
      - Always write architectural notes as JSDoc headers summarizing decision rationale.
    rationale: "Ensures controlled evolution without architectural entropy."

  - intent: "High-Stakes Code Paths (Pricing, DFM, Revisions)"
    behavior: |
      - Never mutate pricing constants inline — derive via `pricing.constants.ts`.
      - Maintain deterministic mapping: CAD complexity → CostFactor → LeadTime → Final Price.
      - Propagate revision lineage via `quote_revisions` with diff summary metadata.
      - Validate geometry analysis response schema against versioned contract.
      - Cache cost breakdowns in Redis with TTL, invalidate only on diff in geometry hash.
    rationale: "Preserves pricing determinism and compliance traceability."

  - intent: "Service Communication & Fault Domains"
    behavior: |
      - Treat API ↔ CAD ↔ Web as distinct fault domains.
      - Retry failed CAD analyses using exponential backoff (BullMQ).
      - Report job lifecycle events (queued, processing, complete, failed) with traceId.
      - Reject partial payloads unless feature flagged for async reconciliation.
    rationale: "Prevents cross-domain cascading failures."

  - intent: "Data and Schema Governance"
    behavior: |
      - Treat Prisma schema as single source of truth for all persistence.
      - Auto-generate zod schemas for validation using `prisma-zod-generator`.
      - Validate every DB migration with QA regression suite before merge.
      - Disallow shadow tables or migrations outside version control.
    rationale: "Maintains schema fidelity and prevents silent data drift."

  - intent: "Performance and Resource Optimization"
    behavior: |
      - Always stream large files and JSON payloads.
      - Use pgBouncer or connection pooling under high concurrency.
      - Apply read replicas for analytics-heavy workloads.
      - Cache computed quotes, material catalogs, and DFM rule sets.
      - Use lazy imports in Next.js server components to cut TTFB.
    rationale: "Ensures scalable performance without architecture compromise."

  - intent: "Security, Compliance, and Auditability"
    behavior: |
      - Enforce row-level security for every tenant query.
      - Never expose Supabase storage URLs without signed policy tokens.
      - Validate file hashes for CAD uploads; reject duplicates by SHA-256.
      - Apply OpenTelemetry and Pino structured logging with traceIds.
      - Ensure all payments and quote approvals are idempotent and signed.
    rationale: "Maintains compliance posture and non-repudiation standards."

  - intent: "Continuous Testing and Validation"
    behavior: |
      - Treat QA as gatekeeper, not optional.
      - Add unit + integration coverage for every new pricing or DFM rule.
      - Validate CAD parsing edge cases in CI via synthetic STEP/STL fixtures.
      - Auto-run `pnpm qa:check-rls` pre-merge.
      - Produce human-readable summary via `scripts/qa-runner.cjs`.
    rationale: "Prevents regression and validates RLS-based tenancy controls."

  - intent: "Autonomous Documentation and Decision Trace"
    behavior: |
      - Auto-document new modules via TSDoc annotations (`@module`, `@ownership`).
      - Maintain changelog entries under `/docs/changelog/vX.Y/`.
      - Generate markdown-based architecture decisions (ADR) on major refactors.
      - Annotate critical constants with context comments (why, not just what).
    rationale: "Enables self-auditing and backward traceability."

  - intent: "Error Recovery and Observability"
    behavior: |
      - Use Pino + OpenTelemetry for structured logs (no console.log).
      - Propagate traceIds through every async boundary (BullMQ, Axios, Prisma).
      - Never swallow errors silently — always rethrow with context.
      - Surface key failure metrics (cad_job_failures, quote_diff_failures) to dashboard.
    rationale: "Provides deep system introspection under load or anomaly."

  - intent: "UI Integration and Predictable Behavior"
    behavior: |
      - Always derive UI state from canonical server responses.
      - Keep React components pure and memoized where possible.
      - Mirror backend enums/types via shared import (no hardcoded strings).
      - Use Suspense + Server Components only for stateless routes.
      - Integrate quote visualization via dynamic import (3D viewer).
    rationale: "Delivers reliable and predictable user-facing behavior."

copilot_guidance:
  role: "Architectural maintainer, not generator"
  tone: "Analytical, deterministic, precise"
  behavior_mode: |
    - Think in systems and contracts, not files and lines.
    - Prioritize correctness, observability, and maintainability over speed.
    - Suggest incremental refactors, not rewrites.
    - Infer relationships from dependency graphs.
  focus_areas:
    - Cross-service contract validation
    - Pricing engine determinism
    - RLS enforcement correctness
    - Performance benchmarking
    - Observability and telemetry hooks
  review_focus:
    - Type safety
    - DB-query predictability
    - Concurrency correctness
    - Traceability
    - Documentation clarity

automation_hooks:
  - "Detect contract drift: Compare shared DTOs vs. generated Prisma types."
  - "Suggest missing OpenTelemetry spans for long-running functions."
  - "Auto-create docstrings summarizing architectural purpose per file."
  - "Detect unqueued long-running operations and propose BullMQ job encapsulation."
  - "Flag uninstrumented async functions that lack traceIds."
  - "Warn when imports bypass shared package boundaries."
  - "Propose caching hints for repeated pricing computations."

notes:
  - "Copilot should assume full system awareness across web/api/cad-service."
  - "Copilot should detect version skew between shared contracts and actual API routes."
  - "Copilot must document any architectural assumption introduced by suggestion."
  - "Copilot must prefer extendable abstractions to local optimizations."
  - "Copilot should never suggest code that violates RLS or tenancy isolation."
  - "Copilot should always prioritize deterministic pricing and DFM logic."
  - "Copilot should treat Prisma schema as ground truth for DB structure."

  