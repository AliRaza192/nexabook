-- generateTaxReturn() used a check-then-insert, so two concurrent requests for the
-- same period could both pass the "already exists" SELECT and insert duplicate
-- rows. Enforce uniqueness at the DB level.
ALTER TABLE sales_tax_returns ADD CONSTRAINT uq_tax_return_org_period UNIQUE (org_id, period_label);
