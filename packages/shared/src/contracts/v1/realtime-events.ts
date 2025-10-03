// Realtime websocket event contracts (v1)
// These events power live updates for pricing, geometry, and DFM.

export type RealtimeEventKindV1 =
  | 'pricing:update'
  | 'pricing:optimistic'
  | 'geometry:update'
  | 'geometry:error'
  | 'dfm:update'
  | 'dfm:partial'
  | 'dfm:error';

export interface BaseRealtimeEventV1<TKind extends RealtimeEventKindV1 = RealtimeEventKindV1, TPayload = unknown> {
  version: 'v1';
  kind: TKind;
  quote_id: string;
  timestamp: string; // ISO
  payload: TPayload;
  /** Optional correlation identifier tying optimistic -> final events. */
  correlation_id?: string;
}

// Geometry Updates
export interface GeometryMetricsV1 {
  volume_mm3?: number;
  surface_area_mm2?: number;
  bounding_box?: { x: number; y: number; z: number };
  holes_count?: number;
  min_wall_thickness_mm?: number;
  max_hole_depth_mm?: number;
  thread_candidates?: number;
  // Raw metrics map for forward compatibility
  metrics?: Record<string, number | string | boolean>;
}

export interface GeometryUpdatePayloadV1 {
  quote_item_id: string;
  status: 'processing' | 'ready' | 'error';
  metrics?: GeometryMetricsV1;
  error_message?: string;
}

export type GeometryUpdateEventV1 = BaseRealtimeEventV1<'geometry:update', GeometryUpdatePayloadV1>;
export type GeometryErrorEventV1 = BaseRealtimeEventV1<'geometry:error', GeometryUpdatePayloadV1>;

// Pricing Updates
export interface PricingMatrixRowPatchV1 {
  quantity: number;
  unit_price?: number;
  total_price?: number;
  lead_time_days?: number;
  breakdown?: Partial<{
    material: number;
    machining: number;
    setup: number;
    finish: number;
    inspection: number;
    overhead: number;
    margin: number;
  }>;
  status?: 'pending' | 'ready' | 'error' | 'optimistic';
  error_message?: string;
}

export interface PricingUpdatePayloadV1 {
  quote_item_id: string;
  matrix_patches: PricingMatrixRowPatchV1[]; // minimal patches instead of whole matrix
  pricing_version: number;
  subtotal_delta?: number; // change in quote subtotal caused by this update
  optimistic?: boolean; // indicates interim estimate
  /** Set only on final event: ms elapsed from optimistic emission. */
  latency_ms?: number;
}

export type PricingUpdateEventV1 = BaseRealtimeEventV1<'pricing:update', PricingUpdatePayloadV1>;
export type PricingOptimisticEventV1 = BaseRealtimeEventV1<'pricing:optimistic', PricingUpdatePayloadV1>;

// DFM Updates
export interface DfmIssuePatchV1 {
  id: string;
  status?: 'new' | 'acknowledged' | 'dismissed' | 'fixed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  suggested_fix?: string;
  geometry_ref?: { type: 'face' | 'edge' | 'volume'; local_id: string };
}

export interface DfmUpdatePayloadV1 {
  quote_item_id: string;
  issues_patches?: DfmIssuePatchV1[];
  overall_score?: number;
  manufacturability?: 'excellent' | 'good' | 'fair' | 'poor';
  partial?: boolean;
  error_message?: string;
}

export type DfmUpdateEventV1 = BaseRealtimeEventV1<'dfm:update', DfmUpdatePayloadV1>;
export type DfmPartialEventV1 = BaseRealtimeEventV1<'dfm:partial', DfmUpdatePayloadV1>;
export type DfmErrorEventV1 = BaseRealtimeEventV1<'dfm:error', DfmUpdatePayloadV1>;

// Discriminated union of all realtime events
export type AnyRealtimeEventV1 =
  | PricingUpdateEventV1
  | PricingOptimisticEventV1
  | GeometryUpdateEventV1
  | GeometryErrorEventV1
  | DfmUpdateEventV1
  | DfmPartialEventV1
  | DfmErrorEventV1;
