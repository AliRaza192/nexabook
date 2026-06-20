# NexaBook — Missing Features Implementation Process

## Jo Features Competitors Mein Hain, Hum Mein Nahi

### ✅ Sprint A — Customer & Vendor Portal
- [x] A1: Customer portal page — login-less token-based invoice viewing
- [x] A2: Customer portal — online payment (JazzCash/Easypaisa)
- [x] A3: Customer portal — statement download (PDF)
- [x] A4: Vendor portal — purchase invoice & payment status view

### ✅ Sprint B — Price Lists & Customer Tiers
- [x] B1: `priceLists` schema (name, type: wholesale/retail/gold/platinum)
- [x] B2: `priceListItems` schema (productId, priceListId, unitPrice)
- [x] B3: Customer → priceListId added to customers table
- [x] B4: Invoice/Order auto-picks price from assigned list (schema ready)
- [x] B5: UI for managing price lists at `/inventory/price-lists`

### ✅ Sprint C — Budgeting & Forecasting
- [x] C1: `budgets` schema (orgId, fiscalYear, accountId, budgetedAmount, month)
- [x] C2: Budget vs Actual report page at `/reports/budget`
- [x] C3: Budget variance with red/green indicators

### ✅ Sprint D — Workflow Approvals (Multi-Level)
- [x] D1: `approvalWorkflows` schema (orgId, entityType, approverRole, minAmount, maxAmount, orderIndex)
- [x] D2: `approvalRequests` schema (workflowId, entityId, entityNumber, amount, status)
- [x] D3: Approvals page at `/approvals` with approve/reject
- [x] D4: Approval workflow settings at `/settings/approvals`

### ✅ Sprint E — Email Template Customization
- [x] E1: `emailTemplates` schema (orgId, templateType, subject, bodyHtml)
- [x] E2: Template editor UI (variable insertion: {invoiceNo}, {customerName}, etc.)
- [x] E3: Use custom templates in send-invoice-email & send-quotation-whatsapp

### ✅ Sprint F — Dashboard Customization
- [x] F1: `dashboardWidgets` schema (orgId, widgetType, position, isVisible)
- [x] F2: Drag-and-drop widget grid
- [x] F3: Widget visibility toggles

### ✅ Sprint G — Sales Tax Return Auto-Filing
- [x] G1: `salesTaxReturns` schema (orgId, period, totalSales, outputTax, inputTax, netPayable, status)
- [x] G2: Auto-calculate sales tax from invoices for period
- [x] G3: Generate return PDF for FBR submission + submit to FBR API

### ✅ Sprint H — Webhooks & Public API
- [x] H1: `webhookEndpoints` schema (orgId, url, events, secret)
- [x] H2: Webhook delivery engine (sign + send on entity create/update)
- [x] H3: `webhookDeliveries` schema for delivery tracking

### ✅ Sprint I — Cost Center / Profit Center Accounting
- [x] I1: `costCenters` schema (orgId, name, code)
- [x] I2: Link cost center to journal entry lines & invoices
- [x] I3: Cost center wise P&L report

### Sprint J — Mobile App (React Native / Flutter)
- [ ] J1: Expand mobile API routes (sales, purchases, inventory)
- [ ] J2: React Native/Flutter project setup
- [ ] J3: Auth with Clerk
- [ ] J4: Dashboard + Invoice list + Payment collection

### Sprint K — Two-Factor Authentication
- [ ] K1: Clerk 2FA configuration
- [ ] K2: Force 2FA for admin role

### Sprint L — Bank Feeds (Auto-Sync)
- [ ] L1: Bank API integration schema + service
- [ ] L2: Auto-import transactions daily

### Sprint M — Multi-Company Consolidation
- [ ] M1: Parent-child org relationship
- [ ] M2: Consolidated P&L & Balance Sheet

### Sprint N — Project Management + Timesheets
- [ ] N1: `projects` schema
- [ ] N2: `tasks` schema with assignee, status, priority
- [ ] N3: `timesheets` schema (employeeId, projectId, date, hours, description)
- [ ] N4: Project profitability report

### Sprint O — WHT Certificates & Statements
- [ ] O1: WHT certificate generation (PDF)
- [ ] O2: Vendor-wise WHT statement
- [ ] O3: Annual WHT return summary

---

## Execution Order (Updated)

### ✅ Completed
- **Sprint A** — Customer & Vendor Portal
- **Sprint B** — Price Lists & Customer Tiers
- **Sprint C** — Budgeting & Forecasting
- **Sprint D** — Workflow Approvals
- **Sprint E** — Email Template Customization
- **Sprint F** — Dashboard Customization
- **Sprint G** — Sales Tax Return Auto-Filing
- **Sprint H** — Webhooks & Public API

### ✅ Completed
9. **Sprint I** — Cost Center / Profit Center

### 🔜 Next
10. **Sprint K** — Two-Factor Authentication
10. **Sprint K** — Two-Factor Authentication
11. **Sprint N** — Project Management + Timesheets
12. **Sprint O** — WHT Certificates
13. **Sprint E** — Email Templates
14. **Sprint L** — Bank Feeds (Auto-Sync)
15. **Sprint M** — Multi-Company Consolidation
16. **Sprint J** — Mobile App
