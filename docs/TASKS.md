# NexaBook — Task Tracking System
**Version:** 3.0  
**Last Updated:** 2026-07-08  
**Format:** GitHub task list with dependency tracking

---

## How to Use This File

- [ ] = Not started
- [x] = Completed
- [~] = In progress

Each task links to IMPROVEMENT_PLAN.md for details.

---

## PHASE 1: SECURITY HARDENING
**Status:** Not Started  
**Estimated:** 3-4 weeks  
**Priority:** P0 CRITICAL

### Level 1: Middleware Protection
- [ ] **1.1.1** Add Clerk Middleware to Pages (2h) → `src/middleware.ts`
- [ ] **1.1.2** Add Rate Limiting Middleware (1h) → extend middleware
- [ ] **1.1.3** Add CORS & Security Headers (1.5h) → `next.config.mjs`
- [ ] **1.1.4** Env Var Validation at Startup (1h) → `src/lib/env.ts`

**Subtotal Level 1:** 5.5 hours

### Level 2: Multi-Tenant Isolation
- [ ] **1.2.1** Add OrgId Scoping Middleware (6h) → `src/lib/db-middleware.ts`
- [ ] **1.2.2** Audit All Server Actions for OrgId Leaks (8h) → all `src/lib/actions/*`
- [ ] **1.2.3** Add Row-Level Security (RLS) in PostgreSQL (10h) → `drizzle/migrations/`
- [ ] **1.2.4** Remove Auto-Org Creation (3h) → `src/lib/actions/shared.ts`

**Subtotal Level 2:** 27 hours

### Level 3: Advanced Security
- [ ] **1.3.1** Implement Secrets Encryption (12h) → `src/lib/crypto.ts`
- [ ] **1.3.2** Audit Logging for Sensitive Actions (10h) → all action files
- [ ] **1.3.3** Implement 2FA Enforcement for Admin (8h) → settings page

**Subtotal Level 3:** 30 hours

**PHASE 1 TOTAL:** 62.5 hours (~3-4 weeks with focused effort)

---

## PHASE 2: ACCOUNTING CORRECTIONS
**Status:** Not Started  
**Estimated:** 2-3 weeks  
**Priority:** P0 CRITICAL (depends on Phase 1)

### Level 1: Quick Fixes
- [ ] **2.1.1** Fix Chart of Accounts Duplicate Codes (0.5h) → `src/lib/actions/accounts.ts:140`
- [ ] **2.1.2** Filter Draft Entries from Reports (2h) → `src/lib/accounting.ts`
- [ ] **2.1.3** Fix COGS Account Type in Trial Balance (1h) → `src/lib/accounting.ts:86`

**Subtotal Level 1:** 3.5 hours

### Level 2: Date Filtering
- [ ] **2.2.1** Add Date Filtering to Balance Sheet (4h) → `src/lib/accounting.ts:getBalanceSheet`
- [ ] **2.2.2** Add Date Filtering to P&L (4h) → `src/lib/accounting.ts:getProfitAndLoss`

**Subtotal Level 2:** 8 hours

### Level 3: P&L Accuracy Fix
- [ ] **2.3.1** Remove Double-Counting in P&L (6h) → accounting.ts + reports.ts
- [ ] **2.3.2** Add Reversed Entry Filtering (2h) → all queries

**Subtotal Level 3:** 8 hours

**PHASE 2 TOTAL:** 19.5 hours (~2-3 weeks, can start parallel with Phase 1 @ week 2)

---

## PHASE 3: TESTING & QUALITY
**Status:** Not Started  
**Estimated:** 2-3 weeks  
**Priority:** P2 (depends on Phase 2 > 50%)

### Level 1: Setup & Basics
- [ ] **3.1.1** Setup Comprehensive Test Structure (3h) → `src/__tests__/`
- [ ] **3.1.2** Write Accounting Unit Tests (6h) → `src/__tests__/unit/accounting.test.ts`

**Subtotal Level 1:** 9 hours

### Level 2: Integration Tests
- [ ] **3.2.1** Invoice-to-GL Flow Test (8h) → `src/__tests__/integration/invoice-workflow.test.ts`
- [ ] **3.2.2** Multi-Tenant Isolation Test (6h) → `src/__tests__/integration/multi-tenant.test.ts`

**Subtotal Level 2:** 14 hours

### Level 3: Performance & Load Tests
- [ ] **3.3.1** N+1 Query Elimination Test (10h) → performance test

**Subtotal Level 3:** 10 hours

**PHASE 3 TOTAL:** 33 hours (~2-3 weeks, starts week 4)

---

## PHASE 4: PERFORMANCE OPTIMIZATION
**Status:** Not Started  
**Estimated:** 1-2 weeks  
**Priority:** P1 (depends on Phase 3)

### Level 1: Database Indexes
- [ ] **4.1.1** Add Missing Indexes (2h) → `src/db/schema.ts` + migrations
- [ ] **4.1.2** Query Optimization — N+1 Patterns (4h) → all action files

**Subtotal Level 1:** 6 hours

### Level 2: Query Plan Analysis
- [ ] **4.2.1** Analyze Slow Queries with EXPLAIN ANALYZE (6h) → PostgreSQL profiling

**Subtotal Level 2:** 6 hours

**PHASE 4 TOTAL:** 12 hours (~1-2 weeks, starts week 7)

---

## PHASE 5: ADVANCED FEATURES
**Status:** Not Started  
**Estimated:** 2-3 weeks  
**Priority:** P2 (depends on Phase 4)

### Level 1: Subscription Billing
- [ ] **5.1.1** Stripe Integration (8h) → `src/lib/actions/billing.ts` + API routes

**Subtotal Level 1:** 8 hours

### Level 2: Period Locking
- [ ] **5.2.1** Period Lock Enforcement (6h) → all financial actions

**Subtotal Level 2:** 6 hours

### Level 3: Cash Flow Statement
- [ ] **5.3.1** Cash Flow Report Implementation (10h) → `src/lib/accounting.ts`

**Subtotal Level 3:** 10 hours

**PHASE 5 TOTAL:** 24 hours (~2-3 weeks, starts week 8)

---

## PHASE 6: DEPLOYMENT & MONITORING
**Status:** Not Started  
**Estimated:** 1 week  
**Priority:** P3 (depends on Phase 5)

### Level 1: Error Monitoring
- [ ] **6.1.1** Setup Sentry Integration (2h) → Sentry dashboard

**Subtotal Level 1:** 2 hours

### Level 2: Performance Monitoring
- [ ] **6.2.1** Add Metrics Collection (4h) → logging + metrics

**Subtotal Level 2:** 4 hours

### Level 3: Launch Checklist
- [ ] **6.3.1** Pre-Launch Verification (8h) → comprehensive checklist

**Subtotal Level 3:** 8 hours

**PHASE 6 TOTAL:** 14 hours (~1 week, final step)

---

## GRAND TOTALS

| Phase | Hours | Weeks | Status |
|-------|-------|-------|--------|
| 1 — Security | 62.5 | 3-4 | ⏳ Not Started |
| 2 — Accounting | 19.5 | 2-3 | ⏳ Blocked by Phase 1 |
| 3 — Testing | 33 | 2-3 | ⏳ Blocked by Phase 2 |
| 4 — Performance | 12 | 1-2 | ⏳ Blocked by Phase 3 |
| 5 — Features | 24 | 2-3 | ⏳ Blocked by Phase 4 |
| 6 — Deployment | 14 | 1 | ⏳ Blocked by Phase 5 |
| **TOTAL** | **165 hours** | **8-12 weeks** | — |

---

## Current Sprint (STARTER)

Pick ONE task to start with:

### Recommended Starter Tasks (Quick Wins, High Impact)

1. **2.1.1** Fix Chart of Accounts Duplicate Codes (0.5h) ← START HERE
   - Lowest risk, highest visibility
   - Immediate verification (seed won't fail silently)
   
2. **1.1.1** Add Clerk Middleware to Pages (2h) ← IF SECURITY FIRST
   - Critical security fix
   - Medium complexity

3. **2.1.2** Filter Draft Entries from Reports (2h) ← IF ACCOUNTING FIRST
   - Fixes financial reporting
   - Medium complexity

**Next Steps After First Task:**
1. Complete all Level 1 tasks in current phase
2. Move to Level 2 when Level 1 done
3. Level 3 can start while Level 2 finishing

---

## Milestone Checkpoints

### Checkpoint 1: Phase 1 Security (Week 4)
- [ ] Middleware protects all dashboard routes
- [ ] No unauthenticated page access
- [ ] All server actions audit orgId scoping
- [ ] Rate limiting enforced

**GO/NO-GO:** If not done by week 4, extend Phase 1 timeline

### Checkpoint 2: Phase 2 Accounting (Week 5)
- [ ] All P0 accounting issues fixed
- [ ] Trial balance balances correctly
- [ ] P&L accurate (verified manually)
- [ ] Draft entries filtered from reports

**GO/NO-GO:** If not done by week 5, delay Phase 3

### Checkpoint 3: Phase 3 Testing (Week 7)
- [ ] 60%+ code coverage
- [ ] All critical workflows tested
- [ ] Multi-tenant tests passing

**GO/NO-GO:** If not done by week 7, request more resources

### Checkpoint 4: Phase 6 Launch (Week 12)
- [ ] All security ✅
- [ ] All accounting ✅
- [ ] Testing ✅
- [ ] Performance ✅
- [ ] Features ✅
- [ ] Monitoring ✅

---

## Notes & Context

- Tasks are sequential but can parallelize within same phase
- Phase 1 MUST complete before moving to Phase 2+
- Each task has estimated time — actual time may vary ±30%
- See IMPROVEMENT_PLAN.md for detailed task specifications
- See PROJECT_CONTEXT.md for architecture context