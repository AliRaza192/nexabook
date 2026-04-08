import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums
export const planTypeEnum = pgEnum('plan_type', ['free', 'professional', 'enterprise']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'staff', 'accountant']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export const productTypeEnum = pgEnum('product_type', ['product', 'service']);

// Organizations Table (Multi-Tenant Root)
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logo: text('logo'),
  planType: planTypeEnum('plan_type').notNull().default('free'),
  ntn: varchar('ntn', { length: 50 }), // National Tax Number (Pakistan)
  strn: varchar('strn', { length: 50 }), // Sales Tax Registration Number
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }).default('Pakistan'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  fiscalYearStart: varchar('fiscal_year_start', { length: 5 }).default('07-01'), // July 1st (Pakistan fiscal year)
  currency: varchar('currency', { length: 10 }).default('PKR'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Profiles Table (Links Clerk Users to Organizations)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(), // Clerk user ID
  orgId: uuid('org_id').references(() => organizations.id),
  role: userRoleEnum('role').notNull().default('staff'),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatar: text('avatar'),
  department: varchar('department', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chart of Accounts
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // asset, liability, equity, income, expense
  parentId: uuid('parent_id'), // Self-reference, will be resolved later
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Add self-reference relation
export const chartOfAccountsRelations = {
  parent: chartOfAccounts.parentId ? undefined : null, // Placeholder for self-reference
};

// Products/Services
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  type: productTypeEnum('type').notNull().default('product'),
  description: text('description'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  stockQuantity: integer('stock_quantity').default(0),
  reorderLevel: integer('reorder_level').default(0),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  ntn: varchar('ntn', { length: 50 }),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0'),
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date'),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  terms: text('terms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoice Line Items
export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

// Employees
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  userId: varchar('user_id', { length: 255 }), // Links to profile if user has account
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  department: varchar('department', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  bankName: varchar('bank_name', { length: 100 }),
  cnic: varchar('cnic', { length: 15 }), // Pakistani CNIC format
  joinDate: timestamp('join_date').notNull(),
  exitDate: timestamp('exit_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  changes: text('changes'), // JSON string of changes
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Export schema
export const schema = {
  organizations,
  profiles,
  chartOfAccounts,
  products,
  customers,
  invoices,
  invoiceItems,
  employees,
  auditLogs,
};

// TypeScript types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
