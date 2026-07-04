# Contra Entry & Cash Book Report Implementation

## Overview
Successfully implemented Contra Entry logic for Cash ↔ Bank transfers and a professional Cash Book Report for NexaBook. The implementation includes server actions, UI components, and comprehensive reporting with running balances.

## Implementation Details

### 1. Contra Entry Logic (`src/lib/actions/banking.ts`)

#### `createContraEntry(data: ContraEntryFormData)`

**Purpose:** Handle transfers between Cash and Bank accounts through journal entries.

**Logic:**
1. Validates that From and To accounts are different
2. Validates amount is positive
3. Generates unique entry number (CE-00001, CE-00002, etc.)
4. Creates journal entry with:
   - **Debit:** To Account (receiving account)
   - **Credit:** From Account (sending account)
5. Creates audit log with action `CONTRA_ENTRY_CREATED`

**Entry Number Format:**
- Prefix: `CE-` (Contra Entry)
- Sequential: 5 digits (00001, 00002, etc.)

**Validation Rules:**
- ✅ From and To accounts cannot be the same
- ✅ Amount must be positive
- ✅ Both accounts must exist in Chart of Accounts
- ✅ Organization-scoped (orgId required)

**Interface:**
```typescript
interface ContraEntryFormData {
  entryDate: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  reference?: string;
  description?: string;
}
```

**Return Value:**
```typescript
{
  success: true,
  data: journalEntry,
  entryNumber: "CE-00001",
  message: "Contra entry CE-00001 created successfully"
}
```

### 2. Banking UI Update (`app/(dashboard)/accounts/banking/page.tsx`)

#### Quick Transfer Cards

Added two prominent action cards in the Banking page:

**1. Cash to Bank Transfer**
- **Color:** Green
- **Icon:** ArrowUpRight
- **Purpose:** Deposit cash into bank account
- **Flow:** From Cash Account → To Bank Account

**2. Bank to Cash Withdrawal**
- **Color:** Blue
- **Icon:** ArrowDownLeft
- **Purpose:** Withdraw cash from bank account
- **Flow:** From Bank Account → To Cash Account

#### Dialog Form

Both transfers use the same form structure:
- **Date:** Defaults to current date
- **From Account:** Dropdown (filtered by type: cash or bank)
- **To Account:** Dropdown (filtered by type: bank or cash)
- **Amount:** Numeric input with validation
- **Reference:** Optional reference number
- **Description:** Optional description text

**Account Filtering:**
- Cash to Bank: Shows cash accounts in "From", bank accounts in "To"
- Bank to Cash: Shows bank accounts in "From", cash accounts in "To"

**User Experience:**
1. Click transfer card
2. Dialog opens with pre-filled date
3. Select accounts and enter amount
4. Submit creates journal entry
5. Success alert shows entry number
6. Page refreshes with new data

### 3. Cash Book Report Logic (`src/lib/actions/reports.ts`)

#### `getCashBookReport(dateFrom, dateTo)`

**Purpose:** Generate comprehensive cash book with opening/closing balances and running balance.

**Logic Flow:**

1. **Find Cash Account**
   ```typescript
   // Search for account with 'cash' in name (asset type)
   WHERE LOWER(name) LIKE '%cash%' AND type = 'asset'
   ```

2. **Calculate Opening Balance**
   ```typescript
   // Sum all transactions BEFORE dateFrom
   Opening Balance = Total Debits - Total Credits (before period)
   ```

3. **Fetch Transactions**
   ```typescript
   // Get all journal entries for cash account within date range
   WHERE entryDate >= dateFrom AND entryDate <= dateTo
   ORDER BY entryDate, entryNumber
   ```

4. **Calculate Running Balance**
   ```typescript
   runningBalance = openingBalance
   for each transaction:
     runningBalance += cashIn - cashOut
   ```

5. **Calculate Totals**
   ```typescript
   Total Cash In = SUM(all debit amounts)
   Total Cash Out = SUM(all credit amounts)
   Closing Balance = Opening Balance + Total Cash In - Total Cash Out
   ```

**Return Structure:**
```typescript
interface CashBookReport {
  openingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  closingBalance: number;
  transactions: CashBookTransaction[];
  cashAccount: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface CashBookTransaction {
  id: string;
  date: Date;
  entryNumber: string;
  description: string;
  cashIn: number;
  cashOut: number;
  runningBalance: number;
  referenceType: string;
}
```

**Error Handling:**
- ✅ Organization not found
- ✅ Cash account not found (helpful error message)
- ✅ Date validation
- ✅ Database errors

### 4. Cash Book Report Page (`app/(dashboard)/reports/cash-book/page.tsx`)

#### Professional Report Layout

**Components:**

1. **Report Filter Bar**
   - Date range selector (From/To)
   - Automatic reload on filter change
   - Uses standard `ReportFilterBar` component

2. **Summary Cards (4 cards)**
   - **Opening Balance:** Blue theme with Wallet icon
   - **Total Cash In:** Green theme with TrendingUp icon
   - **Total Cash Out:** Red theme with TrendingDown icon
   - **Closing Balance:** Dark theme with DollarSign icon

3. **Cash Account Info**
   - Displays cash account name and code
   - Badge-style display

4. **Transactions Table**
   - **Columns:**
     - Date
     - Entry #
     - Description
     - Cash In (Dr) - Green
     - Cash Out (Cr) - Red
     - Running Balance - Color-coded (green if positive, red if negative)

   - **Special Rows:**
     - **Opening Balance Row:** Blue background, shows starting balance
     - **Closing Balance Row:** Dark background, shows final totals

5. **Export Buttons**
   - PDF Export (using `window.print()`)
   - Excel Export (using table export)
   - Hidden on print (`print-hidden` class)

**Empty State:**
- Wallet icon
- "No Transactions Found" message
- Helpful text for empty date ranges

**Error State:**
- Shows message if cash account not configured
- Guides user to create Cash account

#### Styling Features

- ✅ Nexa-Blue theme throughout
- ✅ Pakistani number formatting (Lakh/Crore)
- ✅ Responsive grid layout
- ✅ Print-optimized styles
- ✅ Hover effects on table rows
- ✅ Motion animations for rows
- ✅ Color-coded amounts (Green for In, Red for Out)

### 5. Integration (`app/(dashboard)/reports/page.tsx`)

Added Cash Book to Financial Reports section:

```typescript
{ name: "Cash Book", href: "/reports/cash-book", description: "Cash transactions with running balance" }
```

**Position:** Between Trial Balance and Cash Flow Statement

## Technical Implementation

### Database Queries

**Opening Balance Calculation:**
```typescript
const openingBalanceResult = await db
  .select({
    totalDebit: sql<string>`SUM(${journalEntryLines.debitAmount})`,
    totalCredit: sql<string>`SUM(${journalEntryLines.creditAmount})`,
  })
  .from(journalEntryLines)
  .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
  .where(and(
    eq(journalEntryLines.orgId, orgId),
    eq(journalEntryLines.accountId, cashAccountId),
    sql`${journalEntries.entryDate} < ${fromDate}`
  ));
```

**Transaction Fetch:**
```typescript
const transactionsResult = await db
  .select({
    id: journalEntryLines.id,
    date: journalEntries.entryDate,
    entryNumber: journalEntries.entryNumber,
    description: journalEntryLines.description,
    debitAmount: journalEntryLines.debitAmount,
    creditAmount: journalEntryLines.creditAmount,
    referenceType: journalEntries.referenceType,
  })
  .from(journalEntryLines)
  .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
  .where(and(
    eq(journalEntryLines.orgId, orgId),
    eq(journalEntryLines.accountId, cashAccountId),
    sql`${journalEntries.entryDate} >= ${fromDate}`,
    sql`${journalEntries.entryDate} <= ${toDate}`
  ))
  .orderBy(journalEntries.entryDate, journalEntries.entryNumber);
```

### Running Balance Calculation

```typescript
let runningBalance = openingBalance;
let totalCashIn = 0;
let totalCashOut = 0;

const transactions: CashBookTransaction[] = transactionsResult.map(row => {
  const cashIn = parseFloat(row.debitAmount || '0');
  const cashOut = parseFloat(row.creditAmount || '0');
  
  runningBalance += cashIn - cashOut;
  totalCashIn += cashIn;
  totalCashOut += cashOut;

  return {
    id: row.id,
    date: row.date,
    entryNumber: row.entryNumber,
    description: row.description || '',
    cashIn,
    cashOut,
    runningBalance,
    referenceType: row.referenceType || '',
  };
});
```

## Usage Examples

### Contra Entry Example

**Scenario:** Deposit Rs. 50,000 cash into bank account

1. Navigate to Banking page
2. Click "Cash to Bank Transfer" card
3. Fill form:
   - Date: Today
   - From: Main Cash Account
   - To: HBL Checking Account
   - Amount: 50,000
   - Description: "Daily cash deposit"
4. Submit

**Result:**
- Journal Entry created: CE-00001
- Debit: HBL Checking Rs. 50,000
- Credit: Main Cash Rs. 50,000
- Alert: "Contra entry CE-00001 created successfully"

### Cash Book Report Example

**Scenario:** Generate cash book for March 2026

1. Navigate to Reports → Cash Book
2. Set date range: March 1 - March 31, 2026
3. Report displays:

```
Summary Cards:
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Opening Balance │ Total Cash In   │ Total Cash Out  │ Closing Balance │
│ Rs. 1,00,000.00 │ Rs. 5,50,000.00 │ Rs. 4,75,000.00 │ Rs. 1,75,000.00 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘

Transactions:
Date        Entry #   Description           Cash In      Cash Out     Balance
Mar 1       —         Opening Balance       —            —            1,00,000
Mar 3       CE-00001  Cash deposit          —            50,000       50,000
Mar 5       JE-00123  Customer payment      75,000       —            1,25,000
Mar 10      CE-00002  Cash withdrawal       25,000       —            1,50,000
Mar 15      JE-00145  Office expense        —            15,000       1,35,000
...
Mar 31      —         Closing Balance       5,50,000     4,75,000     1,75,000
```

## Files Modified/Created

### Server Actions
- ✅ `src/lib/actions/banking.ts` - Added `createContraEntry` function
- ✅ `src/lib/actions/reports.ts` - Added `getCashBookReport` function

### UI Pages
- ✅ `src/app/(dashboard)/accounts/banking/page.tsx` - Added contra entry dialogs
- ✅ `src/app/(dashboard)/reports/cash-book/page.tsx` - New Cash Book report page
- ✅ `src/app/(dashboard)/reports/page.tsx` - Added Cash Book link

### Interfaces
- ✅ `ContraEntryFormData` - Banking actions interface
- ✅ `CashBookTransaction` - Report transaction interface
- ✅ `CashBookReport` - Complete report data interface

## Build Status

✅ **All changes compile successfully**
✅ **No TypeScript errors**
✅ **No runtime errors detected**
✅ **Cash Book route registered: `/reports/cash-book`**

## Testing Checklist

- [x] Contra entry creates journal entry correctly
- [x] From/To validation prevents same account
- [x] Cash to Bank transfer debits bank, credits cash
- [x] Bank to Cash withdrawal debits cash, credits bank
- [x] Cash Book finds cash account automatically
- [x] Opening balance calculated correctly
- [x] Running balance updates per transaction
- [x] Total Cash In/Out accurate
- [x] Closing balance matches expected
- [x] Empty state displays properly
- [x] Error handling for missing cash account
- [x] Pakistani number formatting applied
- [x] Export buttons functional
- [x] Print layout clean
- [x] Build compiles without errors

## Benefits

1. **Simplified Cash Management:** Quick transfers between cash and bank
2. **Accurate Tracking:** Every contra entry creates proper journal entry
3. **Real-time Visibility:** Cash book shows up-to-date cash position
4. **Running Balances:** Always know current cash balance
5. **Audit Trail:** All transfers logged with descriptions
6. **Professional Reports:** Export-ready cash book for accountants
7. **Organization Safety:** All operations scoped to orgId

## Future Enhancements

1. **Multi-Cash Accounts:** Support multiple cash accounts in report
2. **Contra Entry List:** View all contra entries in banking page
3. **Recurring Transfers:** Schedule automatic cash transfers
4. **Cash Flow Forecast:** Predict future cash positions
5. **Bank Reconciliation:** Match contra entries with bank statements
6. **Bulk Contra Entries:** Process multiple transfers at once
7. **Contra Templates:** Save frequently used transfer patterns

## Accounting Principles

### Double-Entry Bookkeeping
Every contra entry follows double-entry principles:
- **Debit:** Receiving account (increases)
- **Credit:** Sending account (decreases)
- **Total Debits = Total Credits**

### Cash Book Purpose
The cash book serves multiple accounting needs:
1. **Primary Record:** All cash transactions
2. **Balance Tracking:** Running balance visibility
3. **Reconciliation:** Match with physical cash counts
4. **Audit Trail:** Complete transaction history
5. **Financial Reporting:** Input for cash flow statements

### Journal Entry Structure
```
Contra Entry: Cash to Bank
┌─────────────────────┬──────────┬──────────┐
│ Account             │ Debit    │ Credit   │
├─────────────────────┼──────────┼──────────┤
│ Bank Account        │ 50,000   │          │
│ Cash Account        │          │ 50,000   │
├─────────────────────┼──────────┼──────────┤
│ Total               │ 50,000   │ 50,000   │
└─────────────────────┴──────────┴──────────┘
```

## Conclusion

The Contra Entry and Cash Book Report implementation provides comprehensive cash management capabilities for NexaBook users. The system ensures accurate tracking of all cash transactions while maintaining proper accounting principles and providing professional, exportable reports.
