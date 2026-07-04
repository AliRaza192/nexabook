"use server";

import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and, desc, lte, sql } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { auth } from "@clerk/nextjs/server";

// ==================== CHAT HISTORY ====================

export async function saveChatMessage(
  role: "user" | "assistant",
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db.insert(chatMessages).values({
      orgId,
      userId,
      role,
      content,
    });

    return { success: true };
  } catch (error) {
    console.error("[saveChatMessage]", error);
    return { success: false, error: "Failed to save message" };
  }
}

export async function getChatHistory(
  limit: number = 50
): Promise<{
  success: boolean;
  data?: Array<{ id: string; role: string; content: string; createdAt: Date }>;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const messages = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.orgId, orgId),
          eq(chatMessages.userId, userId)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return { success: true, data: messages.reverse() };
  } catch (error) {
    console.error("[getChatHistory]", error);
    return { success: false, error: "Failed to fetch history" };
  }
}

export async function deleteOldMessages(
  daysOld: number = 30
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .delete(chatMessages)
      .where(
        and(
          eq(chatMessages.orgId, orgId),
          eq(chatMessages.userId, userId),
          lte(chatMessages.createdAt, cutoffDate)
        )
      );

    return { success: true, deleted: result.rowCount || 0 };
  } catch (error) {
    console.error("[deleteOldMessages]", error);
    return { success: false, error: "Failed to delete old messages" };
  }
}
