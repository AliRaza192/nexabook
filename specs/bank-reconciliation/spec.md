# spec.md — Bank Reconciliation Feature

## Goal

Enable users to reconcile their bank accounts by importing bank statement CSVs, auto-matching transactions against system journal entries, reviewing unmatched items, and finalizing the reconciliation with a clear audit trail. Replace the current manual-only reconciliation with a CSV-driven, semi-automated workflow.

## User Scenarios

- When a user uploads a bank statement CSV, then transactions are parsed and displayed alongside system journal entries
- When auto-match runs, then statement lines matching by amount and date (±3 days) are automatically linked to system transactions
- When a user reviews matches, then they can accept, reject, or manually link unmatched statement lines to journal entries
- When reconciliation is finalized, then matched status is persisted, reconciliation period is locked, and a summary report is generated
- When a user views reconciliation history, then past reconciliations with dates, balances, and difference amounts are shown
- When outstanding items exist (deposits in transit, outstanding checks), then they are flagged and carried forward to next reconciliation

## Functional Requirements

### FR-1: CSV Statement Import
- Accept CSV file upload from user's device (drag-and-drop zone + file picker)
- Auto-detect column headers (date, description, reference, debit, credit, balance)
- Support common Pakistani bank CSV formats (HBL, Meezan, UBL, MCB, Allied)
- Display parsed statement lines in a review table before matching
- Store imported statement in `bank_statements` table with parsed lines in JSONB
- Validate: no duplicate imports for same bank account + same date range

### FR-2: Auto-Match Transactions
- Match statement lines to system journal entry lines by:
  - Exact amount match (debit statement line matches credit JE line or vice versa)
  - Date proximity within ±3 calendar days
  - Optional description/reference similarity (bonus, not required)
- Mark matched pairs with match confidence (exact, approximate, unmatched)
- Display match results with color coding (green=matched, yellow=approximate, red=unmatched)

### FR-3: Manual Match and Override
- Allow user to manually link an unmatched statement line to a specific journal entry line
- Allow user to reject an auto-match (unlink matched pair)
- Allow user to mark a statement line as "not in books" (bank charge, interest earned, etc.)
- For "not in books" items, provide option to create adjustment journal entry

### FR-4: Reconciliation Summary
- Show three-column comparison:
  - **Statement Balance** (from uploaded CSV closing balance)
  - **Book Balance** (sum of matched journal entry lines for the period)
  - **Difference** (Statement minus Book — must be zero to finalize)
- Show counts: total statement lines, matched count, unmatched count
- Show total amounts: total deposits on statement, total withdrawals on statement
- Highlight when difference is zero (ready to finalize)

### FR-5: Finalize Reconciliation
- Block finalization if difference is not zero (show clear message why)
- On finalize:
  - Update `bank_statements.status` to `reconciled`
  - Store final reconciliation data (statement balance, book balance, difference, matched counts)
  - Lock the reconciliation period (no further changes to matched items)
  - Generate reconciliation summary report
- Allow undo of finalization ( reopen reconciliation) with reason

### FR-6: Reconciliation History
- List all past reconciliations per bank account
- Show: period, statement balance, book balance, difference, status, finalized date
- Allow viewing details of any past reconciliation
- Show outstanding items carried forward from previous periods

### FR-7: Outstanding Items Tracking
- Track deposits in transit (recorded in books but not yet on bank statement)
- Track outstanding checks (issued but not yet cleared)
- Carry forward outstanding items to next reconciliation period
- Show outstanding items summary on reconciliation page

## Edge Cases

- CSV with no matching columns (show clear error message with expected format)
- CSV with duplicate rows (deduplicate by date + amount + reference)
- Statement line matches multiple journal entries (show all candidates, let user pick)
- Journal entry has no matching statement line (carry forward as outstanding)
- Bank statement shows a transaction not in books (create adjustment entry or flag)
- Amount matches but date is outside ±3 day window (show as unmatched, allow manual link)
- Statement import for a period already reconciled (block, show existing reconciliation)
- Zero-amount statement lines (skip during import)
- CSV with different decimal separator (comma vs period — handle both)

## Out of Scope

- Bank feed API integration (auto-sync from bank — future phase)
- Multi-currency reconciliation (PKR only for now)
- Automatic adjustment journal entry creation (user must manually create)
- Real-time bank balance sync
- Mobile photo check deposit integration

## Acceptance Criteria

- [ ] CSV upload parses statement lines correctly for HBL, Meezan, UBL formats
- [ ] Auto-match links statement lines to journal entries by amount ± date
- [ ] Manual match allows user to link any statement line to any journal entry
- [ ] Reconciliation summary shows statement balance, book balance, and difference
- [ ] Finalization blocked when difference is not zero
- [ ] Finalization persists all match results to database
- [ ] Reconciliation history shows all past reconciliations per bank account
- [ ] Outstanding items carried forward to next period
- [ ] All queries filter by `orgId`
- [ ] TypeScript: 0 errors
- [ ] All tests pass (`npm run test`)
