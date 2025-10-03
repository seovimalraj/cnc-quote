# Pricing Configuration UI Specification

## Objectives
Enable authorized users to transparently view, tune, and simulate pricing inputs (machine profiles, material rates, finishes, margins, lead time multipliers) with immediate feedback on representative part cost scenarios.

## Core Entities
| Entity | Key Fields | Editable | Source |
|--------|------------|----------|--------|
| Machine Profile | id, process_type, setup_cost, machine_rate_per_hour, min_order_qty, min_order_value, min_price_per_part, margin, overhead, complexity_curve[], capacity_hours_week | Yes | machine_profile table |
| Material | id, name, process_type, base_cost_per_kg, density_g_cm3, min_wall_mm, machinability_factor | Partial | materials table |
| Finish | id, name, process_type, cost_type(fixed|per_area|per_volume), base_cost, lead_time_add_days | Yes | finishes table |
| Lead Time Tier | id, process_type, days, rush_multiplier | Yes | lead_time table |
| Quantity Break Profile | quantity, setup_alloc_pct, efficiency_factor | Yes | computed / stored JSON |
| Margin Strategy | base_margin_pct, complexity_multiplier_map, risk_buffer_pct | Yes | pricing_strategy table |

## Page Structure
1. Overview Dashboard
   - KPI cards: Avg margin (last 30d), Win rate, Avg cycle time, Pricing SLA p95
   - "Simulation Sandbox" quick access (modal launch)
2. Machine Profiles List
   - Table with inline edit (rate, setup, margin) + badge if capacity constrained
   - Bulk actions: Export CSV, Recalculate suggested rates
3. Machine Profile Detail
   - Editable form (left) + Live Simulation panel (right)
   - Complexity Curve chart (complexity index vs multiplier)
4. Materials
   - Grid grouped by process_type
   - Inline edit for `base_cost_per_kg` (with change diff badge)
5. Finishes
   - Table with cost calculator preview; filter by process
6. Lead Time Tiers
   - Drag-reorder tiers; edit rush multiplier
7. Margin Strategy
   - Sliders for base + risk buffer, table for complexity mapping
8. Simulation Sandbox (Modal)
   - Input: process_type, material, finish, quantity, complexity index, rush toggle
   - Output: breakdown line items + margin delta vs baseline
   - Option: Compare two scenarios side-by-side

## Component Hierarchy (React)
```
/pricing
  PricingOverviewPage
  MachineProfilesTable
  MachineProfileDetail
    MachineProfileForm
    PricingSimulationPanel
  MaterialsCatalog
  FinishesCatalog
  LeadTimeTiersPanel
  MarginStrategyPanel
  SimulationSandboxModal
```

## API Endpoints (Proposed)
| Method | Path | Purpose |
|--------|------|---------|
| GET | /admin/pricing/machine-profiles | List machine profiles |
| GET | /admin/pricing/machine-profiles/:id | Detail |
| PUT | /admin/pricing/machine-profiles/:id | Update profile |
| GET | /admin/pricing/materials | List materials |
| PUT | /admin/pricing/materials/:id | Update subset fields |
| GET | /admin/pricing/finishes | List finishes |
| PUT | /admin/pricing/finishes/:id | Update finish |
| GET | /admin/pricing/lead-times | List tiers |
| PUT | /admin/pricing/lead-times/:id | Update tier |
| GET | /admin/pricing/margin-strategy | Current strategy |
| PUT | /admin/pricing/margin-strategy | Update strategy |
| POST | /admin/pricing/simulate | Return pricing breakdown for given inputs |
| POST | /admin/pricing/recalculate-suggested | Batch recalculation (offline job) |

## Simulation Request Payload
```json
{
  "process_type": "milling",
  "material_id": "mat_6061",
  "finish_id": "anod_clear",
  "quantity": 50,
  "complexity_index": 0.42,
  "is_rush": false,
  "assumptions": { "machine_id": "mill_3axis_mid", "lead_time_tier": "std_7d" }
}
```

## Simulation Response Payload
```json
{
  "unit_price": 23.75,
  "total_price": 1187.5,
  "quantity": 50,
  "currency": "USD",
  "lead_time_days": 7,
  "breakdown": {
    "setup_cost": 120,
    "machine_cost": 540,
    "material_cost": 210,
    "finish_cost": 95,
    "qa_cost": 35,
    "margin": 150,
    "overhead": 37.5
  },
  "complexity_multiplier": 1.12,
  "rush_surcharge": 0,
  "warnings": ["Complexity pushes machine utilization above 85% capacity"]
}
```

## UX Patterns
- Inline edits auto-save w/ optimistic UI + subtle toast.
- Dirty state indicator (blue dot) for unsaved bulk form changes.
- Simulation panel: debounce 400ms before refetch.
- Use color-coded diff: green (reduced cost), red (increased).
- Keyboard shortcuts: `S` simulate, `R` reset, `Cmd+K` open sandbox.

## Validation Rules
| Field | Rule |
|-------|------|
| setup_cost | >= 0 |
| machine_rate_per_hour | > 0 |
| min_order_value | >= 0 |
| margin | 0–0.95 |
| complexity_curve | monotonic non-decreasing |

## Margin Strategy Example
```json
{
  "base_margin_pct": 0.18,
  "risk_buffer_pct": 0.04,
  "complexity_multiplier_map": [
    { "threshold": 0.2, "margin_add": 0.00 },
    { "threshold": 0.4, "margin_add": 0.02 },
    { "threshold": 0.6, "margin_add": 0.05 },
    { "threshold": 0.8, "margin_add": 0.09 }
  ]
}
```

## State Management
- Use SWR for list + details; local Zustand store for sandbox ephemeral state (faster recompute of UI before remote response).
- Cache simulation results keyed by a deterministic hash of input parameters.

## Security / RBAC
| Role | Permissions |
|------|-------------|
| admin | Full CRUD |
| org_admin | Read + simulate + material/finish edit |
| reviewer | Read only |
| finance | Read + margin strategy edit |

## Performance Targets
- List fetch < 300ms (server filtered + index on process_type).
- Simulation response p95 < 900ms.
- 95% of inline edits applied < 250ms round-trip.

## Future Enhancements
- A/B margin strategy experiments.
- Price sensitivity heat map (quantity vs complexity).
- Automated suggestions based on historical profitability.
- Batch simulation API for scenario planning.

## Implementation Status (Sep 2025 Update)
The backend simulation endpoint `POST /price/admin/simulate` is implemented with RBAC (`admin, org_admin, finance, reviewer`). It returns:
- Primary legacy pricing response (`simulation` field) using existing machine/material logic.
- Optional v2 multi-quantity matrix when `include_v2_matrix: true` (returned as `v2_matrix`).

An admin sandbox UI is available at `/admin/pricing/sandbox` featuring:
- Debounced (500ms) auto-simulation toggle.
- Manual run button.
- Quantity curve comparison.
- Basic form inputs for process, material, machine, finishes, rush, complexity multiplier and geometry placeholders.

Example request:
```json
{
   "process_type": "milling",
   "machine_id": "machine_generic",
   "material_id": "material_generic",
   "quantity": 25,
   "complexity_multiplier": 1.1,
   "volume_cc": 42,
   "surface_area_cm2": 160,
   "removed_material_cc": 28,
   "features": { "holes": 4, "pockets": 1, "slots": 1, "faces": 6 },
   "include_v2_matrix": true,
   "quantities": [1,10,25,50]
}
```

Next potential enhancements:
- Persist & version simulation presets.
- Show delta vs previously published pricing profile.
- Margin band visualization (target vs achieved).
- Inline editing of key profile parameters with re-simulate-on-blur.

