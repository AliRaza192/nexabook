# FBR API Format

## Endpoint
- Production: https://gw.fbr.gov.pk/di/data/v1/invdoc702
- Sandbox: https://gw-fbr.pentaops.net/di/data/v1/invdoc702

## Authentication
- Bearer token (obtained via login API)
- Token expires after 24 hours
- Refresh before expiry

## Request Format
```json
{
  "TOKEN": "bearer_token",
  "DATA": {
    "INVDOC": {
      "INVNUM": "INV-2026-0001",
      "INVDATE": "2026-07-01",
      "BUYERNTN": "12345678",
      "BUYERSTRN": "1234567-1",
      "ITEMS": [...],
      "TOTALAMOUNT": 117000,
      "TAXAMOUNT": 17000
    }
  }
}
```

## Response Format
```json
{
  "STATUS": "OK",
  "REFNUM": "FBR-REF-123456",
  "QRDATA": "base64_qr_code",
  "MESSAGE": "Invoice submitted successfully"
}
```

## Error Codes
- E001: Invalid NTN
- E002: Invalid STRN
- E003: Duplicate invoice number
- E004: Invalid tax calculation
- E005: Missing required field
