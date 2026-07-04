# spec.md — Accounting FTE

## Goal

Automate daily accounting workflows for Pakistani SMEs: auto-generate journal entries from invoices/bills, reconcile bank transactions, produce financial reports on schedule, and flag anomalies. Replace manual bookkeeping with a reliable Digital FTE that runs 24/7.

## User Scenarios

- When a sales invoice is created, then a balanced journal entry is auto-generated (Debit AR, Credit Revenue + Tax)
- When a purchase bill is entered, then a balanced journal entry is auto-generated (Debit Expense + Tax, Credit AP)
- When a bank statement CSV is uploaded, then transactions are auto-matched to existing journal entries
- When month-end approaches, then Trial Balance, P&L, and Balance Sheet are auto-generated and available
- When a journal entry is unbalanced (debits ≠ credits), then the system blocks posting and shows clear error
- When a period is closed, then no further entries can be posted to that period
- When an anomaly is detected (unusual amount, negative balance, duplicate entry), then alert is sent via NexaBot

## Functional Requirements

### FR-1: Auto Journal Entry Generation
- Generate balanced journal entries from sales invoices: Debit Accounts Receivable, Credit Sales Revenue, Credit Output GST
- Generate balanced journal entries from purchase bills: Debit Purchase Expense, Debit Input GST, Credit Accounts Payable
- Generate balanced journal entries from payment receipts: Debit Bank/Cash, Credit Accounts Receivable
- Generate balanced journal entries from payment disbursements: Debit Accounts Payable, Credit Bank/Cash
- Every journal entry must have total debits = total credits (enforced, not optional)
- Every journal entry must carry `orgId`, `createdBy`, and `status` (draft/posted/reversed)

### FR-2: Bank Reconciliation
- Accept CSV upload from major Pakistani banks (HBL, Meezan, UBL, MCB, Allied)
- Auto-match transactions by amount + date (±3 days tolerance window)
- Flag unmatched transactions for manual review with clear reason
- Store reconciliation status per transaction (matched/unmatched/reconciled)
- Generate reconciliation report showing matched vs unmatched counts and amounts

### FR-3: Financial Reports
- **Trial Balance:** All accounts with debit/credit balances, total must equal zero
- **Profit & Loss:** Revenue minus Expenses equals Net Profit/Loss, filterable by period
- **Balance Sheet:** Assets equals Liabilities plus Equity, as of a specific date
- **General Ledger:** All transactions for any account, filterable by date range
- All reports MUST exclude draft journal entries
- All reports MUST filter by `orgId`

### FR-4: Period Management
- Monthly periods (January through December)
- Period closing creates closing entries (transfer P&L to Retained Earnings)
- Closed periods cannot accept new journal entries
- Year-end closing transfers all P&L accounts to Retained Earnings

### FR-5: Anomaly Detection
- Flag journal entries with amounts greater than 3 standard deviations from the account's mean
- Flag accounts with negative balances (except Cash, Bank, and contra accounts)
- Flag potential duplicate entries (same amount, same accounts, same date within 1 day)
- Send alerts via NexaBot with entry details and suggested action

## Edge Cases

- Invoice with zero amount (still generate entry with zero values for audit trail)
- Multi-currency invoice (convert to PKR at invoice date exchange rate)
- Partial payment (split entry: partial AR clear, partial remaining as outstanding)
- Refund or credit note (reverse the original entry direction)
- Period closing with unposted drafts (block closing, show warning with count of drafts)
- Bank CSV with different column formats per bank (HBL vs Meezan vs UBL layouts)
- Concurrent edits to same journal entry (last-write-wins with audit log)
- Fiscal year that doesn't match calendar year (configurable per organization)

## Out of Scope

- Tax filing submissions (handled by Tax Compliance FTE)
- Payroll journal entries (handled by Payroll FTE)
- Inventory valuation entries (handled by Inventory FTE)
- Multi-company consolidation (future phase)
- International accounting standards (IFRS) — Pakistan-only for now
- Bank API integration (CSV import only for now)

## Acceptance Criteria

- [ ] Auto-generated journal entries always balance (total debits = total credits)
- [ ] All database queries filter by `orgId` (no cross-tenant data leakage)
- [ ] Draft entries excluded from Trial Balance, P&L, and Balance Sheet
- [ ] Trial Balance totals to exactly zero
- [ ] Balance Sheet equation holds: Assets = Liabilities + Equity
- [ ] Bank CSV import handles HBL, Meezan, UBL, MCB, Allied formats
- [ ] Period closing blocks new entries for that closed period
- [ ] Anomaly detection flags unusual transactions within 1 minute of creation
- [ ] TypeScript: 0 errors
- [ ] All tests pass (`npm run test`)

## Skills

### accounting-auto-journal
**Description:** Auto-generates balanced journal entries from invoices, bills, and payments. Fires when a financial document is posted or when manual journal entry is requested.
- Input: Invoice, bill, or payment record
- Output: Balanced journal entry with lines
- Guard: Never create unbalanced entries

### accounting-reconciliation
**Description:** Matches bank statement CSV transactions to existing journal entries. Fires when CSV is uploaded or reconciliation is requested.
- Input: Bank CSV data
- Output: Matched/unmatched transaction list
- Guard: Never auto-reconcile amounts that differ by more than Rs. 100

### accounting-reports
**Description:** Generates Trial Balance, P&L, Balance Sheet, and General Ledger reports. Fires when report is requested or period-end approaches.
- Input: Report type, date range, orgId
- Output: Formatted financial report
- Guard: Always exclude draft entries, always filter by orgId

### accounting-anomaly
**Description:** Detects unusual journal entries, negative balances, and potential duplicates. Fires after journal entry creation or on schedule.
- Input: Recent journal entries, account balances
- Output: Anomaly alerts via NexaBot
- Guard: Never block posting based on anomaly alone (alert only)
