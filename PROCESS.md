# NexaBook — Missing Features Implementation Process

## Jo Features Competitors Mein Hain, Hum Mein Nahi

### ✅ Sprint A — Customer & Vendor Portal
- [x] A1: Customer portal page — login-less token-based invoice viewing
- [x] A2: Customer portal — online payment (JazzCash/Easypaisa)
- [x] A3: Customer portal — statement download (PDF)
- [x] A4: Vendor portal — purchase invoice & payment status view

### ✅ Sprint B — Price Lists & Customer Tiers
- [x] B1: `priceLists` schema (name, type: wholesale/retail/gold/platinum)
- [x] B2: `priceListItems` schema (productId, priceListId, unitPrice)
- [x] B3: Customer → priceListId added to customers table
- [x] B4: Invoice/Order auto-picks price from assigned list (schema ready)
- [x] B5: UI for managing price lists at `/inventory/price-lists`

### ✅ Sprint C — Budgeting & Forecasting
- [x] C1: `budgets` schema (orgId, fiscalYear, accountId, budgetedAmount, month)
- [x] C2: Budget vs Actual report page at `/reports/budget`
- [x] C3: Budget variance with red/green indicators

### ✅ Sprint D — Workflow Approvals (Multi-Level)
- [x] D1: `approvalWorkflows` schema (orgId, entityType, approverRole, minAmount, maxAmount, orderIndex)
- [x] D2: `approvalRequests` schema (workflowId, entityId, entityNumber, amount, status)
- [x] D3: Approvals page at `/approvals` with approve/reject
- [x] D4: Approval workflow settings at `/settings/approvals`

### ✅ Sprint E — Email Template Customization
- [x] E1: `emailTemplates` schema (orgId, templateType, subject, bodyHtml)
- [x] E2: Template editor UI (variable insertion: {invoiceNo}, {customerName}, etc.)
- [x] E3: Use custom templates in send-invoice-email & send-quotation-whatsapp

### ✅ Sprint F — Dashboard Customization
- [x] F1: `dashboardWidgets` schema (orgId, widgetType, position, isVisible)
- [x] F2: Drag-and-drop widget grid
- [x] F3: Widget visibility toggles

### ✅ Sprint G — Sales Tax Return Auto-Filing
- [x] G1: `salesTaxReturns` schema (orgId, period, totalSales, outputTax, inputTax, netPayable, status)
- [x] G2: Auto-calculate sales tax from invoices for period
- [x] G3: Generate return PDF for FBR submission + submit to FBR API

### ✅ Sprint H — Webhooks & Public API
- [x] H1: `webhookEndpoints` schema (orgId, url, events, secret)
- [x] H2: Webhook delivery engine (sign + send on entity create/update)
- [x] H3: `webhookDeliveries` schema for delivery tracking

### ✅ Sprint I — Cost Center / Profit Center Accounting
- [x] I1: `costCenters` schema (orgId, name, code)
- [x] I2: Link cost center to journal entry lines & invoices
- [x] I3: Cost center wise P&L report

### ✅ Sprint K — Two-Factor Authentication
- [x] K1: Clerk 2FA configuration — security settings page with Clerk UserProfile
- [x] K2: Force 2FA for admin role — warning banner in dashboard

### ✅ Sprint N — Project Management + Timesheets
- [x] N1: `projects` schema (name, code, status, budget, client)
- [x] N2: `tasks` schema (title, assignee, priority, status, est/actual hours)
- [x] N3: `timesheets` schema (profileId, projectId, date, hours, billable, status)
- [x] N4: Server actions — CRUD for projects, tasks, timesheets + profitability report
- [x] N5: Project management UI — card grid, inline task board with status updates
- [x] N6: Timesheet entry UI — log time, submit/approve/reject workflow
- [x] N7: Project profitability report — budget, revenue, profit margin, budget utilization
- [x] N8: Navigation — sidebar items for Projects, Timesheets, and Project Profitability report

### Sprint J — Mobile App (React Native / Flutter)
- [ ] J1: Expand mobile API routes (sales, purchases, inventory)
- [ ] J2: React Native/Flutter project setup
- [ ] J3: Auth with Clerk
- [ ] J4: Dashboard + Invoice list + Payment collection

### Sprint K — Two-Factor Authentication
- [ ] K1: Clerk 2FA configuration
- [ ] K2: Force 2FA for admin role

### Sprint L — Bank Feeds (Auto-Sync)
- [ ] L1: Bank API integration schema + service
- [ ] L2: Auto-import transactions daily

### ✅ Sprint L — Bank Feeds (Auto-Sync)
- [x] L1: `bankConnections` schema + provider interface + MockBank provider + service layer (`src/lib/banking/bank-feeds.ts`)
- [x] L2: Auto-import daily cron at `/api/cron/bank-feeds` + settings UI at `/settings/bank-feeds`
- [x] L3: Server actions — CRUD connections, manual sync, bulk sync (`src/lib/actions/bank-feeds.ts`)

### Sprint M — Multi-Company Consolidation
- [ ] M1: Parent-child org relationship
- [ ] M2: Consolidated P&L & Balance Sheet

### Sprint N — Project Management + Timesheets
- [ ] N1: `projects` schema
- [ ] N2: `tasks` schema with assignee, status, priority
- [ ] N3: `timesheets` schema (employeeId, projectId, date, hours, description)
- [ ] N4: Project profitability report

### ✅ Sprint O — WHT Certificates & Statements
- [x] O1: WHT certificate generation (PDF — formal certificate with declaration, org/vendor info, transaction table)
- [x] O2: Vendor-wise WHT statement — `getWHTVendorStatement` action + `/api/wht-certificate` PDF download
- [x] O3: Annual WHT return — quarterly breakdown per vendor at `/reports/wht-return`

---

## Execution Order (Updated)

### ✅ Completed
- **Sprint A** — Customer & Vendor Portal
- **Sprint B** — Price Lists & Customer Tiers
- **Sprint C** — Budgeting & Forecasting
- **Sprint D** — Workflow Approvals
- **Sprint E** — Email Template Customization
- **Sprint F** — Dashboard Customization
- **Sprint G** — Sales Tax Return Auto-Filing
- **Sprint H** — Webhooks & Public API

### ✅ Completed
9. **Sprint I** — Cost Center / Profit Center
10. **Sprint K** — Two-Factor Authentication
11. **Sprint N** — Project Management + Timesheets
12. **Sprint O** — WHT Certificates & Statements

### 🔜 Next
13. **Sprint E** — Email Templates (re-check)
13. **Sprint E** — Email Templates
14. **Sprint L** — Bank Feeds (Auto-Sync)
15. **Sprint M** — Multi-Company Consolidation
15. **Sprint M** — Multi-Company Consolidation
16. **Sprint J** — Mobile App

---

# PHASE 2 — AUDIT REMEDIATION (Production 45→100, Market 35→100)

## Priority Matrix

| ID | Issue | File | Severity | Effort | Impact |
|----|-------|------|----------|--------|--------|
| A1 | No page-level auth middleware | `src/middleware.ts` | P0 | 1hr | +15 Prod |
| A2 | Balance Sheet no date filter | `src/lib/accounting.ts:183` | P0 | 1hr | +10 Prod |
| A3 | P&L double-counts revenue/expense | `src/lib/actions/reports.ts:85-125` | P0 | 2hr | +10 Prod |
| A4 | Auto-org creation in getCurrentOrgId | `src/lib/actions/shared.ts:121-163` | P0 | 1hr | +5 Prod |
| A5 | Missing orgId scope on getAccountById | `src/lib/actions/accounts.ts:324-328` | P0 | 0.5hr | +5 Prod |
| B1 | Duplicate account code 4500 | `src/lib/actions/accounts.ts:140-141` | P1 | 0.5hr | +3 Prod |
| B2 | Rate limiting ineffective (in-memory Map) | `src/middleware.ts:4-18` | P1 | 2hr | +5 Prod |
| B3 | Invoice creation not in transaction | `src/lib/actions/sales.ts:717-760` | P1 | 1hr | +5 Prod |
| B4 | N+1 queries in approveInvoice | `src/lib/actions/sales.ts:825-903` | P1 | 3hr | +5 Prod |
| B5 | Missing DB indexes | `src/db/schema.ts` | P1 | 2hr | +5 Prod |
| B6 | Missing CSRF protection | Server actions | P1 | 2hr | +5 Prod |
| B7 | COGS trial balance wrong type string | `src/lib/accounting.ts:86` | P1 | 0.5hr | +3 Prod |
| B8 | Draft journal entries affect reports | All report queries | P1 | 1hr | +3 Prod |
| B9 | Account lookup by name not subtype | `src/lib/actions/sales.ts:1343-1393` | P1 | 1hr | +3 Prod |
| C1 | `any` types in action files | Multiple files | P2 | 2hr | +3 Prod |
| C2 | Error messages too generic | Multiple files | P2 | 2hr | +3 Prod |
| C3 | Hardcoded "Acme Corporation" | `layout.tsx:357` | P2 | 0.5hr | +2 Market |
| C4 | Hardcoded "Professional Plan" | `layout.tsx:358` | P2 | 0.5hr | +2 Market |
| C5 | JE number loads all rows | `accounts.ts:261-266` | P2 | 0.5hr | +2 Prod |
| D1 | No Cash Flow Statement report | Missing feature | P0 | 4hr | +10 Market |
| D2 | No Stripe billing integration | Missing feature | P0 | 8hr | +15 Market |
| D3 | No prior-period locking | Missing feature | P0 | 3hr | +10 Market |
| D4 | No pagination on list views | Multiple pages | P2 | 4hr | +5 Market |
| D5 | Missing test coverage | Missing feature | P2 | 8hr | +5 Prod |
| D6 | No error tracking/monitoring | Missing feature | P2 | 2hr | +3 Prod |
| D7 | No mobile responsiveness | Multiple pages | P2 | 6hr | +5 Market |
| D8 | 2FA full implementation | `admin-2fa.ts` | P2 | 2hr | +3 Market |
| D9 | Missing audit trail entries | Multiple actions | P2 | 2hr | +2 Prod |

## Sprint A — P0 Critical Fixes (Score: +40 Prod, +10 Market)

### A1: Auth Middleware — Clerk middleware for all pages [P0]
- [x] Convert `src/middleware.ts` to use Clerk's `clerkMiddleware`
- [x] Protect all dashboard routes, allow public routes (/, /login, /register, /portal, /vendor-portal)
- [ ] Keep rate limiting, move to Redis-backed storage

### A2: Balance Sheet Date Filter [P0]
- [x] Add `asOfDate` parameter to `getBalanceSheet()` in `src/lib/accounting.ts`
- [x] Filter `journalEntries.entryDate <= asOfDate`
- [x] Filter out draft journal entries
- [ ] Update the report page to pass date parameter

### A3: Fix P&L Double-Count [P0]
- [x] Refactor `getProfitAndLossReport()` in `src/lib/actions/reports.ts`
- [x] Use ONLY journal entries for P&L calculation
- [x] Remove direct invoice/expense table queries

### A4: Remove Auto-Org Creation [P0]
- [x] Remove auto-org creation from `getCurrentOrgId()` in `src/lib/actions/shared.ts`
- [x] Add explicit org creation step in onboarding flow (`createOrganization`)
- [x] Update onboarding redirect to handle no-org state

### A5: Fix Missing orgId Scope [P0]
- [x] Add `eq(chartOfAccounts.orgId, orgId)` and `getCurrentOrgId()` to `getAccountById()` in `src/lib/actions/accounts.ts`

---

## Sprint B — P1 High-Priority Fixes (Score: +37 Prod)

### B1: Fix Duplicate Account Code [P1]
- [x] Change "Commission Income" code from "4500" to "4550" in `seedInitialCOA()`

### B2: Redis-Backed Rate Limiting [P1]
- [ ] Replace in-memory Map with Upstash Redis rate limiting
- [ ] Fall back to in-memory if Redis unavailable

### B3: Invoice Transaction Wrap [P1]
- [x] Wrap `createInvoice()` in `db.transaction()`
- [x] Batch insert invoice items together

### B4: Fix N+1 in approveInvoice [P1]
- [ ] Fetch all products with single `inArray()` query
- [ ] Batch all stock updates

### B5: Add DB Indexes [P1]
- [ ] Create Drizzle migration with indexes

### B6: CSRF Protection [P1]
- [ ] Add CSRF token generation and validation

### B7: Fix COGS Trial Balance Type [P1]
- [x] Remove `"cost_of_goods_sold"` from normalDebit check in `src/lib/accounting.ts:86`

### B8: Filter Draft Journal Entries [P1]
- [x] Add status != 'draft' filter to accounting.ts balance sheet
- [x] Add status != 'draft' filter to reports.ts balance sheet & trial balance

### B9: Account Lookup by SubType [P1]
- [ ] Replace name-based Account lookup with subType

---

## Sprint C — P2 Code Quality (Score: +15 Prod, +2 Market)

### C1: Remove `any` Types [P2]
- [ ] Replace `any` in `sales.ts:195` with `Partial<typeof customers.$inferInsert>`
- [ ] Audit all action files for `any` types

### C2: Improve Error Messages [P2]
- [ ] Add `console.error()` before returning sanitized messages

### C3: Dynamic Company Name [P2]
- [ ] Fetch org name from DB in dashboard layout

### C4: Dynamic Plan Display [P2]
- [ ] Fetch `org.planType` from DB, remove hardcoded text

### C5: Fix JE Number Generation [P2]
- [ ] Use SQL COUNT instead of loading all rows

---

## Sprint D — Major Feature Additions (Score: +45 Market, +10 Prod)

### D1: Cash Flow Statement [P0/Market]
- [ ] Build from balance sheet changes between periods
- [ ] Operating / Investing / Financing sections

### D2: Stripe Billing Integration [P0/Market]
- [ ] Install Stripe SDK, checkout session, webhooks, plan gating

### D3: Prior-Period Locking [P0/Market]
- [ ] Add fiscal period table, lock entries for closed periods

### D4: Pagination [P2/Market]
- [ ] Add offset/limit to all list queries + UI controls

### D5: Test Coverage [P2/Prod]
- [ ] Unit tests for accounting engine, integration tests

### D6: Error Monitoring [P2/Prod]
- [ ] Add Sentry or structured logging

### D7: Mobile Responsiveness [P2/Market]
- [ ] Responsive tables, mobile navigation

### D8: Full 2FA Enforcement [P2/Market]
- [ ] Force 2FA for admins, block until configured

### D9: Complete Audit Trail [P2/Prod]
- [ ] Add audit logs for all remaining mutations

---

## Weekly Execution Plan

| Week | Focus | Sprints | Expected Score After |
|------|-------|---------|---------------------|
| 1 | All P0 fixes | Sprint A | Prod: 65, Market: 40 |
| 2 | P1 database/auth fixes | Sprint B | Prod: 80, Market: 40 |
| 3 | P2 code quality + Cash Flow | Sprint C + D1 | Prod: 85, Market: 55 |
| 4 | Stripe billing | D2 | Prod: 85, Market: 70 |
| 5 | Prior-period locking + pagination | D3 + D4 | Prod: 88, Market: 80 |
| 6 | Tests + monitoring + mobile | D5 + D6 + D7 | Prod: 95, Market: 90 |
| 7 | Polish + 2FA + audit trail | D8 + D9 | Prod: 98, Market: 95 |
| 8 | Final hardening | All remaining | Prod: 100, Market: 100 |
