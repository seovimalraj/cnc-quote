# 🧹 CNC Quote Platform - Cleanup & Development Roadmap
## Comprehensive Analysis: Dead Code, Missing Features & Next Steps

**Analysis Date**: January 15, 2025  
**Platform Status**: 23% Complete (44 pages implemented, 149 pages missing)  
**Technical Debt Level**: HIGH ⚠️

---

## 📊 Executive Summary

### Current State Analysis
- **Implemented Pages**: 44 across all portals
- **Missing Pages**: 149 (identified in Enterprise Audit)
- **Dead/Unused Code**: ~25-30 folders/components
- **Backup Files**: 4 files (.bak, .backup, .backup2, .working)
- **Route Duplicates**: Multiple overlapping routes identified
- **Shared Package**: 500+ unused exports (mostly type definitions)

### Critical Decision Needed 🚨
**BEFORE implementing 149 new pages, we must decide:**
1. **Clean first, then build** (Recommended) - Removes confusion, cleaner foundation
2. **Build first, clean later** - Faster feature delivery, accumulates more debt
3. **Parallel approach** - Clean + build simultaneously (highest risk of conflicts)

---

## 🔍 PART 1: DEAD CODE AUDIT FINDINGS

### A. Immediate Delete (No Impact) - 4 Files

#### Backup Files (DELETE NOW)
```bash
# These should NEVER be in version control
rm apps/web/app/admin/review/page.tsx.bak
rm apps/web/app/dfm-analysis/[id]/page.tsx.backup
rm apps/web/app/dfm-analysis/[id]/page.tsx.backup2
rm apps/web/app/instant-quote/page.tsx.working
```
**Action**: Delete immediately. Git handles versioning.
**Risk**: NONE
**Time**: 2 minutes

---

### B. Unused Route Groups (HIGH PRIORITY CLEANUP)

#### 1. Unused App Routes (10 folders)
From `Audited files.txt`:

```
❌ apps/web/app/(Home)/          - Empty route group
❌ apps/web/app/(Ops)/           - Incomplete operations portal
❌ apps/web/app/api-tokens/      - Unused API token route
❌ apps/web/app/documents/       - Duplicate of /portal/documents
❌ apps/web/app/files/           - Duplicate of /portal/files
❌ apps/web/app/orders/[id]/     - Duplicate order route
❌ apps/web/app/portal/quotes/[id]/configure - Unused configurator
❌ apps/web/app/portal/quotes/[id]/pdf - Unused PDF generator
❌ apps/web/app/recommendation/  - Incomplete feature
❌ apps/web/app/support/         - Incomplete support portal
❌ apps/web/app/widget/          - Unused embed widget
```

**Recommendation**:
- **Delete**: (Home), api-tokens, documents, files, recommendation, support, widget
- **Evaluate**: (Ops) - might be needed for Enterprise Audit operations portal
- **Redirect**: orders/[id] → /portal/orders/[id]

---

#### 2. Duplicate Dashboard Routes (CRITICAL)

**Problem**: Two dashboard implementations exist

| Route | Location | Status | Features |
|-------|----------|--------|----------|
| `/dashboard` | `apps/web/app/dashboard/page.tsx` | Standalone | Mock data, basic stats, demo UI |
| `/portal/dashboard` | `apps/web/app/portal/dashboard/page.tsx` | Portal | Real data, recent quotes/orders, better styling |

**Impact**: Confuses users and developers about canonical dashboard
**Decision Required**: Which is the main customer dashboard?

**Recommended Action**:
```bash
# Option 1: Keep portal dashboard (recommended)
rm -rf apps/web/app/dashboard/
# Add redirect in middleware.ts
# /dashboard → /portal/dashboard

# Option 2: Keep standalone dashboard
# Move /portal/dashboard content to /dashboard
# Update all links to use /dashboard
```

---

#### 3. Quote Route Confusion (CRITICAL)

**Multiple overlapping quote routes:**

```
/quote/[id]/              ← Which is canonical?
/quotes/[id]/             ← Duplicate?
/get-quote/               ← Quote creation
/instant-quote/           ← V1 instant quote
/instant-quote-v2/        ← V2 instant quote (newer?)
/quote-config/[id]/       ← Configuration page
/(quote)/pricing-demo/    ← Should this be in production?
```

**Analysis**:
- `instant-quote` vs `instant-quote-v2` - One is likely deprecated
- `/quote/[id]` vs `/quotes/[id]` - Inconsistent naming
- `pricing-demo` - Demo route should not be in production

**Recommended Actions**:
1. **Standardize**: Choose `/portal/quotes/[id]` as canonical
2. **Deprecate**: Remove or redirect `/quote/[id]` (if duplicate)
3. **Version Management**: If v2 is current, delete `instant-quote` (v1)
4. **Remove Demo**: Delete `/(quote)/pricing-demo/` or feature-flag it

---

#### 4. Checkout Route Duplication

**Two checkout flows exist:**
```
/checkout/[quoteId]/           ← Which is active?
/secure-checkout/[quoteId]/    ← Duplicate?
```

**Recommendation**: Consolidate to `/portal/checkout/[quoteId]` (already exists)

---

### C. Unused Component Folders (15+ folders)

From `Audited files.txt` - components that are not imported anywhere:

```javascript
// UNUSED COMPONENT FOLDERS (10 major ones)
❌ src/components/portal/dashboard/     - Old dashboard components
❌ src/components/onboarding/           - Incomplete onboarding flow
❌ src/components/nav/                  - Replaced by navigation
❌ src/components/leadtime/             - Unused leadtime UI
❌ src/components/Layouts/header/       - Old header components
❌ src/components/instant-quote/        - Old instant quote UI
❌ src/components/dfm/                  - Old DFM components
❌ src/components/quote/                - Old quote components
❌ src/components/quote-detail/         - Old quote detail UI
❌ src/components/quotes/               - Old quotes list UI
```

**Analysis Strategy**:
1. **Confirm Unused**: Run `pnpm ts-prune` to verify no imports
2. **Check Git History**: See when last modified
3. **Archive First**: Move to `/archive` folder before deleting
4. **Delete in Batches**: Remove one folder at a time, test after each

**Risk Level**: MEDIUM - Some components might be referenced dynamically

---

### D. Unused Pages (3 pages)

From `Audited files.txt`:
```
❌ apps/web/app/analytics/page.tsx    - Unused analytics page
❌ apps/web/app/contact/page.tsx      - Unused contact form
❌ apps/web/app/dashboard/page.tsx    - See "Duplicate Dashboard" section
```

**Recommendation**: 
- `analytics` - Delete (duplicate of `/admin/analytics`)
- `contact` - Move to `/portal/support` if needed
- `dashboard` - Addressed in section B.2

---

### E. Ambiguous/Needs Review (1 file)

```
⚠️ apps/web/pages/admin/final-operations.tsx
```

**Question**: 
- Is this part of the new operations portal?
- Or is it a legacy `pages/` directory file that should be migrated to `app/`?

**Action Required**: Manual review to determine if this is:
1. Actively used (keep and migrate)
2. Deprecated (delete)
3. Duplicate of something in `app/admin/`

---

## 🔍 PART 2: SHARED PACKAGE ANALYSIS

### Massive Unused Export List

The `artifacts/dead-code-report.txt` shows **500+ unused exports** from `packages/shared/src/index.ts`.

**Key Findings**:
1. **Most are type definitions** - Low deletion risk
2. **Many are "used in module"** - Only unused as exports
3. **Some are legacy types** - Marked with "Legacy" suffix
4. **Admin pricing types** - Exported but only used in API

**Categories of Unused Exports**:

#### A. Safe to Keep (No Action)
- Type definitions used internally in shared package
- Contracts V1 and VNext (will be needed for enterprise features)
- Schema definitions (used by Zod validation)

#### B. Consider Removing (Low Priority)
- `*Legacy` types - Old versions kept for backward compatibility
- Prompt templates exported but only used in API
- Cache key builders only used in API

#### C. Investigate (Medium Priority)
```typescript
// Example: Admin pricing revision types (40+ exports)
- AdminPricingRevisionSystemPrompt
- AdminPricingRevisionUserPrompt
- AdminPricingRevisionPromptConfig
// Are these actually used in the admin portal?
```

**Recommendation**: 
- **DO NOT** mass-delete shared package exports
- **DO** remove `Legacy` suffixed types once migration complete
- **DO** audit unused exports after building missing admin pages

---

## 🎯 PART 3: MISSING FEATURES (from Enterprise Audit)

### Summary of Missing Pages: 149 Total

| Portal | Current | Missing | Completion % |
|--------|---------|---------|--------------|
| Customer Portal | 10 | 28 | 26% |
| Admin Portal | 18 | 35 | 34% |
| Supplier Portal | 12 | 22 | 35% |
| Finance Portal | 0 | 18 | 0% |
| Operations Portal | 4 | 16 | 20% |
| Super Admin | 0 | 30 | 0% |
| **TOTAL** | **44** | **149** | **23%** |

### Critical Missing Features (Top 20)

#### Customer Portal (High Priority)
1. **Profile Management Suite** (6 pages) - Users can't edit profiles
2. **Order Tracking** (7 pages) - No real-time tracking, returns, disputes
3. **Quote Comparison** - Can't compare multiple quotes
4. **Team Collaboration** (3 pages) - Orgs can't manage members
5. **Support System** (4 pages) - No ticketing or messaging

#### Admin Portal (High Priority)
6. **Order Management Enhanced** (8 pages) - Can't edit orders, no bulk actions
7. **CRM Features** (6 pages) - No customer profiles or segmentation
8. **Supplier Performance** (5 pages) - No metrics or quality tracking
9. **Financial Management** (7 pages) - No invoice generation, payment tracking
10. **Custom Reports** - No business intelligence tools

#### Finance Portal (Critical - 0% Complete)
11. **Accounting Dashboard** - Missing entirely
12. **Invoicing System** - Missing entirely
13. **Payment Processing** - Missing entirely
14. **Revenue Analytics** - Missing entirely
15. **Tax Compliance** - Missing entirely

#### Operations Portal (80% Missing)
16. **Capacity Planning** (4 pages) - Only basic view exists
17. **Shop Floor Management** - Missing entirely
18. **Quality Control** (3 pages) - Missing entirely
19. **Shipping & Logistics** (4 pages) - Missing entirely
20. **Inventory Management** - Missing entirely

---

## 🎯 PART 4: STRATEGIC RECOMMENDATIONS

### Option 1: CLEAN FIRST, BUILD LATER (Recommended ✅)

**Phase 1A: Emergency Cleanup (1 week)**
```bash
# Week 1: Delete obvious dead code
1. Delete backup files (2 min)
2. Delete unused route groups (2 hours)
3. Resolve dashboard duplication (4 hours)
4. Standardize quote routes (4 hours)
5. Delete unused pages (2 hours)
6. Run tests, verify nothing broke (8 hours)
```

**Phase 1B: Component Cleanup (1 week)**
```bash
# Week 2: Archive and delete unused components
1. Move unused component folders to /archive (4 hours)
2. Run full test suite (4 hours)
3. If tests pass, delete /archive (1 hour)
4. Update documentation (4 hours)
5. Code review and verification (3 hours)
```

**Phase 1C: Refactoring (2 weeks)**
```bash
# Weeks 3-4: Fix ambiguous code and consolidate
1. Review final-operations.tsx (4 hours)
2. Migrate any pages/ directory files to app/ (1 week)
3. Consolidate duplicate API routes (1 week)
4. Update all import paths (2 days)
5. Final testing and verification (3 days)
```

**Then: Build Missing Features (20+ weeks)**
- Start with Phase 1 of Launch Plan
- Clean foundation = fewer bugs
- Clear understanding of what exists vs. what doesn't

**Pros**:
- ✅ Clean foundation for new development
- ✅ Removes confusion about what's active vs. deprecated
- ✅ Easier to onboard new developers
- ✅ Prevents building on top of dead code
- ✅ Reduces bundle size and build times

**Cons**:
- ❌ Delays new feature delivery by 4 weeks
- ❌ Risk of accidentally deleting needed code
- ❌ Requires thorough testing

---

### Option 2: BUILD FIRST, CLEAN LATER (Risky ⚠️)

**Immediately start Phase 1 of Launch Plan**
- Implement 28 missing customer portal pages first
- Clean up dead code as you encounter it
- Schedule dedicated cleanup sprint after Phase 1 complete

**Pros**:
- ✅ Faster time to market for new features
- ✅ Revenue-generating features deployed sooner
- ✅ Can clean incrementally

**Cons**:
- ❌ New developers will be confused by dead code
- ❌ Risk of accidentally building on deprecated code
- ❌ Technical debt accumulates further
- ❌ Harder to clean later (more code = more complexity)
- ❌ May build duplicate features unknowingly

---

### Option 3: PARALLEL APPROACH (Highest Risk ⚠️⚠️)

**Split team into two tracks:**
- **Track A**: Cleanup team (2 developers, 4 weeks)
- **Track B**: Feature team (4 developers, ongoing)

**Pros**:
- ✅ Best of both worlds - clean AND build
- ✅ Cleanup happens without delaying features
- ✅ Can coordinate to avoid conflicts

**Cons**:
- ❌ High risk of merge conflicts
- ❌ Requires excellent coordination
- ❌ Feature team might build on code being deleted
- ❌ More complex project management

---

## 🎯 PART 5: DETAILED CLEANUP PLAN (IF OPTION 1 CHOSEN)

### Week 1: Emergency Cleanup Sprint

#### Day 1: Backup Files + Route Groups
```bash
# Morning: Delete backups
git rm apps/web/app/admin/review/page.tsx.bak
git rm apps/web/app/dfm-analysis/\[id\]/page.tsx.backup
git rm apps/web/app/dfm-analysis/\[id\]/page.tsx.backup2
git rm apps/web/app/instant-quote/page.tsx.working
git commit -m "chore: remove backup files"

# Afternoon: Delete unused route groups
git rm -rf apps/web/app/\(Home\)/
git rm -rf apps/web/app/api-tokens/
git rm -rf apps/web/app/documents/
git rm -rf apps/web/app/files/
git rm -rf apps/web/app/recommendation/
git rm -rf apps/web/app/support/
git rm -rf apps/web/app/widget/
pnpm test  # Run tests
git commit -m "chore: remove unused route groups"
```

#### Day 2: Dashboard Consolidation
```bash
# Decision: Keep /portal/dashboard, delete /dashboard
git rm -rf apps/web/app/dashboard/

# Add redirect in middleware.ts
# if (pathname === '/dashboard') {
#   return NextResponse.redirect(new URL('/portal/dashboard', request.url))
# }

# Update all links in codebase
grep -r "href=\"/dashboard\"" apps/web/
# Manually update each file

pnpm test
git commit -m "refactor: consolidate dashboards to /portal/dashboard"
```

#### Day 3: Quote Routes Standardization
```bash
# Step 1: Identify all quote routes
find apps/web/app -name "*quote*" -type d

# Step 2: Decide on canonical routes
# Keep: /portal/quotes/[id]
# Keep: /instant-quote-v2 (rename to /instant-quote)
# Delete: /quote/[id] (duplicate)
# Delete: /quotes/[id] (duplicate)
# Delete: /(quote)/pricing-demo/

# Step 3: Add redirects
# if (pathname.startsWith('/quote/')) {
#   return NextResponse.redirect(
#     new URL(pathname.replace('/quote/', '/portal/quotes/'), request.url)
#   )
# }

# Step 4: Delete deprecated routes
git rm -rf apps/web/app/quote/
git rm -rf apps/web/app/quotes/
git rm -rf "apps/web/app/(quote)/pricing-demo/"

# Step 5: Rename instant-quote-v2
git mv apps/web/app/instant-quote-v2 apps/web/app/instant-quote

pnpm test
git commit -m "refactor: standardize quote routes"
```

#### Day 4: Checkout & Other Duplicates
```bash
# Consolidate checkouts
git rm -rf apps/web/app/checkout/
git rm -rf apps/web/app/secure-checkout/
# Keep only /portal/checkout/[quoteId]

# Add redirects for old routes
# /checkout/[id] → /portal/checkout/[id]
# /secure-checkout/[id] → /portal/checkout/[id]

pnpm test
git commit -m "refactor: consolidate checkout flows"
```

#### Day 5: Testing & Verification
```bash
# Run full test suite
pnpm test

# Manual testing checklist:
# [ ] Dashboard loads correctly
# [ ] Old /dashboard redirects to /portal/dashboard
# [ ] Quote routes work (/portal/quotes/[id])
# [ ] Old quote URLs redirect properly
# [ ] Checkout flow works
# [ ] No broken links in navigation
# [ ] Build succeeds
pnpm build

# Deploy to staging
# Smoke test all major flows
```

---

### Week 2: Component Cleanup Sprint

#### Day 1-2: Archive Unused Components
```bash
# Create archive folder
mkdir -p archive/unused-components

# Move unused component folders
mv apps/web/src/components/portal/dashboard archive/unused-components/
mv apps/web/src/components/onboarding archive/unused-components/
mv apps/web/src/components/nav archive/unused-components/
mv apps/web/src/components/leadtime archive/unused-components/
mv apps/web/src/components/Layouts/header archive/unused-components/
mv apps/web/src/components/instant-quote archive/unused-components/
mv apps/web/src/components/dfm archive/unused-components/
mv apps/web/src/components/quote archive/unused-components/
mv apps/web/src/components/quote-detail archive/unused-components/
mv apps/web/src/components/quotes archive/unused-components/

git add archive/
git rm -rf apps/web/src/components/portal/dashboard
# ... repeat for each
git commit -m "chore: archive unused components"
```

#### Day 3: Test After Archiving
```bash
# Run tests
pnpm test

# Build
pnpm build

# If successful, components are truly unused
# If failures, restore from archive and investigate
```

#### Day 4: Delete Archive (if tests pass)
```bash
# If all tests passed on Day 3
rm -rf archive/unused-components
git commit -m "chore: permanently remove unused components"
```

#### Day 5: Documentation Update
```bash
# Update README with component structure
# Update developer guide with active components list
# Document what was deleted and why
```

---

### Week 3-4: Refactoring & Final Cleanup

#### Investigate Ambiguous Files
```bash
# Review final-operations.tsx
# Is it used? Check imports
grep -r "final-operations" apps/web/

# If unused, delete
# If used, migrate to app/ directory
```

#### Migrate pages/ to app/
```bash
# If any files in pages/ directory (old Next.js structure)
# Migrate to app/ directory (new Next.js 13+ structure)
```

#### Shared Package Cleanup (Low Priority)
```bash
# Remove Legacy types
# Only if no longer needed for backward compatibility
```

#### Final Testing & Code Review
```bash
# Full regression test suite
pnpm test:e2e

# Performance testing
# Check bundle size reduction

# Code review with team
# Verify nothing was accidentally deleted
```

---

## 🎯 PART 6: BUILD PLAN (After Cleanup)

### Post-Cleanup: Start Enterprise Feature Development

Follow the existing `CNC_Launch_Plan_Tasks.csv` with these modifications:

#### Phase 1: Customer Portal (Weeks 1-6)
**Now that cleanup is complete:**
- No confusion about which dashboard to enhance
- Clear quote routes to extend
- Clean component structure to build on

**Implement 28 missing customer portal pages:**
1. Profile Management Suite (Week 1-2)
2. Order Management Enhanced (Week 2-3)
3. Quote Management Enhanced (Week 3-4)
4. Communication & Support (Week 4-5)
5. Financial & Teams (Week 5-6)

#### Phase 2: Admin Portal (Weeks 7-12)
**Build on clean admin foundation:**
- Extend existing admin routes
- Add 35 missing admin pages
- Implement CRM features
- Add financial management

#### Phase 3-6: Continue with Launch Plan
- Supplier Portal enhancements
- Finance Portal (from scratch)
- Operations Portal completion
- Super Admin Portal

---

## 🎯 PART 7: RECOMMENDED ACTION PLAN

### ✅ RECOMMENDED: Option 1 (Clean First, Build Later)

**Justification:**
1. **Current tech debt is HIGH** - 25-30 unused folders creating confusion
2. **23% completion** means most features are NEW - clean slate is better
3. **6-month timeline** means 4-week cleanup is only 15% delay
4. **149 new pages** will be much easier to build on clean foundation
5. **Team onboarding** will be faster with clear codebase

### 📅 Timeline

```
Week 1-2:   Emergency Cleanup (routes, backups, duplicates)
Week 3-4:   Component Cleanup & Refactoring
Week 5:     Final testing, documentation, code review
Week 6:     Deploy clean codebase to staging

Week 7-32:  Execute Launch Plan Phase 1-6
            (Build 149 missing pages)
```

### 🚀 Immediate Next Steps (Next 24 Hours)

1. **Decision Meeting** (2 hours)
   - Review this document with team
   - Decide: Clean first vs. Build first vs. Parallel
   - Get stakeholder buy-in

2. **If "Clean First" Approved** (Start immediately)
   ```bash
   # Create cleanup branch
   git checkout -b chore/emergency-cleanup
   
   # Delete backup files (5 minutes)
   git rm apps/web/app/admin/review/page.tsx.bak
   git rm apps/web/app/dfm-analysis/[id]/page.tsx.backup
   git rm apps/web/app/dfm-analysis/[id]/page.tsx.backup2
   git rm apps/web/app/instant-quote/page.tsx.working
   git commit -m "chore: remove backup files"
   git push
   
   # Create PR for review
   ```

3. **Setup Tracking** (1 hour)
   - Create GitHub project board for cleanup tasks
   - Create issues for each cleanup item
   - Assign team members

4. **Communication** (1 hour)
   - Notify stakeholders of 4-week cleanup sprint
   - Explain benefits of clean foundation
   - Set expectations for feature delivery timeline

---

## 📋 APPENDICES

### Appendix A: Full List of Files to Delete

#### Immediate Delete (Backup Files)
```
apps/web/app/admin/review/page.tsx.bak
apps/web/app/dfm-analysis/[id]/page.tsx.backup
apps/web/app/dfm-analysis/[id]/page.tsx.backup2
apps/web/app/instant-quote/page.tsx.working
```

#### Unused Route Groups
```
apps/web/app/(Home)/
apps/web/app/(Ops)/          # Evaluate first
apps/web/app/api-tokens/
apps/web/app/documents/
apps/web/app/files/
apps/web/app/orders/[id]/    # Keep logic, redirect route
apps/web/app/portal/quotes/[id]/configure
apps/web/app/portal/quotes/[id]/pdf
apps/web/app/recommendation/
apps/web/app/support/
apps/web/app/widget/
```

#### Duplicate Routes (Delete After Redirect Setup)
```
apps/web/app/dashboard/      # Redirect to /portal/dashboard
apps/web/app/quote/[id]/     # Redirect to /portal/quotes/[id]
apps/web/app/quotes/[id]/    # Redirect to /portal/quotes/[id]
apps/web/app/(quote)/pricing-demo/  # Delete or feature-flag
apps/web/app/checkout/       # Redirect to /portal/checkout/
apps/web/app/secure-checkout/  # Redirect to /portal/checkout/
```

#### Unused Pages
```
apps/web/app/analytics/page.tsx
apps/web/app/contact/page.tsx
```

#### Unused Component Folders
```
apps/web/src/components/portal/dashboard/
apps/web/src/components/onboarding/
apps/web/src/components/nav/
apps/web/src/components/leadtime/
apps/web/src/components/Layouts/header/
apps/web/src/components/instant-quote/
apps/web/src/components/dfm/
apps/web/src/components/quote/
apps/web/src/components/quote-detail/
apps/web/src/components/quotes/
```

---

### Appendix B: Files to Investigate

#### Ambiguous Files (Needs Manual Review)
```
apps/web/pages/admin/final-operations.tsx  # Determine if needed
apps/web/app/(Ops)/                        # Part of operations portal?
```

---

### Appendix C: Risk Assessment Matrix

| Action | Risk Level | Impact if Wrong | Mitigation |
|--------|-----------|-----------------|------------|
| Delete backup files | 🟢 NONE | None - these are copies | Git history |
| Delete unused routes | 🟡 LOW | Broken links | Add redirects |
| Delete duplicate routes | 🟡 LOW | Broken links | Add redirects |
| Delete unused components | 🟠 MEDIUM | Build failures | Archive first |
| Delete ambiguous files | 🔴 HIGH | Feature loss | Manual review required |
| Mass delete shared exports | 🔴 CRITICAL | API breaks | Don't do this |

---

### Appendix D: Testing Checklist

#### After Each Cleanup Step:
- [ ] `pnpm install` - Verify dependencies
- [ ] `pnpm lint` - Check for linting errors
- [ ] `pnpm type-check` - TypeScript compilation
- [ ] `pnpm test` - Unit tests
- [ ] `pnpm build` - Production build
- [ ] Manual testing of affected routes
- [ ] Check bundle size (should decrease)
- [ ] Review git diff carefully
- [ ] Get peer code review

#### Before Final Deployment:
- [ ] Full regression test suite
- [ ] E2E tests on staging
- [ ] Performance testing
- [ ] Accessibility audit
- [ ] Security scan
- [ ] Bundle analysis
- [ ] Load testing
- [ ] Smoke tests on all portals

---

## 🎯 FINAL RECOMMENDATION

**DECISION: Option 1 - Clean First (4 weeks), Then Build (20+ weeks)**

**Why:**
1. Current technical debt is too high to ignore
2. Clean foundation = faster development later
3. 149 new pages need clear structure
4. Team will be more productive without confusion
5. Only 15% delay in overall timeline

**Next Step:**
Schedule team meeting to approve this plan and start Week 1 cleanup immediately.

**Expected Outcome:**
- Clean, maintainable codebase by Week 5
- Clear foundation for building 149 missing pages
- Faster development velocity in Phases 1-6
- Better developer experience
- Lower bug rate in new features

---

**Document Version**: 1.0  
**Author**: GitHub Copilot (Claude Sonnet 4.5)  
**Last Updated**: January 15, 2025  
**Status**: PENDING APPROVAL
