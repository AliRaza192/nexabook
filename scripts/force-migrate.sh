#!/bin/bash

# Force push schema changes (accepts data loss)
# WARNING: This will delete old columns and their data

echo "=========================================="
echo "  ⚠️  Force Schema Migration"
echo "=========================================="
echo ""
echo "WARNING: This will:"
echo "  - Delete old columns: subtotal, total_amount, amount"
echo "  - Lose data in those columns (1 invoice affected)"
echo "  - Create new columns with default values"
echo ""
echo "✅ Your NEW data will be safe:"
echo "  - gross_amount, net_amount, line_total, etc."
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "🚀 Forcing schema push..."
echo ""

# Use --force flag to accept data loss
npx drizzle-kit push --force

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ Migration Successful!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Test invoice creation: Sales > Invoices > New"
    echo "2. Create a new test invoice"
    echo "3. Approve it and verify stock updates"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo "Check the error above and try manual SQL migration"
    exit 1
fi
