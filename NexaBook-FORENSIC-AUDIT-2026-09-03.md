# NexaBook — 0→100% Forensic Code Audit

**Audit date:** 2026-09-03  
**Artifact audited:** `nexabook-latest.zip`  
**Audit type:** source-level forensic review of architecture, database, server actions, API routes, accounting logic, inventory, security/multi-tenancy, RBAC, payments, tax, payroll, reports, tests, migrations and operational hardening.

> **Important verification note:** The ZIP was fully extracted. All 333 first-party `.ts/.tsx` source files under `src/` were read in full (91,876 source lines / ~3.56 MB). The audit also inspected the DB schema, migrations, API routes, configuration and tests. Runtime test/build execution could not be completed because the extracted project did not contain its normal dependency installation; two `npm ci` attempts timed out. Therefore runtime conclusions are clearly separated from source-level conclusions.

---

## 1. Executive Verdict

### Is NexaBook really an Accounting, Invoicing & Billing product?

**YES.** The codebase is a real Cloud ERP/Accounting application, not a simple invoice UI or mockup.

It contains substantial implementations for:

- General Ledger / Journal Entries
- Chart of Accounts
- AR / AP
- Sales Invoices
- Purchase Bills
- Quotations / Orders
- Customer & Vendor Payments
- Sales / Purchase Returns
- Inventory / Warehouses / Batches / UOM
- POS
- Bank Accounts / Reconciliation / Bank Feeds
- Expenses
- Fixed Assets / Depreciation
- Payroll
- Manufacturing / BOM / Job Orders
- CRM
- Projects / Timesheets
- Tax / FBR-related integration
- Recurring Invoices
- Customer/Vendor Portals
- Stripe subscriptions
- JazzCash / Easypaisa payment integration
- AI/NexaBot/MCP layer
- Audit logs
- Approval workflows

### However

**It is NOT yet safe to call it a production-equivalent QuickBooks/Splendid Accounts replacement.**

The biggest gaps are not UI features. They are **financial integrity, transaction lifecycle correctness, tenant-boundary enforcement, document immutability, inventory/accounting synchronization, and production hardening.**

### Overall assessment

| Area | Rating |
|---|---:|
| Product scope | **9/10** |
| ERP module coverage | **9/10** |
| UI/page coverage | **8.5/10** |
| Accounting architecture | **7.5/10** |
| Invoicing/Billing | **8/10** |
| Inventory | **7/10** |
| Security / multi-tenancy | **6/10** |
| Financial correctness | **5.5/10** |
| Testing maturity | **6/10** |
| Production readiness | **5.5/10** |
| QuickBooks/Splendid replacement readiness | **~6/10** |

**Recommendation:** Do NOT rebuild from zero. Keep the existing platform, but freeze feature expansion temporarily and perform a **Financial Core + Security Hardening phase** first.

---

# 2. Audit Scope & Inventory

## 2.1 Source inventory

- 333 first-party TypeScript/TSX source files under `src/`
- 91,876 source lines
- 59 server-action modules
- 50+ `"use server"` action files/functions across the application
- 27 API route handlers
- ~150 `page.tsx` dashboard/application pages
- 102 PostgreSQL tables defined in `src/db/schema.ts`
- 35 PostgreSQL enums
- 49 exported report functions
- 23 test files
- 245 test/it cases discovered statically
- Multiple raw SQL migrations plus Drizzle configuration

## 2.2 Major modules found

### Accounting
- Chart of Accounts
- Journal Entries
- General Ledger
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow
- Fiscal Periods
- Opening Balances
- Cost Centers
- Budgets

### Sales
- Customers
- Quotations
- Sales Orders
- Invoices
- Recurring Invoices
- Delivery Notes
- Sales Returns
- Customer Payments
- Settlements

### Purchases
- Vendors
- Purchase Orders
- GRN
- Purchase Invoices
- Purchase Returns
- Vendor Payments
- Settlements
- Expenses

### Inventory
- Products
- Categories
- UOM
- UOM Conversion
- Warehouses
- Warehouse Stock
- Batches
- Serial Numbers
- Stock Transfers
- Stock Adjustments
- Stock Counts
- Stock Valuation

### Enterprise
- POS
- Banking
- Bank Reconciliation
- Bank Feeds
- Fixed Assets
- Manufacturing
- HR/Payroll
- CRM
- Projects
- Tax
- FBR/SRB/PRA/KPRA/BRA-related flows

### SaaS / AI
- Clerk authentication
- Subscription billing
- Stripe
- Customer/Vendor portal
- AI OCR
- NexaBot
- MCP tooling
- Webhooks
- Email/WhatsApp

---

# 3. Severity Model

- **P0 / Critical:** Can materially corrupt financial records, expose another tenant, bypass accounting controls, or make a core financial workflow unsafe.
- **P1 / High:** Serious production correctness/security problem; must be fixed before serious customers.
- **P2 / Medium:** Significant quality/performance/control problem.
- **P3 / Low:** Maintainability, UX, cleanup or non-blocking engineering issue.

---

# 4. P0 — Critical Findings

## NB-P0-01 — Invoice "Received Amount" does not create the cash/bank accounting entry

**Severity:** P0  
**Location:** `src/lib/actions/sales.ts` `createInvoice()` / `approveInvoice()`; invoice form `src/app/(dashboard)/sales/invoices/new/page.tsx`

The invoice form allows:

- Received amount
- Cash/Bank account
- Payment reference

But `approveInvoice()` posts the full invoice as:

```text
Dr Accounts Receivable       Net Invoice
Cr Sales Revenue             Revenue
Cr Tax Payable               Tax
Dr COGS                      COGS
Cr Inventory                 COGS
```

It does **not** create:

```text
Dr Cash/Bank                 Received Amount
Cr Accounts Receivable       Received Amount
```

Yet the invoice balance is reduced by `receivedAmount` during creation.

### Result

The subledger can say:

```text
Invoice = 100,000
Received = 30,000
Balance = 70,000
```

while the GL says:

```text
AR = 100,000
Cash = 0
```

This is a direct financial-integrity defect.

### Required fix

Either:

1. remove "Received Amount" from invoice posting and force a separate payment transaction, or
2. create the customer-payment journal atomically during invoice approval.

Recommended: **single transactional posting service** that handles invoice + initial payment + allocations.

---

## NB-P0-02 — Customer balance is denormalized but not maintained

**Severity:** P0/P1  
**Location:** `customers.balance`, `sales.ts`

Customer creation initializes:

```text
balance = openingBalance
```

But normal invoice approval/payment/return flows do not consistently update `customers.balance`.

The credit-limit calculation explicitly reads `customers.balance`.

### Result

A customer can owe PKR 500,000 according to the ledger while `customers.balance` remains 0 or stale.

That makes credit-limit enforcement unreliable.

### Required fix

Prefer making the accounting subledger the source of truth:

```text
Customer Balance = posted AR debits - posted AR credits
```

If a cached balance remains, update it only through the central posting engine and add reconciliation jobs.

---

## NB-P0-03 — Customer/Vendor settlements change balances/status without accounting entries

**Severity:** P0  
**Locations:**
- `sales.ts:createCustomerSettlement`
- `purchases.ts:createVendorSettlement`

Settlements can:

- mark invoices paid
- change vendor/customer balances
- record payment method
- record discount

but do not create the corresponding accounting entry.

For example a customer settlement should normally result in something like:

```text
Dr Cash/Bank
Dr Settlement Discount / Bad Debt (if applicable)
Cr Accounts Receivable
```

Vendor settlement should normally result in:

```text
Dr Accounts Payable
Cr Cash/Bank
Cr/Dr Discount account
```

### Result

Operational screens can say "paid" while the GL still shows the receivable/payable.

---

## NB-P0-04 — Sales Return inventory accounting is incomplete

**Severity:** P0  
**Location:** `sales.ts:approveSalesReturn`

The action increases physical stock and creates:

```text
Dr Sales Returns
Cr Accounts Receivable
```

But it does not reverse COGS / restore inventory value in the GL.

Correct perpetual-inventory accounting normally requires a second component such as:

```text
Dr Inventory
Cr COGS
```

using the original historical cost of the returned goods.

### Result

Physical inventory rises but inventory asset/COGS can remain inconsistent.

---

## NB-P0-05 — Purchase Return inventory accounting is incomplete

**Severity:** P0  
**Location:** `purchases.ts:approvePurchaseReturn`

The action decreases stock, but the GL uses a purchase-return/allowance account instead of reliably crediting the inventory asset for a perpetual inventory system.

Expected structure should generally include:

```text
Dr Accounts Payable / Vendor Receivable
Cr Inventory
```

plus tax reversal where applicable.

The implementation also modifies the purchase invoice amount and vendor balance separately, creating additional reconciliation risk.

---

## NB-P0-06 — GRN + Purchase Invoice can double-count inventory

**Severity:** P0  
**Locations:** `purchases.ts:createGRN`, `purchases.ts:approvePurchaseInvoice`

`createGRN()` immediately increases product stock.

`approvePurchaseInvoice()` also increases product stock for the same purchased quantities.

Because GRN can link to a purchase invoice, a normal workflow can become:

```text
PO
 ↓
GRN → +100 stock
 ↓
Purchase Invoice → +100 stock again
```

Result:

```text
Expected stock: +100
Actual stock:    +200
```

### Required architecture

Use a proper three-way/receipt model:

```text
PO → GRN/Receipt → AP Invoice
```

The invoice should not add inventory again if the GRN already received it.

---

## NB-P0-07 — Stock Count directly changes inventory but does not create the claimed journal entry

**Severity:** P0  
**Location:** `stock-count.ts:completeStockCount`

The function:

- updates `products.currentStock`
- creates stock movement records
- builds `journalLineItems`
- sets `journalEntryCreated = journalLineItems.length > 0`
- **does not actually insert the journal entry**

The response can therefore report:

```text
journalEntryCreated: true
```

when no JE exists.

This is a direct mismatch between UI/API truth and accounting truth.

---

## NB-P0-08 — Stock Adjustment changes stock before approval

**Severity:** P0/P1  
**Location:** `inventory-depth.ts:addStockAdjustment`

The action creates an adjustment with:

```text
approvalStatus = pending_approval
```

but immediately changes `products.currentStock`.

Then `approveStockAdjustment()` posts the accounting entry later.

This violates the intended approval boundary.

### Correct flow

```text
Draft
 ↓
Pending Approval
 ↓
Approved
 ↓
Atomic stock + GL posting
```

Never mutate physical/accounting state before approval unless the product explicitly models a reserved/pending quantity.

---

## NB-P0-09 — Posted journal entries are deletable

**Severity:** P0  
**Location:** `accounts.ts:deleteJournalEntry`

The code permits deleting a journal entry after only checking fiscal-period locking.

For a serious accounting system, posted entries should be immutable.

Correct model:

```text
Posted JE
   ↓
Reverse / Void
   ↓
New balancing JE
```

not:

```text
Posted JE → DELETE
```

Audit logs do not fully compensate for destructive financial deletion.

---

## NB-P0-10 — Approved invoices are physically deleted

**Severity:** P0  
**Location:** `sales.ts:deleteInvoice`

For an approved invoice, the implementation attempts to:

- reverse stock
- reverse the JE
- delete invoice items
- delete the invoice

This is not an audit-grade accounting lifecycle.

Invoices should normally move through:

```text
Draft → Approved/Posted → Paid/Partial → Void/Cancelled
```

with reversal documents where necessary.

Historical document numbers and accounting references should remain traceable.

---

## NB-P0-11 — Manual journal lines do not enforce account tenant ownership

**Severity:** P0/P1  
**Location:** `accounts.ts:createJournalEntry`, voucher paths

The user supplies `accountId` values, but the action does not consistently verify that every account belongs to the current `orgId` before inserting journal lines.

A tenant-bound journal line should require:

```text
chartOfAccounts.id = inputAccountId
AND chartOfAccounts.orgId = currentOrgId
```

The same rule must apply to every nested foreign key in every financial write.

---

## NB-P0-12 — Server-side validation schemas exist but are not actually used by financial actions

**Severity:** P0/P1  
**Location:** `src/lib/validations.ts`

Strong Zod schemas exist for:

- invoices
- customers
- vendors
- products
- journal entries
- employees
- bank accounts

but searches show the action layer does not actually use these schemas to validate incoming data.

The server therefore largely trusts client-provided strings/numbers such as:

- quantities
- prices
- taxes
- discounts
- totals
- account IDs
- warehouse IDs
- payment allocations

### Required fix

All server actions must validate and normalize input before business logic.

Never trust the React form calculation.

---

## NB-P0-13 — Default encryption key is embedded in application code

**Severity:** P0/P1  
**Location:** `src/lib/encryption.ts`

If `ENCRYPTION_KEY` is missing, the application derives a key from:

```text
nexabook-default-dev-key
```

This means a production misconfiguration can cause sensitive credentials to be encrypted with a predictable known key.

### Required fix

Fail closed:

```text
if ENCRYPTION_KEY missing → application startup/config error
```

Never use a deterministic development key as a production fallback.

---

# 5. P1 — High Severity Findings

## NB-P1-01 — UOM conversion and COGS are inconsistent

**Location:** `sales.ts:approveInvoice`

Stock quantity is converted to base UOM, but COGS is calculated before conversion:

```text
COGS = enteredQuantity × unitCost
```

while inventory movement uses:

```text
baseQuantity = enteredQuantity × conversionFactor
```

Example:

```text
1 Box = 12 Pieces
```

The stock may decrease by 12 pieces while COGS is calculated using 1 × cost.

The cost model must define whether cost is stored per base unit and then always value using base quantity.

---

## NB-P1-02 — Invoice COGS can use current product cost instead of historical cost

If no batch cost is available, approval uses `products.costPrice`.

That is a mutable master-data value.

A sale posted six months ago must not change its COGS simply because today's product cost changed.

Use a cost-layer transaction model:

```text
Inventory Layers
→ FIFO / WAC / Standard Cost
→ Historical Cost at Posting
```

---

## NB-P1-03 — Product sales report can disagree with the GL COGS

The sales reporting layer can calculate gross profit from current `products.costPrice`, while the invoice posting logic uses batch/current cost at posting.

Therefore:

```text
Report Gross Profit ≠ Ledger Gross Profit
```

The GL should be the source of truth for financial gross profit.

---

## NB-P1-04 — FIFO implementation is not trustworthy enough for accounting

`inventory-depth.ts` orders batches oldest-first but the ending inventory valuation logic does not match the required FIFO ending-layer semantics.

A production FIFO engine needs deterministic layers:

```text
Purchase Layer #1
Purchase Layer #2
Purchase Layer #3
        ↓
Sale consumes oldest available layers
        ↓
Remaining layers = ending inventory
```

Do not infer valuation from mutable batch rows and `createdAt` alone.

---

## NB-P1-05 — POS COGS now exists, but POS still values from product current cost

The earlier no-COGS defect has been addressed in the current source: `processPosSale()` creates COGS/inventory lines and is transactional.

However, POS COGS uses the product's current `costPrice`, not a proper historical cost layer/batch/UOM valuation system.

This remains a financial correctness risk.

---

## NB-P1-06 — POS should be treated as a separate posting engine or routed through the same core ledger service

POS now uses a transaction, but accounting logic is duplicated between:

- sales invoices
- POS
- returns
- payments
- settlements

This creates drift risk.

Recommended architecture:

```text
              Accounting Posting Engine
                       ↑
       ┌───────────────┼───────────────┐
       │               │               │
     Sales            POS          Purchases
       │               │               │
       └───────────────┼───────────────┘
                       ↓
                 Journal Entries
```

---

## NB-P1-07 — Customer payment allocations can over-allocate

`createCustomerPayment()` / `allocatePayment()` do not robustly enforce:

```text
allocated amount <= invoice outstanding
allocated total <= payment amount
```

They can also be called multiple times without a complete duplicate-allocation invariant.

Required database/business invariants:

```text
SUM(allocations for invoice) <= invoice.netAmount
SUM(allocations for payment) <= payment.amount
```

---

## NB-P1-08 — Vendor payment allocation does not fully synchronize invoice state

Vendor payment allocations are stored, but invoice status/balance and GL/subledger state are not consistently driven by a single allocation engine.

This can cause:

```text
Payment allocation says paid
Invoice status says approved
Vendor balance says something else
GL says something else
```

---

## NB-P1-09 — Purchase invoice revision still destroys vendor balance

`revisePurchaseInvoice()` contains:

```text
vendor.balance = 0
```

This is unsafe when the vendor has multiple outstanding bills.

The correct result should be derived from all posted vendor transactions, not reset to zero.

---

## NB-P1-10 — Purchase revision reverses stock without symmetric UOM handling

Approval converts UOM to base quantity, but revision uses the stored purchase quantity directly.

This can produce:

```text
Approve: +12 base units
Revise:  -1 unit
```

for a 1-box/12-piece configuration.

---

## NB-P1-11 — Purchase revision reverses the wrong accounting structure

The revision code creates a reversal using the total invoice amount but does not fully reproduce the original accounting split for:

- inventory
- input tax
- discounts
- other charges

A reversal must be the exact mathematical inverse of the original posted JE.

Best approach:

```text
Reverse original journal lines 1:1
```

rather than reconstructing from current invoice header totals.

---

## NB-P1-12 — Fiscal-period locking is not globally enforced at the database/posting boundary

Several posting/mutation paths have checks, but the system relies on callers remembering to call `checkPeriodLocked()`.

Any new action can accidentally bypass it.

The final posting service must enforce:

```text
document date
→ fiscal period
→ locked? reject
```

before any financial mutation.

---

## NB-P1-13 — Multi-currency is modeled but not actually posted correctly

Invoices contain:

```text
currency
exchangeRate
```

but the posting layer can use the foreign amount directly in the ledger.

Example:

```text
USD invoice = $1,000
FX rate = 280
```

The PKR ledger must generally record:

```text
PKR 280,000
```

not PKR 1,000.

GL lines should retain both:

- transaction currency amount
- functional currency amount
- FX rate

where required.

---

## NB-P1-14 — Tax engine is not centralized

`tax_rates` exists in the schema but is effectively unused.

Tax values are often sourced from product/client input, and POS has a hard-coded GST rate.

A real accounting system needs:

```text
Tax Jurisdiction
Tax Code
Effective From
Effective To
Tax Rate
Tax Inclusive/Exclusive
Input/Output
Account Mapping
Exemptions
Withholding
```

The server should calculate tax from tax configuration, not trust a browser-provided number.

---

## NB-P1-15 — FBR integration contains simulation fallback and must not report success as real compliance

`fbr-api.ts` returns successful simulated responses when no API key is configured.

That is useful for development, but dangerous if production UI reports:

```text
FBR submitted successfully
```

when it was only simulated.

Use explicit states:

```text
NOT_CONFIGURED
SANDBOX_SUBMITTED
PRODUCTION_SUBMITTED
FAILED
```

---

## NB-P1-16 — `isPosted` and `status` create competing posting-state models

Invoices contain:

```text
status
isPosted
journalEntryId
```

But posting flows do not consistently maintain all three.

A report such as the geography sales report filters on `isPosted = true`, while invoice approval primarily changes `status` and creates a JE.

This can make a report return no records even though invoices are approved.

There should be one authoritative state machine.

---

## NB-P1-17 — Warehouse stock has no org_id column and no strong `(warehouse, product)` uniqueness invariant

`warehouse_stock` is modeled through warehouse/product foreign keys but does not itself carry `orgId`.

For a multi-tenant ERP, a better design is:

```text
warehouse_stock
  org_id
  warehouse_id
  product_id
```

with:

```text
UNIQUE(org_id, warehouse_id, product_id)
```

This makes tenant isolation and stock uniqueness explicit.

---

## NB-P1-18 — Stock transfer does not implement UOM conversion

`transferStock()` contains an explicit TODO-like implementation where UOM conversion is currently skipped.

If:

```text
1 Box = 12 Pieces
```

then transferring `2 Boxes` must move `24 Pieces` in warehouse stock.

The current code can treat the quantity as already-base quantity.

---

## NB-P1-19 — Serial-number tracking is schema-level more than transaction-level

The schema has serial number support, but sales/purchase posting paths do not comprehensively enforce serial lifecycle transitions.

A real serialized inventory system needs:

```text
Purchased → In Stock
Sold → Sold
Returned → Returned/In Stock
Warranty → Warranty
Disposed → Disposed
```

and the invoice/return must reference the exact serial numbers.

---

## NB-P1-20 — Payroll approval accounting formula is internally inconsistent

`hr-payroll.ts` calculates deductions including:

- EOBI
- income tax
- provident fund
- unpaid leave

but the journal validation totals add only income tax + EOBI to net salary.

Provident fund and unpaid leave are not fully represented in the credit-side breakdown.

Because:

```text
Net Salary = Gross - all deductions
```

posting:

```text
Dr Gross
Cr Net
Cr Income Tax + EOBI
```

does not balance when PF/unpaid leave are non-zero.

This is likely to make payroll posting fail or become inconsistent depending on data.

---

# 6. Security / Multi-Tenancy Audit

## Positive findings

Several previously identified issues have been improved in the current source:

- Portal token generation now checks current organization and admin role.
- Approval request updates now include organization scope.
- Portal invoice reads include customer + organization scope.
- Easypaisa callback now has signature verification/fail-closed salt handling.
- POS now uses a transaction.
- Operational journal entries now explicitly use `status: "posted"`.
- Invoice approval writes `journalEntryId` back to the invoice.
- Several major actions use `requireRole()` and org-scoped queries.

These are meaningful improvements.

## Remaining security findings

### NB-SEC-01 — Foreign-key tenant ownership is not enforced centrally

Many actions validate the parent record but not every nested referenced ID.

Examples include references such as:

- customerId
- vendorId
- productId
- warehouseId
- accountId
- projectId
- invoiceId
- bankAccountId

The secure pattern must be universal:

```text
SELECT referenced_record
WHERE id = input_id
AND org_id = current_org_id
```

before inserting any relationship.

Do not assume the UI dropdown guarantees ownership.

---

### NB-SEC-02 — Webhook endpoint can create server-side SSRF risk

`webhooks.ts` accepts a user-controlled webhook URL and server-side `fetch()` sends requests to it.

An admin could configure URLs such as internal/private network targets.

Recommended controls:

- HTTPS only in production
- DNS/IP validation
- reject loopback
- reject RFC1918/private IPv4
- reject link-local
- reject metadata service addresses
- reject localhost
- re-check redirects
- optionally allowlist domains

---

### NB-SEC-03 — Webhook secrets are returned from endpoint listing

`getWebhookEndpoints()` selects `*`, which includes the webhook secret.

Secrets should never be returned to normal UI clients after creation.

Return:

```text
secretPresent: true
```

not the secret itself.

---

### NB-SEC-04 — Payment callback needs stronger idempotency and amount validation

Even with signature verification, the callback should verify:

- transaction exists
- gateway matches stored gateway
- amount matches original transaction amount
- merchant/account matches expected configuration
- status transition is legal
- duplicate callback is idempotent

Never allow a valid-looking callback to arbitrarily change a transaction state repeatedly.

---

### NB-SEC-05 — `api/log` is unauthenticated

`/api/log` accepts client-supplied logs without authentication.

This is not a direct data breach, but it allows log pollution and potentially high-volume abuse.

Apply rate limiting, payload-size limits and preferably authentication for sensitive logs.

---

### NB-SEC-06 — Organization membership model is not true multi-company membership

`profiles.userId` is globally unique.

That means one Clerk user can only have one profile row, which prevents a clean model such as:

```text
User A
 ├─ Company 1 → Admin
 ├─ Company 2 → Accountant
 └─ Company 3 → Viewer
```

For true multi-company SaaS, use:

```text
users
organizations
organization_memberships
  user_id
  org_id
  role
  permissions
```

The current design is closer to **one active organization per user** than a full multi-organization membership model.

---

# 7. Accounting Architecture Findings

## 7.1 Current accounting foundation is real

The system has:

```text
Chart of Accounts
       ↓
Journal Entries
       ↓
Journal Entry Lines
       ↓
Financial Reports
```

and uses double-entry validation.

This is a strong foundation.

## 7.2 But accounting logic is distributed across many modules

Examples:

- `sales.ts`
- `purchases.ts`
- `pos.ts`
- `banking.ts`
- `fixed-assets.ts`
- `manufacturing.ts`
- `hr-payroll.ts`
- `inventory-depth.ts`
- `adjustments.ts`

Each contains its own journal-building logic.

### Recommended architecture

Create one domain service:

```text
src/lib/accounting/posting/

posting-engine.ts
journal-builder.ts
account-resolver.ts
subledger.ts
inventory-costing.ts
period-control.ts
fx-engine.ts
```

Then expose domain-specific commands:

```text
postSalesInvoice()
postPurchaseInvoice()
postCustomerPayment()
postVendorPayment()
postSalesReturn()
postPurchaseReturn()
postExpense()
postPayroll()
postDepreciation()
postInventoryAdjustment()
```

All of them must ultimately call the same ledger engine.

---

# 8. Document State Machine Problems

Current status models are inconsistent across modules.

A professional ERP should define explicit lifecycle transitions.

## Sales invoice

Recommended:

```text
DRAFT
  ↓
PENDING_APPROVAL
  ↓
POSTED
  ↓
PARTIALLY_PAID
  ↓
PAID

POSTED → VOIDED → REVERSAL JE
```

## Purchase invoice

```text
DRAFT
  ↓
POSTED
  ↓
PARTIALLY_PAID
  ↓
PAID

POSTED → VOIDED → REVERSAL JE
```

## Payment

```text
DRAFT
  ↓
POSTED
  ↓
RECONCILED
```

No destructive deletion after posting.

---

# 9. Database Design Findings

## NB-DB-01 — Database-level accounting constraints are not represented in `schema.ts`

The repository has custom SQL migrations adding deferred journal balancing triggers and debit/credit checks.

However, these are not represented in the Drizzle schema definition.

That creates deployment risk:

```text
schema.ts
      ≠
actual production database constraints
```

The application must have one authoritative migration mechanism.

---

## NB-DB-02 — Migration `001_add_org_indexes.sql` is stale/inconsistent with current schema

The migration references names such as:

- `categories`
- `stock_adjustment_items`
- `asset_depreciations`
- `events`
- `calls`
- `role_permissions`
- `documents`
- `bank_feed_transactions`
- `contra_entries`

while the current schema contains different/current names.

It also attempts to index `warehouse_stock.org_id`, although current `warehouse_stock` has no `org_id` column.

This migration should not be treated as production-safe without reconciliation.

---

## NB-DB-03 — Migration strategy is fragmented

There is:

- Drizzle configuration
- raw SQL migrations
- schema source
- no visible committed Drizzle migration metadata directory in the extracted project
- README instructions encouraging `db:push`

For production accounting software, prefer:

```text
Schema
  ↓
Versioned migration
  ↓
Migration CI
  ↓
Production
```

Avoid manual `db:push` as the production migration mechanism.

---

## NB-DB-04 — Money precision is inconsistent

Money columns use multiple precisions/scales across the schema.

A financial core should establish explicit policies for:

- transaction amounts
- tax amounts
- exchange rates
- quantities
- unit costs
- FX conversions
- rounding

Prefer consistent `numeric` handling and avoid JavaScript floating-point arithmetic for authoritative financial calculations.

---

# 10. Invoicing Audit

## Strengths

- Draft invoice support
- Customer selection
- Warehouse selection
- Batch support
- UOM support
- Discounts
- Taxes
- Shipping
- Round-off
- Received amount
- PDF generation
- Email/WhatsApp
- FBR-related fields
- Recurring invoices
- Customer portal

## Problems

### 10.1 Client calculates authoritative totals

The browser calculates:

```text
subtotal
discount
tax
shipping
rounding
net
balance
```

The server accepts these values.

This is unsafe.

The server must recompute from canonical line data.

### 10.2 Invoice UI round-off calculation is suspicious

The UI uses integer `Math.round()` around the net total.

A round-off field should explicitly mean:

```text
netBeforeRound + roundOff = finalNet
```

not an implicit integer rounding.

### 10.3 Attachments UI is not a complete document-attachment system

The invoice form contains an attachments UI, but the accounting/document model does not appear to implement a complete secure attachment lifecycle.

---

# 11. Purchasing Audit

## Strengths

- Vendor bills
- Purchase orders
- GRN
- Purchase returns
- Vendor payments
- WHT
- Batch/expiry data
- Inventory integration

## Main risks

- GRN/invoice double stock
- revision reversal correctness
- vendor balance reset
- settlement accounting
- historical cost handling
- tax/input-tax calculation from line data
- missing centralized three-way matching

---

# 12. Inventory Audit

## Strengths

The inventory module is one of NexaBook's strongest areas in breadth:

- warehouses
- batches
- expiry
- UOM
- transfers
- adjustments
- counts
- valuation
- stock movements
- minimum stock
- serial number schema

## Main risks

1. UOM inconsistency
2. historical costing
3. FIFO correctness
4. stock count no actual JE
5. adjustment mutates stock before approval
6. GRN + invoice double receiving
7. serial lifecycle incomplete
8. warehouse stock missing tenant column/unique invariant
9. current stock is a mutable summary rather than a fully derived ledger

### Recommended inventory architecture

```text
inventory_transactions
      ↓
stock_layers
      ↓
warehouse_balance
      ↓
product_balance
```

`currentStock` should become a controlled cached projection, not the primary accounting truth.

---

# 13. Banking & Reconciliation Audit

## Strengths

- bank accounts
- statements
- reconciliation
- pattern learning
- bank feeds
- deposits
- transfers
- contra entries
- local payment gateways

## Risks

- some balance updates are performed separately from journal posting
- numbering uses application-level sequences in several modules
- payment callbacks need stronger idempotency
- reconciliation matching uses potentially expensive nested matching
- bank-feed synchronization should have transaction/idempotency safeguards
- bank connection secrets must always be encrypted and key management must fail closed

---

# 14. Payroll Audit

## Strengths

- employees
- attendance
- overtime
- EOBI
- income tax
- provident fund
- payslips
- payroll run
- journal posting

## Major issue

The payroll JE formula is not fully balanced when provident fund/unpaid leave deductions exist.

## Further architectural recommendation

Separate:

```text
Employee deduction
Employer contribution
Statutory payable
Employee payable
Expense
```

For example:

```text
Dr Salary Expense
Dr Employer EOBI Expense
Dr Employer PF Expense

Cr Salaries Payable
Cr Income Tax Payable
Cr Employee EOBI Payable
Cr Employee PF Payable
Cr Employer EOBI Payable
Cr Employer PF Payable
```

Exact treatment depends on the configured statutory rules.

---

# 15. Tax / Pakistan Compliance Audit

NexaBook has strong intent and many Pakistan-specific fields, but production compliance needs a stricter architecture.

## Required separation

```text
Tax Calculation Engine
        ↓
Tax Transaction Ledger
        ↓
Return Calculation
        ↓
FBR/SRB/PRA/KPRA/BRA Adapter
        ↓
Submission + Acknowledgement
```

Do not make the external API response the only compliance record.

Store:

- submission payload hash
- submission timestamp
- response
- external reference
- status
- retry count
- environment
- request version
- tax period

---

# 16. SaaS / Billing Audit

## Stripe integration

Stripe webhook signature verification is correctly present.

## Important issue

`createCheckoutSession(priceId, planType)` accepts price information from the client.

The server should never blindly trust a browser-provided Stripe Price ID.

Use:

```text
planType → server-side PLANS map → priceId
```

not:

```text
client priceId → Stripe
```

Also enforce authorization for plan changes and subscription management.

---

# 17. AI / NexaBot Audit

The AI layer is a useful differentiator, but it must be treated as a **read-only intelligence layer by default**.

Good:

- orgId passed into retrievers
- accounting-focused system prompt
- MCP abstraction
- retrievers for revenue, invoices, cash, P&L, inventory, payroll, tax

Risks:

- LLM output must never become accounting truth
- all calculations should come from deterministic services
- MCP tools must remain least-privilege
- sensitive payroll/customer information needs role-aware filtering
- prompt injection from database content should be considered
- AI should never be allowed to directly post journal entries without a separate authorization/approval boundary

Recommended model:

```text
AI
 ↓
Intent
 ↓
Deterministic tool
 ↓
Verified accounting result
 ↓
LLM explanation
```

---

# 18. Testing Audit

## Current

23 test files and approximately 245 test/it cases are present.

This is a positive improvement compared with a purely UI-driven project.

## Missing test depth

The most important tests should be integration tests against a real PostgreSQL-compatible environment.

### Mandatory financial invariant tests

#### Sales invoice

```text
AR = Revenue + Tax + Shipping + RoundOff
COGS = Inventory reduction
```

#### Purchase invoice

```text
Inventory + InputTax = AP
```

#### Customer payment

```text
Cash = AR reduction
```

#### Vendor payment

```text
AP reduction = Cash + WHT
```

#### Sales return

```text
AR reduction
Inventory increase
COGS reversal
```

#### Purchase return

```text
AP reduction
Inventory decrease
Input-tax reversal
```

#### Trial balance

```text
Total Debits = Total Credits
```

#### Balance sheet

```text
Assets = Liabilities + Equity
```

#### Tenant isolation

```text
Org A cannot read/write Org B records
```

#### Concurrency

Run 50-100 simultaneous document postings and assert unique document numbers and balanced GL.

---

# 19. Build / Runtime Verification Status

The project currently has `package.json` and `package-lock.json`, but the extracted ZIP did not contain the normal root dependency installation.

Attempts to install dependencies timed out.

Therefore the following could **not** be independently executed from the ZIP in this environment:

```text
npm test
npm run build
npm run lint
npm run db:check
```

`npm test` could not start because `vitest` was unavailable.

A static scan confirms that a previous build blocker involving synchronous exports from `"use server"` modules appears to have been fixed in the current source: no `export function` declarations were found in `src/lib/actions` that violate the earlier pattern.

**But build-pass status remains UNVERIFIED until dependencies are installed and CI/build is run.**

---

# 20. Architecture Verdict

## Current architecture

```text
Next.js 16 App Router
        │
        ├── React / TypeScript
        ├── Clerk
        ├── Server Actions
        ├── API Routes
        │
        ├── Drizzle ORM
        │       ↓
        │   PostgreSQL / Neon
        │
        ├── Stripe
        ├── JazzCash
        ├── Easypaisa
        ├── Resend
        ├── WhatsApp
        ├── Gemini
        └── MCP/NexaBot
```

This is a valid modern SaaS architecture.

## Main architectural weakness

Business rules are spread across server actions instead of a central domain/application layer.

That is the main reason accounting consistency problems can emerge.

---

# 21. Recommended Target Architecture

```text
                    Next.js UI
                       │
                       ↓
              Application Commands
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Sales        Purchases      POS
          │            │            │
          └────────────┼────────────┘
                       ↓
               Domain Services
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Inventory       Accounting        Tax
     Engine          Engine         Engine
        │              │              │
        └──────────────┼──────────────┘
                       ↓
               Transaction Boundary
                       │
              PostgreSQL / Neon
                       │
             Immutable Ledger
```

---

# 22. 30-Day Remediation Plan

## Week 1 — Stop financial corruption

1. Remove destructive deletion of posted documents.
2. Fix invoice received-amount accounting.
3. Fix customer balance source of truth.
4. Fix customer/vendor settlements.
5. Fix sales return inventory/COGS reversal.
6. Fix purchase return inventory/tax reversal.
7. Fix GRN + purchase invoice double stock.
8. Fix stock count JE implementation.
9. Move stock adjustment mutation behind approval.
10. Fix payroll JE balancing.

## Week 2 — Build the posting engine

Create:

```text
posting-engine.ts
account-resolver.ts
inventory-costing.ts
subledger.ts
period-control.ts
fx-engine.ts
```

Migrate:

- sales invoice
- purchase invoice
- POS
- customer payment
- vendor payment
- returns
- expense
- payroll
- depreciation
- inventory adjustments

onto it.

## Week 3 — Security / tenant hardening

1. Central `requireOrgRecord()` helper.
2. Validate every foreign key against org.
3. Add org_id to warehouse stock.
4. Add tenant-aware unique constraints.
5. Remove webhook secret from read APIs.
6. Add webhook SSRF protection.
7. Harden payment callback idempotency.
8. Server-side Zod validation for every mutation.
9. Validate Stripe plans server-side.
10. Redesign user/org membership if multi-company is required.

## Week 4 — Accounting-grade QA

Build automated scenarios:

- 1,000 invoices
- 1,000 payments
- mixed currencies
- tax-inclusive invoices
- returns
- partial payments
- overpayments
- discounts
- WHT
- FIFO
- batches
- UOM conversions
- backdated posting
- locked periods
- concurrent posting
- two tenants

Then assert financial invariants after every scenario.

---

# 23. Production Readiness Gate

NexaBook should not be declared production accounting-ready until all of these are green:

- [ ] `npm run build` passes
- [ ] `npm run lint` clean enough for CI
- [ ] TypeScript passes
- [ ] migrations reproducible from empty DB
- [ ] production DB migration tested
- [ ] journal balancing DB constraint verified in production
- [ ] no posted document deletion
- [ ] all posted documents have immutable references
- [ ] invoice/payment/return/settlement posting is atomic
- [ ] customer/vendor subledgers reconcile to GL
- [ ] inventory subledger reconciles to inventory GL
- [ ] COGS reconciles to inventory cost layers
- [ ] trial balance always balances
- [ ] balance sheet balances
- [ ] tax ledger reconciles to returns
- [ ] FBR production mode distinguished from simulation
- [ ] tenant isolation tests pass
- [ ] RBAC matrix tests pass
- [ ] payment callback idempotency tests pass
- [ ] webhook SSRF controls implemented
- [ ] secrets fail closed
- [ ] backup/restore tested
- [ ] observability and alerting configured
- [ ] rate-limit dependency availability tested

---

# 24. Final Product Classification

## What NexaBook is today

**NexaBook is a substantial Cloud ERP + Accounting + Invoicing/Billing SaaS platform.**

It has enough real functionality to legitimately be called accounting/ERP software.

## What it is not yet

It is not yet a trustworthy **QuickBooks/Splendid Accounts-class financial system** for production use without the remediation above.

The distinction is:

```text
Feature completeness       → Strong
Architecture foundation   → Strong
ERP breadth               → Strong
Accounting correctness    → Needs hardening
Financial controls        → Needs hardening
Tenant security           → Needs hardening
Production maturity       → Not yet
```

---

# 25. Bottom Line

**Do not throw this project away.**

The codebase has a serious amount of useful work already implemented. The correct next phase is not another 100 screens.

The correct next phase is:

```text
             NEXABOOK HARDENING
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
 Financial Core   Security    Inventory
       │            │            │
       └────────────┼────────────┘
                    ↓
             Posting Engine
                    ↓
          Automated Invariants
                    ↓
          Production Certification
```

Once those controls are implemented and verified, NexaBook can move from:

> **"feature-rich ERP project"**

toward:

> **"production-grade Pakistani accounting + ERP SaaS."**

---

## Appendix A — Highest Priority Fix List

| Priority | Issue |
|---|---|
| P0 | Invoice received amount must create payment JE or be removed |
| P0 | Customer balance must reconcile with AR |
| P0 | Customer/vendor settlements need real accounting |
| P0 | Sales returns need inventory + COGS reversal |
| P0 | Purchase returns need inventory + tax reversal |
| P0 | GRN/invoice must not double-receive stock |
| P0 | Stock count must actually post its JE |
| P0 | Pending stock adjustments must not mutate stock |
| P0 | Posted JEs/documents must be immutable |
| P0 | All nested foreign keys need tenant ownership validation |
| P0 | Server-side financial validation must be mandatory |
| P0 | Production encryption key must fail closed |
| P1 | Historical inventory costing |
| P1 | FIFO/WAC engine |
| P1 | UOM-aware COGS |
| P1 | Payment allocation invariants |
| P1 | Purchase revision reversal |
| P1 | Fiscal-period enforcement at posting boundary |
| P1 | FX-aware accounting |
| P1 | Central tax engine |
| P1 | FBR production/sandbox distinction |
| P1 | `isPosted`/status state model consolidation |
| P1 | Warehouse stock tenant/unique constraints |
| P1 | Serial number lifecycle |
| P1 | Payroll JE formula |
| P1 | Stripe price validation |
| P1 | Webhook SSRF protection |

---

**Audit conclusion:** The current NexaBook codebase is a **real, broad ERP/accounting platform with a strong foundation**, but its financial core currently contains several issues that can produce incorrect books or inconsistent operational balances. Fixing the posting engine, inventory accounting, subledgers, tenant boundaries and immutable document lifecycle should take priority over adding more modules.
