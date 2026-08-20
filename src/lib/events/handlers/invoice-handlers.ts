/**
 * Invoice Event Handlers
 *
 * Handles events related to invoices: creation, payment, and overdue.
 */

import { eventBus, createEvent } from "../event-bus";
import { EVENT_TYPES, InvoiceCreatedEvent, InvoicePaidEvent } from "../types";

/**
 * Register all invoice event handlers
 */
export function registerInvoiceHandlers(): void {
  // When invoice is created → update customer balance
  eventBus.on(EVENT_TYPES.INVOICE_CREATED, async (event) => {
    const { customerId, totalAmount } = event.data as InvoiceCreatedEvent["data"];
    console.log(
      `[InvoiceHandler] Invoice created for customer ${customerId}: Rs. ${totalAmount}`
    );
    // TODO: Update customer balance in database
    // TODO: Send notification to sales team
  });

  // When invoice is paid → update status and send receipt
  eventBus.on(EVENT_TYPES.INVOICE_PAID, async (event) => {
    const { invoiceId, amount, method } = event.data as InvoicePaidEvent["data"];
    console.log(
      `[InvoiceHandler] Invoice ${invoiceId} paid: Rs. ${amount} via ${method}`
    );
    // TODO: Update invoice status to PAID
    // TODO: Generate payment receipt
    // TODO: Send thank you email to customer
  });

  // When invoice is overdue → send reminder
  eventBus.on(EVENT_TYPES.INVOICE_OVERDUE, async (event) => {
    const { invoiceId, customerId, daysOverdue } = event.data as {
      invoiceId: string;
      customerId: string;
      daysOverdue: number;
    };
    console.log(
      `[InvoiceHandler] Invoice ${invoiceId} is ${daysOverdue} days overdue`
    );
    // TODO: Send payment reminder email
    // TODO: Create follow-up task
    // TODO: Update aging report
  });
}
