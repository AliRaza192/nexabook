# NexaBook — Task Tracking System
**Version:** 4.0
**Last Updated:** 2026-08-20
**Source of truth:** docs/CURRENT_STATE_2026-08-20.md (state) · docs/AUDIT_2026-08-20.md (findings) · docs/PRODUCTION_PLAN_2026-08-20.md (sequenced work)
**Note:** The previous v3.0 (June-July 2026) planning docs were archived to `docs/archive/` because they contradicted the actual code. This file was rewritten from evidence, not from those docs.

---

## Legend
- [x] = verified DONE (checked against actual code in Phase 0 audit, 2026-08-20)
- [ ] = not done
- [~] = in progress

---

## ALREADY DONE (verified against code — do NOT redo)

### Security / Middleware
- [x] Clerk middleware protects all pages (auth.protect on non-public routes) — `src/middleware.ts`
- [x] Rate limiting on API routes (30 req/60s per IP, store-backed) — `src/middleware.ts` + `src/lib/rate-limit`
- [x] CSRF validation for state-changing API methods — `src/middleware.ts`
- [x] Stripe webhook signature verification — `api/stripe/webhook/route.ts`
- [x] JazzCash callback signature verification — `api/payments/callback/route.ts`
- [x] CRON_SECRET guard on cron routes

### Accounting (fixed since old docs)
- [x] Balance sheet date filter (cumulative as-of-date) — `accounting.ts:187`, `reports.ts:302`
- [x] P&L single-source (journal entries only, no double-count) — `reports.ts:47-124`
- [x] Duplicate COA code 4500 fixed (Exchange Gain 4500 / Commission Income 4550) — `accounts.ts:142-143`
- [x] getAccountById org-scoped — `accounts.ts:346`
- [x] getCurrentOrgId no longer auto-creates orgs — `shared.ts:24-40`
- [x] approveInvoice fully transactional (status + inventory + JE + lines) — `sales.ts:878-1204`
- [x] Manual JE flow: RBAC + balance check + period lock + audit + SQL COUNT — `accounts.ts:231-330`
- [x] generateJournalEntryNumber uses SQL COUNT (not load-all) — `shared.ts:208-223`
- [x] Index migrations present — `migrations/001_add_org_indexes.sql`, `004_add_performance_indexes.sql`
- [x] tsc --noEmit passes (0 errors)

---

## BLOCKERS FOUND IN AUDIT (fix first — see AUDIT_2026-08-20.md)

### P0 — Build & toolchain
- [ ] Build passes (`npm run build`) — currently FAILS: sync exports in "use server" files `tax-filing.ts:19,30` (validateNTN/validateSTRN) and `bank-reconciliation.ts:818` (matchWithPatterns). Move to `src/lib/validation.ts` / utils. **(~2h)**

### P0 — Accounting integrity (financial numbers shown to owners are wrong)
- [ ] Operational JEs post as `status='posted'` (not default `draft`) — `sales.ts:1006`, `purchases.ts:454`, `pos.ts:439`, `banking.ts:359`, etc. Currently approved invoices/POS/expenses are invisible in TB/P&L/BS. **(~8h)**
- [ ] Report status filters exclude `reversed` correctly (use `= 'posted'`) — `accounting.ts:73/137/205`, `reports.ts:78/303/554`. **(~2h)**
- [ ] `updateInvoiceStatus` cannot set `approved` without JE + RBAC — `sales.ts:1273`. **(~2h)**
- [ ] `deleteInvoice` reversal actually fires (write journalEntryId back on approve) — `sales.ts:1390`. **(~2h)**
- [ ] `revisePurchaseInvoice` reversal referenceType + posted status — `purchases.ts:592-720`. **(~3h)**
- [ ] DB-level debits=credits constraint (trigger/check) on journal_entry_lines — `schema.ts:1174-1183`. **(~8h)**
- [ ] POS posts COGS + period lock + transaction — `pos.ts:469-510, 320-570`. **(~10h)**

### P0 — Cross-tenant leaks
- [ ] `portal.ts:11/79` generatePortalToken/generateVendorPortalToken — add auth + org check. **(~2h)**
- [ ] `hr-payroll.ts:890` markPayslipPaid — org-scope + RBAC. **(~1h)**
- [ ] `approvals.ts:160/178/47` approve/reject/deleteWorkflow — org-scope. **(~1h)**
- [ ] `consolidation.ts:60/82` link/unlinkChildOrg — verify child org ownership. **(~1h)**
- [ ] `purchases.ts:1881/1900/2032` vendor payment/settlement — org-scope vendor. **(~2h)**
- [ ] `sales.ts:2481` createDeliveryNote, `:3245/3365` payment/allocate — org-scope. **(~3h)**
- [ ] `pos.ts:421/515` product/customer stock+loyalty — org-scope. **(~2h)**
- [ ] `manufacturing.ts:747/784`, `adjustments.ts:464` — org-scope. **(~2h)**
- [ ] `api/send-invoice-email/route.ts:91` — org-scope invoice update. **(~1h)**
- [ ] `inventory.ts:765` getWarehouseStock, `leaves.ts:375/193`, `accounts.ts:768` — org-scope. **(~3h)**
- [ ] `updateInvoiceStatus` + banking/leave/PO/reconciliation/stock-count RBAC. **(~3h)**

### P1 — Period locking, currency, tax
- [ ] checkPeriodLocked on POS, stock adjustment, depreciation, opening balances, manufacturing, GRN. **(~6h)**
- [ ] Multi-currency: apply exchangeRate in JE, add currency/rate to journalEntries. **(~8h)**
- [ ] Wire `tax_rates` table; server-side POS tax; sales WHT mapping. **(~6h)**
- [ ] easypaisa callback signature verification; fail closed on missing salt. **(~3h)**
- [ ] COGS consistency: snapshot unit cost on invoiceItems; align report. **(~6h)**
- [ ] FIFO valuation direction fix — `inventory-depth.ts:452-507`. **(~4h)**
- [ ] Transaction atomicity: pos.ts, customer payment/settlement, vendor payment, banking balances, payroll, depreciation, manufacturing, onboarding. **(~18h)**

### P2/P3
- [ ] N+1 batch fixes (approveInvoice, payment allocs, getLeads, POS report, payroll). **(~8h)**
- [ ] Lint to zero errors (`react-hooks/set-state-in-effect` etc.). **(~3h)**
- [ ] Coverage baseline (`@vitest/coverage-v8`). **(~1h)**
- [ ] Error logging in `hr-payroll.ts:188/253`. **(~1h)**
- [ ] Money precision → decimal(14,2) consistency; `banking.ts` balance toFixed(2). **(~3h)**
- [ ] Dead code: events skeleton, sentry stub, duplicate functions. **(~4h)**
- [ ] Observability: real Sentry/logger. **(~4h)**

### Testing (P0 financial trust — highest priority after fixes)
- [ ] Regression: approve invoice → posted JE → appears in P&L/BS. **(~4h)**
- [ ] Regression: delete/void invoice → reversed → net-zero. **(~3h)**
- [ ] Multi-tenant isolation tests for every fixed IDOR path. **(~6h)**
- [ ] POS COGS + balance test. **(~3h)**
- [ ] Balance sheet as-of-date / P&L period-bound tests. **(~3h)**
- [ ] Period-lock rejection tests (POS, stock adj, status flip). **(~3h)**

---

## Full sequenced plan
See `docs/PRODUCTION_PLAN_2026-08-20.md` — Waves 0-6 with file references and hour estimates (~163h total).

## Milestone checkpoints
1. **Wave 0 (0.5d):** `npm run build` green.
2. **Wave 1 (3-4d):** all IDOR paths org-scoped; isolation tests pass.
3. **Wave 2 (6-7d):** approved invoices visible & balanced in P&L/BS; DB balance constraint active; POS posts COGS.
4. **Wave 3 (2d):** no non-transactional financial write remains.
5. **Wave 4 (2-3d):** locked periods reject all writes; FX + tax correct; webhooks verified.
6. **Wave 5-6 (2-3d):** performance batch queries; lint clean; observability live.