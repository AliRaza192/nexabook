# Tax Management & Reporting Module

## Status: ✅ VERIFIED & ENHANCED

## Summary

The Tax Management & Reporting module for NexaBook has been **verified and enhanced** with professional features. The server actions were already correctly implemented, and the UI has been upgraded with Pakistani number formatting, export buttons, enhanced KPI cards with icons, and the Nexa-Blue theme.

## Implementation Details

### 1. Server Actions (Already Existed)

#### `getTaxSummary(dateFrom, dateTo)` - `src/lib/actions/accounts.ts` (Line 521)

**Purpose:** Generate comprehensive tax summary for any date range.

**Implementation:**

```typescript
export async function getTaxSummary(
  dateFrom: string,
  dateTo: string
): Promise<{
  success: boolean;
  data?: {
    outputTax: string;
    inputTax: string;
    netTaxPayable: string;
    monthlyBreakdown: MonthlyTaxBreakdown[];
  };
  error?: string;
}>
```

**Logic Flow:**

1. **Output Tax (Sales Tax Collected)**
   ```typescript
   // Sum of taxAmount from invoices table
   // Filtered by date range
   // Excludes status: 'draft', 'cancelled'
   const [outputResult] = await db
     .select({ total: sql<string>`SUM(COALESCE(${invoices.taxAmount}, 0))` })
     .from(invoices)
     .where(and(
       eq(invoices.orgId, orgId),
       sql`${invoices.issueDate} >= ${from}`,
       sql`${invoices.issueDate} <= ${to}`,
       sql`${invoices.status} NOT IN ('draft', 'cancelled')`
     ));
   ```

2. **Input Tax (Purchase Tax Paid)**
   ```typescript
   // Sum of taxTotal from purchase_invoices table
   // Filtered by date range
   // Excludes status: 'Draft', 'Revised'
   const [inputResult] = await db
     .select({ total: sql<string>`SUM(COALESCE(${purchaseInvoices.taxTotal}, 0))` })
     .from(purchaseInvoices)
     .where(and(
       eq(purchaseInvoices.orgId, orgId),
       sql`${purchaseInvoices.date} >= ${from}`,
       sql`${purchaseInvoices.date} <= ${to}`,
       sql`${purchaseInvoices.status} NOT IN ('Draft', 'Revised')`
     ));
   ```

3. **Net Tax Payable**
   ```typescript
   const netTaxPayable = outputTax - inputTax;
   ```

4. **Monthly Breakdown**
   - Fetches all sales invoices and groups by month (YYYY-MM)
   - Fetches all purchase invoices and groups by month (YYYY-MM)
   - Merges both datasets into single monthly breakdown
   - Calculates net payable/refundable per month

**Return Structure:**

```typescript
interface MonthlyTaxBreakdown {
  month: string;         // YYYY-MM format
  outputTax: string;     // Sales tax collected
  input_tax: string;     // Purchase tax paid
  net_tax: string;       // Net payable (positive) or refundable (negative)
}

interface TaxSummaryResult {
  outputTax: string;
  inputTax: string;
  netTaxPayable: string;
  monthlyBreakdown: MonthlyTaxBreakdown[];
}
```

**Key Features:**
- ✅ Organization-scoped (orgId required)
- ✅ Date range filtering
- ✅ Status filtering (excludes drafts/cancelled)
- ✅ COALESCE for null handling
- ✅ Monthly grouping and aggregation
- ✅ Sorted chronologically

### 2. UI Implementation (`app/(dashboard)/accounts/tax/page.tsx`)

#### Professional Tax Dashboard

**Top Controls (Print-Hidden):**
- ✅ **Period Type Dropdown:**
  - Current Month
  - Current Quarter
  - Custom Range (shows date pickers)
- ✅ **Generate Tax Report:** Button with loading state
- ✅ **Export Buttons:** PDF and Excel export (using `ReportExportButtons`)
- ✅ **Print Button:** Triggers `window.print()`

**KPI Cards (3 cards with icons):**

1. **Output Tax Collected (Sales)**
   - Icon: TrendingUp (green)
   - Color: Green theme
   - Description: "Sales tax collected from customers"
   - Amount: Pakistani format (Lakh/Crore)

2. **Input Tax Paid (Purchases)**
   - Icon: TrendingDown (blue)
   - Color: Blue theme
   - Description: "Input tax recoverable from suppliers"
   - Amount: Pakistani format (Lakh/Crore)

3. **Net Tax Payable**
   - Icon: DollarSign (red if payable, green if refund)
   - Color: Red (payable) or Green (refund)
   - Description: Dynamic based on value
   - Amount: Pakistani format with color coding

**Monthly Breakdown Table:**

| Column | Format | Styling |
|--------|--------|---------|
| **Month** | "January 2026" | Standard text |
| **Output Tax** | Rs. X,XX,XXX.XX | Green, monospace |
| **Input Tax** | Rs. X,XX,XXX.XX | Blue, monospace |
| **Net Payable** | Rs. X,XX,XXX.XX | Red (payable) or Green (refund) |
| **Status** | Badge | Red "Payable" or Green "Refund" or "Nil" |

**Tax Rates Section:**

Shows standard Pakistani tax rates:
- Standard GST Rate: 18%
- Reduced Rate: 5%
- Zero Rated: 0%
- Exempt: —

### 3. Professional Features

#### Pakistani Number Formatting

All amounts use the `formatPKR` utility with South Asian format:

```typescript
function fmt(n: string): string {
  return formatPKR(parseFloat(n), 'south-asian');
}
```

**Examples:**
- `1,000` → `Rs. 1,000.00`
- `100,000` → `Rs. 1,00,000.00` (1 Lakh)
- `10,000,000` → `Rs. 1,00,00,000.00` (1 Crore)

#### Color Coding

**Net Tax Payable:**
- **Positive (>= 0):** Red - Liability (Tax payable to FBR)
- **Negative (< 0):** Green - Refund Due (Tax refundable from FBR)
- **Zero:** Balanced - No tax due

**Monthly Breakdown Status:**
- **Payable:** Red badge
- **Refund:** Green badge
- **Nil:** Outline badge

#### Report Export Buttons

Integrated `ReportExportButtons` component:
- ✅ **PDF Export:** Uses `window.print()` with print CSS
- ✅ **Excel Export:** Exports table data to Excel format
- ✅ **Hidden on Print:** Export buttons don't appear in printed output

#### Nexa-Blue Theme

Consistent styling throughout:
- ✅ Primary color: `text-nexabook-900` (dark blue)
- ✅ Secondary color: `text-nexabook-600` (medium blue)
- ✅ Background: `bg-nexabook-50` (light blue)
- ✅ Cards: `enterprise-card` class
- ✅ Accent colors: Green (Output Tax), Blue (Input Tax), Red/Green (Net)

#### Print Optimization

- ✅ Filter bar hidden on print (`print-hidden` class)
- ✅ Export buttons hidden on print
- ✅ Clean table layout for printing
- ✅ Proper page breaks
- ✅ All amounts formatted correctly

### 4. User Flow

**Step-by-Step Usage:**

1. **Navigate to Accounts → Tax Management**
2. **Select Period:**
   - Current Month (default)
   - Current Quarter
   - Custom Range (select From/To dates)
3. **Click "Generate Tax Report"**
4. **View Report:**
   - 3 KPI cards (Output, Input, Net)
   - Monthly breakdown table (if multiple months)
   - Tax rates reference table
5. **Export Options:**
   - Click "PDF" to download/print
   - Click "Excel" to download spreadsheet
   - Click "Print" for browser print

### 5. Example Output

**Period: January 1-31, 2026 (Monthly)**

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ Output Tax (Sales)   │ Input Tax (Purchases)│ Net Tax Payable      │
│ Rs. 5,50,000.00      │ Rs. 3,75,000.00      │ Rs. 1,75,000.00      │
│ Sales tax collected  │ Input tax recoverable│ Tax payable to FBR   │
└──────────────────────┴──────────────────────┴──────────────────────┘

Monthly Breakdown:
Month           Output Tax      Input Tax       Net Payable     Status
January 2026    5,50,000        3,75,000        1,75,000        Payable
February 2026   6,25,000        4,50,000        1,75,000        Payable
March 2026      4,75,000        5,00,000        -25,000         Refund

Tax Rates:
┌─────────────────────┬──────────┬──────────────────────────────┬────────┐
│ Tax Name            │ Rate (%) │ Applied To                   │ Status │
├─────────────────────┼──────────┼──────────────────────────────┼────────┤
│ Standard GST Rate   │ 18%      │ Most goods and services      │ Active │
│ Reduced Rate        │ 5%       │ Essential items and basic    │ Active │
│ Zero Rated          │ 0%       │ Exports and exempt supplies  │ Active │
│ Exempt              │ —        │ Supplies outside tax net     │ Active │
└─────────────────────┴──────────┴──────────────────────────────┴────────┘
```

## Technical Implementation

### Database Tables Used

**invoices Table (Sales):**
- `taxAmount`: Sales tax charged on invoice
- `status`: draft, pending, approved, sent, paid, partial, overdue, cancelled
- `issueDate`: Invoice date
- `orgId`: Organization ID

**purchaseInvoices Table (Purchases):**
- `taxTotal`: Purchase tax paid on bill
- `status`: Draft, Approved, Revised
- `date`: Invoice date
- `orgId`: Organization ID

### Monthly Grouping Logic

```typescript
// Group by YYYY-MM
const monthMap = new Map<string, { output: number; input: number }>();

// Process sales invoices
for (const row of salesRows) {
  const key = `${row.issueDate.getFullYear()}-${String(row.issueDate.getMonth() + 1).padStart(2, '0')}`;
  const entry = monthMap.get(key) || { output: 0, input: 0 };
  entry.output += parseFloat(row.taxAmount || '0');
  monthMap.set(key, entry);
}

// Process purchase invoices
for (const row of purchaseRows) {
  const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
  const entry = monthMap.get(key) || { output: 0, input: 0 };
  entry.input += parseFloat(row.taxTotal || '0');
  monthMap.set(key, entry);
}

// Convert to array and sort
const monthlyBreakdown = Array.from(monthMap.entries())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([month, v]) => ({
    month,
    outputTax: v.output.toFixed(2),
    input_tax: v.input.toFixed(2),
    net_tax: (v.output - v.input).toFixed(2),
  }));
```

### Tax Calculation Formula

```
Net Tax Payable = Output Tax - Input Tax

If Net Tax Payable > 0:  Tax payable to FBR
If Net Tax Payable < 0:  Tax refund due from FBR
If Net Tax Payable = 0:  No tax due (balanced)
```

### Error Handling

**Server-side:**
- ✅ Organization not found
- ✅ Date validation
- ✅ Database query errors
- ✅ COALESCE for null tax amounts

**Client-side:**
- ✅ Loading states
- ✅ Empty state messages
- ✅ No transactions found state
- ✅ Disabled generate button when custom range incomplete

## Files Verified/Modified

### Server Actions (Already Existed)
- ✅ `src/lib/actions/accounts.ts` - `getTaxSummary()` (Line 521)
- ✅ `src/lib/actions/accounts.ts` - `MonthlyTaxBreakdown` interface (Line 514)

### UI Pages (Enhanced)
- ✅ `src/app/(dashboard)/accounts/tax/page.tsx` - Enhanced with professional features

### Dependencies (Already Available)
- ✅ `@/lib/utils/number-format` - `formatPKR` function
- ✅ `@/components/reports/ReportExportButtons` - Export component
- ✅ `@/components/ui/*` - Shadcn UI components

## Build Status

✅ **All changes compile successfully**
✅ **No TypeScript errors**
✅ **No runtime errors detected**
✅ **Static pages generated: 107/107**

## Testing Checklist

- [x] Period selection works (monthly, quarterly, custom)
- [x] Custom date range validation
- [x] Output tax calculates from sales invoices
- [x] Input tax calculates from purchase invoices
- [x] Net tax payable calculates correctly
- [x] Monthly breakdown groups by month correctly
- [x] Pakistani number formatting applied (Lakh/Crore)
- [x] Color coding works (red for payable, green for refund)
- [x] Export buttons functional (PDF, Excel)
- [x] Print layout clean
- [x] Empty states display properly
- [x] Loading states show correctly
- [x] Nexa-Blue theme applied
- [x] Tax rates table displays correctly
- [x] Build compiles without errors

## Benefits

1. **Tax Compliance:** Accurate calculation of GST payable to FBR
2. **Input Tax Recovery:** Track tax paid on purchases
3. **Monthly Tracking:** See tax trends over time
4. **Professional Reports:** Export-ready for tax filings
5. **Pakistani Formatting:** Familiar Lakh/Crore number format
6. **Quick Analysis:** KPI cards for instant insights
7. **Status Indicators:** Clear payable/refundable badges

## Accounting Principles

### GST (Goods & Services Tax)

**Output Tax (Sales Tax):**
- Tax collected from customers on sales
- Liability to government
- Calculated on taxable supplies
- Rate: 18% standard, 5% reduced, 0% zero-rated

**Input Tax (Purchase Tax):**
- Tax paid to suppliers on purchases
- Recoverable from government
- Can be offset against output tax
- Must have valid tax invoices

**Net Tax Payable:**
```
Net GST Payable = Output Tax - Input Tax

If positive: Pay to FBR
If negative: Claim refund
```

### Tax Filing Periods

- **Monthly:** Most common for registered businesses
- **Quarterly:** For smaller businesses
- **Annual:** For specific categories

### Pakistani Tax Rates

1. **Standard Rate (18%):** Most goods and services
2. **Reduced Rate (5%):** Essential items, basic goods
3. **Zero-Rated (0%):** Exports, exempt supplies
4. **Exempt:** Outside tax net (no input tax recovery)

## Future Enhancements

1. **WHT (Withholding Tax):** Add WHT tracking and reporting
2. **Tax Invoices:** Generate FBR-compliant tax invoices
3. **Auto-Filing:** Direct submission to FBR portal
4. **Tax Calendar:** Reminders for filing deadlines
5. **Multi-Rate Support:** Different rates per product category
6. **Tax Audit Trail:** Detailed transaction-level tax report
7. **Input Tax Adjustment:** Handle credits/debit notes
8. **Tax Refund Tracking:** Monitor refund claims

## Conclusion

The Tax Management & Reporting module provides comprehensive GST tracking and reporting capabilities. With Pakistani number formatting, professional export options, color-coded status indicators, and the Nexa-Blue theme, it delivers enterprise-grade tax reporting ready for FBR compliance.
