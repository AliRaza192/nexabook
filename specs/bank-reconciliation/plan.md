# plan.md — Bank Reconciliation Feature

## Approach

Reuse existing infrastructure: `parseBankStatementCSV` in `bank-reconciliation.ts`, `bank_statements` table, `autoMatchTransactions` server action. Build the missing pieces: CSV upload UI, reconciliation persistence, finalize action, history page, and outstanding items tracking.

## Key Decisions

- **Import method:** CSV upload only (simplest for Pakistani banks, no API dependency)
- **Date tolerance:** ±3 calendar days for auto-matching
- **Undo:** Allow undo of finalization with mandatory reason
- **Outstanding items:** Track and carry forward to next period
- **Unbooked items:** Flag only, user creates manual journal entry
- **UI location:** Extend existing `/accounts/reconciliation` page

## Architecture

```
User uploads CSV
    │
    ▼
parseBankStatementCSV() → StatementLine[]
    │
    ▼
Store in bank_statements (JSONB lines)
    │
    ▼
autoMatchTransactions() → matched pairs
    │
    ▼
Display: Statement Lines vs Journal Entry Lines
    │
    ▼
User reviews: accept/reject/manual link
    │
    ▼
Finalize: persist matches, lock period, generate report
```

## Touch Points

- **Modify:** `src/lib/actions/bank-reconciliation.ts` — add finalize, undo, history actions
- **Modify:** `src/app/(dashboard)/accounts/reconciliation/page.tsx` — add CSV upload, match UI, finalize button
- **New:** `src/components/bank-reconciliation/` — reusable reconciliation components
- **Reuse:** `parseBankStatementCSV`, `autoMatchTransactions`, `saveMatchResult` (already exist)
- **Reuse:** `bank_statements`, `journal_entries`, `journal_entry_lines` tables (already exist)

## Database Changes

None required. All needed tables and columns already exist. Outstanding items will use the existing `bank_statements.lines` JSONB with an `outstanding` flag.

## Risk Mitigation

- CSV parsing already tested in existing `parseBankStatementCSV`
- Auto-match algorithm already exists in `autoMatchTransactions`
- Main risk: reconciliation page is 369 lines of inline code — need to extract components carefully
- Use `db.transaction()` for finalize operation (atomicity)
