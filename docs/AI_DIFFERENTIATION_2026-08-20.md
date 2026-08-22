# NexaBook — AI-Era Differentiation (Digital FTE)

**Date:** 2026-08-20
**Framework:** AgentFactory (agentfactory.panaversity.org) — Digital FTE = a job-shaped AI worker that autonomously completes a full end-to-end job under human supervision, monetized as a subscription per FTE.

---

## 1. Reality check: what's ACTUALLY built vs spec'd (evidence-based)

| Spec folder | Promised | Actual (verified) | Maturity |
|-------------|----------|-------------------|----------|
| `smart-invoicing` | Defaults, duplicate detection, pricing suggestions, anomaly detection, payment prediction | All 5 FRs in `src/lib/actions/smart-invoice.ts`, wired as `SmartSuggestions` in `sales/invoices/new/page.tsx:661`, tests `smart-invoice.test.ts:112`, eval suite exists | **FULLY-IMPLEMENTED** |
| `accounting-fte` | Auto JEs, period locking, reports, anomaly detection | JEs on approve/reverse ✓, period lock ✓, reports ✓. **Anomaly detection NOT implemented** (no stddev/anomaly in accounting; only `smart-invoice.ts:376` flag) | MOSTLY |
| `inventory-fte` | Warehouses, batches, serials, UoM, transfers, stock counts, FIFO/WAC valuation | Full schema + actions (`inventory.ts`, `inventory-depth.ts`, `stock-count.ts`, `serial-numbers.ts`). **FIFO direction bug** (AUDIT ACC-12) | MOSTLY |
| `tax-compliance-fte` | FBR format, NTN/STRN validation, QR, PDFs | `validateNTN`/`validateSTRN` (`tax-filing.ts:19/30` — **5-7 digits vs spec's 8**), FBR QR + PDFs, `fbr-api.ts`. FBR invoice-number format not enforced | MOSTLY |
| `payroll-fte` / `payroll-automation` | EOBI/PF/tax slabs, payslips, bank file | Auto EOBI 1%/PF 8.33% **hardcoded**, bonus always 0, **tax slabs outdated** (`hr-payroll.ts:501-514` pre-2024 rates vs 2025-26 5-tier), payslip PDF + bank CSV ✓ | PARTIAL→MOSTLY |
| `auto-tax-filing` | Batch FBR submit, retry, deadlines, provincial returns, dashboard | `tax-filing.ts` has all functions, wired into `reports/tax-returns/page.tsx` | MOSTLY |
| `bank-reconciliation` | CSV upload, auto-match, finalize/undo/history | Real actions + UI + tests | MOSTLY |
| `smart-reconciliation` | Learn patterns, suggestions, auto-match improvements | **Logic lives ONLY in `src/lib/smart-reconciliation.test.ts`** — no action file, not wired to UI | NOT-IMPLEMENTED (test-only) |
| `invoice-ocr` | Upload → Gemini Vision → create purchase invoice | Backend + API done; **`InvoiceOCRUpload` component exists but is never imported by any page** | PARTIAL (backend done, UI unwired) |
| `crm-fte` | Leads pipeline, follow-up automation, segmentation | Leads CRUD + Kanban + pipeline value ✓. **Follow-up automation & segmentation NOT implemented** | PARTIAL |
| `nexabot-2` | RAG chatbot, retrievers, persistence, suggested prompts | 14 retrievers, Gemini, SSE chat, history, ChatWidget ✓ | MOSTLY |

**Supporting infra (all real, all functional):**
- **7 SKILL.md files** populated (`.opencode/skills/`) — invoice-creation, bank-reconciliation, tax-filing, payroll-processing, financial-reporting, inventory-management, customer-management.
- **MCP layer** — `src/mcp/client.ts` wraps the 14 retrievers; `servers/accounting-server.ts` is a demo stub (returns placeholder text); real path goes through retrievers.
- **Evals framework** — `evals/runner.ts` + suites (nexabot intent, OCR extraction, smart-invoicing). **Caveat: runner uses `mockHandler`, does not call real AI; `evals/reports/` is empty.**
- **NexaBot** — real and used (chat API + ChatWidget + 14 retrievers).
- **FTE monetization** — `digitalFteProducts` (`schema.ts:3035`) + `orgFteSubscriptions` (`:3053`) + marketplace page + Stripe checkout API. **BUT `hasFteAccess` (`src/lib/feature-gating.ts`) has ZERO callers — subscriptions gate nothing.**

---

## 2. Which Digital FTE to ship FIRST

Scoring on the three required axes:

### Option A — Bookkeeping FTE (accounting-fte + bank-reconciliation)
- **(a) Manual pain point (Pakistani SME bookkeeper):** HIGHEST. The daily job is matching bank statements to books, posting supplier/vendor bills, reconciling, and chasing the ledger to balance. This is hours per day of repetitive, rule-driven work — the #1 thing an SME owner pays a human bookkeeper for.
- **(b) Gap between spec and code:** SMALL. Reconciliation import/auto-match/finalize already work (`bank-reconciliation.ts`); pattern learning exists (as test-only logic — needs promotion); JEs auto-post on approve. Remaining gaps: fix ACC-01 (JE posting) which is a Wave-2 prerequisite, promote smart-reconciliation to a real action, wire OCR into purchase-invoice intake.
- **(c) Monetization:** CLEAREST. "Bookkeeping FTE — Rs. 4,999/mo" maps 1:1 to the salary a SME would otherwise pay a part-time bookkeeper (Rs. 15-30k/mo). The FTE does: statement import → auto-match → learn → reconcile → flag exceptions → post. A real human bookkeeper must only approve exceptions. This is a genuine "Digital FTE": a full job done end-to-end, human-supervised, per-job subscription.

### Option B — Payroll FTE (payroll-fte + payroll-automation)
- **(a) Pain point:** HIGH (monthly, but not daily; once a month).
- **(b) Gap:** SMALL (payslips, EOBI/PF, bank file all exist) — but tax slabs are outdated and hardcoded, so accuracy work is needed first.
- **(c) Monetization:** GOOD — "Payroll FTE — Rs. 1,999/mo per 20 employees" is an easy upsell.
- **Verdict:** #2, natural second FTE because it shares the Wave-2 accounting fixes.

### Option C — Sales/Tax Compliance FTE
- **FBR e-invoicing + tax filing:** (a) high compliance anxiety, (b) mostly built (`tax-filing.ts`, FBR QR, PDFs), but (c) monetization depends on regulator trust; NTN validation is wrong (5-7 vs 8 digits). Higher liability. Ship after Bookkeeping.

### Option D — Inventory FTE
- **(a)** Medium (batch/variant tracking pain), **(b)** mostly built but FIFO bug must be fixed (ACC-12), **(c)** weak standalone monetization (inventory is usually bundled). Not first.

**RECOMMENDATION: Bookkeeping FTE first.**

---

## 3. What makes it a real "Digital FTE" (not an AI feature bolted onto a form)

| Requirement | Current state | Must become |
|-------------|---------------|-------------|
| **Autonomous end-to-end job** | Bank reconciliation requires manual file upload + click-through; no scheduled intake | Cron-driven daily intake (statement fetch via `bankConnections` cron already exists) + auto-match + auto-learn, producing a **reconciliation inbox** the human approves in bulk |
| **Human supervision (supervisory loop)** | `finalizeReconciliation` exists but no exception worklist / approval queue | A "Bookkeeper Inbox" page: matched pairs (auto), unmatched (why), suggested patterns (approve/reject), day-end close button |
| **Learns over time** | `reconciliationPatterns` table exists but logic is test-only | Promote to `src/lib/actions/smart-reconciliation.ts`; every human-approved match strengthens confidence scores (weighted: amount 40 / date 30 / description 30 — already spec'd) |
| **Does the full job** | JEs post on approve (mostly), but ACC-01/02 means they vanish from reports | Wave-2 fixes make posted JEs flow into P&L/BS automatically — the FTE closes the book, not just matches rows |
| **Standalone, billable artifact** | Marketplace page lists products; `hasFteAccess` gates nothing | Wire `hasFteAccess` into module pages + a usage/limit meter; each FTE = a subscription SKU with a defined job description and SLA (e.g., "reconciles N accounts/day, flags exceptions, posts with approval") |
| **Perception of competence** | Skills exist; MCP accounting-server is a stub | Make `servers/accounting-server.ts` call real actions (or remove it and route MCP → retrievers only) so "FTE tool calls" return real data |

**Anti-pattern to avoid:** shipping "AI suggestions" widgets (smart-invoice, NexaBot Q&A) as the product. Those are features. The FTE is a job: *"reconcile October's books"* → human approves → done. Price per job, measure by hours of bookkeeper time saved.

---

## 4. Recommended Phase-3 execution order (subject to your go-ahead)

1. **Wave 2 prerequisite:** fix ACC-01/02 (JE posting) + ACC-13 (POS COGS) — without this, the Bookkeeping FTE's outputs are invisible in the ledger.
2. **Promote smart-reconciliation:** move logic from test file → `src/lib/actions/smart-reconciliation.ts`; wire into reconciliation UI (approved matches update `reconciliation_patterns`).
3. **Bookkeeper Inbox page:** `/reconciliation/inbox` — today's statement lines, auto-matches (with confidence), unmatched list, pattern suggestions, bulk-approve, exception flags (amount/date/description mismatches).
4. **Wire `hasFteAccess`:** gate `/reconciliation/*`, `/marketplace` checkout flow, and daily cron to active `org_fte_subscriptions` for that product slug.
5. **OCR intake:** mount `InvoiceOCRUpload` into purchase-invoices so supplier bills flow from photo → draft bill → match → post (feed the same inbox).
6. **Payroll FTE (v2):** fix tax slabs (`hr-payroll.ts:501-514`) to 2025-26 5-tier schedule, make EOBI/PF configurable, ship "Payroll FTE" SKU.

## 5. Honest risks to fix before claiming "FTE"

- `hasFteAccess` dead code → subscriptions currently sell nothing.
- Reconciliation/OCR/AI paths have zero test coverage.
- Evals use `mockHandler` — "95% intent accuracy" claims are unverified.
- The whole bookkeeping output depends on Wave 2 accounting fixes — FTE marketing cannot precede those.