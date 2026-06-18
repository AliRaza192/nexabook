# NexaBook — Progress Tracker

## Status: ✅ In Progress — Phase F (Market Readiness)
## Current Phase: F1 — Urdu Translation (next-intl)
## Last Completed: Phase E (Polish & Testing)

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
- [ ] 3.1 Onboarding schema (`onboarding_progress` table)
- [ ] 3.2 5-step onboarding wizard page
- [ ] 3.3 Redirect new users to onboarding

### Sprint 4 — NexaBot Upgrade
- [ ] 4.1 Gemini SDK integration
- [ ] 4.2 Roman Urdu + English mixed language support
- [ ] 4.3 More data retrievers (topCustomers, lowStock, overdueInvoices, etc.)
- [ ] 4.4 Action buttons in chat responses

### Sprint 5 — Automated Payment Reminders
- [ ] 5.1 Reminder settings schema
- [ ] 5.2 Cron job for daily reminders
- [ ] 5.3 Reminder settings UI

### Sprint 6 — Recurring Invoice Auto-Generation
- [ ] 6.1 Schema exists — cron auto-trigger needed
- [ ] 6.2 `vercel.json` cron configuration

### Sprint 7 — Low Stock Alerts
- [x] 7.1 Low stock logic already exists
- [x] 7.2 Dashboard widget showing low stock count
- [ ] 7.3 Cron for low stock notifications

### Sprint 8 — UX Improvements
- [ ] 8.1 Command palette (Ctrl+K)
- [ ] 8.2 Meaningful error messages helper

### Sprint 9 — Security & Performance
- [ ] 9.1 Rate limiting on API routes
- [ ] 9.2 Fix DB count queries (`.length + 1` pattern)
- [ ] 9.3 TypeScript fixes in key files

### Sprint 10 — Islamic Finance Mode
- [ ] 10.1 Islamic finance settings schema
- [ ] 10.2 Islamic terminology mapping
- [ ] 10.3 Zakat calculator

---

**Jab session restart karein:**
1. `cat ROADMAP.md` — poori planning dekhein
2. `cat PROGRESS.md` — kahan tak hua hai dekhein
3. Mujhe bata dein: "Phase G Sprint X task Y se shuru karo"
