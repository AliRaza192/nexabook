-- Purchases & Expenses Module Migration
-- This script creates the necessary tables for the Purchases & Expenses module
-- Run this manually if `npm run db:push` is not available

-- 1. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  ntn VARCHAR(50),
  strn VARCHAR(50),
  address TEXT,
  opening_balance DECIMAL(12, 2) DEFAULT '0',
  balance DECIMAL(12, 2) DEFAULT '0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Purchase Invoices Table
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  bill_number VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL,
  due_date TIMESTAMP,
  reference VARCHAR(100) DEFAULT '',
  subject VARCHAR(255) DEFAULT '',
  gross_amount DECIMAL(12, 2) NOT NULL DEFAULT '0',
  discount_total DECIMAL(12, 2) NOT NULL DEFAULT '0',
  tax_total DECIMAL(12, 2) NOT NULL DEFAULT '0',
  net_amount DECIMAL(12, 2) NOT NULL DEFAULT '0',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id),
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT '1',
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT '0',
  discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT '0',
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT '0',
  line_total DECIMAL(12, 2) NOT NULL DEFAULT '0'
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMP NOT NULL,
  reference VARCHAR(100) DEFAULT '',
  description TEXT,
  paid_from_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_vendors_org_id ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_org_id ON purchase_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor_id ON purchase_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_items_invoice_id ON purchase_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Add updated_at trigger for vendors
CREATE OR REPLACE FUNCTION update_vendors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendors_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_vendors_updated_at();

-- Add updated_at trigger for purchase_invoices
CREATE OR REPLACE FUNCTION update_purchase_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_invoices_updated_at
BEFORE UPDATE ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION update_purchase_invoices_updated_at();

-- Add updated_at trigger for expenses
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();

-- Migration Complete
-- Tables created: vendors, purchase_invoices, purchase_items, expenses
-- Indexes created for optimal query performance
-- Triggers added for automatic updated_at timestamps
