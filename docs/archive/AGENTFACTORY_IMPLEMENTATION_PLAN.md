# NexaBook — AgentFactory Ecosystem Implementation Plan

**Project:** NexaBook Cloud ERP & Accounting System
**Framework:** AgentFactory (panaversity.org)
**Date:** July 5, 2026
**Owner:** Ali Raza
**Status:** IN PROGRESS

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component 1: SKILL.md Files](#2-component-1-skillmd-files)
3. [Component 2: MCP Integration](#3-component-2-mcp-integration)
4. [Component 3: Eval-Driven Development](#4-component-3-eval-driven-development)
5. [Component 4: Nervous System Improvement](#5-component-4-nervous-system-improvement)
6. [Implementation Order](#6-implementation-order)
7. [Success Criteria](#7-success-criteria)

---

## 1. Overview

NexaBook is a complete Accounting, Invoicing & Billing SaaS with 130+ pages, 68+ tables, 46 server actions, and 249 tests. This plan adds 4 AgentFactory ecosystem components that are **relevant for an accounting SaaS product**.

### What We're Adding:

| # | Component | Purpose | Priority |
|---|-----------|---------|----------|
| 1 | SKILL.md Files | Encode accounting domain expertise as portable, loadable skills | HIGH |
| 2 | MCP Integration | Standard wire for AI-to-database and AI-to-tool communication | HIGH |
| 3 | Eval-Driven Development | Systematic testing of AI features (NexaBot, OCR, Smart Invoicing) | MEDIUM |
| 4 | Nervous System Improvement | Event-driven architecture replacing basic cron jobs | MEDIUM |

### What We're NOT Adding (Not relevant for SaaS):

- **Paperclip** — AI workforce management (for AI-Native companies, not SaaS)
- **OpenClaw** — Personal delegate agent (for personal use, not B2B SaaS)
- **Agent Factory Plugin** — Claude Code/OpenCode integration (development tool, not product)

---

## 2. Component 1: SKILL.md Files

### 2.1 What Are Skills?

Skills are **portable folders** containing domain expertise that AI agents can discover, load, and execute. Each skill follows the [agentskills.io](https://agentskills.io) standard:

```
skill-name/
├── SKILL.md           # Required: frontmatter + instructions
├── scripts/           # Optional: helper code
├── references/        # Optional: deep documentation
└── assets/            # Optional: templates, schemas
```

### 2.2 Why Skills for Accounting?

NexaBot currently has 14 intent detectors and 14 retrievers. Skills will:

1. **Encode domain expertise** — Pakistani tax laws, FBR rules, accounting standards
2. **Make AI responses more accurate** — Structured instructions vs free-form prompts
3. **Enable progressive disclosure** — Load only what's needed per query
4. **Version control expertise** — Track changes to accounting rules over time
5. **Portable across tools** — Same skills work in Claude Code, OpenCode, and NexaBot

### 2.3 Skills to Create

#### Skill 1: Invoice Creation

**File:** `.opencode/skills/invoice-creation/SKILL.md`

**Purpose:** Guide NexaBot through invoice creation with proper tax calculation, FBR compliance, and Pakistani business rules.

**Triggers:** "create invoice", "new invoice", "bill banao", "invoice banao", "sale invoice"

**Content Sections:**
- NTN/STRN validation rules (8-digit NTN, 13-char STRN)
- Tax calculation (GST 17%, SRB, WHT rates)
- FBR invoice submission requirements
- Invoice numbering format (configurable prefix)
- Multi-currency support (PKR default)
- Credit terms and due date calculation
- Cost center allocation
- Islamic finance mode considerations

**References:**
- `references/fbr-rules.md` — FBR invoice submission format
- `references/tax-rates.md` — Current Pakistani tax rates
- `references/ntn-validation.md` — NTN/STRN validation rules

#### Skill 2: Bank Reconciliation

**File:** `.opencode/skills/bank-reconciliation/SKILL.md`

**Purpose:** Guide through bank statement import, auto-matching, and reconciliation finalization.

**Triggers:** "reconcile bank", "bank matching", "statement match", "bank reconciliation"

**Content Sections:**
- CSV import format (date, description, debit, credit, balance)
- Auto-matching algorithms (exact amount, fuzzy description, date proximity)
- Confidence scoring (amount 40%, date 30%, description 30%)
- Pattern learning (save successful matches for future)
- Finalization rules (all matched or explained)
- Undo reconciliation process
- Multi-account reconciliation

**References:**
- `references/match-algorithms.md` — Matching logic details
- `references/patterns.md` — Learned pattern format

#### Skill 3: Tax Filing

**File:** `.opencode/skills/tax-filing/SKILL.md`

**Purpose:** Guide through FBR submission, provincial tax returns, and filing deadlines.

**Triggers:** "file tax", "FBR submit", "tax return", "sales tax return", "tax filing"

**Content Sections:**
- FBR invoice submission API format
- NTN validation (8 digits)
- STRN validation (13 characters)
- Provincial tax authorities (SRB, PRA, KPRA, BRA)
- Filing deadlines (monthly/quarterly)
- WHT deduction and certificate generation
- Tax rate configuration
- Batch submission (5 invoices at a time)
- Retry failed submissions

**References:**
- `references/fbr-api.md` — FBR API endpoints and format
- `references/provincial-rules.md` — Province-specific tax rules
- `references/deadlines.md` — Filing deadline calendar

#### Skill 4: Payroll Processing

**File:** `.opencode/skills/payroll-processing/SKILL.md`

**Purpose:** Guide through monthly payroll calculation, deductions, and payslip generation.

**Triggers:** "process payroll", "salary calculate", "payroll run", "payslip"

**Content Sections:**
- Basic salary, allowances, deductions structure
- EOBI deduction (employee + employer shares)
- Provident Fund (PF) calculation
- Income tax calculation (Pakistan slabs)
- Overtime calculation
- Late/absent deductions
- Leave encashment
- Department-wise breakdown
- Payslip PDF generation
- Bank file generation for salary transfer

**References:**
- `references/eobi-rates.md` — Current EOBI rates
- `references/tax-slabs.md` — Income tax slabs
- `references/pf-rules.md` — Provident Fund rules

#### Skill 5: Financial Reporting

**File:** `.opencode/skills/financial-reporting/SKILL.md`

**Purpose:** Guide through generating financial reports with proper accounting standards.

**Triggers:** "generate report", "P&L", "balance sheet", "trial balance", "financial report"

**Content Sections:**
- Profit & Loss statement format
- Balance Sheet format (assets = liabilities + equity)
- Trial Balance verification (debits = credits)
- Cash Flow Statement
- General Ledger report
- Account Statement report
- Aged Receivables/Payables
- Budget vs Actual comparison
- Multi-company consolidation
- Cost center-wise P&L
- Export formats (PDF, Excel, CSV)

**References:**
- `references/report-formats.md` — Standard report layouts
- `references/accounting-standards.md` — Double-entry rules

#### Skill 6: Inventory Management

**File:** `.opencode/skills/inventory-management/SKILL.md`

**Purpose:** Guide through stock tracking, valuation, and inventory operations.

**Triggers:** "check stock", "inventory", "stock level", "product list", "warehouse"

**Content Sections:**
- Stock level queries (per warehouse, total)
- Stock movement tracking (in/out)
- FIFO/Weighted Average valuation
- Batch tracking with expiry dates
- Serial number tracking
- Stock adjustment process
- Physical stock count (stocktake)
- Low stock alerts and reorder suggestions
- Inter-warehouse transfer
- COGS calculation
- Barcode generation

**References:**
- `references/valuation-methods.md` — FIFO vs Weighted Average
- `references/batch-tracking.md` — Batch management rules

#### Skill 7: Customer Management

**File:** `.opencode/skills/customer-management/SKILL.md`

**Purpose:** Guide through customer lookup, balance management, and follow-ups.

**Triggers:** "customer info", "customer balance", "customer lookup", "client details"

**Content Sections:**
- Customer search (name, phone, email, NTN)
- Customer balance calculation
- Credit limit checking
- Payment history
- Outstanding invoices
- Customer statement generation
- Portal access management
- Follow-up reminders
- Customer segmentation
- Loyalty points tracking

**References:**
- `references/credit-rules.md` — Credit limit policies
- `references/portal-setup.md` — Customer portal configuration

### 2.4 Directory Structure

```
.opencode/
├── skills/
│   ├── invoice-creation/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── fbr-rules.md
│   │       ├── tax-rates.md
│   │       └── ntn-validation.md
│   ├── bank-reconciliation/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── match-algorithms.md
│   │       └── patterns.md
│   ├── tax-filing/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── fbr-api.md
│   │       ├── provincial-rules.md
│   │       └── deadlines.md
│   ├── payroll-processing/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── eobi-rates.md
│   │       ├── tax-slabs.md
│   │       └── pf-rules.md
│   ├── financial-reporting/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── report-formats.md
│   │       └── accounting-standards.md
│   ├── inventory-management/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── valuation-methods.md
│   │       └── batch-tracking.md
│   └── customer-management/
│       ├── SKILL.md
│       └── references/
│           ├── credit-rules.md
│           └── portal-setup.md
```

### 2.5 SKILL.md Template

```markdown
---
name: skill-name
description: >
  What this skill produces and when to use it.
  Include trigger phrases users actually type.
  Include keywords in Roman Urdu if applicable.
---

# Skill Name

## Goal
2-3 sentences: what this skill does and why it exists.

## When to Use
- When [user action], then [expected result]
- Trigger phrases: "phrase 1", "phrase 2", "roman urdu phrase"

## Instructions
1. Step-by-step instructions for the AI
2. Rules to follow
3. Calculations to perform
4. Validations to check

## Edge Cases
- [Edge case 1 and how to handle]
- [Edge case 2 and how to handle]

## References
- [Link to reference file](references/file.md)
```

---

## 3. Component 2: MCP Integration

### 3.1 What is MCP?

**Model Context Protocol (MCP)** is an open standard for connecting AI agents to tools and data. It's the "wire" between AI and external systems.

### 3.2 Current State

```
NexaBot → custom retriever.ts → direct PostgreSQL queries via Drizzle ORM
```

**Problems:**
- Custom implementation, not standard
- Each new tool requires custom code
- No reuse across tools
- Tight coupling

### 3.3 Target State

```
NexaBot → MCP Server → PostgreSQL (standard protocol)
NexaBot → MCP Server → External APIs (FBR, payment gateways)
```

**Benefits:**
- Standard protocol, works across AI tools
- Easy to add new tools
- Loose coupling
- Reusable across projects

### 3.4 MCP Servers to Implement

#### Server 1: PostgreSQL MCP Server

**Purpose:** Database queries for NexaBot

**Tools to expose:**
1. `query-account-balance` — Get account balance by code
2. `query-customer-balance` — Get customer outstanding
3. `query-vendor-balance` — Get vendor outstanding
4. `query-revenue` — Get revenue for date range
5. `query-expenses` — Get expenses for date range
6. `query-profit-loss` — Generate P&L data
7. `query-balance-sheet` — Generate balance sheet data
8. `query-trial-balance` — Get trial balance
9. `query-invoices` — List invoices with filters
10. `query-products` — List products with stock levels
11. `query-employees` — List employees
12. `query-payroll` — Get payroll summary
13. `query-stock` — Get stock levels per warehouse
14. `query-tax-summary` — Get tax collected/paid

**Implementation:**
```typescript
// src/mcp/servers/postgres-server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server';

const server = new McpServer({
  name: 'nexabook-database',
  version: '1.0.0'
});

server.tool(
  'query-account-balance',
  'Get the current balance of a specific account by account code',
  { accountCode: z.string() },
  async ({ accountCode }) => {
    // Query using Drizzle ORM
    const balance = await getAccountBalance(accountCode);
    return { content: [{ type: 'text', text: JSON.stringify(balance) }] };
  }
);
```

#### Server 2: Accounting MCP Server

**Purpose:** Domain-specific accounting operations

**Tools to expose:**
1. `create-journal-entry` — Create a journal entry with lines
2. `create-invoice` — Create a sales invoice
3. `create-purchase-invoice` — Create a purchase invoice
4. `receive-payment` — Record customer payment
5. `make-payment` — Record vendor payment
6. `calculate-tax` — Calculate tax for an amount
7. `validate-ntn` — Validate NTN number
8. `validate-strn` — Validate STRN number
9. `submit-to-fbr` — Submit invoice to FBR
10. `generate-payslip` — Generate employee payslip
11. `check-stock` — Check product stock level
12. `adjust-stock` — Create stock adjustment

**Implementation:**
```typescript
// src/mcp/servers/accounting-server.ts
server.tool(
  'create-invoice',
  'Create a sales invoice with line items and tax calculation',
  {
    customerId: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number(),
      unitPrice: z.number()
    })),
    taxRate: z.number().optional()
  },
  async ({ customerId, items, taxRate }) => {
    // Create invoice using existing server action
    const invoice = await createSalesInvoice(customerId, items, taxRate);
    return { content: [{ type: 'text', text: JSON.stringify(invoice) }] };
  }
);
```

### 3.5 MCP Client Integration in NexaBot

```typescript
// Update src/app/api/chat/route.ts
import { Client } from '@modelcontextprotocol/sdk/client';

// Connect to MCP servers
const dbClient = new Client({ name: 'nexabook-db' });
await dbClient.connect({ transport: new StdioClientTransport(...) });

// In chat handler, pass MCP client to model
const tools = await dbClient.listTools();
// Use tools in Gemini/OpenAI function calling
```

### 3.6 Dependencies to Add

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.25.0"
}
```

### 3.7 Directory Structure

```
src/
├── mcp/
│   ├── servers/
│   │   ├── postgres-server.ts
│   │   └── accounting-server.ts
│   ├── client.ts
│   └── tools/
│       ├── database-tools.ts
│       └── accounting-tools.ts
```

---

## 4. Component 3: Eval-Driven Development

### 4.1 What is Eval-Driven Development?

Systematic testing of AI features using evaluation datasets. Instead of "looks right", we measure:
- **Accuracy** — Is the output correct?
- **Consistency** — Does it produce the same result multiple times?
- **Edge Cases** — Does it handle unusual inputs?
- **Performance** — Is it fast enough?

### 4.2 Evaluation Categories

#### Category 1: NexaBot Intent Detection

**Purpose:** Verify NexaBot correctly identifies user intents

**Eval Dataset:**
```typescript
// evals/nexabot/intent-detection.eval.ts
const testCases = [
  {
    input: "What's my revenue this month?",
    expectedIntent: "revenue",
    expectedRetriever: "revenue"
  },
  {
    input: "Kitne invoices pending hain?",
    expectedIntent: "pendingInvoices",
    expectedRetriever: "pendingInvoices"
  },
  {
    input: "Mera cash position kya hai?",
    expectedIntent: "cashPosition",
    expectedRetriever: "cashPosition"
  },
  {
    input: "Low stock items dikhao",
    expectedIntent: "lowStock",
    expectedRetriever: "lowStock"
  },
  // ... 50+ test cases
];
```

**Metrics:**
- Intent detection accuracy: >95%
- Retriever selection accuracy: >90%
- Roman Urdu understanding: >85%

#### Category 2: Invoice OCR Accuracy

**Purpose:** Verify OCR correctly extracts invoice data

**Eval Dataset:**
```typescript
// evals/invoice-ocr/extraction-accuracy.eval.ts
const testCases = [
  {
    image: "test-invoices/standard-pakistani-invoice.jpg",
    expected: {
      vendorName: "ABC Trading Co.",
      invoiceNumber: "INV-2026-001",
      invoiceDate: "2026-07-01",
      subtotal: 100000,
      taxAmount: 17000,
      totalAmount: 117000
    }
  },
  // ... 30+ test cases with different invoice formats
];
```

**Metrics:**
- Vendor name extraction: >90% accuracy
- Amount extraction: >95% accuracy
- Date extraction: >90% accuracy
- Line item extraction: >80% accuracy

#### Category 3: Smart Invoicing Suggestions

**Purpose:** Verify AI suggestions are accurate and helpful

**Eval Dataset:**
```typescript
// evals/smart-invoicing/suggestions.eval.ts
const testCases = [
  {
    scenario: "Duplicate detection",
    input: { customerId: "c1", items: [{ productId: "p1", qty: 10 }] },
    recentInvoices: [{ items: [{ productId: "p1", qty: 10 }], date: "2026-07-03" }],
    expected: { isDuplicate: true, confidence: 0.85 }
  },
  {
    scenario: "Pricing suggestion",
    input: { productId: "p1", customerId: "c1" },
    lastSoldPrice: 500,
    averagePrice: 520,
    expected: { suggestedPrice: 500, reason: "Last sold price" }
  }
];
```

**Metrics:**
- Duplicate detection precision: >80%
- Pricing suggestion accuracy: >85%
- Anomaly detection recall: >90%

### 4.3 Eval Framework

```typescript
// evals/framework/runner.ts
interface EvalCase {
  input: any;
  expected: any;
  tags: string[];
}

interface EvalResult {
  case: EvalCase;
  actual: any;
  passed: boolean;
  score: number;
  latency: number;
}

async function runEval(
  evalName: string,
  testCases: EvalCase[],
  handler: (input: any) => Promise<any>
): Promise<EvalReport> {
  const results: EvalResult[] = [];

  for (const testCase of testCases) {
    const start = Date.now();
    const actual = await handler(testCase.input);
    const latency = Date.now() - start;

    const score = calculateScore(testCase.expected, actual);
    results.push({
      case: testCase,
      actual,
      passed: score >= 0.8,
      score,
      latency
    });
  }

  return generateReport(evalName, results);
}
```

### 4.4 Directory Structure

```
evals/
├── framework/
│   ├── runner.ts
│   ├── scorer.ts
│   └── reporter.ts
├── nexabot/
│   ├── intent-detection.eval.ts
│   ├── data-accuracy.eval.ts
│   └── roman-urdu.eval.ts
├── invoice-ocr/
│   ├── extraction-accuracy.eval.ts
│   └── edge-cases.eval.ts
├── smart-invoicing/
│   ├── duplicate-detection.eval.ts
│   ├── pricing-suggestions.eval.ts
│   └── anomaly-detection.eval.ts
├── test-data/
│   ├── invoices/
│   │   ├── standard-pakistani.jpg
│   │   ├── handwritten.jpg
│   │   └── faded-receipt.jpg
│   └── bank-statements/
│       ├── sample-csv.csv
│       └── edge-cases.csv
└── reports/
    └── latest-eval-report.md
```

### 4.5 Running Evals

```bash
# Run all evals
npm run eval

# Run specific eval
npm run eval -- --suite=nexabot/intent-detection

# Generate report
npm run eval:report
```

### 4.6 package.json Scripts

```json
{
  "scripts": {
    "eval": "vitest run evals/",
    "eval:report": "tsx evals/framework/reporter.ts",
    "eval:watch": "vitest watch evals/"
  }
}
```

---

## 5. Component 4: Nervous System Improvement

### 5.1 Current State

```
Vercel Cron Jobs (5 endpoints):
├── /api/cron/payment-reminders   (daily)
├── /api/cron/bank-feeds          (hourly)
├── /api/cron/low-stock           (daily)
├── /api/cron/recurring-invoices  (daily)
└── /api/cron/retry-webhooks      (hourly)
```

**Problems:**
- Basic polling, not event-driven
- No durability (crash loses work)
- No flow control (rate limiting)
- No retry with backoff
- No event correlation

### 5.2 Target State

```
Event-Driven Architecture:
├── Event Bus (Inngest or custom)
├── Durable Execution
├── Flow Control
├── Retry with Backoff
└── Event Correlation
```

### 5.3 Events to Implement

#### Business Events

| Event | Trigger | Handlers |
|-------|---------|----------|
| `invoice.created` | New invoice saved | Update customer balance, FBR submission, audit log |
| `invoice.paid` | Payment received | Update invoice status, send receipt, update revenue |
| `invoice.overdue` | Past due date | Send reminder, update aging, flag account |
| `payment.received` | Customer payment | Allocate to invoices, update balance, send confirmation |
| `payment.made` | Vendor payment | Allocate to purchase invoices, update balance |
| `stock.low` | Below reorder level | Alert, suggest reorder, notify purchasing |
| `stock.expiring` | Near expiry date | Alert, suggest markdown, notify warehouse |
| `payroll.run` | Monthly payroll | Generate payslips, update ledger, deduct EOBI/PF |
| `tax.filing-due` | Approaching deadline | Send reminder, prepare return data |
| `employee.joined` | New employee | Create payroll record, assign benefits |
| `lead.converted` | Lead → Customer | Create customer record, send welcome email |

#### System Events

| Event | Trigger | Handlers |
|-------|---------|----------|
| `webhook.delivery` | Outgoing webhook | Send payload, retry on failure |
| `email.send` | Email request | Queue, send via Resend, track delivery |
| `report.generate` | Report request | Generate PDF/Excel, cache, deliver |
| `backup.create` | Scheduled backup | Export data, store securely |

### 5.4 Implementation Options

#### Option A: Custom Event Bus (Recommended for NexaBook)

```typescript
// src/lib/events/event-bus.ts
type EventHandler = (event: DomainEvent) => Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler) {
    const existing = this.handlers.get(event) || [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  async emit(event: DomainEvent) {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        await this.retry(handler, event);
      }
    }
  }

  private async retry(handler: EventHandler, event: DomainEvent, attempt = 0) {
    if (attempt >= 3) {
      await this.deadLetter(event);
      return;
    }
    const delay = Math.pow(2, attempt) * 1000;
    setTimeout(() => handler(event), delay);
  }
}
```

#### Option B: Inngest (More Features, External Service)

```typescript
// src/lib/events/inngest-client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'nexabook' });

// Define functions
export const onInvoiceCreated = inngest.createFunction(
  { id: 'on-invoice-created' },
  { event: 'invoice.created' },
  async ({ event, step }) => {
    await step.run('update-customer-balance', () => {
      return updateCustomerBalance(event.data.customerId);
    });
    await step.run('submit-to-fbr', () => {
      return submitInvoiceToFBR(event.data.invoiceId);
    });
  }
);
```

### 5.5 Event Schema

```typescript
// src/lib/events/types.ts
interface DomainEvent {
  id: string;
  type: string;
  timestamp: Date;
  orgId: string;
  userId?: string;
  data: Record<string, any>;
  metadata?: {
    source: string;
    correlationId?: string;
    causationId?: string;
  };
}

// Event types
type InvoiceCreatedEvent = DomainEvent & {
  type: 'invoice.created';
  data: {
    invoiceId: string;
    customerId: string;
    totalAmount: number;
    taxAmount: number;
  };
};

type PaymentReceivedEvent = DomainEvent & {
  type: 'payment.received';
  data: {
    paymentId: string;
    customerId: string;
    amount: number;
    method: string;
  };
};
```

### 5.6 Dead Letter Queue

```typescript
// src/lib/events/dead-letter.ts
// Store failed events for manual review
// Table: deadLetterEvents
// - id, eventType, payload, error, attempts, createdAt, resolvedAt
```

### 5.7 Directory Structure

```
src/lib/events/
├── event-bus.ts
├── types.ts
├── handlers/
│   ├── invoice-handlers.ts
│   ├── payment-handlers.ts
│   ├── stock-handlers.ts
│   ├── payroll-handlers.ts
│   └── system-handlers.ts
├── dead-letter.ts
└── index.ts
```

---

## 6. Implementation Order

### Phase 1: SKILL.md Files (Week 1)

**Goal:** Create 7 accounting skills in `.opencode/skills/`

| Day | Task | Deliverable |
|-----|------|-------------|
| Day 1 | Create directory structure + invoice-creation skill | `.opencode/skills/invoice-creation/` |
| Day 2 | Create bank-reconciliation + tax-filing skills | 2 more skills |
| Day 3 | Create payroll-processing + financial-reporting skills | 2 more skills |
| Day 4 | Create inventory-management + customer-management skills | 2 more skills |
| Day 5 | Create reference files for all skills | All references |
| Day 6-7 | Test skills with NexaBot | Verified working |

### Phase 2: MCP Integration (Week 2)

**Goal:** Implement PostgreSQL and Accounting MCP servers

| Day | Task | Deliverable |
|-----|------|-------------|
| Day 1 | Install MCP SDK, create server scaffold | `src/mcp/` directory |
| Day 2 | Implement PostgreSQL MCP server (14 tools) | Database MCP server |
| Day 3 | Implement Accounting MCP server (12 tools) | Accounting MCP server |
| Day 4 | Integrate MCP client in NexaBot chat | Updated chat API |
| Day 5 | Test MCP tools with NexaBot | Verified working |
| Day 6-7 | Documentation + edge cases | Complete MCP setup |

### Phase 3: Eval-Driven Development (Week 3)

**Goal:** Create evaluation framework and test suites

| Day | Task | Deliverable |
|-----|------|-------------|
| Day 1 | Create eval framework (runner, scorer, reporter) | `evals/framework/` |
| Day 2 | Create NexaBot intent detection evals | 50+ test cases |
| Day 3 | Create Invoice OCR evals | 30+ test cases |
| Day 4 | Create Smart Invoicing evals | 30+ test cases |
| Day 5 | Run all evals, generate report | Eval report |
| Day 6-7 | Fix issues found by evals | Improvements |

### Phase 4: Nervous System (Week 4)

**Goal:** Implement event-driven architecture

| Day | Task | Deliverable |
|-----|------|-------------|
| Day 1 | Create event bus + types | `src/lib/events/` |
| Day 2 | Implement invoice + payment handlers | Business event handlers |
| Day 3 | Implement stock + payroll handlers | More handlers |
| Day 4 | Implement system handlers (webhooks, email) | System handlers |
| Day 5 | Add dead letter queue | Error handling |
| Day 6-7 | Test event flow + monitoring | Complete event system |

---

## 7. Success Criteria

### Component 1: SKILL.md Files

- [ ] 7 skills created in `.opencode/skills/`
- [ ] Each skill has proper frontmatter (name, description)
- [ ] Each skill has references directory with domain docs
- [ ] Skills are discoverable by NexaBot
- [ ] Skills fire on correct trigger phrases
- [ ] Skills provide accurate accounting guidance

### Component 2: MCP Integration

- [ ] PostgreSQL MCP server with 14 tools
- [ ] Accounting MCP server with 12 tools
- [ ] MCP client integrated in NexaBot
- [ ] All tools return correct data
- [ ] Tools handle errors gracefully
- [ ] Documentation complete

### Component 3: Eval-Driven Development

- [ ] Eval framework created
- [ ] 50+ NexaBot intent detection test cases
- [ ] 30+ Invoice OCR test cases
- [ ] 30+ Smart Invoicing test cases
- [ ] All evals pass (>80% accuracy)
- [ ] Eval report generated

### Component 4: Nervous System

- [ ] Event bus implemented
- [ ] 11 business event handlers
- [ ] 4 system event handlers
- [ ] Dead letter queue for failed events
- [ ] Events trigger correct handlers
- [ ] Retry with backoff works
- [ ] Event correlation works

---

## Appendix A: Dependencies to Add

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

## Appendix B: Scripts to Add

```json
{
  "scripts": {
    "eval": "vitest run evals/",
    "eval:report": "tsx evals/framework/reporter.ts",
    "eval:watch": "vitest watch evals/",
    "mcp:postgres": "tsx src/mcp/servers/postgres-server.ts",
    "mcp:accounting": "tsx src/mcp/servers/accounting-server.ts"
  }
}
```

---

**Document Owner:** Ali Raza
**AI Assistant:** Opencode/Mimo
**Framework:** AgentFactory (Panaversity)
**Date:** July 5, 2026
**Version:** 1.0
**Status:** IN PROGRESS
