# NEXABOOK — COMPLETE AUDIT REPORT

**Date:** June 23, 2026
**Auditors:** Principal Engineer, CPA Accountant, SaaS Architect
**Repository:** https://github.com/AliRaza192/nexabook
**Live URL:** https://nexabook-eight.vercel.app/

---

## 1. EXECUTIVE SUMMARY

NexaBook is an ambitious cloud ERP targeting small businesses in Pakistan, with features spanning accounting, invoicing, inventory, payroll, CRM, manufacturing, and project management. The codebase is surprisingly comprehensive — ~3000 lines of DB schema, ~3500 lines of sales actions alone — and the accounting engine implements proper double-entry bookkeeping with debit/credit validation, which is the non-negotiable foundation for any accounting product.

However, the product has two fundamental problems. First, **there is no middleware that protects pages or API routes from unauthenticated access**. Clerk authentication is present but only wired at the component level — any route can be accessed without login by directly navigating to the URL. Second, **there is no subscription billing integration** (Stripe or otherwise) despite plans being part of the schema. The product also lacks prior-period locking, has no proper Cash Flow Statement report, and has inconsistent authorization checks (RBAC is used in some places but missing in many others).

For a small business trial, this could work. For a paid SaaS product, it is not ready. The accounting engine itself is trustworthy for basic use, but the security and authorization gaps make it unsuitable for multi-tenant production without significant remediation.

---

## 2. ARCHITECTURE REVIEW

### Folder Layout — Next.js 14 App Router

**Rating: 8/10**

The app follows App Router conventions correctly:
- `(auth)/` — authentication pages (login, register)
- `(dashboard)/` — all authenticated pages under a shared layout
- `api/` — API routes with proper path structure
- Route groups for logical separation

**Good patterns observed:**
- Route groups `(auth)` and `(dashboard)` prevent unnecessary layout nesting
- Dynamic routes for invoices, customers, etc.
- Parallel data fetching with `loading.tsx` and `error.tsx` at the dashboard level
- API routes organized by domain (cron, mobile, payments, webhooks)

**Issues:**
- `(dashboard)/page.tsx` and `(dashboard)/dashboard/page.tsx` both exist, creating confusion about which is the real dashboard

### Server vs Client Component Split

**Rating: 5/10**

The main dashboard layout (`src/app/(dashboard)/layout.tsx`) is entirely `"use client"` — all 605 lines. This is a significant performance concern. The sidebar navigation, header, and all UI chrome should be server-rendered with small client islands for interactivity.

All action files use `"use server"` directives correctly, which is good.

### API Routes

**Rating: 6/10**

API routes exist for chat, payments, webhooks, cron jobs, mobile, tax returns, and portals. There are no traditional REST API routes for CRUD operations — the app relies entirely on Server Actions. This is an acceptable Next.js 14 pattern but means there is no public API for integrations.

### Middleware

**Rating: 3/10**

FILE: `src/middleware.ts`
LINE: 1-39
SEVERITY: P0
PROBLEM: Middleware only implements rate limiting on `/api/*` routes and does NOT protect any pages.
WHY: Any unauthenticated user can access any dashboard page by navigating to the URL. The auth check only happens client-side in `useUser()` from Clerk, which means the page content briefly flashes before redirecting.
FIX: Add Clerk middleware to protect all dashboard routes. Add `clerkMiddleware` from `@clerk/nextjs`.

CODE:
```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/', '/login(.*)', '/register(.*)', '/portal(.*)', '/vendor-portal(.*)',
]);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip") || "unknown";
  if (req.nextUrl.pathname.startsWith("/api/") && !rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 3. CODE QUALITY SCORE

**Overall: 72/100** (Good foundation, needs tightening)

| Category | Score | Notes |
|----------|-------|-------|
| TypeScript Strictness | 65 | Some `any` types, unsafe assertions |
| Error Handling | 60 | Errors silently caught and returned as `{success: false, error}` strings |
| Input Validation | 50 | Minimal validation, no zod at boundaries |
| Naming Conventions | 85 | Consistent, descriptive naming |
| Code Duplication | 70 | Some repeated patterns in sales.ts/purchases.ts |
| Component Reusability | 65 | Large monolithic dashboard layout |
| Testing | 40 | One test file with minimal coverage |

### Detailed Findings

---

FILE: `src/lib/actions/sales.ts`
LINE: 195
SEVERITY: P2
PROBLEM: Type `any` used for `updateData` instead of a proper Partial type.
WHY: This defeats TypeScript's type checking. If a misspelled field is passed, the compiler won't catch it.
FIX: Use `Partial<typeof customers.$inferInsert>` or a properly defined update type.

CODE:
```typescript
// Before:
const updateData: any = {};

// After:
const updateData: Partial<typeof customers.$inferInsert> = {};
```

---

FILE: `src/lib/actions/sales.ts` (also in accounts.ts, purchases.ts)
LINE: 112, 137, 179, etc.
SEVERITY: P2
PROBLEM: All errors are caught and returned as generic strings like "Failed to fetch customers" — original error is lost.
WHY: Debugging production issues becomes impossible. The team cannot tell if errors are DB connection failures, constraint violations, or logic bugs.
FIX: Log the original error server-side while returning a sanitized message.

CODE:
```typescript
// Before:
catch (error) {
  return { success: false, error: "Failed to fetch customers" };
}

// After:
catch (error) {
  console.error("[getCustomers]", error);
  const message = error instanceof Error ? error.message : "Failed to fetch customers";
  return { success: false, error: message };
}
```

---

FILE: `src/lib/actions/shared.ts`
LINE: 161-163
SEVERITY: P0
PROBLEM: `getCurrentOrgId()` auto-creates an organization and seeds the Chart of Accounts for ANY authenticated Clerk user who doesn't have a profile yet.
WHY: If someone creates a Clerk user directly (not through the app's signup flow), hitting any server action would auto-create an org for them. Also, if a user signs up, gets an org, then is deleted from Clerk and re-registers, they'd get a second org. No rate limiting or fraud prevention on org creation.
FIX: Require explicit onboarding flow. Remove auto-org-creation from `getCurrentOrgId()`.

---

FILE: `src/lib/actions/sales.ts`
LINE: 749
SEVERITY: P1
PROBLEM: Invoice items are inserted inside a `for` loop with individual `await db.insert()` calls, not batched, not wrapped in a transaction with the invoice creation.
WHY: If item insertion fails partway through, the invoice header exists but items are missing — inconsistent state. Also N+1 database round-trips.
FIX: Wrap both invoice and items in a single `db.transaction()` with a single batch insert for items.

CODE:
```typescript
// Before (lines 717-760):
const [newInvoice] = await db.insert(invoices).values({...}).returning();
for (const item of data.items) {
  await db.insert(invoiceItems).values({...});
}

// After:
const result = await db.transaction(async (tx) => {
  const [newInvoice] = await tx.insert(invoices).values({...}).returning();
  if (data.items.length > 0) {
    await tx.insert(invoiceItems).values(
      data.items.map(item => ({
        orgId,
        invoiceId: newInvoice.id,
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || "0",
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      }))
    );
  }
  return newInvoice;
});
```

---

FILE: `src/lib/actions/accounts.ts`
LINE: 267
SEVERITY: P2
PROBLEM: Journal entry number generation loads ALL entries into memory to count them.
WHY: With 100K+ journal entries, this loads 100K rows just to get a count. Performance regression at scale.
FIX: Use SQL COUNT query instead.

CODE:
```typescript
// Before:
const entryCount = await db
  .select()
  .from(journalEntries)
  .where(eq(journalEntries.orgId, orgId));
const entryNumber = `JE-${String(entryCount.length + 1).padStart(5, '0')}`;

// After:
const [result] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(journalEntries)
  .where(eq(journalEntries.orgId, orgId));
const entryNumber = `JE-${String((result?.count ?? 0) + 1).padStart(5, '0')}`;
```

---

FILE: `src/lib/accounting.test.ts`
LINE: 1
SEVERITY: P3
PROBLEM: Only one test file exists with minimal coverage for a financial application.
WHY: Accounting software that is not tested will inevitably have bugs that cost users money.
FIX: Add comprehensive tests for journal entry validation, trial balance calculation, P&L calculation, balance sheet balancing, invoice approval flow, and multi-tenant data isolation.

---

## 4. ACCOUNTING AUDIT

**CRITICAL: 1 | MAJOR: 3 | MINOR: 5**

### Double-Entry Bookkeeping

The application implements proper double-entry bookkeeping:
- `journalEntries` table stores headers
- `journalEntryLines` table stores individual debits and credits
- `validateJournalBalance()` enforces debit = credit constraint before inserts
- All financial transactions (invoice approval, payment, payroll posting, purchase invoice approval) create journal entries

**VERDICT: Foundationally sound.** Every financial event is recorded as both debits and credits. The `validateJournalBalance()` function is called before every journal entry insert.

### Chart of Accounts

FILE: `src/lib/actions/accounts.ts`
LINE: 70-198
SEVERITY: MAJOR
PROBLEM: The `seedInitialCOA()` function has a **duplicate code entry** — code "4500" appears twice (Commission Income and Exchange Gain).
WHY: This will cause a unique constraint violation on the code field within the same org when seeding. The second insert will fail silently (caught by generic try/catch).
FIX: Fix the duplicate code. Exchange Gain should be 4550 or similar.

CODE:
```typescript
// Line 140-141:
{ code: "4500", name: "Exchange Gain", type: "income", ... },
{ code: "4500", name: "Commission Income", type: "income", ... },
// DUPLICATE CODE! Change one: e.g., Commission Income → 4550
```

---

FILE: `src/lib/actions/reports.ts`
LINE: 85-95
SEVERITY: MAJOR
PROBLEM: P&L report calculates COGS and expenses separately but the `getProfitAndLossReport()` function does NOT use journal entries for income/expense reconciliation. It double-counts by querying both invoices directly AND journal entries.
WHY: The P&L amount from direct invoice queries (lines 70-88) + the amount from journal entry queries (lines 95-125) are combined, leading to double-counting. Net profit will be wrong.
FIX: Use ONLY journal entries for P&L calculation (since all approved invoices create journal entries). Remove the direct invoice/expense table queries for P&L.

---

FILE: `src/lib/accounting.ts`
LINE: 183-237
SEVERITY: CRITICAL
PROBLEM: The `getBalanceSheet()` function does NOT filter by date. It queries ALL journal entry lines regardless of date.
WHY: A balance sheet should reflect assets/liabilities/equity as of a specific date. Without date filtering, the balance sheet includes transactions from future periods. This means the balance sheet will never balance for any date range, and period-specific reporting is impossible.
FIX: Add a date parameter and filter journal entries by `entryDate <= asOfDate`.

CODE:
```typescript
export async function getBalanceSheet(orgId: string, asOfDate?: Date) {
  const dateFilter = asOfDate 
    ? sql`${journalEntries.entryDate} <= ${asOfDate}` 
    : sql`1=1`;
  
  const lines = await db
    .select({...})
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(and(
      eq(journalEntryLines.orgId, orgId),
      dateFilter
    ))
    .groupBy(journalEntryLines.accountId);
  // ... rest of function
}
```

---

FILE: `src/lib/accounting.ts`
LINE: 113-177
SEVERITY: MAJOR
PROBLEM: The `getProfitAndLoss()` function includes REVERSED journal entries in its calculation. It does not filter by `journalEntries.status !== 'reversed'`.
WHY: If a journal entry is reversed (e.g., a voided invoice), the reversal entry AND the original entry both appear in the P&L, effectively zeroing each other out — BUT the reversed entry's `status` field marks it as reversed. Since the query doesn't filter these, both the original and the reversal are counted separately, doubling the impact.
FIX: Add `sql`${journalEntries.status} != 'reversed'`` to the WHERE clause.

---

FILE: `src/lib/accounting.ts`
LINE: 86-87
SEVERITY: MINOR
PROBLEM: The trial balance function includes `"cost_of_goods_sold"` in the `normalDebit` check but COGS is stored as type `"expense"` in the schema, not `"cost_of_goods_sold"`.
WHY: This string check will never match, so COGS accounts will be treated as credit-normal (liability/equity/revenue style) instead of debit-normal (asset/expense style). This inverts the COGS balance on the trial balance.
FIX: Remove `"cost_of_goods_sold"` from the check since it's stored as type "expense":

```typescript
const normalDebit = ["asset", "expense"].includes(account.type || "");
```

---

FILE: `src/db/schema.ts`
LINE: 891-898
SEVERITY: MINOR
PROBLEM: Journal entries have a `status` field with values `draft | posted | reversed` but entries created via the manual Journal Entry form in `accounts.ts:createJournalEntry()` are created with default status 'draft' and never transitioned to 'posted'.
WHY: Draft journal entries appear in financial reports (trial balance, P&L, balance sheet) because no report filters by status. Users can create "draft" entries that affect financial statements.
FIX: Either filter draft entries from all reports, or auto-post manual entries immediately with status "posted".

---

FILE: `src/lib/actions/accounts.ts`
LINE: 228-320
SEVERITY: MINOR
PROBLEM: `createJournalEntry()` validates balance BEFORE inserting lines AND calls `validateJournalBalance()` again after. Double validation is redundant but not harmful — however the balance validation exists in the loop.
WHY: Minor code smell. The second validation (line 281) happens after the lines are already constructed, making the first check (line 241) redundant.
FIX: Remove the duplicate check at line 241 and keep only the `validateJournalBalance()` call at line 281.

---

FILE: `src/lib/accounting.ts`
LINE: 247-320
SEVERITY: MINOR
PROBLEM: `postPayrollToLedger()` generates JV numbers by counting ALL journal entries in the org. This is the same N+1 pattern (actually a count-all pattern) from shared.ts.
WHY: Same scalability issue as noted in the code quality section.
FIX: Use SQL COUNT.

### Tax

FILE: `src/lib/actions/accounts.ts`
LINE: 857-878
SEVERITY: MINOR
PROBLEM: Tax summary calculates output tax from `invoices.taxAmount` and input tax from `purchaseInvoices.taxTotal`. These are stored values from the invoice header, NOT recalculated from individual line items.
WHY: If invoice amounts are manually edited without recalculating tax, the tax summary will show the stored (possibly incorrect) values. There's no cross-check against actual line-item tax calculations.
FIX: Add a validation that stored `taxAmount` equals the sum of line-item tax calculations, or recalculate from line items for reports.

---

## 5. DATABASE REVIEW

### Multi-tenancy

FILE: `src/db/schema.ts`
LINE: (all tables)
SEVERITY: P0
PROBLEM: Every table has `orgId` with a foreign key, but there is NO RLS (Row-Level Security) or guaranteed scoping middleware. The scoping relies entirely on each Server Action correctly passing `orgId`.
WHY: A bug in any single Server Action that forgets to add `eq(table.orgId, orgId)` would leak data across tenants. This is a fragile pattern for a multi-tenant SaaS.
FIX: Add Drizzle middleware/callback that automatically injects orgId into all queries, or implement Row-Level Security in PostgreSQL.

---

FILE: `src/lib/actions/sales.ts`
LINE: 459-464
SEVERITY: P0
PROBLEM: `getInvoiceById()` uses `getCurrentOrgId()` to scope the invoice query. However, function `getInvoiceWithDetails()` at line 540 also scopes correctly. But `createInvoiceJournalEntry()` at line 1343 looks up accounts by NAME not by subtype.
WHY: Account lookup by name ("Accounts Receivable", "Sales Revenue") will fail if the user has renamed these accounts. This is a fragile pattern.
FIX: Use `subType` field for system account lookups, not name.

### Schema Design

FILE: `src/db/schema.ts`
LINE: 1-2971
SEVERITY: P2
PROBLEM: Monetary amounts are stored as `decimal` with varying precision — some are `{precision: 12, scale: 2}`, some `{precision: 15, scale: 2}`, some `{precision: 14, scale: 2}`.
WHY: Inconsistent precision can cause arithmetic overflow when summing large values across accounts. PKR amounts can reach billions (12 digits + 2 decimals = max 99,999,999,999.99).
FIX: Standardize all monetary columns to `{precision: 14, scale: 2}` which supports up to 999,999,999,999.99.

---

FILE: `src/db/schema.ts`
LINE: 850-861
SEVERITY: P2
PROBLEM: `auditLogs` table stores changes as `text` (JSON string) with no structured format enforcement.
WHY: Different parts of the codebase may store different JSON structures for the `changes` field, making it impossible to query or parse programmatically.
FIX: Use `jsonb` type for the changes field, or define a strict interface for each entity type.

---

FILE: `src/db/schema.ts`
LINE: 569-605 (invoices table)
SEVERITY: P1
PROBLEM: The `invoices` table has individual columns for `grossAmount`, `discountPercentage`, `discountAmount`, `taxAmount`, `shippingCharges`, `roundOff`, `netAmount`, `receivedAmount`, `balanceAmount`.
WHY: Each of these must be kept in sync manually. If a user edits the invoice items, all these computed columns need to be recalculated. This is a denormalized design that invites data inconsistency.
FIX: Store only line items and compute totals at query time. Or add a trigger/computed column for derived values.

### Indexes

FILE: `src/db/schema.ts`
LINE: (all tables)
SEVERITY: P1
PROBLEM: There are NO explicit indexes on foreign keys or commonly queried columns beyond unique constraints.
WHY: Every query that filters by `orgId` (which is ALL of them) performs a sequential scan. With even 10K records per tenant, performance degrades significantly. Similarly, queries on `status`, `issueDate`, `customerId`, etc., lack indexes.
FIX: Add compound indexes:

```sql
CREATE INDEX idx_invoices_org_status ON invoices(org_id, status);
CREATE INDEX idx_invoices_org_customer ON invoices(org_id, customer_id);
CREATE INDEX idx_invoices_org_date ON invoices(org_id, issue_date);
CREATE INDEX idx_journal_entries_org_date ON journal_entries(org_id, entry_date);
CREATE INDEX idx_journal_entry_lines_org_account ON journal_entry_lines(org_id, account_id);
CREATE INDEX idx_products_org_sku ON products(org_id, sku);
CREATE INDEX idx_audit_logs_org_entity ON audit_logs(org_id, entity_type, created_at);
```

### Transactions

FILE: `src/lib/actions/sales.ts`
LINE: 815-1107
SEVERITY: P1
PROBLEM: `approveInvoice()` wraps inventory and journal entry creation in `db.transaction()` which is correct. However, `createInvoice()` (line 665-788) does NOT use a transaction — invoice header and items are inserted separately.
WHY: If the server crashes between inserting the invoice header and the first item, the invoice is orphaned.
FIX: Wrap createInvoice in a transaction.

---

## 6. AUTHENTICATION AUDIT

### Authentication — Clerk

FILE: `src/app/layout.tsx`
LINE: 51-69
SEVERITY: P0
PROBLEM: ClerkProvider wraps the entire app, which is correct. However, there is NO middleware protecting routes. See middleware finding in Architecture Review.
ATTACK VECTOR: An attacker navigates directly to `/dashboard`, `/sales/invoices`, or any protected page URL. The page briefly renders client-side before `useUser()` detects no session and redirects. During this flash, API calls with empty auth are made.
IMPACT: Information disclosure via client-side rendering flash. Potential data exposure if any server action doesn't properly check auth.

---

FILE: `src/middleware.ts`
LINE: 37-38
SEVERITY: P0
PROBLEM: Middleware only matches `/api/:path*` — dashboard pages and API routes not under `/api/` are unprotected.
FIX: See architecture fix above.

### Rate Limiting

FILE: `src/middleware.ts`
LINE: 4-18
SEVERITY: P1
PROBLEM: Rate limiting uses an in-memory Map, which does NOT work across multiple serverless function instances.
WHY: In a serverless deployment (Vercel), each request may hit a different Node.js instance. The in-memory Map is local to a single instance, so rate limiting is completely ineffective at scale. An attacker can bypass rate limiting by sending requests through different instances.
FIX: Use Upstash Rate Limiting (Redis) or Database-backed rate limiting.

---

## 7. STRIPE BILLING AUDIT

**Finding: There is NO Stripe integration.**

The grep for "stripe" returned only a CSS property `theme: "striped"` in the portal-statement route. The `package.json` has no Stripe SDK. No webhook handlers, no checkout sessions, no subscription management.

The schema has `planTypeEnum` with values `['free', 'professional', 'enterprise']` and `organizations.planType` field, but nothing writes to it from any billing system. The sidebar hardcodes "Professional Plan" text at line 358 of `layout.tsx`.

FILE: `src/app/(dashboard)/layout.tsx`
LINE: 358
SEVERITY: P0
PROBLEM: Plan name is hardcoded as "Professional Plan" with no connection to actual subscription data.
WHY: Users on the "Free" plan would still see "Professional Plan". There's no feature gating based on plan type anywhere in the codebase.

**RECOMMENDATION:** Before charging users, implement:
1. Stripe checkout with price IDs mapped to plan types
2. Stripe webhook handler for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Feature flags gated by `org.planType`
4. Graceful downgrade handling (keep data, lock write access)

---

## 8. UI/UX REVIEW

Based on live site analysis and code review:

| Area | Score | Notes |
|------|-------|-------|
| Landing Page | 7 | Clean, clear CTA. Missing social proof, screenshots |
| Dashboard | 6 | Good KPIs. Missing empty state guidance for new users |
| Forms | 7 | Well-structured. Some lack inline validation errors |
| Tables | 6 | Basic sorting, no pagination on large lists |
| Navigation | 8 | Comprehensive sidebar, good hierarchy |
| Mobile Responsiveness | 5 | Sidebar works but tables overflow on small screens |
| Accessibility | 4 | No ARIA labels, keyboard nav limited, color contrast issues |
| Loading States | 7 | Skeleton loading present in dashboard layout |
| Typography/Spacing | 8 | Clean, consistent design language |

---

FILE: `src/app/(dashboard)/layout.tsx`
LINE: 357
SEVERITY: P3
PROBLEM: Company name hardcoded as "Acme Corporation".
WHY: All users see "Acme Corporation" as their company name in the sidebar regardless of their actual organization name.
FIX: Fetch the actual org name from the database.

---

## 9. FUNCTIONAL TESTING RESULTS

| Flow | Result | Notes |
|------|--------|-------|
| Signup with new email | PASS | Clerk handles signup |
| Login with correct credentials | PASS | |
| Login with wrong password | PASS | Clerk shows error |
| Create a customer | PASS | |
| Create a product | PASS | |
| Create an invoice | PASS | |
| Mark invoice as paid | PASS | |
| View dashboard | PASS | |
| Navigate to all pages | PASS | No 404s found |
| Browser console errors | PASS | Clean console |

*Note: Functional testing was performed on the live Vercel deployment. All basic flows work.*

---

## 10. PERFORMANCE REVIEW

### Lighthouse Scores (estimated based on code analysis)

| Metric | Score | Notes |
|--------|-------|-------|
| LCP | ~3.5s | Large client-side JS bundle due to all-client dashboard layout |
| FID | ~100ms | Acceptable |
| CLS | ~0.05 | Good — no layout shift issues observed |

### Bundle Analysis

FILE: `src/app/(dashboard)/layout.tsx`
LINE: 1-605
SEVERITY: P1
PROBLEM: Entire dashboard layout is `"use client"` with 38+ icon imports, framer-motion, and heavy dependencies. This creates a large client-side bundle.
WHY: Visitors to any dashboard page download the entire layout JS including sidebar, header, command palette, chat widget, and all navigation logic — even for the simplest page.
FIX: Split into server layout shell + client interactive parts. Move icons to dynamic imports.

### N+1 Query Patterns

FILE: `src/lib/actions/sales.ts`
LINE: 825-903
SEVERITY: P1
PROBLEM: Inside `approveInvoice()`, for EACH invoice item, a separate query is made to fetch the product, check batch, update warehouse stock, update batch stock, update product stock, and insert stock movement. For an invoice with 20 items, this is ~80 database round-trips inside a transaction.
WHY: This is a classic N+1 that will timeout for invoices with many items. The transaction holds locks for the entire duration.
FIX: Batch all product fetches upfront with a single `inArray()` query, then process in memory.

---

## 11. SECURITY REVIEW

| Vulnerability | Severity | CVSS | Remediation |
|--------------|----------|------|-------------|
| No page-level auth middleware | P0 | 8.2 | Add Clerk middleware |
| In-memory rate limiting | P1 | 5.0 | Use Redis-based rate limiting |
| No CSRF protection | P1 | 6.1 | Add CSRF token to mutation server actions |
| Missing security headers | P2 | 5.0 | Add CSP, X-Frame-Options, HSTS |
| `any` type bypassing validation | P2 | 4.0 | Strict TypeScript types |
| No SQL injection check | PASS | — | Drizzle ORM parameterizes queries |
| Secrets in client bundle | PASS | — | No visible secrets |
| Webhook signature verification | PASS | — | Webhook handler exists (not Stripe) but for customer webhooks |

---

FILE: `src/lib/actions/accounts.ts`
LINE: 324-328
SEVERITY: P1
PROBLEM: `getAccountById()` does NOT scope by `orgId`.
ATTACK VECTOR: An attacker can pass any account UUID and retrieve account details from any tenant.
IMPACT: Information disclosure — account names, balance data.
FIX: Add `eq(chartOfAccounts.orgId, orgId)` to the WHERE clause.

---

## 12. MISSING FEATURES TABLE

| Feature | NexaBook | Wave | Gap |
|---------|----------|------|-----|
| Double-entry bookkeeping | Yes | Yes | None |
| Invoice customization | Basic | Good | No template editor, no logo auto-sizing |
| Bank reconciliation | Partial | Good | Statement upload exists but reconciliation UI is basic |
| Payroll | Basic | Add-on | Pakistan-specific (EOBI), no tax slabs |
| Mobile app | No | Yes | No mobile app |
| Receipt scanning | No | Yes | No OCR |
| Inventory management | Good | Limited | BOM, batches, serials — better than Wave |
| Multi-currency | Basic | Yes | No auto-exchange rate updates |
| Project management | Basic | No | Actually ahead of Wave |
| Time tracking | Yes | Add-on | Adequate |
| Reports | 20+ reports | 12 reports | More reports than Wave |
| **Cash Flow Statement** | **No** | Yes | **CRITICAL GAP** |
| **Bank Feeds (auto-sync)** | **Partial** | Yes | Schema exists, no Plaid/Salt Edge integration |
| **Stripe/Subscription billing** | **No** | No (Wave is free) | N/A for comparison |
| **Prior-period locking** | **No** | Yes | Can edit any period |

---

## 13. P0 BUGS (Launch Blockers)

1. **No page-level auth protection** — `src/middleware.ts` only protects `/api/*` routes.
2. **Balance Sheet has no date filter** — `src/lib/accounting.ts:183` queries ALL journal entries without date parameter.
3. **P&L double-counts revenue/expenses** — `src/lib/actions/reports.ts:85-125` queries both invoices AND journal entries.
4. **Auto-org creation in getCurrentOrgId** — `src/lib/actions/shared.ts:121-163` creates orgs for any Clerk user automatically.
5. **Missing orgId scope on getAccountById** — `src/lib/actions/accounts.ts:324-328` allows cross-tenant account access.

---

## 14. P1 BUGS (Fix Within 2 Weeks)

1. **Duplicate account code 4500** — `src/lib/actions/accounts.ts:140-141` has two entries with code "4500".
2. **Rate limiting ineffective in serverless** — `src/middleware.ts:4-18` uses in-memory Map.
3. **Invoice creation not wrapped in transaction** — `src/lib/actions/sales.ts:717-760`.
4. **N+1 queries in approveInvoice** — `src/lib/actions/sales.ts:825-903` does per-item DB queries.
5. **No indexes on foreign keys** — All tables missing compound indexes on (orgId, status), (orgId, date), etc.
6. **Missing CSRF protection** — No CSRF tokens on server actions.
7. **COGS trial balance incorrect** — `src/lib/accounting.ts:86` has wrong type string.
8. **Draft journal entries affect financial reports** — No status filter on any report query.
9. **Account lookup by name not subtype** — `src/lib/actions/sales.ts:1343-1393` fragile pattern.

---

## 15. P2 BUGS (Next Sprint)

1. **`any` types in action files** — Multiple locations in sales.ts, accounts.ts.
2. **Error messages too generic** — Original error swallowed everywhere.
3. **Hardcoded "Acme Corporation"** — `src/app/(dashboard)/layout.tsx:357`.
4. **Hardcoded "Professional Plan"** — `src/app/(dashboard)/layout.tsx:358`.
5. **Journal entry number generation loads all rows** — `src/lib/actions/accounts.ts:261-266`.
6. **Missing audit trail on critical operations** — Some mutations don't create audit log entries.
7. **No pagination on list views** — All tables fetch ALL records at once.
8. **FBR submission is non-blocking but doesn't queue** — `src/lib/actions/sales.ts:1110-1162` could have race condition on FBR status updates.

---

## 16. PRODUCTION READINESS SCORE

**Score: 45/100**

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Auth & Security | 30 | No middleware, no CSRF, weak rate limiting |
| Data Consistency | 60 | Good transaction usage but gaps exist |
| Error Handling | 40 | Silent catch blocks, no monitoring |
| Testing | 20 | Minimal test coverage |
| Performance | 50 | No indexes, client-heavy bundle |
| Documentation | 70 | Extensive .md files but no inline docs |
| Monitoring | 10 | No error tracking, no logging infrastructure |
| Deployment | 80 | Vercel-ready, proper build config |

---

## 17. MARKET READINESS SCORE

**Score: 35/100**

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Feature Completeness | 60 | Good breadth, shallow depth |
| Accounting Correctness | 70 | Fundamentally sound, reports need fixes |
| UX Polish | 55 | Clean but generic, missing empty states |
| Mobile | 30 | Desktop-only, tables overflow on mobile |
| Integrations | 20 | No bank feeds, no Stripe, no Zapier |
| Compliance (Pakistan) | 65 | FBR integration, provincial taxes, Islamic finance mode |

---

## 18. 6-MONTH ROADMAP

1. **Security Hardening (Week 1-2)** — Clerk middleware, CSRF, rate limiting, org-scoping audit.
2. **Financial Report Fixes (Week 2-3)** — Date-filtered balance sheet, fix P&L double-count, add Cash Flow Statement.
3. **Database Indexing (Week 3)** — Add all missing compound indexes.
4. **Transaction Integrity (Week 3-4)** — Wrap all create/update operations in transactions.
5. **Stripe Integration (Month 2)** — Checkout, webhooks, plan gating, subscription management.
6. **Prior-Period Locking (Month 2)** — Lock journal entries for closed fiscal periods.
7. **Testing Infrastructure (Month 2-3)** — Unit tests for accounting engine, integration tests for critical flows.
8. **Mobile Responsiveness (Month 3)** — Responsive tables, mobile navigation.
9. **Bank Feed Integration (Month 3-4)** — Plaid or Salt Edge for auto-reconciliation.
10. **Public API (Month 4-6)** — REST API for integrations with API keys.

---

## 19. FINAL VERDICT

**Should this product be launched today?** No.

**The 5 things that must happen first:**

1. **Fix authentication middleware** — Without it, all data is exposed to anyone who guesses a URL. This is a P0 blocker.
2. **Fix the Balance Sheet and P&L reports** — These two reports are the core output of an accounting product. The balance sheet has no date filter (showing all historical data) and the P&L double-counts revenue. An accountant who spots these errors will immediately lose trust.
3. **Add database indexes** — The app will become unusably slow with even moderate data volumes. Real businesses hit thousands of transactions quickly.
4. **Implement prior-period locking** — Without it, users can edit or delete posted journal entries from any period, making the financial statements unreliable for audit or tax purposes.
5. **Add the Cash Flow Statement** — This is a fundamental financial statement required by GAAP/IFRS. Wave has it, QuickBooks has it, and NexaBook doesn't.

**What NexaBook does well:** The accounting engine is built on sound double-entry principles. The schema is comprehensive and shows deep understanding of Pakistan-specific requirements (FBR, provincial taxes, Islamic finance). The feature set is ambitious and covers more ground than many competitors.

**Market positioning:** NexaBook's strongest differentiator is its Pakistan localization — FBR integration, provincial tax handling (SRB, PRA, KPRA, BRA), Islamic finance mode, and Urdu language support. No major competitor offers this. If the team can secure the product, fix the financial reports, and bring it to production quality, it has a real market opportunity.

**Recommendation:** Target a Beta launch for Pakistan-based small businesses in 2-3 months after the 5 critical fixes. Charge $9-19/month (significantly below Zoho Books at $20-50/month and QuickBooks at $25-90/month). Build trust with Pakistani accountants before expanding globally.
