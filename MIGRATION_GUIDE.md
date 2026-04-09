# Database Migration Guide

## Overview
This guide will help you safely migrate your database schema to the latest version with proper default values to prevent data loss warnings.

---

## ⚠️ What Changed?

The following schema updates were made to prevent Drizzle data loss warnings:

### Invoices Table
**String Columns (now with defaults):**
- `order_booker` → `.default('')`
- `subject` → `.default('')`
- `reference` → `.default('')`

**Numeric Columns (now NOT NULL with defaults):**
- `gross_amount` → `.notNull().default('0')`
- `discount_percentage` → `.notNull().default('0')`
- `discount_amount` → `.notNull().default('0')`
- `tax_amount` → `.notNull().default('0')`
- `shipping_charges` → `.notNull().default('0')`
- `round_off` → `.notNull().default('0')`
- `net_amount` → `.notNull().default('0')`
- `received_amount` → `.notNull().default('0')`
- `balance_amount` → `.notNull().default('0')`

### Invoice Items Table
**Numeric Columns (now NOT NULL with defaults):**
- `quantity` → `.notNull().default('1')`
- `unit_price` → `.notNull().default('0')`
- `discount_percentage` → `.notNull().default('0')`
- `tax_rate` → `.notNull().default('0')`
- `line_total` → `.notNull().default('0')`

### Journal Entries Table
**String Columns (now with defaults):**
- `reference_type` → `.default('')`
- `description` → `.default('')`

### Journal Entry Lines Table
**Numeric Columns (now NOT NULL with defaults):**
- `debit_amount` → `.notNull().default('0')`
- `credit_amount` → `.notNull().default('0')`

**String Columns (now with defaults):**
- `description` → `.default('')`

---

## 🚀 Migration Options

### Option 1: Push Schema Changes (Recommended for Development)

This will safely add new columns with default values for existing records:

```bash
# 1. Generate the migration
npm run db:generate

# 2. Apply the migration
npm run db:migrate
```

**What this does:**
- Creates new columns with specified defaults
- Existing records get `0` for numeric fields
- Existing records get `''` (empty string) for text fields
- **NO DATA LOSS** - all existing data is preserved

---

### Option 2: Direct Push (Quick Method)

If you prefer to push directly without generating migration files:

```bash
npm run db:push
```

**⚠️ Important:** 
- Drizzle may still warn about data loss for columns that were previously nullable
- Since we added `.default()` values, existing records will be filled automatically
- You can safely proceed by confirming the prompt

---

### Option 3: Clean Slate (For Development/Testing Only)

If you're in development and want a completely fresh start:

```bash
# ⚠️ WARNING: This will DELETE ALL DATA
# Only use this in development/testing environments

# 1. Connect to your database
# For Neon PostgreSQL, use the Neon dashboard or psql

# 2. Drop and recreate all tables
# (Drizzle will recreate them on next push)

# 3. Push the new schema
npm run db:push

# 4. Re-seed your data
# - Chart of Accounts
# - Products
# - Customers
# - etc.
```

**🔴 NEVER use this in production!**

---

## ✅ Verification Steps

After migration, verify everything works:

### 1. Check Schema
```bash
npm run db:studio
```
This opens Drizzle Studio where you can visually inspect the schema.

### 2. Test Invoice Creation
1. Navigate to: Sales > Invoices > New
2. Create a test invoice
3. Verify it saves successfully
4. Check that all numeric fields default to `0` or proper values

### 3. Test Approval Flow
1. Approve the test invoice
2. Verify inventory stock decreases
3. Check that journal entry is created
4. Verify audit log entry

### 4. Check Database
```sql
-- Check invoices table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Check invoice_items table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoice_items'
ORDER BY ordinal_position;
```

---

## 🐛 Troubleshooting

### Issue: "Data loss warning" still appears
**Solution:** 
- Ensure you've run `npm run db:generate` first
- Check that all `.default()` values are in the schema file
- If migrating from very old schema, you may need to manually add columns:

```sql
-- Example manual column addition (if needed)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_booker VARCHAR(255) DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subject VARCHAR(255) DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference VARCHAR(100) DEFAULT '';
```

### Issue: "Column does not exist"
**Solution:**
- Run `npm run db:push` to apply the schema
- Check your database connection in `.env.local`

### Issue: "NOT NULL constraint violation"
**Solution:**
- This shouldn't happen with the new defaults
- If it does, existing records need to be updated:

```sql
-- Update existing records to have proper defaults
UPDATE invoices SET gross_amount = '0' WHERE gross_amount IS NULL;
UPDATE invoices SET net_amount = '0' WHERE net_amount IS NULL;
UPDATE invoices SET order_booker = '' WHERE order_booker IS NULL;
-- ... repeat for other columns
```

---

## 📋 Pre-Migration Checklist

Before running migrations:

- [ ] **Backup your database** (especially in production)
  - For Neon: Use the Neon dashboard to create a branch/backup
  - For local: `pg_dump your_database > backup.sql`
  
- [ ] **Test in development first**
  - Apply to local/dev environment
  - Test all workflows
  - Then apply to production

- [ ] **Notify users** (if production)
  - Schedule maintenance window
  - Inform users of brief downtime

- [ ] **Verify environment variables**
  - Check `DATABASE_URL` in `.env.local` is correct
  - Ensure you have proper database access

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Restore from Backup
```bash
# For PostgreSQL
psql your_database < backup.sql
```

### Option 2: Revert Schema
1. Restore the old schema file from git:
   ```bash
   git checkout HEAD~1 src/db/schema.ts
   ```
2. Re-generate migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

---

## 📞 Support

If you encounter issues:
1. Check the error message carefully
2. Review this guide's troubleshooting section
3. Check Drizzle ORM documentation: https://orm.drizzle.team
4. Review database logs (Neon dashboard provides logs)

---

## 🎯 Post-Migration

After successful migration:

1. **Test the complete invoice workflow:**
   - Create draft invoice
   - Approve invoice
   - Verify stock updates
   - Check journal entries
   - Review audit logs

2. **Verify existing data:**
   - Check that old invoices display correctly
   - Ensure all numeric fields show `0` instead of errors
   - Test filtering and search

3. **Monitor for issues:**
   - Check application logs for errors
   - Monitor database performance
   - Verify no broken functionality

---

**Last Updated:** April 9, 2026  
**Schema Version:** 2.0.0 (ERP Workflow)
