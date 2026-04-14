# Pakistani Number Formatting Implementation (Lakh/Crore)

## Overview
Successfully implemented Pakistani/South Asian number formatting (Lakh/Crore system) globally across NexaBook, with the ability to switch between South Asian and International formats.

## Implementation Details

### 1. Core Utilities (`src/lib/utils/number-format.ts`)

#### Enhanced Functions:

**`formatPKR(amount, format?)`**
- Main formatting function
- Supports both 'south-asian' and 'international' formats
- Default: South Asian (Pakistani) format
- Example: `formatPKR(150000, 'south-asian')` → "Rs. 1,50,000.00"

**`formatPKRShort(amount)`**
- Short form for dashboard displays
- Examples: 
  - 150,000 → "1.5L" (Lakh)
  - 10,000,000 → "1Cr" (Crore)
  - 1,000 → "1K" (Thousand)

**`formatAmountWords(amount)`**
- Converts numbers to words using Pakistani terminology
- Uses Lakh, Crore instead of Million, Billion
- Example: 150,000 → "Rs. One Lakh Fifty Thousand Only"

**`formatPakistaniCurrency(amount)`**
- Alias for `formatPKR(amount, 'south-asian')`
- Maintained for backward compatibility

### 2. Number Format Preference (`src/lib/utils/number-format-preference.ts`)

New utility functions:
- `getNumberFormatPreference()` - Gets user's preference from localStorage
- `setNumberFormatPreference(format)` - Saves preference to localStorage
- Default: 'south-asian'

### 3. Dashboard Updates (`app/(dashboard)/dashboard/page.tsx`)

- All KPI cards (Revenue, Profit, AR, Inventory) now use `formatPKR`
- Chart Y-axis labels use `formatPKRShort` for compact display
- Tooltips show full formatted amounts using `formatCurrency`

Example displays:
- KPI Card: "Rs. 15,50,000.00"
- Chart Axis: "1.5L", "2.5Cr"
- Tooltip: "Rs. 15,50,000.00"

### 4. Settings Integration (`app/(dashboard)/settings/page.tsx`)

**Location**: Company Profile tab

**New Field**: Number Format dropdown
- Options:
  - "South Asian (10,00,000) - Default for Pakistan"
  - "International (1,000,000)"
- Live preview showing example format
- Stored in localStorage for persistence
- Key: `nexabook-number-format`

**User Experience**:
- Dropdown in settings page
- Immediate visual feedback with example
- Persists across sessions via localStorage

### 5. Invoice PDF (`src/lib/utils/invoice-pdf.ts`)

Already using the correct formatting:
- All financial totals use `formatPakistaniCurrency`
- "Amount in Words" section uses `formatAmountWords`
- FBR QR code amounts remain unchanged

### 6. Global Report Pages Updated

All report pages now use `formatPKR` with South Asian format:

**Financial Reports**:
- Balance Sheet
- Profit and Loss
- Trial Balance
- Cash Flow

**Receivables/Payables**:
- Customer Ledger
- Vendor Ledger
- Aged Receivables
- Aged Payables

**Sales Reports**:
- Sales by Month
- Sales Tax
- Purchase Tax
- Product Profit
- Product Aging

**Inventory Reports**:
- Stock on Hand
- Stock Movement
- Low Inventory
- BOM Cost

**HR & Payroll Reports**:
- Payroll Summary
- Employee Ledger
- Attendance

**Other Reports**:
- WHT (Withholding Tax)
- Job Order Production
- Purchase Details

### 7. Operational Pages Updated

**Sales Module**:
- Invoices (list & new)
- Orders (list & new)
- Quotations (list & new)
- Customers
- Settlement
- Refund
- Returns (list & new)
- Receive Payment
- Recurring (new)

**Purchases Module**:
- Invoices (list & new)
- Orders (list & new)
- Vendors
- Payments
- GRN (Goods Received Note)
- Settlement
- Returns (list & new)

**Other Pages**:
- Inventory Management
- POS (Point of Sale)
- Manufacturing BOM
- HR Payroll (run, employees, reports)
- Accounts Expenses
- CRM Leads

## Number Format Examples

### South Asian Format (Default)
```
1,000.00         → One Thousand
10,000.00        → Ten Thousand
1,00,000.00      → One Lakh
10,00,000.00     → Ten Lakh
1,00,00,000.00   → One Crore
10,00,00,000.00  → Ten Crore
```

### International Format
```
1,000.00         → One Thousand
10,000.00        → Ten Thousand
100,000.00       → One Hundred Thousand
1,000,000.00     → One Million
10,000,000.00    → Ten Million
100,000,000.00   → One Hundred Million
```

### Amount in Words Examples
```
150,000          → Rs. One Lakh Fifty Thousand Only
1,500,000        → Rs. Fifteen Lakh Only
10,000,000       → Rs. One Crore Only
1,25,50,500.50   → Rs. One Crore Twenty Five Lakh Fifty Thousand Five Hundred and Fifty Paisa Only
```

## Technical Implementation

### Format Logic
```typescript
// South Asian numbering:
// - Last 3 digits: hundreds
// - Every 2 digits after that: thousands, lakhs, crores

function formatPakistaniNumber(num: number): string {
  // 1000 → 1,000
  // 100000 → 1,00,000
  // 10000000 → 1,00,00,000
}
```

### Short Format Logic
```typescript
// >= 10,000,000 → Crore (Cr)
// >= 1,00,000 → Lakh (L)
// >= 1,000 → Thousand (K)

150000 → 1.5L
2500000 → 25L
10000000 → 1Cr
```

## Benefits

1. **Local Compliance**: Matches Pakistani business standards
2. **User Familiarity**: Uses format Pakistani accountants expect
3. **Flexibility**: Can switch to international format if needed
4. **Consistency**: All amounts formatted identically across the app
5. **Clarity**: Amount in words uses correct Pakistani terminology
6. **Dashboard Readability**: Short forms (L, Cr) for quick scanning

## Migration Notes

- **No database changes required** - format preference stored in localStorage
- **Backward compatible** - existing `formatPakistaniCurrency` still works
- **Default behavior** - South Asian format applied automatically
- **Build status**: ✅ All changes compile successfully

## Testing Recommendations

1. **Dashboard KPI Cards**: Verify amounts display as "Rs. X,XX,XXX.XX"
2. **Chart Axes**: Verify short format (1.5L, 2Cr) on Y-axis
3. **Reports**: Check balance sheet, P&L show formatted numbers
4. **Invoices**: PDF should show correct amounts and words
5. **Settings**: Toggle format and verify UI examples update
6. **Sales/Purchases**: All lists should use Pakistani format

## Future Enhancements

1. Add organization-level setting (database) for multi-org support
2. Add print preview with format selector
3. Support more currencies with regional formatting
4. Excel export with number format preservation
5. Mobile app format synchronization
