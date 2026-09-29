-- Add orgId to warehouseStock for tenant isolation (was missing — direct IDOR risk)
ALTER TABLE warehouse_stock ADD COLUMN org_id uuid REFERENCES organizations(id);
UPDATE warehouse_stock ws
SET org_id = w.org_id
FROM warehouses w
WHERE ws.warehouse_id = w.id;
ALTER TABLE warehouse_stock ALTER COLUMN org_id SET NOT NULL;

-- Add orgId to stockTransferItems for consistency with every other line-item table
ALTER TABLE stock_transfer_items ADD COLUMN org_id uuid REFERENCES organizations(id);
UPDATE stock_transfer_items sti
SET org_id = st.org_id
FROM stock_transfers st
WHERE sti.transfer_id = st.id;
ALTER TABLE stock_transfer_items ALTER COLUMN org_id SET NOT NULL;

-- Missing document-number unique constraints (prevents silent duplicates)
ALTER TABLE delivery_notes ADD CONSTRAINT uq_delivery_note_org_number UNIQUE (org_id, delivery_number);
ALTER TABLE sales_returns ADD CONSTRAINT uq_sales_return_org_number UNIQUE (org_id, return_number);
ALTER TABLE purchase_returns ADD CONSTRAINT uq_purchase_return_org_number UNIQUE (org_id, return_number);
ALTER TABLE customer_payments ADD CONSTRAINT uq_customer_payment_org_number UNIQUE (org_id, payment_number);
ALTER TABLE vendor_payments ADD CONSTRAINT uq_vendor_payment_org_number UNIQUE (org_id, payment_number);
ALTER TABLE settlements ADD CONSTRAINT uq_settlement_org_number UNIQUE (org_id, settlement_number);
ALTER TABLE bank_deposits ADD CONSTRAINT uq_bank_deposit_org_number UNIQUE (org_id, deposit_number);
ALTER TABLE funds_transfers ADD CONSTRAINT uq_funds_transfer_org_number UNIQUE (org_id, transfer_number);
ALTER TABLE misc_contacts ADD CONSTRAINT uq_misc_contact_org_number UNIQUE (org_id, reference_number);
ALTER TABLE credit_debit_notes ADD CONSTRAINT uq_credit_debit_note_org_number UNIQUE (org_id, note_number);
ALTER TABLE pdc_instruments ADD CONSTRAINT uq_pdc_instrument_org_number UNIQUE (org_id, instrument_number);
ALTER TABLE stock_adjustments ADD CONSTRAINT uq_stock_adjustment_org_number UNIQUE (org_id, adjustment_number);
ALTER TABLE stock_counts ADD CONSTRAINT uq_stock_count_org_number UNIQUE (org_id, count_number);

-- Prevent duplicate SKUs / category names per org (trade-off: includes soft-deleted rows — see review notes)
ALTER TABLE products ADD CONSTRAINT uq_product_org_sku UNIQUE (org_id, sku);
ALTER TABLE product_categories ADD CONSTRAINT uq_category_org_name UNIQUE (org_id, name);