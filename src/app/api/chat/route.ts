import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { retrievers } from "@/lib/ai/retriever";

async function getCurrentOrgId(userId: string): Promise<string | null> {
  const userProfile = await db
    .select({ orgId: profiles.orgId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return userProfile.length > 0 && userProfile[0].orgId ? userProfile[0].orgId : null;
}

const SYSTEM_PROMPT = `You are NexaBot, an AI accounting assistant for NexaBook. You help Pakistani business owners understand their financial data.

Rules:
- Answer concisely in plain English or Urdu.
- Use Pakistani Rupee (PKR) format: Rs. 1,00,000 (South Asian numbering).
- Only answer questions about the provided accounting data.
- If asked something outside the provided data, say "I can only answer questions about your accounting data."
- Use a friendly, professional tone.

Available data types: revenue, pendingInvoices, topProducts, customerBalances, cashPosition, profitLoss

When you need specific data, respond with:
[DATA:retrieverName]

The system will inject the data and call you again.`;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrgId(userId);
    if (!orgId) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    // Determine what data to retrieve based on the message
    let needsData: string[] = [];
    const msg = message.toLowerCase();

    if (/\b(revenue|sales|income|earned|kamaai)\b/.test(msg)) needsData.push("revenue");
    if (/\b(pending|unpaid|outstanding|overdue|balance due|baaki)\b/.test(msg)) needsData.push("pendingInvoices");
    if (/\b(top|best selling|popular|bestseller|zayada bikne wala)\b/.test(msg)) needsData.push("topProducts");
    if (/\b(customer.*balance|receivable|loan|qarz)\b/.test(msg)) needsData.push("customerBalances");
    if (/\b(cash|bank|balance.*account|paise|nagad)\b/.test(msg)) needsData.push("cashPosition");
    if (/\b(profit|loss|profit and loss|munafa|nuqsan|p&l)\b/.test(msg)) needsData.push("profitLoss");

    // If nothing specific, get a summary overview
    if (needsData.length === 0) {
      needsData = ["revenue", "pendingInvoices", "cashPosition"];
    }

    // Deduplicate
    needsData = [...new Set(needsData)];

    // Fetch data
    const contextParts: string[] = [];
    for (const key of needsData) {
      const retriever = retrievers[key];
      if (retriever) {
        try {
          const result = await retriever(orgId);
          contextParts.push(`=== ${result.label} ===`);
          contextParts.push(result.summary || JSON.stringify(result.data, null, 2));
        } catch (err) {
          contextParts.push(`=== ${key} ===\nError fetching data`);
        }
      }
    }

    const context = contextParts.join("\n\n");

    // Build the prompt for the AI
    const prompt = `${SYSTEM_PROMPT}\n\nUser question: ${message}\n\nRelevant accounting data:\n${context}\n\nAnswer the user's question based on the data above. Be specific with numbers and use PKR format.`;

    // Try OpenAI first, fallback to Ollama
    let answer: string;

    if (process.env.OPENAI_API_KEY) {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `${message}\n\nRelevant data:\n${context}` },
          ],
          max_tokens: 500,
        }),
      });

      if (!openaiRes.ok) {
        throw new Error(`OpenAI API error: ${openaiRes.status}`);
      }

      const openaiData = await openaiRes.json();
      answer = openaiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } else if (process.env.OLLAMA_BASE_URL) {
      const ollamaRes = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || "llama3.2",
          prompt,
          stream: false,
          options: { num_predict: 500 },
        }),
      });

      if (!ollamaRes.ok) {
        throw new Error(`Ollama API error: ${ollamaRes.status}`);
      }

      const ollamaData = await ollamaRes.json();
      answer = ollamaData.response || "Sorry, I couldn't generate a response.";
    } else {
      // No AI available - return data as structured response
      return NextResponse.json({
        success: true,
        answer: null,
        data: contextParts,
        warning: "No AI provider configured. Set OPENAI_API_KEY or OLLAMA_BASE_URL in .env.local",
      });
    }

    return NextResponse.json({ success: true, answer, data: contextParts });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
