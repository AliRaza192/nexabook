import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { retrievers } from "@/lib/ai/retriever";
import { executeMcpTool, getAvailableTools } from "@/mcp/client";
import { mcpToolDefinitions } from "@/mcp/tools/tool-definitions";
import { getCurrentOrgId } from "@/lib/actions/shared";

const SYSTEM_PROMPT = `Tu NexaBot hai — NexaBook ka AI accounting assistant. Pakistani business owners ki help karta hai Roman Urdu + English mixed language mein.

Rules:
- Hamesha Roman Urdu mein jawab de (Urdu English mix — jaise Pakistani log baat karte hain)
- Pakistani Rupee format use kar: Rs. 1,00,000 (South Asian numbering)
- Sirf provided accounting data ke baare mein jawab de
- Agar koi accounting data nahi hai to bol: "Is bare mein data available nahi hai"
- Friendly tone rakho — jaise ek helpful accountant dost ho
- Numbers ke saath context bhi do — sirf figures mat do
- Positive results pe "Mashallah!" ya "Bohot acha!" use kar
- Max 2000 characters mein jawab de

Available MCP Tools (use these for calculations and lookups):
- calculate_tax: Tax calculate kare (amount, tax_rate)
- validate_ntn: NTN validate kare (8 digits)
- validate_strn: STRN validate kare (7 digits + dash + 1 digit)
- query_revenue: Revenue data le (months_back)
- query_pending_invoices: Baki invoices dekhe
- query_overdue_invoices: Der se overdue invoices
- query_top_products: Sab se zayada bikne wale products
- query_customer_balances: Customer balances
- query_top_customers: Top customers
- query_cash_position: Cash aur bank balance
- query_profit_loss: Profit & Loss
- query_low_stock: Kam stock wale products
- query_inventory_value: Inventory ki total value
- query_payroll_summary: Salary summary
- query_tax_summary: Tax summary
- query_recent_invoices: Recent invoices
- query_purchases: Purchases summary`;

// Save message to DB
async function saveMessage(orgId: string, userId: string, role: string, content: string) {
  try {
    await db.insert(chatMessages).values({ orgId, userId, role, content });
  } catch (err) {
    console.error("[saveMessage]", err);
  }
}

// Get chat history from DB
async function getHistory(orgId: string, userId: string, limit = 10) {
  try {
    const messages = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.userId, userId)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return messages.reverse();
  } catch (err) {
    return [];
  }
}

// Improved intent detection
function detectIntents(message: string): string[] {
  const needsData: string[] = [];
  const msg = message.toLowerCase();

  // Revenue & Sales
  if (/\b(revenue|sales|income|earned|kamaai|farokht)\b/.test(msg)) needsData.push("revenue");

  // Pending & Overdue
  if (/\b(pending|unpaid|outstanding|balance due|baaki|qoul)\b/.test(msg)) needsData.push("pendingInvoices");
  if (/\b(overdue|late|der|past due)\b/.test(msg)) needsData.push("overdueInvoices");

  // Products
  if (/\b(top|best selling|popular|bestseller|zayada bikne wala|most sold)\b/.test(msg)) needsData.push("topProducts");

  // Customers
  if (/\b(customer.*balance|receivable|loan|qarz|debtor)\b/.test(msg)) needsData.push("customerBalances");
  if (/\b(top customer|best customer|sab se acha|biggest)\b/.test(msg)) needsData.push("topCustomers");

  // Cash & Bank
  if (/\b(cash|bank|balance.*account|paise|nagad|fund)\b/.test(msg)) needsData.push("cashPosition");

  // Profit & Loss
  if (/\b(profit|loss|profit and loss|munafa|nuqsan|p&l|margin)\b/.test(msg)) needsData.push("profitLoss");

  // Inventory
  if (/\b(low stock|reorder|stock khatam|inventory|stock level)\b/.test(msg)) needsData.push("lowStock");
  if (/\b(inventory value|stock value|warehouse|godown)\b/.test(msg)) needsData.push("inventoryValue");

  // Payroll
  if (/\b(salary|salaries|payroll|wages|talana|employee.*pay| EOBI|PF|provident)\b/.test(msg)) needsData.push("payroll");

  // Tax
  if (/\b(tax|GST|FBR|SRB|return|filing|taxable)\b/.test(msg)) needsData.push("taxSummary");

  // Invoices
  if (/\b(invoice|bill|challan|recent.*invoice)\b/.test(msg)) needsData.push("recentInvoices");

  // Purchases
  if (/\b(purchase|purchases|vendor|supplier|expense|kharcha)\b/.test(msg)) needsData.push("purchases");

  // Default fallback
  if (needsData.length === 0) {
    needsData.push("revenue", "pendingInvoices", "cashPosition");
  }

  return [...new Set(needsData)];
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return new Response(JSON.stringify({ success: false, error: "Organization not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { message, history, stream = true } = await request.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ success: false, error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Save user message
    await saveMessage(orgId, userId, "user", message);

    // Detect intents and fetch data
    const needsData = detectIntents(message);
    const contextParts: string[] = [];

    // Fetch data using existing retrievers
    for (const key of needsData) {
      const retriever = retrievers[key];
      if (retriever) {
        try {
          const result = await retriever(orgId);
          contextParts.push(`=== ${result.label} ===`);
          contextParts.push(result.summary || JSON.stringify(result.data, null, 2));
        } catch {
          contextParts.push(`=== ${key} ===\nError fetching data`);
        }
      }
    }

    // Also fetch via MCP tools for additional context
    const mcpTools = getAvailableTools();
    for (const tool of mcpTools.slice(0, 5)) { // Limit to top 5 MCP tools
      try {
        const mcpResult = await executeMcpTool(tool.name, {}, orgId);
        if (mcpResult.content && !mcpResult.isError) {
          contextParts.push(`=== MCP: ${tool.name} ===`);
          contextParts.push(mcpResult.content);
        }
      } catch {
        // MCP tools are optional, skip errors
      }
    }

    const context = contextParts.join("\n\n");

    // Get chat history from DB
    const dbHistory = await getHistory(orgId, userId, 10);

    // Non-streaming fallback
    if (!stream) {
      let answer: string;

      if (process.env.GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          const historyToUse = dbHistory.length > 0 ? dbHistory : (Array.isArray(history) ? history.slice(-10) : []);
          const historyMessages: { role: string; parts: { text: string }[] }[] = [];
          for (const msg of historyToUse) {
            if (msg.role === "user" || msg.role === "assistant") {
              historyMessages.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
              });
            }
          }

          const chat = model.startChat({
            history: historyMessages,
            systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
            tools: [{ functionDeclarations: mcpToolDefinitions as any }],
          });

          const result = await chat.sendMessage(`${message}\n\nRelevant accounting data:\n${context}`);
          answer = result.response.text();
          if (answer.length > 2000) answer = answer.substring(0, 1997) + "...";
        } catch {
          answer = "Sorry, Gemini response mein error aaya. Dobara try karein.";
        }
      } else if (process.env.OPENAI_API_KEY) {
        const conversationMessages: { role: string; content: string }[] = [
          { role: "system", content: SYSTEM_PROMPT },
        ];
        const historyToUse = dbHistory.length > 0 ? dbHistory : (Array.isArray(history) ? history.slice(-10) : []);
        for (const msg of historyToUse) {
          if (msg.role === "user" || msg.role === "assistant") {
            conversationMessages.push({ role: msg.role, content: msg.content });
          }
        }
        conversationMessages.push({ role: "user", content: `${message}\n\nRelevant accounting data:\n${context}` });

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: conversationMessages,
            max_tokens: 500,
            tools: mcpToolDefinitions.map(t => ({ type: "function", function: t })),
          }),
        });
        if (!openaiRes.ok) throw new Error(`OpenAI API error: ${openaiRes.status}`);
        const openaiData = await openaiRes.json();
        answer = openaiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
      } else {
        return new Response(JSON.stringify({
          success: true, answer: null, data: contextParts,
          warning: "No AI provider configured. Set GEMINI_API_KEY in .env.local",
        }), { headers: { "Content-Type": "application/json" } });
      }

      await saveMessage(orgId, userId, "assistant", answer);
      return new Response(JSON.stringify({ success: true, answer, data: contextParts }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Streaming response via SSE
    const encoder = new TextEncoder();
    const streamResponse = new ReadableStream({
      async start(controller) {
        let fullAnswer = "";

        const sendEvent = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        try {
          if (process.env.GEMINI_API_KEY) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const historyToUse = dbHistory.length > 0 ? dbHistory : (Array.isArray(history) ? history.slice(-10) : []);
            const historyMessages: { role: string; parts: { text: string }[] }[] = [];
            for (const msg of historyToUse) {
              if (msg.role === "user" || msg.role === "assistant") {
                historyMessages.push({
                  role: msg.role === "assistant" ? "model" : "user",
                  parts: [{ text: msg.content }],
                });
              }
            }

            const chat = model.startChat({
              history: historyMessages,
              systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
              tools: [{ functionDeclarations: mcpToolDefinitions as any }],
            });

            const result = await chat.sendMessageStream(`${message}\n\nRelevant accounting data:\n${context}`);

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                fullAnswer += text;
                sendEvent("chunk", text);
              }
            }
          } else if (process.env.OPENAI_API_KEY) {
            const conversationMessages: { role: string; content: string }[] = [
              { role: "system", content: SYSTEM_PROMPT },
            ];
            const historyToUse = dbHistory.length > 0 ? dbHistory : (Array.isArray(history) ? history.slice(-10) : []);
            for (const msg of historyToUse) {
              if (msg.role === "user" || msg.role === "assistant") {
                conversationMessages.push({ role: msg.role, content: msg.content });
              }
            }
            conversationMessages.push({ role: "user", content: `${message}\n\nRelevant accounting data:\n${context}` });

            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
              body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-4o-mini",
                messages: conversationMessages,
                max_tokens: 500,
                stream: true,
                tools: mcpToolDefinitions.map(t => ({ type: "function", function: t })),
              }),
            });

            if (!openaiRes.ok) throw new Error(`OpenAI API error: ${openaiRes.status}`);

            const reader = openaiRes.body?.getReader();
            if (reader) {
              const decoder = new TextDecoder();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value);
                const lines = text.split("\n").filter((l) => l.startsWith("data: ") && l !== "data: [DONE]");
                for (const line of lines) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) {
                      fullAnswer += content;
                      sendEvent("chunk", content);
                    }
                  } catch { /* skip parse errors */ }
                }
              }
            }
          } else {
            sendEvent("error", "No AI provider configured");
          }
        } catch (err) {
          sendEvent("error", "AI response mein error aaya");
        }

        // Truncate if too long
        if (fullAnswer.length > 2000) {
          fullAnswer = fullAnswer.substring(0, 1997) + "...";
        }

        // Save assistant message
        await saveMessage(orgId, userId, "assistant", fullAnswer);

        sendEvent("done", JSON.stringify({ success: true, data: contextParts }));
        controller.close();
      },
    });

    return new Response(streamResponse, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
