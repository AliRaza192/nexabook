# Email Invoicing Setup Guide

## Environment Variables

Add the following to your `.env.local` file:

```env
# Resend API Key (Get it from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

## Setup Steps

### 1. Get Resend API Key
1. Sign up at [Resend.com](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Add it to your `.env.local` file

### 2. Update Database Schema
Run the following command to push the schema changes to your database:

```bash
npx drizzle-kit push
```

This will add the `email_sent_at` column to the `invoices` table.

### 3. Configure Sender Domain (Optional but Recommended)
By default, emails will be sent from `onboarding@resend.dev`. To use your own domain:

1. Go to Resend Dashboard → Domains
2. Add and verify your domain
3. Update the `from` address in `src/app/api/send-invoice-email/route.ts`:
   ```typescript
   from: `${invoice.orgName} <invoices@yourdomain.com>`,
   ```

### 4. Test Email Sending
1. Go to Sales → Invoices
2. Click the Mail icon next to an invoice
3. Confirm the email address in the dialog
4. Click "Send Email"
5. Check for the green "Sent ✓" badge

## Features Implemented

✅ Professional HTML email template with Nexa-Blue theme
✅ Mobile-responsive email design
✅ Invoice summary table in email
✅ Payment instructions section
✅ Company branding (logo, name, address)
✅ Email confirmation dialog
✅ Loading spinner during send
✅ "Sent ✓" badge for sent invoices
✅ Customer email validation
✅ Automatic `emailSentAt` timestamp tracking

## Email Template Features

- **Header**: Company logo, name, and contact info
- **Invoice Details**: Invoice number, dates, and status
- **Items Table**: Complete line items with quantities and prices
- **Financial Summary**: Subtotal, discount, tax, and net total
- **Payment Instructions**: Bank details for payment
- **Notes Section**: Any additional notes from the invoice
- **Footer**: Company branding and NexaBook attribution

## Troubleshooting

### Email Not Sending
- Check that `RESEND_API_KEY` is set correctly
- Verify the customer has an email address
- Check the browser console for errors

### Email Going to Spam
- Verify your domain with Resend
- Set up SPF, DKIM, and DMARC records
- Use a professional from address

### Customer Email Missing
- The mail button will be disabled
- User will see an alert: "Please add customer email first"
- Add email to customer profile first
