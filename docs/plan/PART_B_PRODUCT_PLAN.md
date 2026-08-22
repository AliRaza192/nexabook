# NexaBook — Part B: Complete Product Plan

**Date:** 2026-08-20
**Objective (founder):** take NexaBook from current state to a production, real-market ERP that matches and then exceeds Splendid Accounts and comparable market ERPs (QuickBooks/Wave-class), serving everything from a small shop to a large enterprise, with genuine AI-era (Digital FTE) differentiation — not bolted-on AI widgets.
**Gated by:** `docs/plan/PART_A_REMEDIATION_RUNBOOK.md` — nothing in this plan executes before the Part A gate.

---

## 1. Market & feature parity

### 1.1 Competitive gaps — full specs (expanding PRODUCTION_PLAN competitive gap list)

| Gap | Exists today (cite) | Missing | Effort | Blocks segment |
|---|---|---|---|---|
| **Bank feed auto-recon** | CSV upload + manual match (`bank-reconciliation.ts`), pattern table | Automated statement import (bank/Raast/PSP API), auto-suggested matches, batch approve. Pakistan open-banking limited → ship CSV+bulk-first, API as Phase 4 | 15-20h | small (bookkeeper hours), medium, enterprise (volume) |
| **Audit trail immutability** | JE + reversal pattern (`sales.ts:1390-1431`) | User-action log (who did what when), append-only, viewable, exportable | 12h | medium/enterprise (FBR audits, accountants) |
| **Multi-level approvals** | `approval_workflows` table (`schema.ts:196`), basic approve/reject (`approvals.ts`) | Multi-step routing, parallel approval, conditional rules, per-org config | 25h | medium/enterprise |
| **Role-based dashboards** | Clerk org roles + ad-hoc role checks | Role-specific landing + KPI dashboards (owner/cashier/accountant/auditor) | 15h | medium/enterprise |
| **Closing wizard** | `checkPeriodLocked` exists, no flow | Guided month-end close: review → lock → report → reopen | 20h | medium/enterprise (accountants demand) |
| **Multi-branch GL dimension** | `costCenters` table + `costCenterId` on JE lines (`schema.ts:1178`) | First-class branch enforcement + branch P&L/BS + branch close | 30h | enterprise |
| **Attachments/document mgmt** | OCR backend (unwired UI) | Attach files to invoices/purchases/payments/expenses; view in reports | 12h | all (audit evidence) |
| **Public API + Zapier** | 26 REST routes exist, undocumented | Documented public API, webhooks, Zapier/Make connector | 30h | medium/enterprise |

### 1.2 Genuinely NEW gaps (from competitor research — not on NexaBook radar)

| Gap | Who has it | Evidence | Why it matters | Est. |
|---|---|---|---|---|
| **Recurring invoices + auto reminders + late fees** | Wave Pro, QBO | Wave Pro features; QBO Payments Agent | Recurring invoices exist partially (cron in vercel.json) but auto-late-fee likely missing; AR automation is a KPI buyers quote | 12h |
| **Receipt scanning (mobile photo→expense)** | Wave, QBO receipt capture | Wave bulk OCR (10 receipts), QBO mobile | NexaBook has invoice-OCR backend for purchase invoices but UI never mounted + no expense-receipt path | 15h |
| **Project/job costing & profitability** | QBO Projects | QBO Projects feature set | Manufacturing has BOM but no project accounting — blocks services segment (contractors, agencies) | 25h |
| **Time tracking** | QBO Workers | QBO dashboard Workers tab | Needed with project costing for services segment | 15h |
| **Bank rules (auto-categorize)** | QBO bank feeds | "recommends categories, gets smarter over time" | Same engine as Smart-reconciliation; fold into FTE, don't build separately | 0h (in FTE) |
| **Budgeting & forecasting** | Splendid lists it; QBO Advanced | Splendid spec list "Budgeting and Forecasting" | Standard accountant expectation; missing from NexaBook entirely | 20h |
| **Multi-entity consolidated reports** | QBO Enterprise Suite (5 new consolidated reports, Feb 2026) | QBO release notes | NexaBook has `consolidation.ts` links but no consolidated report UI | 20h |
| **Mobile invoicing / field sales apps** | Splendid (Invoicing App, Order Booking App) | splendidaccounts.com | GTM-critical in Pakistan: SMEs live on phones; Splendid's app-store presence is a moat to beat | 30h (PWA-first) |
| **Keypunching-speed POS screen** | Splendid retail POS | splendidaccounts.com retail POS page | Distribution/wholesale segment benchmarks checkout speed | 15h |
| **GAAP/basis-of-accounting reporting toggle** | QBO Advanced | QBO GAAP-compliant reporting | Enterprise procurement lists this | 10h |

**Note on Splendid research:** Splendid's public list (bank reconciliation, budgeting/forecasting, audit trails, multi-currency, payroll, API) confirms NexaBook already covers the core module set. The differentiators will come from **FTE AI + Pakistan-native WhatsApp/Raast + mobile**, not from chasing the same checkboxes.

---

## 2. Scaling for enterprise — where it actually breaks

1. **Reporting performance (PERF-01..05):** balance sheet/trial balance/P&L aggregate in JS after loading rows (`accounting.ts`, `reports.ts`) → at hundreds of users and months of data, N+1 + client-side aggregation will time out server actions. **Breaks:** monthly close in large orgs.
2. **No branch dimension:** `costCenterId` exists on JE lines but is optional and not enforced; no branch-level P&L/BS/close. **Breaks:** multi-location retail/wholesale (Splendid's core segment).
3. **Consolidation is a link, not a ledger:** `consolidation.ts` links orgs (and has an IDOR bug) but there's no consolidated financial statement. **Breaks:** holding structures, the enterprise ask.
4. **RBAC is ad-hoc:** string role checks scattered (`sales.ts:1273`, banking/leaves/PO checks); no central permission matrix, no custom roles. **Breaks:** orgs with segregated duties (enterprise compliance).
5. **No background job queue:** PDF generation, FBR submission, payroll, bank import all run synchronously in server actions; no retry/backoff. **Breaks:** any heavy op at scale; FBR submission needs queued retry.
6. **Single Neon instance, no read replicas; multi-currency dead** (ACC-17 exchangeRate never applied). **Breaks:** import/export firms + concurrent reporting load.
7. **Audit trail not immutable** (see 1.1) — enterprise/FBR auditors require it.

**Minimum phased architecture changes (NOT a rewrite):**
- **Phase A (enterprise prep, during Part B Phase 4):** (i) enforce branch/costCenter on JE lines + branch report views; (ii) push aggregation into SQL (GROUP BY+SUM) + paginate every report query; (iii) background queue (Inngest/BullMQ w/ Neon) for PDF/FBR/payroll/bank-import with retry; (iv) permission-table RBAC; (v) materialized view cache for BS/TB; (vi) fix FX to `decimal(14,2)` per-JE-line with currency/rate on journal entries.
- **Phase B (holding structures):** consolidated ledger over linked orgs + consolidated P&L/BS/cash-flow + intercompany elimination.

---

## 3. AI-native differentiation — Digital FTE roadmap

**Acceptance criteria for "done" on ANY FTE = the requirements table in `docs/AI_DIFFERENTIATION_2026-08-20.md` §3:** autonomous end-to-end, human-supervision loop, learns over time, completes the full job (ledger impact), standalone billable artifact, perception of competence (skills/MCP return real data).

### Bookkeeping FTE — shipped-feature order (Phase 3, ~6-8 weeks solo)

| # | Task | Est. | Dependencies |
|---|---|---|---|
| 1 | **Wire `hasFteAccess`** (dead code — `src/lib/feature-gating.ts`, ZERO callers) into `/reconciliation/*`, `/marketplace`, and the daily cron. **No FTE can be sold before this.** | 4h | — |
| 2 | Part A Wave 2 fixes (ACC-01/02) — FTE's outputs must reach the ledger | 0h (Part A) | Part A gate |
| 3 | Promote `smart-reconciliation` logic from test file → `src/lib/actions/smart-reconciliation.ts` | 6h | 1 |
| 4 | **Reconciliation Inbox page** `/reconciliation/inbox`: today's statement lines, auto-matches (confidence score), unmatched list, pattern suggestions approve/reject, bulk-approve | 30h | 3 |
| 5 | Auto-match scoring engine (amount 40% / date 30% / description 30%) + learning from approved matches into `reconciliation_patterns` | 20h | 4 |
| 6 | Daily FTE cron: ingest statements (CSV now, bank API later), auto-match, populate inbox | 8h | 5 |
| 7 | Exception flags + WhatsApp alert to bookkeeper ("3 unmatched lines in Org X") | 10h | 5 |
| 8 | Marketplace listing + FTE subscription SKU + success metrics surfaced in UI (hours saved) | 8h | 1,5 |
| 9 | Fix `accounting-server.ts` MCP stub → call real actions (or route MCP → retrievers only) | 4h | 1 |
| 10 | Evals: real-handler runs for reconciliation accuracy; wire `evals/reports/` | 8h | 5 |

### Subsequent FTEs (each gated on its spec-vs-code gaps from AI_DIFFERENTIATION §1)
- **Payroll FTE (Phase 5):** fix outdated tax slabs (`hr-payroll.ts:501-514` → 2025-26 5-tier), make EOBI/PF configurable, then ship "Payroll FTE — Rs. 1,999/mo per 20 employees". Gate: Part A accounting fixes + slab accuracy.
- **Tax Compliance FTE (Phase 5-6):** correct `validateNTN`/`validateSTRN` (5-7→8 digit), enforce FBR invoice-number format, batch FBR submit with queued retry, FBR dashboard. Gate: background queue exists.
- **Inventory FTE (Phase 6):** fix FIFO direction (ACC-12) first; then low-stock/reorder + auto-replenishment suggestions. Gate: FIFO fix + Part A.

---

## 4. Monetization & go-to-market

| Tier | Model | Price (PKR) | Basis |
|---|---|---|---|
| **Freemium** | seat, free | Rs 0 | Limited invoices/books (wave-free tier) — competes with Wave's free tier, defeats Splendid's 14-day-trial-only barrier |
| **SME SaaS** | seat | Rs 1,500-2,500/user/mo (~matches Splendid $14/mo ≈ Rs 3,900 single-seat) | Unlimited invoices, POS, inventory, reports |
| **Digital FTE** | subscription per FTE | Bookkeeping Rs 4,999/mo · Payroll Rs 1,999/mo · Tax Rs 2,999/mo | Directly undercuts part-time bookkeeper salary (Rs 15-30k/mo); priced per job, marketed as hours saved |
| **Tax success fee** | success fee (AgentFactory) | Rs 500-1,000 per FBR return filed | Aligned with the AgentFactory success-fee model |
| **Enterprise license** | license + services | Custom | Branch GL, consolidated reports, SSO, API, dedicated support, on-prem option |

**GTM sequencing:** (1) Fix Part A → relaunch as "Splendid-class core, free tier"; (2) launch **Bookkeeping FTE** as the hero AI product to 5-10 pilot SME bookkeepers; (3) WhatsApp+Raast-native marketing (invoice-on-WhatsApp, payment reminders) as the Pakistan-native wedge Splendid/QuickBooks don't have; (4) distribution/wholesale vertical push with keypunch POS + mobile PWA; (5) enterprise via accounting-firm partnership channel (marketplace model).

---

## 5. Sequenced master timeline (solo founder + AI agents)

| Phase | Work | Wall-clock | Parallel AI-agent lanes |
|---|---|---|---|
| **Phase 1 — Part A gate** | Waves 0-2 (build, security, financial correctness) | **2.5-3 wks** | Waves 1/3-6 fixes delegated to agents in parallel |
| **Phase 2 — close Part A 3-6 + smallest gaps** | Wave 3-6 completion + bank-recon UI + audit trail + recurring/reminders | **3 wks** | independent modules |
| **Phase 3 — Bookkeeping FTE** | Bookkeeping FTE items 1-10 (this doc §3) | **6-8 wks** | parallel: inbox UI / scoring engine / cron / gating |
| **Phase 4 — enterprise scaling** | branch GL, SQL aggregation, queue, RBAC, consolidated reports, FX fix | **5-6 wks** | per-capability |
| **Phase 5 — remaining FTEs** | Payroll, Tax Compliance | **4-6 wks** | per FTE |
| **Phase 6 — parity + mobile** | project costing, time tracking, budgets, mobile PWA, keypunch POS | **6-8 wks** | per module |

**Total ≈ 27-34 weeks part-time solo effort** to full "matches Splendid + exceeds with FTE AI" position. **Assumption:** Part A is a hard prerequisite to everything — no FTE or enterprise pitch is credible on a ledger that shows empty reports.

---

## 6. Open questions (must be answered before this plan is final)

1. **Is Easypaisa live in production** (real merchant credentials, real money moving) or sandbox-only? → decides whether SEC-24 jumps from Wave 4 to Wave 1 (see Part A).
2. **Are there any real production tenants** with actual financial data? → determines Wave-2a repair scope (per-org) and whether backfill needs a maintenance window + data export.
3. **What is the actual current customer/user count**, if any? → calibrates pricing tiers and migration effort.
4. **Target enterprise customer profile** — which vertical first (retail/wholesale distribution, garments, services/contractors)? → reshapes Phase 4 scope and the mobile/PWA priority.
5. **Bank-aggregation feasibility in Pakistan** (Raast/PSP APIs, or CSV-first for the FTE)? → defines Bookkeeping FTE intake scope.
6. **Budget for paid infra** (Neon compute scale, Inngest/BullMQ queue, Sentry)? → Phase 4 scaling design and observability ceiling.