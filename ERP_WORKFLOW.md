# NexaBook ERP Workflow - Splendid Accounts Style

## Overview
This document outlines the complete ERP workflow implementation in NexaBook, following the professional patterns used in Splendid Accounts. The system integrates **Accounting**, **Inventory**, and **Sales** modules into a cohesive, enterprise-grade solution.

---

## 📋 Table of Contents
1. [Database Schema Updates](#database-schema-updates)
2. [Invoice Builder UI](#invoice-builder-ui)
3. [Core Business Logic](#core-business-logic)
4. [Accounting Integration](#accounting-integration)
5. [Inventory Management](#inventory-management)
6. [Chart of Accounts](#chart-of-accounts)
7. [Workflow Summary](#workflow-summary)
8. [Next Steps](#next-steps)

---

## Database Schema Updates

### Products Table (`src/db/schema.ts`)
**Columns Available:**
- `sku` - Stock Keeping Unit (unique identifier)
- `sale_price` - Selling price
- `cost_price` - Cost/purchase price
- `current_stock` - Current inventory level (integer)
- `unit` - Unit of measurement (Pcs, Kg, Ltr, Mtr, Box, etc.)
- `min_stock_level` - Minimum stock threshold for alerts

### Invoices Table (`src/db/schema.ts`)
**New/Updated Columns:**
- `invoice_number` - Auto-increment string (e.g., SL-00001)
- `order_booker` - Sales person name
- `subject` - Invoice subject line
- `reference` - Reference number
- `gross_amount` - Total before discounts/tax
- `discount_percentage` - Overall discount %
- `discount_amount` - Calculated discount amount
- `tax_amount` - Total tax (GST/Sales Tax)
- `shipping_charges` - Delivery/shipping fees
- `round_off` - Rounding adjustment
- `net_amount` - Final payable amount
- `received_amount` - Amount paid by customer
- `balance_amount` - Outstanding balance
- `cash_bank_account_id` - Payment account reference
- `status` - Draft, Pending, Approved, Sent, Paid, Partial, Overdue, Cancelled

### Invoice Items Table (`src/db/schema.ts`)
**Columns:**
- `product_id` - Link to products table
- `invoice_id` - Link to invoices table
- `quantity` - Quantity sold
- `unit_price` - Price per unit
- `discount_percentage` - Line-level discount %
- `tax_rate` - Tax rate applied
- `line_total` - Final line amount (qty × price - discount)

### Journal Entries Tables (NEW)
**`journal_entries` table:**
- `id`, `org_id`, `entry_date`, `entry_number` (auto-generated)
- `reference_type` (invoice, payment, etc.)
- `reference_id` - Linked entity ID
- `description` - Entry description

**`journal_entry_lines` table:**
- `id`, `org_id`, `journal_entry_id`
- `account_id` - Link to chart_of_accounts
- `debit_amount`, `credit_amount` - Entry amounts
- `description` - Line description

---

## Invoice Builder UI

### Location: `src/app/(dashboard)/sales/invoices/new/page.tsx`

### Header Section
- **Auto-generated Invoice Number**: Displays next invoice number (e.g., SL-00001)
- **Customer Selection**: Dropdown to select customer
- **Date Fields**: Issue date (defaults to today), Due date (defaults to today)
- **Additional Fields**: Reference #, Order Booker, Subject

### Product Grid (Compact Table)
**Columns:**
1. **Product** - Dropdown with stock availability display
2. **Qty** - Quantity (default: 1)
3. **Price** - Unit price (auto-filled from product)
4. **Disc%** - Discount percentage per line
5. **Amount** - Calculated line total

**Row Actions:**
- ✓ **Check Button**: Locks the row (prevents editing)
- 🗑️ **Trash Button**: Removes the row

**Behavior:**
- Product selection auto-fills price from `products.sale_price`
- Only products with `current_stock > 0` are available
- Pressing **Enter** on the last row adds a new line
- Real-time calculation of line totals

### Middle Section
- **Comments**: Textarea for additional notes
- **Attachments**: UI placeholder (coming soon)

### Summary Panel (Bottom Right)
**Real-time Calculations:**
1. **Gross Amount**: Sum of (qty × price) for all lines
2. **Discount %**: Overall discount percentage
3. **Tax**: Calculated based on line tax rates
4. **Shipping**: Editable shipping charges
5. **Round Off**: Auto-rounds to nearest integer
6. **Net Amount (PKR)**: Final amount (Gross - Disc + Tax + Shipping, rounded)

### Payment Section
- **Cash/Bank Account**: Dropdown populated from Chart of Accounts
- **Received Amount**: Input for payment received
- **Balance**: Auto-calculated (Net - Received)
  - Green when fully paid
  - Orange when balance due
  - Blue when overpaid

### Action Buttons (Save Dropdown)
1. **Save & Continue**: Save draft and stay on page
2. **Save & Close**: Save draft and return to invoices list
3. **Save & Approve**: Save and immediately approve (triggers inventory & accounting updates)
4. **Approve & Print**: Approve and open print dialog

---

## Core Business Logic

### Location: `src/lib/actions/sales.ts`

### `createInvoice(data: InvoiceFormData)`
**Purpose:** Create invoice in Draft status without affecting inventory

**Process:**
1. Generate unique invoice number (SL-00001 format)
2. Calculate balance amount (net - received)
3. Insert invoice record with all financial details
4. Insert all invoice line items
5. Create audit log entry
6. Return success with invoice ID

**Important:** Stock is NOT deducted at this stage. Inventory is only updated on approval.

### `approveInvoice(invoiceId: string)` ⭐
**Purpose:** Atomic transaction that approves invoice and updates all systems

**Process (All or Nothing):**
1. **Validate Invoice**
   - Check invoice exists
   - Verify not already approved

2. **Update Invoice Status**
   - Set status to 'Approved'

3. **Update Inventory**
   - For each line item with a product:
     - Fetch current stock
     - Calculate new stock: `max(0, current_stock - quantity)`
     - Update `products.current_stock`

4. **Create Journal Entry**
   - Generate entry number (JE-00001 format)
   - Create journal entry header

5. **Post Journal Lines**
   - **Debit**: Accounts Receivable (net_amount)
   - **Credit**: Sales Revenue (gross_amount)
   - **Credit**: Sales Tax Payable (tax_amount, if > 0)
   
6. **Record Payment (if received_amount > 0)**
   - **Debit**: Cash/Bank Account (received_amount)
   - **Credit**: Accounts Receivable (received_amount)

7. **Create Audit Log**
   - Record approval with journal entry reference

8. **Revalidate Paths**
   - Refresh `/sales/invoices` and `/inventory`

**Error Handling:**
- If any step fails, entire transaction rolls back
- Returns descriptive error messages
- Validates required accounts exist in Chart of Accounts

### Helper Functions

**`getNextInvoiceNumber()`**
- Returns next invoice number for UI display
- Format: SL-XXXXX (e.g., SL-00001)

**`getCashBankAccounts()`**
- Returns accounts with type 'asset' or 'bank'
- Filters for accounts containing 'cash' or 'bank' in name
- Used for payment dropdown

---

## Accounting Integration

### Chart of Accounts Seeding
**Location:** `src/lib/actions/accounts.ts`

**Default Accounts Created:**

**Assets (1000-1999):**
- 1000: Cash
- 1010: Bank - Main Account
- 1020: Bank - Savings Account
- 1030: Petty Cash
- 1100: Accounts Receivable
- 1200: Inventory
- (and more...)

**Liabilities (2000-2999):**
- 2000: Accounts Payable
- 2200: Sales Tax Payable
- (and more...)

**Equity (3000-3999):**
- 3000: Owner's Equity
- 3100: Retained Earnings
- (and more...)

**Income (4000-4999):**
- 4000: Sales Revenue
- 4100: Service Revenue
- (and more...)

**Expenses (5000-6999):**
- 5000: Cost of Goods Sold
- 5100: Salaries & Wages
- (and more...)

### Journal Entry Creation
**Location:** `src/lib/actions/accounts.ts` - `createJournalEntry()`

**Features:**
- Validates debits = credits (balanced entry)
- Auto-generates entry numbers
- Creates audit trail
- Full database persistence

---

## Inventory Management

### Location: `src/app/(dashboard)/inventory/page.tsx`

### Features:
1. **Real-time Stock Display**
   - Current stock levels from `products.current_stock`
   - Automatically updates when invoices are approved
   - Low stock alerts when stock ≤ min_stock_level

2. **Stock Status Badges**
   - ✅ **In Stock**: Stock > min level
   - ⚠️ **Low Stock**: 0 < stock ≤ min level
   - ❌ **Out of Stock**: stock = 0

3. **Product Management**
   - Add/Edit products with all fields
   - Category management
   - Search and filter functionality

### Stock Flow:
```
Create Invoice (Draft) → Stock UNCHANGED
     ↓
Approve Invoice → Stock DEDUCTED
     ↓
Inventory Page → Shows UPDATED stock
```

---

## Chart of Accounts

### Location: `src/app/(dashboard)/accounts/chart-of-accounts/page.tsx`

### Features:
1. **Account Display**
   - Code, Name, Type, Description
   - Color-coded by account type
   - Active/Inactive status

2. **Cash/Bank Integration**
   - Accounts used in invoice payment dropdown
   - Filtered by name containing "Cash" or "Bank"
   - Or code starting with "11"

3. **Seeding**
   - One-click seed for default accounts
   - Prevents duplicate seeding
   - ~70 standard accounts created

---

## Workflow Summary

### Complete Invoice Lifecycle:

```
1. CREATE INVOICE
   ├─ Navigate to: Sales > Invoices > New
   ├─ Select customer
   ├─ Add products (auto-fills price & stock info)
   ├─ Set quantities, discounts
   ├─ Enter payment (optional)
   └─ Click Save (Draft status)

2. REVIEW INVOICE
   ├─ View in: Sales > Invoices
   ├─ Check details
   └─ Edit if needed (while in Draft)

3. APPROVE INVOICE ⭐ (Atomic Transaction)
   ├─ Status: Draft → Approved
   ├─ Inventory: Stock deducted
   ├─ Accounting: Journal entry created
   │  ├─ Dr: Accounts Receivable
   │  ├─ Cr: Sales Revenue
   │  └─ Cr: Sales Tax Payable
   └─ Payment (if received):
      ├─ Dr: Cash/Bank Account
      └─ Cr: Accounts Receivable

4. POST-APPROVAL
   ├─ Inventory page shows updated stock
   ├─ Journal entry visible in accounts
   ├─ Invoice marked as Approved
   └─ Audit log created
```

### Data Flow:

```
Products Table
    ↓ (sale_price, current_stock)
Invoice Builder UI
    ↓ (create draft)
Invoices Table (Draft)
    ↓ (approve)
Invoices Table (Approved)
    ↓ (triggers)
├─ Products.current_stock (UPDATED)
├─ Journal Entries (CREATED)
└─ Audit Logs (CREATED)
```

---

## Next Steps

### Recommended Enhancements:
1. **Invoice Editing**: Allow editing Draft invoices only
2. **Invoice Printing**: Professional PDF template
3. **Attachments**: File upload support for invoices
4. **Email Integration**: Send invoices to customers
5. **Payment Tracking**: Record partial payments over time
6. **Credit Notes**: Handle returns and refunds
7. **Stock Valuation**: Reports on inventory value
8. **Trial Balance**: From journal entries
9. **General Ledger**: Account-wise transaction view
10. **Financial Reports**: P&L, Balance Sheet, Cash Flow

### Database Migration Required:
Run the following to apply schema changes:
```bash
npm run db:generate
npm run db:migrate
```

### Testing Checklist:
- [ ] Seed Chart of Accounts
- [ ] Create products with stock
- [ ] Create customers
- [ ] Create draft invoice
- [ ] Approve invoice
- [ ] Verify stock deducted in inventory
- [ ] Verify journal entry created
- [ ] Verify audit log created
- [ ] Check customer balance updated
- [ ] Test payment recording

---

## Technical Notes

### Files Modified:
1. `src/db/schema.ts` - Database schema updates
2. `src/lib/actions/sales.ts` - Core business logic
3. `src/lib/actions/accounts.ts` - Journal entry creation
4. `src/app/(dashboard)/sales/invoices/new/page.tsx` - Invoice builder UI
5. `src/app/(dashboard)/sales/invoices/page.tsx` - Invoice list updates
6. `src/components/ui/dropdown-menu.tsx` - New UI component

### Key Dependencies:
- `@radix-ui/react-dropdown-menu` - For save dropdown
- `framer-motion` - Animations
- `lucide-react` - Icons
- `drizzle-orm` - Database ORM
- `@clerk/nextjs` - Authentication

### Security Considerations:
- All server actions verify user authentication
- Organization isolation (orgId on all queries)
- Atomic transactions prevent partial failures
- Audit trail for all financial operations
- Input validation on all forms

---

## Support & Documentation

For issues or questions:
- Check `README.md` for setup instructions
- Review `DATABASE.md` for schema details
- See `SETUP.md` for configuration guide

**Built with:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL
