-- Migration: Add Digital FTE Product tables for Monetization
-- Date: July 4, 2026

-- Digital FTE Products
CREATE TABLE IF NOT EXISTS digital_fte_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Organization FTE Subscriptions
CREATE TABLE IF NOT EXISTS org_fte_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  fte_product_id UUID NOT NULL REFERENCES digital_fte_products(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digital_fte_products_slug ON digital_fte_products(slug);
CREATE INDEX IF NOT EXISTS idx_digital_fte_products_category ON digital_fte_products(category);
CREATE INDEX IF NOT EXISTS idx_org_fte_subscriptions_org ON org_fte_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_fte_subscriptions_product ON org_fte_subscriptions(fte_product_id);

-- Seed Digital FTE Products
INSERT INTO digital_fte_products (slug, name, description, features, price_monthly, price_yearly, category, sort_order) VALUES
('accounting-fte', 'Accounting FTE', 'AI-powered accounting assistant that auto-processes invoices, journal entries, and bank reconciliation 24/7.', '["Auto journal entry creation", "Bank reconciliation", "Financial reports", "Multi-currency support", "Audit trail"]', 500, 5000, 'accounting', 1),
('tax-compliance-fte', 'Tax Compliance FTE', 'Automated FBR/SRB tax filing, NTN/STRN validation, and deadline reminders for Pakistani businesses.', '["FBR invoice submission", "SRB/PRA provincial returns", "NTN/STRN validation", "Filing deadline reminders", "Tax reports"]', 400, 4000, 'tax', 2),
('inventory-fte', 'Inventory FTE', 'Smart inventory management with stock tracking, COGS calculation, and reorder suggestions.', '["Real-time stock tracking", "Batch & expiry management", "COGS calculation", "Low stock alerts", "Warehouse management"]', 350, 3500, 'inventory', 3),
('payroll-fte', 'Payroll FTE', 'Automated salary processing, EOBI, tax deductions, and payslip generation for Pakistani employees.', '["Monthly payroll processing", "EOBI/PF deductions", "Income tax calculation", "Payslip generation", "Department breakdown"]', 300, 3000, 'payroll', 4),
('crm-fte', 'CRM FTE', 'AI-powered customer management with follow-ups, pipeline tracking, and lead scoring.', '["Lead management", "Follow-up reminders", "Pipeline tracking", "Customer insights", "WhatsApp integration"]', 250, 2500, 'crm', 5);
