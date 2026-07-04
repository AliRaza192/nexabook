-- Performance indexes for frequently queried foreign keys
-- These indexes dramatically improve query performance on large datasets

-- Invoices: orgId + status (used in every dashboard query, report, listing)
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices (org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_customer ON invoices (org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_issue_date ON invoices (org_id, issue_date);

-- Invoice Items: invoiceId (used in every invoice detail query)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_org ON invoice_items (org_id);

-- Journal Entry Lines: accountId + orgId (used in ledger/balance queries)
CREATE INDEX IF NOT EXISTS idx_je_lines_account_org ON journal_entry_lines (account_id, org_id);
CREATE INDEX IF NOT EXISTS idx_je_lines_journal ON journal_entry_lines (journal_entry_id);

-- Journal Entries: orgId + entryDate (used in period queries)
CREATE INDEX IF NOT EXISTS idx_je_org_date ON journal_entries (org_id, entry_date);

-- Products: orgId (used in every product query)
CREATE INDEX IF NOT EXISTS idx_products_org ON products (org_id);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products (org_id, is_active);

-- Customers: orgId (used in every customer query)
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers (org_id);

-- Vendors: orgId
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors (org_id);

-- Purchase Invoices: orgId + date
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_org_date ON purchase_invoices (org_id, date);

-- Purchase Items: purchaseInvoiceId
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice ON purchase_items (purchase_invoice_id);

-- Stock Movements: productId + orgId (used in stock history queries)
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_org ON stock_movements (product_id, org_id);

-- Bank Transactions: bankAccountId (used in reconciliation)
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements (bank_account_id);

-- Payslips: payrollRunId + orgId
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_org ON payslips (payroll_run_id, org_id);

-- Attendance: employeeId + date
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance (employee_id, date);

-- Sale Orders: orgId + status
CREATE INDEX IF NOT EXISTS idx_sale_orders_org ON sale_orders (org_id, status);

-- Quotations: orgId + status
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations (org_id, status);

-- Customer Payments: orgId + date
CREATE INDEX IF NOT EXISTS idx_customer_payments_org ON customer_payments (org_id, payment_date);

-- Vendor Payments: orgId + date
CREATE INDEX IF NOT EXISTS idx_vendor_payments_org ON vendor_payments (org_id, payment_date);

-- Chat Messages: orgId + userId (used in chat history load)
CREATE INDEX IF NOT EXISTS idx_chat_messages_org_user ON chat_messages (org_id, user_id);

-- Org FTE Subscriptions: orgId
CREATE INDEX IF NOT EXISTS idx_org_fte_subs_org ON org_fte_subscriptions (org_id);

-- Reconciliation Patterns: orgId
CREATE INDEX IF NOT EXISTS idx_recon_patterns_org ON reconciliation_patterns (org_id);

-- Expenses: orgId + date
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses (org_id, date);
