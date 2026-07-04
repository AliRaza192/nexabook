# NexaBot 2.0 with RAG — Implementation Tasks

## Phase 1: Schema & Server Actions
- [ ] Add `chatMessages` table to schema.ts
- [ ] Create `src/lib/actions/chat.ts` with:
  - [ ] `saveChatMessage(orgId, userId, role, content)` — save single message
  - [ ] `getChatHistory(orgId, userId, limit?)` — fetch last N messages
  - [ ] `deleteOldMessages(daysOld)` — cleanup old messages

## Phase 2: More Retrievers
- [ ] Add `payroll` retriever — total salaries, employee count
- [ ] Add `taxSummary` retriever — output tax, input tax, net payable
- [ ] Add `inventoryValue` retriever — total stock value, low stock count
- [ ] Add `recentInvoices` retriever — last 10 invoices
- [ ] Add `purchases` retriever — total purchases, top vendors

## Phase 3: API Route Updates
- [ ] Modify `src/app/api/chat/route.ts`:
  - [ ] Add SSE streaming support
  - [ ] Save user message to DB
  - [ ] Save assistant message to DB
  - [ ] Improved intent detection patterns

## Phase 4: Chat Widget Updates
- [ ] Modify `src/components/ChatWidget.tsx`:
  - [ ] Load chat history on mount
  - [ ] Add suggested prompts section
  - [ ] Streaming response rendering
  - [ ] Typing indicator

## Phase 5: Tests
- [ ] Create `src/lib/nexabot-2.test.ts`:
  - [ ] Test chat history save/load
  - [ ] Test intent detection patterns
  - [ ] Test retriever data format
  - [ ] Test message cleanup

## Verification
- [ ] TypeScript: 0 errors
- [ ] Tests: all pass
- [ ] Chat history persists on refresh
- [ ] Suggested prompts work
- [ ] All FTE domains accessible
