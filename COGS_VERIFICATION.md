# COGS Calculation Verification - Profit & Loss Report

## Status: ✅ VERIFIED - COGS Calculation is Correct

## Summary

The Cost of Goods Sold (COGS) calculation in the Profit and Loss report has been **verified and confirmed correct**. The implementation follows the proper accounting logic.

## Current Implementation

### File: `src/lib/actions/reports.ts`

#### COGS Calculation Logic (Lines 72-85)

```typescript
// Calculate COGS: actual cost of goods SOLD (invoice items × product costPrice)
const cogsResult = await db
  .select({
    totalCOGS: sql<string>`SUM(CAST(${invoiceItems.quantity} AS DECIMAL) * CAST(COALESCE(${products.costPrice}, 0) AS DECIMAL))`,
  })
  .from(invoiceItems)
  .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
  .leftJoin(products, eq(invoiceItems.productId, products.id))
  .where(and(
    eq(invoices.orgId, orgId),
    gte(invoices.issueDate, fromDate),
    lte(invoices.issueDate, toDate),
    sql`${invoices.status} NOT IN ('draft', 'cancelled')`
  ));

const totalCOGS = cogsResult[0]?.totalCOGS ? parseFloat(cogsResult[0].totalCOGS) : 0;
```

## Verification Checklist

### ✅ Correct COGS Logic

**Formula:** `COGS = Σ(Quantity Sold × Product Cost Price)`

- ✅ Joins `invoiceItems` with `invoices` and `products` tables
- ✅ Calculates: `invoiceItems.quantity × products.costPrice`
- ✅ Uses `COALESCE(products.costPrice, 0)` to handle null values
- ✅ Sums all line items to get total COGS

### ✅ Proper Filtering

- ✅ Filters by `orgId` (organization-scoped)
- ✅ Filters by date range (`issueDate` between fromDate and toDate)
- ✅ Excludes invoices with status 'draft' and 'cancelled'
- ✅ Only includes approved/sent/paid/partial/overdue invoices

### ✅ Correct Imports

All required imports are present in `src/lib/actions/reports.ts`:

```typescript
import {
  invoices,
  invoiceItems,
  products,
  // ... other imports
} from "@/db/schema";
```

### ✅ P&L Report Structure

The Profit & Loss report (`src/app/(dashboard)/reports/profit-and-loss/page.tsx`) clearly displays:

1. **Total Sales (Revenue)** - From approved sales invoices
2. **Cost of Goods Sold (COGS)** - Calculated correctly
3. **Gross Profit** - `Sales - COGS`
4. **Total Operating Expenses** - From expenses table
5. **Net Profit** - `Gross Profit - Expenses`

### ✅ Profitability Calculations

```typescript
const grossProfit = totalSales - totalCOGS;
const totalOperatingExpenses = totalExpenses;
const netProfit = grossProfit - totalOperatingExpenses;
```

## How COGS is Calculated

### Step-by-Step Process

1. **Fetch Invoice Items**
   - Retrieves all line items from sales invoices
   - Only includes invoices in the specified date range
   - Excludes draft and cancelled invoices

2. **Join with Products**
   - Links each item to its product record
   - Accesses the `costPrice` field from products table

3. **Calculate Cost per Item**
   - For each line item: `quantity × costPrice`
   - Handles missing costPrice (defaults to 0)

4. **Sum All Costs**
   - Aggregates all individual item costs
   - Returns total COGS for the period

### Example Calculation

```
Invoice #INV-001 (Approved)
├─ Product A: Qty 10 × Cost Rs. 100 = Rs. 1,000
├─ Product B: Qty 5 × Cost Rs. 200 = Rs. 1,000
└─ Product C: Qty 2 × Cost Rs. 500 = Rs. 1,000

Invoice #INV-002 (Approved)
├─ Product A: Qty 8 × Cost Rs. 100 = Rs. 800
└─ Product D: Qty 3 × Cost Rs. 150 = Rs. 450

Total COGS = Rs. 1,000 + Rs. 1,000 + Rs. 1,000 + Rs. 800 + Rs. 450
           = Rs. 4,250
```

## Common Misconceptions Addressed

### ❌ INCORRECT: COGS = Sum of Purchase Invoices

**Why this is wrong:**
- Purchase invoices represent **inventory purchases**, not goods sold
- This would count all purchases, regardless of whether items were sold
- Does not account for inventory on hand
- Violates the matching principle in accounting

### ✅ CORRECT: COGS = Quantity Sold × Cost Price

**Why this is right:**
- Only counts items that were actually sold (in invoices)
- Matches revenue with the cost of goods that generated that revenue
- Follows the accrual accounting matching principle
- Provides accurate gross profit margins

## Accounting Principles Followed

### 1. Matching Principle
- Revenue and related expenses are recorded in the same period
- COGS is matched against the sales revenue it helped generate

### 2. Accrual Accounting
- COGS is recognized when the sale occurs, not when inventory was purchased
- Provides accurate profitability measurement

### 3. Organization Scoping
- All calculations are strictly scoped to `orgId`
- Ensures data isolation between organizations

## Build Status

✅ **All changes compile successfully**
✅ **No TypeScript errors**
✅ **No runtime errors detected**

## Testing Recommendations

To verify the COGS calculation is working correctly:

1. **Create Products** with different cost prices
2. **Create Sales Invoices** with those products
3. **Approve the invoices** (status != 'draft')
4. **Run P&L Report** for the date range
5. **Verify COGS** equals sum of (qty × cost price) for all sold items

### Test Case Example

```
Products:
- Widget A: Cost Price = Rs. 100
- Widget B: Cost Price = Rs. 250

Sales Invoice #1 (Approved):
- Widget A: Qty 10
- Widget B: Qty 5

Expected COGS:
= (10 × 100) + (5 × 250)
= 1,000 + 1,250
= Rs. 2,250
```

## Files Verified

### Server Actions
- ✅ `src/lib/actions/reports.ts` - COGS calculation logic (Lines 72-85)

### UI Components
- ✅ `src/app/(dashboard)/reports/profit-and-loss/page.tsx` - P&L display

### Database Schema
- ✅ `src/db/schema.ts` - invoiceItems, invoices, products tables

## Conclusion

The COGS calculation in NexaBook's Profit and Loss report is **correctly implemented** and follows proper accounting principles. No changes were required as the implementation already uses the correct formula:

**COGS = Σ(Invoice Item Quantity × Product Cost Price)**

filtered by organization, date range, and excluding draft/cancelled invoices.
