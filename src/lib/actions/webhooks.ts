"use server";

import { db } from "@/db";
import { webhookEndpoints, webhookDeliveries, organizations } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, requireRole } from "./shared";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

type WebhookEvent =
  | "invoice.created" | "invoice.updated" | "invoice.paid"
  | "payment.received"
  | "customer.created" | "customer.updated"
  | "purchase.created" | "purchase.updated";

function generateSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function getWebhookEndpoints() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.orgId, orgId))
      .orderBy(desc(webhookEndpoints.createdAt));

    return { success: true, data: endpoints };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to load webhook endpoints" };
  }
}

export interface CreateWebhookData {
  name: string;
  url: string;
  events: WebhookEvent[];
  description?: string;
}

export async function createWebhookEndpoint(data: CreateWebhookData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await requireRole(["admin"]);

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        orgId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: generateSecret(),
        description: data.description,
      })
      .returning();

    revalidatePath("/settings/webhooks");
    return { success: true, data: endpoint };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to create webhook endpoint" };
  }
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  isActive?: boolean;
  description?: string;
}

export async function updateWebhookEndpoint(id: string, data: UpdateWebhookData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await requireRole(["admin"]);

    const [existing] = await db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, orgId)))
      .limit(1);

    if (!existing) return { success: false, error: "Webhook endpoint not found" };

    const [updated] = await db
      .update(webhookEndpoints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhookEndpoints.id, id))
      .returning();

    revalidatePath("/settings/webhooks");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to update webhook endpoint" };
  }
}

export async function deleteWebhookEndpoint(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await requireRole(["admin"]);

    const [existing] = await db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, orgId)))
      .limit(1);

    if (!existing) return { success: false, error: "Webhook endpoint not found" };

    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));

    revalidatePath("/settings/webhooks");
    return { success: true };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to delete webhook endpoint" };
  }
}

export async function regenerateWebhookSecret(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };
    await requireRole(["admin"]);

    const [updated] = await db
      .update(webhookEndpoints)
      .set({ secret: generateSecret(), updatedAt: new Date() })
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.orgId, orgId)))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to regenerate webhook secret" };
  }
}

export async function getWebhookDeliveries(endpointId?: string, limit = 50) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(webhookDeliveries.orgId, orgId)];
    if (endpointId) conditions.push(eq(webhookDeliveries.webhookEndpointId, endpointId));

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(and(...conditions))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);

    return { success: true, data: deliveries };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to load webhook deliveries" };
  }
}

export async function retryWebhookDelivery(deliveryId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.orgId, orgId)))
      .limit(1);

    if (!delivery) return { success: false, error: "Delivery not found" };
    if (delivery.status === "success") return { success: false, error: "Delivery already succeeded" };

    const result = await deliverWebhook(delivery.webhookEndpointId, delivery.event as WebhookEvent, delivery.payload as Record<string, unknown>);

    return result;
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    return { success: false, error: "Failed to retry webhook delivery" };
  }
}

async function deliverWebhook(
  endpointId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId))
      .limit(1);

    if (!endpoint || !endpoint.isActive) {
      await logDelivery(endpointId, endpoint?.orgId ?? "", event, payload, "failed", 0, "Endpoint inactive or not found");
      return { success: false, error: "Endpoint inactive or not found" };
    }

    const body = JSON.stringify({ event, ...payload });
    const signature = crypto
      .createHmac("sha256", endpoint.secret)
      .update(body)
      .digest("hex");

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

    await logDelivery(
      endpointId,
      endpoint.orgId,
      event,
      payload,
      response.ok ? "success" : "failed",
      response.status,
      responseBody
    );

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${responseBody}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in webhooks.ts:", error);
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId))
      .limit(1);

    await logDelivery(
      endpointId,
      endpoint?.orgId ?? "",
      event,
      payload,
      "failed",
      0,
      error instanceof Error ? error.message : "Unknown error"
    );

    return { success: false, error: error instanceof Error ? error.message : "Delivery failed" };
  }
}

async function logDelivery(
  webhookEndpointId: string,
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  status: "pending" | "success" | "failed",
  responseCode: number,
  responseBody: string
) {
  try {
    await db.insert(webhookDeliveries).values({
      webhookEndpointId,
      orgId,
      event,
      payload,
      status,
      responseCode,
      responseBody,
      attempts: 1,
      completedAt: status !== "pending" ? new Date() : undefined,
    });
  } catch (err) {
    console.error("Failed to log webhook delivery:", err);
  }
}

export async function dispatchWebhookEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
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
      deliverWebhook(endpoint.id, event, payload).catch((err) =>
        console.error(`Webhook delivery failed for ${endpoint.id}:`, err)
      );
    }
  } catch (error) {
    console.error("Failed to dispatch webhook event:", error);
  }
}
