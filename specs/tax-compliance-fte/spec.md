# spec.md — Tax Compliance FTE

## Goal

Automate Pakistan tax compliance for SMEs: FBR invoice formatting, GST calculation, withholding tax tracking, provincial tax management, and return data preparation. Ensure users never miss a tax deadline or file incorrect returns.

## User Scenarios

- When a sales invoice is created, then FBR-compliant invoice number format is enforced (PREFIX-8digits-MM-YY-DD)
- When sales tax is applicable, then 17% GST is auto-calculated and added to invoice
- When a purchase is recorded, then input tax credit is tracked for GST reconciliation
- When tax period ends, then GST return data is auto-prepared and downloadable
- When a withholding tax event occurs, then WHT is calculated per current FBR rates
- When provincial sale occurs, then SRB/PRA tax is applied based on supply location
- When NTN or STRN is entered, then format validation is performed before saving

## Functional Requirements

### FR-1: FBR Invoice Compliance
- Enforce FBR invoice number format: `{PREFIX}-{8-digit}-{MM}-{YY}-{DD}`
- Validate NTN (8 digits) and STRN (13 characters) on invoice creation
- Generate QR code for FBR invoices (existing implementation retained)
- Store FBR invoice hash for audit trail
- Block invoice save if NTN/STRN fails validation

### FR-2: Sales Tax (GST) Management
- Auto-calculate 17% GST on taxable items
- Track exempt items (zero-rated supplies, exempt supplies)
- Calculate Output GST (collected from customers on sales)
- Calculate Input GST (paid on purchases)
- Generate GST reconciliation: Output GST minus Input GST equals Net Tax Payable
- Support multiple GST rates: 17% standard, 0% exempt, 5% reduced

### FR-3: Withholding Tax (WHT)
- Auto-calculate WHT per FBR withholding tax rates:
  - Contractors: 7-10% (depending on category)
  - Professionals: 7%
  - Rent: 10%
  - Dividends: 15%
  - Interest: 10-20%
- Track WHT certificates issued and received
- Generate WHT summary reports by period
- Link WHT deductions to relevant expense accounts

### FR-4: Provincial Tax (SRB/PRA)
- Track Sindh Revenue Board (SRB) sales tax separately
- Track Punjab Revenue Authority (PRA) sales tax separately
- Support KPK and Balochistan provincial tax (future-ready)
- Calculate provincial tax based on supply location
- Generate separate provincial tax reports

### FR-5: Tax Return Preparation
- Prepare GST return data (monthly or quarterly based on turnover)
- Prepare WHT return data with certificate references
- Prepare annual income tax return data for businesses
- Generate tax summaries by period (month/quarter/year)
- Export data in FBR-prescribed CSV/text format
- Track filing deadlines with reminders via NexaBot

### FR-6: NTN/STRN Validation
- Validate NTN format: exactly 8 digits
- Validate STRN format: exactly 13 characters
- Store validated tax identifiers per organization
- Block invoice creation with invalid or missing tax identifiers

## Edge Cases

- Invoice with mixed taxable and exempt items (proportional GST calculation)
- Inter-provincial supply (different provincial tax rules apply)
- Tax refund scenario (Input GST exceeds Output GST)
- Mid-period tax rate change (apply rate based on invoice date)
- Amendment to previously filed return (adjustment entries)
- Business with multiple STRNs for different branches
- Tax exemption certificate (reduce GST to zero for qualifying purchases)
- Withholding tax on reverse charge basis

## Out of Scope

- Actual FBR API submission (manual filing for now, API when available)
- Tax payment processing (bank transfer, not in-app)
- International tax (VAT, sales tax outside Pakistan)
- Income tax return filing (data preparation only, not submission)
- Tax advisory or optimization recommendations
- Audit support documentation

## Acceptance Criteria

- [ ] FBR invoice format enforced on 100% of sales invoices
- [ ] GST calculated correctly to the paisa (no rounding errors)
- [ ] WHT calculated per current FBR rates
- [ ] Provincial tax tracked separately from federal GST
- [ ] GST reconciliation: Output minus Input equals Net Payable (mathematical proof)
- [ ] All tax queries filter by `orgId`
- [ ] NTN/STRN validated before invoice creation (block on invalid)
- [ ] Tax return data exportable in FBR-prescribed format
- [ ] TypeScript: 0 errors
- [ ] All tests pass (`npm run test`)

## Skills

### tax-gst-calculation
**Description:** Auto-calculates GST on invoices and bills. Fires when invoice or bill is created with taxable items.
- Input: Line items with tax status (taxable/exempt)
- Output: GST amount per line and total
- Guard: Never apply more than one GST rate per line item

### tax-wht-management
**Description:** Calculates and tracks withholding tax per FBR rates. Fires when WHT-applicable transaction is recorded.
- Input: Transaction type, amount, counterparty
- Output: WHT amount, certificate reference
- Guard: Never apply WHT rate without valid rate table

### tax-return-preparation
**Description:** Prepares GST, WHT, and income tax return data. Fires on period-end or manual request.
- Input: Tax period, transaction data
- Output: Formatted return data ready for filing
- Guard: Always reconcile before generating return data

### tax-provincial
**Description:** Tracks and calculates provincial sales tax (SRB/PRA). Fires when inter-provincial or provincial supply is recorded.
- Input: Supply location, amount
- Output: Provincial tax amount
- Guard: Apply correct provincial rate based on location
