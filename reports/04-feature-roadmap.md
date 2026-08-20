# NexaBook — Feature Roadmap (Phase 4)

**Date:** 2026-07-05
**Purpose:** Identify top 10 highest-value missing features ranked by (business value ÷ complexity)
**Status:** Proposal only — do not implement without explicit approval

---

## Current Coverage

- **Strong:** Sales, Purchases, Accounts/GL, Banking, Inventory, HR/Payroll, POS, CRM, Reports
- **Basic:** Manufacturing, Fixed Assets, Projects
- **Missing:** Multi-currency, Provincial tax, Employee self-service, Advanced depreciation, Landed cost, Document management

---

## Top 10 Missing Features (Ranked by Value/Complexity)

### 1. Multi-Currency Transaction Support

**What:** Enable per-invoice/per-payment currency selection with real-time exchange rate conversion. Currently exchange rates exist but transactions are always in PKR.

**Why it matters:** Pakistani businesses importing/exporting need to issue invoices in USD/AED/SAR and track foreign currency gains/losses. Without this, any cross-border transaction requires manual conversion.

**Complexity:** M

**Files touched:** `src/db/schema.ts` (add currency columns to invoices/payments), `src/lib/actions/sales.ts`, `src/lib/actions/purchases.ts`, `src/lib/actions/banking.ts`, `src/lib/actions/reports.ts`, `src/lib/actions/exchange-rates.ts`, new `src/lib/actions/foreign-currency.ts`

**Spec sketch:** Each invoice/payment carries a `currency` field (default PKR) and `exchangeRate` at time of transaction. Journal entries record the PKR equivalent. Unrealized/realized foreign exchange gains/losses are calculated at period-end. Reports show both original currency and PKR amounts.

---

### 2. Withholding Tax (WHT) Certificate Workflow

**What:** End-to-end WHT certificate generation, delivery, and tracking. Currently WHT is calculated on payments but certificates are not generated or tracked.

**Why it matters:** Pakistani law requires deduction certificates (challans) within 7 days of deduction. Non-compliance triggers penalties. Accountants currently generate these manually in Excel.

**Complexity:** M

**Files touched:** `src/lib/actions/tax-filing.ts`, new `src/lib/actions/wht-certificates.ts`, new `src/app/(dashboard)/accounts/wht-certificates/`, `src/db/schema.ts` (wht_certificate table)

**Spec sketch:** When WHT is deducted on a payment, a certificate record is auto-created with challan number, amount, and status (pending/generated/sent). PDF generation using existing PDF infrastructure. Email/WhatsApp delivery. Status tracking dashboard.

---

### 3. Employee Self-Service Portal

**What:** Employee-facing portal for payslip download, leave requests, and attendance viewing. Currently HR/Payroll is admin-only.

**Why it matters:** Reduces HR admin burden. Employees can self-serve payslips and leave, eliminating repetitive queries. Standard in all modern Pakistani payroll systems.

**Complexity:** M

**Files touched:** new `src/app/employee-portal/`, new `src/lib/actions/employee-portal.ts`, `src/db/schema.ts` (employee portal tokens)

**Spec sketch:** Token-based access (similar to existing customer portal). Employee sees their payslips, leave balance, attendance records. Can submit leave requests. No admin access — read-only for their own data.

---

### 4. Advanced Depreciation Methods

**What:** Add declining balance and units-of-production depreciation methods alongside the existing straight-line. Add asset disposal and revaluation.

**Why it matters:** Straight-line alone doesn't match FBR depreciation rules for all asset classes. Asset disposal is required for proper asset lifecycle management.

**Complexity:** S

**Files touched:** `src/lib/actions/fixed-assets.ts`, `src/app/(dashboard)/fixed-assets/`, `src/db/schema.ts` (depreciation_method enum, disposal_date, revaluation columns)

**Spec sketch:** Depreciation method selected per asset. Declining balance uses configurable rate. Units-of-production uses usage data. Disposal records sale price, gain/loss, and creates journal entries. Revaluation updates asset book value.

---

### 5. Landed Cost Calculation

**What:** Allocate freight, customs duty, and insurance costs proportionally across purchase line items to determine true per-unit cost.

**Why it matters:** Pakistani importers need accurate landed cost for inventory valuation and customs compliance. Without this, cost prices exclude shipping/duty, understating inventory value.

**Complexity:** M

**Files touched:** `src/lib/actions/purchases.ts`, new `src/lib/actions/landed-cost.ts`, `src/app/(dashboard)/purchases/landed-cost/`, `src/db/schema.ts` (landed_cost_allocations table)

**Spec sketch:** After GRN, user can add landed cost entries (freight, duty, insurance). System allocates proportionally by line item value or quantity. Allocated costs update batch cost price. Journal entries for the landed cost amounts.

---

### 6. Multi-Level Approval Chains

**What:** Configurable approval workflows with multiple levels (e.g., Invoice > Manager > Director for amounts > Rs. 5,00,000).

**Why it matters:** Pakistani businesses above a certain size need approval hierarchies for financial controls. Current single-level approval is insufficient for mid-market.

**Complexity:** S

**Files touched:** `src/lib/actions/approvals.ts`, `src/db/schema.ts` (approval_chains, approval_chain_steps tables), `src/app/(dashboard)/settings/approvals/`

**Spec sketch:** Admin defines chains per document type with conditions (amount threshold, department). When a document is submitted, it routes through the chain. Each approver sees pending items. Chain can be bypassed by admin.

---

### 7. Document Management / Attachments

**What:** File attachment system for invoices, POs, contracts, and employee documents.

**Why it matters:** Pakistani businesses need to store scanned copies of signed invoices, contracts, and CNIC copies. Currently all documents are digital-only with no attachment capability.

**Complexity:** M

**Files touched:** new `src/lib/actions/attachments.ts`, `src/db/schema.ts` (attachments table), new `src/app/api/upload/`, integration points across sales/purchases/HR modules

**Spec sketch:** Each major entity (invoice, PO, employee, etc.) gets an attachments section. Files upload to Vercel Blob or local storage. Metadata stored in DB (filename, size, type, entity reference). Download and preview capability.

---

### 8. Bank Feed Auto-Import (Cron)

**What:** Automated bank feed import on a schedule via cron job, matching the manual import that already works.

**Why it matters:** Manual import defeats the purpose of bank feeds. Automated daily import keeps reconciliation current without manual intervention.

**Complexity:** S

**Files touched:** `src/app/api/cron/bank-feeds/route.ts` (already exists but needs enhancement), `src/lib/actions/bank-feeds.ts`

**Spec sketch:** Cron job runs daily (already in `vercel.json`). For each active bank connection, fetch latest transactions via provider API. Store new transactions. Auto-match against existing journal entries using existing reconciliation logic. Notify admin of unmatched transactions.

---

### 9. SMS Notifications

**What:** SMS integration for payment reminders, OTP verification, and transactional alerts.

**Why it matters:** WhatsApp is good but SMS has broader reach in Pakistan (feature phones, rural areas). Many Pakistani ERP systems offer SMS as primary notification channel.

**Complexity:** S

**Files touched:** new `src/lib/sms/`, `src/lib/actions/settings.ts` (SMS config), integration points for payment reminders, payroll notifications

**Spec sketch:** SMS provider integration (Twilio, local Pakistani providers like Systango). Configurable templates for payment reminders, leave approvals, payroll processed. Rate limiting per org. SMS delivery status tracking.

---

### 10. Provincial Tax (SRB/PRA) Workflow

**What:** Dedicated workflow for Sindh Revenue Board / Punjab Revenue Board provincial sales tax, separate from FBR federal sales tax.

**Why it matters:** Pakistani businesses operating in Sindh or Punjab must file separate provincial returns. Currently the schema supports it but there's no dedicated workflow or UI.

**Complexity:** L

**Files touched:** `src/lib/actions/tax-filing.ts`, new `src/lib/actions/provincial-tax.ts`, `src/app/(dashboard)/accounts/provincial-tax/`, `src/db/schema.ts` (provincial_tax_returns table)

**Spec Sketch:** Separate return generation for SRB/PRA. Different tax rates and rules per province. Provincial registration validation (STRN). Return filing and status tracking. Reconciliation between federal and provincial tax.

---

## Priority Matrix

| Rank | Feature | Value | Complexity | V/C Ratio | Phase |
|------|---------|-------|------------|-----------|-------|
| 1 | Multi-Currency | High | M | High | 2 |
| 2 | WHT Certificates | High | M | High | 2 |
| 3 | Employee Self-Service | High | M | High | 2 |
| 4 | Advanced Depreciation | Medium | S | High | 1 |
| 5 | Landed Cost | High | M | High | 2 |
| 6 | Multi-Level Approvals | Medium | S | High | 1 |
| 7 | Document Management | Medium | M | Medium | 3 |
| 8 | Bank Feed Auto-Import | Medium | S | Medium | 1 |
| 9 | SMS Notifications | Medium | S | Medium | 3 |
| 10 | Provincial Tax | High | L | Medium | 3 |

**Recommended Phase 1 (quick wins):** Advanced Depreciation, Multi-Level Approvals, Bank Feed Auto-Import
**Recommended Phase 2 (high value):** Multi-Currency, WHT Certificates, Employee Self-Service, Landed Cost
**Recommended Phase 3 (strategic):** Document Management, SMS Notifications, Provincial Tax

---

## How to Proceed

Each feature above should become a full spec in `specs/` following the SDD workflow from `CONSTITUTION.md`:
1. Copy the spec sketch into `specs/[feature-name]/spec.md`
2. Follow the 4-phase process: Research → Specify → Clarify → Build
3. Get human approval before implementation

**Do not start building any of these without explicit approval.**
