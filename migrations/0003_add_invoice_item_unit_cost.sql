-- ACC-11: Add unitCost column to invoice_items for COGS snapshot at approval time.
-- This ensures the product-sales report uses the same cost as the journal entry.

ALTER TABLE invoice_items
  ADD COLUMN unit_cost decimal(12,2);
