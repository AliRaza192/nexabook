# NexaBook — Polish Applied (Phase 3)

**Scope:** Medium & Low severity items

---

## Fix #5 — Consolidate duplicate `getCurrentOrgId` in API routes

**Finding:** 7 API route files define local `getCurrentOrgId(userId)` instead of importing from `shared.ts`.
**Fix:** Replaced local implementations with imports from `@/lib/actions/shared`. All 7 files now use the single shared function.

## Fix #6 — Stripe env var validation

**Finding:** Marketplace checkout route uses `process.env.STRIPE_SECRET_KEY!` with non-null assertion.
**Fix:** Added explicit validation and throw with clear error message if env var is missing.

## Fix #7 — Test coverage for server actions

**Finding:** 46 server action files with 0 test coverage. Added FIFO valuation test (5 tests) in Phase 2. 
**Note:** Full server action test coverage requires DB mocking infrastructure beyond unit test scope. The `vitest.setup.ts` mocks the DB connection but not individual query results. Adding comprehensive server action tests would require a mock query builder — recommended as a future task.

## Verification

- `npx tsc --noEmit` — passes clean
- `npm run test` — 177 tests pass (10 files)
- `npm run lint` — infrastructure works (pre-existing React/JSX errors only)