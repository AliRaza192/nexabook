/**
 * System Event Handlers
 *
 * Handles system-level events: webhooks, emails, and reports.
 */

import { eventBus } from "../event-bus";
import { EVENT_TYPES, WebhookDeliveryEvent, EmailSendEvent } from "../types";

/**
 * Register all system event handlers
 */
export function registerSystemHandlers(): void {
  // When webhook needs to be delivered
  eventBus.on(EVENT_TYPES.WEBHOOK_DELIVERY, async (event) => {
    const { webhookId, url, payload, attempt } =
      event.data as WebhookDeliveryEvent["data"];
    console.log(
      `[SystemHandler] Webhook delivery to ${url} (attempt ${attempt})`
    );
    // TODO: Send HTTP POST to webhook URL
    // TODO: Log delivery status
    // TODO: Retry on failure (handled by event bus)
  });

  // When email needs to be sent
  eventBus.on(EVENT_TYPES.EMAIL_SEND, async (event) => {
    const { to, subject, template, data } =
      event.data as EmailSendEvent["data"];
    console.log(
      `[SystemHandler] Sending email to ${to}: ${subject}`
    );
    // TODO: Render email template
    // TODO: Send via Resend API
    // TODO: Log email delivery
  });
}
