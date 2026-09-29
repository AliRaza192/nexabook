# NEXABOOK FULL CODEBASE AUDIT REPORT

**Audit scope:** 338 source files, 22 spec files, 7 skills
**Audit method:** File-by-file verification against actual code, schema, and installed packages
**Audit date:** 2026-09-19

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 14 | Data corruption, cross-tenant data breach, financial misstatement |
| **HIGH** | 37 | Missing authorization, broken JEs, TOCTOU races, missing transactions |
| **MEDIUM** | 48 | Float arithmetic, N+1 queries, missing validations, inconsistent patterns |
| **LOW** | 20+ | Code quality, `as any` casts, information leakage |

**Infrastructure is solid.** The prior review fixed the neon-serverless driver, centralized document numbering, and the posting engine. The schema has proper unique constraints on all document-number columns. `postTransaction()` is well-designed. The problem is that **several modules bypass the posting engine entirely**, and **most mutations lack `requireRole()` checks**.

---

## DOMAIN 1: ACCOUNTING / FINANCIAL CORRECTNESS

### 1.1 Bypassed Posting Engine (Hand-Rolled JEs)

**CRITICAL** — Multiple modules create journal entries by hand instead of using `postTransaction()`. This bypasses:
- Atomic entry-number generation
- Customer/vendor balance synchronization (AR/AP detection in posting-engine.ts:86-123)
- Consistent sourceType/createdBy fields

| File:Line | Function | Impact |
|-----------|----------|--------|
| `purchases.ts:341` | `createJournalEntry` | Vendor balance never updated |
| `purchases.ts:496` | `postOpeningBalance` | Customer/vendor balance never updated |
| `purchases.ts:615` | `bulkImportOpeningBalances` | No audit log, no balance sync |
| `purchases.ts:1282` | `createVoucher` | No balance sync |
| `accounts.ts:291` | `createJournalEntry` | Same as purchases (DRY violation — identical code) |
| `accounts.ts:469` | `postOpeningBalance` | Same |
| `accounts.ts:612` | `bulkImportOpeningBalances` | Same |
| `accounts.ts:1275` | `createVoucher` | Same |

### 1.2 Client-Supplied Totals Trusted Without Recomputation

**CRITICAL** — `createInvoice` in `sales.ts:790-798` stores `grossAmount`, `discountAmount`, `taxAmount`, `netAmount` directly from the client payload. A malicious client can submit arbitrary totals that don't match line item math. Revenue recognition, tax liability, and AR are all derived from these unverified values.

| File:Line | Field | Risk |
|-----------|-------|------|
| `sales.ts:790` | `grossAmount: data.grossAmount` | Revenue over/understatement |
| `sales.ts:795` | `taxAmount: data.taxAmount` | Tax liability miscalculation |
| `sales.ts:798` | `netAmount: data.netAmount` | AR balance wrong |
| `sales.ts:819` | `lineTotal: item.lineTotal` | Per-line totals unverified |
| `payments/initiate/route.ts:34` | `amount` from client | Payment amount manipulation |
| `api/portal-pay/route.ts:48` | `amount: data.amount` | **Customer can pay Rs. 1 instead of Rs. 50,000** |

### 1.3 Payroll JE Always Crashes

**CRITICAL** — `hr-payroll.ts:generateAndApprovePayroll` constructs a JE where:
- Debits: `totalGross`
- Credits: `totalNet + totalEobi + totalIncomeTax`
- `totalNet = totalGross - eobi - incomeTax - PF - unpaidLeaveDeduction`
- So credits = `totalGross - PF - unpaidLeaveDeduction`

**The JE is always short by `PF + unpaidLeaveDeduction`.** When any employee has PF deductions or unpaid leave, `postTransaction` (which validates balance) throws a runtime error, making `generateAndApprovePayroll` always fail.

### 1.4 Payroll Payment Never Creates JE

**CRITICAL** — `hr-payroll.ts:markPayslipPaid` (line 904-926) marks payslips as paid and inserts an audit log, but **never creates a journal entry** to settle the payroll liability. The GL permanently shows unpaid payroll. Every other payment function in the codebase (sales payments, purchase payments) creates a JE — payroll is the exception.

### 1.5 Manufacturing JEs Are Wash Entries

**CRITICAL** — `manufacturing.ts:completeJobOrder` (line 597-644) and `disassembleFinishedGood` (line 792-823) construct JEs where every debit and credit line hits the **same inventory GL account**. The entries balance mathematically but are accounting no-ops — no WIP, COGS, or separate raw materials account is touched. Financial reports derived from the GL will be meaningless for manufactured goods.

### 1.6 POS Shift Open/Close GL Errors

**CRITICAL** — `pos.ts:startShift` (line 124) credits `Owner's Equity (capital)` for the float amount. A POS float is a transfer between cash accounts, not a capital contribution. This inflates equity by the sum of every shift's opening amount across all time.

**CRITICAL** — `pos.ts:endShift` (line 210-221) creates a JE with **all-zero lines** — technically balanced but meaningless. The float is never returned to the GL cash balance. It sits as a phantom asset forever.

### 1.7 Float Arithmetic on Monetary Values

**HIGH** — Despite AGENTS.md mandating "Decimal for money. Never use floats for currency," `parseFloat()` is used pervasively:

| File | Occurrences | Risk |
|------|-------------|------|
| `purchases.ts` | 20+ (lines 302, 474, 601, 846, 934, 977, 1105, 1270) | Running balances drift |
| `banking.ts` | 10+ (lines 108, 501, 576, 902) | Balance comparison imprecision |
| `manufacturing.ts` | Lines 207, 550 | BOM costing errors |
| `accounts.ts` | Lines 440, 846 | Ledger report drift |
| `hr-payroll.ts` | Lines 571-601 | Payroll calculation errors |
| `pos.ts` | Line 499 | Loyalty point calculation |

### 1.8 Missing Warehouse/Batch Stock Reversal on Sales Returns

**CRITICAL** — `sales.ts:approveSalesReturn` (line 3016-3036) only updates `products.currentStock` directly. It never calls `updateWarehouseStock()` or `updateBatchStock()`. Warehouse-level and batch-level stock records will permanently diverge from the product-level stock.

### 1.9 Consolidated Reports Include Draft JEs

**HIGH** — `consolidation.ts:getConsolidatedPandL` (line 173) and `getConsolidatedBalanceSheet` (line 260) do not filter `journalEntries.status = 'posted'`. Draft, voided, or reversed entries are included in consolidated financial statements.

### 1.10 Balance Sheet `Math.abs` on Liabilities

**HIGH** — `consolidation.ts:getConsolidatedBalanceSheet` (line 276-277) takes `Math.abs(balance)` for all account types. For liabilities and equity, the normal balance is credit-side, so `debit - credit` would be negative. Taking `Math.abs` masks this and inflates liability/equity totals, producing an unbalanced accounting equation.

### 1.11 Bank-to-Bank Transfer Wash Entry

**HIGH** — `banking.ts:addFundsTransfer` (line 595-608) posts both debit and credit to the same generic "bank" COA account. The sub-ledger (`bankAccounts.currentBalance`) is updated correctly per-account, but the GL shows inflated activity with zero net effect for inter-bank transfers. Financial reports from the GL will be wrong.

### 1.12 Non-Atomic Bank Balance + Approval

**HIGH** — `adjustments.ts:approveMiscContactSettlement` (line 435-482) modifies `bankAccounts.currentBalance` and approval status without a transaction. Partial failure = permanent data corruption.

### 1.13 No Opening Stock Journal Entry

**HIGH** — `inventory.ts:248-253` — Products with opening stock create no Inventory Asset / Opening Balance Equity journal entry. The GL is out of sync from day one.

---

## DOMAIN 2: SECURITY / MULTI-TENANCY

### 2.1 Cross-Tenant Data Breach Vectors

| File:Line | Function | Issue | Severity |
|-----------|----------|-------|----------|
| `leaves.ts:279` | `approveLeaveApplication` | UPDATE WHERE `eq(id)` **omits orgId** — any user can approve leave in any org | CRITICAL |
| `leaves.ts:327` | `rejectLeaveApplication` | Same — cross-tenant rejection possible | CRITICAL |
| `invoice-ocr.ts:190` | `saveExtractedInvoice` | Accepts `orgId` as parameter — inject purchase invoices into any org | CRITICAL |
| `consolidation.ts:118` | `getAvailableOrgsForConsolidation` | Returns ALL organizations without parent — leaks other tenants' org names | HIGH |
| `accounts.ts:807` | `getLedgerReport` | Account query missing `orgId` filter — any user can read any account's ledger | HIGH |
| `manufacturing.ts:648` | `completeJobOrder` final update | Missing `orgId` on final status update | HIGH |

### 2.2 Missing `requireRole()` on Financial Mutations

The following functions perform financial writes, approvals, or destructive deletes but have no role check:

| File | Function(s) | Severity |
|------|-------------|----------|
| `sales.ts` | `createInvoice`, `createSaleOrder`, `approveSaleOrder`, `allocatePayment`, `createSalesReturn`, `duplicateInvoice`, `createRecurringInvoice` | HIGH |
| `banking.ts` | `addBankDeposit`, `addFundsTransfer`, `addMiscContact` | HIGH |
| `bank-reconciliation.ts` | `finalizeReconciliation`, `saveMatchResult`, `undoReconciliation`, `deleteBankStatement` | CRITICAL |
| `bank-feeds.ts` | `createBankConnection`, `deleteBankConnection`, `syncBankTransactions` | HIGH |
| `leaves.ts` | `approveLeaveApplication`, `rejectLeaveApplication`, `createLeaveType`, `createLeaveApplication` | CRITICAL |
| `inventory-depth.ts` | `addStockMovement`, `addStockAdjustment`, `approveStockAdjustment` | HIGH |
| `stock-count.ts` | `completeStockCount` (creates GL entries) | HIGH |
| `exchange-rates.ts` | `createExchangeRate` | HIGH |
| `hr-payroll.ts` | `generateAndApprovePayroll` (implicitly, via `requireRole` not present) | HIGH |
| `crm.ts` | `createLead`, `updateLead`, `createTicket`, `updateTicket`, `createCrmEvent` | MEDIUM |
| `accounts.ts` | `seedInitialCOA` | MEDIUM |
| `price-lists.ts` | `createPriceList` | MEDIUM |
| `cost-centers.ts` | `createCostCenter`, `updateCostCenter` | MEDIUM |
| `budget.ts` | `setBudget` | MEDIUM |
| `consolidation.ts` | `linkChildOrg`, `unlinkChildOrg` | HIGH |
| `tax-returns.ts` | `submitTaxReturn`, `deleteTaxReturn` | MEDIUM |
| `pos.ts` | All functions (no role checks at all) | LOW |

### 2.3 Middleware Security Issues

| File:Line | Issue | Severity |
|-----------|-------|----------|
| `middleware.ts:40-43` | Rate limiting keyed on `x-forwarded-for` — spoofable via header rotation | CRITICAL |
| `middleware.ts:47` | Rate limit params (`maxRequests`, `windowMs`) are ignored — hardcoded to 60 req/min | CRITICAL |
| `middleware.ts:9` | `/portal(.*)` is public — no auth at middleware level | CRITICAL |
| `middleware.ts:56-64` | CSRF comparison uses `!==` not `crypto.timingSafeEqual()` — timing attack | HIGH |
| `middleware.ts:56-64` | No SameSite/Secure/HttpOnly attributes on CSRF cookie | HIGH |
| `middleware.ts:9-14` | Overly broad exemptions: `/api/webhooks(.*)`, `/api/payments(.*)`, `/api/cron(.*)` | HIGH |
| `middleware.ts:15` | `/api/csrf` is public — unauthenticated user can request CSRF tokens | HIGH |

### 2.4 Portal Payment — No Server-Side Amount Validation

**CRITICAL** — `api/portal-pay/route.ts:48` stores `amount: data.amount` directly from the client. A customer can initiate payment for Rs. 1 instead of their actual invoice balance. The gateway redirect charges the wrong amount.

### 2.5 Payment Initiate — No Amount Validation

**HIGH** — `api/payments/initiate/route.ts:34` uses `amount` from client without verifying it matches the invoice's `netAmount`. A malicious user can pay a fraction of the invoice.

### 2.6 Open Redirect via returnOrigin

**MEDIUM** — `api/payments/callback/route.ts:19` — `returnOrigin` only checks `startsWith("/")`, allowing `//evil.com` which browsers interpret as protocol-relative URL.

### 2.7 WhatsApp Number Abuse

**MEDIUM** — `api/send-invoice-whatsapp/route.ts:22` — `phoneNumber` from client is passed directly to WhatsApp API. No validation that the phone belongs to the customer on the invoice. A user can send WhatsApp messages to arbitrary numbers.

### 2.8 Webhook Secret Leaked in Response

**MEDIUM** — `api/webhooks/route.ts:75` — The `secret` field (signing secret) is returned in the response after creation. Should be shown once or never.

### 2.9 Invoice Files Saved to Public Directory

**MEDIUM** — `invoice-ocr.ts:81` — Uploaded invoice files are saved to `public/uploads/invoices/` — publicly accessible without authentication.

---

## DOMAIN 3: CODE QUALITY

### 3.1 Document Number Generators — Five Custom Implementations

**MEDIUM** — `sales.ts` has five custom generators (`generateDeliveryNumber`, `generateRecurringInvoiceNumber`, `generateSalesReturnNumber`, `generatePaymentNumber`, `generateSettlementNumber`) with their own retry+jitter logic, bypassing the centralized `generateDocumentNumber()` in `shared.ts`.

### 3.2 Non-Atomic Deletion Sequences

| File:Line | Function | Issue |
|-----------|----------|-------|
| `sales.ts:1389` | `deleteInvoice` (draft/pending) | Two separate deletes without transaction |
| `sales.ts:2251` | `deleteQuotation` | Same |
| `sales.ts:2718` | `deleteRecurringInvoice` | Same |
| `manufacturing.ts:693` | `deleteJobOrder` | FK violation likely (no cascade) |

### 3.3 N+1 Queries

| File:Line | Function | Description |
|-----------|----------|-------------|
| `sales.ts:3017` | `approveSalesReturn` | Per-row product stock read/update in loop |
| `sales.ts:3285` | `createCustomerPayment` | Per-allocation invoice fetch in loop |
| `pos.ts:375` | `processPosSale` | Per-item product read + update (2×N queries) |
| `manufacturing.ts:577` | `completeJobOrder` | Per-component stock deduction in loop |
| `manufacturing.ts:783` | `disassembleFinishedGood` | Same |
| `manufacturing.ts:870` | `explodeBOM` | Recursive per-item sub-BOM lookup |
| `accounts.ts:291` | `createJournalEntry` | Per-line account validation |
| `accounts.ts:550` | `bulkImportOpeningBalances` | Per-row account code resolution |
| `budget.ts:103` | `getBudgetVsActual` | Per-account chart lookup |
| `leaves.ts:373` | `getLeaveBalance` | Per-leave-type balance query |
| `inventory-depth.ts:460` | `runStockValuation` | Per-product valuation query |
| `stock-count.ts:152` | `createStockCount` | Per-product stock query |
| `barcodes.ts:43` | `getBarcodePrintData` | Per-product serial query |

### 3.4 Divide-by-Zero

| File:Line | Function | Issue |
|-----------|----------|-------|
| `manufacturing.ts:465` | `createJobOrder` | `multiplier = data.quantityToProduce / bom.quantity` — no guard if `bom.quantity = 0` |
| `manufacturing.ts:762` | `disassembleFinishedGood` | Same |

### 3.5 `as any` Type Casts

Found in: `purchases.ts:243`, `bank-feeds.ts:114,198,213`, `projects.ts:23,117,191,224-225`, `reports.ts:2772`, `chat/route.ts:205,281`, `banking.ts:861`

### 3.6 DRY Violations

| Pattern | Files | Issue |
|---------|-------|-------|
| `getTaxSummary` | `accounts.ts`, `purchases.ts` | Identical code in two files |
| `createJournalEntry` | `accounts.ts`, `purchases.ts` | Same function duplicated |
| `postOpeningBalance` | `accounts.ts`, `purchases.ts` | Same function duplicated |

### 3.7 Dead Code

| File:Line | Function | Issue |
|-----------|----------|-------|
| `sales.ts:1458` | `createInvoiceJournalEntry` | Marked deprecated but still exported. Does not create a JE — only an audit log. Misleading. |
| `accounts.ts:459-466` | Auto-balance in `postOpeningBalance` | Dead code: the function already returns error if `Math.abs(diff) > 0.01` at line 440, so the auto-balance block can never execute. |
| `manufacturing.ts:602-624` | `totalRawMaterialCost` | Accumulated in loop only to compute variance posted to same account — serves no purpose until single-account JE is fixed. |

### 3.8 `onConflictDoUpdate` Without Matching Unique Constraint

No remaining instances found. The prior review fixed these. Verified against schema unique indexes.

### 3.9 Document Number `COUNT(*)` Generators

No remaining instances found. The centralized `generateDocumentNumber()` and `generateJournalEntryNumber()` in `shared.ts` both parse the last actual number. Verified.

### 3.10 Floating-Point Money Math (Summary)

`parseFloat()` is used in **every financial module**. This is a system-wide architectural debt. Per AGENTS.md: "Decimal for money. All monetary columns use decimal(14,2). Never use floats for currency." The most dangerous occurrences:

- **Ledger running balances** (`purchases.ts:846`, `accounts.ts:846`) — accumulate float error over hundreds of transactions
- **Payroll calculations** (`hr-payroll.ts:571-601`) — tax slabs and deductions computed in float
- **POS loyalty points** (`pos.ts:499`) — float division causes off-by-one
- **Recurring invoice amounts** (`cron/recurring-invoices/route.ts:64`) — float multiplication on line totals

---

## DOMAIN 4: TEST SUITE COVERAGE GAPS

### 4.1 Mocked DB Tests Cannot Verify Critical Invariants

| Test File | Mocked? | What It Cannot Verify |
|-----------|---------|----------------------|
| `sales.test.ts` | YES | orgId filtering in WHERE clauses, JE balance, decimal precision |
| `purchases.test.ts` | YES | Same — vendor balance sync, entry number uniqueness |
| `hr-payroll.test.ts` | YES | JE balance (always crashes in real code), tax slab math |
| `manufacturing.test.ts` | YES | Stock atomicity, BOM validation, component deduction |
| `pos.test.ts` | YES | Shift GL entries, stock deduction, walk-in customer race |
| `portal.test.ts` | YES | Token validation, cross-org isolation |
| `approvals.test.ts` | YES | Role enforcement, audit logging |
| `consolidation.test.ts` | YES | Posted-only filtering, balance sheet abs() |

### 4.2 Specific False-Confidence Risks

| Risk | Why Mocked Tests Pass But Real Code Fails |
|------|-------------------------------------------|
| orgId isolation | Mock returns whatever `.mockResolvedValue` is set — never inspects WHERE clause args |
| JE balance | Mock `insert().returning()` returns preset values — no actual balance validation |
| Unique constraints | Mock doesn't enforce unique indexes — duplicate document numbers succeed silently |
| Transaction rollback | Mock `db.transaction` always resolves — never tests partial failure rollback |
| Decimal rounding | Mock returns strings — no PostgreSQL `decimal(14,2)` truncation tested |

### 4.3 Integration Test Coverage

Only `posting-engine.test.ts` uses PGlite with real DB. It tests:
- ✅ Balanced JE insertion
- ✅ Entry number generation
- ✅ Reversal flow
- ✅ orgId isolation

This is the **gold standard**. All other test files should be migrated to this pattern for financial-write paths.

---

## DOMAIN 5: DESIGN / UI / UX

Audit scope was limited to server-side code. No UI component audit was performed in this pass. Key items for a future UI audit:
- Verify semantic color tokens (success=green, warning=amber, info=blue, destructive=red)
- Check `tabular-nums` on financial figures
- Confirm loading/empty states on all list pages
- Verify confirmation prompts before destructive financial actions
- Check responsive behavior

---

## SCHEMA OBSERVATIONS

### Strengths (Verified)
- ✅ `orgId` column present on every table except `organizations` itself (correct)
- ✅ Unique constraints on all document number columns (invoices, orders, quotations, POs, bills, GRNs, payments, settlements, deposits, transfers, misc contacts, PDC instruments, stock adjustments, stock counts, credit/debit notes, tax returns)
- ✅ `unique_org_sku` on products, `unique_org_name` on categories
- ✅ `portalToken` unique on both customers and vendors
- ✅ FK relationships properly defined with `.references()`
- ✅ `decimal(14,2)` or `decimal(12,2)` on all monetary columns
- ✅ Enum types for all status fields

### Weaknesses
- ❌ No unique constraint on `(orgId, subType)` in `chartOfAccounts` — `resolveAccount()` returns arbitrary row when duplicates exist
- ❌ No unique constraint on `(orgId, employeeCode)` — only `.unique()` on global level (schema:767)
- ❌ No unique constraint on `(orgId, accountNumber)` in `bankAccounts`
- ❌ No unique constraint on `(orgId, name)` in `customers` for walk-in dedup
- ❌ No unique constraint on `(orgId, month, year)` in `payrollRuns` — concurrent duplicate runs possible
- ❌ `chartOfAccounts.subType` has no unique constraint — the prior fix seeded unique subTypes but nothing prevents app code from inserting duplicates
- ❌ `fiscalPeriods` has no unique constraint on `(orgId, startDate, endDate)` — duplicate periods possible

---

## INFRASTRUCTURE VERIFICATION

| Component | Status | Notes |
|-----------|--------|-------|
| DB Driver | ✅ Solid | `@neondatabase/serverless` with WebSocket Pool. Supports `db.transaction()`. |
| Posting Engine | ✅ Solid | `postTransaction()` validates balance, generates entry numbers atomically, syncs AR/AP balances. |
| Document Numbering | ✅ Solid | `generateDocumentNumber()` parses last number, retry loop, DB unique constraint as backstop. |
| Schema Constraints | ✅ Solid | All document tables have unique constraints. |
| Clerk Auth | ✅ Solid | Middleware enforces auth on protected routes. |
| Rate Limiting | ⚠️ Broken | IP-based key is spoofable; params ignored. |
| CSRF | ⚠️ Weak | Timing-unsafe comparison; no cookie security attributes. |

---

## PRIORITIZED FIX ORDER

### Tier 1 — Fix Before Any Production Traffic (CRITICAL)

| # | Finding | File | Impact |
|---|---------|------|--------|
| 1 | Client-supplied invoice totals trusted | `sales.ts:790-819` | Revenue/tax/AR can be arbitrary |
| 2 | Portal payment amount not validated | `api/portal-pay/route.ts:48` | Customer pays Rs. 1 for Rs. 50K invoice |
| 3 | Payment initiate amount not validated | `api/payments/initiate/route.ts:34` | Fractional payment for full invoice |
| 4 | Leave approve/reject missing orgId | `leaves.ts:279,327` | Cross-tenant data modification |
| 5 | Invoice OCR accepts orgId param | `invoice-ocr.ts:190` | Cross-tenant invoice injection |
| 6 | Rate limiting spoofable | `middleware.ts:40-43` | All rate limiting useless |
| 7 | Rate limit params ignored | `middleware.ts:47` | Misleading configuration |
| 8 | Portal public without auth | `middleware.ts:9` | Unauthenticated portal surface |
| 9 | Payroll JE always crashes | `hr-payroll.ts:761-797` | Payroll processing broken |
| 10 | Payroll payment missing JE | `hr-payroll.ts:904-926` | GL permanently shows unpaid payroll |
| 11 | POS shift opening inflates equity | `pos.ts:124` | Equity overstated permanently |
| 12 | POS shift closing is no-op | `pos.ts:210-221` | Float never returned to GL |
| 13 | Manufacturing JEs are wash entries | `manufacturing.ts:597-644,792-823` | GL meaningless for manufactured goods |
| 14 | Sales return missing warehouse/batch stock | `sales.ts:3016-3036` | Warehouse stock permanently diverges |

### Tier 2 — Fix Before Beta (HIGH)

| # | Finding | File |
|---|---------|------|
| 15 | Hand-rolled JEs bypass posting engine | `purchases.ts` (4 functions), `accounts.ts` (4 functions) |
| 16 | CSRF timing attack | `middleware.ts:56-64` |
| 17 | Missing requireRole on 30+ financial mutations | See Section 2.2 |
| 18 | Consolidated reports include draft JEs | `consolidation.ts:173,260` |
| 19 | Balance sheet Math.abs on liabilities | `consolidation.ts:276` |
| 20 | getAvailableOrgs leaks all orgs | `consolidation.ts:118` |
| 21 | getLedgerReport missing orgId | `accounts.ts:807` |
| 22 | deleteInvoice not atomic | `sales.ts:1389` |
| 23 | deleteQuotation not atomic | `sales.ts:2251` |
| 24 | deleteRecurringInvoice not atomic | `sales.ts:2718` |
| 25 | Delete journal entry race condition | `purchases.ts:1416` |
| 26 | Bank-to-bank transfer wash entry | `banking.ts:595-608` |
| 27 | Float arithmetic everywhere | See Section 1.7 |
| 28 | Recurring invoice cron no transaction | `api/cron/recurring-invoices/route.ts:40-59` |
| 29 | Bank reconciliation missing requireRole (4 functions) | `bank-reconciliation.ts` |
| 30 | Tax return race condition | `tax-returns.ts:38-103` |
| 31 | Cost center delete orphan JEs | `cost-centers.ts:96-112` |
| 32 | Non-atomic bank balance + approval | `adjustments.ts:435-482` |
| 33 | No opening stock JE | `inventory.ts:248-253` |

### Tier 3 — Fix Before GA (MEDIUM)

| # | Finding | File |
|---|---------|------|
| 34 | Float running balances in ledger reports | `purchases.ts:846`, `accounts.ts:846` |
| 35 | N+1 queries (13 instances) | See Section 3.3 |
| 36 | Divide-by-zero in manufacturing | `manufacturing.ts:465,762` |
| 37 | Five custom document number generators | `sales.ts` |
| 38 | Dead code in postOpeningBalance | `accounts.ts:459-466` |
| 39 | DRY violations (tax summary, journal entry, opening balance) | `accounts.ts` + `purchases.ts` |
| 40 | Missing role checks on CRM, cost centers, budgets, etc. | See Section 2.2 |
| 41 | Fiscal year hardcoded to calendar year | `cost-centers.ts:120`, `budget.ts:48` |
| 42 | Invoice payment reminders not deduplicated | `api/cron/payment-reminders/route.ts:71` |
| 43 | All paid sales classified as cash in POS report | `pos.ts:805-808` |
| 44 | POS report doesn't filter by cashier | `pos.ts:737-745` |
| 45 | POS Z-report can double-close shift | `pos.ts:863-897` |
| 46 | Webhook secret returned in response | `api/webhooks/route.ts:75` |
| 47 | Invoice files saved to public directory | `invoice-ocr.ts:81` |
| 48 | CSV injection in payroll export | `hr-payroll.ts` |
| 49 | Open redirect via returnOrigin | `api/payments/callback/route.ts:19` |
| 50 | Tax return inconsistent status casing | `tax-returns.ts:58,78` |
| 51 | `as any` type casts | See Section 3.5 |

---

## BOTTOM LINE

The infrastructure (driver, schema, posting engine, numbering) is solid after the prior review. The remaining issues are:

1. **Several critical financial modules bypass the posting engine entirely** (purchases, accounts, manufacturing, POS, payroll) — creating unbalanced, missing, or meaningless journal entries
2. **Most mutation functions lack `requireRole()`** — any authenticated org member can perform financial writes, approvals, and destructive deletes
3. **Middleware security is broken** — rate limiting is spoofable, CSRF is timing-attackable, portal is unauthenticated
4. **Client-supplied financial totals are trusted** — invoices, payments, and portal payments accept amounts from the client without server-side recomputation
5. **Test suite provides false confidence** — all action tests mock the DB, so they cannot verify orgId isolation, JE balance, constraint enforcement, or transaction atomicity
