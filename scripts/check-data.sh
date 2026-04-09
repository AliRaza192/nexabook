#!/bin/bash

# Quick script to check existing data before migration

echo "=========================================="
echo "  Checking Existing Data"
echo "=========================================="
echo ""

# Load DATABASE_URL from .env.local
source <(grep DATABASE_URL .env.local | sed 's/^/export /')

echo "📊 Checking invoices table..."
psql $DATABASE_URL -c "
SELECT 
    id, 
    invoice_number, 
    subtotal, 
    tax_amount,
    total_amount,
    created_at
FROM invoices 
LIMIT 5;
"

echo ""
echo "📦 Checking invoice_items table..."
psql $DATABASE_URL -c "
SELECT 
    id,
    invoice_id,
    description,
    quantity,
    unit_price,
    amount
FROM invoice_items 
LIMIT 5;
"

echo ""
echo "=========================================="
echo "  Summary"
echo "=========================================="

psql $DATABASE_URL -c "
SELECT 'invoices' as table_name, COUNT(*) as count FROM invoices
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items;
"

echo ""
echo "⚠️  If you see data above, it will be migrated."
echo "✅  Running data-safe migration..."
echo ""
