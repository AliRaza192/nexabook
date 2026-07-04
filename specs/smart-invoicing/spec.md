# Smart Invoicing — Feature Specification

## Goal
Make invoice creation faster, smarter, and safer by learning from historical invoice data. Reduce manual data entry, prevent duplicate invoices, suggest fair prices, and flag anomalies.

---

## User Scenarios

### Scenario 1: Smart Defaults
Sarah creates an invoice for customer "ABC Corp". She selects the customer and sees:
- Suggested due date: **30 days** (ABC Corp's standard payment terms from last 12 invoices)
- Suggested order booker: **Ahmed** (handled 80% of ABC Corp orders)
- Suggested currency: **PKR** (ABC Corp's default)

### Scenario 2: Duplicate Detection
Sarah creates an invoice for "ABC Corp" with items "Laptop x10" totaling Rs. 1,500,000. A warning appears:
> ⚠️ Similar invoice found: INV-2026-00045 (Rs. 1,480,000) created 3 days ago for same customer. Are you sure this isn't a duplicate?

### Scenario 3: Pricing Suggestions
Sarah adds "Laptop" as a line item. The system suggests:
- Last sold price: **Rs. 148,000** (sold 5 days ago to ABC Corp)
- 30-day average: **Rs. 150,000** (across all customers)
- Last 3 invoices to this customer: **Rs. 148,000 - 152,000**

Sarah picks Rs. 150,000 and moves on.

### Scenario 4: Anomaly Detection
Sarah creates an invoice for "New Customer Ltd" (first invoice) totaling Rs. 5,000,000. A warning appears:
> ⚠️ New customer with unusually high invoice amount (Rs. 5,000,000). Customer average for similar businesses: Rs. 200,000. Consider requiring upfront payment.

### Scenario 5: Payment Prediction
Sarah selects "QuickPay Traders". The system shows:
> 💡 Payment prediction: 95% likely to pay on time (based on 20 invoices, average 12 days).

---

## Functional Requirements

### FR-1: Smart Defaults
When customer is selected, suggest:
- **Due date**: Based on customer's historical payment terms (most common gap between issue date and due date)
- **Order booker**: Most frequent order booker for this customer
- **Warehouse**: Most frequently used warehouse for this customer
- **Currency**: Customer's default currency

### FR-2: Duplicate Detection
Before saving, check for potential duplicates:
- **Criteria**: Same customer + at least 80% of items overlap (by product ID) + net amount within ±20%
- **Time window**: Last 7 days
- **Behavior**: Show warning, allow user to proceed or cancel
- **Output**: List of potential duplicates with invoice number, date, amount, and item count

### FR-3: Pricing Suggestions
When a product is added to a line item, suggest prices:
- **Source 1**: Last sold price to this specific customer (most recent invoice)
- **Source 2**: 30-day average selling price across all customers
- **Source 3**: Last 3 invoices to this customer (min/max range)
- **Behavior**: Show as clickable suggestions in the line item row
- **Fallback**: If no historical data, show nothing (use product's default price)

### FR-4: Anomaly Detection
Flag invoices that seem unusual:
- **High amount**: Invoice total > 3x customer's average invoice amount
- **New customer**: First invoice for a customer with amount > Rs. 500,000
- **Bulk order**: Quantity > 10x customer's average order quantity for that product
- **Behavior**: Show warning banner, allow user to proceed
- **Severity**: Info (low risk) vs Warning (high risk)

### FR-5: Payment Prediction
Show predicted payment likelihood when customer is selected:
- **Based on**: Customer's payment history (average days to pay, on-time rate)
- **Output**: "Likely to pay on time (X% confidence)" or "Payment may be delayed (based on X invoices)"
- **Thresholds**: On-time = paid within due date

---

## Edge Cases

- **New customer (no history)**: Skip all suggestions, show nothing
- **Deleted invoices**: Exclude from analysis (status = 'cancelled')
- **Draft invoices**: Exclude from pricing analysis (not finalized)
- **Multiple currencies**: Only suggest prices in the same currency
- **No products in DB**: Skip pricing suggestions
- **AI service unavailable**: Gracefully degrade — show no suggestions, allow normal creation

---

## Out of Scope

- AI-generated invoice content (descriptions, terms)
- Automatic invoice creation (always requires user action)
- Customer segmentation / clustering
- Revenue forecasting
- Payment reminders (separate feature)

---

## Acceptance Criteria

- [ ] When customer is selected, smart defaults appear within 2 seconds
- [ ] Duplicate detection catches 90% of actual duplicates (based on test data)
- [ ] Pricing suggestions show correct prices from historical data
- [ ] Anomaly warnings appear for invoices > 3x customer average
- [ ] All suggestions are optional — user can ignore them and proceed normally
- [ ] No suggestions appear for new customers (graceful fallback)
- [ ] AI suggestions are non-blocking (invoice creation doesn't wait for AI)
- [ ] All existing invoice functionality continues to work unchanged
