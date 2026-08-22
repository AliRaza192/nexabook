# NexaBook — Production-Readiness Plan (Sequenced, Evidence-Referenced)

**Date:** 2026-08-20
**Based on:** `AUDIT_2026-08-20.md` findings (every item cites a finding ID + file:line).
**Sequencing logic:** (a) cross-tenant data leak → (b) wrong financial numbers shown to a business owner → (c) data loss on failed transaction → then performance/quality. Verified-already-solid items are listed in §"Already Solid" and are NOT re-litigated.

---

## WAVE 0 — Unblock the build (0.5 day, P0)

**Why first:** no deploy works until this is fixed; it also unblocks CI.

| Item | Ref | Work | Hrs |
|------|-----|------|-----|
| Move `validateNTN`, `validateSTRN` out of the `"use server"` file into `src/lib/validation.ts`; re-export/import in `tax-filing.ts` and update test import (`src/lib/tax-filing.test.ts:2`). | BLD-01 | Small refactor + import fixes | 1 |
| Same for `matchWithPatterns` → `src/lib/bank-reconciliation-utils.ts` (or inline private); keep test imports working. | BLD-01 | 1 | 1 |
| Install `@vitest/coverage-v8`, add `coverage` config, baseline `npm run test -- --coverage` (expect <5% — this is the honest number). | BLD-03 | 0.5 | 1 |
| Fix `react-hooks/set-state-in-effect` errors to get `npm run lint` to zero errors (12+ sites incl. `i18n.tsx:59`). | BLD-02 | 2 | 3 |

**Wave 0 total: ~6h**

---

## WAVE 1 — Cross-tenant data leak (P0) — 3 days

**Rationale:** a single leaked row to a competitor is a company-ending event for a fintech. This outranks all accounting work.

### 1a. Fix the 12 critical IDOR writes (add org scoping + auth)

Each fix is: add `getCurrentOrgId()`, confirm the target row belongs to the caller's org (fetch-by-id-with-org, or add `eq(table.orgId, orgId)` to the mutation WHERE), and add `requireRole` where relevant.

| Finding | Location | Fix |
|---------|----------|-----|
| SEC-01 | `portal.ts:11-14` `generatePortalToken` — **no auth at all** | Add `auth()` + verify customer belongs to caller org before updating `portalToken`. Add `requireRole(["admin","accountant"])`. Same for `generateVendorPortalToken` (`:79`). |
| SEC-02 | `hr-payroll.ts:890-898` `markPayslipPaid` | Add `eq(payslips.orgId, orgId)` to WHERE + `requireRole`. |
| SEC-03/04 | `approvals.ts:160/178/47` | Add org check on the target `approvalRequests`/`approvalWorkflows`. |
| SEC-05 | `consolidation.ts:60/82` `link/unlinkChildOrg` | Verify `childOrgId` is a descendant of caller's org before update. |
| SEC-06 | `purchases.ts:1881/1900/2032` vendor payment/settlement | Org-scope the vendor lookup. |
| SEC-07 | `sales.ts:2481` `createDeliveryNote` | Org-scope invoice fetch. |
| SEC-08 | `sales.ts:3245/3365` `createCustomerPayment`/`allocatePayment` | Org-scope invoice/payment lookups (both `alloc.invoiceId` and invoice update). |
| SEC-09 | `pos.ts:421/515` `processPosSale` | Org-scope product + customer lookups before stock/loyalty writes. |
| SEC-10 | `manufacturing.ts:747/784` | Org-scope product lookup. |
| SEC-11 | `adjustments.ts:464` `approveMiscContactSettlement` | Org-scope bank account lookup. |
| SEC-13 | `api/send-invoice-email/route.ts:91` | Add `eq(invoices.orgId, orgId)` to the update. |

**~16h (7 files, well-understood pattern, no architectural change)**

### 1b. Remaining IDORs + RBAC enforcement

| Finding | Location | Hrs |
|---------|----------|-----|
| SEC-12/14/15/17/19 | `sales.ts:734/1215`, `inventory.ts:765`, `leaves.ts:375/193`, `accounts.ts:768` + nested FK validation | 5 |
| SEC-16 | `consolidation.ts` `getAvailableOrgsForConsolidation` — filter to org's own descendants | 1 |
| SEC-20 | `sales.ts:1273` `updateInvoiceStatus` — **add `requireRole` + forbid `approved` transition here; force users through `approveInvoice`** (this is also ACC-04) | 2 |
| SEC-21/22/23 | `banking.ts` 4 actions, `markPayslipPaid`, `approvePurchaseOrder`, leave approvals, `completeStockCount`, reconciliation finalize — add `requireRole(["admin","accountant"])` | 3 |

**~11h**

### 1c. Regression tests for isolation

Write a multi-tenant test harness: create 2 orgs, attempt cross-org read/write for each fixed path, assert denial. Add to `src/lib/actions/*.test.ts` (mock `db`). This permanently prevents re-regression — non-negotiable before Wave 1 ships.

**~6h**

**Wave 1 total: ~33h (~3-4 days incl. test writing)**

---

## WAVE 2 — Financial numbers shown to a business owner are WRONG (P0) — 4-5 days

**Rationale:** this is the trust product. ACC-01/02 means P&L and Balance Sheet are effectively empty of operational activity — the single worst defect found.

### 2a. JE status: post operational JEs (THE fix)

| Finding | Location | Fix |
|---------|----------|-----|
| ACC-01 | `sales.ts:1006`, `purchases.ts:454`, `pos.ts:439`, `purchases.ts:813`, `banking.ts:359/541/959`, `sales.ts:3097`, `manufacturing.ts:580/824`, `accounts.ts:231` | Set `status: "posted"` (+ `postedAt`) on every JE insert in these paths. Grep-verify afterwards: `grep "insert(journalEntries)" src/lib/actions/` — every call site must set status. |
| ACC-02 | `accounting.ts:73/137/205`, `reports.ts:78/303/554` | Decide status policy. Recommended: reports filter `status IN ('posted')` (exclude both draft AND reversed). Fix `!= 'draft'` → `= 'posted'` for TB/P&L/BS. |
| ACC-05 | `sales.ts:1390-1431` `deleteInvoice` | Write `journalEntryId` back to the invoice in `approveInvoice` (the column exists, `schema.ts:601`), then the existing reversal code fires. Also update the GL/Cash-book "no status filter" discrepancy (`reports.ts:177-213`). |
| ACC-06 | `purchases.ts:592-720` `revisePurchaseInvoice` | Fix `referenceType` mismatch (`'purchase'` vs `'purchase_invoice'`); set reversal JE to `posted`; mark original `reversed`. |

**~16h (mechanical but must be exhaustive — the "every insert sets status" grep is the verification gate)**

### 2b. DB-level double-entry constraint

| Finding | Location | Fix |
|---------|----------|-----|
| ACC-03 | `schema.ts:1174-1183` | Add a trigger (or Drizzle-generated `check`) — simplest robust option: a Postgres trigger on `journal_entry_lines` that compares per-JE `sum(debit)=sum(credit)` on insert/update/delete and raises otherwise. Also a CHECK that a line isn't both-zero/both-non-zero. Add migration. Note: this requires cleaning any existing unbalanced data first (run a reconciliation SQL). |

**~8h**

### 2c. POS accounting

| Finding | Location | Fix |
|---------|----------|-----|
| ACC-13 | `pos.ts:469-510` | Add COGS debit / Inventory credit lines to the POS JE (reuse the batch/cost logic from `approveInvoice`). |
| ACC-14 | `pos.ts` whole file | Add `checkPeriodLocked` to `processPosSale` and shift close. |
| TXN-01 | `pos.ts:320-570` | Wrap `processPosSale` (invoice + items + stock + JE + loyalty) in `db.transaction`. |

**~10h**

### 2d. COGS / inventory valuation consistency

| Finding | Location | Fix |
|---------|----------|-----|
| ACC-11 | `sales.ts:959-965` vs `reports.ts:2291/2339` | Make the product-sales report use the *same* cost source as the JE (store unit cost on the invoice item at approval time — snapshot `unitCost` on `invoiceItems`; report reads that). |
| ACC-12 | `inventory-depth.ts:452-507` | Fix FIFO direction: value remaining stock by consuming oldest batches first for *what was sold*, and value *remaining* inventory from the newest batch (or implement proper FIFO layer for the valuation report). Add a unit test proving FIFO ≠ WAC ≠ LIFO. |

**~10h**

### 2e. Reporting regression tests (P0 financial trust)

Write tests (mock DB or integration DB):
1. Approve invoice → JE is `posted` → appears in P&L and BS.
2. Delete/void invoice → JE reversed → net-zero in P&L.
3. Purchase approve → revise → reversal pair nets to zero.
4. POS sale → COGS line present, debits=credits.
5. Balance sheet as-of-date excludes future entries; P&L period bounds respected.
6. Locked period → POS/stock-adj/status-flip rejected.

**~12h**

**Wave 2 total: ~56h (~6-7 days)**

---

## WAVE 3 — Data loss / partial failure (P0/P1) — 2 days

| Finding | Location | Fix | Hrs |
|---------|----------|-----|-----|
| TXN-02/03/05 | `sales.ts:3212/3358/3490/1315`, `purchases.ts:253/1047/1764/787`, `hr-payroll.ts:580`, `fixed-assets.ts:515`, `manufacturing.ts:600/820`, `onboarding.ts:28` | Wrap in `db.transaction` following the `approveInvoice` pattern. Batch the N inserts (`db.insert().values(array)`). | 12 |
| TXN-04 | `banking.ts:91/320/497/904` | Move balance updates + JE into one transaction; add `toFixed(2)` on balance writes (Q-06). | 6 |
| ACC-08 | `sales.ts:1011`, `purchases.ts:458`, `pos.ts:443` | JE `entryDate` = document date (invoice.issueDate / purchase date), not approval time. | 2 |

**Wave 3 total: ~20h**

---

## WAVE 4 — Period-lock + currency + tax correctness (P1) — 2-3 days

| Finding | Location | Fix | Hrs |
|---------|----------|-----|-----|
| ACC-15 | `inventory-depth.ts:330`, `fixed-assets.ts:539`, `accounts.ts:434/573`, `manufacturing.ts`, `banking.ts:653`, GRN | Add `checkPeriodLocked` (use the entry/document date) to every remaining JE-posting or stock-mutating path. | 6 |
| ACC-17 | `sales.ts:1111-1123` + FX | Apply `exchangeRate` → store PKR-equivalent amounts in JE lines; record original currency/rate on the JE (`schema.ts` add `currency`, `exchangeRate` cols to `journalEntries`); unrealized gain/loss accounts per ROADMAP C1. | 8 |
| ACC-18 | `accounting.ts` | Add FX rounding-diff allocation to a round-off account; tighten `validateJournalBalance` to 0.005 or exact. | 2 |
| ACC-19/20 | `sales.ts:1087-1103`, `pos/page.tsx:120` | Wire `tax_rates` table as the source of truth; server-side validate POS tax; add WHT account mapping on sales side. | 6 |
| SEC-24 | `api/payments/callback/route.ts:25-39` | Implement easypaisa signature verification; fail closed if `JAZZCASH_INTEGRITY_SALT` missing. | 3 |

**Wave 4 total: ~25h**

---

## WAVE 5 — Performance & debt (P2/P3) — 1-2 days

| Finding | Location | Fix | Hrs |
|---------|----------|-----|-----|
| PERF-01/02/03/04 | `sales.ts:952/3238`, `crm.ts:100`, `pos.ts:814`, `hr-payroll.ts:659` | Batch queries: `inArray` prefetch products/batches; batch inserts; single GROUP BY for reports. | 8 |
| PERF-05 | `banking.ts:124/356/470`, `dashboard.ts:207` | SQL COUNT for numbering; 2 GROUP BYs for trends; index/reduce O(S×T) reconciliation. | 3 |
| Q-01 | `hr-payroll.ts:188/253` | Log errors. | 1 |
| Q-04/05 | page.tsx shim; duplicate functions | Consolidate. | 3 |

**Wave 5 total: ~15h**

---

## WAVE 6 — Observability & monitoring (P3) — 1 day

| Finding | Location | Fix | Hrs |
|---------|----------|-----|-----|
| Q-02 | `src/lib/events/` | Either wire the event bus into real flows (FBR retry, audit) or delete the skeleton. | 2 |
| Q-03 | `src/lib/sentry.ts` | Real Sentry init (or a structured logger) with DSN env var; ensure financial-write catch blocks emit structured error events. | 4 |
| — | deploy | `vercel.json` already has 3 crons; add `CRON_SECRET` check + a health endpoint. | 2 |

**Wave 6 total: ~8h**

---

## Effort rollup

| Wave | Focus | Hours | ~Days |
|------|-------|-------|-------|
| 0 | Build unblock + lint + coverage baseline | 6 | 0.5 |
| 1 | Cross-tenant leak (IDOR + RBAC + tests) | 33 | 3-4 |
| 2 | Financial correctness (JE status, COGS, POS, DB constraint, report tests) | 56 | 6-7 |
| 3 | Transaction atomicity | 20 | 2 |
| 4 | Period-lock, FX, tax, webhook sig | 25 | 2-3 |
| 5 | Performance & debt | 15 | 1-2 |
| 6 | Observability | 8 | 1 |
| **Total** | | **~163h** | **~16-19 working days** |

Sequenced so that **Waves 0-2 must ship before any customer-facing invoice, bank reconciliation, or payroll is shown as "accurate."** Wave 3 can start in parallel with Wave 4.

---

## Already solid (DO NOT re-do — verified in Phase 0)

- Middleware (Clerk page protect + rate limit + CSRF) — claim #1.
- Org-scoping pattern & the 45 well-covered action files — don't re-audit, just add the regression tests in 1c.
- `approveInvoice` transactionality + JE-balance validation call — already inside `db.transaction`.
- Balance sheet as-of / P&L period semantics — correct.
- P&L single-source (journal entries only) — correct.
- Manual journal entry flow (RBAC + balance + period lock + audit + SQL COUNT) — correct.
- Webhook signature verification for Stripe & JazzCash — correct.
- COA seeding & subType-based account lookups — correct.
- tsc clean; index migrations 001/004 present.
- Document-number generation retry logic (`shared.ts:48-152`).
- Rate limiting backed by real store (not in-memory Map).

---

## Competitive gap list (Splendid Accounts / QuickBooks / Wave class)

Already present in NexaBook (verify docs vs code before claiming): bank reconciliation w/ statement import + pattern learning (partial — smart-reconciliation logic is test-file-only), recurring invoice cron, WHT certificates, consolidated multi-org reports, RBAC, period locking (partial), 2FA, WhatsApp/email reminders, PDF invoices w/ FBR QR, payroll w/ EOBI/PF.

**Genuine gaps to close in this order:**
1. **Bank feed auto-reconciliation** — `bankConnections` schema + cron exist; Smart Reconciliation (`src/lib/smart-reconciliation.test.ts`) needs promotion to a real action + UI wiring. (Smallest gap to a marquee feature.)
2. **Audit trail immutability** — `auditLogs.changes` is `text` JSON (Q-06-adjacent); no immutability (append-only) guarantee; no per-document change history UI for invoices/JEs.
3. **Approval workflows** — `approvals.ts` exists but is unguarded (SEC-03/04) and single-level; mid-market needs multi-level chains with amount thresholds.
4. **Role-based dashboards** — single dashboard for all roles; no per-role KPI views.
5. **Closing / lock-period discipline UI** — locks exist server-side; no fiscal-year-close wizard or prior-period edit audit.
6. **Multi-branch consolidation** — consolidation exists; needs branch-level GL dimension + per-branch P&L/BS.
7. **Document management** — no attachments on invoices/POs/employees (spec'd in `04-feature-roadmap`).
8. **Public API + Zapier** — server-actions-only today; `P-001` in archived DECISIONS_LOG is still open.