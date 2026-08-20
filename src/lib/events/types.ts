/**
 * Domain Event Types for NexaBook
 *
 * Defines all events that can occur in the system.
 * Events are the nervous system - they connect different parts
 * of the application and trigger side effects.
 */

export interface DomainEvent {
  id: string;
  type: string;
  timestamp: Date;
  orgId: string;
  userId?: string;
  data: Record<string, unknown>;
  metadata?: {
    source: string;
    correlationId?: string;
    causationId?: string;
  };
}

// Invoice Events
export interface InvoiceCreatedEvent extends DomainEvent {
  type: "invoice.created";
  data: {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    totalAmount: number;
    taxAmount: number;
    status: string;
  };
}

export interface InvoicePaidEvent extends DomainEvent {
  type: "invoice.paid";
  data: {
    invoiceId: string;
    paymentId: string;
    amount: number;
    method: string;
  };
}

export interface InvoiceOverdueEvent extends DomainEvent {
  type: "invoice.overdue";
  data: {
    invoiceId: string;
    customerId: string;
    amount: number;
    daysOverdue: number;
  };
}

// Payment Events
export interface PaymentReceivedEvent extends DomainEvent {
  type: "payment.received";
  data: {
    paymentId: string;
    customerId: string;
    amount: number;
    method: string;
    reference?: string;
  };
}

export interface PaymentMadeEvent extends DomainEvent {
  type: "payment.made";
  data: {
    paymentId: string;
    vendorId: string;
    amount: number;
    method: string;
    reference?: string;
  };
}

// Inventory Events
export interface StockLowEvent extends DomainEvent {
  type: "stock.low";
  data: {
    productId: string;
    productName: string;
    currentStock: number;
    reorderLevel: number;
    warehouseId?: string;
  };
}

export interface StockExpiringEvent extends DomainEvent {
  type: "stock.expiring";
  data: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
  };
}

// Payroll Events
export interface PayrollRunEvent extends DomainEvent {
  type: "payroll.run";
  data: {
    payrollRunId: string;
    month: number;
    year: number;
    totalEmployees: number;
    totalGross: number;
    totalNet: number;
  };
}

// Tax Events
export interface TaxFilingDueEvent extends DomainEvent {
  type: "tax.filing-due";
  data: {
    taxType: string;
    dueDate: string;
    authority: string;
  };
}

// System Events
export interface WebhookDeliveryEvent extends DomainEvent {
  type: "webhook.delivery";
  data: {
    webhookId: string;
    url: string;
    payload: Record<string, unknown>;
    attempt: number;
  };
}

export interface EmailSendEvent extends DomainEvent {
  type: "email.send";
  data: {
    to: string;
    subject: string;
    template: string;
    data: Record<string, unknown>;
  };
}

// Union type for all events
export type NexaBookEvent =
  | InvoiceCreatedEvent
  | InvoicePaidEvent
  | InvoiceOverdueEvent
  | PaymentReceivedEvent
  | PaymentMadeEvent
  | StockLowEvent
  | StockExpiringEvent
  | PayrollRunEvent
  | TaxFilingDueEvent
  | WebhookDeliveryEvent
  | EmailSendEvent;

// Event type string constants
export const EVENT_TYPES = {
  INVOICE_CREATED: "invoice.created",
  INVOICE_PAID: "invoice.paid",
  INVOICE_OVERDUE: "invoice.overdue",
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_MADE: "payment.made",
  STOCK_LOW: "stock.low",
  STOCK_EXPIRING: "stock.expiring",
  PAYROLL_RUN: "payroll.run",
  TAX_FILING_DUE: "tax.filing-due",
  WEBHOOK_DELIVERY: "webhook.delivery",
  EMAIL_SEND: "email.send",
} as const;
