# NexaBot 2.0 with RAG — Implementation Plan

## Context
NexaBot v1 has: 9 hardcoded SQL retrievers, regex intent detection, Gemini 2.0 Flash, in-memory chat history. Gaps: no persistence, no streaming, no tool calling, no knowledge base.

**Goal:** Make NexaBot smarter with persistent history, streaming responses, more data sources, and suggested prompts.

**Approach:** Enhance existing chat system — add DB persistence, SSE streaming, more retrievers, suggested prompts.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persistent chat history? | Yes — store in DB | Conversations lost on refresh. Essential for UX. |
| Streaming responses? | Yes — SSE | Users see response as it's generated. Better UX. |
| Tool/function calling? | No — too complex for free tier | Gemini free tier may not support function calling well. Keep regex intent detection but improve it. |
| Vector embeddings? | No — too complex | Keep SQL-based retrieval. Add more retrievers instead. |
| Knowledge base? | No — skip for now | Focus on live accounting data. |
| More retrievers? | Yes — add payroll, tax, inventory | Cover all FTE domains. |
| Suggested prompts? | Yes — quick action buttons | Help users discover what NexaBot can do. |

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | **MODIFY** | Add `chatMessages` table |
| `src/lib/actions/chat.ts` | **CREATE** | Server actions for chat history CRUD |
| `src/lib/ai/retriever.ts` | **MODIFY** | Add more retrievers (payroll, tax, inventory) |
| `src/app/api/chat/route.ts` | **MODIFY** | Add streaming, persist messages |
| `src/components/ChatWidget.tsx` | **MODIFY** | Add suggested prompts, streaming support, history loading |

---

## Implementation Order

1. **Schema** — add chatMessages table
2. **Server actions** — chat history CRUD
3. **More retrievers** — payroll, tax, inventory data
4. **API route** — streaming + persistence
5. **Chat widget** — suggested prompts, streaming UI, history loading
6. **Tests** — unit tests
