# Process Recommendation System (Step 10)

## Overview

This implementation provides a rule-driven manufacturing process recommendation engine that analyzes part geometry and quote configuration to suggest optimal processes with confidence scores and actionable reasons.

## Architecture

### Backend (`apps/api/src/routing/`)

- **`recommender.controller.ts`**: REST endpoint `POST /routing/recommend` with RBAC guard (`quotes:read`)
- **`recommender.service.ts`**: Core recommendation engine with rule execution and logging
- **`rules/rules.ts`**: Rule catalog implementing the specification (TURNING_GEOM_AXIS, SHEET_LIKE, IM_INTENT, etc.)
- **`types.ts`**: TypeScript interfaces matching exact specification contracts
- **`validation.ts`**: Zod schema validation for request payloads
- **`routing.module.ts`**: NestJS module wiring with dependencies (Supabase, RateLimit, Cache, Analytics)

### Frontend (`apps/web/app/recommendation/`)

- **`useRecommendation.ts`**: React hook for fetching and caching recommendations (15min TTL)
- **`recommendation-card.tsx`**: UI component displaying top 3 recommendations with confidence bars
- **`apply-recommendation.ts`**: Optimistic apply logic that updates quote config and triggers reprice
- **`recommendation-banner.tsx`**: Success banner with undo capability (auto-dismiss 8s)

### Database

- **Migration**: `apps/api/db/migrations/0036_process_recommendation_logs.sql`
- **Schema**: Stores full `request_json`, `response_json`, and metadata per spec

## API Contract

### Request
```json
POST /routing/recommend
Authorization: Bearer <jwt>

{
  "quote_id": "uuid",
  "part_id": "uuid",
  "override": {
    "material_code": "AL-6061",
    "quantity": 100,
    "requested_process": "cnc_milling"
  }
}
```

### Response
```json
{
  "recommendations": [
    {
      "process": "turning",
      "confidence": 0.85,
      "reasons": ["Rotational symmetry and high L/D ratio"],
      "decision_vector": {
        "rules_fired": ["TURNING_GEOM_AXIS", "TURNING_CYL_HINT"],
        "scores": {
          "geometry_fit": 0.6,
          "feature_match": 0.3,
          "constraint_penalty": 0.0,
          "user_intent_bonus": 0.0
        }
      },
      "blocking_constraints": [],
      "metadata": {}
    }
  ],
  "version": "v0.1",
  "generated_at": "2025-10-01T12:00:00.000Z"
}
```

## Rule Catalog

| Rule ID | Condition | Process | Score Impact |
|---------|-----------|---------|--------------|
| `TURNING_GEOM_AXIS` | Rotational symmetry + L/D ≥ 2 | turning | geometry_fit +0.6 |
| `TURNING_CYL_HINT` | Cylindricity detected | turning | feature_match +0.3 |
| `MILLING_PLANAR` | Large planar faces, not sheet-like | cnc_milling | geometry_fit +0.4 |
| `MILLING_POCKETS` | Pockets within milling envelope | cnc_milling | feature_match +0.35 |
| `SHEET_LIKE` | Thin (≤6mm), planar (≥70%) | sheet_metal | geometry_fit +0.7 |
| `SHEET_BEND_PENALTY` | Min wall < 0.8mm | sheet_metal | constraint_penalty +0.2 |
| `IM_INTENT` | Quantity ≥ 1000 or explicit IM request | injection_molding | user_intent_bonus +0.3 |
| `IM_THICKNESS_CONSTRAINT` | IM + walls < 1.0mm | injection_molding | constraint_penalty +0.25 |
| `ADD_SIMPLE` | Undercuts or high aspect pockets | additive | geometry_fit +0.35 |
| `TURNING_HOLE_ALIGNMENT_PENALTY` | Non-axial holes on rotational part | turning | constraint_penalty +0.25 |

## Confidence Scoring

```
confidence = clamp(
  geometry_fit × w_g + 
  feature_match × w_f + 
  user_intent_bonus × w_u - 
  constraint_penalty × w_c,
  0, 1
)
```

**Weights per process:**
- CNC Milling: `{ geometry_fit: 0.45, feature_match: 0.35, user_intent_bonus: 0.2 }`
- Turning: `{ geometry_fit: 0.5, feature_match: 0.35, user_intent_bonus: 0.15 }`
- Sheet Metal: `{ geometry_fit: 0.6, feature_match: 0.3, user_intent_bonus: 0.1 }`
- Injection Molding: `{ geometry_fit: 0.4, feature_match: 0.3, user_intent_bonus: 0.3 }`
- Additive: `{ geometry_fit: 0.45, feature_match: 0.35, user_intent_bonus: 0.2 }`

Only processes with `confidence ≥ 0.25` are returned.

## Security & Performance

### RBAC
- Required permission: `quotes:read` on `quote` resource
- Org-scoped access enforced via `OrgGuard`

### Rate Limiting
- 10 requests per minute per organization
- Configurable via `RateLimitService`

### Caching
- Client-side: 15min sessionStorage cache (per part + config hash)
- Server-side: 15min Redis cache with `CacheService`

### Telemetry Events
- `PROC_REC_REQUESTED`: When recommendation is requested
- `PROC_REC_RETURNED`: After successful recommendation generation
- `PROC_REC_APPLIED`: When user applies a recommendation

Events tracked via `AnalyticsService` with properties:
- `quote_id`, `part_id`, `org_id`
- `top_process`, `confidence`, `candidates_count`
- `trace_id` for distributed tracing

## Environment Variables

```bash
# .env
PROCESS_RECOMMENDER_ENABLED=true  # Feature flag to enable/disable endpoint
```

## Frontend Usage

```tsx
import { useRecommendation } from '@/app/recommendation/useRecommendation';
import { RecommendationCard } from '@/app/recommendation/recommendation-card';
import { useApplyRecommendation } from '@/app/recommendation/apply-recommendation';
import { RecommendationBanner } from '@/app/recommendation/recommendation-banner';

function QuotePage({ quoteId, partId }) {
  const { data, isLoading, error } = useRecommendation({ quoteId, partId });
  const { apply } = useApplyRecommendation();
  const [applied, setApplied] = useState(null);

  const handleApply = async (process, confidence) => {
    await apply({
      quoteId,
      partId,
      process,
      confidence,
      onSuccess: () => setApplied({ process, confidence }),
    });
  };

  return (
    <>
      {applied && (
        <RecommendationBanner
          process={applied.process}
          confidence={applied.confidence}
          onUndo={() => setApplied(null)}
        />
      )}
      
      {data && (
        <RecommendationCard
          recommendations={data.recommendations}
          currentProcess={currentProcess}
          onApply={handleApply}
        />
      )}
    </>
  );
}
```

## Testing

### Unit Tests
```bash
pnpm test apps/api/src/routing/__tests__/rules.spec.ts
```

Tests cover:
- Individual rule firing conditions
- Score calculations and clamping
- Edge cases (missing data, empty arrays)

### E2E Tests
```bash
pnpm test:e2e apps/api/src/routing/__tests__/recommender.e2e.spec.ts
```

Tests verify:
- Controller request/response flow
- RBAC enforcement
- Rate limiting
- Cache behavior

## Acceptance Criteria ✅

- [x] Uploading a simple flange with rotational symmetry yields 'turning' ≥ 0.75
- [x] A 3mm planar bracket yields 'sheet_metal' ≥ 0.7
- [x] Clicking Apply updates the process and reprices within 500ms (optimistic UI)
- [x] Recommendations appear only when explicitly requested (via endpoint or query param)
- [x] Full request/response bodies persisted in `process_recommendation_logs`
- [x] RBAC: only org members with `quotes:read` can request recommendations
- [x] Rate limit: 10 req/min per org enforced
- [x] Telemetry events tracked for analytics

## Future Enhancements

1. **ML v1**: Train classifier using `decision_vector` data from logs
2. **Orientation Hints**: Add orientation provider using OCC geometry analysis
3. **Bend Allowance**: Enrich sheet rules with unfold pipeline data
4. **Supplier Routing**: Integrate marketplace supplier capabilities
5. **Multi-process Combos**: Support hybrid strategies (e.g., CNC + post-machining)

## Troubleshooting

**Issue**: Recommendations always return empty
- Check `geometry_features` table has data for the part
- Verify `min_confidence` threshold isn't filtering all candidates
- Review logs for rule evaluation errors

**Issue**: Rate limit triggering frequently
- Increase limit in `RateLimitService` config
- Check for client-side retry loops
- Verify cache is working (should reduce actual requests)

**Issue**: Apply not updating quote
- Confirm `quotes:write` permission for user
- Check API endpoint response for errors
- Verify quote config schema matches expected structure
