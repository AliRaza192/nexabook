import { z } from "zod";

// Common validation schemas for server actions

export const orgIdSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((data) => data.from <= data.to, {
  message: "Start date must be before end date",
});

// Invoice validation
export const createInvoiceSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  warehouseId: z.string().uuid("Invalid warehouse ID").optional(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  subject: z.string().max(255).optional(),
  reference: z.string().max(100).optional(),
  discountPercentage: z.number().min(0).max(100).default(0),
  taxAmount: z.number().min(0).default(0),
  shippingCharges: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().positive("Quantity must be positive"),
    unitPrice: z.number().min(0, "Price must be non-negative"),
    discountPercentage: z.number().min(0).max(100).default(0),
    taxRate: z.number().min(0).max(100).default(0),
  })).min(1, "At least one item is required"),
});

// Customer validation
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  ntn: z.string().max(50).optional(),
  strn: z.string().max(50).optional(),
  creditLimit: z.number().min(0).optional(),
});

// Vendor validation
export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  ntn: z.string().max(50).optional(),
  strn: z.string().max(50).optional(),
});

// Product validation
export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  type: z.enum(["product", "service"]).default("product"),
  salePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(0),
  minStockLevel: z.number().min(0).default(0),
});

// Journal Entry validation
export const createJournalEntrySchema = z.object({
  entryDate: z.coerce.date(),
  description: z.string().optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  lines: z.array(z.object({
    accountId: z.string().uuid("Invalid account ID"),
    description: z.string().optional(),
    debitAmount: z.number().min(0).default(0),
    creditAmount: z.number().min(0).default(0),
  })).min(2, "At least two lines required (debit and credit)"),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.creditAmount, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: "Total debits must equal total credits" }
);

// Employee validation
export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required").max(50),
  fullName: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  cnic: z.string().max(15).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  joiningDate: z.coerce.date(),
  basicSalary: z.number().min(0, "Salary must be non-negative"),
});

// Bank Account validation
export const createBankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required").max(255),
  accountNumber: z.string().min(1, "Account number is required").max(50),
  bankName: z.string().max(150).optional(),
  branchName: z.string().max(150).optional(),
  iban: z.string().max(50).optional(),
  accountType: z.enum(["checking", "savings", "cash"]).default("checking"),
  openingBalance: z.number().default(0),
  currency: z.string().max(10).default("PKR"),
});

// Validate helper — returns first error message or null
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const firstError = result.error.errors[0];
  return { success: false, error: `${firstError.path.join(".")}: ${firstError.message}` };
}
