# FBR Invoice Rules

## FBR Invoice Format Requirements

### Required Fields
- Invoice Number (unique, sequential)
- Invoice Date
- Buyer NTN (8 digits)
- Buyer STRN (13 characters, format: XXXXXXX-X)
- Seller NTN
- Seller STRN
- Item descriptions with HS codes
- Quantities and unit prices
- Tax amounts (GST, WHT)
- Total amount

### Invoice Number Format
- Prefix (configurable): e.g., "INV"
- Year: YYYY
- Sequential number: 0001+
- Example: INV-2026-0001

### FBR Submission API
- Endpoint: https://gw.fbr.gov.pk/di/data/v1/invdoc702
- Method: POST
- Headers: Authorization, Content-Type
- Body: JSON invoice data

### QR Code
- Generate QR code with invoice hash
- Display on invoice PDF
- Include FBR reference number

### Common Rejection Reasons
- Invalid NTN/STRN format
- Duplicate invoice number
- Missing required fields
- Tax calculation errors
- HS code not found

### Retry Logic
- Wait 5 seconds before retry
- Maximum 3 retries
- Log each attempt
- Alert on persistent failure
