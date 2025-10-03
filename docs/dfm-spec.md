# Advanced DFM Analysis Specification

## Goals
Provide actionable, process-specific manufacturability feedback with consistent severity scoring, remediation guidance, and quantitative metrics to drive pricing accuracy and cycle-time reduction.

## Supported Processes (Initial Wave)
- CNC Milling / Turning
- Sheet Metal Fabrication
- Injection Molding

## Data Inputs
| Input | Source | Notes |
|-------|--------|-------|
| Triangulated mesh (STL/OBJ) | Upload / geometry service | Canonical geometry for feature extraction |
| Material ID | Quote part config | Drives min wall, tooling, thermal properties |
| Process Type | Part config | Determines analyzer pipeline |
| Finish ID | Part config | Impacts surface prep & secondary ops |
| Tolerance Spec (optional) | User input | Affects risk & cost multipliers |
| Volume / Surface Area | Geometry pre-pass | Cached for cost + DFM heuristics |
| Bounding Box | Geometry pre-pass | Used for machine/work envelope fit |

## Issue Object Schema
```json
{
  "id": "uuid",
  "process": "cnc",
  "code": "THIN_WALL",
  "severity": "warn", // info | warn | fail
  "score_impact": -4,    // negative deduction applied to 100 baseline
  "message": "Wall thickness below recommended minimum (0.6mm vs 1.0mm).",
  "recommendation": "Increase wall thickness or change material to 7075 with higher stiffness.",
  "metrics": { "measured_mm": 0.6, "min_allowed_mm": 1.0 },
  "locations": [ { "face_ids": [14,15,16] } ],
  "analyzer_version": "cnc.v1.0",
  "time_ms": 12
}
```

## Severity Heuristics
| Severity | Definition | Pricing Effect | Action |
|----------|------------|---------------|--------|
| info | Within acceptable norms but noteworthy | None | Show badge |
| warn | Manufacturable but risk/cost driver | Complexity multiplier + margin bump | Suggest redesign |
| fail | Not manufacturable / will be blocked | Block auto-quote or require manual review | Provide fix guidance |

## Scoring Model
- Start at 100.
- Each issue contributes `score_impact` (negative) based on severity + weighted factor.
- Floor at 0. Example weights:
  - info: 0
  - warn: -2 to -6 (scaled by delta / threshold)
  - fail: -15 to -40 (depending on class)
- Final bucketization:
  - 90–100: Excellent
  - 75–89: Good
  - 60–74: Moderate (highlight in UI)
  - <60: At Risk (flag for manual review)

## CNC Analyzer Checks
| Code | Description | Method | Metrics |
|------|-------------|--------|---------|
| THIN_WALL | Wall thickness below min | Voxel or medial-axis sampling, min local thickness vs table | measured_mm, min_allowed_mm |
| SMALL_HOLE | Hole dia < tool min | Circle feature detect & compare vs tool library | diameter_mm, min_drill_mm |
| DEEP_POCKET | High depth:width ratio | Pocket face depth calculation | depth_mm, ratio |
| SHARP_INTERNAL_CORNER | Internal radius below tool radius | Edge angle + adjacent face curvature | radius_mm, min_tool_radius_mm |
| EXCESS_TOLERANCE | Tight tolerance region | Parse tolerance spec, compare vs baseline | requested_tol_mm, base_tol_mm |
| HIGH_ASPECT_BOSS | Boss slenderness risk | Bounding box ratio | height_mm, aspect_ratio |
| THREAD_DEPTH | Thread length beyond standard | Parse thread features | depth_mm, max_standard_mm |

## Sheet Metal Checks
| Code | Description | Metrics |
|------|-------------|---------|
| MIN_BEND_RADIUS | Bend radius < material min | radius_mm, min_radius_mm |
| HOLE_TO_EDGE | Hole too close to edge | edge_dist_mm, min_dist_mm |
| HOLE_CLUSTER | Min ligament between holes | min_ligament_mm, required_mm |
| THICKNESS_MISMATCH | Thickness inconsistent | thickness_values[] |
| NESTING_WASTE | Inefficient nesting est. | utilization_pct |

## Injection Molding Checks
| Code | Description | Metrics |
|------|-------------|---------|
| INSUFFICIENT_DRAFT | Draft angle < required | angle_deg, min_angle_deg |
| UNDERCUT_DETECTED | Manual core actions needed | volume_cc |
| THICK_SECTION | Local thickness > uniform target | thickness_mm, target_mm |
| SINK_RISK | Thick boss near surface | boss_dia_mm, wall_mm |
| WARP_RISK | Large flat thin area | area_cm2, thickness_mm |
| EJECTION_RISK | Pin density insufficient | pin_count, area_cm2 |

## Pipeline Architecture
1. Geometry Load & Normalize
2. Precompute: KD-tree, BVH, curvature, thickness field
3. Run process-specific analyzer set (parallel where feasible)
4. Aggregate + scoring
5. Persist issues (hash geometry to avoid duplication reuse cached results)
6. Stream progressive results via WebSocket events: `dfm.progress` (0–1), `dfm.issue` (push per issue), `dfm.complete`

## Performance Targets
| Step | P95 Time |
|------|----------|
| Mesh parse | < 250ms |
| Thickness field (medium part) | < 1200ms |
| CNC full checks | < 1800ms |
| Sheet metal full | < 1400ms |
| Injection molding draft + thickness | < 2200ms |

## Storage Model (Proposed Tables)
`dfm_issue`:
- id (uuid PK)
- quote_id
- part_id
- code
- severity
- metrics JSONB
- score_impact int
- analyzer_version
- created_at

`dfm_analysis`:
- id
- part_id
- geometry_hash
- process_type
- score
- issue_count
- duration_ms
- completed_at

## Complexity & Scaling Considerations
- Cache geometry-derived fields (thickness map) keyed by `geometry_hash`.
- Offload heavy operations (thickness, draft detection) to Python microservice using `pyocct` / `trimesh`.
- Use message queue to decouple large analyses; stream partial results.

## UI Integration
Panels in part detail:
- Score badge + trend (if re-analyzed)
- Issue list (filter by severity & code)
- 3D overlay toggles per issue code
- Action button: "Request Engineering Review" (escalates to manual review queue)
- Export PDF summary (later phase)

## Future Enhancements
- AI remediation suggestions (LLM prompt with geometry + issues summary)
- Assembly-level DFM (fit, interference, stack-up)
- Tolerance cost simulators
- Thermal simulation cues for molding

## Open Questions
- How to merge multiple file revisions’ DFM history? (Proposed: revision chain referencing previous analysis IDs)
- Should score adjustments affect margin in real-time or only after manual review? (Phase 2 pricing integration)
