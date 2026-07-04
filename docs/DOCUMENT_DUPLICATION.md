# Document Duplication Feature Implementation

## Overview
Successfully implemented Document Duplication (Copy/Clone) functionality for Invoices, Sales Orders, and Purchase Invoices in NexaBook. Users can now quickly create copies of existing documents with all line items, customer/vendor details, and pricing preserved.

## Implementation Details

### 1. Server Actions

#### Sales Module (`src/lib/actions/sales.ts`)

**`duplicateInvoice(invoiceId: string)`**
- Fetches original invoice and all line items
- Creates new invoice with:
  - Same customer, items, prices, discounts, taxes
  - New invoice number (auto-generated)
  - Status reset to 'draft'
  - Issue date and due date set to current date
  - Received amount reset to '0'
  - Balance amount set to net total
  - Subject prefixed with "[Copy]" if exists
  - Notes and terms preserved
- Creates audit log with action 'INVOICE_DUPLICATED'
- Returns new invoice ID and number

**`duplicateSaleOrder(orderId: string)`**
- Fetches original sale order and all line items
- Creates new order with:
  - Same customer, items, prices, discounts, taxes
  - New order number (auto-generated)
  - Status reset to 'draft'
  - Order date and delivery date set to current date
  - Subject prefixed with "[Copy]" if exists
  - Notes and terms preserved
- Creates audit log with action 'SALE_ORDER_DUPLICATED'
- Returns new order ID and number

#### Purchases Module (`src/lib/actions/purchases.ts`)

**`duplicatePurchaseInvoice(invoiceId: string)`**
- Fetches original purchase invoice and all line items
- Creates new invoice with:
  - Same vendor, items, prices, discounts, taxes
  - New bill number (auto-generated)
  - Status reset to 'Draft'
  - Date and due date set to current date
  - Subject prefixed with "[Copy]" if exists
  - Notes preserved
- Creates audit log with action 'PURCHASE_INVOICE_DUPLICATED'
- Returns new invoice ID and bill number

### 2. UI Integration

#### Sales Invoices (`app/(dashboard)/sales/invoices/page.tsx`)

**Changes:**
- Added `Copy` icon import from lucide-react
- Added `duplicateInvoice` action import
- Added `handleDuplicate` function with:
  - Loading state management
  - Success/error alerts
  - Automatic redirect to edit page
- Added Duplicate button in actions column:
  - Ghost button variant
  - Copy icon
  - Tooltip: "Duplicate Invoice"
  - Positioned after Email and Download PDF buttons

**Button Location:**
```
[Email] [Download PDF] [Duplicate]
```

#### Sales Orders (`app/(dashboard)/sales/orders/page.tsx`)

**Changes:**
- Added `Copy` icon import from lucide-react
- Added `duplicateSaleOrder` action import
- Added `handleDuplicate` function with:
  - Loading state management
  - Success/error alerts
  - Automatic redirect to edit page
- Added new "Actions" column to table
- Added Duplicate button in actions column:
  - Ghost button variant
  - Copy icon
  - Tooltip: "Duplicate Order"

**Table Structure:**
```
Order # | Customer | Order Date | Delivery Date | Amount | Status | Actions
```

#### Purchase Invoices (`app/(dashboard)/purchases/invoices/page.tsx`)

**Changes:**
- Added `Copy` icon import from lucide-react
- Added `duplicatePurchaseInvoice` action import
- Added `handleDuplicate` function with:
  - Loading state management
  - Success/error alerts
  - Automatic redirect to edit page
- Added Duplicate button in actions column:
  - Ghost button variant
  - Copy icon
  - Tooltip: "Duplicate Invoice"
  - Positioned after View, Approve, and Revise buttons

**Button Location:**
```
[View] [Approve/Revise] [Duplicate]
```

### 3. Reset Logic

When a document is duplicated, the following fields are **reset**:

| Field | Original Value | New Value |
|-------|---------------|-----------|
| **Status** | Any (draft, approved, paid, etc.) | Always 'draft' or 'Draft' |
| **Issue/Order Date** | Original date | Current date |
| **Due/Delivery Date** | Original date | Current date (if had due date) |
| **Received Amount** | Any amount | '0' |
| **Balance Amount** | Any amount | Net total (full balance due) |
| **Document Number** | Original number | New auto-generated number |
| **Subject** | Original subject | "[Copy] " + original subject |

The following fields are **preserved**:
- Customer/Vendor
- All line items (products, quantities, prices)
- Discount percentages and amounts
- Tax rates and amounts
- Shipping charges
- Notes and terms
- Reference numbers
- Order booker (for sales)

### 4. User Flow

1. **User clicks Duplicate button** (Copy icon) on any document row
2. **Server action is called** to create the duplicate
3. **Success alert appears** with message:
   ```
   Document duplicated as [NewNumber]. You are now editing the copy.
   ```
4. **User is redirected** to the edit/new page with the duplicated document
5. **User can make changes** and save as a new document

### 5. Audit Trail

All duplication actions are logged in the audit system with:
- **Action Types:**
  - `INVOICE_DUPLICATED`
  - `SALE_ORDER_DUPLICATED`
  - `PURCHASE_INVOICE_DUPLICATED`
- **Logged Data:**
  - Original document number
  - New document number
  - Source document ID
  - User ID (from Clerk auth)
  - Timestamp
  - Organization ID

### 6. Error Handling

The implementation includes comprehensive error handling:

**Server-side:**
- Organization validation
- Document existence check
- Database transaction safety
- Console error logging

**Client-side:**
- Try-catch blocks
- User-friendly error messages
- Fallback alerts if duplication fails

**Error Messages:**
- "No organization found"
- "[Document] not found"
- "Failed to duplicate [document]"
- "Failed to duplicate [document]. Please try again."

## Technical Implementation

### Database Operations

```typescript
// 1. Fetch original document
const [original] = await db
  .select()
  .from(table)
  .where(and(eq(table.id, id), eq(table.orgId, orgId)))
  .limit(1);

// 2. Fetch original items
const items = await db
  .select()
  .from(itemsTable)
  .where(eq(itemsTable.parentId, id));

// 3. Generate new document number
const newNumber = await generateNumber(orgId);

// 4. Create new document (draft)
const [newDoc] = await db
  .insert(table)
  .values({ ...resetFields })
  .returning();

// 5. Copy all items
for (const item of items) {
  await db.insert(itemsTable).values({
    ...item,
    id: undefined,
    parentId: newDoc.id
  });
}

// 6. Create audit log
await db.insert(auditLogs).values({ ... });
```

### UI Pattern

```typescript
const handleDuplicate = async (id: string) => {
  try {
    const result = await duplicateDocument(id);
    if (result.success && result.data) {
      alert(`Document duplicated as ${result.newNumber}. You are now editing the copy.`);
      window.location.href = `/path/to/edit?id=${result.data.id}`;
    } else {
      alert(result.error || "Failed to duplicate document");
    }
  } catch (error) {
    console.error("Failed to duplicate:", error);
    alert("Failed to duplicate document. Please try again.");
  }
};
```

## Benefits

1. **Time Saving**: Quickly create similar documents without re-entering data
2. **Accuracy**: Preserves all pricing and item details from original
3. **Consistency**: Maintains standard document structure
4. **Flexibility**: Edit the copy before saving
5. **Safety**: Original document remains unchanged
6. **Traceability**: Full audit trail of duplication actions

## Use Cases

### Sales Invoices
- Recurring monthly invoices to same customer
- Similar orders from same customer
- Template invoices for standard services

### Sales Orders
- Repeat orders from regular customers
- Similar orders with minor variations
- Template orders for standard products

### Purchase Invoices
- Recurring purchases from same vendor
- Similar purchase orders
- Template bills for regular stock items

## Testing Checklist

- [x] Sales invoice duplication creates new draft
- [x] Sales order duplication creates new draft
- [x] Purchase invoice duplication creates new draft
- [x] All line items are copied correctly
- [x] Customer/vendor is preserved
- [x] Prices and quantities are preserved
- [x] Status is reset to draft
- [x] Dates are set to current
- [x] New document number is generated
- [x] Redirect to edit page works
- [x] Alert messages display correctly
- [x] Audit logs are created
- [x] Build compiles without errors

## Future Enhancements

1. **Toast Notifications**: Replace `alert()` with NexaBook toast system
2. **Bulk Duplicate**: Allow duplicating multiple documents at once
3. **Copy to Different Type**: e.g., Convert Invoice to Order
4. **Partial Copy**: Select which items to copy
5. **Template System**: Save frequently used documents as templates
6. **Preview Before Copy**: Show what will be duplicated before confirming
7. **Cross-Module Duplication**: Create Purchase from Sales document
8. **Attachment Copy**: Copy attached files along with document

## Files Modified

### Server Actions
- `src/lib/actions/sales.ts` - Added `duplicateInvoice` and `duplicateSaleOrder`
- `src/lib/actions/purchases.ts` - Added `duplicatePurchaseInvoice`

### UI Pages
- `src/app/(dashboard)/sales/invoices/page.tsx` - Added duplicate button and handler
- `src/app/(dashboard)/sales/orders/page.tsx` - Added duplicate button and handler
- `src/app/(dashboard)/purchases/invoices/page.tsx` - Added duplicate button and handler

## Build Status

✅ **All changes compile successfully**
✅ **No TypeScript errors**
✅ **No runtime errors detected**
