/**
 * Payment Event Handlers
 *
 * Handles events related to payments: received and made.
 */

import { eventBus, createEvent } from "../event-bus";
import { EVENT_TYPES, PaymentReceivedEvent, PaymentMadeEvent } from "../types";

/**
 * Register all payment event handlers
 */
export function registerPaymentHandlers(): void {
  // When payment received → allocate to invoices
  eventBus.on(EVENT_TYPES.PAYMENT_RECEIVED, async (event) => {
    const { paymentId, customerId, amount, method } =
      event.data as PaymentReceivedEvent["data"];
    console.log(
      `[PaymentHandler] Payment received from ${customerId}: Rs. ${amount} via ${method}`
    );
    // TODO: Allocate payment to oldest invoices first
    // TODO: Update invoice balance amounts
    // TODO: Update customer balance
    // TODO: Create journal entry
    // TODO: Send payment confirmation
  });

  // When payment made → allocate to purchase invoices
  eventBus.on(EVENT_TYPES.PAYMENT_MADE, async (event) => {
    const { paymentId, vendorId, amount, method } =
      event.data as PaymentMadeEvent["data"];
    console.log(
      `[PaymentHandler] Payment made to ${vendorId}: Rs. ${amount} via ${method}`
    );
    // TODO: Allocate payment to oldest purchase invoices
    // TODO: Update purchase invoice balance amounts
    // TODO: Update vendor balance
    // TODO: Create journal entry
    // TODO: Record WHT if applicable
  });
}
