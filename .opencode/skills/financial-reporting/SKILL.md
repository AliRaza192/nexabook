---
name: financial-reporting
description: >
  Generates financial reports: P&L, Balance Sheet, Trial Balance, Cash Flow, and custom reports.
  Use when: "generate report", "P&L", "balance sheet", "trial balance", "financial report",
  "report banao", "profit loss", "cash flow", "general ledger".
  Do NOT use for: inventory reports, sales reports, or tax returns (use other skills).
---

# Financial Reporting Skill

## Goal

Generate accurate financial reports following double-entry accounting principles and Pakistani business standards. All reports must be exportable to PDF and Excel.

## When to Use

- User wants P&L, Balance Sheet, or Trial Balance
- User says "report generate karo" or "P&L banao"
- User wants cash flow statement
- User wants general ledger or account statement
- User wants budget vs actual comparison

## Instructions

### Step 1: Determine Report Type

Identify which report user needs:
- **Profit & Loss** — Revenue vs Expenses for a period
- **Balance Sheet** — Assets = Liabilities + Equity at a point in time
- **Trial Balance** — All accounts with debit/credit balances
- **Cash Flow** — Cash inflows and outflows
- **General Ledger** — All transactions for an account
- **Account Statement** — Transactions for a specific contact

### Step 2: Set Date Range

For period reports (P&L, Cash Flow):
- Start date: first day of period
- End date: last day of period
- Default: current month

For point-in-time reports (Balance Sheet):
- As of date: end of period

### Step 3: Gather Data

#### For Profit & Loss:
```
Revenue Accounts:
  Sales Revenue
  Other Income
  ─────────────
  Total Revenue

Expense Accounts:
  Cost of Goods Sold
  Operating Expenses
  ─────────────
  Total Expenses

Net Profit = Total Revenue - Total Expenses
```

Query: Sum all journal entry lines for income/expense accounts in date range.

#### For Balance Sheet:
```
Assets:
  Current Assets (Cash, Receivables, Inventory)
  Fixed Assets (Property, Equipment)
  ─────────────
  Total Assets

Liabilities:
  Current Liabilities (Payables, Tax Payable)
  Long-term Liabilities (Loans)
  ─────────────
  Total Liabilities

Equity:
  Owner's Equity
  Retained Earnings
  ─────────────
  Total Equity

Verify: Total Assets = Total Liabilities + Total Equity
```

Query: Sum all journal entry lines for asset/liability/equity accounts.

#### For Trial Balance:
```
Account Code | Account Name | Debit | Credit
1001         | Cash         | 50,000|
1101         | Receivables  | 30,000|
2001         | Payables     |       | 20,000|
3001         | Capital      |       | 60,000|
─────────────────────────────────────────────
Total                        80,000 | 80,000
```

Query: Sum all journal entry lines grouped by account. Debits must equal Credits.

#### For Cash Flow:
```
Operating Activities:
  Cash from Customers
  Cash to Suppliers
  Cash for Salaries
  Cash for Expenses
  ─────────────
  Net Cash from Operations

Investing Activities:
  Purchase of Fixed Assets
  Sale of Fixed Assets
  ─────────────
  Net Cash from Investing

Financing Activities:
  Loan Received
  Loan Repayment
  Owner Drawings
  ─────────────
  Net Cash from Financing

Net Change = Operations + Investing + Financing
Opening Cash + Net Change = Closing Cash
```

### Step 4: Validate Data

Before generating report:
1. **Trial Balance check:** Debits = Credits (must be exact)
2. **Balance Sheet check:** Assets = Liabilities + Equity
3. **Cash Flow check:** Opening + Change = Closing
4. **No orphan entries:** Every journal entry line has valid account

### Step 5: Format Report

Apply formatting:
- Currency: PKR with South Asian number format (e.g., Rs. 12,34,567)
- Negative amounts: in parentheses or red
- Subtotals and totals: bold
- Headers: company name, report name, date range
- Footer: page number, generated date

### Step 6: Generate Output

Options:
- **PDF** — Professional format for printing/sharing
- **Excel** — For further analysis
- **On-screen** — Interactive view with drill-down

### Step 7: Add Filters (if requested)

Common filters:
- Date range
- Account category (assets, liabilities, etc.)
- Cost center
- Department
- Project

### Step 8: Compare with Budget (if requested)

For P&L with budget comparison:
1. Fetch budget amounts from `budgets` table
2. Calculate variance: actual - budget
3. Calculate variance %: (variance / budget) × 100
4. Highlight significant variances (>10%)

## Edge Cases

- **No data for period:** Show "No transactions for this period"
- **Multi-currency:** Convert to PKR using exchange rates, show both
- **Inter-company:** Consolidate across organizations
- **Prior period adjustment:** Show adjustment entries separately
- **Rounding differences:** Show as "rounding adjustment" line

## References

- [Report Formats](references/report-formats.md)
- [Accounting Standards](references/accounting-standards.md)
