# NexaBook — Project Context & Analysis
**Generated:** 2026-07-08  
**Version:** 3.0  
**Owner:** Ali Raza  
**Language:** Urdu/English

---

## Executive Summary

NexaBook is a **Cloud ERP & Accounting System** specifically built for Pakistan's small businesses. It's a real-world production platform targeting accountants, business owners, and CFOs.

**Current Status:** Phase G Complete (All Major Features Built) — but has critical security and accounting corrections needed before production launch.

**Codebase Size:** ~323 TS files, 4.9MB source code, 31+ documentation files, 100+ database tables

**Tech Stack:**
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5.7, Tailwind CSS, Shadcn UI, Framer Motion
- **Backend:** Next.js Server Actions, Clerk (Auth), Drizzle ORM
- **Database:** Neon PostgreSQL (Serverless)
- **AI:** Gemini 2.0 Flash (free tier)
- **Payment:** JazzCash, Easypaisa (Pakistan-local), Stripe (ready)
- **Email:** Resend (100/day free)
- **Hosting:** Vercel (free tier)

---

## What's Currently Built ✅

### 1. Core Modules (Complete)

| Module | Features | Status |
|--------|----------|--------|
| **Sales** | Invoices, Quotations, Sales Orders, Recurring Billing, Returns, Delivery Tracking | ✅ Done |
| **Purchases** | POs, GRNs, Vendor Bills, Payments, Settlements | ✅ Done |
| **Accounting** | Chart of Accounts, Journal Entries, Trial Balance, P&L, Balance Sheet, Ledger | ✅ Done |
| **Inventory** | Stock Movement, Batch Tracking, Warehouses, FIFO/WAC Valuation | ✅ Done |
| **HR & Payroll** | Employee Management, Attendance, Salary Processing, Leave Management, Payslips | ✅ Done |
| **POS** | Fast checkout, Shift management, Discount/Tax handling | ✅ Done |
| **Fixed Assets** | Asset Register, Depreciation, Disposal | ✅ Done |
| **Manufacturing** | BOM, Job Orders | ✅ Done |
| **CRM** | Leads, Tickets, Loyalty Programs, Sales Team | ✅ Done |
| **Projects** | Project Management, Tasks, Timesheets, Profitability | ✅ Done |
| **Reports** | 100+ comprehensive reports (financial, operational) | ✅ Done |

### 2. Pakistan Compliance ✅

- **FBR Integration:** E-invoicing, QR codes, Tax certificates
- **Tax Management:** Sales Tax (SST/PST), Input Tax, Withholding Tax (WHT)
- **Validation:** NTN/STRN format checks
- **Formatting:** Pakistani number system (lakhs/crores), Urdu UI
- **Documents:** Supports FBR tax invoices, WHT certificates

### 3. Enterprise Features ✅

- Multi-branch support (company hierarchy)
- Multi-currency handling
- Bank reconciliation (statement import)
- Advanced RBAC (Role-Based Access Control)
- Period locking & fiscal management
- Consolidated reporting (multi-company)
- Audit logging
- 2FA (Two-Factor Authentication)

### 4. Digital Features ✅

- **NexaBot:** AI chatbot (RAG-powered with Gemini)
- **WhatsApp Integration:** Invoice/reminder distribution
- **Payment Gateways:** JazzCash, Easypaisa, Stripe
- **Serialization:** Serial numbers, Barcodes, QR codes
- **Export:** Excel, PDF invoices
- **Cron Jobs:** Recurring invoices, payment reminders, low stock alerts, bank feeds

---

## Critical Issues Found 🔴

### **TIER 1: Security (Must Fix Before Production)**

| Issue | Impact | Priority |
|-------|--------|----------|
| No middleware authentication on pages — only component-level auth | Unauthenticated users can see page source/layout before redirect | **P0** |
| No org-scoping middleware — relies on every server action remembering `orgId` filter | Single forgotten `eq(table.orgId, orgId)` leaks data across tenants | **P0** |
| No Row-Level Security (RLS) in PostgreSQL | SQL injection vulnerability — direct DB access bypasses app logic | **P0** |
| Auto-org creation in `getCurrentOrgId()` — any Clerk user gets an org | Fraud/spam potential, org enumeration | **P1** |

### **TIER 2: Accounting Correctness (Financial Integrity)**

| Issue | Impact | Priority |
|-------|--------|----------|
| Balance sheet doesn't filter by date — includes future transactions | Balance sheet won't balance for any specific date, period reports useless | **P0** |
| P&L double-counts — queries both invoices AND journal entries | Net profit calculation wrong (can be off by 2x) | **P0** |
| Reversed entries not filtered from reports | Voided invoices still show in financial statements | **P0** |
| Duplicate COA codes (4500 appears twice) | Constraint violation on seed, seeding fails silently | **P1** |
| Account lookup by name instead of type | Custom account names break invoice posting | **P1** |
| Manual journal entries created as "draft" but included in reports | Draft entries shouldn't affect financials | **P1** |
| Trial balance includes COGS as credit-normal instead of debit-normal | Trial balance subtotals wrong | **P2** |

### **TIER 3: Performance (Scalability)**

| Issue | Impact | Priority |
|-------|--------|----------|
| N+1 queries: Journal entry count loaded full result set into memory | Scales to 100K entries → 5+ second queries | **P1** |
| Invoice items inserted in loop with individual `await` calls | Each item = separate DB trip (10 items = 10 round-trips) | **P2** |
| Missing database indexes on frequently queried columns (orgId, status, date) | Table scans instead of index seeks | **P2** |

### **TIER 4: Testing (Quality Assurance)**

| Issue | Impact | Priority |
|-------|--------|----------|
| Only 1 test file with minimal coverage | Accounting bugs ship to production undetected | **P2** |
| No automated integration tests | Multi-step flows (invoice → payment → reconciliation) untested | **P2** |

### **TIER 5: Missing Features (Market Competitiveness)**

| Issue | Impact | Priority |
|-------|--------|----------|
| No subscription billing integration (despite Stripe keys in .env) | Can't charge customers, no revenue model | **P2** |
| No prior-period locking mechanism | Users can edit closed periods (breaks tax compliance) | **P2** |
| No Cash Flow Statement report (has P&L & Balance Sheet) | Incomplete financial reporting | **P3** |

---

## Key Architectural Decisions Made

### 1. **Spec-Driven Development (AgentFactory Framework)**
- Every feature starts with a spec in `specs/` (CONSTITUTION.md defines this)
- Specs describe **behavior only**, not implementation
- Prevents "code first, think later" antipattern

### 2. **Multi-Tenancy by Default**
- Every table has `orgId` foreign key
- All queries MUST filter by org
- Isolation is responsibility of each server action

### 3. **Double-Entry Bookkeeping (Sacred)**
- **Never violate this:** Every transaction creates balanced journal entries
- `journalEntries` (header) + `journalEntryLines` (debits/credits)
- `validateJournalBalance()` enforced on every insert

### 4. **Free Tier Only (No Paid APIs)**
- Gemini API (free: 15 RPM, 1M tokens/day)
- Neon PostgreSQL (free: 10GB, 3 projects)
- Vercel (free: 100GB bandwidth)
- Resend (free: 100 emails/day)

### 5. **Server Actions Over REST API**
- No traditional REST API — all mutations via Server Actions
- This is valid Next.js 14+ pattern
- Reduces boilerplate, automatic type safety

### 6. **Drizzle ORM for Type Safety**
- TypeScript-first ORM — all types auto-generated from schema
- No manual type definitions
- Migrations via `drizzle-kit`

---

## Database Schema (High Level)

**Total Tables:** 100+ (organized by domain)

### Organizations (Multi-Tenant Root)
- `organizations` — company profiles, fiscal year, document numbering
- `profiles` — user → org linking

### Financial Core
- `chart_of_accounts` — account hierarchy
- `journal_entries` + `journal_entry_lines` — all financial transactions
- `fiscal_periods` — period management & locking

### Sales
- `invoices`, `invoice_items` — sales documents
- `quotations`, `sales_orders` — pre-invoicing
- `sales_returns`, `delivery_tracking` — post-sales

### Purchases
- `purchase_invoices`, `purchase_invoice_items` — vendor bills
- `purchase_orders`, `grn` (Goods Receipt Notes) — procurement

### Inventory
- `products` — master data
- `stock_movements` — audit trail
- `stock_valuations` — FIFO/WAC tracking
- `batch_tracking` — expiry/lot management

### HR & Payroll
- `employees` — master data
- `attendance` — daily tracking
- `payroll_processing` — salary runs
- `leave_management` — leave ledger

### Banking
- `bank_accounts` — account master
- `bank_transactions` — imported feed
- `reconciliations` — matching logic
- `bank_connections` — Plaid/SaltEdge setup

### Advanced
- `projects`, `tasks`, `timesheets` — project management
- `manufacturing_bom`, `job_orders` — manufacturing
- `leads`, `tickets`, `loyalty_programs` — CRM
- `webhook_events`, `webhook_deliveries` — integration
- `audit_logs` — security trail

---

## Environment & Deployment

### Current Setup
- **Local Dev:** `npm run dev` (Turbopack, next dev)
- **Database:** Neon PostgreSQL (serverless)
- **Auth:** Clerk (cloud)
- **Hosting:** Vercel (free)
- **Monitoring:** (Not yet configured)

### Free Tier Constraints
- **Database:** 10GB free, 3 projects
- **Compute:** Vercel: 100GB bandwidth/month (enough for MVP)
- **AI:** Gemini: 15 RPM, 1M tokens/day (tight but works)
- **Email:** Resend: 100/day (enough for SMB)

### No Paid Services (Policy)
✅ No Stripe unless explicitly approved  
✅ No SendGrid (using Resend)  
✅ No DataDog (using built-in logging)  
✅ No Auth0 (using Clerk free tier)  

---

## Code Quality Snapshot

**Overall Score:** 72/100 (Good foundation, needs tightening)

| Category | Score | Notes |
|----------|-------|-------|
| TypeScript Strictness | 65 | Some `any` types, unsafe casts |
| Error Handling | 60 | Generic catch → generic error strings |
| Input Validation | 50 | Minimal zod validation at boundaries |
| Testing | 40 | 1 file, minimal coverage |
| Architecture | 8/10 | App Router patterns correct |
| Documentation | 9/10 | 31 docs, comprehensive |

---

## What Works Really Well ✨

1. **Accounting Engine:** Double-entry bookkeeping implemented correctly, journal validation solid
2. **Multi-Tenancy:** Org isolation pattern is sound (just needs middleware enforcement)
3. **Database Design:** Schema is comprehensive, relationships well-modeled
4. **UI/UX:** Modern, responsive, professional design system
5. **Pakistan Localization:** FBR compliance, tax handling, Urdu/English UI, PKR formatting
6. **Documentation:** Exhaustive — 31 guides covering features, workflows, compliance
7. **Feature Completeness:** Almost all ERP modules present

---

## What Needs Work 🔧

1. **Security:** No page-level auth middleware, no RLS
2. **Accounting:** Date filtering, P&L accuracy, report filters
3. **Performance:** N+1 queries, missing indexes
4. **Testing:** Almost no test coverage
5. **Operations:** No error monitoring, no metrics

---

## Next Steps (Dependency Order)

1. **PHASE 1:** Fix critical security + accounting issues
2. **PHASE 2:** Add comprehensive tests
3. **PHASE 3:** Performance optimization
4. **PHASE 4:** Advanced features (billing, period locking)
5. **PHASE 5:** Deployment & monitoring
6. **PHASE 6:** Market launch

---

## How to Use This Document

- **For Next Chat:** "Mujhe NexaBook context dey — PROJECT_CONTEXT.md padh"
- **For Decision Making:** Check [[decisions]] for what was already decided
- **For Understanding Architecture:** See Database Schema section
- **For Prioritization:** See "Critical Issues Found" (Tier 1 = must fix first)

**This document is living. Update when major decisions change or new issues found.**
