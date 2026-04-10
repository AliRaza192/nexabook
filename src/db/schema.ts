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
import { relations } from 'drizzle-orm';

// Enums
export const planTypeEnum = pgEnum('plan_type', ['free', 'professional', 'enterprise']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'staff', 'accountant']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'pending', 'approved', 'sent', 'paid', 'partial', 'overdue', 'cancelled']);
export const orderStatusEnum = pgEnum('order_status', ['draft', 'pending', 'approved', 'confirmed', 'delivered', 'cancelled']);
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

// Product Categories
export const productCategories = pgTable('product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Products/Services
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  categoryId: uuid('category_id').references(() => productCategories.id),
  type: productTypeEnum('type').notNull().default('product'),
  unit: varchar('unit', { length: 20 }).default('Pcs'), // Pcs, Kg, Ltr, Mtr, Box, etc.
  description: text('description'),
  salePrice: decimal('sale_price', { precision: 12, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  currentStock: integer('current_stock').default(0),
  minStockLevel: integer('min_stock_level').default(0),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Add relations for productCategories
export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
}));

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  ntn: varchar('ntn', { length: 50 }), // National Tax Number
  strn: varchar('strn', { length: 50 }), // Sales Tax Registration Number
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).default('0'),
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
  orderBooker: varchar('order_booker', { length: 255 }).default(''),
  subject: varchar('subject', { length: 255 }).default(''),
  reference: varchar('reference', { length: 100 }).default(''),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date'),
  status: invoiceStatusEnum('status').notNull().default('draft'), // draft, pending, approved, sent, paid, partial, overdue
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCharges: decimal('shipping_charges', { precision: 12, scale: 2 }).notNull().default('0'),
  roundOff: decimal('round_off', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  receivedAmount: decimal('received_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  balanceAmount: decimal('balance_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  cashBankAccountId: uuid('cash_bank_account_id').references(() => chartOfAccounts.id),
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
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Add relations
export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
}));

// Sale Orders
export const saleOrders = pgTable('sale_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  orderBooker: varchar('order_booker', { length: 255 }).default(''),
  subject: varchar('subject', { length: 255 }).default(''),
  reference: varchar('reference', { length: 100 }).default(''),
  orderDate: timestamp('order_date').notNull(),
  deliveryDate: timestamp('delivery_date'),
  status: orderStatusEnum('status').notNull().default('draft'),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCharges: decimal('shipping_charges', { precision: 12, scale: 2 }).notNull().default('0'),
  roundOff: decimal('round_off', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  terms: text('terms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Sale Order Items
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  orderId: uuid('order_id').references(() => saleOrders.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Add relations for saleOrders and orderItems
export const customersRelationsExtended = relations(customers, ({ many }) => ({
  invoices: many(invoices),
  saleOrders: many(saleOrders),
}));

export const saleOrdersRelations = relations(saleOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [saleOrders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(saleOrders, {
    fields: [orderItems.orderId],
    references: [saleOrders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Employees (Enhanced with Pakistan-specific fields)
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  userId: varchar('user_id', { length: 255 }), // Links to profile if user has account
  employeeCode: varchar('employee_code', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  cnic: varchar('cnic', { length: 15 }), // Pakistani CNIC format: 12345-1234567-1
  fatherName: varchar('father_name', { length: 255 }),
  dateOfBirth: timestamp('date_of_birth'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  department: varchar('department', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  joiningDate: timestamp('joining_date').notNull(),
  confirmationDate: timestamp('confirmation_date'),
  bankName: varchar('bank_name', { length: 100 }),
  accountNumber: varchar('account_number', { length: 50 }),
  branchName: varchar('branch_name', { length: 100 }),
  basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }).notNull().default('0'),
  houseRent: decimal('house_rent', { precision: 12, scale: 2 }).default('0'),
  medicalAllowance: decimal('medical_allowance', { precision: 12, scale: 2 }).default('0'),
  conveyanceAllowance: decimal('conveyance_allowance', { precision: 12, scale: 2 }).default('0'),
  otherAllowances: decimal('other_allowances', { precision: 12, scale: 2 }).default('0'),
  eobiDeduction: decimal('eobi_deduction', { precision: 12, scale: 2 }).default('0'), // EOBI deduction
  incomeTaxDeduction: decimal('income_tax_deduction', { precision: 12, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).notNull().default('Active'), // Active, On Leave, Terminated
  exitDate: timestamp('exit_date'),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Attendance
export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('Present'), // Present, Absent, Leave, Late, Half Day
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  workingHours: decimal('working_hours', { precision: 5, scale: 2 }),
  overtime: decimal('overtime', { precision: 5, scale: 2 }).default('0'),
  lateMinutes: integer('late_minutes').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Payroll Runs
export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  title: varchar('title', { length: 100 }).notNull(), // e.g., "January 2026 Payroll"
  totalEmployees: integer('total_employees').default(0),
  totalGross: decimal('total_gross', { precision: 14, scale: 2 }).default('0'),
  totalDeductions: decimal('total_deductions', { precision: 14, scale: 2 }).default('0'),
  totalNet: decimal('total_net', { precision: 14, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).notNull().default('Draft'), // Draft, Processing, Approved, Posted
  journalEntryId: uuid('journal_entry_id'),
  processedBy: varchar('processed_by', { length: 255 }),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Payslips
export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  payrollRunId: uuid('payroll_run_id').references(() => payrollRuns.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  designation: varchar('designation', { length: 100 }),
  department: varchar('department', { length: 100 }),
  cnic: varchar('cnic', { length: 15 }),
  bankName: varchar('bank_name', { length: 100 }),
  accountNumber: varchar('account_number', { length: 50 }),
  // Earnings
  basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }).notNull().default('0'),
  houseRent: decimal('house_rent', { precision: 12, scale: 2 }).default('0'),
  medicalAllowance: decimal('medical_allowance', { precision: 12, scale: 2 }).default('0'),
  conveyanceAllowance: decimal('conveyance_allowance', { precision: 12, scale: 2 }).default('0'),
  otherAllowances: decimal('other_allowances', { precision: 12, scale: 2 }).default('0'),
  overtimePay: decimal('overtime_pay', { precision: 12, scale: 2 }).default('0'),
  bonus: decimal('bonus', { precision: 12, scale: 2 }).default('0'),
  totalEarnings: decimal('total_earnings', { precision: 12, scale: 2 }).notNull().default('0'),
  // Deductions
  eobiDeduction: decimal('eobi_deduction', { precision: 12, scale: 2 }).default('0'),
  incomeTax: decimal('income_tax', { precision: 12, scale: 2 }).default('0'),
  providentFund: decimal('provident_fund', { precision: 12, scale: 2 }).default('0'),
  otherDeductions: decimal('other_deductions', { precision: 12, scale: 2 }).default('0'),
  unpaidLeaveDeduction: decimal('unpaid_leave_deduction', { precision: 12, scale: 2 }).default('0'),
  totalDeductions: decimal('total_deductions', { precision: 12, scale: 2 }).notNull().default('0'),
  // Net
  netSalary: decimal('net_salary', { precision: 12, scale: 2 }).notNull().default('0'),
  // Attendance info
  presentDays: decimal('present_days', { precision: 5, scale: 2 }).default('0'),
  absentDays: decimal('absent_days', { precision: 5, scale: 2 }).default('0'),
  leaveDays: decimal('leave_days', { precision: 5, scale: 2 }).default('0'),
  unpaidLeaveDays: decimal('unpaid_leave_days', { precision: 5, scale: 2 }).default('0'),
  totalWorkingDays: integer('total_working_days').default(26),
  // Payment
  isPaid: boolean('is_paid').notNull().default(false),
  paymentDate: timestamp('payment_date'),
  paymentMethod: varchar('payment_method', { length: 20 }), // Bank Transfer, Cash, Cheque
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

// Journal Entries (General Ledger)
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  entryDate: timestamp('entry_date').notNull().defaultNow(),
  entryNumber: varchar('entry_number', { length: 50 }).notNull(),
  referenceType: varchar('reference_type', { length: 50 }).default(''),
  referenceId: uuid('reference_id'),
  description: text('description').default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Journal Entry Lines
export const journalEntryLines = pgTable('journal_entry_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id).notNull(),
  accountId: uuid('account_id').references(() => chartOfAccounts.id).notNull(),
  description: text('description').default(''),
  debitAmount: decimal('debit_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  creditAmount: decimal('credit_amount', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Export schema
export const schema = {
  organizations,
  profiles,
  chartOfAccounts,
  productCategories,
  products,
  customers,
  invoices,
  invoiceItems,
  saleOrders,
  orderItems,
  employees,
  attendance,
  payrollRuns,
  payslips,
  auditLogs,
  journalEntries,
  journalEntryLines,
};

// TypeScript types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type SaleOrder = typeof saleOrders.$inferSelect;
export type NewSaleOrder = typeof saleOrders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
export type Payslip = typeof payslips.$inferSelect;
export type NewPayslip = typeof payslips.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert;
