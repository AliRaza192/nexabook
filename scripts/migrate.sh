#!/bin/bash

# NexaBook Database Migration Script
# This script safely applies the latest schema changes

echo "=========================================="
echo "  NexaBook Database Migration"
echo "=========================================="
echo ""

# Step 1: Verify environment
echo "📋 Step 1: Checking environment..."
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found!"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env.local!"
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Step 2: Generate migration
echo "📝 Step 2: Generating migration..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "❌ Migration generation failed!"
    exit 1
fi

echo ""
echo "✅ Migration generated successfully"
echo ""

# Step 3: Apply migration
echo "🚀 Step 3: Applying migration..."
npm run db:migrate

if [ $? -ne 0 ]; then
    echo "❌ Migration application failed!"
    exit 1
fi

echo ""
echo "✅ Migration applied successfully"
echo ""

# Step 4: Verify
echo "✨ Step 4: Verifying schema..."
npm run db:check

if [ $? -ne 0 ]; then
    echo "⚠️  Schema check found issues. Please review manually."
else
    echo "✅ Schema verification passed"
fi

echo ""
echo "=========================================="
echo "  Migration Complete! 🎉"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test invoice creation workflow"
echo "2. Verify existing data displays correctly"
echo "3. Check that all defaults are applied"
echo ""
echo "If you encounter issues, see MIGRATION_GUIDE.md"
echo ""
