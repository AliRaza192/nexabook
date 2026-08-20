# NexaBook — Full Project Audit Report

**Date:** 2026-07-05
**Auditor:** OpenCode Agent
**Codebase:** Next.js 16.2, TypeScript 5.7, Drizzle ORM 0.45, Neon PostgreSQL, Clerk Auth

---

## Build / Type / Lint Health

### Blocking

| # | Finding | File | Severity |
|---|---------|------|----------|
| 1 | `npm run lint` broken — Next.js 16 removed the `lint` CLI command; `next lint` treats "lint" as a directory and errors "Invalid project directory". Script in `package.json` is dead. | `package.json:10` | **Critical** |
| 2 | ESLint 9.x installed but config is `.eslintrc.json` (legacy format). ESLint 9 requires `eslint.config.js` / `eslint.config.mjs`. Running `npx eslint src` fails with "couldn't find eslint.config.(js\|mjs\|cjs)". | `.eslintrc.json` | **Critical** |
| 3 | `npx tsc --noEmit` fails — `error TS2307: Cannot find module 'dotenv'`. `dotenv` is used in `drizzle.config.ts` but is not listed in `devDependencies`. | `drizzle.config.ts:2` | **High** |

### Passing

- `npm run test` — 172 tests pass across 9 files (all in `src/lib/*.test.ts`)
- `npm run build` — not tested (requires `DATABASE_URL`), but `tsc` is the proxy check

---

## Non-Negotiable Rule Violations

### Rule 1: `orgId` on every query

**Status:** ✅ Generally enforced. All `src/lib/actions/*.ts` files use `getCurrentOrgId()`. All `src/app/api/` routes either import from `shared.ts` or define their own local `getCurrentOrgId()`.

**Issue:** 7 API route files define **local duplicate** `getCurrentOrgId(userId: string)` instead of importing from `@/lib/actions/shared`. This creates maintenance risk — if the shared implementation changes (e.g., adding audit logging), these copies won't get it.

| File | Line |
|------|------|
| `src/app/api/webhooks/route.ts` | 7 |
| `src/app/api/webhooks/[id]/route.ts` | 8 |
| `src/app/api/chat/history/route.ts` | 7 |
| `src/app/api/chat/route.ts` | 11 |
| `src/app/api/payments/initiate/route.ts` | 7 |
| `src/app/api/mobile/dashboard/route.ts` | 13 |
| `src/app/api/mobile/invoices/route.ts` | 7 |

The shared version (`src/lib/actions/shared.ts:24`) uses `auth()` from Clerk to get `userId`, then queries the DB. The local versions accept `userId` as a parameter (which is slightly different — they depend on the caller already having authed). This is **not a security bug** (middleware protects these routes), but it **is** a consistency/maintenance risk.

**Severity:** Medium (not a security hole, but violates DRY and creates drift risk)

### Rule 2: No raw SQL in components

**Status:** ✅ No violations found. DB access in `src/app/` is limited to type imports (`import type { ChartOfAccount }`), not runtime queries.

### Rule 3: Decimal for money

**Status:** ✅ Schema uses `decimal(14,2)` for all monetary columns. Application code uses strings for monetary values (`toFixed(2)`).

**Minor issue:** Some application code uses `parseFloat()` for intermediate calculations (e.g., `reports.ts:561`, `inventory-depth.ts:474-476`). This is acceptable since the values are stored as `decimal` in the DB and only parsed transiently in memory for aggregation. The conversion back to string happens before write.

### Rule 4: Double-entry bookkeeping — balanced journal entries

**Status:** ⚠️ Partially enforced.

- `validateJournalBalance()` is called in most places that create journal entries (sales, purchases, POS, banking, fixed assets, HR payroll, inventory adjustments).
- The `accounts.ts` manual journal entry function validates balance.

**Issues found:**

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| 4a | **Trial Balance uses net balance (debit - credit) instead of showing gross debit and credit columns separately.** Lines 570-581 compute `balance = debit - credit`, then push the net into either a `debit` or `credit` field. This means if an account has 100K debit and 80K credit, it shows as 20K debit — losing the original totals. A correct trial balance should show total debits and total credits per account (or at minimum, show both columns). The current display masks transaction volume. | `src/lib/actions/reports.ts:566-582` | **Critical** |
| 4b | The `FIFO` stock valuation method computes a **weighted average** (sum of qty×cost / total qty), not actual FIFO. Lines 473-481 iterate all batches and accumulate `qty * cost` then divide by total quantity. True FIFO should consume stock from oldest batches first and only value remaining stock from newer batches if the total stock exceeds the oldest batch quantity. Under the current logic, FIFO and weighted_average produce identical results. | `src/lib/actions/inventory-depth.ts:452-496` | **High** |

### Rule 5: TypeScript strict — no `any` types

**Status:** ❌ **63 `any` occurrences** found across the codebase.

**Breakdown by file (top offenders):**

| File | Count | Type |
|------|-------|------|
| `src/lib/actions/projects.ts` | 14 | `catch (error: any)` |
| `src/lib/actions/consolidation.ts` | 7 | `catch (error: any)` + Map type |
| `src/lib/actions/bank-feeds.ts` | 5 | `catch (error: any)` |
| `src/lib/actions/reports.ts` | 5 | Callback type annotations |
| `src/lib/payments/easypaisa.ts` | 4 | `let data: any` + `catch (error: any)` |
| `src/lib/utils/payslip-pdf.ts` | 4 | `any[][]` arrays + param types |
| `src/lib/actions/inventory.ts` | 3 | `any` on tx params + `updateData` |
| `src/lib/actions/purchases.ts` | 3 | `updateData: any` |
| `src/lib/payments/jazzcash.ts` | 3 | `let data: any` + `catch` |
| `src/lib/fbr-api.ts` | 2 | `let data: any` + `catch` |
| `src/lib/sentry.ts` | 2 | `let sentryClient: any` |
| `src/lib/actions/inventory-depth.ts` | 2 | `valuationDetails: any[]` |
| `src/lib/actions/hr-payroll.ts` | 2 | `catch (error: any)` |
| `src/lib/actions/fixed-assets.ts` | 1 | `asset: any` |
| `src/lib/excel-export.ts` | 1 | `wsData: any[][]` |
| `src/lib/ai/retriever.ts` | 1 | Function signature |
| `src/app/api/stripe/webhook/route.ts` | 1 | `safePeriodEnd(sub: any)` |
| `src/app/api/cron/bank-feeds/route.ts` | 1 | `catch (err: any)` |
| `src/db/schema.ts` | 1 | `.references((): any => ...)` |

**Severity:** High — violates the non-negotiable rule. The `catch (error: any)` pattern (40+ instances) can be replaced with `(error: unknown)` and a type guard.

### Rule 6: No comments in code unless explicitly requested

**Status:** ❌ **35 TODO/FIXME comments** found across event handlers and one in inventory.

| File | Count | Nature |
|------|-------|--------|
| `src/lib/events/handlers/payment-handlers.ts` | 9 | All TODO stubs |
| `src/lib/events/handlers/stock-handlers.ts` | 5 | All TODO stubs |
| `src/lib/events/handlers/system-handlers.ts` | 5 | All TODO stubs |
| `src/lib/events/handlers/invoice-handlers.ts` | 5 | All TODO stubs |
| `src/lib/events/handlers/payroll-handlers.ts` | 4 | All TODO stubs |
| `src/lib/actions/inventory.ts` | 1 | TODO |

These are **stub comments** in skeleton event handlers, not incidental comments. They indicate unfinished business logic. The `CONSTITUTION.md` says "No comments unless explicitly requested." However, these are structural TODOs for unimplemented features — removing them would erase useful context. Recommendation: convert them to spec references in `specs/` and remove from code.

**Severity:** Low (these are intentional placeholders, not noise)

### Rule 7: No secrets in code

**Status:** ✅ No hardcoded secrets found. All API keys accessed via `process.env.*`. The `sk_test_` occurrences in `src/lib/encryption.test.ts` are test fixtures, not real keys.

---

## Accounting Correctness Issues

### Issue 1: Trial Balance gross/net calculation (Critical)

**File:** `src/lib/actions/reports.ts:566-582`

```typescript
// CURRENT (WRONG):
const balance = debit - credit;
if (balance > 0) {
  accountBalances.push({ ...account, debit: balance, credit: 0 });
  totalDebit += balance;
} else {
  accountBalances.push({ ...account, debit: 0, credit: Math.abs(balance) });
  totalCredit += Math.abs(balance);
}
```

This collapses the original debit/credit totals into a net balance. A correct Trial Balance should:
1. Show gross debit and gross credit per account (or at minimum the running balance)
2. Sum all debits across all accounts and all credits — they should be equal
3. The current approach can mask accounts with high transaction volume on both sides

**Impact:** The Trial Balance will show equal totals (math still works), but the per-account display is misleading. An account with 1M debit and 1M credit shows as 0, which is technically correct but hides activity.

### Issue 2: FIFO valuation is actually weighted average (High)

**File:** `src/lib/actions/inventory-depth.ts:452-496`

The FIFO branch computes:
```typescript
for (const batch of batches) {
  productTotalValue += qty * cost;
  totalStock += qty;
}
const unitCost = totalStock > 0 ? productTotalValue / totalStock : 0;
```

This is the weighted average formula. True FIFO should:
- Start from the oldest batch
- Consume stock sequentially from oldest to newest
- Only count batches that contribute to remaining stock

Under current logic, if you have:
- Batch A: 10 units @ Rs. 100
- Batch B: 5 units @ Rs. 200
- Current stock: 8 units

Current code values all 15 units (10×100 + 5×200) / 15 = Rs. 133.33/unit → 8 × 133.33 = Rs. 1,066.67

True FIFO should consume 8 from Batch A → 8 × Rs. 100 = Rs. 800

The two methods produce **different results**, but the code produces the same result for both. This means selecting "FIFO" gives you weighted average pricing, which is incorrect for businesses that need actual FIFO (e.g., perishable goods, compliance).

### Issue 3: COA seeding is not automatic on org creation

**File:** `src/lib/actions/accounts.ts:50-70`

The `seedInitialCOA()` function exists but is not called from `createOrganization()` in `src/lib/actions/onboarding.ts`. Users must manually trigger COA seeding. This is a UX gap but not a correctness bug.

---

## Security & Middleware Review

### `src/middleware.ts`

**Status:** ✅ Generally well-configured.

- Clerk auth protection on all non-public routes ✅
- Rate limiting: 30 requests/60s per IP ✅
- CSRF validation on state-changing methods ✅
- Proper exemptions for webhooks, payments, cron, chat, mobile ✅

**Issues:**

| # | Finding | Severity |
|---|---------|----------|
| S1 | `POST /api/marketplace/checkout` creates a Stripe checkout session using `process.env.STRIPE_SECRET_KEY!` with a non-null assertion. If the env var is missing, this throws at runtime with an unhelpful error. Should validate like the webhook route does. | Medium |
| S2 | The Stripe webhook route (`src/app/api/stripe/webhook/route.ts`) validates `webhookSecret` but the marketplace checkout route (`src/app/api/marketplace/checkout/route.ts:8`) does `new Stripe(process.env.STRIPE_SECRET_KEY!, ...)` — if STRIPE_SECRET_KEY is undefined, Stripe constructor may not throw immediately but will fail on API calls. | Medium |

---

## Dead Code / Inconsistencies

| # | Finding | File | Severity |
|---|---------|------|----------|
| D1 | **7 duplicate `getCurrentOrgId` implementations** in API routes (see Rule 1 above). Should import from `shared.ts`. | Multiple API routes | Medium |
| D2 | **46 server action files, 0 test files** for actions. All existing tests (9 files) are in `src/lib/` for utility functions. No server action has any test coverage. | `src/lib/actions/` | Medium |
| D3 | **Event handlers are empty stubs.** `src/lib/events/handlers/*.ts` files contain only TODO comments and no actual logic. If these are imported anywhere, they're dead code. If not imported, they're orphaned files. | `src/lib/events/handlers/` | Low |
| D4 | **`src/lib/events/` directory** — `handlers/` subdirectory exists but no evidence of an event bus that invokes these handlers. | `src/lib/events/` | Low |
| D5 | **File naming inconsistency:** `src/lib/actions/invoice-ocr.ts` vs `src/lib/actions/smart-invoice.ts` — mixed kebab-case naming is correct, but there's no pattern to which action files are named with module vs feature names. | Multiple | Low |
| D6 | **`src/lib/sentry.ts`** uses `let sentryClient: any` — the Sentry integration is skeleton code that never initializes properly (no DSN configuration). | `src/lib/sentry.ts:1` | Low |
| D7 | **`src/lib/encryption.ts`** test uses `process.env.ENCRYPTION_KEY` but the test setup doesn't mock it — encryption test may rely on the env var being set. | `src/lib/encryption.test.ts` | Low |

---

## Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Build/Type/Lint | 2 | 1 | 0 | 0 |
| Non-Negotiable Rules | 1 | 2 | 1 | 1 |
| Accounting Correctness | 1 | 1 | 0 | 0 |
| Security | 0 | 0 | 2 | 0 |
| Dead Code/Inconsistencies | 0 | 0 | 3 | 4 |
| **Total** | **4** | **4** | **6** | **5** |

### Top Priority Fixes (Phase 2 scope)

1. **[Critical]** Fix lint infrastructure — migrate to ESLint flat config, fix `next lint` script
2. **[Critical]** Fix Trial Balance report to show gross debit/credit
3. **[Critical]** Fix FIFO valuation to implement actual FIFO algorithm
4. **[Critical]** Add `dotenv` to devDependencies to fix `tsc --noEmit`
5. **[High]** Replace all `catch (error: any)` with `catch (error: unknown)` + type guards
6. **[High]** Replace all `any` type annotations with proper types
7. **[High]** Fix FIFO valuation algorithm (same as Critical #3, included for completeness)
