-- ============================================
-- NexaBook Schema Migration - Data Safe
-- This script preserves existing data before dropping old columns
-- ============================================

-- Step 1: Check current data in invoices
SELECT 
    id, 
    invoice_number, 
    subtotal, 
    total_amount,
    tax_amount
FROM invoices 
WHERE subtotal IS NOT NULL OR total_amount IS NOT NULL;

-- Step 2: Migrate data from old columns to new columns
-- This copies existing data to the new column names
UPDATE invoices 
SET 
    gross_amount = COALESCE(subtotal, '0'),
    net_amount = COALESCE(total_amount, '0'),
    discount_amount = COALESCE(discount_amount, '0'),
    tax_amount = COALESCE(tax_amount, '0'),
    received_amount = COALESCE(received_amount, '0'),
    balance_amount = COALESCE(balance_amount, '0'),
    shipping_charges = COALESCE(shipping_charges, '0'),
    round_off = COALESCE(round_off, '0'),
    discount_percentage = COALESCE(discount_percentage, '0'),
    order_booker = COALESCE(order_booker, ''),
    subject = COALESCE(subject, ''),
    reference = COALESCE(reference, '')
WHERE 1=1;

-- Step 3: Migrate data in invoice_items
UPDATE invoice_items 
SET 
    line_total = COALESCE(amount, '0'),
    discount_percentage = COALESCE(discount_percentage, '0'),
    tax_rate = COALESCE(tax_rate, '0'),
    quantity = COALESCE(quantity, '1'),
    unit_price = COALESCE(unit_price, '0')
WHERE 1=1;

-- Step 4: Verify migration
SELECT 
    'invoices' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN gross_amount = '0' THEN 1 END) as zero_gross,
    COUNT(CASE WHEN net_amount = '0' THEN 1 END) as zero_net
FROM invoices

UNION ALL

SELECT 
    'invoice_items' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN line_total = '0' THEN 1 END) as zero_total,
    COUNT(*) as not_applicable
FROM invoice_items;

-- Step 5: If verification looks good, old columns will be dropped by Drizzle
-- No manual DROP needed - Drizzle handles this after successful push

-- ============================================
-- After running this script, run: npm run db:push
-- ============================================
