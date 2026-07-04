-- ===========================================
-- Migration: Add org_id indexes for multi-tenant performance
-- Run against your Neon database:
--   psql $DATABASE_URL -f migrations/001_add_org_indexes.sql
-- ===========================================

-- Core tables (highest query volume)
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_org_id ON chart_of_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_id ON journal_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_org_id ON journal_entry_lines(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);

-- Sales
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_org_id ON invoice_items(org_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org_id ON quotations(org_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_org_id ON quotation_items(org_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_org_id ON sale_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_sale_order_items_org_id ON sale_order_items(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_org_id ON sales_returns(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_org_id ON sales_return_items(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_org_id ON customer_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_allocations_org_id ON customer_payment_allocations(org_id);

-- Purchases
CREATE INDEX IF NOT EXISTS idx_vendors_org_id ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_org_id ON purchase_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_org_id ON purchase_items(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_id ON purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_org_id ON purchase_order_items(org_id);
CREATE INDEX IF NOT EXISTS idx_good_receiving_notes_org_id ON good_receiving_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_org_id ON grn_items(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_org_id ON purchase_returns(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_org_id ON purchase_return_items(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_org_id ON vendor_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_org_id ON vendor_payment_allocations(org_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_categories_org_id ON categories(org_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_org_id ON warehouses(org_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_org_id ON warehouse_stock(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_id ON stock_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_org_id ON stock_adjustments(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_items_org_id ON stock_adjustment_items(org_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_org_id ON product_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_uom_conversions_org_id ON uom_conversions(org_id);

-- Banking
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org_id ON bank_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_org_id ON bank_deposits(org_id);
CREATE INDEX IF NOT EXISTS idx_funds_transfers_org_id ON funds_transfers(org_id);
CREATE INDEX IF NOT EXISTS idx_misc_contacts_org_id ON misc_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_contra_entries_org_id ON contra_entries(org_id);

-- Expenses & Payments
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_settlements_org_id ON settlements(org_id);
CREATE INDEX IF NOT EXISTS idx_settlement_lines_org_id ON settlement_lines(org_id);

-- CRM
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org_id ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_calls_org_id ON calls(org_id);

-- HR / Payroll
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org_id ON payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_payslips_org_id ON payslips(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_types_org_id ON leave_types(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_org_id ON leave_applications(org_id);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_org_id ON timesheets(org_id);

-- Fixed Assets
CREATE INDEX IF NOT EXISTS idx_fixed_assets_org_id ON fixed_assets(org_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciations_org_id ON asset_depreciations(org_id);

-- Fiscal Periods
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_org_id ON fiscal_periods(org_id);

-- Exchange Rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_org_id ON exchange_rates(org_id);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);

-- Bank Feeds
CREATE INDEX IF NOT EXISTS idx_bank_connections_org_id ON bank_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_bank_feed_transactions_org_id ON bank_feed_transactions(org_id);

-- POS
CREATE INDEX IF NOT EXISTS idx_pos_shifts_org_id ON pos_shifts(org_id);

-- Tax
CREATE INDEX IF NOT EXISTS idx_tax_rates_org_id ON tax_rates(org_id);

-- Settings
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_org_id ON dashboard_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_org_id ON role_permissions(org_id);

-- Composite indexes for common query patterns (orgId + frequently filtered columns)
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(org_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date ON journal_entries(org_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_products_org_category ON products(org_id, category_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_product ON stock_movements(org_id, product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(org_id, date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_org_status ON purchase_invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_org_name ON customers(org_id, name);
CREATE INDEX IF NOT EXISTS idx_vendors_org_name ON vendors(org_id, name);
