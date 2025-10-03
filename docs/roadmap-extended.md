# Extended Roadmap (Beyond Core MVP)

## Assembly & Multi-Part Quoting
- BOM ingestion (CSV / STEP assembly) parsing into part list.
- Shared operations detection (same material + finish batching).
- Assembly-level DFM: interference, fastener access, tolerance stack-up (future).

## Supplier Network & Allocation
- Supplier table: capability matrix (processes, materials, max envelope, certifications: ISO, ITAR).
- Dynamic capacity snapshot ingestion via API or manual entry.
- Allocation algorithm v1: choose supplier with (lead_time * weight + cost * weight + quality score).
- Escalation if capacity saturation > 85% for a process type.

## Capacity Planning & Forecasting
- Predictive model using moving average of incoming quote lines & conversion rates.
- Highlight predicted capacity shortfall windows (next 2 weeks).
- Auto-suggest onboarding new suppliers or extending shifts.

## Revision Control & Auditability
- Quote revision graph (parent_revision_id).
- Diff view: pricing component deltas, DFM score changes.
- Signed revision snapshots (hash stored for tamper detection).

## Collaboration & Workflow
- Real-time presence indicators on quote detail.
- Comment threads anchored to a line item or DFM issue.
- Task assignments (review, pricing override, customer follow-up).
- SLA timers (badge changes color as breach nears).

## Analytics & Insights
- Win/Loss analysis (reason codes, competitor adjustments).
- Quote aging funnel (time in each status, p95 vs target SLA).
- Margin distribution histogram per process.
- DFM issue heat map (most common blockers).

## Automated Recommendation Engine
- Suggest alternative material/finish combos when cost > threshold.
- DFM auto-fix proposals (e.g., increase wall to X mm) using param heuristics.
- Price optimization experiments (A/B margin bands).

## Customer Experience Enhancements
- Saved configurations & repeat quote quick-start.
- Organization part library with version tags.
- Instant chat with engineering (future live support toggle).
- Self-serve reorder converting past order → new quote.

## Compliance & Security
- Field-level encryption for proprietary metadata.
- Data residency routing (region-based Supabase / storage selection).
- Fine-grained permission scopes (download_cad, view_financials, manage_users).
- Security posture dashboard (2FA adoption, stale API keys, high-risk actions).

## Notifications & Integrations
- Webhooks (quote.updated, order.status_changed, dfm.completed).
- Slack / Teams integration for high-priority events.
- Email digests: daily operations summary, weekly capacity forecast.
- CRM sync (HubSpot/Salesforce) for won quotes → pipeline.

## QA & Production Tracking
- Barcode / QR integration (scan workstation transitions).
- Non-conformance tracking (link back to DFM issues if causal).
- In-process inspection logging with template linkage (QAP templates).

## AI / ML Extensions (Later Phase)
- Lead time predictive model trained on historical throughput.
- Anomaly detection for pricing outliers (z-score on cost components).
- Natural language query over production metrics (semantic search + vector store).

## Operational Resilience
- Graceful degradation: pricing fallback when geometry service latency spikes.
- Circuit breakers around external payment / email providers.
- Shadow mode for new pricing models (compute & log vs serve).

## Developer Experience Improvements
- Full OpenAPI + auto-generated client SDKs.
- Sandbox environment seed script (realistic synthetic parts + metrics).
- Contract tests per external integration (Stripe, PayPal, Slack, etc.).

## Sustainability (Optional Future)
- Carbon footprint estimation per material/process.
- Optimize supplier allocation with carbon intensity weighting.

## KPIs to Track Through Evolution
| KPI | Initial Target | Stretch |
|-----|---------------|---------|
| First price P95 | < 2.5s | < 1.2s |
| DFM analysis P95 | < 20s | < 7s |
| Quote → Order conversion | 18% | 28% |
| Manual review rate | < 35% | < 15% |
| Supplier capacity utilization | 55–75% | 65–80% stable |

---
This roadmap is modular: each vertical (Pricing, DFM, Allocation, Collaboration) can progress semi-independently while sharing core services (auth, events, metrics). Prioritize by customer impact + dependency graph.
