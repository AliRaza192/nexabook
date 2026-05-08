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
export const jobOrderStatusEnum = pgEnum('job_order_status', ['draft', 'in-progress', 'completed', 'cancelled']);
export const bomStatusEnum = pgEnum('bom_status', ['draft', 'active', 'archived']);
// CRM Enums
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'resolved', 'closed', 'reopened']);
// Sales Enums
export const quotationStatusEnum = pgEnum('quotation_status', ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'dispatched', 'in_transit', 'delivered', 'returned', 'cancelled']);
export const recurringIntervalEnum = pgEnum('recurring_interval', ['weekly', 'monthly', 'quarterly', 'yearly']);
// Returns & Purchases Enums
export const returnReasonEnum = pgEnum('return_reason', ['defective', 'wrong_item', 'not_as_described', 'customer_request', 'damaged_in_transit', 'other']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'bank_transfer', 'cheque', 'online', 'credit_card', 'other']);
export const settlementStatusEnum = pgEnum('settlement_status', ['pending', 'partial', 'settled', 'cancelled']);
// Banking & Advanced Accounts Enums
export const depositTypeEnum = pgEnum('deposit_type', ['cash', 'cheque']);
export const transferTypeEnum = pgEnum('transfer_type', ['bank_to_bank', 'cash_to_bank', 'bank_to_cash']);
export const creditDebitNoteTypeEnum = pgEnum('credit_debit_note_type', ['credit_note', 'debit_note']);
export const pdcStatusEnum = pgEnum('pdc_status', ['received', 'deposited', 'cleared', 'bounced']);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['in', 'out']);
export const stockMovementReasonEnum = pgEnum('stock_movement_reason', ['sale', 'purchase', 'return', 'transfer', 'adjustment', 'grn', 'delivery']);
export const stockAdjustmentReasonEnum = pgEnum('stock_adjustment_reason', ['damage', 'gift', 'correction', 'expired', 'lost', 'found', 'sample']);
export const valuationMethodEnum = pgEnum('valuation_method', ['fifo', 'weighted_average']);
export const miscContactTypeEnum = pgEnum('misc_contact_type', ['capital_investment', 'loan_proceeds', 'loan_repayment', 'owner_withdrawal', 'dividend', 'other']);
export const approvalStatusEnum = pgEnum('approval_status', ['draft', 'pending_approval', 'approved', 'rejected']);

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

  // Document Numbering Settings
  invoicePrefix: varchar('invoice_prefix', { length: 10 }).notNull().default('INV'),
  orderPrefix: varchar('order_prefix', { length: 10 }).notNull().default('SO'),
  quotationPrefix: varchar('quotation_prefix', { length: 10 }).notNull().default('QT'),
  purchasePrefix: varchar('purchase_prefix', { length: 10 }).notNull().default('PO'),
  billPrefix: varchar('bill_prefix', { length: 10 }).notNull().default('PI'),
  grnPrefix: varchar('grn_prefix', { length: 10 }).notNull().default('GRN'),
  numberingPadding: integer('numbering_padding').notNull().default(5),
  numberingIncludeYear: boolean('numbering_include_year').notNull().default(true),
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
  subType: varchar('sub_type', { length: 50 }),
  // accounts_receivable | accounts_payable | cash | bank |
  // sales_revenue | service_revenue | tax_payable | 
  // cogs | salary_expense | retained_earnings | capital
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull().default('0'),
  isSystemAccount: boolean('is_system_account').notNull().default(false),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Proper relations (broken placeholder hata diya)
export const chartOfAccountsRelations = relations(chartOfAccounts, ({ many }) => ({
  journalLines: many(journalEntryLines),
}));

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

// Units of Measure (UOM)
export const uoms = pgTable('uoms', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(), // e.g., Kg, Pcs, Box
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Warehouses
export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  location: text('location'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Warehouse Stock
export const warehouseStock = pgTable('warehouse_stock', {
  id: uuid('id').primaryKey().defaultRandom(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Product Batches
export const productBatches = pgTable('product_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  batchNo: varchar('batch_no', { length: 100 }).notNull(),
  expiryDate: timestamp('expiry_date'),
  manufacturingDate: timestamp('manufacturing_date'),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  initialQty: decimal('initial_qty', { precision: 12, scale: 2 }).notNull().default('0'),
  currentQty: decimal('current_qty', { precision: 12, scale: 2 }).notNull().default('0'),
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
  unit: varchar('unit', { length: 20 }).default('Pcs'), // Deprecated: use baseUomId
  baseUomId: uuid('base_uom_id').references(() => uoms.id),
  saleUomId: uuid('sale_uom_id').references(() => uoms.id),
  description: text('description'),
  isBatchTracked: boolean('is_batch_tracked').notNull().default(false),
  salePrice: decimal('sale_price', { precision: 12, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
  currentStock: decimal('current_stock', { precision: 12, scale: 2 }).default('0'),
  minStockLevel: decimal('min_stock_level', { precision: 12, scale: 2 }).default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// UOM Conversions
export const uomConversions = pgTable('uom_conversions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  fromUomId: uuid('from_uom_id').references(() => uoms.id).notNull(),
  toUomId: uuid('to_uom_id').references(() => uoms.id).notNull(),
  conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).notNull(), // 1 fromUom = conversionFactor * toUom
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stock Transfers
export const stockTransfers = pgTable('stock_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  fromWarehouseId: uuid('from_warehouse_id').references(() => warehouses.id).notNull(),
  toWarehouseId: uuid('to_warehouse_id').references(() => warehouses.id).notNull(),
  transferDate: timestamp('transfer_date').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('Draft'), // Draft, Completed, Cancelled
  referenceNo: varchar('reference_no', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stock Transfer Items
export const stockTransferItems = pgTable('stock_transfer_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferId: uuid('transfer_id').references(() => stockTransfers.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  uomId: uuid('uom_id').references(() => uoms.id),
  batchId: uuid('batch_id').references(() => productBatches.id),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull().default('0'),
});

export const productBatchesRelations = relations(productBatches, ({ one }) => ({
  product: one(products, {
    fields: [productBatches.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [productBatches.warehouseId],
    references: [warehouses.id],
  }),
}));

export const uomsRelations = relations(uoms, ({ many }) => ({
  productsBase: many(products, { relationName: 'baseUom' }),
  productsSale: many(products, { relationName: 'saleUom' }),
  conversionsFrom: many(uomConversions, { relationName: 'fromUom' }),
  conversionsTo: many(uomConversions, { relationName: 'toUom' }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  baseUom: one(uoms, {
    fields: [products.baseUomId],
    references: [uoms.id],
    relationName: 'baseUom',
  }),
  saleUom: one(uoms, {
    fields: [products.saleUomId],
    references: [uoms.id],
    relationName: 'saleUom',
  }),
  conversions: many(uomConversions),
  batches: many(productBatches),
}));

export const uomConversionsRelations = relations(uomConversions, ({ one }) => ({
  product: one(products, {
    fields: [uomConversions.productId],
    references: [products.id],
  }),
  fromUom: one(uoms, {
    fields: [uomConversions.fromUomId],
    references: [uoms.id],
    relationName: 'fromUom',
  }),
  toUom: one(uoms, {
    fields: [uomConversions.toUomId],
    references: [uoms.id],
    relationName: 'toUom',
  }),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  stock: many(warehouseStock),
  transfersFrom: many(stockTransfers, { relationName: 'fromWarehouse' }),
  transfersTo: many(stockTransfers, { relationName: 'toWarehouse' }),
}));

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseStock.warehouseId],
    references: [warehouses.id],
  }),
  product: one(products, {
    fields: [warehouseStock.productId],
    references: [products.id],
  }),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
  fromWarehouse: one(warehouses, {
    fields: [stockTransfers.fromWarehouseId],
    references: [warehouses.id],
    relationName: 'fromWarehouse',
  }),
  toWarehouse: one(warehouses, {
    fields: [stockTransfers.toWarehouseId],
    references: [warehouses.id],
    relationName: 'toWarehouse',
  }),
  items: many(stockTransferItems),
}));

export const stockTransferItemsRelations = relations(stockTransferItems, ({ one }) => ({
  transfer: one(stockTransfers, {
    fields: [stockTransferItems.transferId],
    references: [stockTransfers.id],
  }),
  product: one(products, {
    fields: [stockTransferItems.productId],
    references: [products.id],
  }),
  uom: one(uoms, {
    fields: [stockTransferItems.uomId],
    references: [uoms.id],
  }),
  batch: one(productBatches, {
    fields: [stockTransferItems.batchId],
    references: [productBatches.id],
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

// Sale Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  orderBooker: varchar('order_booker', { length: 100 }),

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
  emailSentAt: timestamp('email_sent_at'),
  isPosted: boolean('is_posted').notNull().default(false),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoice Line Items
export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  uomId: uuid('uom_id').references(() => uoms.id),
  batchId: uuid('batch_id').references(() => productBatches.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});


export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  warehouse: one(warehouses, {
    fields: [invoices.warehouseId],
    references: [warehouses.id],
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
  uom: one(uoms, {
    fields: [invoiceItems.uomId],
    references: [uoms.id],
  }),
  batch: one(productBatches, {
    fields: [invoiceItems.batchId],
    references: [productBatches.id],
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
export const customersRelations = relations(customers, ({ many }) => ({
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
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // draft | posted | reversed
  sourceType: varchar('source_type', { length: 30 }).default(''),
  // invoice | payment | purchase | payroll | manual | expense
  createdBy: varchar('created_by', { length: 255 }),
  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// TAX RATES TABLE
// ==========================================
export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  // "GST 17%", "SRB 16%", "PRA 16%", "WHT 5%"
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
  taxType: varchar('tax_type', { length: 20 }).notNull().default('GST'),
  // GST | SRB | WHT | PRA | KPRA | FED
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  organization: one(organizations, {
    fields: [taxRates.orgId],
    references: [organizations.id],
  }),
}));

export type TaxRate = typeof taxRates.$inferSelect;
export type NewTaxRate = typeof taxRates.$inferInsert;

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

// Vendors (Suppliers)
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  ntn: varchar('ntn', { length: 50 }),
  strn: varchar('strn', { length: 50 }),
  address: text('address'),
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).default('0'),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Purchase Invoices
export const purchaseInvoices = pgTable('purchase_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  billNumber: varchar('bill_number', { length: 50 }).notNull(),
  date: timestamp('date').notNull(),
  dueDate: timestamp('due_date'),
  reference: varchar('reference', { length: 100 }).default(''),
  subject: varchar('subject', { length: 255 }).default(''),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountTotal: decimal('discount_total', { precision: 12, scale: 2 }).notNull().default('0'),
  taxTotal: decimal('tax_total', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('Draft'), // Draft, Approved, Revised
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Purchase Invoice Items
export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  purchaseInvoiceId: uuid('purchase_invoice_id').references(() => purchaseInvoices.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  uomId: uuid('uom_id').references(() => uoms.id),
  batchId: uuid('batch_id').references(() => productBatches.id),
  batchNo: varchar('batch_no', { length: 100 }),
  expiryDate: timestamp('expiry_date'),
  manufacturingDate: timestamp('manufacturing_date'),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Expenses
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  accountId: uuid('account_id').references(() => chartOfAccounts.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  date: timestamp('date').notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  description: text('description'),
  paidFromAccountId: uuid('paid_from_account_id').references(() => chartOfAccounts.id).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Manufacturing: Bill of Materials (BOM)
export const manufacturingBoms = pgTable('manufacturing_boms', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  finishedGoodId: uuid('finished_good_id').references(() => products.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  totalEstimatedCost: decimal('total_estimated_cost', { precision: 12, scale: 2 }).default('0'),
  instructions: text('instructions'),
  status: bomStatusEnum('status').notNull().default('draft'),
  isSubAssembly: boolean('is_sub_assembly').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Manufacturing: BOM Items (Components)
export const bomItems = pgTable('bom_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  bomId: uuid('bom_id').references(() => manufacturingBoms.id).notNull(),
  componentId: uuid('component_id').references(() => products.id).notNull(),
  quantityRequired: decimal('quantity_required', { precision: 10, scale: 2 }).notNull().default('1'),
  unit: varchar('unit', { length: 20 }).default('Pcs'),
});

// Manufacturing: Job Orders
export const jobOrders = pgTable('job_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  bomId: uuid('bom_id').references(() => manufacturingBoms.id).notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  quantityToProduce: integer('quantity_to_produce').notNull().default(1),
  status: jobOrderStatusEnum('status').notNull().default('draft'),
  completionDate: timestamp('completion_date'),
  instructions: text('instructions'),
  scrapQuantity: decimal('scrap_quantity', { precision: 12, scale: 2 }).default('0'),
  scrapAccountId: uuid('scrap_account_id').references(() => chartOfAccounts.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Manufacturing: Job Order Components (Material consumption tracking)
export const jobOrderComponents = pgTable('job_order_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  jobOrderId: uuid('job_order_id').references(() => jobOrders.id).notNull(),
  componentId: uuid('component_id').references(() => products.id).notNull(),
  requiredQty: decimal('required_qty', { precision: 10, scale: 2 }).notNull(),
  consumedQty: decimal('consumed_qty', { precision: 10, scale: 2 }).default('0'),
});

// Vendor and Purchase Relations (must be after all tables are defined)
export const vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseInvoices: many(purchaseInvoices),
}));

export const purchaseInvoicesRelations = relations(purchaseInvoices, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [purchaseInvoices.vendorId],
    references: [vendors.id],
  }),
  warehouse: one(warehouses, {
    fields: [purchaseInvoices.warehouseId],
    references: [warehouses.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchaseInvoice: one(purchaseInvoices, {
    fields: [purchaseItems.purchaseInvoiceId],
    references: [purchaseInvoices.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
  uom: one(uoms, {
    fields: [purchaseItems.uomId],
    references: [uoms.id],
  }),
  batch: one(productBatches, {
    fields: [purchaseItems.batchId],
    references: [productBatches.id],
  }),
}));

// ==========================================
// CRM MODULE TABLES
// ==========================================

// CRM Leads
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  company: varchar('company', { length: 255 }),
  designation: varchar('designation', { length: 100 }),
  source: varchar('source', { length: 100 }), // Website, Referral, Social, Advertisement, etc.
  status: leadStatusEnum('status').notNull().default('new'),
  estimatedValue: decimal('estimated_value', { precision: 12, scale: 2 }).default('0'),
  assignedTo: varchar('assigned_to', { length: 255 }), // User ID
  notes: text('notes'),
  convertedToCustomerId: uuid('converted_to_customer_id').references(() => customers.id),
  isConverted: boolean('is_converted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// CRM Tickets (Support)
export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  leadId: uuid('lead_id').references(() => leads.id),
  ticketNumber: varchar('ticket_number', { length: 50 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description').notNull(),
  priority: ticketPriorityEnum('priority').notNull().default('medium'),
  status: ticketStatusEnum('status').notNull().default('open'),
  assignedTo: varchar('assigned_to', { length: 255 }),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// CRM Events (Meetings/Calls)
export const crmEvents = pgTable('crm_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  leadId: uuid('lead_id').references(() => leads.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 50 }).notNull(), // Meeting, Call, Email, Task, Note
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').default(30), // in minutes
  status: varchar('status', { length: 20 }).notNull().default('scheduled'), // Scheduled, Completed, Cancelled, No Show
  location: varchar('location', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// CRM Calls Log
export const crmCalls = pgTable('crm_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  leadId: uuid('lead_id').references(() => leads.id),
  callType: varchar('call_type', { length: 50 }).notNull(), // Incoming, Outgoing, Missed
  subject: varchar('subject', { length: 255 }).notNull(),
  duration: integer('duration').default(0), // in seconds
  summary: text('summary'),
  outcome: varchar('outcome', { length: 100 }), // Connected, Voicemail, No Answer, Busy, etc.
  followUpDate: timestamp('follow_up_date'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// SALES MODULE ADDITIONAL TABLES
// ==========================================

// Quotations
export const quotations = pgTable('quotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  quotationNumber: varchar('quotation_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  subject: varchar('subject', { length: 255 }).default(''),
  reference: varchar('reference', { length: 100 }).default(''),
  issueDate: timestamp('issue_date').notNull(),
  expiryDate: timestamp('expiry_date'),
  status: quotationStatusEnum('status').notNull().default('draft'),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCharges: decimal('shipping_charges', { precision: 12, scale: 2 }).notNull().default('0'),
  roundOff: decimal('round_off', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  terms: text('terms'),
  convertedToInvoiceId: uuid('converted_to_invoice_id').references(() => invoices.id),
  isConverted: boolean('is_converted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quotation Items
export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  quotationId: uuid('quotation_id').references(() => quotations.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Delivery Notes
export const deliveryNotes = pgTable('delivery_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deliveryNumber: varchar('delivery_number', { length: 50 }).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  orderId: uuid('order_id').references(() => saleOrders.id),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  deliveryDate: timestamp('delivery_date').notNull(),
  status: deliveryStatusEnum('status').notNull().default('pending'),
  shippedVia: varchar('shipped_via', { length: 100 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  deliveredBy: varchar('delivered_by', { length: 255 }),
  deliveryAddress: text('delivery_address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Delivery Note Items
export const deliveryNoteItems = pgTable('delivery_note_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  deliveryNoteId: uuid('delivery_note_id').references(() => deliveryNotes.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  orderedQty: decimal('ordered_qty', { precision: 10, scale: 2 }).notNull(),
  deliveredQty: decimal('delivered_qty', { precision: 10, scale: 2 }).notNull(),
});

// Recurring Invoices
export const recurringInvoices = pgTable('recurring_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  interval: recurringIntervalEnum('interval').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  nextInvoiceDate: timestamp('next_invoice_date'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // Active, Paused, Completed, Cancelled
  lastGeneratedInvoiceId: uuid('last_generated_invoice_id').references(() => invoices.id),
  // Invoice template fields
  subject: varchar('subject', { length: 255 }).default(''),
  notes: text('notes'),
  terms: text('terms'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCharges: decimal('shipping_charges', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Recurring Invoice Items
export const recurringInvoiceItems = pgTable('recurring_invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  recurringInvoiceId: uuid('recurring_invoice_id').references(() => recurringInvoices.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Sales Returns
export const salesReturns = pgTable('sales_returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  returnNumber: varchar('return_number', { length: 50 }).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  returnDate: timestamp('return_date').notNull(),
  reason: returnReasonEnum('reason').notNull(),
  reasonDetails: text('reason_details'),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  refundAmount: decimal('refund_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // Pending, Approved, Refunded, Cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Sales Return Items
export const salesReturnItems = pgTable('sales_return_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  salesReturnId: uuid('sales_return_id').references(() => salesReturns.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
});

// ==========================================
// PURCHASES MODULE ADDITIONAL TABLES
// ==========================================

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  orderDate: timestamp('order_date').notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  reference: varchar('reference', { length: 100 }).default(''),
  subject: varchar('subject', { length: 255 }).default(''),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  shippingCharges: decimal('shipping_charges', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: orderStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  terms: text('terms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull().default('0'),
});

// Good Receiving Notes (GRN)
export const goodReceivingNotes = pgTable('good_receiving_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  grnNumber: varchar('grn_number', { length: 50 }).notNull(),
  purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrders.id),
  purchaseInvoiceId: uuid('purchase_invoice_id').references(() => purchaseInvoices.id),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  receivingDate: timestamp('receiving_date').notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  status: varchar('status', { length: 20 }).notNull().default('received'), // Received, Inspected, Accepted, Rejected
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// GRN Items
export const grnItems = pgTable('grn_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  grnId: uuid('grn_id').references(() => goodReceivingNotes.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  orderedQty: decimal('ordered_qty', { precision: 10, scale: 2 }).notNull(),
  receivedQty: decimal('received_qty', { precision: 10, scale: 2 }).notNull(),
  acceptedQty: decimal('accepted_qty', { precision: 10, scale: 2 }).notNull(),
  rejectedQty: decimal('rejected_qty', { precision: 10, scale: 2 }).default('0'),
});

// Purchase Returns
export const purchaseReturns = pgTable('purchase_returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  returnNumber: varchar('return_number', { length: 50 }).notNull(),
  purchaseInvoiceId: uuid('purchase_invoice_id').references(() => purchaseInvoices.id),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  returnDate: timestamp('return_date').notNull(),
  reason: returnReasonEnum('reason').notNull(),
  reasonDetails: text('reason_details'),
  grossAmount: decimal('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  refundAmount: decimal('refund_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Purchase Return Items
export const purchaseReturnItems = pgTable('purchase_return_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  purchaseReturnId: uuid('purchase_return_id').references(() => purchaseReturns.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
});

// ==========================================
// PAYMENTS & SETTLEMENT TABLES
// ==========================================

// Customer Payments (Receive Payments)
export const customerPayments = pgTable('customer_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  notes: text('notes'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Payment Allocations (Settlement)
export const customerPaymentAllocations = pgTable('customer_payment_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  customerPaymentId: uuid('customer_payment_id').references(() => customerPayments.id).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  allocatedAmount: decimal('allocated_amount', { precision: 12, scale: 2 }).notNull(),
});

// Vendor Payments
export const vendorPayments = pgTable('vendor_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull(),
  vendorId: uuid('vendor_id').references(() => vendors.id).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Vendor Payment Allocations (Settlement)
export const vendorPaymentAllocations = pgTable('vendor_payment_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  vendorPaymentId: uuid('vendor_payment_id').references(() => vendorPayments.id).notNull(),
  purchaseInvoiceId: uuid('purchase_invoice_id').references(() => purchaseInvoices.id).notNull(),
  allocatedAmount: decimal('allocated_amount', { precision: 12, scale: 2 }).notNull(),
});

// Settlements (Generic for both customer and vendor)
export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  settlementNumber: varchar('settlement_number', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 20 }).notNull(), // customer, vendor
  entityId: uuid('entity_id').notNull(), // customerId or vendorId
  settlementDate: timestamp('settlement_date').notNull(),
  totalOutstanding: decimal('total_outstanding', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull(),
  adjustedAmount: decimal('adjusted_amount', { precision: 12, scale: 2 }).default('0'),
  status: settlementStatusEnum('status').notNull().default('pending'),
  paymentMethod: paymentMethodEnum('payment_method'),
  reference: varchar('reference', { length: 100 }).default(''),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Settlement Lines
export const settlementLines = pgTable('settlement_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  settlementId: uuid('settlement_id').references(() => settlements.id).notNull(),
  documentType: varchar('document_type', { length: 20 }).notNull(), // invoice, credit_note, debit_note
  documentId: uuid('document_id').notNull(),
  originalAmount: decimal('original_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0'),
  adjustedAmount: decimal('adjusted_amount', { precision: 12, scale: 2 }).default('0'),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0'),
  balanceAmount: decimal('balance_amount', { precision: 12, scale: 2 }).notNull(),
});

// ==========================================
// BANKING & FUND MANAGEMENT TABLES
// ==========================================

// Bank Accounts
export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  iban: varchar('iban', { length: 50 }),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  branchName: varchar('branch_name', { length: 150 }),
  bankName: varchar('bank_name', { length: 150 }),
  accountType: varchar('account_type', { length: 30 }).notNull().default('checking'), // checking, savings, cash
  openingBalance: decimal('opening_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  currentBalance: decimal('current_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  currency: varchar('currency', { length: 10 }).default('PKR'),
  isActive: boolean('is_active').notNull().default(true),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('approved'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Bank Deposits
export const bankDeposits = pgTable('bank_deposits', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  depositNumber: varchar('deposit_number', { length: 50 }).notNull(),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id).notNull(),
  depositType: depositTypeEnum('deposit_type').notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  depositDate: timestamp('deposit_date').notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  chequeNumber: varchar('cheque_number', { length: 50 }),
  chequeDate: timestamp('cheque_date'),
  drawnFrom: varchar('drawn_from', { length: 255 }),
  notes: text('notes'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending_approval'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Funds Transfers
export const fundsTransfers = pgTable('funds_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  transferNumber: varchar('transfer_number', { length: 50 }).notNull(),
  transferType: transferTypeEnum('transfer_type').notNull(),
  fromBankAccountId: uuid('from_bank_account_id').references(() => bankAccounts.id).notNull(),
  toBankAccountId: uuid('to_bank_account_id').references(() => bankAccounts.id).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  transferDate: timestamp('transfer_date').notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  notes: text('notes'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending_approval'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Other Collections & Payments (Misc Contacts)
export const miscContacts = pgTable('misc_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  referenceNumber: varchar('reference_number', { length: 50 }).notNull(),
  contactType: miscContactTypeEnum('contact_type').notNull(),
  partyName: varchar('party_name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  transactionDate: timestamp('transaction_date').notNull(),
  reference: varchar('reference', { length: 100 }).default(''),
  description: text('description'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending_approval'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// FIXED ASSETS TABLES
// ==========================================

// Fixed Assets Register
export const fixedAssets = pgTable('fixed_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // Machinery, Vehicle, Building, etc.
  purchaseDate: timestamp('purchase_date').notNull(),
  purchaseCost: decimal('purchase_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  usefulLifeYears: integer('useful_life_years').notNull(),
  salvageValue: decimal('salvage_value', { precision: 14, scale: 2 }).notNull().default('0'),
  depreciationMethod: varchar('depreciation_method', { length: 50 }).notNull().default('straight_line'), // straight_line, declining_balance
  accumulatedDepreciation: decimal('accumulated_depreciation', { precision: 14, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 30 }).notNull().default('active'), // active, fully_depreciated, disposed, sold
  disposalDate: timestamp('disposal_date'),
  disposalProceeds: decimal('disposal_proceeds', { precision: 14, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Depreciation Logs (Monthly depreciation tracking)
export const depreciationLogs = pgTable('depreciation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  assetId: uuid('asset_id').references(() => fixedAssets.id).notNull(),
  depreciationDate: timestamp('depreciation_date').notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  bookValueAfter: decimal('book_value_after', { precision: 14, scale: 2 }).notNull(),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  isPosted: boolean('is_posted').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations for Fixed Assets
export const fixedAssetsRelations = relations(fixedAssets, ({ many }) => ({
  depreciationLogs: many(depreciationLogs),
}));

// Relations for Depreciation Logs
export const depreciationLogsRelations = relations(depreciationLogs, ({ one }) => ({
  asset: one(fixedAssets, {
    fields: [depreciationLogs.assetId],
    references: [fixedAssets.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [depreciationLogs.journalEntryId],
    references: [journalEntries.id],
  }),
}));

// ==========================================
// LEAVE MANAGEMENT TABLES
// ==========================================

// Leave Types
export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // Annual, Sick, Casual, Unpaid
  daysAllowed: integer('days_allowed').notNull().default(0), // Annual: 14, Sick: 7, etc.
  isPaid: boolean('is_paid').notNull().default(true),
  carryForward: boolean('carry_forward').notNull().default(false),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Leave Applications
export const leaveApplications = pgTable('leave_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  leaveTypeId: uuid('leave_type_id').references(() => leaveTypes.id).notNull(),
  fromDate: timestamp('from_date').notNull(),
  toDate: timestamp('to_date').notNull(),
  totalDays: integer('total_days').notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending, approved, rejected
  appliedBy: varchar('applied_by', { length: 255 }),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations for Leave Types
export const leaveTypesRelations = relations(leaveTypes, ({ many }) => ({
  applications: many(leaveApplications),
}));

// Relations for Leave Applications
export const leaveApplicationsRelations = relations(leaveApplications, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveApplications.employeeId],
    references: [employees.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveApplications.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));

// ==========================================
// PHYSICAL STOCK COUNT (STOCKTAKE) TABLES
// ==========================================

// Stock Counts (Header)
export const stockCounts = pgTable('stock_counts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  countNumber: varchar('count_number', { length: 50 }).notNull(),
  countDate: timestamp('count_date').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('draft'), // draft, completed
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 255 }),
  completedAt: timestamp('completed_at'),
  completedBy: varchar('completed_by', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stock Count Items (Lines)
export const stockCountItems = pgTable('stock_count_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  stockCountId: uuid('stock_count_id').references(() => stockCounts.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  systemQty: decimal('system_qty', { precision: 14, scale: 2 }).notNull().default('0'),
  countedQty: decimal('counted_qty', { precision: 14, scale: 2 }),
  variance: decimal('variance', { precision: 14, scale: 2 }),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).default('0'),
  varianceValue: decimal('variance_value', { precision: 14, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations for Stock Counts
export const stockCountsRelations = relations(stockCounts, ({ many }) => ({
  items: many(stockCountItems),
}));

// Relations for Stock Count Items
export const stockCountItemsRelations = relations(stockCountItems, ({ one }) => ({
  stockCount: one(stockCounts, {
    fields: [stockCountItems.stockCountId],
    references: [stockCounts.id],
  }),
  product: one(products, {
    fields: [stockCountItems.productId],
    references: [products.id],
  }),
}));

// ==========================================
// CREDIT & DEBIT NOTES TABLES
// ==========================================

// Credit & Debit Notes
export const creditDebitNotes = pgTable('credit_debit_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  noteNumber: varchar('note_number', { length: 50 }).notNull(),
  noteType: creditDebitNoteTypeEnum('note_type').notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  purchaseInvoiceId: uuid('purchase_invoice_id').references(() => purchaseInvoices.id),
  salesReturnId: uuid('sales_return_id').references(() => salesReturns.id),
  purchaseReturnId: uuid('purchase_return_id').references(() => purchaseReturns.id),
  issueDate: timestamp('issue_date').notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: decimal('net_amount', { precision: 14, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 255 }),
  notes: text('notes'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending_approval'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Credit/Debit Note Line Items
export const creditDebitNoteLines = pgTable('credit_debit_note_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  creditDebitNoteId: uuid('credit_debit_note_id').references(() => creditDebitNotes.id).notNull(),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
});

// ==========================================
// PDC INSTRUMENTS TABLES
// ==========================================

// Post-Dated Cheques (PDC) Instruments
export const pdcInstruments = pgTable('pdc_instruments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  instrumentNumber: varchar('instrument_number', { length: 50 }).notNull(),
  instrumentType: varchar('instrument_type', { length: 30 }).notNull().default('cheque'), // cheque, dd, other
  partyType: varchar('party_type', { length: 20 }).notNull(), // customer, vendor
  customerId: uuid('customer_id').references(() => customers.id),
  vendorId: uuid('vendor_id').references(() => vendors.id),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  issueDate: timestamp('issue_date').notNull(),
  chequeDate: timestamp('cheque_date').notNull(),
  bankName: varchar('bank_name', { length: 150 }),
  branchName: varchar('branch_name', { length: 150 }),
  status: pdcStatusEnum('status').notNull().default('received'),
  depositedDate: timestamp('deposited_date'),
  clearedDate: timestamp('cleared_date'),
  bounceReason: text('bounce_reason'),
  reference: varchar('reference', { length: 100 }).default(''),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// OTHER CONTACT SETTLEMENT TABLES
// ==========================================

// Misc Contact Settlements
export const miscContactSettlements = pgTable('misc_contact_settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  settlementNumber: varchar('settlement_number', { length: 50 }).notNull(),
  partyName: varchar('party_name', { length: 255 }).notNull(),
  contactType: miscContactTypeEnum('contact_type').notNull(),
  settlementDate: timestamp('settlement_date').notNull(),
  totalOutstanding: decimal('total_outstanding', { precision: 14, scale: 2 }).notNull(),
  settledAmount: decimal('settled_amount', { precision: 14, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 14, scale: 2 }).default('0'),
  paymentMethod: paymentMethodEnum('payment_method'),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id),
  reference: varchar('reference', { length: 100 }).default(''),
  notes: text('notes'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending_approval'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// INVENTORY DEPTH TABLES
// ==========================================

// Stock Movements Ledger
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  movementType: stockMovementTypeEnum('movement_type').notNull(),
  reason: stockMovementReasonEnum('reason'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).default('0'),
  totalValue: decimal('total_value', { precision: 14, scale: 2 }).default('0'),
  referenceType: varchar('reference_type', { length: 50 }), // sale, purchase, grn, return, adjustment
  referenceId: uuid('reference_id'),
  referenceNumber: varchar('reference_number', { length: 50 }),
  runningBalance: decimal('running_balance', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Stock Adjustments
export const stockAdjustments = pgTable('stock_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  adjustmentNumber: varchar('adjustment_number', { length: 50 }).notNull(),
  adjustmentDate: timestamp('adjustment_date').notNull(),
  reason: stockAdjustmentReasonEnum('reason').notNull(),
  notes: text('notes'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending_approval'),
  approvedBy: varchar('approved_by', { length: 255 }),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stock Adjustment Lines
export const stockAdjustmentLines = pgTable('stock_adjustment_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  stockAdjustmentId: uuid('stock_adjustment_id').references(() => stockAdjustments.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).notNull(),
  adjustedQuantity: decimal('adjusted_quantity', { precision: 10, scale: 2 }).notNull(),
  difference: decimal('difference', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).default('0'),
  totalValue: decimal('total_value', { precision: 14, scale: 2 }).default('0'),
  notes: text('notes'),
});

// Stock Valuation Logs
export const stockValuationLogs = pgTable('stock_valuation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  valuationDate: timestamp('valuation_date').notNull(),
  method: valuationMethodEnum('method').notNull(),
  totalItems: integer('total_items').notNull().default(0),
  totalValue: decimal('total_value', { precision: 16, scale: 2 }).notNull(),
  valuationDetails: text('valuation_details'), // JSON string of per-item valuation
  runBy: varchar('run_by', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// RELATIONS FOR NEW TABLES
// ==========================================

// Banking Relations
export const bankAccountsRelations = relations(bankAccounts, ({ many }) => ({
  deposits: many(bankDeposits),
  fromTransfers: many(fundsTransfers, { relationName: 'fromTransfer' }),
  toTransfers: many(fundsTransfers, { relationName: 'toTransfer' }),
  miscContacts: many(miscContacts),
  pdcInstruments: many(pdcInstruments),
  miscContactSettlements: many(miscContactSettlements),
}));

export const bankDepositsRelations = relations(bankDeposits, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankDeposits.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const fundsTransfersRelations = relations(fundsTransfers, ({ one }) => ({
  fromBankAccount: one(bankAccounts, {
    fields: [fundsTransfers.fromBankAccountId],
    references: [bankAccounts.id],
  }),
  toBankAccount: one(bankAccounts, {
    fields: [fundsTransfers.toBankAccountId],
    references: [bankAccounts.id],
  }),
}));

export const miscContactsRelations = relations(miscContacts, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [miscContacts.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

// Credit & Debit Notes Relations
export const creditDebitNotesRelations = relations(creditDebitNotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [creditDebitNotes.customerId],
    references: [customers.id],
  }),
  vendor: one(vendors, {
    fields: [creditDebitNotes.vendorId],
    references: [vendors.id],
  }),
  invoice: one(invoices, {
    fields: [creditDebitNotes.invoiceId],
    references: [invoices.id],
  }),
  purchaseInvoice: one(purchaseInvoices, {
    fields: [creditDebitNotes.purchaseInvoiceId],
    references: [purchaseInvoices.id],
  }),
  salesReturn: one(salesReturns, {
    fields: [creditDebitNotes.salesReturnId],
    references: [salesReturns.id],
  }),
  purchaseReturn: one(purchaseReturns, {
    fields: [creditDebitNotes.purchaseReturnId],
    references: [purchaseReturns.id],
  }),
  lines: many(creditDebitNoteLines),
}));

export const creditDebitNoteLinesRelations = relations(creditDebitNoteLines, ({ one }) => ({
  creditDebitNote: one(creditDebitNotes, {
    fields: [creditDebitNoteLines.creditDebitNoteId],
    references: [creditDebitNotes.id],
  }),
  product: one(products, {
    fields: [creditDebitNoteLines.productId],
    references: [products.id],
  }),
}));

// PDC Instruments Relations
export const pdcInstrumentsRelations = relations(pdcInstruments, ({ one }) => ({
  customer: one(customers, {
    fields: [pdcInstruments.customerId],
    references: [customers.id],
  }),
  vendor: one(vendors, {
    fields: [pdcInstruments.vendorId],
    references: [vendors.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [pdcInstruments.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

// Misc Contact Settlement Relations
export const miscContactSettlementsRelations = relations(miscContactSettlements, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [miscContactSettlements.bankAccountId],
    references: [bankAccounts.id],
  }),
}));

// Stock Movement Relations
export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));

// Stock Adjustment Relations
export const stockAdjustmentsRelations = relations(stockAdjustments, ({ many }) => ({
  lines: many(stockAdjustmentLines),
}));

export const stockAdjustmentLinesRelations = relations(stockAdjustmentLines, ({ one }) => ({
  stockAdjustment: one(stockAdjustments, {
    fields: [stockAdjustmentLines.stockAdjustmentId],
    references: [stockAdjustments.id],
  }),
  product: one(products, {
    fields: [stockAdjustmentLines.productId],
    references: [products.id],
  }),
}));

// TypeScript types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type Uom = typeof uoms.$inferSelect;
export type NewUom = typeof uoms.$inferInsert;
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type WarehouseStock = typeof warehouseStock.$inferSelect;
export type NewWarehouseStock = typeof warehouseStock.$inferInsert;
export type ProductBatch = typeof productBatches.$inferSelect;
export type NewProductBatch = typeof productBatches.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type UomConversion = typeof uomConversions.$inferSelect;
export type NewUomConversion = typeof uomConversions.$inferInsert;
export type StockTransfer = typeof stockTransfers.$inferSelect;
export type NewStockTransfer = typeof stockTransfers.$inferInsert;
export type StockTransferItem = typeof stockTransferItems.$inferSelect;
export type NewStockTransferItem = typeof stockTransferItems.$inferInsert;
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
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type NewPurchaseInvoice = typeof purchaseInvoices.$inferInsert;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type NewPurchaseItem = typeof purchaseItems.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

// Manufacturing Types
export type ManufacturingBom = typeof manufacturingBoms.$inferSelect;
export type NewManufacturingBom = typeof manufacturingBoms.$inferInsert;
export type BomItem = typeof bomItems.$inferSelect;
export type NewBomItem = typeof bomItems.$inferInsert;
export type JobOrder = typeof jobOrders.$inferSelect;
export type NewJobOrder = typeof jobOrders.$inferInsert;
export type JobOrderComponent = typeof jobOrderComponents.$inferSelect;
export type NewJobOrderComponent = typeof jobOrderComponents.$inferInsert;

// Manufacturing Relations
export const manufacturingBomsRelations = relations(manufacturingBoms, ({ one, many }) => ({
  finishedGood: one(products, {
    fields: [manufacturingBoms.finishedGoodId],
    references: [products.id],
  }),
  bomItems: many(bomItems),
  jobOrders: many(jobOrders),
}));

export const bomItemsRelations = relations(bomItems, ({ one }) => ({
  bom: one(manufacturingBoms, {
    fields: [bomItems.bomId],
    references: [manufacturingBoms.id],
  }),
  component: one(products, {
    fields: [bomItems.componentId],
    references: [products.id],
  }),
}));

export const jobOrdersRelations = relations(jobOrders, ({ one, many }) => ({
  bom: one(manufacturingBoms, {
    fields: [jobOrders.bomId],
    references: [manufacturingBoms.id],
  }),
  components: many(jobOrderComponents),
}));

export const jobOrderComponentsRelations = relations(jobOrderComponents, ({ one }) => ({
  jobOrder: one(jobOrders, {
    fields: [jobOrderComponents.jobOrderId],
    references: [jobOrders.id],
  }),
  component: one(products, {
    fields: [jobOrderComponents.componentId],
    references: [products.id],
  }),
}));

// ==========================================
// CRM RELATIONS
// ==========================================
export const leadsRelations = relations(leads, ({ one, many }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedToCustomerId],
    references: [customers.id],
  }),
  tickets: many(tickets),
  events: many(crmEvents),
  calls: many(crmCalls),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  customer: one(customers, {
    fields: [tickets.customerId],
    references: [customers.id],
  }),
  lead: one(leads, {
    fields: [tickets.leadId],
    references: [leads.id],
  }),
}));

export const crmEventsRelations = relations(crmEvents, ({ one }) => ({
  customer: one(customers, {
    fields: [crmEvents.customerId],
    references: [customers.id],
  }),
  lead: one(leads, {
    fields: [crmEvents.leadId],
    references: [leads.id],
  }),
}));

export const crmCallsRelations = relations(crmCalls, ({ one }) => ({
  customer: one(customers, {
    fields: [crmCalls.customerId],
    references: [customers.id],
  }),
  lead: one(leads, {
    fields: [crmCalls.leadId],
    references: [leads.id],
  }),
}));

// ==========================================
// SALES RELATIONS
// ==========================================
export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  items: many(quotationItems),
  convertedInvoice: one(invoices, {
    fields: [quotations.convertedToInvoiceId],
    references: [invoices.id],
  }),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  product: one(products, {
    fields: [quotationItems.productId],
    references: [products.id],
  }),
}));

export const deliveryNotesRelations = relations(deliveryNotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [deliveryNotes.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [deliveryNotes.invoiceId],
    references: [invoices.id],
  }),
  order: one(saleOrders, {
    fields: [deliveryNotes.orderId],
    references: [saleOrders.id],
  }),
  items: many(deliveryNoteItems),
}));

export const deliveryNoteItemsRelations = relations(deliveryNoteItems, ({ one }) => ({
  deliveryNote: one(deliveryNotes, {
    fields: [deliveryNoteItems.deliveryNoteId],
    references: [deliveryNotes.id],
  }),
  product: one(products, {
    fields: [deliveryNoteItems.productId],
    references: [products.id],
  }),
}));

export const recurringInvoicesRelations = relations(recurringInvoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [recurringInvoices.customerId],
    references: [customers.id],
  }),
  items: many(recurringInvoiceItems),
  lastInvoice: one(invoices, {
    fields: [recurringInvoices.lastGeneratedInvoiceId],
    references: [invoices.id],
  }),
}));

export const recurringInvoiceItemsRelations = relations(recurringInvoiceItems, ({ one }) => ({
  recurringInvoice: one(recurringInvoices, {
    fields: [recurringInvoiceItems.recurringInvoiceId],
    references: [recurringInvoices.id],
  }),
  product: one(products, {
    fields: [recurringInvoiceItems.productId],
    references: [products.id],
  }),
}));

export const salesReturnsRelations = relations(salesReturns, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesReturns.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [salesReturns.invoiceId],
    references: [invoices.id],
  }),
  items: many(salesReturnItems),
}));

export const salesReturnItemsRelations = relations(salesReturnItems, ({ one }) => ({
  salesReturn: one(salesReturns, {
    fields: [salesReturnItems.salesReturnId],
    references: [salesReturns.id],
  }),
  product: one(products, {
    fields: [salesReturnItems.productId],
    references: [products.id],
  }),
}));

// ==========================================
// PURCHASES RELATIONS
// ==========================================
export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
}));

export const goodReceivingNotesRelations = relations(goodReceivingNotes, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [goodReceivingNotes.vendorId],
    references: [vendors.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [goodReceivingNotes.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  purchaseInvoice: one(purchaseInvoices, {
    fields: [goodReceivingNotes.purchaseInvoiceId],
    references: [purchaseInvoices.id],
  }),
  items: many(grnItems),
}));

export const grnItemsRelations = relations(grnItems, ({ one }) => ({
  grn: one(goodReceivingNotes, {
    fields: [grnItems.grnId],
    references: [goodReceivingNotes.id],
  }),
  product: one(products, {
    fields: [grnItems.productId],
    references: [products.id],
  }),
}));

export const purchaseReturnsRelations = relations(purchaseReturns, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [purchaseReturns.vendorId],
    references: [vendors.id],
  }),
  purchaseInvoice: one(purchaseInvoices, {
    fields: [purchaseReturns.purchaseInvoiceId],
    references: [purchaseInvoices.id],
  }),
  items: many(purchaseReturnItems),
}));

export const purchaseReturnItemsRelations = relations(purchaseReturnItems, ({ one }) => ({
  purchaseReturn: one(purchaseReturns, {
    fields: [purchaseReturnItems.purchaseReturnId],
    references: [purchaseReturns.id],
  }),
  product: one(products, {
    fields: [purchaseReturnItems.productId],
    references: [products.id],
  }),
}));

// ==========================================
// PAYMENTS & SETTLEMENTS RELATIONS
// ==========================================
export const customerPaymentsRelations = relations(customerPayments, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerPayments.customerId],
    references: [customers.id],
  }),
  allocations: many(customerPaymentAllocations),
}));

export const customerPaymentAllocationsRelations = relations(customerPaymentAllocations, ({ one }) => ({
  payment: one(customerPayments, {
    fields: [customerPaymentAllocations.customerPaymentId],
    references: [customerPayments.id],
  }),
  invoice: one(invoices, {
    fields: [customerPaymentAllocations.invoiceId],
    references: [invoices.id],
  }),
}));

export const vendorPaymentsRelations = relations(vendorPayments, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [vendorPayments.vendorId],
    references: [vendors.id],
  }),
  allocations: many(vendorPaymentAllocations),
}));

export const vendorPaymentAllocationsRelations = relations(vendorPaymentAllocations, ({ one }) => ({
  payment: one(vendorPayments, {
    fields: [vendorPaymentAllocations.vendorPaymentId],
    references: [vendorPayments.id],
  }),
  purchaseInvoice: one(purchaseInvoices, {
    fields: [vendorPaymentAllocations.purchaseInvoiceId],
    references: [purchaseInvoices.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ many }) => ({
  lines: many(settlementLines),
}));

export const settlementLinesRelations = relations(settlementLines, ({ one }) => ({
  settlement: one(settlements, {
    fields: [settlementLines.settlementId],
    references: [settlements.id],
  }),
}));

// ==========================================
// NEW TYPESCRIPT TYPES
// ==========================================

// CRM Types
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type CrmEvent = typeof crmEvents.$inferSelect;
export type NewCrmEvent = typeof crmEvents.$inferInsert;
export type CrmCall = typeof crmCalls.$inferSelect;
export type NewCrmCall = typeof crmCalls.$inferInsert;

// Sales Types
export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type NewQuotationItem = typeof quotationItems.$inferInsert;
export type DeliveryNote = typeof deliveryNotes.$inferSelect;
export type NewDeliveryNote = typeof deliveryNotes.$inferInsert;
export type DeliveryNoteItem = typeof deliveryNoteItems.$inferSelect;
export type NewDeliveryNoteItem = typeof deliveryNoteItems.$inferInsert;
export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
export type NewRecurringInvoice = typeof recurringInvoices.$inferInsert;
export type RecurringInvoiceItem = typeof recurringInvoiceItems.$inferSelect;
export type NewRecurringInvoiceItem = typeof recurringInvoiceItems.$inferInsert;
export type SalesReturn = typeof salesReturns.$inferSelect;
export type NewSalesReturn = typeof salesReturns.$inferInsert;
export type SalesReturnItem = typeof salesReturnItems.$inferSelect;
export type NewSalesReturnItem = typeof salesReturnItems.$inferInsert;

// Purchases Types
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type GoodReceivingNote = typeof goodReceivingNotes.$inferSelect;
export type NewGoodReceivingNote = typeof goodReceivingNotes.$inferInsert;
export type GrnItem = typeof grnItems.$inferSelect;
export type NewGrnItem = typeof grnItems.$inferInsert;
export type PurchaseReturn = typeof purchaseReturns.$inferSelect;
export type NewPurchaseReturn = typeof purchaseReturns.$inferInsert;
export type PurchaseReturnItem = typeof purchaseReturnItems.$inferSelect;
export type NewPurchaseReturnItem = typeof purchaseReturnItems.$inferInsert;

// Payments & Settlements Types
export type CustomerPayment = typeof customerPayments.$inferSelect;
export type NewCustomerPayment = typeof customerPayments.$inferInsert;
export type CustomerPaymentAllocation = typeof customerPaymentAllocations.$inferSelect;
export type NewCustomerPaymentAllocation = typeof customerPaymentAllocations.$inferInsert;
export type VendorPayment = typeof vendorPayments.$inferSelect;
export type NewVendorPayment = typeof vendorPayments.$inferInsert;
export type VendorPaymentAllocation = typeof vendorPaymentAllocations.$inferSelect;
export type NewVendorPaymentAllocation = typeof vendorPaymentAllocations.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
export type SettlementLine = typeof settlementLines.$inferSelect;
export type NewSettlementLine = typeof settlementLines.$inferInsert;

// Banking & Advanced Accounts Types
export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
export type BankDeposit = typeof bankDeposits.$inferSelect;
export type NewBankDeposit = typeof bankDeposits.$inferInsert;
export type FundsTransfer = typeof fundsTransfers.$inferSelect;
export type NewFundsTransfer = typeof fundsTransfers.$inferInsert;
export type MiscContact = typeof miscContacts.$inferSelect;
export type NewMiscContact = typeof miscContacts.$inferInsert;
export type CreditDebitNote = typeof creditDebitNotes.$inferSelect;
export type NewCreditDebitNote = typeof creditDebitNotes.$inferInsert;
export type CreditDebitNoteLine = typeof creditDebitNoteLines.$inferSelect;
export type NewCreditDebitNoteLine = typeof creditDebitNoteLines.$inferInsert;
export type PdcInstrument = typeof pdcInstruments.$inferSelect;
export type NewPdcInstrument = typeof pdcInstruments.$inferInsert;
export type MiscContactSettlement = typeof miscContactSettlements.$inferSelect;
export type NewMiscContactSettlement = typeof miscContactSettlements.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustments.$inferInsert;
export type StockAdjustmentLine = typeof stockAdjustmentLines.$inferSelect;
export type NewStockAdjustmentLine = typeof stockAdjustmentLines.$inferInsert;
export type StockValuationLog = typeof stockValuationLogs.$inferSelect;
export type NewStockValuationLog = typeof stockValuationLogs.$inferInsert;
export type StockCount = typeof stockCounts.$inferSelect;
export type NewStockCount = typeof stockCounts.$inferInsert;
export type StockCountItem = typeof stockCountItems.$inferSelect;
export type NewStockCountItem = typeof stockCountItems.$inferInsert;

// Export complete schema
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
  vendors,
  purchaseInvoices,
  purchaseItems,
  expenses,
  manufacturingBoms,
  bomItems,
  jobOrders,
  jobOrderComponents,
  // CRM
  leads,
  tickets,
  crmEvents,
  crmCalls,
  // Sales
  quotations,
  quotationItems,
  deliveryNotes,
  deliveryNoteItems,
  recurringInvoices,
  recurringInvoiceItems,
  salesReturns,
  salesReturnItems,
  // Purchases
  purchaseOrders,
  purchaseOrderItems,
  goodReceivingNotes,
  grnItems,
  purchaseReturns,
  purchaseReturnItems,
  // Payments & Settlements
  customerPayments,
  customerPaymentAllocations,
  vendorPayments,
  vendorPaymentAllocations,
  settlements,
  settlementLines,
  // Banking & Advanced Accounts
  bankAccounts,
  bankDeposits,
  fundsTransfers,
  miscContacts,
  creditDebitNotes,
  creditDebitNoteLines,
  pdcInstruments,
  miscContactSettlements,
  // Fixed Assets
  fixedAssets,
  depreciationLogs,
  fixedAssetsRelations,
  depreciationLogsRelations,
  // Leave Management
  leaveTypes,
  leaveApplications,
  leaveTypesRelations,
  leaveApplicationsRelations,
  // Physical Stock Count
  stockCounts,
  stockCountItems,
  stockCountsRelations,
  stockCountItemsRelations,
  // Inventory Depth
  stockMovements,
  stockAdjustments,
  stockAdjustmentLines,
  stockValuationLogs,
};


export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [journalEntries.orgId],
    references: [organizations.id],
  }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalEntryLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));