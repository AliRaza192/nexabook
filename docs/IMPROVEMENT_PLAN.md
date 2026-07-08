# NexaBook — Comprehensive Improvement Plan
**Version:** 3.0  
**Created:** 2026-07-08  
**Phases:** 6 (Security → Quality → Performance → Features → Deployment → Launch)  
**Estimated Timeline:** 8-12 weeks (with focused effort)

---

## Overview: 6 Phases, 3 Levels Per Phase

Each phase has **3 difficulty levels:**
- **Level 1 (Quick Wins)** — 1-4 hours each, high impact, no architecture changes
- **Level 2 (Solid Work)** — 4-12 hours each, requires testing
- **Level 3 (Deep Dives)** — 12+ hours each, architecture changes, full testing

---

# PHASE 1: SECURITY HARDENING (P0 — CRITICAL)
**Estimated:** 3-4 weeks  
**Deliverable:** Production-ready authentication & multi-tenant isolation

## Level 1: Middleware Protection (Quick Wins)

### Task 1.1.1: Add Clerk Middleware to Pages
**Time:** 2 hours  
**Files:** `src/middleware.ts`

```typescript
// Add clerkMiddleware that protects dashboard routes
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/portal(.*)',
  '/vendor-portal(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();  // ← Redirect unauthenticated users to login
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Verification:** 
- [ ] Direct navigation to `/dashboard/sales` without auth → redirects to login
- [ ] Logged-in user → page loads
- [ ] Public routes (/, /login) → always accessible

---

### Task 1.1.2: Add Rate Limiting Middleware
**Time:** 1 hour  
**Files:** `src/middleware.ts` (extend)

Enhance rate limiting to all API routes:
- 30 requests/minute per IP for regular endpoints
- 5 requests/minute per IP for auth endpoints
- 100 requests/minute for internal cron routes

**Verification:**
- [ ] 31st request in 60s → 429 Too Many Requests

---

### Task 1.1.3: Add CORS & Security Headers
**Time:** 1.5 hours  
**Files:** `next.config.mjs`, `src/middleware.ts`

```typescript
// Headers for security
async headers() {
  return [
    {
      source: '/api/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ];
}
```

**Verification:**
- [ ] Response headers include security directives
- [ ] Browser security audit passes (no warnings)

---

### Task 1.1.4: Env Var Validation at Startup
**Time:** 1 hour  
**Files:** `src/lib/env.ts` (create), `src/middleware.ts`

Create schema validation for all env vars at app startup:

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(20),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(20),
  // ... all required vars
});

export const env = envSchema.parse(process.env);
```

**Verification:**
- [ ] Missing DATABASE_URL → app fails to start with clear error
- [ ] Invalid format → clear validation message

---

## Level 2: Multi-Tenant Isolation (Solid Work)

### Task 1.2.1: Add OrgId Scoping Middleware
**Time:** 6 hours  
**Files:** `src/lib/db-middleware.ts` (create), `src/db/index.ts`

Create a Drizzle middleware that automatically injects orgId:

```typescript
// src/lib/db-middleware.ts
export function withOrgScope(orgId: string) {
  return (query: any) => {
    // Auto-inject orgId into all WHERE clauses
    // Prevent queries without orgId filter
  };
}
```

**Verification:**
- [ ] Query without `eq(table.orgId, orgId)` → throws error in dev
- [ ] All queries inject orgId automatically

---

### Task 1.2.2: Audit All Server Actions for OrgId Leaks
**Time:** 8 hours  
**Files:** `src/lib/actions/*` (all files)

Scan all 15 server action files:
- Check every `db.query.*` and `db.select/insert/update`
- Verify `orgId` is included in WHERE clause
- Fix any missing scopes

**Checklist:**
- [ ] `accounting.ts` — all queries scoped
- [ ] `accounts.ts` — all queries scoped
- [ ] `sales.ts` — all queries scoped
- [ ] ... (15 total files)

**Verification:**
- [ ] Run grep: `grep -r "db.select\|db.insert\|db.update\|db.delete" src/lib/actions/ | grep -v orgId | wc -l` → should return 0 (no unscoped queries)

---

### Task 1.2.3: Add Row-Level Security (RLS) in PostgreSQL
**Time:** 10 hours  
**Files:** `drizzle/migrations/` (new), `src/db/schema.ts`

Create PostgreSQL RLS policies for every table:

```sql
-- For every table:
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON organizations
  FOR ALL USING (id = (SELECT org_id FROM profiles WHERE user_id = current_user_id));
```

**Verification:**
- [ ] Direct PostgreSQL query (outside app) for org-scoped table → RLS enforced
- [ ] Clerk user cannot read other org's data even with compromised SQL

---

### Task 1.2.4: Remove Auto-Org Creation
**Time:** 3 hours  
**Files:** `src/lib/actions/shared.ts`

Remove from `getCurrentOrgId()`:
```typescript
// ❌ DELETE THIS:
if (!profile) {
  const [newOrg] = await db.insert(organizations).values(...).returning();
  // auto-creates org
}
```

Instead: require explicit onboarding flow.

**Verification:**
- [ ] New Clerk user (no profile) → 404 or "Please complete onboarding"
- [ ] Onboarding page → first time setup

---

## Level 3: Advanced Security (Deep Dives)

### Task 1.3.1: Implement Secrets Encryption
**Time:** 12 hours  
**Files:** `src/lib/crypto.ts` (create), database migrations

Encrypt sensitive fields in database:
- Bank account numbers
- API tokens
- Payment gateway credentials

```typescript
// src/lib/crypto.ts
import crypto from 'crypto';

export function encryptField(plaintext: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  // ... encryption logic
}

export function decryptField(ciphertext: string, key: string): string {
  // ... decryption logic
}
```

**Verification:**
- [ ] Bank details stored encrypted in DB
- [ ] Only decrypted when needed
- [ ] Encryption key in ENCRYPTION_KEY env var (not in code)

---

### Task 1.3.2: Audit Logging for All Sensitive Actions
**Time:** 10 hours  
**Files:** `src/lib/actions/audit.ts`, all action files

Every sensitive action creates audit log:
- User login/logout
- Permission changes
- Financial transaction posting
- Report generation
- Data exports

```typescript
await logAudit({
  orgId,
  userId: clerkUserId,
  action: 'INVOICE_POSTED',
  entityType: 'invoice',
  entityId: invoiceId,
  changes: JSON.stringify({ status: 'draft' }, { status: 'posted' }),
  ipAddress: request.headers.get('x-forwarded-for'),
});
```

**Verification:**
- [ ] Audit table has >100 entries after a day of use
- [ ] All financial posts are audited

---

### Task 1.3.3: Implement 2FA Enforcement for Admin
**Time:** 8 hours  
**Files:** Clerk settings, `src/app/(dashboard)/settings/security/page.tsx`

Already partially done (per docs) — verify & complete:
- [ ] Admin users can enable 2FA
- [ ] Dashboard warns if 2FA not enabled for admin
- [ ] Force 2FA for sensitive operations (post invoice, approve payment)

---

---

# PHASE 2: ACCOUNTING CORRECTIONS (P0 — FINANCIAL INTEGRITY)
**Estimated:** 2-3 weeks  
**Deliverable:** Accurate financial reporting

## Level 1: Quick Fixes (Low Risk)

### Task 2.1.1: Fix Chart of Accounts Duplicate Codes
**Time:** 0.5 hours  
**Files:** `src/lib/actions/accounts.ts` line 140-145

Change duplicate code "4500" (Exchange Gain) to "4550":

```typescript
// Before:
{ code: "4500", name: "Exchange Gain", type: "income", ... },
{ code: "4500", name: "Commission Income", type: "income", ... },

// After:
{ code: "4500", name: "Exchange Gain", type: "income", ... },
{ code: "4550", name: "Commission Income", type: "income", ... },
```

**Verification:**
- [ ] `npm run db:push` succeeds
- [ ] New org COA seeds without errors

---

### Task 2.1.2: Filter Draft Entries from Reports
**Time:** 2 hours  
**Files:** `src/lib/accounting.ts` (getProfitAndLoss, getTrialBalance, getBalanceSheet)

Add `and(eq(journalEntries.status, 'posted'))` to all report queries:

```typescript
// Before:
.where(eq(journalEntryLines.orgId, orgId))

// After:
.where(and(
  eq(journalEntryLines.orgId, orgId),
  eq(journalEntries.status, 'posted')
))
```

**Verification:**
- [ ] Create draft journal entry → not in trial balance
- [ ] Post it → appears in trial balance

---

### Task 2.1.3: Fix COGS Account Type in Trial Balance
**Time:** 1 hour  
**Files:** `src/lib/accounting.ts` line 86-87

Change:
```typescript
// Before:
const normalDebit = ["asset", "expense", "cost_of_goods_sold"].includes(account.type || "");

// After:
const normalDebit = ["asset", "expense"].includes(account.type || "");
```

(COGS is already stored as "expense" type)

**Verification:**
- [ ] Trial balance debits/credits balance correctly

---

## Level 2: Date Filtering (Medium Risk)

### Task 2.2.1: Add Date Filtering to Balance Sheet
**Time:** 4 hours  
**Files:** `src/lib/accounting.ts` (getBalanceSheet)

Current issue: Balance sheet includes all transactions regardless of date.

```typescript
export async function getBalanceSheet(
  orgId: string,
  asOfDate: Date = new Date()
) {
  const lines = await db.select({...})
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(...))
    .where(and(
      eq(journalEntryLines.orgId, orgId),
      lte(journalEntries.entryDate, asOfDate),  // ← NEW
      eq(journalEntries.status, 'posted')        // ← NEW
    ));
  // ...
}
```

**Verification:**
- [ ] Balance sheet as of July 1 ≠ Balance sheet as of Dec 31
- [ ] Balance sheet as of today + future entry → entry not included

---

### Task 2.2.2: Add Date Filtering to P&L
**Time:** 4 hours  
**Files:** `src/lib/accounting.ts` (getProfitAndLoss)

```typescript
export async function getProfitAndLoss(
  orgId: string,
  fromDate: Date,
  toDate: Date
) {
  const lines = await db.select({...})
    .where(and(
      eq(journalEntryLines.orgId, orgId),
      gte(journalEntries.entryDate, fromDate),  // ← NEW
      lte(journalEntries.entryDate, toDate),    // ← NEW
      eq(journalEntries.status, 'posted')
    ));
  // ...
}
```

**Verification:**
- [ ] P&L for Jan-Mar ≠ P&L for Apr-Jun
- [ ] P&L totals match manual invoice calculations

---

## Level 3: P&L Accuracy Fix (High Risk — Requires Testing)

### Task 2.3.1: Remove Double-Counting in P&L
**Time:** 6 hours  
**Files:** `src/lib/accounting.ts` (getProfitAndLoss), `src/lib/actions/reports.ts`

Current issue: P&L queries BOTH invoices directly AND journal entries.

Solution: Use ONLY journal entries (since all approved invoices create JE).

```typescript
// BEFORE (WRONG):
const invoiceIncome = db.select(sum(invoices.totalAmount))...  // ← REMOVE
const journalIncome = db.select(sum(journalEntryLines.debit))...  // KEEP
// returns invoiceIncome + journalIncome = DOUBLE COUNT

// AFTER (CORRECT):
// Use ONLY journal entries
const journalIncome = db.select(sum(journalEntryLines.debit))...
```

**Verification:**
- [ ] Manual invoice = sum of its JE lines
- [ ] P&L net profit = sum of all account balances
- [ ] Trial balance = P&L + Balance Sheet

---

### Task 2.3.2: Add Reversed Entry Filtering
**Time:** 2 hours  
**Files:** `src/lib/accounting.ts` (all queries)

Add: `and(neq(journalEntries.status, 'reversed'))`

**Verification:**
- [ ] Create invoice, post JE
- [ ] Void invoice (creates reversal JE)
- [ ] Reversal entry NOT in reports (net effect = 0)

---

---

# PHASE 3: TESTING & QUALITY (P2 — RELIABILITY)
**Estimated:** 2-3 weeks  
**Deliverable:** Automated test suite, 60%+ code coverage

## Level 1: Setup & Basics

### Task 3.1.1: Setup Comprehensive Test Structure
**Time:** 3 hours  
**Files:** `src/__tests__/`, vitest setup

Create test organization:
```
src/__tests__/
├── unit/
│   ├── accounting.test.ts
│   ├── journal-entries.test.ts
│   └── calculations.test.ts
├── integration/
│   ├── invoice-workflow.test.ts
│   ├── payment-flow.test.ts
│   └── multi-tenant.test.ts
└── setup.ts
```

**Verification:**
- [ ] `npm run test` runs all tests
- [ ] Test output shows coverage report

---

### Task 3.1.2: Write Accounting Unit Tests
**Time:** 6 hours  
**Files:** `src/__tests__/unit/accounting.test.ts`

Test core functions:
- `validateJournalBalance()` — valid/invalid balances
- `getTrialBalance()` — debits = credits
- `getProfitAndLoss()` — income vs expense
- `getBalanceSheet()` — assets = liabilities + equity

```typescript
describe('validateJournalBalance', () => {
  it('accepts balanced entries (debit 1000, credit 1000)', () => {
    expect(validateJournalBalance([
      { account: 'Cash', debit: 1000 },
      { account: 'Revenue', credit: 1000 }
    ])).toBe(true);
  });

  it('rejects unbalanced entries (debit 1000, credit 500)', () => {
    expect(validateJournalBalance([
      { account: 'Cash', debit: 1000 },
      { account: 'Revenue', credit: 500 }
    ])).toThrow();
  });
});
```

---

## Level 2: Integration Tests

### Task 3.2.1: Invoice-to-GL Flow Test
**Time:** 8 hours  
**Files:** `src/__tests__/integration/invoice-workflow.test.ts`

Test complete invoice lifecycle:
1. Create invoice (draft)
2. Approve invoice → JE created
3. Record payment → settlement JE
4. Verify trial balance balances
5. Verify P&L correct

**Verification:**
- [ ] Test passes end-to-end
- [ ] Trial balance = 0
- [ ] P&L shows revenue + receivable

---

### Task 3.2.2: Multi-Tenant Isolation Test
**Time:** 6 hours  
**Files:** `src/__tests__/integration/multi-tenant.test.ts`

Create 2 test orgs:
- Org A: Create invoice
- Org B: Try to read Org A's invoice → fails
- Verify data isolation

---

## Level 3: Performance & Load Tests

### Task 3.3.1: N+1 Query Elimination Test
**Time:** 10 hours  

Create test that:
- Inserts 1000 invoices
- Calls `getTrialBalance()` 
- Measures query count
- Verifies < 5 queries (not 1000+)

---

---

# PHASE 4: PERFORMANCE OPTIMIZATION (P1 — SCALABILITY)
**Estimated:** 1-2 weeks  
**Deliverable:** <100ms report generation, indexed queries

## Level 1: Database Indexes

### Task 4.1.1: Add Missing Indexes
**Time:** 2 hours  
**Files:** `src/db/schema.ts`, migrations

```typescript
export const journalEntriesTable = pgTable('journal_entries', {...}, (table) => ({
  orgIdIdx: index('idx_journal_entries_org_id').on(table.orgId),
  statusIdx: index('idx_journal_entries_status').on(table.status),
  dateIdx: index('idx_journal_entries_date').on(table.entryDate),
  orgDateIdx: index('idx_journal_entries_org_date').on(table.orgId, table.entryDate),
}));
```

Index these columns:
- [ ] All `orgId` columns (foreign keys)
- [ ] All `status` columns
- [ ] All date columns
- [ ] Composite: (orgId, status), (orgId, date)

---

### Task 4.1.2: Query Optimization
**Time:** 4 hours  

Replace N+1 patterns:
- Journal entry number generation: Use `sql\`count(*)\`\` instead of loading all
- Invoice item insertion: Use batch insert instead of loop

```typescript
// BEFORE (N+1):
for (const item of items) {
  await db.insert(invoiceItems).values(item);
}

// AFTER (batch):
await db.insert(invoiceItems).values(items);
```

---

## Level 2: Query Plan Analysis

### Task 4.2.1: Analyze Slow Queries
**Time:** 6 hours  

Use PostgreSQL EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE SELECT * FROM trial_balance WHERE org_id = '...' AND status = 'posted';
```

Identify sequential scans → add indexes or rewrite query.

---

---

# PHASE 5: ADVANCED FEATURES (P2 — COMPLETENESS)
**Estimated:** 2-3 weeks  
**Deliverable:** Billing, period locking, cash flow

## Level 1: Subscription Billing

### Task 5.1.1: Stripe Integration
**Time:** 8 hours  
**Files:** `src/lib/actions/billing.ts`, API routes

Setup Stripe webhook → update plan type when payment succeeds.

---

## Level 2: Period Locking

### Task 5.2.1: Period Lock Enforcement
**Time:** 6 hours  

Prevent editing closed periods:
- Check `fiscalPeriods.lockedAt`
- Block invoice/payment creation if period locked
- Block journal entry posting if period locked

---

## Level 3: Cash Flow Statement

### Task 5.3.1: Cash Flow Report
**Time:** 10 hours  
**Files:** `src/lib/accounting.ts` (new function)

Create function: `getCashFlowStatement(orgId, fromDate, toDate)`

---

---

# PHASE 6: DEPLOYMENT & MONITORING (P3 — PRODUCTION READINESS)
**Estimated:** 1 week  
**Deliverable:** Live, monitored, production-ready

## Level 1: Error Monitoring

### Task 6.1.1: Setup Sentry
**Time:** 2 hours  

Capture all errors → Sentry dashboard

---

## Level 2: Performance Monitoring

### Task 6.2.1: Add Metrics Collection
**Time:** 4 hours  

Track:
- API response times
- Database query times
- Error rates

---

## Level 3: Launch Checklist

### Task 6.3.1: Pre-Launch Verification
**Time:** 8 hours  

- [ ] Security: All P0 issues fixed
- [ ] Accounting: All P0 corrections applied
- [ ] Testing: >60% coverage
- [ ] Performance: <100ms reports
- [ ] Documentation: Updated
- [ ] Database: Backups automated
- [ ] Monitoring: Sentry + metrics active
- [ ] Launch: Deploy to Vercel

---

---

## Summary: Task Dependency Graph

```
PHASE 1 (Security) ← MUST DO FIRST (blocks everything)
    ↓
PHASE 2 (Accounting) ← MUST DO SECOND (financial integrity)
    ↓
PHASE 3 (Testing) ← Can start parallel with Phase 2
    ↓
PHASE 4 (Performance) ← After Phase 3
    ↓
PHASE 5 (Features) ← After Phase 4
    ↓
PHASE 6 (Deployment) ← Final step
```

---

## Estimated Timeline

| Phase | Weeks | Effort | When |
|-------|-------|--------|------|
| 1 — Security | 3-4 | High | Week 1-4 |
| 2 — Accounting | 2-3 | High | Week 2-5 (parallel 1) |
| 3 — Testing | 2-3 | High | Week 4-7 |
| 4 — Performance | 1-2 | Medium | Week 7-9 |
| 5 — Features | 2-3 | Medium | Week 8-11 |
| 6 — Deployment | 1 | Low | Week 12 |

**Total: 8-12 weeks with focused effort**

---

## How to Use This Plan

1. **Start:** Pick Phase 1, Level 1, Task 1.1.1
2. **Progress:** Complete tasks in order
3. **Verify:** Check each verification box
4. **Document:** Update TASKS.md as you go
5. **Track:** Mark completed tasks in DECISIONS_LOG.md

**The plan is sequential but parallelizable:**
- Phase 1 (Security) must complete first
- Phase 2 (Accounting) can start while Phase 1 finishing
- Phase 3 (Testing) starts when Phase 2 > 50% done
- Phases 4-6 are sequential but each has parallel work within

**Adjust as needed:** If a task takes longer, extend estimates but don't skip tasks.
