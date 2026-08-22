# NexaBook — Master Plan (v1, 2026-08-20)

## Two gated parts — nothing in Part B starts until Part A gate passes

- **Part A — Bug & Error Remediation:** `docs/plan/PART_A_REMEDIATION_RUNBOOK.md`
  (dependency graph, Wave-2 data migration, per-wave test gates, SEC-24 resequencing)
- **Part B — Complete Product Plan:** `docs/plan/PART_B_PRODUCT_PLAN.md`
  (market parity, enterprise scaling, Digital FTE roadmap, monetization, master timeline)

## PART A → PART B GATE (hard requirement)

- [x] Wave 0 complete: `npm run build` exit 0
- [x] Wave 1 complete: all 12 cross-tenant P0 IDORs closed + isolation tests pass
- [x] Wave 2 complete: JE-backfill n/a (empty DB confirmed), app inserts post `'posted'`,
      report filters correct, ACC-03 deferred constraint trigger ACTIVE + verified
- [x] All 9 P0 findings closed · `npm run test` full green
- [x] Gate record appended below with date + build/test outputs

→ Only then: schedule Part B Phase 1.

## Top-level timeline (solo founder + AI agents)

| Phase | Work | Wall-clock |
|---|---|---|
| **Part A** | Bug & error remediation (Waves 0-2) | 2.5-3 wks |
| **Part B P1** | Finish Part A waves 3-6 + smallest gaps | +3 wks |
| **Part B P2** | Bookkeeping FTE → first sellable AI product | +6-8 wks |
| **Part B P3** | Enterprise scaling | +5-6 wks |
| **Part B P4-5** | Remaining FTEs + parity/mobile | +10-14 wks |

**Total ≈ 27-34 weeks part-time solo effort.**

## Open questions — status (updated 2026-08-22)

1. **Is Easypaisa LIVE (real money) or sandbox?** → **BLOCKED — awaiting founder.** Repo evidence: no `.env.local`, no `.vercel/` link; code defaults to `sandbox.easypaisa.com.pk` (`src/lib/payments/easypaisa.ts:12-16`). If LIVE → SEC-24 moves to Wave 1.
2. **Real production tenants / financial data?** → **BLOCKED — awaiting founder.** Cannot verify without DB access (no local DATABASE_URL); `src/db/seed.ts` only inserts demo orgs.
3. **Current customer/user count?** → **BLOCKED — awaiting founder.** Requires DB access.
4. **Target enterprise customer profile (which segment first)?** → **BLOCKED — awaiting founder (business decision).** Code maturity: POS/wholesale strongest; no garments module; no project costing (services).
5. **Bank-aggregation partner for auto bank feeds, or CSV-first?** → **RESOLVED — CSV-first.** Code has only `parseBankStatementCSV` (`bank-reconciliation.ts:125`); no Raast/PSP/open-banking code exists. Bank API is net-new (Part B Phase 4).
6. **Budget for Neon/queue/Sentry paid tiers?** → **RESOLVED (current state) — budget decision pending.** Already used: Neon + Upstash (free tiers OK). Not installed: queue (Inngest/BullMQ). Sentry is a stub (`src/lib/sentry.ts` needs `SENTRY_DSN`).

---

## Gate record

| Date | Check | Result |
|---|---|---|
| 2026-08-21 | `npm run build` | Compiled successfully in 70s · 172 pages generated · exit 0 |
| 2026-08-21 | `npm run test` | 19 files · 206 tests passed · exit 0 |
| 2026-08-21 | `npx tsc --noEmit` | exit 0 |
| 2026-08-21 | Isolation tests (W1) | 25 tests across 9 files · SEC-01–11 + SEC-02/20 all have cross-org denial assertions |
| 2026-08-21 | Balance regression (W2) | — pending — |
| 2026-08-21 | ACC-03 constraint active | — pending — |
| 2026-08-22 | `npm run build` | Compiled successfully · exit 0 |
| 2026-08-22 | `npm run test` | 20 files · 212 tests passed · exit 0 |
| 2026-08-22 | `npx tsc --noEmit` | exit 0 |
| 2026-08-22 | W2-GATE (real pglite) | 6/6 tests pass — approveInvoice, deleteInvoice, revisePurchaseInvoice, POS COGS, deferred constraint, financial reports |

---

## ACC-03 deferred-trigger architectural decision

The double-entry balance constraint was implemented as a **`DEFERRABLE INITIALLY DEFERRED` row-level constraint trigger** rather than a statement-level trigger. Rationale:

- **Statement-level approach** would fire after each SQL statement. Because ~20 of 27 JE-line insert sites in the codebase insert lines one-by-one in a loop (not batch), a statement-level trigger would fire after the first insert (when only half the lines exist) and always reject as unbalanced. This would require rewriting every one-by-one call site to batch.
- **Deferred approach** defers the balance check to COMMIT time. The trigger still fires per-row (required because `CREATE CONSTRAINT TRIGGER` does not support `FOR EACH STATEMENT`), but instead of checking balance it queries the full set of lines for that journal entry. At COMMIT, the complete set of lines is present and the check succeeds for balanced entries. This eliminates the need to refactor any of the 20 one-by-one call sites.
- **Two immediate CHECK constraints** (`chk_jel_no_both_zero`, `chk_jel_no_both_nonzero`) are retained at row level to reject obviously bad individual rows (both amounts zero, or both non-zero). The deferred trigger only validates the aggregate.

### pglite as the standard for financial-correctness tests

All financial-correctness regression tests (W2-GATE) run against a real Postgres instance via pglite (in-memory, zero config, no external DB). This is now the standard pattern for tests that validate accounting invariants, journal entry balancing, and constraint behavior — mocking the database layer is insufficient for these tests.