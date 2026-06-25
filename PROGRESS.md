# NexaBook — Progress Tracker

## Status: ✅ Completed — Sprint M (Multi-Company Consolidation)
## Current Sprint: 16 complete
## Last Completed: Sprint M — Multi-Company Consolidation

---

## PHASE A — CORRECTNESS FIXES (Estimated: 5-7 days)

- [x] A1: Shipping Charges Trial Balance Fix (🔴 Critical)
- [x] A2: Input Tax Account Seed Fix (🔴 Critical)
- [x] A3: EOBI Payable Account Seed Fix (🔴 Critical)
- [x] A4: Payment Method → Correct Account Fix (🟠 High)
- [x] A5: Stock Adjustments → GL Post (🟠 High)
- [x] A6: `validateJournalBalance` Enforce (🟠 High)
- [x] A7: Duplicate Functions Fix (🟠 High)
- [x] A8: Journal Number Race Condition (🟡 Medium)
- [x] A9: SQL Injection Fix (🟡 Medium)
- [x] A10: Document Deletion → GL Reversal (🟡 Medium)
- [x] A11: FIFO/WAC Real Implementation (🟠 High)

## PHASE B — COMPLIANCE & TAX FEATURES (Estimated: 5-7 days)

- [x] B1: WHT (Withholding Tax) Management
- [x] B2: Provincial Sales Tax (SRB/PRA/KPRA/BRA)
- [x] B3: Input/Output Tax GL Separation
- [x] B4: FBR E-Invoicing Integration

## PHASE C — ENTERPRISE FEATURES (Estimated: 10-14 days)

- [x] C1: Multi-Currency Support
- [x] C2: Bank Reconciliation (Statement Import)
- [x] C3: Serial Number Management
- [x] C4: Barcode Designer & Printing
- [x] C5: WhatsApp Integration

## PHASE D — SPLENDID PARITY (Estimated: 7-10 days)

- [x] D1: POS Enhancement
- [x] D2: Import/Export Products (CSV/Excel)
- [x] D3: Custom Product Attributes
- [x] D4: Sales Geography & Sales Team
- [x] D5: Opening Balance Entry

## PHASE E — POLISH & TESTING (Estimated: 5-7 days)

- [ ] E1: TypeScript Build Errors Fix
- [ ] E2: Testing Setup
- [x] E1: TypeScript Build Errors Fix
- [x] E2: Testing Setup (Vitest + 24 tests)
- [x] E3: UI/UX Polish (Error Boundary, Skeleton usage)
- [x] E4: Performance Optimization (N+1 queries fixed in reports.ts + accounting.ts)

### Phase F — Market Readiness
- [x] F1: Urdu Translation (next-intl + LanguageToggle + RTL)
- [x] F2: Payment Gateway Integration (JazzCash + Easypaisa)
- [x] F3: AI Assistant Chatbot (RAG)

---

## PHASE G — AUDIT FIXES & ROADMAP SPRINTS

### Sprint 1 — Critical Bugs Fix
- [x] 1.1 Trial Balance: Net balance instead of gross debits/credits
- [x] 1.2 COA Auto-Seeding on signup (already works)
- [x] 1.3 Navigation badge counts — removed hardcoded badges
- [x] 1.4 Badge TypeScript variants — already correct
- [x] 1.5 Opening Balance OBE double contra fix

### Sprint 2 — PDF Invoice
- [x] 2.1 jsPDF dependency installed
- [x] 2.2 Invoice PDF template with professional design
- [x] 2.3 FBR QR code integration in PDF
- [x] 2.4 Download button in invoice list page

### Sprint 3 — Smart Onboarding Wizard
- [x] 3.1 Onboarding schema (`onboarding_progress` table)
- [x] 3.2 5-step onboarding wizard page
- [x] 3.3 Redirect new users to onboarding

### Sprint 4 — NexaBot Upgrade
- [x] 4.1 Gemini SDK integration
- [x] 4.2 Roman Urdu + English mixed language support
- [x] 4.3 More data retrievers (topCustomers, lowStock, overdueInvoices, etc.)

### Sprint 5 — Automated Payment Reminders
- [x] 5.1 Reminder settings schema (`reminder_settings` table)
- [x] 5.2 Cron job for daily reminders (`/api/cron/payment-reminders`)
- [ ] 5.3 Reminder settings UI

### Sprint 6 — Recurring Invoice Auto-Generation
- [x] 6.1 Schema exists — cron auto-trigger needed
- [x] 6.2 Cron job (`/api/cron/recurring-invoices`)
- [ ] 6.3 `vercel.json` cron configuration

### Sprint 7 — Low Stock Alerts
- [x] 7.1 Low stock logic already exists
- [x] 7.2 Dashboard widget showing low stock count
- [x] 7.3 Cron for low stock notifications (`/api/cron/low-stock`)

### Sprint 8 — UX Improvements
- [x] 8.1 Command palette (Ctrl+K) — cmdk integration
- [x] 8.2 Meaningful error messages helper (all journal entry errors + action messages fixed)

### Sprint 9 — Security & Performance
- [x] 9.1 Rate limiting on API routes (`src/middleware.ts` — 30 req/min per IP)
- [x] 9.2 Fix DB count queries (no `.length + 1` pattern found — already clean)
- [x] 9.3 TypeScript fixes (0 errors — `npx tsc --noEmit` passes)

### Sprint 10 — Islamic Finance Mode
- [x] 10.1 Islamic finance settings columns in `organizations` table
- [ ] 10.2 Islamic terminology mapping (UI)
- [ ] 10.3 Zakat calculator (UI)

### Sprint K — Two-Factor Authentication
- [x] K1: Clerk 2FA configuration — security settings page at `/settings/security`
- [x] K2: Force 2FA for admin role — warning banner in dashboard if 2FA disabled

### Sprint N — Project Management + Timesheets
- [x] N1: `projects` + `tasks` + `timesheets` schema in `src/db/schema.ts`
- [x] N2: Server actions in `src/lib/actions/projects.ts` (full CRUD + profitability)
- [x] N3: Project list UI at `/projects` — card grid with create/edit dialog
- [x] N4: Project detail at `/projects/[id]` — inline task board with status management
- [x] N5: Timesheet UI at `/timesheets` — log time, submit/approve/reject workflow
- [x] N6: Project profitability report at `/reports/project-profitability`
- [x] N7: Navigation — sidebar items for Projects, Timesheets, report

### Sprint L — Bank Feeds (Auto-Sync)
- [x] L1: `bankConnections` schema + provider interface + MockBank provider + service layer
- [x] L2: Auto-import daily cron at `/api/cron/bank-feeds` + settings UI at `/settings/bank-feeds`
- [x] L3: Server actions — CRUD connections, manual sync, bulk sync

### Sprint O — WHT Certificates & Statements
- [x] O1: WHT Certificate PDF generation — formal certificate with org/vendor details, transaction table, declaration
- [x] O2: Vendor-wise WHT statement via `getWHTVendorStatement` action + PDF download API
- [x] O3: Annual WHT return summary at `/reports/wht-return` — quarterly breakdown per vendor

### Sprint M — Multi-Company Consolidation
- [x] M1: `parentOrgId` + `consolidationEnabled` columns in `organizations` table + relations
- [x] M2: Org hierarchy server actions — `getOrgHierarchy`, `linkChildOrg`, `unlinkChildOrg`, `getAvailableOrgsForConsolidation`
- [x] M3: Consolidation settings UI at `/settings/consolidation` — link/unlink child companies
- [x] M4: Consolidated P&L report at `/reports/consolidated-pl` — per-org breakdown with totals
- [x] M5: Consolidated Balance Sheet at `/reports/consolidated-balance-sheet` — per-org breakdown with totals
- [x] M6: Navigation — sidebar items under Reports + Settings
- [x] M7: Migration SQL at `drizzle/0004_consolidation.sql`

---
1. `cat ROADMAP.md` — poori planning dekhein
2. `cat PROGRESS.md` — kahan tak hua hai dekhein
3. Mujhe bata dein: "Phase G Sprint X task Y se shuru karo"
