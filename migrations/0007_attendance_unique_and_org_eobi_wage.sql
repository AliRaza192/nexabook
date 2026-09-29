-- Fixes guaranteed-crash bug: onConflictDoUpdate needs a real constraint to target
ALTER TABLE attendance ADD CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, date);

-- EOBI is calculated on the government-notified minimum wage, never on basic salary —
-- this must be org-configurable since minimum wage varies by province/year.
ALTER TABLE organizations ADD COLUMN eobi_minimum_wage decimal(12,2) NOT NULL DEFAULT 40700;

-- Configurable income tax slabs — replaces hardcoded, now-outdated (pre-July-2026) logic.
-- NOTE: seed with the exact FY2026-27 FBR slab table from the official Finance Act 2026
-- document — this migration only creates the structure, values are NOT guessed here.
CREATE TABLE tax_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  fiscal_year varchar(10) NOT NULL, -- e.g. '2026-27'
  min_annual_income decimal(14,2) NOT NULL,
  max_annual_income decimal(14,2), -- null = no upper bound
  base_tax decimal(14,2) NOT NULL DEFAULT 0,
  rate_percentage decimal(5,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (org_id, fiscal_year, min_annual_income)
);