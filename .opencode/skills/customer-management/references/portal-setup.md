# Customer Portal Setup

## Portal Features
- View invoices and quotations
- View and download PDFs
- Make online payments
- View account statement
- Update profile information
- Track order status

## Portal Token
- Generated per customer
- UUID-based, secure
- Sent via email/WhatsApp
- No login required (token-based)

## Access Levels
- Basic: View invoices only
- Standard: View + pay
- Full: View + pay + edit profile

## Portal URL
- Format: /portal/{token}
- Mobile responsive
- No authentication required (token-based)

## Security
- Token expires after 90 days (configurable)
- Rate limiting on payment endpoints
- HTTPS required
- Log all portal activity

## Email/WhatsApp Integration
- Send invoice link via email
- Send payment reminder via WhatsApp
- Include portal link in communications
