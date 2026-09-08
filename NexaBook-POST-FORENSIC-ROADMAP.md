# NexaBook — Post-Forensic Recovery & Product Roadmap

## Objective
Existing NexaBook ko rebuild kiye baghair financial-safe, secure, testable aur production-ready Accounting + Invoicing + Billing + ERP SaaS banana.

## Current Status
- ERP feature scope: 9/10
- Accounting architecture: 7.5/10
- Invoicing/Billing: 8/10
- Inventory: 7/10
- Security/Multi-tenancy: 6/10
- Financial correctness: 5.5/10
- Production readiness: 5.5/10
- QuickBooks/Splendid Accounts replacement readiness: ~6/10

## Strategy
**Feature Freeze → Financial Core Repair → Tenant/Security Hardening → Inventory/Tax/Payroll correctness → Testing → UX/Reports → Integrations → AI → Production Launch**

## P0 Priority
1. Central Accounting Posting Engine.
2. Invoice payment → Cash/Bank JE.
3. Customer balance and AR reconciliation.
4. Customer/Vendor settlements → real JEs.
5. Sales/Purchase return accounting reversals.
6. GRN vs Purchase Invoice stock double-posting prevention.
7. Stock Count and Stock Adjustment accounting correctness.
8. Posted Journal Entry immutability.
9. Atomic document/journal numbering.
10. Tenant ownership checks on every financial query/mutation.
11. Mandatory Zod/server validation.
12. Idempotency for financial mutations and webhooks.
13. Remove predictable/default encryption secrets.
14. Payroll posting must always satisfy Debit == Credit.

## Phase 0 — Baseline
- Feature freeze.
- Create `pre-financial-hardening` tag.
- Verify production backup/restore.
- Establish reproducible `npm ci`, lint, typecheck, test and build.
- Create isolated test DB and financial seed data.
- Add baseline financial invariants.

## Phase 1 — Financial Core
Create one authoritative posting layer:
```text
src/lib/accounting/
  posting/posting-engine.ts
  posting/journal-builder.ts
  posting/reversal-service.ts
  posting/period-service.ts
  posting/validation.ts
  subledgers/ar.ts
  subledgers/ap.ts
  subledgers/inventory.ts
  subledgers/tax.ts
  subledgers/cash.ts
```
Core operations: `postTransaction()`, `reverseTransaction()`, `validateJournal()`, `assertOpenPeriod()`, `assertTenantOwnership()`.

Rules: every monetary mutation is transactional; every journal balances; posted entries are immutable; corrections use linked reversals; money uses decimal-safe arithmetic.

## Phase 2 — Sales & AR
Fix invoice received amounts, partial/full/over payments, allocations, credit/debit notes, sales returns, cancellation/reversal, opening balances, statements and AR aging.

Golden scenario:
```text
Invoice 1000
Payment 300
Payment 700
Balance = 0
AR = 0
Cash/Bank = 1000
Revenue = 1000
```

## Phase 3 — Purchases & AP
Fix vendor balance revision/reset, purchase reversal, purchase returns, input-tax reversal, vendor payments, allocations, opening payables and AP aging.

Clearly separate GRN inventory events from Purchase Bill accounting. Prevent duplicate stock posting when a bill references a GRN.

## Phase 4 — Inventory
Fix UOM conversion, COGS base quantity, FIFO/weighted-average costing, stock approval, stock count, transfers, batch/expiry, serials, warehouse isolation, negative stock, historical cost and return costing.

Invariant:
```text
Opening Stock + Purchases + Adjustments In + Transfers In
- Sales - Returns Out - Adjustments Out - Transfers Out
= Current Stock
```
Inventory subledger must reconcile to Inventory GL.

## Phase 5 — Tax & Pakistan Compliance
Centralize tax logic under `src/lib/tax/`. Cover sales tax, input tax, WHT, FBR, SRB, PRA, KPRA and BRA. Test inclusive/exclusive, exempt/zero-rated, withholding, returns, notes, partial payments and rounding. Keep simulation separate from production compliance.

## Phase 6 — Payroll & Fixed Assets
Payroll must post through the accounting engine and always balance after PF, leave, tax and other deductions. Fixed assets require acquisition, capitalization, depreciation, disposal, impairment, accumulated depreciation, gain/loss and GL reconciliation.

## Phase 7 — Banking & Reconciliation
Implement safe bank-feed lifecycle, duplicate detection, idempotency, reconciliation differences, opening balances, outstanding items, statement validation and bank-to-GL reconciliation.

## Phase 8 — Multi-Tenant Security
Create shared server helpers such as `requireOrgContext()`, `requireOrgRecord()` and `assertSameOrganization()`. Audit all customers, vendors, accounts, products, warehouses, invoices, bills, payments, journals, banks, files, reports, AI tools and webhooks. Never trust client-supplied org IDs.

## Phase 9 — Validation & Idempotency
Pipeline:
```text
Input → Zod → Auth → Tenant Authorization → Business Validation → DB Transaction → Audit Log
```
Add idempotency to invoice posting, payments, webhooks, bank imports, recurring invoices, FBR submissions and external callbacks.

## Phase 10 — Reporting Reconciliation
Guarantee:
```text
Trial Balance: Total Debit = Total Credit
Balance Sheet: Assets = Liabilities + Equity
P&L: Revenue - Expenses = Net Income
AR subledger = AR control GL
AP subledger = AP control GL
Inventory subledger = Inventory GL
Tax subledger = Tax GL
Bank subledger = Bank GL
```
Build automated reconciliation jobs/tests.

## Phase 11 — Testing
Expand unit, integration, invariant and E2E tests. Critical invariants include balanced journals, impossible cross-tenant access, reversal net-zero effect, payment allocation <= payment, and stock ledger = stock balance.

E2E journeys:
```text
Signup → Organization → COA → Product → Customer → Invoice → Payment → Reports
Vendor → PO → GRN → Bill → Payment → AP → Inventory
```

## Phase 12 — Data Repair
Create dry-run reconciliation tooling for invoice/customer/vendor balance mismatches, AR/AP/Inventory/Tax GL mismatches, duplicate/orphan/unbalanced journals, missing reversals, invalid tenant ownership and duplicate document numbers. Never silently mutate production data.

## Phase 13 — UX & Reports
After financial correctness: dashboard KPIs, professional invoices, QR/payment links, customer portal, email/WhatsApp, recurring billing, report filters and PDF/Excel/CSV exports.

## Phase 14 — Production Hardening
Staging/production separation, managed PostgreSQL, pooling, backups, PITR, monitoring, error tracking, structured logs, rate limits, queues and cron monitoring. Required secrets must fail closed. Webhooks require signature verification, idempotency, replay protection, safe URL handling and retries/dead-letter handling.

## Phase 15 — Payments
For Stripe/JazzCash/Easypaisa:
```text
Initiated → Provider → Verified Callback/Webhook → Idempotency → Payment → Accounting Posting → Audit Log
```
Never trust client amount/status/org or unsigned callbacks.

## Phase 16 — AI/NexaBot
AI is not the accounting authority:
```text
User → AI → Intent → Controlled Tool → Authorization → Validation → Accounting Engine → DB
```
AI may suggest categorization, reconciliation, OCR, anomalies and forecasts, but cannot bypass posting controls.

## Phase 17 — Manufacturing / CRM / Projects
Only after the financial core is stable. Add WIP, COGM, production variance, project costing/profitability and CRM-to-invoice lifecycle with proper accounting integration.

## Phase 18 — Production Certification Gate
### Accounting
- [ ] Journals balanced
- [ ] AR = GL
- [ ] AP = GL
- [ ] Inventory = GL
- [ ] Tax = GL
- [ ] Bank = GL
- [ ] Payroll = GL
- [ ] Fixed assets = GL

### Security
- [ ] Cross-tenant tests pass
- [ ] RBAC tests pass
- [ ] IDOR tests pass
- [ ] Webhook security passes
- [ ] Secret validation passes

### Reliability
- [ ] Duplicate posting impossible
- [ ] Concurrency tested
- [ ] Retries idempotent
- [ ] Rollback tested
- [ ] Backup restore verified

## Recommended OpenCode Workflow
Do **not** use one giant “fix all bugs” prompt. For every phase:
```text
READ → AUDIT → PLAN → IMPLEMENT → TEST → REVIEW → FIX → COMMIT
```
Every phase must report changed files, DB changes, accounting impact, security impact, tests added/passed, known limitations and commit hash.

## Milestones
- **A — Financial Safe:** P0 defects fixed (~2–4 weeks)
- **B — Accounting Correct:** AR/AP/Inventory/Tax/Payroll/Assets reconciled (~4–8 weeks)
- **C — Secure SaaS:** tenant/RBAC/webhook/secrets/idempotency (~2–4 weeks)
- **D — Production Beta:** E2E, monitoring, backups, staging (~2–4 weeks)
- **E — Commercial Product:** UX, integrations, reports, portals, AI, onboarding, billing (~4–8+ weeks)

## Definition of Done
NexaBook is production-ready when every monetary mutation has a correct accounting treatment, every journal balances, posted transactions are immutable, reversals are linked, all subledgers reconcile to GL, cross-tenant access is impossible, financial actions are validated/server-authorized, duplicate requests cannot duplicate money, backups restore successfully, full financial E2E journeys pass, production tax integrations are real, and reports reconcile independently to ledger data.

## Final Recommendation
**NexaBook ko rebuild mat karo.** Existing ERP surface area strong hai. Ab “More Features” se pehle **Financial Correctness First** follow karo. P0/P1 financial and security defects eliminate karo, reconciliation/testing/production hardening complete karo, phir UX, integrations aur AI mature karo.
