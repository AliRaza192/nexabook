ALTER TABLE manufacturing_boms ADD CONSTRAINT uq_bom_org_code UNIQUE (org_id, code);
ALTER TABLE job_orders ADD CONSTRAINT uq_job_order_org_number UNIQUE (org_id, order_number);