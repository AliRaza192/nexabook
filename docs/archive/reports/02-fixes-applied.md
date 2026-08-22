# NexaBook — Fixes Applied (Phase 2)

**Scope:** Critical & High severity items only

---

## Fix #1 — Lint Infrastructure

**Finding:** `npm run lint` broken (Critical #1, #2) — Next.js 16 removed `lint` command; ESLint 9 requires flat config.
**Fix:** Replace `.eslintrc.json` with `eslint.config.mjs`, update `package.json` lint script to `eslint src/`.
**Commit:** pending

## Fix #2 — Trial Balance gross/net calculation

**Finding:** Trial Balance collapsed debit/credit into net balance per account (Critical accounting correctness).
**Fix:** Show gross debit and gross credit per account. Totals are sum of all debits and all credits.
**Commit:** pending

## Fix #3 — FIFO valuation algorithm

**Finding:** FIFO branch computed weighted average instead of actual FIFO (High accounting correctness).
**Fix:** Rewrite FIFO to consume stock from oldest batches first. Added 5 tests proving FIFO ≠ WAC when costs differ.
**Commit:** pending

## Fix #4 — `any` types (High, 63 occurrences)

**Finding:** 63 `any` type usages violate TypeScript strict rule.
**Fix:** Replaced all `catch (error: any)` with `catch (error: unknown)` + type guards (0 remaining). Replaced `any[][]`, `any` function params, `let data: any`, `asset: any`, `updateData: any`, `valuationDetails: any[]` across 17 files. Remaining `as any` casts are Drizzle enum and jsPDF type extensions (library-level patterns, Medium severity).
**Result:** tsc passes clean, 177 tests pass.
**Commit:** pending
