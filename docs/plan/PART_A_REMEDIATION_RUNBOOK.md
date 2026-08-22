# NexaBook — Part A: Bug & Error Remediation Runbook

**Date:** 2026-08-20
**Upgrades:** `docs/PRODUCTION_PLAN_2026-08-20.md` Waves 0-6 → execution-ready runbook (dependency graph, Wave-2 data migration, per-wave test gates, SEC-24 resequencing).
**Sources:** `docs/AUDIT_2026-08-20.md` (finding IDs BLD/SEC/ACC/PERF/TXN/Q), `docs/CURRENT_STATE_2026-08-20.md`, `docs/TASKS.md`.

---

## 1. Dependency graph & critical path

**Legend:** ⚡ = parallelizable (different files, no shared JE-posting path) · 🔗 = strict sequence (share JE insert path, `journal_entries` table, or report filters)

```
Wave 0  BLD-01 sync exports ──┬─ tax-filing.ts:19/30 (validateNTN/STRN → move to src/lib/validation.ts)   ⚡
                              └─ bank-reconciliation.ts:818 (matchWithPatterns → move to src/lib/)        ⚡
                              [same fix pattern; independent files — one parallel batch]

Wave 1  SEC-01..27 org-scoping ── 12 files, all independent, NO shared table writes ──────────────────── ⚡⚡⚡
        (portal/hr-payroll/approvals/consolidation/purchases/sales/pos/manufacturing/adjustments/
         email-api/inventory/leaves/accounts — each fix is a WHERE orgId guard in its own action)

Wave 2  ACC-01/02 JE status ──────────────── 🔗 THE CRITICAL PATH
        ├─ (2a) DATA MIGRATION (read-only audit → dry-run → backfill)     🔗 MUST precede (2b)
        ├─ (2b) flip app inserts to status:'posted' (sales/purchases/pos/banking/fixed-assets/hr-payroll/
        │        accounts/manufacturing — ~14 insert sites)               🔗 same table
        ├─ (2c) fix report filters to '= posted' (accounting.ts:73/137/205, reports.ts:78/303/554) 🔗
        └─ (2d) ACC-03 DB balance constraint ───────────────────────────── 🔗 MUST follow (2a) audit
        ── in parallel with 2a-2d: ACC-05 deleteInvoice reversal, ACC-06 revisePurchaseInvoice,
           SEC-20 updateInvoiceStatus, ACC-13 POS COGS, ACC-19 tax wiring ─────────────────────────── ⚡
           (different files; POS COGS touches pos.ts JE path → gate it AFTER (2b))

Wave 3  TXN-01..06 atomicity (pos/payments/banking/payroll/depreciation/manufacturing/onboarding)  ⚡⚡⚡
        (each is an independent "wrap in db.transaction" per file)

Wave 4  period-lock (POS/stock-adj/fixed-assets/opening-bal/manufacturing/GRN) · FX (ACC-17) · webhook
        (SEC-24)  ──────────────────────────────────────────────────────────────────────────────────── ⚡⚡⚡

Wave 5  PERF-01..05 N+1 batch fixes ────────────────────────────────────────────────────────────────── ⚡⚡⚡
Wave 6  lint/coverage/logging/dead-code/observability ──────────────────────────────────────────────── ⚡⚡⚡
```

**True critical path (the chain that gates Part B):**
`Wave 0 (0.5d) → Wave 2a migration (1.5d) → Wave 2b/2c (2.5d) → Wave 2d constraint (0.5d) → gate tests (1d)`
≈ **6 days serial.** Wave 1 (≈4d) and Waves 3-6 run **in parallel lanes** alongside it. Wave 1 is also P0, so run it first/parallel on day 1.

**Realistic solo-founder + AI-agents wall-clock: Part A gate ≈ 10-12 working days (~2.5 weeks).** Wave 1's 19 independent fixes and Wave 3's 8 independent transactions delegate well to parallel coding agents; Waves 0 and 2 must be done serially by one brain.

---

## 2. Wave 2 — explicit DATA MIGRATION plan (ACC-01/02)

**Ground truth:** JE inserts at `sales.ts:1006` (and ~13 other sites) omit `status` → schema default `'draft'` (`schema.ts:901`). Report filters `!= 'draft'` (`accounting.ts:73/137/205`, `reports.ts:78/303/554`) exclude them. Constraint ACC-03 (`journal_entry_lines`, `schema.ts:1174`) cannot be added until all rows balance.

### Step 2a — READ-ONLY SQL audit (no writes)
```sql
-- A. Distribution (baseline before touching anything)
SELECT status, COUNT(*), COUNT(*) FILTER (WHERE posted_at IS NULL) AS no_posted_at
FROM journal_entries GROUP BY status;

-- B. UNBALANCED entries — MUST be zero or explicitly flagged before ACC-03
SELECT je.id, je.org_id, je.entry_number, je.reference_type, je.status,
       COALESCE(SUM(jl.debit_amount),0)  AS total_debit,
       COALESCE(SUM(jl.credit_amount),0) AS total_credit
FROM journal_entries je
LEFT JOIN journal_entry_lines jl ON jl.journal_entry_id = je.id
GROUP BY je.id
HAVING COALESCE(SUM(jl.debit_amount),0) <> COALESCE(SUM(jl.credit_amount),0);

-- C. Entries with ZERO lines (candidates for repair, not backfill)
SELECT je.id, je.entry_number, je.reference_type, je.status
FROM journal_entries je
LEFT JOIN journal_entry_lines jl ON jl.journal_entry_id = je.id
WHERE jl.id IS NULL;

-- D. Draft JEs by reference_type (drives backfill scope)
SELECT reference_type, source_type, COUNT(*) FROM journal_entries
WHERE status = 'draft' GROUP BY 1,2 ORDER BY 3 DESC;
```
**Decision rule:** if **B ≠ 0**, freeze the fix: list each unbalanced org+entry, either (i) repair with a correcting JE or (ii) exclude from backfill and flag to the affected org. **ACC-03 must NOT be deployed** until B = 0. C is a separate repair ticket (delete orphans or create balancing lines — decide per row after review).

### Step 2b — Backfill script plan
**Targets:** JEs with `status='draft'` AND `reference_type IN ('invoice','purchase','pos','payment','expense','payroll','deposit','withdrawal','transfer','depreciation','manufacturing','receipt')` → become `posted`, `posted_at = COALESCE(posted_at, created_at)`.
**Excluded:** `reference_type IN ('manual','reversal')` or `reference_id IS NULL` — these are legitimately draft pending user posting.

Execution order (each phase a separate command/file):
1. **Dry-run/report mode:** the same UPDATE with `SELECT` + `RETURNING id INTO scratch table` — output per-org counts + total. Human reviews the report. **No write.**
2. **Pre-write snapshot:** `CREATE TABLE je_backup_20260820 AS SELECT * FROM journal_entries WHERE id IN (<dry-run ids>);` (and matching `journal_entry_lines` ids if needed).
3. **Backfill:** single `UPDATE journal_entries SET status='posted', posted_at=COALESCE(posted_at,created_at), updated_at=now() WHERE id IN (<dry-run ids>)` inside one transaction.
4. **Post-verify:** re-run audit B (must stay 0) + confirm report filters now return rows for previously-approved invoices.
5. **Rollback path:** `UPDATE journal_entries je SET status='draft' FROM je_backup_20260820 b WHERE je.id=b.id AND je.status='posted';` (restore `posted_at` from snapshot). Rollback reverses the status flag only; no financial data is destroyed in either direction.

**Deployment order (Wave 2d):** audit (2a) → backfill (2b) → flip app inserts to `status:'posted'` (2c-code) → report filters (2c-filters) → **then** add ACC-03 DB constraint (2d) → run full test suite.

---

## 3. Per-Wave TEST GATES (checklist, pulled from AUDIT §5)

| Gate | Command(s) | Must pass before |
|---|---|---|
| **W0-GATE** | `npm run build` exit 0 · `npx tsc --noEmit` exit 0 | Wave 1 starts |
| **W1-GATE** | `npm run test` (177 + new isolation tests) · new tests for EVERY fixed IDOR path: portal token mint (anon→rejected), hr-payroll markPayslipPaid (org B cannot mark org A payslip), approvals/consolidation/purchases/sales/pos/manufacturing cross-org access → 403/throw | Wave 2 starts |
| **W2-GATE** | Audit B = 0 · backfill dry-run matches report · **balance regression:** approve invoice → JE `posted` → appears in TB/P&L/BS · void/delete → reversed → net-zero · POS COGS + balance test · period-lock rejection tests · constraint ACC-03 active (violating insert throws) · `npm run test` + `npm run build` green | Wave 3 starts |
| **W3-GATE** | Transaction tests: simulate partial failure mid-payment/payroll/POS → assert no partial rows (explicit rollback assertions) | Wave 4 starts |
| **W4-GATE** | Every write path in a locked period rejects · FX JE applies exchangeRate (multi-currency test) · easypaisa callback rejects unsigned payload (fail-closed) | Wave 5 starts |
| **W5-GATE** | Perf sanity: approveInvoice does ≤3 SQL COUNT/SUM queries not N+1 (assert via query log) | Wave 6 starts |
| **W6-GATE** | `npm run lint` zero errors · coverage ≥ 40% baseline captured · `npm run build` + `npm run test` green | Part A gate |

---

## 4. SEC-24 (Easypaisa unsigned callback) — priority resequencing

**Current evidence:** `.env.example` shows only **sandbox** URLs (`sandbox.easypaisa.com.pk`); `easypaisa.ts` has env-configured `apiKey` but `api/payments/callback/route.ts:25-39` does not verify the signature.

- **If LIVE in production** (real merchant credentials, real money): SEC-24 moves to **Wave 1** (P0, before any payment volume) — unsigned callbacks are a free money-out vector. Ship HMAC verification in the first security batch.
- **If sandbox-only:** keep in Wave 4 as P1; no real funds at risk today.

**This decision must come back from the founder before execution** (see §6).

---

## 5. PART A DONE-GATE (explicit boundary — nothing in Part B starts before this)

> **Waves 0-2 complete · `npm run build` green (exit 0) · all 9 P0 findings closed · JE-balance DB constraint (ACC-03) ACTIVE and verified · isolation tests (W1) + balance regression tests (W2) passing · `npm run test` full green.**
>
> A single gate record in `docs/plan/MASTER_PLAN.md` checklist must be signed off (dated + `npm run build` + `npm run test` outputs appended) before Part B Phase 1 is scheduled.

---

## 6. Open questions (blocking before execution)

1. **Is Easypaisa live in production** (real creds, real money) or sandbox? → **BLOCKED — awaiting founder.** Repo evidence only shows sandbox defaults + no local env. Decides SEC-24 wave (if LIVE → Wave 1).
2. **Do any production tenants exist with real financial data?** → **BLOCKED — awaiting founder.** No DB access locally to verify.
3. **Which environments exist** besides local (staging vs prod Neon) and who can run DDL (constraint, snapshot tables)? → **BLOCKED — awaiting founder.**
4. **Is there a paid plan already taking invoices?** → **BLOCKED — awaiting founder.** RBAC scope of SEC-20 fix must match real org roles.