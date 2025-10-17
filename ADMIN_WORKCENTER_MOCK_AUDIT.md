# Admin Workcenter Dashboard – Mock Audit Report
**Status:** Work in progress – Mixed live + mock data  
**Last Updated:** October 17, 2025

---

## Executive Summary
The admin workcenter dashboard is **60% live** and **40% mock**.

**Live ✅:**
- Manual review queue (`AdminReviewSummarySnapshot`)
- BullMQ queue status (`AdminQueueSnapshot`)
- Webhook provider status (`AdminWebhookStatusSnapshot`)
- Failed job errors (`AdminErrorSnapshot`)
- SLO metrics (`AdminSloSnapshot`)
- Database latency (`AdminDbLatencySnapshot`)

**Mock ❌ (Needs wiring):**
- Webhook replay operations
- Error tracking (Sentry integration)
- Issue creation (Jira/Linear backend)
- User management list
- Organization list
- "Needs Review" and "Priced" queues (legacy UI components)

---

## Frontend Mocks

### File: `apps/web/app/admin/workcenter/page.tsx`

#### 1. **Mock Constants (Lines 96–140)**
```typescript
const mockNeedsReview = [
  { id: 'Q-2024-001', org: 'Acme Corp', ... },
  { id: 'Q-2024-002', org: 'TechStart Inc', ... }
];

const mockPriced = [
  { id: 'Q-2024-003', org: 'BuildCo LLC', ... },
  { id: 'Q-2024-004', org: 'InnovateLab', ... }
];
```
**Usage:** Rendered in legacy `NeedsReviewQueue()` and `PricedQueue()` functions (lines 1189, 1280)  
**Status:** Dead code – not integrated with live data  
**Action:** Remove or wire to new admin review detail endpoints

---

#### 2. **Dashboard Data Fallback (Lines 261–360)**
```typescript
const dashboardData = useMemo(() => ({
  openReviews: { count: 12, items: [...] },
  queues: [...],
  db: { read_p95_ms: 18, write_p95_ms: 22, ... },
  webhooks: { stripe: {...}, paypal: {...} },
  slos: { first_price_p95_ms: 1450, ... },
  errors: { sentry: [...], jobs: [...] }
}), []);
```
**Purpose:** Fallback values for SWR caches when API is unavailable  
**Status:** ✅ Still used as graceful degradation for `fallbackSloSnapshot` and `fallbackDbLatencySnapshot`  
**Action:** Keep; these are deterministic fallbacks for fault tolerance

---

#### 3. **Legacy UI Components (Lines ~1150–1350)**
- `NeedsReviewQueue()` – Hardcoded table using `mockNeedsReview`
- `PricedQueue()` – Hardcoded table using `mockPriced`
- `SystemHealthRail()` – Static status indicators

**Status:** ❌ Dead code; not rendered in main page  
**Action:** Remove if confirmed unused, or wire to admin-review endpoints

---

### Summary Table: Frontend Mocks
| Component | Location | Status | Priority |
|-----------|----------|--------|----------|
| `mockNeedsReview` | Lines 97–116 | Dead code | LOW – Remove |
| `mockPriced` | Lines 118–137 | Dead code | LOW – Remove |
| Dashboard fallbacks | Lines 261–360 | Live (fallback) | OK – Keep |
| `NeedsReviewQueue()` | Lines ~1150–1220 | Dead code | LOW – Remove |
| `PricedQueue()` | Lines ~1250–1330 | Dead code | LOW – Remove |

---

## Backend Mocks

### File: `apps/api/src/modules/admin/admin.service.ts`

#### 1. **Mock Users & Organizations (Lines 12–25)**
```typescript
private readonly mockUsers = [
  { id: 'u_1', email: 'john.doe@example.com', role: 'admin', ... },
  ...
];

private readonly mockOrgs = [
  { id: 'org_1', name: 'Acme Corp', user_count: 14, ... },
  ...
];
```
**Usage:** `listUsers()` and `listOrgs()` endpoints  
**Status:** ❌ Mock data – should query Supabase `users` and `organizations` tables  
**Priority:** **MEDIUM** – Affects admin user management UI (not visible on workcenter yet)

---

#### 2. **Webhook Status (Lines 219–241)**
```typescript
async getWebhookStatus(window: string = '1h') {
  const evaluatedAt = new Date().toISOString();
  const providers = [
    { provider: 'stripe', status: 'OK', failed_24h: 0, ... },
    { provider: 'paypal', status: 'WARN', failed_24h: 1, ... }
  ];
  return { window, evaluated_at: evaluatedAt, items: providers };
}
```
**Status:** ✅ **Contract-aligned** but data is hardcoded  
**Should query:** Webhook delivery logs from Supabase (or Stripe/PayPal APIs directly)  
**Priority:** **MEDIUM** – Currently shows dummy data; affects monitoring

---

#### 3. **Webhook Replay (Lines 243–251)**
```typescript
async replayWebhooks(provider: string, window: string = '24h') {
  // Mock webhook replay - in real implementation, this would trigger webhook replays
  return {
    provider,
    replayed: provider === 'stripe' ? 0 : 1,
    window_seconds: this.parseTimeWindow(window) / 1000
  };
}
```
**Status:** ❌ **No-op mock**  
**Endpoint:** `POST /admin/webhooks/{provider}/replay`  
**Should integrate:** Stripe API + PayPal API webhook resend operations  
**Frontend:** Already wired at `apps/web/src/app/api/admin/webhooks/[provider]/replay/route.ts`  
**Priority:** **HIGH** – Blocks operational troubleshooting

---

#### 4. **Error Tracking (Lines 254–289)**
```typescript
async getErrors(window: string = '1h') {
  const evaluatedAt = new Date().toISOString();
  return {
    window,
    evaluated_at: evaluatedAt,
    sentry: [
      {
        id: 'err_123',
        service: 'api',
        title: "TypeError: Cannot read property 'x'",
        count_1h: 12,
        ...
      }
    ],
    failed_jobs: [...]
  };
}
```
**Status:** ✅ Contract-aligned but data is hardcoded  
**Sentry section:** Should query **Sentry API** or logs  
**Failed jobs:** ✅ **Already wired to live BullMQ data** via `getFailedJobs(window)`  
**Priority:** **MEDIUM** – Sentry integration pending; failed jobs are live

---

#### 5. **Issue Creation (Lines 291–302)**
```typescript
async createIssue(source: string, errorId: string) {
  // Mock issue creation - in real implementation, this would create a ticket/issue
  return {
    success: true,
    issue_id: `issue_${Date.now()}`,
    source,
    error_id: errorId
  };
}
```
**Status:** ❌ **No-op mock**  
**Endpoint:** `POST /admin/issues?source=...&error_id=...`  
**Should integrate:** Jira/Linear API or custom ticketing system  
**Frontend:** Partially wired (buttons visible in error table; no handler)  
**Priority:** **LOW** – Nice-to-have operational feature

---

### File: `apps/api/src/modules/queue-monitor/queue-monitor.service.ts`

#### 1. **Webhook Status (Lines 177–209)**
```typescript
async getWebhookStatus(window: string = '1h') {
  const evaluatedAt = new Date().toISOString();
  return {
    window,
    evaluated_at: evaluatedAt,
    items: [
      { provider: 'stripe', status: 'OK', failed_24h: 0, ... },
      { provider: 'paypal', status: 'WARN', failed_24h: 1, ... }
    ]
  };
}
```
**Status:** ❌ **Duplicate of `admin.service` mock**  
**Action:** Consolidate; remove from queue-monitor or unify data source

---

#### 2. **Webhook Replay (Lines 211–220)**
```typescript
async replayWebhooks(provider: string, window: string = '24h') {
  // Mock webhook replay - in real implementation, this would trigger webhook replays
  return { provider, replayed: provider === 'stripe' ? 0 : 1, ... };
}
```
**Status:** ❌ **Duplicate of `admin.service` mock**  
**Action:** Consolidate

---

#### 3. **Review Summary (Lines 262–285)**
```typescript
async getReviewSummary(window: string = '1h') {
  // Mock review summary - in real implementation, this would query review queue
  return {
    count: 12,
    new_count: 3,
    ...
  };
}
```
**Status:** ❌ **Obsolete** – `admin.service.getReviewSummary()` is the live version using Supabase  
**Action:** **Remove** from queue-monitor; ensure only admin.service is called

---

### Summary Table: Backend Mocks
| Method | File | Status | Priority |
|--------|------|--------|----------|
| `listUsers()` | admin.service.ts | Mock data | MEDIUM |
| `listOrgs()` | admin.service.ts | Mock data | MEDIUM |
| `getWebhookStatus()` | admin.service.ts | Mock data | MEDIUM |
| `replayWebhooks()` | admin.service.ts | No-op | **HIGH** |
| `getErrors()` – Sentry | admin.service.ts | Mock data | MEDIUM |
| `getErrors()` – Failed jobs | admin.service.ts | ✅ Live | OK |
| `createIssue()` | admin.service.ts | No-op | LOW |
| `getWebhookStatus()` | queue-monitor.service.ts | Duplicate | LOW |
| `replayWebhooks()` | queue-monitor.service.ts | Duplicate | LOW |
| `getReviewSummary()` | queue-monitor.service.ts | Obsolete | **HIGH** |

---

## Recommended Fixes (Priority Order)

### 🔴 **CRITICAL – Fixes to Unblock Workcenter**

1. **Remove duplicate webhook/review methods from `queue-monitor.service.ts`**
   - Keep only `admin.service` as source of truth
   - Remove `getWebhookStatus()`, `replayWebhooks()`, `getReviewSummary()`

2. **Implement webhook replay operations**
   - Integrate Stripe API: `https://api.stripe.com/v1/events/{id}/resend`
   - Integrate PayPal API: Webhook event resend endpoints
   - Update `admin.service.replayWebhooks()`

3. **Wire Sentry error tracking**
   - Query Sentry API for recent errors
   - Transform to `AdminErrorEventVNext` shape
   - Update `admin.service.getErrors()` – Sentry section

### 🟡 **MEDIUM – Improves Admin Features**

4. **Implement issue creation (Jira/Linear)**
   - Wire `admin.service.createIssue()` to ticketing backend
   - Ensure frontend buttons trigger handlers

5. **Query real webhook delivery logs**
   - Replace hardcoded webhook status with actual Supabase delivery logs
   - Update `admin.service.getWebhookStatus()`

6. **Query real user/org data**
   - Replace mock users/orgs with Supabase `users` + `organizations` tables
   - Ensure RLS enforcement

### 🟢 **LOW – Code Cleanup**

7. **Remove unused UI components**
   - Delete `NeedsReviewQueue()`, `PricedQueue()`, `SystemHealthRail()`
   - Delete `mockNeedsReview`, `mockPriced` constants
   - Verify no external imports reference these

---

## Testing Checklist

- [ ] `pnpm lint` passes (remove unused mocks)
- [ ] `pnpm test` passes (admin service tests)
- [ ] Webhook replay POST → Stripe/PayPal test
- [ ] Error tracking queries Sentry (not mock)
- [ ] User list queries Supabase (not mock)
- [ ] No circular service dependencies introduced

---

## Files to Review/Update

**Frontend:**
- `apps/web/app/admin/workcenter/page.tsx` – Remove unused `mockNeedsReview`, `mockPriced`, legacy UI functions

**Backend:**
- `apps/api/src/modules/admin/admin.service.ts` – Implement webhook replay, Sentry, issue creation
- `apps/api/src/modules/admin/admin.controller.ts` – Ensure routes are guarded + documented
- `apps/api/src/modules/queue-monitor/queue-monitor.service.ts` – Remove duplicates

**Contracts (may need updates):**
- `packages/shared/src/contracts/vnext/admin.ts` – Verify webhook replay and issue creation responses align
