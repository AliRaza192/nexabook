# Purchases & Expenses Module - Implementation Guide

## Overview
The Purchases & Expenses module has been successfully built for NexaBook, mirroring the "Splendid Style" Sales workflow with 100% theme consistency.

---

## 📋 What's Been Implemented

### 1. ✅ Database Schema (src/db/schema.ts)

#### New Tables Created:

**`vendors`** - Vendor/Supplier Management
- `id`, `org_id`, `name`, `phone`, `email`, `ntn`, `strn`, `address`
- `opening_balance`, `balance` (tracks outstanding payables)
- `is_active`, `created_at`, `updated_at`

**`purchase_invoices`** - Purchase Invoice Header
- `id`, `org_id`, `vendor_id`, `bill_number`, `date`, `due_date`
- `reference`, `subject`
- `gross_amount`, `discount_total`, `tax_total`, `net_amount`
- `status` (Draft, Approved, Revised)
- `notes`, `created_at`, `updated_at`

**`purchase_items`** - Purchase Invoice Line Items
- `id`, `org_id`, `purchase_invoice_id`, `product_id`
- `description`, `quantity`, `unit_price`
- `discount_percentage`, `tax_rate`, `line_total`

**`expenses`** - Expense Recording
- `id`, `org_id`, `account_id` (expense account from COA)
- `amount`, `date`, `reference`, `description`
- `paid_from_account_id` (cash/bank account)
- `created_at`, `updated_at`

---

### 2. ✅ Vendor Management UI

**Location:** `app/(dashboard)/purchases/vendors/page.tsx`

**Features:**
- ✨ Professional vendor list with current balance display
- 📊 Stats cards showing total vendors, active vendors, and total payable
- 🔍 Search functionality (by name, phone, email)
- ➕ "Add Vendor" dialog with complete tax and contact details:
  - Name, Phone, Email
  - NTN (National Tax Number)
  - STRN (Sales Tax Registration Number)
  - Address, Opening Balance
- 🎨 Nexa-Blue theme consistency (#0F172A and Slate-White)
- 📱 Responsive design with motion animations

---

### 3. ✅ Purchase Invoice Builder

**Location:** `app/(dashboard)/purchases/invoices/new/page.tsx`

**UI Features (Symmetry with Sales Invoice):**
- 📐 Compact 5-column grid layout:
  - Vendor, Bill Number, Date, Due Date, Reference
- 🛒 Product grid with auto-fill Cost Price
- 🔒 Row locking mechanism (same as sales)
- ⌨️ Keyboard navigation (Enter to add new line)
- 📊 Real-time financial summary panel

**Approval Logic (When 'Approve' is clicked):**
1. **Inventory Update:** Adds quantity to `products.current_stock`
2. **Cost Price Update:** Updates `products.cost_price` with purchase price
3. **Vendor Balance:** Updates vendor payable balance
4. **Accounting Entry:**
   - **Debit:** Inventory (Asset) - Net Amount
   - **Credit:** Vendor Payable (Liability) - Net Amount
   - **Debit:** Input Tax (if applicable)
5. **Journal Entry:** Creates automatic journal entry with reference
6. **Audit Log:** Records approval action

**Revision Logic (Revise Button):**
1. **Status Change:** Approved → Revised
2. **Inventory Reversal:** Subtracts the added stock
3. **Journal Reversal:**
   - **Credit:** Inventory (reverse the debit)
   - **Debit:** Vendor Payable (reverse the credit)
4. **Vendor Balance Reset:** Resets vendor balance to 0
5. **Audit Trail:** Records revision with reversal entry number

---

### 4. ✅ Expense Recording UI

**Location:** `app/(dashboard)/accounts/expenses/page.tsx`

**Form Features:**
- 📋 Professional, clean form layout
- 💼 Account Selection:
  - Expense Account (from COA - filtered by type='expense')
  - Paid From Account (Cash/Bank accounts only)
- 💰 Amount, Date, Reference, Description fields
- 📊 Real-time accounting entry preview:
  - Shows Debit: Expense Account
  - Shows Credit: Cash/Bank Account
- 📈 Recent expenses list with quick overview
- ℹ️ "How It Works" guide panel

**Accounting Logic:**
- **Debit:** Selected Expense Account
- **Credit:** Selected Cash/Bank Account
- **Auto Journal Entry:** Creates journal entry automatically
- **Audit Trail:** Records all expense transactions

---

### 5. ✅ Purchase Invoices List

**Location:** `app/(dashboard)/purchases/invoices/page.tsx`

**Features:**
- 📊 Stats dashboard:
  - Total Invoices
  - Total Purchases (amount)
  - Approved count
  - Draft count
- 🔍 Search and filter (by status: Draft, Approved, Revised)
- ⚡ Quick actions:
  - **Approve** button for Draft invoices
  - **Revise** button for Approved invoices
- 📋 Complete invoice details table
- 🎨 Consistent theme with status badges

---

### 6. ✅ Server Actions (src/lib/actions/purchases.ts)

**Vendor Actions:**
- `getVendors(searchQuery?)` - Fetch all vendors with optional search
- `createVendor(data)` - Create new vendor
- `updateVendor(id, data)` - Update vendor details
- `deleteVendor(id)` - Soft delete vendor

**Purchase Invoice Actions:**
- `getPurchaseInvoices(search?, status?)` - List all purchase invoices
- `getNextBillNumber()` - Generate next bill number (PI-XXXXX format)
- `createPurchaseInvoice(data)` - Create draft purchase invoice
- `approvePurchaseInvoice(id)` - Approve invoice (updates inventory + accounting)
- `revisePurchaseInvoice(id)` - Reverse/revoke approval
- `getPurchaseInvoiceById(id)` - Get single invoice with items

**Expense Actions:**
- `recordExpense(data)` - Record expense with automatic journal entry
- `getExpenses(limit?)` - Fetch recent expenses
- `getExpenseAccounts()` - Get expense accounts from COA
- `getCashBankAccounts()` - Get cash/bank accounts from COA

---

### 7. ✅ Navigation Updates

**Updated Sidebar:**

**Purchases Menu:**
- Vendors (NEW)
- Purchase Invoices (NEW)
- Purchase Orders
- GRN
- Bills
- Vendor Payments

**Accounts Menu:**
- Chart of Accounts
- Journal Entries
- Ledger
- Banking
- Tax
- Reconciliation
- **Expenses (NEW)**

---

### 8. ✅ UI/UX Consistency

**Theme Elements:**
- 🎨 **Nexa-Blue:** `#0F172A` (Primary dark)
- ⚪ **Slate-White:** Clean backgrounds
- 📐 **Consistent Spacing:** Same grid layouts as Sales
- 🎭 **Animations:** Framer Motion for smooth transitions
- 🔘 **Button Styles:**
  - "Save & Approve" - Blue filled (`bg-blue-600`)
  - "Close" - Slate outline (`border-slate-300`)
  - Dropdown menus for save options
- 📊 **Stat Cards:** Color-coded (blue, green, orange)
- 🏷️ **Badges:** Status indicators with icons

---

## 🚀 How to Use

### Step 1: Run Database Migration

The database schema needs to be pushed to PostgreSQL. Run this command:

```bash
npm run db:push
```

When prompted:
- Select "create column" for any new columns
- Confirm the schema changes

### Step 2: Seed Chart of Accounts (If Not Done)

Ensure your Chart of Accounts has these accounts for proper integration:

**Required Accounts:**
- `Inventory` (Asset type) - For inventory valuation
- `Accounts Payable` (Liability type) - For vendor payables
- `Input Tax` (Asset type) - For purchase tax credits
- Expense accounts (various) - For expense recording
- Cash/Bank accounts (Asset type) - For payment sources

### Step 3: Access the Module

Navigate to the following routes:

1. **Vendors:** `/purchases/vendors`
2. **Purchase Invoices List:** `/purchases/invoices`
3. **New Purchase Invoice:** `/purchases/invoices/new`
4. **Expenses:** `/accounts/expenses`

---

## 📊 Workflow Examples

### Purchase Invoice Workflow:

1. **Add Vendor:**
   - Go to Purchases → Vendors
   - Click "Add Vendor"
   - Fill in details (Name, NTN, STRN, etc.)
   - Submit

2. **Create Purchase Invoice:**
   - Go to Purchases → Purchase Invoices
   - Click "Create Purchase Invoice"
   - Select vendor
   - Add products (cost price auto-fills)
   - Review financial summary
   - Click "Save & Approve"

3. **What Happens on Approval:**
   - ✅ Invoice status → "Approved"
   - ✅ Product stock increased
   - ✅ Vendor balance updated
   - ✅ Journal entry created:
     - Debit: Inventory Asset
     - Credit: Vendor Payable
   - ✅ Audit log recorded

4. **Revise Invoice (If Needed):**
   - Click "Revise" on approved invoice
   - ✅ Status → "Revised"
   - ✅ Stock reversed (subtracted)
   - ✅ Journal entry reversed
   - ✅ Vendor balance reset

### Expense Recording Workflow:

1. **Record Expense:**
   - Go to Accounts → Expenses
   - Select Expense Account (e.g., "Office Supplies")
   - Enter amount and date
   - Select payment source (Cash/Bank)
   - Add reference/description
   - Click "Record Expense"

2. **What Happens:**
   - ✅ Expense record created
   - ✅ Journal entry created:
     - Debit: Expense Account
     - Credit: Cash/Bank Account
   - ✅ Audit log recorded

---

## 🔧 Technical Details

### Accounting Integration:

**Purchase Invoice Approval Entry:**
```
Dr. Inventory Asset           XXXX
Dr. Input Tax (if any)        XXXX
    Cr. Vendor Payable            XXXX
```

**Purchase Invoice Revision Entry:**
```
Dr. Vendor Payable          XXXX
    Cr. Inventory Asset           XXXX
```

**Expense Recording Entry:**
```
Dr. Expense Account         XXXX
    Cr. Cash/Bank Account         XXXX
```

### Stock Management:

**On Purchase Approval:**
- `products.current_stock += purchase_item.quantity`
- `products.cost_price = purchase_item.unit_price`

**On Purchase Revision:**
- `products.current_stock -= purchase_item.quantity`

---

## 🎯 Key Features Summary

✅ **100% Theme Consistency** - Nexa-Blue (#0F172A) and Slate-White
✅ **Symmetrical with Sales** - Same UI patterns and workflows
✅ **Complete Accounting Integration** - Automatic journal entries
✅ **Inventory Management** - Stock updates on approval/revision
✅ **Vendor Tracking** - Balance tracking and tax details
✅ **Audit Trails** - All actions logged with user info
✅ **Search & Filter** - Quick data discovery
✅ **Responsive Design** - Works on all screen sizes
✅ **Motion Animations** - Smooth, professional UX
✅ **TypeScript Safe** - Full type safety throughout

---

## 📝 Files Created/Modified

### New Files:
1. `src/lib/actions/purchases.ts` - Server actions
2. `src/app/(dashboard)/purchases/vendors/page.tsx` - Vendor management
3. `src/app/(dashboard)/purchases/invoices/page.tsx` - Invoice list
4. `src/app/(dashboard)/purchases/invoices/new/page.tsx` - Invoice builder
5. `src/app/(dashboard)/accounts/expenses/page.tsx` - Expense recording

### Modified Files:
1. `src/db/schema.ts` - Added vendors, purchase_invoices, purchase_items, expenses tables
2. `src/app/(dashboard)/layout.tsx` - Updated navigation menu
3. `src/app/(dashboard)/purchases/page.tsx` - Enhanced landing page

---

## ⚠️ Important Notes

1. **Database Migration:** Must run `npm run db:push` before using the module
2. **Chart of Accounts:** Ensure required accounts exist (Inventory, Accounts Payable, Input Tax)
3. **Product Setup:** Products must exist before creating purchase invoices
4. **Multi-Tenant:** All data is scoped to organization (org_id)
5. **Build Status:** ✅ TypeScript compilation successful (verified)

---

## 🎨 UI Preview Guide

**Color Scheme:**
- Primary: Nexa-Blue `#0F172A`
- Background: Slate `#F8FAFC`
- Borders: Light Gray `#E2E8F0`
- Success: Green `#10B981`
- Warning: Orange `#F59E0B`
- Error: Red `#EF4444`

**Button Patterns:**
- Primary Action: `bg-nexabook-900 hover:bg-nexabook-800`
- Approve: `bg-blue-600 hover:bg-blue-700`
- Close/Cancel: `border-slate-300 text-slate-700`

---

## 🚦 Next Steps (Future Enhancements)

- [ ] Purchase Order workflow
- [ ] Goods Received Notes (GRN)
- [ ] Vendor Payment processing
- [ ] Purchase Returns handling
- [ ] Purchase analytics dashboard
- [ ] Vendor performance reports
- [ ] Batch bill number generation
- [ ] Import vendors/products from CSV
- [ ] Multi-currency support
- [ ] Attachment support for invoices

---

**Module Status:** ✅ **Production Ready** (Pending database migration)
**Build Status:** ✅ **TypeScript Clean**
**Theme Consistency:** ✅ **100% Match with Sales Module**

---

For questions or issues, refer to the main NexaBook documentation or check the server actions file for detailed implementation logic.
