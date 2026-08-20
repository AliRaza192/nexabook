---
name: customer-management
description: >
  Manages customer records, balances, credit limits, and portal access.
  Use when: "customer info", "customer balance", "customer lookup", "client details",
  "customer ka data", "balance check karo", "customer statement", "credit limit".
  Do NOT use for: creating invoices, receiving payments, or sales reports.
---

# Customer Management Skill

## Goal

Maintain accurate customer records with proper credit management, balance tracking, and portal access for Pakistani businesses.

## When to Use

- User wants to look up customer information
- User says "customer ka balance check karo"
- User wants customer statement
- User wants to check credit limit status
- User wants to manage customer portal access

## Instructions

### Step 1: Customer Search

Search customers by:
- Name (partial match)
- Phone number
- Email
- NTN (exact match)
- Customer code

Present results:
```
Customer: ABC Trading Co.
Code: CUST-001
NTN: 12345678
Phone: 0321-1234567
Contact: Mr. Ahmed
```

### Step 2: View Customer Details

Full customer profile:
- Basic info (name, NTN, STRN, contact)
- Addresses (billing, shipping)
- Credit limit and current usage
- Outstanding balance
- Payment terms
- Last transaction date
- Portal access status

### Step 3: Calculate Customer Balance

```
Customer Balance = Σ(invoices) - Σ(payments)

Open Invoices:
INV-001: Rs. 50,000 (Due: 2026-07-15)
INV-002: Rs. 30,000 (Due: 2026-07-20)
INV-003: Rs. 20,000 (Paid)

Total Outstanding: Rs. 80,000
```

Query `invoices` + `customerPayments` + `customerPaymentAllocations`.

### Step 4: Aging Analysis

Categorize outstanding by age:
```
Current (0-30 days):   Rs. 50,000
31-60 days:            Rs. 20,000
61-90 days:            Rs. 10,000
90+ days:              Rs.  0,000
─────────────────────────────────
Total:                 Rs. 80,000
```

### Step 5: Credit Limit Check

When creating new invoice:
```
Current outstanding:  Rs. 80,000
Credit limit:        Rs. 100,000
New invoice:         Rs. 25,000
─────────────────────────────
After invoice:       Rs. 105,000
Over limit by:       Rs.  5,000

Action: WARN user, allow with approval
```

### Step 6: Customer Statement

Generate statement:
```
Customer: ABC Trading Co.
Period: July 2026

Date       | Description          | Debit    | Credit   | Balance
-----------|----------------------|----------|----------|--------
01/07/2026 | Opening Balance      |          |          | 50,000
05/07/2026 | Invoice INV-001      | 50,000   |          | 100,000
10/07/2026 | Payment Received     |          | 30,000   | 70,000
15/07/2026 | Invoice INV-002      | 30,000   |          | 100,000
20/07/2026 | Credit Note CN-001   |          | 5,000    | 95,000
-----------|----------------------|----------|----------|--------
           | Total                | 80,000   | 35,000   | 95,000
```

### Step 7: Follow-up Management

Track follow-ups:
- Overdue invoices → send reminder
- Payment due dates approaching → send reminder
- No activity for 90 days → flag for review

Actions:
- Send email reminder (via Resend)
- Send WhatsApp reminder
- Create follow-up task
- Log follow-up in audit trail

### Step 8: Portal Access

Customer portal features:
- View invoices and statements
- Make online payments
- Download documents
- Update profile

Manage:
- Generate portal token
- Set portal access level
- Track portal logins
- Monitor portal activity

### Step 9: Customer Segmentation

Categorize customers:
- **Regular** — Active, good payment history
- **VIP** — High volume, special pricing
- **At Risk** — Overdue payments, declining orders
- **Dormant** — No activity for 90+ days
- **Blocked** — Credit limit exceeded, legal issues

### Step 10: Loyalty Points (if configured)

Track loyalty program:
- Earn points on purchases
- Redeem points on invoices
- Track point balance
- Generate loyalty report

## Edge Cases

- **Multi-contact customer:** Store primary and secondary contacts
- **Multiple addresses:** Billing and shipping addresses
- **Joint account:** Multiple contacts sharing credit limit
- **Currency:** Customer may prefer USD, maintain both currencies
- **Tax exempt:** Customer with exemption certificate
- **Deceased/liquidated:** Special handling for outstanding balance

## References

- [Credit Rules](references/credit-rules.md)
- [Portal Setup](references/portal-setup.md)
