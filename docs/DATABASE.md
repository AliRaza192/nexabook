# NexaBook Database Quick Reference

## 🗄️ Database Schema Overview

### Core Tables

#### `organizations`
Multi-tenant root entity - every piece of data belongs to an org
- `id` (UUID, PK)
- `name`, `slug`, `logo`
- `plan_type` (free/professional/enterprise)
- `ntn`, `strn` (Pakistan tax numbers)
- `currency` (default: PKR)
- `fiscal_year_start` (default: July 1)

#### `profiles`
Links Clerk users to organizations
- `id` (UUID, PK)
- `user_id` (Clerk ID, unique)
- `org_id` (FK → organizations)
- `role` (admin/manager/staff/accountant)
- `full_name`, `email`, `phone`

### Business Tables

#### `chart_of_accounts`
Accounting structure for organizations
- `org_id` (FK → organizations)
- `code`, `name`, `type`
- `parent_id` (self-reference for hierarchy)

#### `products`
Inventory items and services
- `org_id` (FK)
- `name`, `sku`, `type` (product/service)
- `unit_price`, `cost_price`
- `stock_quantity`, `reorder_level`

#### `customers`
Customer management
- `org_id` (FK)
- `name`, `email`, `phone`
- `ntn` (tax number)
- `balance`, `credit_limit`

#### `invoices` & `invoice_items`
Sales invoices
- `org_id` (FK)
- `invoice_number`, `customer_id` (FK)
- `issue_date`, `due_date`
- `status` (draft/sent/paid/overdue/cancelled)
- `subtotal`, `tax_amount`, `total_amount`

#### `employees`
HR and payroll data
- `org_id` (FK)
- `employee_code`
- `basic_salary`, `bank_account`
- `cnic` (Pakistani ID)
- `join_date`, `exit_date`

#### `audit_logs`
Security and change tracking
- `org_id`, `user_id`
- `action`, `entity_type`, `entity_id`
- `changes` (JSON), `ip_address`

## 🔧 Common Database Operations

### Setup Database
```bash
# Install dependencies
npm install

# Generate schema (creates SQL files)
npm run db:generate

# Push schema to database (development)
npm run db:push

# Open visual database browser
npm run db:studio
```

### Seed Demo Data
```bash
# Create sample organization and user
npx tsx src/db/seed.ts
```

### Query Examples

#### Get organization by slug
```typescript
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

const org = await db.query.organizations.findFirst({
  where: eq(organizations.slug, 'acme-corp'),
});
```

#### Get all products for an organization
```typescript
import { products } from '@/db/schema';

const orgProducts = await db.query.products.findMany({
  where: eq(products.orgId, orgId),
  orderBy: (products, { desc }) => [desc(products.createdAt)],
});
```

#### Create a new invoice with items
```typescript
import { invoices, invoiceItems } from '@/db/schema';

await db.transaction(async (tx) => {
  const [newInvoice] = await tx
    .insert(invoices)
    .values({
      orgId,
      invoiceNumber: 'INV-2026-001',
      customerId,
      issueDate: new Date(),
      subtotal: '1000.00',
      taxAmount: '160.00',
      totalAmount: '1160.00',
    })
    .returning();

  await tx.insert(invoiceItems).values({
    orgId,
    invoiceId: newInvoice.id,
    description: 'Web Development Services',
    quantity: '10',
    unitPrice: '100.00',
    amount: '1000.00',
  });
});
```

#### Get user profile with organization
```typescript
const profile = await db.query.profiles.findFirst({
  where: eq(profiles.userId, clerkUserId),
  with: {
    organization: true,
  },
});
```

## 📊 Schema Relationships

```
organizations (1)
    ├── (M) profiles
    ├── (M) chart_of_accounts
    ├── (M) products
    ├── (M) customers
    │       └── (M) invoices
    │               └── (M) invoice_items
    ├── (M) employees
    └── (M) audit_logs
```

**Key Principle:** Every table has `org_id` for data isolation. Multi-tenant queries automatically filter by organization.

## 🔐 Best Practices

### 1. Always Filter by Organization
```typescript
// ✅ Good - Org-scoped query
const products = await db.query.products.findMany({
  where: eq(products.orgId, currentOrgId),
});

// ❌ Bad - No org filter (security risk!)
const products = await db.query.products.findMany();
```

### 2. Use Transactions for Related Data
```typescript
await db.transaction(async (tx) => {
  const [invoice] = await tx.insert(invoices).values(...).returning();
  await tx.insert(invoiceItems).values(items.map(item => ({
    ...item,
    invoiceId: invoice.id,
  })));
});
```

### 3. Soft Deletes
Instead of deleting records, mark them as inactive:
```typescript
await db
  .update(products)
  .set({ isActive: false })
  .where(eq(products.id, productId));
```

### 4. Audit Important Changes
```typescript
await db.insert(auditLogs).values({
  orgId,
  userId: clerkUserId,
  action: 'UPDATE',
  entityType: 'invoice',
  entityId: invoiceId,
  changes: JSON.stringify({ before, after }),
  ipAddress: request.ip,
});
```

## 🚀 Migration Workflow

### Development
```bash
# 1. Modify schema.ts
# 2. Push changes directly
npm run db:push
```

### Production
```bash
# 1. Modify schema.ts
# 2. Generate migration files
npm run db:generate

# 3. Review generated SQL in /drizzle folder

# 4. Run migration
npm run db:migrate
```

## 🔍 Drizzle Studio

Open the visual database browser:
```bash
npm run db:studio
```

Features:
- View all tables
- Filter and sort data
- Edit records directly
- Run raw SQL queries
- Export data

## 📝 Type Safety

Drizzle provides full TypeScript types:

```typescript
import type { 
  Organization, 
  NewOrganization,
  Profile,
  NewProfile,
  Invoice,
  NewInvoice,
} from '@/db/schema';

// Select type (from database)
const org: Organization = await db.query.organizations.findFirst();

// Insert type (for creating records)
const newOrg: NewOrganization = {
  name: 'Acme Corp',
  slug: 'acme-corp',
};
```

## 🆘 Troubleshooting

### "DATABASE_URL is not defined"
- Check `.env.local` exists and has correct value
- Restart dev server after adding env vars

### "Relation does not exist"
- Run `npm run db:push` to sync schema

### Type errors in queries
- Ensure you're using correct types
- Check imports from `@/db/schema`

### Connection timeout
- Verify Neon connection string
- Check SSL mode is enabled
- Ensure IP is whitelisted in Neon (if needed)

---

**Quick Links:**
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Neon Docs](https://neon.tech/docs/introduction)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
