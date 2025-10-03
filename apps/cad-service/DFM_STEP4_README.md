## DFM Analyzer & Finish Cost Enhancements (Phase 1 / Phase 2 Groundwork)

This document captures the initial implementation of lightweight DFM heuristics, finish time-based costing, and risk-based pricing margin uplift.

### Finish Cost Computation
Components:
1. `cost_per_part`
2. `cost_per_area_cm2 * surface_area_cm2`
3. Time cost = `((prep_time_min + effective_area / rate_cm2_min)/60) * (0.6 * machine.hourly_rate)` (when `rate_cm2_min` provided)
	 - `effective_area = 0.5 * surface_area_cm2` heuristic (exterior faces)

Helper: `computeFinishCostPerPart(finish, machine, { partSurfaceAreaCm2 })` in shared package consolidates logic for testability.

### DFM Analyzer Output
`dfm_analyzer.py` provides:
```
{
	metrics: { bbox_dims_mm, aspect_ratio, feature_counts, sheet_thickness_mm? },
	findings: [ { code, severity, message, suggestion? } ],
	risk_score: 0..1
}
```
Current heuristic rules: THIN_WALL, THICK_SHEET, MANY_HOLES, MANY_POCKETS, MANY_BENDS, HIGH_ASPECT_RATIO.

### Risk-Based Margin Uplift
If the quote preview request part object includes `dfm_risk_score` (0–1), margin is increased:
```
effective_margin = base_margin + 0.08 * clamp(risk_score,0,1)
```
Cap: +8 percentage points absolute (e.g., 0.25 -> 0.33). No impact if omitted.

### Planned Enhancements
- Real kernel-driven feature extraction (wall thickness map, deep pocket detection, min internal radii, tool reach).
- Process-specific rule packs and dynamic rule engine.
- Persisted DFM snapshots & diffing between revisions.
- Pricing risk integration factoring probability of scrap / rework.
- UI surfacing of prioritized remediation suggestions.

### Limitations
- Geometry metrics are heuristic mock values until kernel integration.
- Effective finish area halves total surface area; internal cavities ignored.
- Risk uplift linear; later may adopt tiered or probabilistic model.

Last updated: Phase 2 (risk uplift + finish helper extraction + DFM integration)
\n+### Changelog Addendum
- Extracted risk margin logic to shared `applyRiskMargin` util with dedicated tests.
- Added finish cost & risk tests to shared package for regression safety.
