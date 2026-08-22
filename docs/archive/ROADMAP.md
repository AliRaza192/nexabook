# NexaBook — Complete Bug Fix + Feature Roadmap

## Merge of All Findings (AliAnalysis + Claude + QwenFeatures)

**Goal:** Splendid Accounts 100% Clone + Additional Features
**Strategy:** Pehle bugs fix, phir features add
**Process:** Aap sirf "next" bolenge, main sab kuch karunga

---

## PHASE A — CORRECTNESS FIXES (Estimated: 5-7 days)
### "Accounting ko sahi karo, bugs hatayo"

### A1: Shipping Charges Trial Balance Fix (🔴 Critical)
**Files:** `src/lib/actions/sales.ts`
**What:** `approveInvoice()` mein shipping aur round-off ka journal entry line nahi banta → Trial Balance unbalance
**How:**
- Seed COA mein "4200 - Shipping Revenue" account already hai
- Jab `shippingCharges > 0`, extra credit line add karo
- Jab `roundOff > 0`, extra debit/credit line add karo

### A2: Input Tax Account Seed Fix (🔴 Critical)
**Files:** `src/lib/actions/shared.ts`
**What:** Purchase approve karte waqt "Input Tax" account by name search hota hai jo seed mein exist nahi → purchase fail
**How:**
- COA seed mein "Input Tax" (code 2300, subType: tax_receivable) add karo
- Purchase module mein lookup by `subType` karo, name-based nahi

### A3: EOBI Payable Account Seed Fix (🔴 Critical)
**Files:** `src/lib/actions/shared.ts` + `src/lib/accounting.ts`
**What:** Payroll posting mein `eobi_payable` subType wala account seed mein nahi → payroll fail
**How:**
- COA seed mein "EOBI Payable" (code 2420, subType: eobi_payable) add karo

### A4: Payment Method → Correct Account Fix (🟠 High)
**Files:** `src/lib/actions/sales.ts` + `src/lib/actions/purchases.ts`
**What:** Customer payment hamesha "cash" account hit karta hai, payment method ignore
**How:**
- `bankAccounts` table mein `chartOfAccountId` field verify/add karo
- Payment method ke hisaab se conditional account select:
  - `cash` → Cash account
  - `bank_transfer`/`online`/`cheque`/`credit_card` → Bank account

### A5: Stock Adjustments → GL Post (🟠 High)
**Files:** `src/lib/actions/adjustments.ts`
**What:** Stock adjustment par journal entry nahi banti → GL overstated
**How:**
- Har adjustment type ke liye journal entry banayein:
  - Damage/lost/expired: Debit "Loss on Inventory Write-off" → Credit "Inventory"
  - Found/correction +ve: Debit "Inventory" → Credit "Inventory Adjustment Income"

### A6: `validateJournalBalance` Enforce (🟠 High)
**Files:** All posting functions (sales.ts, purchases.ts, banking.ts, etc.)
**What:** Har journal posting se pehle balance check enforce karo
**How:**
- Har transaction mein lines array par `validateJournalBalance()` call karo
- False aye to `throw new Error("Journal entry out of balance")` → transaction rollback

### A7: Duplicate Functions Fix (🟠 High)
**Files:** `src/lib/actions/reports.ts`
**What:** 3 functions do-do dafa define hue hain — duplicate implementations
**How:**
- `getSalesInvoiceDetailReport` (line 1435 vs 1575) — merge karo
- `getCustomerBalanceReport` (line 1482 vs 1643) — merge karo
- `getPurchaseInvoiceDetailReport` (line 1504 vs 1862) — merge karo

### A8: Journal Number Race Condition (🟡 Medium)
**Files:** All `generateJournalEntryNumber` etc.
**What:** Concurrent requests same entry number generate kar sakti hain
**How:**
- `journalEntries.entryNumber` par unique constraint add karo
- Numbering ko transaction-safe banao (FOR UPDATE row lock)

### A9: SQL Injection Fix (🟡 Medium)
**Files:** `src/lib/actions/accounts.ts` (getNextVoucherNumber)
**What:** String interpolation in LIKE pattern → SQL injection risk
**How:**
- Parameterized query use karo (`sql` template literal with placeholders)

### A10: Document Deletion → GL Reversal (🟡 Medium)
**Files:** `src/lib/actions/sales.ts` + `purchases.ts`
**What:** Invoice delete par GL entry orphan ho jati hai
**How:**
- Delete function mein pehle journal entry ko "reversed" mark karo
- Reverse entry create karo (debits ↔ credits)

### A11: FIFO/WAC Real Implementation (🟠 High)
**Files:** `src/lib/actions/inventory-depth.ts`, `src/lib/actions/sales.ts`
**What:** FIFO/Weighted Average sirf cosmetic hai, real batch-based calculation nahi
**How:**
- `runStockValuation` ko `productBatches` table se actual cost lekar calculate karo
- Sales COGS: batch-specific cost use karo (FIFO order)
- Purchases par correct batch cost track karo

---

## PHASE B — COMPLIANCE & TAX FEATURES (Estimated: 5-7 days)
### "Pakistan ke tax rules ke mutabiq complete karo"

### B1: WHT (Withholding Tax) Management
**Files:** New + modifications in schema.ts, accounts.ts, reports.ts
**What:** Section 153 WHT tracking
**How:**
- COA mein "WHT Receivable" + "WHT Payable" accounts add karo
- Vendor payment par WHT deduct karo
- WHT report ko proper banao (abhi placeholder hai)

### B2: Provincial Sales Tax (SRB/PRA/KPRA/BRA)
**Files:** schema.ts, accounts.ts, reports.ts
**What:** Separate accounts + reports for each province
**How:**
- COA mein SRB/PRA/KPRA/BRA payable accounts add karo
- Tax forms mein province selector add karo
- Provincial tax reports banayein

### B3: Input/Output Tax GL Separation
**Files:** schema.ts, sales.ts, purchases.ts
**What:** GST-3 return ke liye input/output tax separate GL accounts
**How:**
- Sales → Output Tax (tax_payable)
- Purchases → Input Tax (tax_receivable)
- Net GST Payable = Output - Input ka report

### B4: FBR E-Invoicing Integration
**Files:** New + existing invoice flow
**What:** FBR ko directly invoice submit karo
**How:**
- FBR API integration (Production POS integration)
- Invoice approve hote hi FBR ko auto-submit
- FBR response number invoice par save karo

---

## PHASE C — ENTERPRISE FEATURES (Estimated: 10-14 days)
### "Splendid se aage jane wale features"

### C1: Multi-Currency Support
**Files:** schema.ts, invoices, purchases, reports
**What:** USD/EUR/SAR etc. support
**How:**
- Exchange rate table banayein
- Invoice/Purchase mein currency selector
- Realized/unrealized gain-loss accounts
- Multi-currency reports

### C2: Bank Reconciliation (Statement Import)
**Files:** New + existing
**What:** Bank statement CSV import → auto-match with GL
**How:**
- CSV parser banayein
- Auto-matching algorithm (amount + date + reference)
- Reconciliation report

### C3: Serial Number Management
**Files:** schema.ts, products, sales
**What:** Har product unit ka unique serial track
**How:**
- `serialNumber` table banayein
- Purchase par serial number entry
- Sale par serial number assign karo
- Warranty tracking

### C4: Barcode Designer & Printing
**Files:** New
**What:** Barcode labels design + print
**How:**
- Barcode generator library integrate karo
- Label designer UI
- Thermal printer support

### C5: WhatsApp Integration
**Files:** New
**What:** Invoice/Quotation WhatsApp par send
**How:**
- WhatsApp Business API ya third-party (WATI/WhatsApp Cloud API)
- Share button ke saath integration

---

## PHASE D — SPLENDID PARITY (Estimated: 7-10 days)
### "Jo features Splendid mein hain aur NexaBook mein nahi"

### D1: POS Enhancement
**Files:** pos/
**What:** Loyalty programs, discounts, keyboard shortcuts
**How:**
- Loyalty points system
- Customer default discount
- Keyboard shortcuts (F1=Pay, F2=New, etc.)
- POS settings panel

### D2: Import/Export Products (CSV/Excel)
**Files:** inventory/
**What:** Bulk product import/export
**How:**
- CSV parser with validation
- Export template generator
- Error reporting for failed imports

### D3: Custom Product Attributes
**Files:** products/
**What:** Size/Color/Weight custom fields
**How:**
- `productAttributes` table banayein
- Dynamic attribute UI
- Attribute-based search

### D4: Sales Geography & Sales Team
**Files:** customers, sales/
**What:** Area-based customer tracking + salesperson assignment
**How:**
- Customer ko region/area assign karo
- Salesperson ko territory assign karo
- Geography-based reports

### D5: Opening Balance Entry
**Files:** chart-of-accounts/
**What:** Purana data migrate karne ka flow
**How:**
- Opening balance journal entry form
- Bulk opening balance import

---

## PHASE E — POLISH & TESTING (Estimated: 5-7 days)
### "Production ready banao"

### E1: TypeScript Build Errors Fix
**Files:** All
**What:** `npx tsc --noEmit` clean karo
**How:**
- Saari type errors fix karo
- Strict mode enable karo

### E2: Testing Setup
**Files:** New
**What:** Basic test suite
**How:**
- Vitest setup karo
- Core accounting functions ke tests likho
- API route tests

### E3: UI/UX Polish
**Files:** All components
**What:** Loading states, empty states, error handling
**How:**
- Skeleton loaders
- Toast notifications
- Error boundaries

### E4: Performance Optimization
**Files:** reports.ts, accounting.ts
**What:** N+1 queries fix, caching
**How:**
- `reports.ts` ke N+1 queries ko optimize karo
- React cache + server-side caching

---

## TOTAL TIME ESTIMATE

| Phase | Days | Cumulative |
|-------|------|------------|
| **Phase A** — Bugs Fix | 5-7 | 7 |
| **Phase B** — Tax Compliance | 5-7 | 14 |
| **Phase C** — Enterprise | 10-14 | 28 |
| **Phase D** — Splendid Parity | 7-10 | 38 |
| **Phase E** — Polish | 5-7 | 45 |

**Total: ~45 days (6-7 weeks) full-time**

---

## COMMIT LOG STRUCTURE

Har sub-task k baad ye commit message pattern use karo:

```
<emoji> <Module>: <What fixed/added>

Examples:
🐛 sales: Fix shipping charges causing trial balance imbalance
🐛 purchases: Fix Input Tax account lookup — using subType instead of name
🐛 payroll: Add missing EOBI Payable account to COA seed
✨ accounts: Add multi-currency support with exchange rate table
📦 reports: Merge duplicate function implementations
🔒 security: Fix SQL injection in voucher number generation
⚡ performance: Optimize N+1 queries in trial balance report
🧪 test: Add Vitest setup + core accounting tests
✅ chore: Run TypeScript strict check — all errors resolved
```

---

## PHASE F — MARKET READINESS (Estimated: 8-10 days)
### "Production-ready + competitive banao"

### F1: Urdu Translation (next-intl)
**Files:** All pages + components
**What:** Complete Urdu/English bilingual support with RTL layout
**How:**
- `npm install next-intl`
- Script se saari hardcoded English strings extract karo → `messages/en.json`
- Urdu translations generate karo → `messages/ur.json`
- `LanguageToggle` component in header
- RTL CSS for Urdu layout (Tailwind RTL plugins)
- Auto-detect browser language

### F2: Payment Gateway Integration
**Files:** new payment module
**What:** JazzCash + Easypaisa integration for POS and invoices
**How:**
- `paymentTransactions` table (transactionId, gateway, amount, status, invoiceId)
- JazzCash Merchant API integration (JazzCash PG Sandbox)
- Easypaisa Merchant API integration
- Webhook/callback handlers for payment status updates
- `Pay Now` button on invoices and POS checkout
- Auto-update invoice.receivedAmount on successful payment

### F3: AI Assistant Chatbot (RAG)
**Files:** new AI module
**What:** In-app AI assistant that answers accounting questions using live data
**How:**
- RAG engine: user question → fetch relevant report data → LLM → human answer
- Local Ollama (free, Llama 3.2/Phi-4) or OpenAI API (optional)
- Context builder: fetches real-time P&L, Trial Balance, Sales Tax, etc.
- Chat UI: floating button + dialog with message bubbles
- No vector DB needed (structured accounting data, not documents)

---

## INSTRUCTIONS FOR USAGE

1. **Aap ka role:** Sirf `next` bolna hai har step ke baad
2. **Mera role:** Code likhna, test karna, commit karna
3. **API Keys:** Jab zaroorat ho gi (e.g., FBR API, WhatsApp API), main puchunga
4. **Git:** Har sub-task ke baad commit. Aap push karna (main nahi karunga)
5. **Testing:** Phase E mein testing setup hoga. Tab tak manual verify karte jayenge

---

**Current Status: F1 (Urdu Translation) in progress — "next" bolte hi F2 shuru karunga.**
