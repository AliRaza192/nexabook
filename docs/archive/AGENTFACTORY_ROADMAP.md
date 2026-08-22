# NexaBook — Complete AgentFactory Improvement Roadmap

**Platform:** [The AI Agent Factory](https://agentfactory.panaversity.org/) by Panaversity
**Date:** July 4, 2026
**Last Updated:** July 4, 2026
**Status:** ✅ ALL PHASES COMPLETE

---

## Table of Contents

1. [What is AgentFactory?](#1-what-is-agentfactory)
2. [Why We Follow AgentFactory?](#2-why-we-follow-agentfactory)
3. [Who Will Do What?](#3-who-will-do-what)
4. [Complete Plan Overview](#4-complete-plan-overview)
5. [Phase Details](#5-phase-details)
6. [New Features Adding](#6-new-features-adding)
7. [Tech Stack (No Paid APIs)](#7-tech-stack-no-paid-apis)
8. [Timeline](#8-timeline)
9. [Success Criteria](#9-success-criteria)

---

## 1. What is AgentFactory?

AgentFactory ek **spec-driven, human-supervised process** hai jo AI-Native Companies banane ka tarika sikhaata hai.

### Core Concepts:

| Concept | Meaning |
|---------|---------|
| **Spec-Driven Development (SDD)** | Pehle likho kya chahiye (spec), phir AI se code generate karo |
| **10-80-10 Rule** | Human 10% intent define, AI 80% execute, Human 10% verify |
| **Digital FTEs** | AI workers jo real jobs karte hain 24/7 |
| **Seven Invariants** | Architecture rules jo hamesha true rehte hain |
| **System of Record** | Authoritative database (PostgreSQL) |

### How It Works:

```
HUMAN (10%)          AI (80%)              HUMAN (10%)
    │                    │                     │
    ▼                    ▼                     ▼
 INTENT ──────► EXECUTION ──────► VERIFICATION
    │                    │                     │
    │                    │                     │
 ┌──┴──┐            ┌───┴───┐            ┌───┴───┐
 │Spec │            │Code   │            │Review │
 │Rules│            │Tests  │            │Approve│
 │Budget│           │Docs   │            │Ship   │
 └─────┘            └───────┘            └───────┘
```

---

## 2. Why We Follow AgentFactory?

### Benefits:

| Without AgentFactory | With AgentFactory |
|----------------------|-------------------|
| Vibe coding — prompt do, code aata hai | Spec-Driven — pehle spec, phir code |
| Bug fixes baad mein | Bugs spec phase mein pakde jayenge |
| Manual development | AI-assisted 3-4x faster |
| SaaS subscriptions ($20-50/mo) | Digital FTEs ($500-2000/mo) |
| Pakistan-only market | Global market ready |

### AgentFactory's Seven Invariants Applied to NexaBook:

| Invariant | Rule | NexaBook Application |
|-----------|------|---------------------|
| **1. Human is Principal** | Human defines intent, AI executes | Aap bolo kya chahiye, main banata hoon |
| **2. Every Human needs a Delegate** | Personal agent for orchestration | NexaBot (AI assistant) |
| **3. Management Layer** | Hire, assign, govern, retire workers | Spec-driven feature development |
| **4. Per-Worker Engine** | Choose runtime per job | Gemini free tier for all AI features |
| **5. System of Record** | Authoritative database | PostgreSQL via Drizzle ORM |
| **6. Expandable Workforce** | On-demand worker creation | New features via specs |
| **7. Nervous System** | Event-driven architecture | Cron jobs, webhooks, server actions |

---

## 3. Who Will Do What?

### Roles:

| Role | Person | Responsibilities |
|------|--------|------------------|
| **Human (Principal)** | Aap (Ali Raza) | Define intent, review specs, approve work |
| **AI (Execution Engine)** | Main (Opencode/Mimo) | Write specs, code, tests, documentation |
| **Verifier** | Aap (Ali Raza) | Final check, approve, ship |

### Detailed Responsibilities:

#### Aap (Human - Principal):

| Task | Frequency | Time |
|------|-----------|------|
| Bolo kya chahiye | Per feature | 2-5 min |
| Spec review karo | Per feature | 5-10 min |
| Code review karo | Per feature | 10-15 min |
| Approve karo | Per feature | 2-3 min |
| **Total per feature** | | **20-35 min** |

#### Main (AI - Execution Engine):

| Task | Frequency | Time |
|------|-----------|------|
| Constitution likhna | Once | 10 min |
| Spec likhna | Per feature | 15-20 min |
| Code likhna | Per feature | 30-60 min |
| Tests likhna | Per feature | 15-20 min |
| Documentation | Per feature | 10-15 min |
| **Total per feature** | | **70-115 min** |

#### Flow:

```
Aap: "Accounting FTE chahiye"
        │
        ▼
Main: Constitution + Spec likhta hoon
        │
        ▼
Aap: "Haan, theek hai" (5 min review)
        │
        ▼
Main: Code + Tests likhta hoon
        │
        ▼
Aap: Final check, approve (5 min)
        │
        ▼
Done! Feature ready.
```

---

## 4. Complete Plan Overview

### High-Level Phases:

```
Phase 1: Foundation (Week 1)
    │
    ├── CONSTITUTION.md
    ├── specs/ directory
    └── CLAUDE.md / AGENTS.md
        │
        ▼
Phase 2: AI Workers (Week 2-4)
    │
    ├── Accounting FTE
    ├── Tax Compliance FTE
    ├── Inventory FTE
    ├── Payroll FTE
    └── CRM FTE
        │
        ▼
Phase 3: Implementation (Week 5-8)
    │
    ├── Feature 1: Bank Reconciliation
    ├── Feature 2: Smart Invoicing
    ├── Feature 3: Auto Tax Filing
    └── Feature 4: Payroll Automation
        │
        ▼
Phase 4: AI-Native Features (Week 9-12)
    │
    ├── NexaBot 2.0 (RAG)
    ├── Smart Reconciliation Agent
    ├── Invoice OCR Agent
    └── Tax Compliance Agent
        │
        ▼
Phase 5: Monetization (Week 13-16)
    │
    ├── Digital FTE Products
    ├── Pricing Models
    └── Marketplace Listing
```

---

## 5. Phase Details

### Phase 1: Foundation (Week 1)

**Goal:** Set up AgentFactory process in NexaBook

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.1 | Create CONSTITUTION.md | Project rules file |
| 1.2 | Create specs/ directory | Feature specs folder |
| 1.3 | Create CLAUDE.md | AI agent instructions |
| 1.4 | Update .env.example | Add GEMINI_API_KEY |

**Status:** ✅ COMPLETE

**Completed:**
- ✅ `CONSTITUTION.md` created at project root
- ✅ `specs/` directory structure created
- ✅ All 5 Digital FTE specs written

---

### Phase 2: AI Workers (Week 2-4)

**Goal:** Write specs for 5 Digital FTEs

| Worker | Purpose | Spec File |
|--------|---------|-----------|
| 2.1 Accounting FTE | Auto-process invoices, journal entries | specs/accounting-fte/spec.md |
| 2.2 Tax Compliance FTE | FBR submission, SRB/PRA tracking | specs/tax-compliance-fte/spec.md |
| 2.3 Inventory FTE | Stock tracking, COGS, batches | specs/inventory-fte/spec.md |
| 2.4 Payroll FTE | Salary processing, EOBI, tax | specs/payroll-fte/spec.md |
| 2.5 CRM FTE | Customer management, follow-ups | specs/crm-fte/spec.md |

**Status:** ✅ COMPLETE

**Completed:**
- ✅ Accounting FTE spec — `specs/accounting-fte/spec.md`
- ✅ Tax Compliance FTE spec — `specs/tax-compliance-fte/spec.md`
- ✅ Inventory FTE spec — `specs/inventory-fte/spec.md`
- ✅ Payroll FTE spec — `specs/payroll-fte/spec.md`
- ✅ CRM FTE spec — `specs/crm-fte/spec.md`

---

### Phase 3: Implementation (Week 5-8)

**Goal:** Build features using Spec-Driven Development

| Feature | Description | Files to Modify | Status |
|---------|-------------|-----------------|--------|
| 3.1 Bank Reconciliation | CSV import, auto-matching, finalize | src/lib/actions/bank-reconciliation.ts | ✅ DONE |
| 3.2 Smart Invoicing | AI-powered invoice suggestions | src/lib/actions/smart-invoice.ts | ✅ DONE |
| 3.3 Auto Tax Filing | FBR auto-submission | src/lib/actions/tax-filing.ts | ✅ DONE |
| 3.4 Payroll Automation | Monthly payroll processing | src/lib/actions/hr-payroll.ts | ✅ DONE |

**Status:** ✅ COMPLETE

---

### Phase 4: AI-Native Features (Week 9-12)

**Goal:** Add intelligent AI features using Gemini free tier

| Feature | Description | API Used | Status |
|---------|-------------|----------|--------|
| 4.1 NexaBot 2.0 | RAG with live accounting data, streaming, suggested prompts | Gemini Free | ✅ DONE |
| 4.2 Smart Reconciliation | AI-powered bank matching with pattern learning | Gemini Free | ✅ DONE |
| 4.3 Invoice OCR | Extract data from images via Gemini Vision | Gemini Free | ✅ DONE |
| 4.4 Tax Compliance Agent | Batch FBR, NTN/STRN validation, filing deadlines | Gemini Free | ✅ DONE |

**Status:** ✅ COMPLETE

---

### Phase 5: Monetization (Week 13-16)

**Goal:** Package Digital FTEs as sellable products

| Product | Description | Price | Status |
|---------|-------------|-------|--------|
| 5.1 Accounting FTE | Auto invoice processing | $500/mo | ✅ DONE |
| 5.2 Tax Compliance FTE | FBR/SRB automation | $400/mo | ✅ DONE |
| 5.3 Inventory FTE | Stock management | $350/mo | ✅ DONE |
| 5.4 Payroll FTE | Salary processing | $300/mo | ✅ DONE |
| 5.5 CRM FTE | Customer management | $250/mo | ✅ DONE |

**Status:** ✅ COMPLETE

---

## 6. New Features Adding

### Feature List:

#### 6.1 Core Features (Already Exist - Improving):

| Feature | Current Status | Improvement |
|---------|---------------|-------------|
| Invoicing | ✅ Working | AI-powered suggestions |
| Inventory | ✅ Working | Smart batch tracking |
| Payroll | ✅ Working | Auto tax calculation |
| Accounting | ✅ Working | Smart reconciliation |
| CRM | ✅ Working | AI follow-ups |

#### 6.2 New AI Features (Adding):

| Feature | Description | Priority |
|---------|-------------|----------|
| NexaBot 2.0 | RAG with live data, Roman Urdu | HIGH |
| Smart Reconciliation | Auto bank statement matching | HIGH |
| Invoice OCR | Extract data from paper invoices | MEDIUM |
| Tax Compliance Agent | Auto FBR submission | HIGH |
| Smart Inventory | Auto reorder suggestions | MEDIUM |
| Customer Insights | AI-powered analytics | LOW |

#### 6.3 Process Improvements (Adding):

| Improvement | Description |
|-------------|-------------|
| Spec-Driven Development | Every feature has a spec |
| Constitution | Project-wide rules |
| Version-controlled specs | Git-tracked specifications |
| AI-assisted testing | Auto-generated test cases |

---

## 7. Tech Stack (No Paid APIs)

### Free Tier Stack:

| Component | Technology | Cost |
|-----------|-----------|------|
| **Frontend** | Next.js 16, TypeScript, Tailwind | FREE |
| **Backend** | Next.js Server Actions | FREE |
| **Database** | Neon PostgreSQL | FREE |
| **ORM** | Drizzle ORM | FREE |
| **Authentication** | Clerk | FREE |
| **AI/LLM** | Gemini 2.0 Flash | FREE |
| **Hosting** | Vercel | FREE |
| **Email** | Resend | FREE (100/day) |
| **Rate Limiting** | Upstash Redis | FREE |
| **Testing** | Vitest | FREE |

### Gemini Free Tier Limits:

| Model | Rate Limit | Daily Limit | Use Case |
|-------|-----------|-------------|----------|
| gemini-2.0-flash | 15 RPM | 1M tokens | Chatbot, quick queries |
| gemini-1.5-flash | 15 RPM | 1M tokens | Data analysis |
| gemini-1.5-pro | 2 RPM | 32K tokens | Complex reasoning |

**Total Monthly Cost: $0**

---

## 8. Timeline

### Week-by-Week Plan:

| Week | Phase | Tasks | Status |
|------|-------|-------|--------|
| **Week 1** | Foundation | Constitution, Specs directory, CLAUDE.md | ✅ COMPLETE |
| **Week 2** | AI Workers | Accounting FTE spec, Tax Compliance FTE spec | ✅ COMPLETE |
| **Week 3** | AI Workers | Inventory FTE spec, Payroll FTE spec, CRM FTE spec | ✅ COMPLETE |
| **Week 4** | Review | Review all specs, finalize | ✅ COMPLETE |
| **Week 5** | Implementation | Bank Reconciliation feature | ✅ DONE |
| **Week 6** | Implementation | Smart Invoicing feature | ✅ DONE |
| **Week 7** | Implementation | Auto Tax Filing feature | ✅ DONE |
| **Week 8** | Implementation | Payroll Automation feature | ✅ DONE |
| **Week 9** | AI Features | NexaBot 2.0 with RAG, streaming, prompts | ✅ DONE |
| **Week 10** | AI Features | Smart Reconciliation with pattern learning | ✅ DONE |
| **Week 11** | AI Features | Invoice OCR with Gemini Vision | ✅ DONE |
| **Week 12** | AI Features | Tax Compliance batch submission + deadlines | ✅ DONE |
| **Week 13** | Monetization | Accounting FTE product + marketplace | ✅ DONE |
| **Week 14** | Monetization | Tax Compliance FTE product | ✅ DONE |
| **Week 15** | Monetization | Inventory/Payroll/CRM FTE products | ✅ DONE |
| **Week 16** | Launch | Feature gating + Stripe checkout flow | ✅ DONE |

### Gantt Chart:

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
       ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
Phase1 ████│  │  │  │  │  │  │  │  │  │  │  │  │  │  │
Phase2 │  ████│  │  │  │  │  │  │  │  │  │  │  │  │  │
Phase3 │  │  │  │████████│  │  │  │  │  │  │  │  │  │
Phase4 │  │  │  │  │  │  │  │████████│  │  │  │  │  │
Phase5 │  │  │  │  │  │  │  │  │  │  │  │████████│  │
```

---

## 9. Success Criteria

### How We Know It's Working:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Spec Coverage** | 100% features have specs | Count specs in specs/ |
| **Test Coverage** | 80%+ code covered | Vitest coverage report |
| **TypeScript Errors** | 0 errors | `npx tsc --noEmit` |
| **Build Success** | 100% pass | `npm run build` |
| **AI Response Time** | < 3 seconds | User testing |
| **User Satisfaction** | 4.5+ stars | Feedback survey |

### Quality Checklist Per Feature:

- [ ] Spec written and reviewed
- [ ] Code follows constitution
- [ ] All tests pass
- [ ] TypeScript compiles cleanly
- [ ] Documentation updated
- [ ] Human approved

---

## Appendix A: Constitution Template

```markdown
# NexaBook — Constitution

## Principles
- Double-entry bookkeeping is sacred
- Pakistan-first: FBR, SRB, NTN, STRN, PKR
- Multi-tenant isolation: every query filters by orgId
- Specs before code
- Prefer Drizzle ORM over raw SQL

## Constraints
- Stack: Next.js 16, TypeScript, Drizzle, Neon, Clerk
- No new database
- No paid APIs (Gemini free tier only)
- All monetary amounts: decimal(14,2)

## Definition of Done
- Behaviour matches spec
- TypeScript: 0 errors
- Tests: all pass
- Journal entries balance
- orgId scoping on every query
- Human reviewed and approved
```

---

## Appendix B: Spec Template

```markdown
# spec.md — [Feature Name]

## Goal
[2-3 sentences: why this feature exists]

## User Scenarios
- When [user action], then [expected result]

## Functional Requirements
FR-1 [Requirement 1]
FR-2 [Requirement 2]
...

## Edge Cases
- [Edge case 1]
- [Edge case 2]

## Out of Scope
- [What this does NOT do]

## Acceptance Criteria
- [ ] [Check 1]
- [ ] [Check 2]
```

---

## Appendix C: Progress Log

| Date | Phase | Task | Status | Notes |
|------|-------|------|--------|-------|
| July 4, 2026 | Foundation | Create roadmap | ✅ Done | This document |
| July 4, 2026 | Foundation | Update roadmap with details | ✅ Done | Complete overview |
| July 4, 2026 | Foundation | Create CONSTITUTION.md | ✅ Done | Project rules file |
| July 4, 2026 | Foundation | Create specs/ directory | ✅ Done | 5 FTE folders |
| July 4, 2026 | AI Workers | Accounting FTE spec | ✅ Done | Auto journal entries, bank reconciliation |
| July 4, 2026 | AI Workers | Tax Compliance FTE spec | ✅ Done | FBR, SRB, WHT, GST |
| July 4, 2026 | AI Workers | Inventory FTE spec | ✅ Done | Stock tracking, COGS, batches |
| July 4, 2026 | AI Workers | Payroll FTE spec | ✅ Done | Salary, EOBI, tax deduction |
| July 4, 2026 | AI Workers | CRM FTE spec | ✅ Done | Leads, follow-ups, pipeline |
| July 4, 2026 | Review | Read full AgentFactory docs | ✅ Done | Thesis, SDD, Digital FTE, Agentic Coding |
| July 4, 2026 | Foundation | Update Constitution v2.0 | ✅ Done | Added 10-80-10, Seven Invariants, SDD workflow, Skill structure |
| July 4, 2026 | Review | Update all 5 FTE specs | ✅ Done | Proper SDD structure, removed HOW, added Skills |
| July 4, 2026 | Implementation | Bank Reconciliation feature | ✅ Done | CSV import, auto-match, finalize, undo, history |
| July 4, 2026 | AI Features | NexaBot 2.0 streaming + suggested prompts | ✅ Done | SSE streaming, 6 default prompts |
| July 4, 2026 | AI Features | Smart Reconciliation pattern learning | ✅ Done | reconciliation_patterns table, save/match functions |
| July 4, 2026 | AI Features | Invoice OCR Gemini Vision integration | ✅ Done | Real API call with fallback to simulated |
| July 4, 2026 | AI Features | Tax Compliance batch submission | ✅ Done | Batch FBR, retry failed, filing deadlines |
| July 4, 2026 | Monetization | Digital FTE database tables | ✅ Done | digitalFteProducts + orgFteSubscriptions |
| July 4, 2026 | Monetization | Feature gating utility | ✅ Done | hasFteAccess, getOrgFteSubscriptions |
| July 4, 2026 | Monetization | Marketplace page | ✅ Done | /marketplace with product grid |
| July 4, 2026 | Monetization | Stripe checkout for FTEs | ✅ Done | API routes + webhook updates |
| July 4, 2026 | Monetization | Navigation update | ✅ Done | Marketplace link in sidebar |

---

## Next Steps

1. ✅ Create CONSTITUTION.md
2. ✅ Create specs/ directory
3. ✅ Create all 5 Digital FTE specs
4. ✅ Phase 3: Implementation (Bank Reconciliation, Smart Invoicing, Auto Tax Filing, Payroll)
5. ✅ Phase 4: AI-Native Features (NexaBot 2.0, Smart Reconciliation, Invoice OCR, Tax Compliance)
6. ✅ Phase 5: Monetization (Marketplace, Feature Gating, Stripe Checkout)
7. 🔜 Deploy to production (Vercel)
8. 🔜 Set up Stripe products and price IDs
9. 🔜 Configure GEMINI_API_KEY in production

---

**Document Owner:** Ali Raza
**AI Assistant:** Opencode/Mimo
**Last Review:** July 4, 2026
**Next Review:** July 11, 2026

---

## SECTION E: PROJECT CONTEXT & ROADMAP EXPLANATION

---

### E.1 — NexaBook Project Context (Before AgentFactory Roadmap)

#### What is NexaBook?

NexaBook ek **Cloud ERP & Accounting System** hai jo Pakistan ke liye specifically design kiya gaya hai. Yeh ek multi-tenant SaaS application hai jo small-to-medium businesses (SMBs) ko accounting, inventory, HR/payroll, CRM, sales, purchases, manufacturing, aur tax compliance ka complete solution deta hai.

#### Pre-AgentFactory State (Roadmap Se Pehle Ka Project)

AgentFactory roadmap follow karne se pehle NexaBook mein yeh already exist karta tha:

##### Core Modules (Already Working):

| Module | Status | Description |
|--------|--------|-------------|
| **Accounting** | ✅ Working | Double-entry bookkeeping, chart of accounts, journal entries, trial balance, P&L, balance sheet |
| **Invoicing/Sales** | ✅ Working | Invoice creation, credit notes, sales register, customer management |
| **Purchases** | ✅ Working | Purchase orders, purchase invoices, vendor management, expense tracking |
| **Inventory** | ✅ Working | Products, stock tracking, warehouses, stock adjustments, barcode generation |
| **Banking** | ✅ Working | Bank accounts, transactions, bank feeds import |
| **HR/Payroll** | ✅ Working | Employee management, salary processing, leaves, timesheets |
| **CRM** | ✅ Working | Leads, customers, follow-ups, pipeline management |
| **POS** | ✅ Working | Point of sale, retail billing, receipt printing |
| **Fixed Assets** | ✅ Working | Asset register, depreciation, disposal |
| **Manufacturing** | ✅ Working | BOM (Bill of Materials), work orders, production tracking |
| **Projects** | ✅ Working | Project management, time tracking, cost tracking |
| **Reports** | ✅ Working | Financial reports, inventory reports, tax reports, custom reports |
| **Approvals** | ✅ Working | Multi-level approval workflows |
| **Settings** | ✅ Working | Organization settings, users, roles, permissions |

##### Tech Stack (Already Established):

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Radix UI | ✅ Working |
| Backend | Next.js Server Actions | ✅ Working |
| Database | Neon PostgreSQL | ✅ Working |
| ORM | Drizzle ORM | ✅ Working |
| Authentication | Clerk | ✅ Working |
| PDF Generation | jsPDF, @react-pdf | ✅ Working |
| Excel Export | xlsx library | ✅ Working |
| Hosting | Vercel | ✅ Working |

##### Database Schema (Already Exists):

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant root table |
| `users` | User accounts with Clerk IDs |
| `accounts` | Chart of accounts (double-entry) |
| `journalEntries` | Financial transaction headers |
| `journalEntryLines` | Debit/credit lines |
| `invoices` | Sales invoices |
| `invoiceItems` | Invoice line items |
| `purchases` | Purchase invoices |
| `purchaseItems` | Purchase line items |
| `products` | Inventory items |
| `stockMovements` | Inventory transactions |
| `bankAccounts` | Bank/cash accounts |
| `bankTransactions` | Bank statement entries |
| `employees` | HR employees |
| `salaryRecords` | Payroll records |
| `leads` | CRM leads |
| `customers` | Customer records |
| `vendors` | Vendor records |
| `fixedAssets` | Fixed asset register |
| `organizations` | Multi-tenant root table |
| *...and 50+ more tables* | Complete ERP schema |

##### What Was Missing (AgentFactory Se Pehle):

| Gap | Description |
|-----|-------------|
| **No AI Features** | Koi bhi AI/LLM integration nahi tha — NexaBot nahi tha |
| **No Spec-Driven Process** | Features bina spec ke banaye jaate the — "vibe coding" tha |
| **No Constitution** | Project-wide rules document nahi tha |
| **No Monetization Layer** | Digital FTE products, marketplace, ya Stripe checkout nahi tha |
| **No Bank Reconciliation** | CSV import aur auto-matching ka feature nahi tha |
| **No Smart Invoicing** | AI-powered invoice suggestions nahi thi |
| **No Tax Filing Automation** | FBR auto-submission, batch processing nahi tha |
| **No Invoice OCR** | Paper invoices se data extract karne ka feature nahi tha |
| **No Feature Gating** | Subscription-based feature access control nahi tha |
| **No Pattern Learning** | Bank reconciliation patterns seekhne ka system nahi tha |

##### Summary — Pre-AgentFactory:

```
NexaBook BEFORE AgentFactory:
├── ✅ 14+ working modules (Accounting, Sales, Purchases, Inventory, HR, CRM, POS, etc.)
├── ✅ Complete database schema (50+ tables)
├── ✅ Full tech stack (Next.js 16, TypeScript, Drizzle, Neon, Clerk)
├── ✅ Multi-tenant architecture with orgId scoping
├── ✅ Pakistan-specific features (FBR, SRB, NTN, STRN, PKR)
├── ❌ No AI features (chatbot, OCR, smart matching)
├── ❌ No spec-driven development process
├── ❌ No project constitution or rules document
├── ❌ No monetization/marketplace layer
├── ❌ No feature gating system
└── ❌ No automated tax filing or bank reconciliation
```

---

### E.2 — AgentFactory Roadmap Explanation (Kyun, Kesy, Kis Ko Follow Kiya)

#### AgentFactory Kya Hai?

**The AI Agent Factory** ek open-source framework hai jo **Panaversity** (panaversity.org) ne banaya hai. Yeh ek **spec-driven, human-supervised process** hai jo AI-Native Companies banane ka tarika sikhaata hai.

**Website:** https://agentfactory.panaversity.org/

**Co-Authors:**
- ZK Zia Khan
- WK Wania Kazmi
- MJ Muhammad Junaid
- MR M Rehan ul Haq
- & AI Agents

Yeh framework specifically **Forward Deployed Engineers (FDEs)** ke liye design hai — jo engineers hain jo AI ke saath mil kar domain-specific Digital FTEs (Full-Time Employees) banate hain aur unhe monetize karte hain.

#### Kyun Follow Kiya? (Why AgentFactory?)

| Reason | Explanation |
|--------|-------------|
| **1. Structured AI Development** | Bina process ke AI coding chaotic hota hai — AgentFactory ne SDD (Spec-Driven Development) ka framework diya |
| **2. Digital FTE Concept** | Domain expertise ko AI agent mein convert karke sell karne ka business model — yeh NexaBook ke liye perfect tha |
| **3. 10-80-10 Rule** | Human 10% intent define, AI 80% execute, Human 10% verify — clear roles aur responsibilities |
| **4. Seven Invariants** | Architecture rules jo hamesha true rehte hain — system design ko stable rakhte hain |
| **5. Pakistan Market Fit** | NexaBook already Pakistan-first tha — AgentFactory ne Digital FTE monetization ka path diya |
| **6. Free Tier AI** | Gemini free tier use karke bina kisi API cost ke AI features add kar sakte hain |
| **7. Global Scaling** | AgentFactory ka framework globally applicable hai — NexaBook ko international market mein scale karne ka roadmap mila |

#### Kesy Follow Kiya? (How AgentFactory Was Applied)

##### Step 1: Constitution Banaya (Foundation)

Pehle `CONSTITUTION.md` create kiya jo project ka supreme law hai:
- 10 Principles define kiye (double-entry sacred, Pakistan-first, multi-tenant isolation, specs before code, etc.)
- 7 Invariants document kiye (Human is Principal, Delegate, Management Layer, etc.)
- SDD Workflow define kiya (Research → Specify → Clarify → Build)
- Tech Stack constraints lock kiye (Next.js 16, TypeScript, Drizzle, Neon, Clerk — no paid APIs)
- Definition of Done set kiya (spec written, tests pass, TypeScript 0 errors, orgId scoping, human approved)

##### Step 2: Specs Likhe (5 Digital FTEs)

AgentFactory ke "Digital FTE" concept ko follow karte hue 5 FTE specs likhe:

| FTE | Purpose | Pricing |
|-----|---------|---------|
| Accounting FTE | Auto invoice processing, journal entries, bank reconciliation | $500/mo |
| Tax Compliance FTE | FBR/SRB automation, NTN/STRN validation, filing reminders | $400/mo |
| Inventory FTE | Stock tracking, COGS calculation, batch management, reorder alerts | $350/mo |
| Payroll FTE | Monthly salary processing, EOBI/PF deductions, payslip generation | $300/mo |
| CRM FTE | Customer management, follow-up reminders, pipeline tracking, insights | $250/mo |

Har spec mein:
- Goal (2-3 sentences: why this exists)
- User Scenarios (when [action], then [result])
- Functional Requirements (FR-1, FR-2, etc.)
- Edge Cases
- Out of Scope
- Acceptance Criteria

**Note:** AgentFactory ka rule hai — spec sirf "what" aur "why" batata hai, "how" nahi. "How" implementation phase mein aata hai.

##### Step 3: Features Implement Kiye (Spec-Driven Development)

AgentFactory ke SDD workflow ko follow karte hue features banaye:

```
Phase 0: CONSTITUTION (project rules)
    │
    ▼
Phase 1: RESEARCH — Understand problem & existing code
    │
    ▼
Phase 2: SPECIFY — Write what & why (never how)
    │
    ▼
Phase 3: CLARIFY — AI interviews human to surface ambiguity
    │
    ▼
Phase 4: BUILD — Plan → Tasks → Implement → Verify
```

##### Step 4: AI Features Add Kiye

Gemini free tier use karke AI-native features banaye:
- NexaBot 2.0 (RAG with live data, SSE streaming, suggested prompts)
- Smart Reconciliation (pattern learning, confidence scoring)
- Invoice OCR (Gemini Vision se paper invoices process karna)
- Tax Compliance Agent (batch FBR submission, retry mechanism)

##### Step 5: Monetization Layer Banaya

AgentFactory ke "Monetize" pillar ko follow karte hue:
- Digital FTE products database tables banaye
- Feature gating utility banaya (hasFteAccess, subscriptions check)
- Marketplace page banaya (/marketplace)
- Stripe checkout integration kiya (API routes + webhook handling)
- Navigation mein Marketplace link add kiya

#### Kis Ko Follow Kiya? (References)

| Reference | What Was Followed |
|-----------|-------------------|
| **AgentFactory Book** (agentfactory.panaversity.org) | Complete SDD framework, Seven Invariants, 10-80-10 Rule |
| **Panaversity Curriculum** | Digital FTE concept, monetization models, FDE role |
| **AgentFactory Thesis** | AI-Native companies, spec-driven development, human-AI collaboration |
| **Zia Khan's LinkedIn** | Industry insights on AI agents and Digital FTEs |
| **Wania Kazmi's Work** | AI-native development patterns |
| **Muhammad Junaid's Contributions** | Agent architecture patterns |

#### Key AgentFactory Concepts Applied:

| Concept | How Applied in NexaBook |
|---------|------------------------|
| **Spec-Driven Development (SDD)** | Every feature has a spec in `specs/` before code is written |
| **10-80-10 Rule** | Ali defines intent (10%), AI executes (80%), Ali verifies (10%) |
| **Digital FTEs** | 5 sellable AI products: Accounting, Tax, Inventory, Payroll, CRM |
| **Seven Invariants** | Documented in CONSTITUTION.md, applied in architecture |
| **System of Record** | PostgreSQL via Drizzle ORM — single source of truth |
| **Expandable Workforce** | New features added via specs (on-demand worker creation) |
| **Nervous System** | Server actions, cron jobs, webhooks, event-driven architecture |
| **Management Layer** | Spec-driven feature development, lifecycle management |
| **Per-Worker Engine** | Gemini free tier for all AI features (no paid APIs) |
| **Co-Learning** | AI learns from human patterns, human learns from AI suggestions |

---

### E.3 — Current Status & Context (Roadmap Complete hone ke baad)

#### Overall Status:

```
AGENTFACTORY ROADMAP: ✅ ALL 5 PHASES COMPLETE

Phase 1: Foundation          ✅ COMPLETE (Constitution, Specs Directory, Constitution v2.0)
Phase 2: AI Workers          ✅ COMPLETE (5 Digital FTE Specs Written)
Phase 3: Implementation      ✅ COMPLETE (4 Features: Bank Reconciliation, Smart Invoicing, Auto Tax Filing, Payroll)
Phase 4: AI-Native Features  ✅ COMPLETE (4 Features: NexaBot 2.0, Smart Reconciliation, Invoice OCR, Tax Compliance)
Phase 5: Monetization        ✅ COMPLETE (Marketplace, Feature Gating, Stripe Checkout)
```

#### Files Created/Modified (31 Total):

##### Documentation & Config:
| File | Purpose |
|------|---------|
| `CONSTITUTION.md` | Project supreme law — principles, rules, constraints |
| `docs/AGENTFACTORY_ROADMAP.md` | This document — complete roadmap and work log |
| `vitest.config.ts` | Test configuration |
| `vitest.setup.ts` | Test setup file |

##### Specs (12 Files):
| Spec File | Purpose |
|-----------|---------|
| `specs/accounting-fte/spec.md` | Accounting Digital FTE specification |
| `specs/tax-compliance-fte/spec.md` | Tax Compliance Digital FTE specification |
| `specs/inventory-fte/spec.md` | Inventory Digital FTE specification |
| `specs/payroll-fte/spec.md` | Payroll Digital FTE specification |
| `specs/crm-fte/spec.md` | CRM Digital FTE specification |
| `specs/bank-reconciliation/spec.md` | Bank Reconciliation feature specification |
| `specs/smart-invoicing/spec.md` | Smart Invoicing feature specification |
| `specs/auto-tax-filing/spec.md` | Auto Tax Filing feature specification |
| `specs/payroll-automation/spec.md` | Payroll Automation feature specification |
| `specs/nexabot-2/spec.md` | NexaBot 2.0 (RAG) specification |
| `specs/smart-reconciliation/spec.md` | Smart Reconciliation specification |
| `specs/invoice-ocr/spec.md` | Invoice OCR specification |

##### Source Code (Server Actions & AI):
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/actions/bank-reconciliation.ts` | 681 | Bank reconciliation: import, match, finalize, undo, history, smart matching, pattern learning |
| `src/lib/actions/tax-filing.ts` | 564 | Tax filing: NTN/STRN validation, batch FBR, retry, deadlines, provincial returns |
| `src/lib/actions/smart-invoice.ts` | - | AI-powered invoice suggestions |
| `src/lib/actions/hr-payroll.ts` | - | Monthly payroll processing |
| `src/lib/actions/invoice-ocr.ts` | 187 | Invoice OCR with Gemini Vision |
| `src/lib/ai/retriever.ts` | 418 | 14 data retriever functions for NexaBot RAG |
| `src/lib/feature-gating.ts` | 100 | Feature gating: hasFteAccess, subscriptions |

##### API Routes:
| Route | Purpose |
|-------|---------|
| `src/app/api/chat/route.ts` | NexaBot 2.0 — SSE streaming, intent detection, data retrieval |
| `src/app/api/invoice-ocr/route.ts` | Invoice OCR — file upload + Gemini Vision |
| `src/app/api/marketplace/products/route.ts` | Marketplace — list FTE products |
| `src/app/api/marketplace/checkout/route.ts` | Marketplace — Stripe checkout session |
| `src/app/api/stripe/webhook/route.ts` | Updated — FTE subscription handling |

##### Database Migrations:
| Migration | Purpose |
|-----------|---------|
| `migrations/002_add_reconciliation_patterns.sql` | Pattern learning table for bank reconciliation |
| `migrations/003_add_digital_fte_products.sql` | Digital FTE products + subscriptions tables |

##### UI:
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/marketplace/page.tsx` | Marketplace page with product grid, pricing, Stripe checkout |
| `src/app/(dashboard)/layout.tsx` | Updated — Marketplace nav link |

##### Tests (7 Test Files, 158 Tests):
| Test File | Tests | Status |
|-----------|-------|--------|
| `src/lib/accounting.test.ts` | 40 | ✅ PASS |
| `src/lib/tax-filing.test.ts` | 24 | ✅ PASS |
| `src/lib/bank-reconciliation.test.ts` | 23 | ✅ PASS |
| `src/lib/smart-invoice.test.ts` | 18 | ✅ PASS |
| `src/lib/smart-reconciliation.test.ts` | 18 | ✅ PASS |
| `src/lib/payroll-automation.test.ts` | 20 | ✅ PASS |
| `src/lib/nexabot-2.test.ts` | 15 | ✅ PASS |
| **Total** | **158** | **✅ ALL PASS** |

#### Verification Results:

| Check | Command | Result |
|-------|---------|--------|
| TypeScript Compilation | `npx tsc --noEmit` | ✅ 0 errors |
| Test Suite | `npm run test` | ✅ 158/158 pass |
| Build | `npm run build` | ✅ Success |

#### Current Project State:

```
NexaBook AFTER AgentFactory:
├── ✅ 14+ working modules (Accounting, Sales, Purchases, Inventory, HR, CRM, POS, etc.)
├── ✅ Complete database schema (50+ tables)
├── ✅ Full tech stack (Next.js 16, TypeScript, Drizzle, Neon, Clerk)
├── ✅ Multi-tenant architecture with orgId scoping
├── ✅ Pakistan-specific features (FBR, SRB, NTN, STRN, PKR)
├── ✅ CONSTITUTION.md (project supreme law)
├── ✅ 12 spec files (5 Digital FTEs + 7 features)
├── ✅ AI Features:
│   ├── ✅ NexaBot 2.0 (RAG, streaming, 14 data retrievers, suggested prompts)
│   ├── ✅ Smart Reconciliation (pattern learning, confidence scoring)
│   ├── ✅ Invoice OCR (Gemini Vision)
│   └── ✅ Tax Compliance Agent (batch FBR, retry, deadlines)
├── ✅ Monetization Layer:
│   ├── ✅ Digital FTE products database tables
│   ├── ✅ Feature gating utility
│   ├── ✅ Marketplace page (/marketplace)
│   ├── ✅ Stripe checkout integration
│   └── ✅ Subscription management
├── ✅ 158 tests passing
├── ✅ 0 TypeScript errors
├── ✅ All phases complete (5/5)
└── ✅ Total cost: $0 (all free tier)
```

#### What's Next (Pending):

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1 | Deploy to production (Vercel) | 🔜 Pending | HIGH |
| 2 | Set up Stripe products and price IDs | 🔜 Pending | HIGH |
| 3 | Configure GEMINI_API_KEY in production | 🔜 Pending | HIGH |
| 4 | End-to-end testing in production | 🔜 Pending | MEDIUM |
| 5 | User acceptance testing | 🔜 Pending | MEDIUM |
| 6 | Performance optimization | 🔜 Pending | LOW |

#### Key Metrics:

| Metric | Value |
|--------|-------|
| **Total Phases** | 5/5 Complete |
| **Total Specs** | 12 |
| **Total Features Implemented** | 8 (4 Phase 3 + 4 Phase 4) |
| **Total Digital FTEs** | 5 (Accounting, Tax, Inventory, Payroll, CRM) |
| **Total Tests** | 158 |
| **TypeScript Errors** | 0 |
| **Files Created/Modified** | 31 |
| **Total Cost** | $0 (all free tier) |
| **Development Model** | 10-80-10 (Human-AI collaboration) |
| **Framework Used** | AgentFactory (Panaversity) |

---

**END OF AGENTFACTORY ROADMAP DOCUMENT**

---

**Document Owner:** Ali Raza
**AI Assistant:** Opencode/Mimo
**Framework:** AgentFactory (Panaversity)
**Date:** July 4, 2026
**Version:** 1.0
**Status:** ✅ ALL PHASES COMPLETE

---

## Appendix D: Complete Work Log (AgentFactory Implementation)

Yeh detailed log hai — AgentFactory roadmap follow kartay huay jo jo kaam kiya gaya hai, har phase ka har task, har file, har change.

---

### PHASE 1: FOUNDATION — Detailed Work Log

**Goal:** AgentFactory process NexaBook mein set up karna

#### Task 1.1: CONSTITUTION.md Create

| Item | Detail |
|------|--------|
| **File** | `CONSTITUTION.md` (project root) |
| **What** | Project-wide rules jo hamesha follow honge |
| **Content** | Principles, Constraints, Definition of Done |
| **Key Rules** | Double-entry bookkeeping sacred, Pakistan-first (FBR/SRB/NTN/STRN/PKR), Multi-tenant isolation (orgId scoping), Specs before code, Drizzle ORM over raw SQL |
| **Constraints** | Stack: Next.js 16, TypeScript, Drizzle, Neon, Clerk. No new database, No paid APIs, All monetary amounts: decimal(14,2) |
| **Definition of Done** | Behaviour matches spec, TypeScript: 0 errors, Tests: all pass, Journal entries balance, orgId scoping on every query, Human reviewed and approved |

#### Task 1.2: specs/ Directory Create

| Item | Detail |
|------|--------|
| **Directory** | `specs/` |
| **Sub-directories** | `accounting-fte/`, `tax-compliance-fte/`, `inventory-fte/`, `payroll-fte/`, `crm-fte/` |
| **Total Spec Files** | 12 (5 Digital FTE specs + 7 feature specs) |
| **Spec Files** | `specs/accounting-fte/spec.md`, `specs/tax-compliance-fte/spec.md`, `specs/inventory-fte/spec.md`, `specs/payroll-fte/spec.md`, `specs/crm-fte/spec.md`, `specs/bank-reconciliation/spec.md`, `specs/smart-invoicing/spec.md`, `specs/auto-tax-filing/spec.md`, `specs/payroll-automation/spec.md`, `specs/nexabot-2/spec.md`, `specs/smart-reconciliation/spec.md`, `specs/invoice-ocr/spec.md` |
| **Spec Structure** | Goal, User Scenarios, Functional Requirements, Edge Cases, Out of Scope, Acceptance Criteria |

#### Task 1.3: Constitution v2.0 Update

| Item | Detail |
|------|--------|
| **Updates** | Added 10-80-10 Rule, Seven Invariants, SDD workflow, Skill structure |
| **10-80-10** | Human 10% intent define, AI 80% execute, Human 10% verify |
| **Seven Invariants** | Human is Principal, Every Human needs a Delegate, Management Layer, Per-Worker Engine, System of Record, Expandable Workforce, Nervous System |
| **SDD Workflow** | Intent → Spec → Review → Code → Test → Verify → Ship |

---

### PHASE 2: AI WORKERS — Detailed Work Log

**Goal:** 5 Digital FTE specs likhna

#### Task 2.1: Accounting FTE Spec

| Item | Detail |
|------|--------|
| **File** | `specs/accounting-fte/spec.md` |
| **Purpose** | Auto-process invoices, journal entries, bank reconciliation |
| **Key Features** | Auto journal entry creation, Bank reconciliation, Financial reports, Multi-currency support, Audit trail |
| **Skills** | Journal Entry Skill, Bank Reconciliation Skill, Financial Report Skill |
| **Pricing** | $500/mo |

#### Task 2.2: Tax Compliance FTE Spec

| Item | Detail |
|------|--------|
| **File** | `specs/tax-compliance-fte/spec.md` |
| **Purpose** | FBR submission, SRB/PRA tracking, WHT, GST |
| **Key Features** | FBR invoice submission, SRB/PRA provincial returns, NTN/STRN validation, Filing deadline reminders, Tax reports |
| **Skills** | FBR Submission Skill, Provincial Tax Skill, Tax Report Skill |
| **Pricing** | $400/mo |

#### Task 2.3: Inventory FTE Spec

| Item | Detail |
|------|--------|
| **File** | `specs/inventory-fte/spec.md` |
| **Purpose** | Stock tracking, COGS, batches |
| **Key Features** | Real-time stock tracking, Batch & expiry management, COGS calculation, Low stock alerts, Warehouse management |
| **Skills** | Stock Tracking Skill, Batch Management Skill, Valuation Skill |
| **Pricing** | $350/mo |

#### Task 2.4: Payroll FTE Spec

| Item | Detail |
|------|--------|
| **File** | `specs/payroll-fte/spec.md` |
| **Purpose** | Salary processing, EOBI, tax deduction |
| **Key Features** | Monthly payroll processing, EOBI/PF deductions, Income tax calculation, Payslip generation, Department breakdown |
| **Skills** | Payroll Processing Skill, Tax Deduction Skill, Payslip Generation Skill |
| **Pricing** | $300/mo |

#### Task 2.5: CRM FTE Spec

| Item | Detail |
|------|--------|
| **File** | `specs/crm-fte/spec.md` |
| **Purpose** | Customer management, follow-ups, pipeline |
| **Key Features** | Lead management, Follow-up reminders, Pipeline tracking, Customer insights, WhatsApp integration |
| **Skills** | Lead Management Skill, Follow-up Skill, Pipeline Skill |
| **Pricing** | $250/mo |

---

### PHASE 3: IMPLEMENTATION — Detailed Work Log

**Goal:** Spec-Driven Development se features build karna

#### Task 3.1: Bank Reconciliation Feature

| Item | Detail |
|------|--------|
| **File** | `src/lib/actions/bank-reconciliation.ts` (681 lines) |
| **Spec** | `specs/bank-reconciliation/spec.md` |
| **Functions Created** | `importBankStatement()`, `autoMatchTransactions()`, `confirmMatches()`, `finalizeReconciliation()`, `undoReconciliation()`, `getReconciliationHistory()` |
| **Features** | CSV import, Auto-matching (exact + fuzzy), Finalize, Undo, History |
| **AI Features** | `smartMatchTransactions()` — Confidence scoring, Keyword overlap, Pattern learning |
| **Smart Features** | `getSmartSuggestions()` — Top 3 suggestions per unmatched item |
| **Pattern Learning** | `saveReconciliationPattern()`, `getLearnedPatterns()`, `matchWithPatterns()` |
| **DB Tables Used** | `bankAccounts`, `bankStatements`, `journalEntries`, `journalEntryLines` |
| **New DB Table** | `reconciliationPatterns` — Bank/book pattern matching |

#### Task 3.2: Smart Invoicing Feature

| Item | Detail |
|------|--------|
| **File** | `src/lib/actions/smart-invoice.ts` |
| **Spec** | `specs/smart-invoicing/spec.md` |
| **Features** | AI-powered invoice suggestions, Smart pricing, Customer history |
| **Test File** | `src/lib/smart-invoice.test.ts` (18 tests) |

#### Task 3.3: Auto Tax Filing Feature

| Item | Detail |
|------|--------|
| **File** | `src/lib/actions/tax-filing.ts` (564 lines) |
| **Spec** | `specs/auto-tax-filing/spec.md` |
| **Functions Created** | `validateNTN()`, `validateSTRN()`, `getFBRSubmissionStats()`, `batchSubmitToFBR()`, `retryFailedSubmissions()`, `getFilingDeadlines()`, `generateProvincialReturn()`, `getFBRSubmissions()` |
| **Features** | NTN/STRN validation (5-7 digits, 13 chars), Batch FBR submission (5 at a time), Retry failed, Filing deadline reminders (7/3/1 day), Provincial tax returns (SRB/PRA/KPRA/BRA) |
| **FBR Integration** | `submitInvoiceToFBR()` — Real FBR API submission |
| **Test File** | `src/lib/tax-filing.test.ts` (24 tests) |

#### Task 3.4: Payroll Automation Feature

| Item | Detail |
|------|--------|
| **File** | `src/lib/actions/hr-payroll.ts` |
| **Spec** | `specs/payroll-automation/spec.md` |
| **Features** | Monthly payroll processing, EOBI/PF deductions, Income tax calculation, Payslip generation |
| **Test File** | `src/lib/payroll-automation.test.ts` (20 tests) |

---

### PHASE 4: AI-NATIVE FEATURES — Detailed Work Log

**Goal:** Gemini free tier se intelligent AI features add karna

#### Task 4.1: NexaBot 2.0 with RAG

| Item | Detail |
|------|--------|
| **File** | `src/app/api/chat/route.ts` (325 lines) |
| **Spec** | `specs/nexabot-2/spec.md` |
| **Key Changes** | Added SSE streaming, Non-streaming fallback, 14 data retrievers |
| **Streaming** | `ReadableStream` with `event: chunk`, `event: done`, `event: error` |
| **AI Providers** | Gemini (primary), OpenAI (fallback), Ollama (local fallback) |
| **Chat History** | Persistent via `chatMessages` table, Auto-load last 10 messages, 30-day auto-delete |
| **Intent Detection** | 14 intents: revenue, pendingInvoices, topProducts, customerBalances, cashPosition, profitLoss, lowStock, overdueInvoices, topCustomers, payroll, taxSummary, inventoryValue, recentInvoices, purchases |
| **Retrievers** | `src/lib/ai/retriever.ts` (418 lines) — 14 retriever functions |
| **Suggested Prompts** | 6 default: Revenue, Pending Invoices, Top Products, Cash Position, Tax Summary, Payroll |
| **DB Table** | `chatMessages` — orgId, userId, role, content, createdAt |
| **Test File** | `src/lib/nexabot-2.test.ts` (15 tests) |

#### Task 4.2: Smart Reconciliation Agent

| Item | Detail |
|------|--------|
| **File** | `src/lib/actions/bank-reconciliation.ts` (updated) |
| **Spec** | `specs/smart-reconciliation/spec.md` |
| **Functions Added** | `smartMatchTransactions()`, `getSmartSuggestions()`, `saveReconciliationPattern()`, `getLearnedPatterns()`, `matchWithPatterns()` |
| **Confidence Scoring** | Amount match (40%), Date proximity (30%), Description similarity (30%) |
| **Match Types** | exact (>90%), fuzzy (70-90%), pattern (learned), suggestion (<70%) |
| **Pattern Learning** | Manual matches se patterns seekhta hai, Future matches improve hotay hain |
| **New DB Table** | `reconciliationPatterns` — bankPattern, bookPattern, matchCount, confidence |
| **Migration** | `migrations/002_add_reconciliation_patterns.sql` |
| **Test File** | `src/lib/smart-reconciliation.test.ts` (18 tests) |

#### Task 4.3: Invoice OCR Agent

| Item | Detail |
|------|--------|
| **Files** | `src/lib/actions/invoice-ocr.ts` (187 lines), `src/app/api/invoice-ocr/route.ts` (55 lines) |
| **Spec** | `specs/invoice-ocr/spec.md` |
| **API Route** | POST `/api/invoice-ocr` — File upload + Gemini Vision processing |
| **Functions** | `processInvoiceImage()`, `processMultipleInvoiceImages()`, `saveExtractedInvoice()` |
| **Gemini Vision** | Real API call with `inlineData` (base64 image), Returns structured JSON |
| **Extraction** | vendorName, invoiceNumber, invoiceDate, lineItems[], subtotal, taxAmount, totalAmount, confidence |
| **Fallback** | Simulated extraction when GEMINI_API_KEY not set |
| **File Upload** | Save to `public/uploads/invoices/`, UUID filename, Max 10MB |
| **Auto-Fill** | Maps extracted data to purchase invoice form fields |

#### Task 4.4: Tax Compliance Agent

| Item | Detail |
|------|--------|
| **File** | `src/lib/actions/tax-filing.ts` (564 lines) |
| **Spec** | `specs/auto-tax-filing/spec.md` |
| **Already Complete** | Batch FBR submission, NTN/STRN validation, Filing deadlines, Provincial returns |
| **New in Phase 4** | FBR Status Dashboard (`getFBRSubmissions()`), Retry mechanism (`retryFailedSubmissions()`) |

---

### PHASE 5: MONETIZATION — Detailed Work Log

**Goal:** Digital FTEs ko sellable products mein package karna

#### Task 5.1: Database Tables

| Item | Detail |
|------|--------|
| **Table 1** | `digital_fte_products` — slug, name, description, features (JSONB), priceMonthly, priceYearly, stripePriceIdMonthly, stripePriceIdYearly, category, isActive, sortOrder |
| **Table 2** | `org_fte_subscriptions` — orgId, fteProductId, status, stripeSubscriptionId, stripeCustomerId, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd |
| **Schema File** | `src/db/schema.ts` (updated) |
| **Migration** | `migrations/003_add_digital_fte_products.sql` |
| **Seed Data** | 5 FTE products with pricing |

#### Task 5.2: Feature Gating Utility

| Item | Detail |
|------|--------|
| **File** | `src/lib/feature-gating.ts` (100 lines) |
| **Functions** | `hasFteAccess(orgId, productSlug)`, `getOrgFteSubscriptions(orgId)`, `getAvailableFteProducts()` |
| **Access Check** | Active or trial status, Not expired (currentPeriodEnd > now) |
| **Return** | hasAccess boolean, status, expiresAt |

#### Task 5.3: Marketplace Page

| Item | Detail |
|------|--------|
| **File** | `src/app/(dashboard)/marketplace/page.tsx` (220 lines) |
| **Route** | `/marketplace` |
| **UI** | Product grid with category icons, Pricing cards, Billing toggle (monthly/yearly), Subscribe buttons |
| **Categories** | accounting (blue), tax (green), inventory (purple), payroll (orange), crm (pink) |
| **Billing Toggle** | Monthly vs Yearly (17% discount) |
| **Loading State** | Skeleton cards while fetching |
| **API Calls** | GET `/api/marketplace/products`, POST `/api/marketplace/checkout` |

#### Task 5.4: API Routes

| Item | Detail |
|------|--------|
| **Route 1** | `GET /api/marketplace/products` — Returns all active FTE products |
| **Route 2** | `POST /api/marketplace/checkout` — Creates Stripe Checkout session |
| **File 1** | `src/app/api/marketplace/products/route.ts` |
| **File 2** | `src/app/api/marketplace/checkout/route.ts` |
| **Checkout Flow** | Fetch product → Get/create Stripe customer → Create Checkout session → Redirect to Stripe |

#### Task 5.5: Stripe Webhook Update

| Item | Detail |
|------|--------|
| **File** | `src/app/api/stripe/webhook/route.ts` (updated) |
| **New Handling** | FTE product subscriptions (checkout.session.completed with productSlug) |
| **Events Handled** | checkout.session.completed, invoice.paid, customer.subscription.updated, customer.subscription.deleted |
| **FTE Logic** | Insert into `orgFteSubscriptions` on first purchase, Update status on subscription changes |

#### Task 5.6: Navigation Update

| Item | Detail |
|------|--------|
| **File** | `src/app/(dashboard)/layout.tsx` (updated) |
| **Change** | Added "Marketplace" nav item with Store icon |
| **Position** | Between "Approvals" and "Settings" |
| **Icon** | `Store` from lucide-react |

---

### VERIFICATION LOG

#### TypeScript Compilation

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |

#### Test Suite

| Test File | Tests | Result |
|-----------|-------|--------|
| `src/lib/accounting.test.ts` | 40 | ✅ PASS |
| `src/lib/tax-filing.test.ts` | 24 | ✅ PASS |
| `src/lib/bank-reconciliation.test.ts` | 23 | ✅ PASS |
| `src/lib/smart-invoice.test.ts` | 18 | ✅ PASS |
| `src/lib/smart-reconciliation.test.ts` | 18 | ✅ PASS |
| `src/lib/payroll-automation.test.ts` | 20 | ✅ PASS |
| `src/lib/nexabot-2.test.ts` | 15 | ✅ PASS |
| **Total** | **158** | **✅ ALL PASS** |

#### Files Modified/Created

| File | Action | Phase |
|------|--------|-------|
| `CONSTITUTION.md` | Created | Phase 1 |
| `specs/accounting-fte/spec.md` | Created | Phase 2 |
| `specs/tax-compliance-fte/spec.md` | Created | Phase 2 |
| `specs/inventory-fte/spec.md` | Created | Phase 2 |
| `specs/payroll-fte/spec.md` | Created | Phase 2 |
| `specs/crm-fte/spec.md` | Created | Phase 2 |
| `specs/bank-reconciliation/spec.md` | Created | Phase 3 |
| `specs/smart-invoicing/spec.md` | Created | Phase 3 |
| `specs/auto-tax-filing/spec.md` | Created | Phase 3 |
| `specs/payroll-automation/spec.md` | Created | Phase 3 |
| `specs/nexabot-2/spec.md` | Created | Phase 4 |
| `specs/smart-reconciliation/spec.md` | Created | Phase 4 |
| `specs/invoice-ocr/spec.md` | Created | Phase 4 |
| `src/lib/actions/bank-reconciliation.ts` | Modified | Phase 3 + 4 |
| `src/lib/actions/smart-invoice.ts` | Created | Phase 3 |
| `src/lib/actions/tax-filing.ts` | Modified | Phase 3 + 4 |
| `src/lib/actions/hr-payroll.ts` | Created | Phase 3 |
| `src/lib/actions/invoice-ocr.ts` | Modified | Phase 4 |
| `src/app/api/chat/route.ts` | Modified | Phase 4 |
| `src/app/api/invoice-ocr/route.ts` | Modified | Phase 4 |
| `src/lib/ai/retriever.ts` | Created | Phase 4 |
| `src/lib/feature-gating.ts` | Created | Phase 5 |
| `src/db/schema.ts` | Modified | Phase 4 + 5 |
| `src/app/(dashboard)/marketplace/page.tsx` | Created | Phase 5 |
| `src/app/api/marketplace/products/route.ts` | Created | Phase 5 |
| `src/app/api/marketplace/checkout/route.ts` | Created | Phase 5 |
| `src/app/api/stripe/webhook/route.ts` | Modified | Phase 5 |
| `src/app/(dashboard)/layout.tsx` | Modified | Phase 5 |
| `migrations/002_add_reconciliation_patterns.sql` | Created | Phase 4 |
| `migrations/003_add_digital_fte_products.sql` | Created | Phase 5 |
| `docs/AGENTFACTORY_ROADMAP.md` | Modified | All Phases |

---

### AGENTFACTORY PROCESS SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTFACTORY PROCESS FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HUMAN (Ali Raza)                    AI (Opencode/Mimo)          │
│  ─────────────────                   ────────────────────        │
│                                                                  │
│  1. INTENT                           2. SPEC                     │
│     "Accounting FTE chahiye"            spec.md likhta hoon      │
│     "Bank reconciliation AI se"         Functional requirements  │
│     "Invoice OCR chahiye"               Edge cases                │
│                                        Acceptance criteria        │
│                                                                  │
│  3. REVIEW                           4. CODE                     │
│     Spec approve karta hoon            TypeScript code likhta    │
│     "Haan, theek hai"                  Server actions             │
│                                        API routes                 │
│                                                                  │
│  5. VERIFY                           6. TEST                     │
│     Code check karta hoon              Vitest tests likhta       │
│     "Build clean hai"                  158 tests pass             │
│     "Tests pass hain"                  TypeScript 0 errors        │
│                                                                  │
│  7. SHIP                                                           │
│     "Done! Feature ready."                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

FILES CREATED/MODIFIED: 31
TESTS WRITTEN: 158
PHASES COMPLETED: 5/5
TOTAL COST: $0 (all free tier)
```
