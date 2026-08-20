---
name: invoice-creation
description: >
  Creates sales invoices with proper tax calculation, FBR compliance, and Pakistani business rules.
  Use when: "create invoice", "new invoice", "bill banao", "invoice banao", "sale invoice",
  "invoice banado", "customer ko bill", "sales bill", "invoice generate karo".
  Do NOT use for: purchase invoices, credit notes, or quotations.
---

# Invoice Creation Skill

## Goal

Create accurate sales invoices with proper Pakistani tax compliance, FBR submission readiness, and correct double-entry bookkeeping. Every invoice must balance (debits = credits) and be traceable in the general ledger.

## When to Use

- User wants to create a new sales invoice
- User says "invoice banao" or "bill create karo"
- User provides customer and item details for billing
- User wants to convert a quotation to an invoice

## Instructions

### Step 1: Collect Required Information

Gather from user or context:
- **Customer** — name or NTN (must exist in customers table)
- **Items** — product/service, quantity, unit price
- **Invoice Date** — default to today
- **Due Date** — based on customer credit terms (default 30 days)
- **Warehouse** — for stock-tracked items
- **Cost Center** — optional, for department-wise tracking

### Step 2: Validate Customer

Before creating invoice:
1. Check customer exists in `customers` table
2. Verify customer NTN format (8 digits if provided)
3. Check credit limit — warn if invoice pushes customer over limit
4. Check for overdue invoices — warn but allow

### Step 3: Calculate Line Items

For each line item:
```
Line Total = Quantity × Unit Price
```

Validate:
- Quantity must be > 0
- Unit price must be >= 0
- For stock-tracked items, check available stock in warehouse
- Warn if stock insufficient but allow (backorder)

### Step 4: Apply Tax

Pakistani tax rules:
- **GST (General Sales Tax):** Default 17% unless item is exempt
- **WHT (Withholding Tax):** Applied on certain categories per FBR rules
- **SRB (Sindh Revenue Board):** Provincial sales tax if applicable
- **FED (Federal Excise Duty):** On specific goods

Calculate:
```
Subtotal = Sum of all line totals
Tax Amount = Subtotal × Tax Rate
Total Amount = Subtotal + Tax Amount
```

### Step 5: Apply Discounts (if any)

- Line-level discount: applied before tax
- Invoice-level discount: applied before tax
- Discount must be documented with reason

### Step 6: Create Invoice Record

Insert into `invoices` table:
- `customerId`, `invoiceDate`, `dueDate`
- `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`
- `status` = 'DRAFT' initially
- `costCenterId` (if provided)
- `orgId` from current session

Insert into `invoiceItems` table:
- `invoiceId`, `productId`, `quantity`, `unitPrice`, `lineTotal`
- `taxRate`, `taxAmount`

### Step 7: Create Journal Entry (Double-Entry)

When invoice is finalized (status → SENT/PAID):

**Debit:** Accounts Receivable (customer account)
**Credit:** Sales Revenue (income account)
**Credit:** Tax Payable (tax account)

```
Dr. Accounts Receivable    117,000
    Cr. Sales Revenue              100,000
    Cr. GST Payable                17,000
```

### Step 8: Update Stock (if applicable)

For stock-tracked products:
- Reduce `warehouseStock` for the invoice warehouse
- Create `stockMovements` record (OUT, reason: SALE)
- Update product average cost if FIFO/weighted average

### Step 9: FBR Submission (if configured)

If organization has FBR integration enabled:
1. Validate NTN/STRN
2. Generate FBR-compliant invoice JSON
3. Submit to FBR API
4. Store FBR reference number and QR code
5. Mark invoice as FBR_SUBMITTED

### Step 10: Generate Output

Return to user:
- Invoice number (formatted: `{prefix}-{YYYY}-{sequential}`)
- Invoice PDF (if requested)
- Email option (if requested)
- WhatsApp share option (if requested)

## Edge Cases

- **Duplicate invoice:** Check for same customer + same items within 7 days → warn user
- **Zero-amount invoice:** Allow for free samples, but log reason
- **Multi-currency:** Convert using `exchangeRates` table, store both amounts
- **Recurring invoice:** Create `recurringInvoices` record instead of direct invoice
- **Partial payment:** Invoice remains open, `customerPaymentAllocations` tracks payments
- **Credit note:** Use credit-debit notes module, not invoice modification

## References

- [FBR Invoice Rules](references/fbr-rules.md)
- [Tax Rates](references/tax-rates.md)
- [NTN Validation](references/ntn-validation.md)
