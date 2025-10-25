# Complete Application Organization & Architecture Plan
**Date:** October 24, 2025  
**Status:** Draft V2 - Comprehensive Refactor  
**Estimated Effort:** 4-5 days  
**Scope:** Entire monorepo (API, Web, Worker, Shared, Infrastructure)

---

## Executive Summary

This is a **complete application reorganization** covering:
- ✅ **Backend API** (NestJS) - 58+ modules, infrastructure, business logic
- ✅ **Frontend Web** (Next.js) - Components, pages, hooks, state management
- ✅ **Background Worker** (BullMQ) - Job processors, queues, services
- ✅ **Shared Package** - Types, utilities, validation, contracts
- ✅ **Infrastructure** - Docker, configs, scripts, monitoring, deployment
- ✅ **Documentation** - Consolidated, updated, developer-friendly

**Goal:** Create a production-ready, enterprise-grade monorepo structure that's:
- 🎯 **Maintainable** - Clear boundaries, logical grouping, easy to find code
- 🚀 **Scalable** - Supports growth without structural refactors
- 🔒 **Type-safe** - Shared contracts enforced across API ↔ Web ↔ Worker
- 📦 **Modular** - Independent deployable units with clear dependencies
- 🧪 **Testable** - Easy to unit test, integration test, and E2E test
- 📚 **Documented** - Self-documenting code structure + comprehensive docs

---

## Current State Analysis (Expanded)

The API currently has:
- **58 modules** in `modules/` directory
- **Duplicate folders** at top level (`dfm/`, `pricing/`, `leadtime/`, `audit/`) and in `modules/`
- **Incomplete migration** from Phase 7 (some folders not moved)
- **103+ module definitions** scattered across different locations
- **Only 7 modules** currently imported in `app.module.ts` (most are unused/inaccessible)

**Goal:** Create a clean, hierarchical module structure that's maintainable, scalable, and follows NestJS best practices.

---

## Current State Analysis

### ✅ What's Working
- API is healthy and stable (without PricingModule)
- Core infrastructure modules working: SupabaseModule, CacheModule, QueueModule, AuditModule
- Dead code analysis completed (2,754 lines report generated)

### ❌ Problems Identified

#### 1. **Duplicate Folder Structure** (CRITICAL)
```
src/
├── audit/              ← DUPLICATE (old location)
├── dfm/                ← DUPLICATE (old location)  
├── leadtime/           ← DUPLICATE (old location)
├── pricing/            ← DUPLICATE (old location)
└── modules/
    ├── audit-legacy/   ← NEW (moved, but not fully integrated)
    ├── dfm/            ← NEW (but also exists at top level)
    ├── leadtime-legacy/← NEW (moved)
    └── pricing/        ← NEW (but also exists at top level)
```

#### 2. **Inconsistent Naming**
- Mix of `-legacy` suffix (audit-legacy, quotes-legacy) and non-legacy (dfm, pricing)
- No clear pattern for what gets `-legacy` treatment
- Confusing for developers

#### 3. **Orphaned Top-Level Folders**
Still at root level, should be in `modules/`:
- `common/` - Shared utilities and pipes
- `dfm/` - DFM logic (duplicate)
- `docs/` - OpenAPI/Swagger setup
- `events/` - EventEmitter module
- `marketplace/` - Marketplace/supplier routing
- `materials/` - Materials DTOs and logic
- `middleware/` - Middleware module
- `pricing/` - Legacy pricing logic (duplicate)
- `scripts/` - Utility scripts
- `tax/` - Tax calculation module
- `ws/` - WebSocket gateway

#### 4. **Module Import Chaos**
In `app.module.ts`, we import 39 modules but only **7 are registered**:
```typescript
imports: [
  ConfigModule,
  SupabaseModule,
  HealthModule,
  RateLimitModule,
  CacheModule,
  QueueModule,
  AuditModule,
  // 32+ other modules imported but commented out or not added!
]
```

#### 5. **Dead Code Accumulation**
- 2,754 lines of unused exports
- Entire modules never imported (EventsModule, MiddlewareModule, ObservabilityModule)
- Unused controllers (AdminPricingRecalcController, etc.)

---

## Proposed Solution: 3-Phase Reorganization

### **Phase 1: Clean Up Duplicates & Complete Migration** (Day 1, Morning)

#### 1.1 Remove Top-Level Duplicate Folders
```bash
# Delete old duplicate folders (already moved to modules/)
rm -rf src/audit/         # Now in modules/audit-legacy/
rm -rf src/leadtime/      # Now in modules/leadtime-legacy/
```

#### 1.2 Move Remaining Top-Level Folders to Modules
```bash
# Infrastructure → lib/
mv src/common/         → src/lib/common/
mv src/middleware/     → src/lib/middleware/

# Business Logic → modules/
mv src/dfm/            → src/modules/dfm-legacy/  # Rename to avoid conflict
mv src/pricing/        → src/modules/pricing-legacy/  # Rename to avoid conflict
mv src/marketplace/    → src/modules/marketplace/
mv src/materials/      → src/modules/materials/
mv src/tax/            → src/modules/tax/
mv src/ws/             → src/modules/websockets/  # Rename for clarity

# Documentation → docs/ (keep separate)
# Keep src/docs/ as is

# Events/Observability → modules/core/ (new grouping)
mv src/events/         → src/modules/core/events/
mv src/observability/  → src/modules/core/observability/

# Scripts → Keep at top level (not modules)
# Keep src/scripts/ as is
```

#### 1.3 Consolidate Legacy Modules
Rename all legacy suffixes consistently:
```bash
# Rename legacy modules with consistent pattern
modules/audit-legacy/       → modules/legacy-audit/
modules/leadtime-legacy/    → modules/legacy-leadtime/
modules/quotes-legacy/      → modules/legacy-quotes/
modules/revisions-legacy/   → modules/legacy-revisions/
modules/dfm-legacy/         → modules/legacy-dfm/
modules/pricing-legacy/     → modules/legacy-pricing/
```

---

### **Phase 2: Hierarchical Module Organization** (Day 1, Afternoon - Day 2)

Create a logical grouping structure:

```
src/
├── lib/                      # Infrastructure (stays as is)
│   ├── cache/
│   ├── common/               # ← MOVED from src/common/
│   ├── middleware/           # ← MOVED from src/middleware/
│   ├── rate-limit/
│   └── supabase/
│
├── modules/
│   ├── core/                 # Core platform modules
│   │   ├── auth/
│   │   ├── events/           # ← MOVED from src/events/
│   │   ├── health/
│   │   ├── observability/    # ← MOVED from src/observability/
│   │   ├── queue-monitor/
│   │   └── test/
│   │
│   ├── business/             # Business domain modules
│   │   ├── catalog/
│   │   ├── geometry/
│   │   ├── machines/
│   │   ├── materials/        # ← MOVED from src/materials/
│   │   ├── finishes/
│   │   ├── tax/              # ← MOVED from src/tax/
│   │   └── cad/
│   │
│   ├── quoting/              # Quote-related modules
│   │   ├── pricing/          # Current pricing (when fixed)
│   │   ├── pricing-core/
│   │   ├── dfm/              # Current DFM (when fixed)
│   │   ├── leadtime/         # Current leadtime (when fixed)
│   │   ├── quotes/
│   │   ├── manual-review/
│   │   └── routing/
│   │
│   ├── legacy/               # Legacy/deprecated modules
│   │   ├── audit/            # ← RENAMED from audit-legacy
│   │   ├── dfm/              # ← MOVED from src/dfm/
│   │   ├── leadtime/         # ← RENAMED from leadtime-legacy
│   │   ├── pricing/          # ← MOVED from src/pricing/
│   │   ├── quotes/           # ← RENAMED from quotes-legacy
│   │   └── revisions/        # ← RENAMED from revisions-legacy
│   │
│   ├── operations/           # Operational modules
│   │   ├── files/
│   │   ├── documents/
│   │   ├── pdf/
│   │   ├── notify/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── scheduler/
│   │   └── marketplace/      # ← MOVED from src/marketplace/
│   │
│   ├── organization/         # Org/user management
│   │   ├── orgs/
│   │   ├── invites/
│   │   ├── leads/
│   │   ├── suppliers/
│   │   └── review/
│   │
│   ├── admin/                # Admin portal modules
│   │   ├── admin/            # Main admin module
│   │   ├── admin-alerts/
│   │   ├── admin-api-keys/
│   │   ├── admin-branding/
│   │   ├── admin-compliance/
│   │   ├── admin-content/
│   │   ├── admin-dev/
│   │   ├── admin-dfm/
│   │   ├── admin-errors/
│   │   ├── admin-feature-flags/
│   │   ├── admin-files/
│   │   ├── admin-health/
│   │   ├── admin-metrics/
│   │   ├── admin-orgs/
│   │   ├── admin-pricing/
│   │   ├── admin-rbac/
│   │   ├── admin-sandbox/
│   │   ├── admin-settings/
│   │   ├── admin-system/
│   │   └── admin-users/
│   │
│   ├── integration/          # Third-party integrations
│   │   ├── ai/
│   │   ├── analytics/
│   │   ├── accounting/
│   │   ├── finance/
│   │   ├── metrics/
│   │   └── qap/
│   │
│   └── websockets/           # WebSocket modules
│       └── gateway/          # ← MOVED from src/ws/
│
├── queues/                   # Queue infrastructure (stays as is)
├── types/                    # TypeScript types (stays as is)
├── docs/                     # API documentation (stays as is)
├── scripts/                  # Utility scripts (stays as is)
├── app.module.ts
└── main.ts
```

---

### **Phase 3: Rewire AppModule & Remove Dead Code** (Day 2 - Day 3)

#### 3.1 Create Module Barrel Exports
Create index files for each category:
```typescript
// src/modules/core/index.ts
export { AuthModule } from './auth/auth.module';
export { RbacModule } from './auth/rbac.module';
export { HealthModule } from './health/health.module';
export { EventsModule } from './events/events.module';
// ... etc

// src/modules/business/index.ts
export { CatalogModule } from './catalog/catalog.module';
export { GeometryModule } from './geometry/geometry.module';
// ... etc
```

#### 3.2 Rewrite app.module.ts
Organize imports by category and enable modules progressively:

```typescript
// Core Infrastructure
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule, CacheModule, RateLimitModule } from './lib';
import { QueueModule } from './queues';

// Core Platform Modules
import { 
  AuthModule, 
  RbacModule, 
  HealthModule,
  EventsModule 
} from './modules/core';

// Business Domain Modules
import { 
  CatalogModule,
  GeometryModule,
  MachinesModule,
  MaterialsModule,
  FinishesModule,
  TaxModule,
  CadModule
} from './modules/business';

// Quoting Modules (to be enabled when fixed)
import { 
  // PricingModule,        // TODO: Fix metatype error
  PricingCoreModule,
  // DfmModule,            // TODO: Fix metatype error
  // LeadtimeModule,       // TODO: Fix metatype error
  QuotesModule,
  ManualReviewModule,
  RoutingModule
} from './modules/quoting';

// Operations Modules
import { 
  FilesModule,
  DocumentsModule,
  NotifyModule,
  OrdersModule,
  PaymentsModule,
  SchedulerModule,
  MarketplaceModule
} from './modules/operations';

// Organization Modules
import { 
  OrgsModule,
  InvitesModule,
  LeadsModule,
  SuppliersModule,
  ReviewModule
} from './modules/organization';

// Admin Modules
import { 
  AdminModule,
  AdminUsersModule,
  AdminOrgsModule,
  AdminPricingModule,
  AdminFeatureFlagsModule,
  AdminSettingsModule,
  AdminContentModule,
  AdminHealthModule,
  AdminMetricsModule,
  AdminSystemModule
  // ... enable others as needed
} from './modules/admin';

// Integration Modules
import { 
  AIModule,
  AnalyticsModule
} from './modules/integration';

// Legacy Modules (for backward compatibility)
import { AuditModule } from './modules/legacy/audit/audit.module';

@Module({
  imports: [
    // 1. Core Infrastructure
    ConfigModule.forRoot({ /* ... */ }),
    SupabaseModule,
    CacheModule,
    RateLimitModule,
    QueueModule,
    
    // 2. Core Platform
    AuthModule,
    RbacModule,
    HealthModule,
    EventsModule,
    
    // 3. Business Domain
    CatalogModule,
    GeometryModule,
    MachinesModule,
    MaterialsModule,
    FinishesModule,
    TaxModule,
    CadModule,
    
    // 4. Quoting (partial - some disabled)
    PricingCoreModule,
    // PricingModule,        // TODO: Fix metatype error
    // DfmModule,            // TODO: Fix metatype error  
    // LeadtimeModule,       // TODO: Fix metatype error
    QuotesModule,
    ManualReviewModule,
    RoutingModule,
    
    // 5. Operations
    FilesModule,
    DocumentsModule,
    NotifyModule,
    OrdersModule,
    PaymentsModule,
    SchedulerModule,
    MarketplaceModule,
    
    // 6. Organization
    OrgsModule,
    InvitesModule,
    LeadsModule,
    ReviewModule,
    
    // 7. Admin (core only, enable others as needed)
    AdminModule,
    AdminUsersModule,
    AdminOrgsModule,
    AdminPricingModule,
    AdminFeatureFlagsModule,
    AdminSettingsModule,
    AdminContentModule,
    AdminHealthModule,
    AdminMetricsModule,
    AdminSystemModule,
    
    // 8. Integrations
    AIModule,
    AnalyticsModule,
    
    // 9. Legacy (for backward compatibility)
    AuditModule,
  ],
})
export class AppModule {}
```

#### 3.3 Remove Dead Code
Based on `dead-code-report.txt`, remove:
- Unused modules (EventsModule if not wired, ObservabilityModule, etc.)
- Unused controllers (AdminPricingRecalcController, etc.)
- Unused exports in `packages/shared/`
- Legacy pricing files with 0 imports

#### 3.4 Update All Import Paths
Run automated sed replacements:
```bash
# Update imports for moved modules
find src -type f -name "*.ts" -exec sed -i \
  "s|from '../common/|from '../lib/common/|g" {} \;
  
find src -type f -name "*.ts" -exec sed -i \
  "s|from '../../common/|from '../../lib/common/|g" {} \;

# ... (additional replacements for each moved folder)
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review and approve this plan
- [ ] Create feature branch: `refactor/module-organization-v2`
- [ ] Backup current working state
- [ ] Document current module import tree (for rollback reference)

### Phase 1: Clean Duplicates (4-6 hours)
- [ ] Remove duplicate top-level folders (audit, leadtime)
- [ ] Move remaining top-level folders to appropriate locations
- [ ] Rename all legacy modules with consistent `legacy-*` pattern
- [ ] Update import paths (automated with sed/scripts)
- [ ] Build and verify API starts
- [ ] Run integration tests
- [ ] Commit: "refactor(api): remove duplicates and complete module migration"

### Phase 2: Hierarchical Organization (8-12 hours)
- [ ] Create new directory structure (core/, business/, quoting/, etc.)
- [ ] Move modules into categories
- [ ] Create barrel export files (index.ts for each category)
- [ ] Update all import paths across codebase
- [ ] Fix any broken imports
- [ ] Build and verify API starts
- [ ] Run integration tests
- [ ] Commit: "refactor(api): implement hierarchical module organization"

### Phase 3: Rewire & Clean (8-12 hours)
- [ ] Rewrite app.module.ts with categorized imports
- [ ] Enable all working modules (progressively test each)
- [ ] Remove dead code based on report
- [ ] Remove unused module definitions
- [ ] Clean up unused exports in packages/shared/
- [ ] Update documentation
- [ ] Build and verify API starts
- [ ] Run full test suite
- [ ] Test all portals (instant-quote, admin, supplier)
- [ ] Commit: "refactor(api): rewire app module and remove dead code"

### Post-Implementation
- [ ] Performance testing (ensure no regression)
- [ ] Deploy to staging environment
- [ ] Monitor for errors
- [ ] Update CHANGELOG.md
- [ ] Create PR with detailed summary
- [ ] Code review
- [ ] Merge to main

---

## Risk Assessment

### 🔴 High Risk
- **Import path changes**: With 1000+ files, import updates could break things
  - *Mitigation*: Use automated scripts, test incrementally, have rollback plan

### 🟡 Medium Risk
- **Module dependency conflicts**: Moving modules might expose hidden circular deps
  - *Mitigation*: Test each category separately, use PricingCoreModule pattern

- **Runtime errors**: Some modules might not be properly registered
  - *Mitigation*: Enable modules progressively, test after each addition

### 🟢 Low Risk
- **Dead code removal**: Safe as code is unused
  - *Mitigation*: Keep in separate commit for easy rollback

---

## Success Criteria

✅ **Must Have:**
1. API builds without errors
2. API starts and all health checks pass
3. All currently working endpoints remain functional
4. No duplicate folders in codebase
5. Clear module hierarchy with logical grouping
6. All modules properly imported in app.module.ts

✅ **Should Have:**
7. At least 50% of dead code removed
8. All import paths use barrel exports (index.ts)
9. Documentation updated (folder structure diagram)
10. TypeScript errors reduced by 30%

✅ **Nice to Have:**
11. PricingModule, DfmModule, LeadtimeModule re-enabled (if time permits)
12. Performance improvement (faster startup)
13. Smaller bundle size

---

## Rollback Plan

If issues arise:
1. **Phase 1 issues**: Restore from commit before Phase 1
2. **Phase 2 issues**: Revert Phase 2 commit, keep Phase 1 changes
3. **Phase 3 issues**: Revert Phase 3 commit, keep Phase 1+2 changes
4. **Critical issues**: Restore from branch backup: `git reset --hard backup-tag`

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Review & Approval | 1 hour | ⏳ Pending |
| Phase 1 | 4-6 hours | ⏳ Not Started |
| Phase 2 | 8-12 hours | ⏳ Not Started |
| Phase 3 | 8-12 hours | ⏳ Not Started |
| Testing & QA | 4-6 hours | ⏳ Not Started |
| **Total** | **2-3 days** | ⏳ Not Started |

---

## Questions for Review

1. **Naming Convention**: Do you prefer `legacy-*` or `*-legacy` for old modules?
2. **Categorization**: Are the proposed categories (core, business, quoting, etc.) correct for your domain?
3. **Admin Modules**: Should all 20+ admin-* modules be enabled, or only core ones?
4. **Dead Code**: Should we be aggressive (remove everything unused) or conservative (mark with @deprecated first)?
5. **Priority**: Which phase should we focus on first if time is limited?

---

## Next Steps

**Awaiting your approval to proceed. Please review and:**
1. ✅ Approve the plan (or suggest changes)
2. 🔧 Answer the questions above
3. 🚀 Confirm priority/timeline
4. 📋 Decide: Full plan or Phase 1 only?

Once approved, I'll start with **Phase 1: Clean Up Duplicates** and report progress after each phase.
