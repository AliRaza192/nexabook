# NexaBook — Current State (Single Source of Truth)

**Generated:** 2026-08-20
**Method:** Direct code inspection + test run + build run + lint run + tsc run. NOT derived from prior planning docs (those are archived in `docs/archive/` and contain contradicting claims).

---

## 1. Verification Commands — ACTUAL Results

| Command | Result | Evidence |
|---------|--------|----------|
| `npm run build` | **FAILS (exit 1)** | 3 Turbopack errors — sync (non-async) exports in `"use server"` files: `src/lib/actions/tax-filing.ts:19` (`validateNTN`), `:30` (`validateSTRN`), `src/lib/actions/bank-reconciliation.ts:818` (`matchWithPatterns`). Next.js 16 requires every export of a `"use server"` file to be `async`. **This blocks any Vercel deployment.** |
| `npm run test` | **PASS — 177 tests / 10 files** | Vitest 4.1.9, all green in 9s. |
| `npm run lint` | **FAILS (159 errors, 523 warnings)** | ESLint flat config works, but 159 errors (react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any) + 523 warnings. Lint is not clean. |
| `npx tsc --noEmit` | **PASS (exit 0)** | Zero type errors. |

## 2. Repo Scale (actual counts)

- **DB tables:** 102 (`pgTable(` in `src/db/schema.ts`, 3,064 lines)
- **Server action files:** 46 (`src/lib/actions/*.ts`)
- **App pages:** 150 (`page.tsx`)
- **API routes:** 26 (`src/app/api/**/route.ts`)
- **Test files:** 10 (`src/lib/*.test.ts`), 177 tests
- **Source:** ~4.9 MB, 325 files
- **Cron jobs (vercel.json):** 3 (payment-reminders, recurring-invoices, low-stock)

## 3. Claim Verification Table (Phase 0)

| # | Old-doc claim | Doc source | Doc date | Verdict vs current code |
|---|---------------|------------|----------|-------------------------|
| 1 | "No middleware auth on pages" | COMPLETE_AUDIT_REPORT | 2026-06-23 | **VERIFIED-FALSE (already fixed).** `src/middleware.ts` uses `clerkMiddleware` + `auth.protect()` on every non-public route; public matcher covers `/`, login/register, portals, and specific API paths. Also has rate limiting (30 req/60s via `src/lib/rate-limit`) and CSRF on state-changing API methods. |
| 2 | "Balance sheet doesn't filter by date" | COMPLETE_AUDIT_REPORT / EXECUTIVE_SUMMARY | 2026-06-23 | **VERIFIED-FALSE (already fixed).** `src/lib/accounting.ts:187-190` `getBalanceSheet(orgId, asOfDate?)` filters `entryDate <= asOfDate`; `src/lib/actions/reports.ts:302` `getBalanceSheetReport` filters `lte(entryDate, reportDate)`. |
| 3 | "P&L double-counts (queries invoices AND journal entries)" | COMPLETE_AUDIT_REPORT / EXECUTIVE_SUMMARY | 2026-06-23 | **VERIFIED-FALSE (already fixed).** `getProfitAndLossReport` (`reports.ts:47-124`) uses **only** journal entries (income/expense accounts grouped from `journalEntryLines`). No invoice-table query. |
| 4 | "No middleware auto-inject orgId" | PROJECT_CONTEXT / EXECUTIVE_SUMMARY | 2026-07-08 | **VERIFIED-TRUE.** There is still NO middleware/RLS that auto-injects orgId. Scoping is per-server-action via `getCurrentOrgId()` (`shared.ts:24-40`). 45/46 action files call it; **`portal.ts` does not** and its token-generation functions are unguarded (see AUDIT doc, SEC-01). |
| 5 | "Only 1 test file, <10% coverage" | COMPLETE_AUDIT_REPORT / EXECUTIVE_SUMMARY / TASKS | 2026-06-23 | **VERIFIED-FALSE (already improved).** 10 test files, 177 tests, all pass. **BUT:** coverage is *not measurable* — `@vitest/coverage-v8` not installed; `npx vitest run --coverage` errors. All 177 tests cover pure-utility code; **0 server-action files and 0 report functions have any test.** |
| 6 | "Duplicate COA code 4500" | COMPLETE_AUDIT_REPORT | 2026-06-23 | **VERIFIED-FALSE (already fixed).** `accounts.ts:142-143` — 4500 = Exchange Gain, 4550 = Commission Income. No duplicate codes in `seedInitialCOA`. |
| 7 | "getCurrentOrgId auto-creates orgs" | COMPLETE_AUDIT_REPORT | 2026-06-23 | **VERIFIED-FALSE (already fixed).** `shared.ts:24-40` only reads `profiles` and returns `null` if none; no org creation. |
| 8 | "getAccountById not org-scoped" | COMPLETE_AUDIT_REPORT | 2026-06-23 | **VERIFIED-FALSE (already fixed).** `accounts.ts:338-347` filters `and(eq(id, accountId), eq(orgId, orgId))`. |
| 9 | "Trial balance uses net balance" | reports/01-audit-report | 2026-07-05 | **STALE / SPLIT.** `reports.ts getTrialBalanceReport` was fixed to gross (per 02-fixes-applied). BUT `src/lib/accounting.ts:51-110 getTrialBalance` **still computes net** (`normalDebit ? debit-credit : credit-debit`, line 90) — two implementations with different semantics. |
| 10 | "FIFO is actually weighted average" | reports/01-audit-report | 2026-07-05 | **STALE.** `inventory-depth.ts:452-507` was rewritten to consume oldest batches first (per 02-fixes-applied + 5 tests). **BUT the direction is inverted** — it values remaining stock at the *oldest* batch cost instead of the newest (see AUDIT, ACC-08). |
| 11 | "Build/lint/tsc all broken" | reports/01 | 2026-07-05 | **STALE.** tsc passes, lint infrastructure fixed. **Build is broken again** by the 3 sync-export errors above (regression since the report). |
| 12 | "No Stripe billing" | COMPLETE_AUDIT_REPORT | 2026-06-23 | **VERIFIED-FALSE (partially fixed).** Stripe SDK present, `src/lib/stripe.ts`, webhook at `api/stripe/webhook` (signature-verified via `constructEvent`), marketplace checkout + products API. `src/lib/feature-gating.ts` exists **but `hasFteAccess` has zero callers** — no feature gating is enforced. |
| 13 | "Stripe env missing validation" | reports/01 | 2026-07-05 | **VERIFIED-FALSE (fixed).** marketplace/checkout validates env vars. |

### Docs status summary
- **Archived to `docs/archive/`:** all contradictory planning/status docs (COMPLETE_AUDIT_REPORT, ROADMAP, EXECUTIVE_SUMMARY, IMPROVEMENT_PLAN, PROJECT_CONTEXT, PLANNING_*, DECISIONS_LOG, PROGRESS, SESSION_COMPLETE, BACKEND_COMPLETE, MODULE_EXPANSION_COMPLETE, PROJECT_ASSESSMENT_REPORT, SCHEMA_FIX_SUMMARY, COGS_VERIFICATION, AGENTFACTORY_*, and `reports/`).
- **Kept in `docs/`:** feature/module implementation guides (module descriptions still reflect implemented features) and `TASKS.md` (updated below).

## 4. What's ACTUALLY Solid (verified, do not re-litigate)

1. **Middleware security stack** — Clerk page protection + Upstash-style rate limiting + CSRF for API mutations. (Verdict of claim #1 above.)
2. **Org scoping discipline** — 45/46 action files call `getCurrentOrgId()`; the well-worn paths (sales/purchases/accounts/HR/pos main flows) are org-scoped. (Notably except the IDOR list in the AUDIT doc.)
3. **`approveInvoice` transactionality** — invoice status + inventory + stock movements + JE + JE lines all inside one `db.transaction` (`sales.ts:878-1204`). (Verdict of claim on transactions.)
4. **Balance sheet cumulative / P&L period-bounded date semantics** — both report families implement the correct (different) semantics. (Verdict of claim #2.)
5. **P&L single source** — journal-entry-only calculation. (Verdict of claim #3.)
6. **Manual journal entries** — balanced-check enforced, RBAC (`admin|accountant`), period-lock checked, transactional, audit-logged, SQL COUNT numbering (`accounts.ts:231-330`).
7. **Webhook signature verification** — Stripe (`constructEvent`) and JazzCash (`computeSecureHash`) callbacks are verified; cron routes use `CRON_SECRET`; portal routes are token-gated.
8. **COA seeding** — comprehensive (~70 accounts, no dup codes), subType-mapped, system accounts looked up by `subType` not name.
9. **Typescript strict** — `tsc --noEmit` clean, zero errors.
10. **Indexes** — migration SQL `001_add_org_indexes.sql` + `004_add_performance_indexes.sql` provide orgId + composite (orgId,status/date/customer) indexes for all major tables.

## 5. The 5 Most Dangerous Findings (summary — full detail in AUDIT_2026-08-20.md)

1. **BUILD BLOCKER (P0):** sync exports in `"use server"` files — `tax-filing.ts:19,30` and `bank-reconciliation.ts:818`. Production deploy impossible until fixed.
2. **FINANCIAL STATEMENTS ARE EMPTY (P0):** every JE written by operational flows (`approveInvoice` `sales.ts:1006-1015`, purchases, POS, expenses, banking, sales returns, manual JEs) is inserted **without a `status`** → defaults to `'draft'` (`schema.ts:901`). All report queries filter `status != 'draft'`, so **approved invoices / purchases / POS sales never appear in Trial Balance, P&L, or Balance Sheet.** Only payroll, opening balances, stock adjustments and delete-reversals post as `'posted'`. The GL/Cash-book reports (no status filter) DO include them — the two report families disagree.
3. **CROSS-TENANT WRITES (P0):** 19 IDOR write paths where records are fetched/updated by ID alone with no org check — `portal.ts:11` (`generatePortalToken` — no auth at all), `hr-payroll.ts:890` (`markPayslipPaid`), `approvals.ts:160/178`, `consolidation.ts:60/82`, `pos.ts:421/515`, `sales.ts` delivery-note/payment/settlement, `purchases.ts` vendor payment/settlement, `manufacturing.ts:747`, `adjustments.ts:464`, plus `api/send-invoice-email/route.ts:91`.
4. **`updateInvoiceStatus` bypasses accounting (P0):** `sales.ts:1273-1311` lets any role set `status = "approved"` with **no JE, no inventory decrement, no period-lock, no RBAC** — a full bypass of `approveInvoice`.
5. **No DB-level double-entry constraint (P0):** debits=credits is enforced only in app code (`validateJournalBalance`, `< 0.01` tolerance). No CHECK constraint or trigger on `journal_entry_lines`.

## 6. Test / Coverage Reality

- 177 tests / 10 files, all passing. Tests cover: `accounting.ts` (roundCurrency, calculateLineTotal, validateJournalBalance), bank-reconciliation (CSV/autoMatch), encryption, FIFO vs WAC, NexaBot intents, payroll EOBI/PF, smart-invoice, smart-reconciliation, tax NTN/STRN, zod validations.
- **ZERO tests for:** all 46 server-action files, report functions (`getProfitAndLossReport`, `getBalanceSheetReport`, `getTrialBalanceReport`, `getCashFlow*`), JE status posting, org-scoping / IDOR guards, RBAC, webhook signature verification, multi-tenant isolation, period locking, or transaction rollback on failure.
- Coverage instrumentation not installed (`@vitest/coverage-v8` missing) — the "<10%" figure in old docs was never measurable.

## 7. AI / AgentFactory Reality (summary — detail in AI_DIFFERENTIATION_2026-08-20.md)

- **7 SKILL.md files populated** in `.opencode/skills/` (invoice-creation, bank-reconciliation, tax-filing, payroll-processing, financial-reporting, inventory-management, customer-management).
- **MCP layer exists** (`src/mcp/client.ts`, `servers/`, `tools/`) — real queries route through retrievers; `accounting-server.ts` is a demo stub.
- **Evals framework exists** (`evals/`) but runner uses `mockHandler` and `reports/` is empty — evals do not exercise real AI.
- **NexaBot** functional: 14 retrievers, Gemini, Roman-Urdu, SSE chat, history.
- **FTE monetization tables + marketplace UI + Stripe checkout exist, but `hasFteAccess` gating is never enforced** — subscriptions are ornamental.
- **Spec maturity:** smart-invoicing = fully implemented; accounting/inventory/tax/payroll/reconciliation = mostly; crm-fte follow-ups & accounting anomaly detection = not implemented; invoice-ocr backend done but UI never mounted; smart-reconciliation logic only lives in a test file.