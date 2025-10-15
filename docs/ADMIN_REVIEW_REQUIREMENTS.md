# Admin Review Queue Requirements

## Stakeholder Inputs
- **Admin Lead**: needs a single queue to triage quotes, with clear ownership and SLA visibility.
- **Ops Manager**: monitors throughput, ensures prioritization, and exports filtered queues for planning.
- **Finance / RevOps**: checks conversion rates, high-value quotes, and export data for forecasting.
- **QA Lead**: audits DFM blockers and verifies queue data integrity.

## Data Contracts & Sources
- `quotes`: canonical quote metadata (id, quote_no, tenant, created_at, totals, lane, last_action_at).
- `customers`: customer display names, company, account tier.
- `pricing_summaries`: aggregated totals (items, value, margins) aligned per quote.
- `dfm_findings`: blocker/warning counts, severity, and linked part identifiers.
- `materials`: reference data for detail view and pricing summaries.

## Table Schema (Frozen)
| Column              | Description                                                 | Type / Format                | Notes |
|---------------------|-------------------------------------------------------------|------------------------------|-------|
| `quoteId`           | Unique identifier for the quote                             | ULID / UUID string           | Primary key used for detail fetch |
| `quoteNo`           | Human-readable quote number                                 | string                       | Searchable |
| `customerName`      | Primary contact name                                        | string                       | Search & CSV |
| `company`           | Customer organization                                       | string                       | Search & CSV |
| `createdAt`         | Quote submission timestamp                                  | ISO 8601 string              | Sortable |
| `submittedBy`       | Email of submitting user                                    | string                       | Mask in CSV unless `export_pii` scope |
| `lane`              | Queue lane                                                  | enum (`NEW`,`IN_REVIEW`,`APPROVED`,`REJECTED`) | Surface color badges |
| `statusReason`      | Context for current lane                                    | string nullable              | Hidden when null |
| `totalItems`        | Number of line items                                        | integer                      | >= 0 |
| `totalValue`        | Monetary value in quote currency                            | number                       | Currency formatted |
| `currency`          | ISO currency code                                           | enum (`USD`,`EUR`,`GBP`,`NOK`,`INR`) | |
| `dfmFindingCount`   | Count of open DFM findings                                  | integer                      | Highlight when > 0 |
| `priority`          | Operational priority                                        | enum (`LOW`,`MED`,`HIGH`,`EXPEDITE`) | Drives default sort for expedite |
| `assignee`          | Current owner                                               | string nullable              | Editable via follow-on steps |
| `lastActionAt`      | Latest action timestamp                                     | ISO 8601 string nullable     | Secondary sort |

## Filtering & Search
- Multi-select filters: `lane`, `status`, `assignee`, `priority`.
- Range filters: `dateFrom` / `dateTo` (createdAt), `minValue` / `maxValue` (totalValue). Reject min > max.
- Boolean: `hasDFM` (true if `dfmFindingCount` > 0).
- Text search: case-insensitive fuzzy match across `quoteNo`, `customerName`, `company`.
- All filters must apply consistently to list and CSV export endpoints.

## Sorting & Pagination
- Sort fields: `createdAt`, `totalValue`, `dfmFindingCount`, `priority`, `lastActionAt`.
- Default sort: `createdAt` descending.
- Pagination: cursor-based (`cursor` opaque string), default `limit` 25, maximum 100.
- Cursor encoding recommendation: base64 of `{ createdAt, id }`.

## Aggregates & Stats Cards
- `totalRows`: count of records within filter scope (approx OK when expensive).
- `totalValue`: aggregated sum of `totalValue` for filtered rows.
- `conversionRate`: approved / total within current filter window (provide denominator safeguard against division by zero).

## Export Contract
- Endpoint: `GET /api/admin/review/export.csv`.
- Query params identical to list endpoint.
- CSV columns mirror the visible table columns in order.
- Hard cap 50k rows; return HTTP 413 with guidance when exceeded.
- Respect `export_pii` scope before including `submittedBy` emails.

## Empty & Error States
- **EmptyWithFilters**: show "No results match these filters" with `Clear Filters` button.
- **EmptyNoFilters**: show onboarding copy with link to documentation.
- **ErrorBanner**: display generic failure text, expose `requestId`, provide `Retry` action and support contact mailto.
- Loading: show skeleton rows sized to current `limit` until first response.

## Detail Workspace Requirements
- Panel surfaces `dfm` findings (severity badge, rule name, optional `partId`, message, timestamp).
- Pricing summary: material, machining, finishing, total, currency.
- Activity timeline: ordered descending by timestamp, includes `actor`, `action`, optional metadata.
- Notes: simple list sorted descending by `at`.

## Security & Access Control
- JWT must include `tenant_id` and roles; enforce row-level security on `quotes.tenant_id`.
- RBAC scopes: `read:review`, `read:review_detail`, `export:review`.
- Responses include `Cache-Control: private, max-age=15` and `Content-Security-Policy: default-src 'self'`.
- GET-only endpoints; SameSite=Lax cookies mitigate CSRF.

## Telemetry Expectations
- Log entries: `requestId`, `tenant_id`, `user_id`, `route`, `duration_ms`, result count.
- Metrics: `admin_review_requests_total{route,status}`, `admin_review_latency_ms{route}`, `admin_review_export_rows`.
- Tracing: spans named for each endpoint, attributes include `tenant_id`, `cursor_used`, `result_count`.

## Acceptance Criteria
1. TypeScript contract files compile under strict mode.
2. Zod validators reject invalid query combos (e.g., `minValue` > `maxValue`).
3. OpenAPI spec passes `spectral lint` (warnings allowed) with no errors.
4. Contract tests validate success and failure payload shapes.
5. Example payloads render without runtime issues when consumed by table components.
6. CSV export reproduces visible filters and column ordering.
