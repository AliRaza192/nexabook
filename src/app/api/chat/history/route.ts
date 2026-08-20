import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentOrgId } from "@/lib/actions/shared";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.userId, userId)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    return NextResponse.json({ success: true, data: messages.reverse() });
  } catch (err) {
    console.error("Chat history error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
