# Realtime Contracts (v1)

This document describes the websocket event shapes used by the instant quote application. All events share a common envelope and are versioned (`version: "v1"`).

## Envelope
```
{
  version: 'v1',
  kind: <RealtimeEventKindV1>,
  quote_id: string,
  timestamp: ISO8601,
  payload: <EventSpecificPayload>,
  correlation_id?: string
}
```
`correlation_id` links an optimistic pricing emission to a later final pricing update.

## Pricing Events
Kinds: `pricing:optimistic`, `pricing:update`
```
interface PricingMatrixRowPatchV1 {
  quantity: number;
  unit_price?: number;
  total_price?: number;
  lead_time_days?: number;
  breakdown?: {
    material?: number;
    machining?: number;
    setup?: number;
    finish?: number;
    inspection?: number;
    overhead?: number;
    margin?: number;
  };
  status?: 'pending' | 'ready' | 'error' | 'optimistic';
  error_message?: string;
}

interface PricingUpdatePayloadV1 {
  quote_item_id: string;
  matrix_patches: PricingMatrixRowPatchV1[];
  pricing_version: number;
  subtotal_delta?: number;
  optimistic?: boolean; // true only on optimistic emissions
  latency_ms?: number;  // present on final update measuring optimistic->final delta
}
```
Semantics:
- Optimistic event may contain partial patches (one or more quantities) with `optimistic: true`.
- Final update MUST include `pricing_version` (monotonic per quote item) and may repeat previous rows with refined values.
- `subtotal_delta` is the change to the aggregate selected-quantity subtotal across the quote at the time of application.
- Drift detection: if a final event arrives with a correlation_id not previously seen for the optimistic stage, client attempts reconcile.

## Geometry Events
Kinds: `geometry:update`, `geometry:error`
```
interface GeometryUpdatePayloadV1 {
  quote_item_id: string;
  status: 'processing' | 'ready' | 'error';
  metrics?: {
    volume_mm3?: number;
    surface_area_mm2?: number;
    bounding_box?: { x: number; y: number; z: number };
    holes_count?: number;
    min_wall_thickness_mm?: number;
    max_hole_depth_mm?: number;
    thread_candidates?: number;
    metrics?: Record<string, number | string | boolean>;
  };
  error_message?: string;
}
```
Semantics:
- A part enters `processing` after upload; one or more `processing` updates may incrementally add metrics.
- Terminal states: `ready` (metrics stable) or `error` (error_message required).

## DFM Events
Kinds: `dfm:update`, `dfm:partial`, `dfm:error`
```
interface DfmIssuePatchV1 {
  id: string;
  status?: 'new' | 'acknowledged' | 'dismissed' | 'fixed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  suggested_fix?: string;
  geometry_ref?: { type: 'face' | 'edge' | 'volume'; local_id: string };
}

interface DfmUpdatePayloadV1 {
  quote_item_id: string;
  issues_patches?: DfmIssuePatchV1[];
  overall_score?: number; // 0..100 heuristic
  manufacturability?: 'excellent' | 'good' | 'fair' | 'poor';
  partial?: boolean; // true if mid-stream batch
  error_message?: string;
}
```
Semantics:
- `dfm:partial` events set `partial: true` and deliver incremental patches.
- Full `dfm:update` may consolidate prior issue set.
- `dfm:error` requires `error_message`.

## Client Responsibilities
1. **Idempotent Patch Application**: Apply patches per quantity key (pricing) or issue id (DFM) without duplicating entries.
2. **Correlation & Drift**: Maintain a map of optimistic correlation_ids; if a final lacks a mapping, reconcile via REST.
3. **Latency Tracking**: Record `latency_ms` from final pricing events for health UI.
4. **Subtotal Delta**: Adjust local subtotal optimistically when provided; reconcile periodically or on drift.
5. **Graceful Degradation**: If websocket disconnects, allow manual reconcile action to fetch full current pricing/dfm/geometry states.

## Versioning & Forward Compatibility
- New optional fields may be appended; clients must ignore unknown keys.
- Breaking changes require bumping `version` and introducing parallel handlers.

---
Generated and maintained alongside `realtime-events.ts`. Keep this file updated when event shapes evolve.
