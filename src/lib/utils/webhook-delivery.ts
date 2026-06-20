import { db } from "@/db";
import { webhookEndpoints, webhookDeliveries } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import crypto from "crypto";

type WebhookEvent =
  | "invoice.created" | "invoice.updated" | "invoice.paid"
  | "payment.received"
  | "customer.created" | "customer.updated"
  | "purchase.created" | "purchase.updated";

async function signPayload(payload: string, secret: string): Promise<string> {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendWebhook(
  endpointId: string,
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId))
      .limit(1);

    if (!endpoint || !endpoint.isActive) return;

    const body = JSON.stringify({ event, ...payload });
    const signature = await signPayload(body, endpoint.secret);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await response.text();

    await db.insert(webhookDeliveries).values({
      webhookEndpointId: endpointId,
      orgId,
      event,
      payload,
      status: response.ok ? "success" : "failed",
      responseCode: response.status,
      responseBody,
      attempts: 1,
      maxAttempts: 3,
      completedAt: new Date(),
    });
  } catch (error) {
    await db.insert(webhookDeliveries).values({
      webhookEndpointId: endpointId,
      orgId,
      event,
      payload,
      status: "failed",
      responseCode: 0,
      responseBody: error instanceof Error ? error.message : "Delivery failed",
      attempts: 1,
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  }
}

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const orgId = payload.orgId as string;
  if (!orgId) return;

  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.orgId, orgId),
        eq(webhookEndpoints.isActive, true)
      )
    );

  const matchingEndpoints = endpoints.filter((ep) =>
    ep.events.includes(event)
  );

  for (const endpoint of matchingEndpoints) {
    sendWebhook(endpoint.id, orgId, event, payload).catch((err) =>
      console.error(`Webhook delivery failed for ${endpoint.id}:`, err)
    );
  }
}

export async function retryFailedDeliveries(): Promise<void> {
  const failedDeliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, "failed"),
        lt(webhookDeliveries.attempts, webhookDeliveries.maxAttempts)
      )
    )
    .limit(50);

  for (const delivery of failedDeliveries) {
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, delivery.webhookEndpointId))
      .limit(1);

    if (!endpoint || !endpoint.isActive) continue;

    try {
      const body = JSON.stringify(delivery.payload);
      const signature = await signPayload(body, endpoint.secret);

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": delivery.event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.text();
      const newAttempts = delivery.attempts + 1;

      await db
        .update(webhookDeliveries)
        .set({
          status: response.ok ? "success" : "failed",
          responseCode: response.status,
          responseBody,
          attempts: newAttempts,
          maxAttempts: 3,
          completedAt: response.ok ? new Date() : undefined,
          nextRetryAt: response.ok
            ? undefined
            : new Date(Date.now() + Math.pow(2, newAttempts) * 60 * 1000),
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    } catch (error) {
      const newAttempts = delivery.attempts + 1;
      await db
        .update(webhookDeliveries)
        .set({
          attempts: newAttempts,
          nextRetryAt: new Date(Date.now() + Math.pow(2, newAttempts) * 60 * 1000),
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    }
  }
}
