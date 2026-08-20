---
name: tax-filing
description: >
  Handles FBR invoice submission, NTN/STRN validation, provincial tax returns, and filing deadlines.
  Use when: "file tax", "FBR submit", "tax return", "sales tax return", "tax filing",
  "FBR invoice bhejo", "tax return file karo", "STRN validate", "NTN check".
  Do NOT use for: income tax calculation, payroll tax, or WHT certificates.
---

# Tax Filing Skill

## Goal

Ensure accurate and timely tax compliance for Pakistani businesses: FBR invoice submission, NTN/STRN validation, provincial tax returns (SRB, PRA, KPRA, BRA), and filing deadline management.

## When to Use

- User wants to submit invoices to FBR
- User asks about tax filing deadlines
- User wants to validate NTN or STRN
- User wants to generate provincial tax returns
- User says "tax file karo" or "FBR submit karo"

## Instructions

### Step 1: Validate NTN (National Tax Number)

NTN format: **8 digits** (numeric only)

```
Valid:   12345678
Invalid: 1234567 (7 digits)
Invalid: 123456789 (9 digits)
Invalid: ABCD1234 (contains letters)
```

Check against FBR database (if API available) or validate format only.

### Step 2: Validate STRN (Sales Tax Registration Number)

STRN format: **13 characters** — 7 digits + dash + 1 check digit

```
Valid:   1234567-1
Invalid: 1234567-12 (extra digit)
Invalid: 1234567 (missing check digit)
```

### Step 3: Prepare Invoice for FBR Submission

For each invoice to submit:

1. **Validate invoice data:**
   - NTN/STRN present and valid
   - Invoice number unique
   - Items have HS codes (if required)
   - Tax amounts calculated correctly

2. **Generate FBR JSON:**
```json
{
  "invoiceNumber": "INV-2026-001",
  "invoiceDate": "2026-07-01",
  "buyerNTN": "12345678",
  "buyerSTRN": "1234567-1",
  "items": [
    {
      "description": "Product A",
      "hsCode": "8471.30",
      "quantity": 10,
      "unitPrice": 1000,
      "totalAmount": 10000,
      "taxRate": 17,
      "taxAmount": 1700
    }
  ],
  "totalAmount": 11700,
  "taxAmount": 1700
}
```

3. **Submit to FBR API:**
   - POST to FBR endpoint
   - Handle response (success/failure)
   - Store FBR reference number
   - Generate QR code

4. **Mark invoice:**
   - `fbrStatus` = 'SUBMITTED' | 'FAILED'
   - `fbrReference` = reference number
   - `fbrSubmissionDate` = timestamp

### Step 4: Batch Submission

Process multiple invoices at once:
1. Select invoices with status DRAFT/SENT
2. Validate all (stop on first error)
3. Submit in batches of 5
4. Track success/failure per invoice
5. Report summary to user

### Step 5: Retry Failed Submissions

For invoices with `fbrStatus` = 'FAILED':
1. Check error reason
2. Fix common issues (missing fields, invalid format)
3. Re-submit
4. Update status

### Step 6: Provincial Tax Returns

#### Sindh (SRB)
- Sales tax on services: 5-8%
- Filing: Monthly by 15th of next month
- Return format: SRB prescribed format

#### Punjab (PRA)
- Sales tax on services: 5-8%
- Filing: Monthly by 15th of next month
- Return format: PRA prescribed format

#### Khyber Pakhtunkhwa (KPRA)
- Sales tax on services: 8-10%
- Filing: Monthly by 15th of next month
- Return format: KPRA prescribed format

#### Balochistan (BRA)
- Sales tax on services: 5-8%
- Filing: Monthly by 15th of next month
- Return format: BRA prescribed format

Generate return:
1. Aggregate sales for the period
2. Calculate tax collected
3. Calculate input tax (purchases)
4. Net tax payable = collected - input
5. Generate return in provincial format
6. Submit (if API available) or generate PDF for manual filing

### Step 7: Filing Deadlines

Track and remind:
- **FBR Sales Tax:** Monthly by 18th
- **SRB/PRA/KPRA/BRA:** Monthly by 15th
- **WHT Monthly:** Monthly by 15th
- **Income Tax Quarterly:** Quarterly by 30 days after quarter end

Send reminders:
- 7 days before deadline
- 3 days before deadline
- 1 day before deadline

### Step 8: WHT (Withholding Tax)

Track WHT deductions:
- On vendor payments (various rates)
- On customer receipts (if applicable)
- Generate WHT certificates
- Include in tax returns

## Edge Cases

- **Invoice already submitted:** Don't re-submit, return existing reference
- **NTN not found:** Allow manual entry, flag for verification
- **Rate changes mid-period:** Use rate applicable on invoice date
- **Multi-province sales:** File returns in each province
- **Reverse charge:** Calculate and report reverse charge tax
- **Amended return:** Submit amendment with reference to original

## References

- [FBR API Format](references/fbr-api.md)
- [Provincial Tax Rules](references/provincial-rules.md)
- [Filing Deadlines](references/deadlines.md)
