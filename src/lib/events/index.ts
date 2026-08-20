/**
 * NexaBook Event System
 *
 * Central export for the event-driven architecture.
 * This is the "nervous system" of the application.
 *
 * Usage:
 *   import { eventBus, createEvent, registerAllHandlers } from "@/lib/events";
 *
 *   // Register all handlers (call once at app startup)
 *   registerAllHandlers();
 *
 *   // Emit an event
 *   const event = createEvent("invoice.created", orgId, {
 *     invoiceId: "inv-001",
 *     totalAmount: 100000,
 *   });
 *   await eventBus.emit(event);
 */

export { eventBus, createEvent } from "./event-bus";
export { EVENT_TYPES } from "./types";
export type {
  DomainEvent,
  InvoiceCreatedEvent,
  InvoicePaidEvent,
  InvoiceOverdueEvent,
  PaymentReceivedEvent,
  PaymentMadeEvent,
  StockLowEvent,
  StockExpiringEvent,
  PayrollRunEvent,
  TaxFilingDueEvent,
  WebhookDeliveryEvent,
  EmailSendEvent,
  NexaBookEvent,
} from "./types";

// Import all handlers
import { registerInvoiceHandlers } from "./handlers/invoice-handlers";
import { registerPaymentHandlers } from "./handlers/payment-handlers";
import { registerStockHandlers } from "./handlers/stock-handlers";
import { registerPayrollHandlers } from "./handlers/payroll-handlers";
import { registerSystemHandlers } from "./handlers/system-handlers";

/**
 * Register all event handlers
 * Call this once at application startup
 */
export function registerAllHandlers(): void {
  registerInvoiceHandlers();
  registerPaymentHandlers();
  registerStockHandlers();
  registerPayrollHandlers();
  registerSystemHandlers();

  console.log("[EventSystem] All handlers registered");
  console.log(
    "[EventSystem] Event types:",
    [
      "invoice.created",
      "invoice.paid",
      "invoice.overdue",
      "payment.received",
      "payment.made",
      "stock.low",
      "stock.expiring",
      "payroll.run",
      "tax.filing-due",
      "webhook.delivery",
      "email.send",
    ].join(", ")
  );
}
