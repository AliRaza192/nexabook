# tasks.md — Bank Reconciliation Feature

1. **Extract reconciliation components** — Break up the 369-line reconciliation page into reusable components in `src/components/bank-reconciliation/`. [Foundation]

2. **Add CSV upload component** — Create file upload zone with drag-and-drop, parse CSV on upload, display parsed lines in review table. [FR-1]

3. **Wire up auto-match** — Connect existing `autoMatchTransactions` server action to UI, display match results with color coding (green/yellow/red). [FR-2]

4. **Add manual match UI** — Allow user to click unmatched statement line and select a journal entry to link, or reject an auto-match. [FR-3]

5. **Build reconciliation summary** — Show three-column comparison (Statement Balance, Book Balance, Difference) with counts and totals. [FR-4]

6. **Add finalize action** — Server action to persist matches, update `bank_statements.status` to `reconciled`, lock period. Block if difference ≠ 0. [FR-5]

7. **Add undo finalization** — Reopen a reconciled period with mandatory reason, restore editable state. [FR-5]

8. **Build reconciliation history** — List past reconciliations per bank account with period, balances, difference, status. [FR-6]

9. **Track outstanding items** — Flag deposits in transit and outstanding checks, carry forward to next period. [FR-7]

10. **Write tests** — Test CSV parsing, auto-match logic, finalize validation, undo with reason. [Verify]

11. **TypeScript check** — Run `npx tsc --noEmit` and fix any errors. [Verify]
