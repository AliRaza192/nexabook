# NexaBot 2.0 with RAG — Feature Specification

## Goal
Make NexaBot smarter and more useful with persistent chat history, streaming responses, more data sources, and suggested prompts. Cover all FTE domains (accounting, tax, payroll, inventory).

---

## User Scenarios

### Scenario 1: Persistent Chat History
Ali asks NexaBot about last month's revenue. NexaBot responds. Ali refreshes the page — the conversation is still there. He continues asking follow-up questions.

### Scenario 2: Streaming Response
Sarah asks "Show me my profit and loss for January". NexaBot starts streaming: "Aap ka January ka profit and loss yeh hai..." — words appear as they're generated, not after a 5-second wait.

### Scenario 3: Suggested Prompts
New user opens NexaBot. Instead of a blank input, they see quick buttons:
- "What's my revenue?"
- "Show pending invoices"
- "Top selling products"
- "Cash position"
- "Payroll summary"

### Scenario 4: Tax Data Access
Ahmed asks "How much tax do I owe this month?" NexaBot fetches tax data: output tax, input tax, net payable. "Aap ka is mahine ka tax payable Rs. 1,50,000 hai. 15 invoices pending hain FBR submission ke liye."

### Scenario 5: Payroll Insights
HR asks "How much did we spend on salaries last month?" NexaBot: "Pichle mahine aap ne Rs. 5,00,000 salaries pay kiye. 12 employees hain, average salary Rs. 41,667 hai."

---

## Functional Requirements

### FR-1: Persistent Chat History
Store conversations in database:
- **Table**: `chatMessages` with fields: id, orgId, userId, role, content, createdAt
- **Load history**: On page load, fetch last 50 messages for current user
- **Save messages**: Save both user and assistant messages after each exchange
- **Cleanup**: Auto-delete messages older than 30 days
- **Scope**: Messages scoped by orgId (multi-tenant)

### FR-2: Streaming Responses
Stream AI responses for better UX:
- **Protocol**: Server-Sent Events (SSE)
- **Behavior**: Response words appear as they're generated
- **Fallback**: If streaming fails, fall back to buffered response
- **UI**: Show typing indicator while streaming

### FR-3: More Data Sources
Add retrievers for all FTE domains:
- **Payroll**: Total salaries, employee count, department breakdown
- **Tax**: Output tax, input tax, net payable, pending FBR submissions
- **Inventory**: Stock value, low stock items, recent movements
- **Invoices**: Recent invoices, draft count, approval status
- **Purchases**: Total purchases, top vendors, pending bills

### FR-4: Suggested Prompts
Show quick action buttons for common queries:
- **Default prompts**: Revenue, Pending invoices, Top products, Cash position, Tax summary
- **Dynamic prompts**: Based on user's recent activity
- **Click to ask**: Clicking a prompt sends it as a message
- **Customizable**: User can add/remove prompts

### FR-5: Improved Intent Detection
Better keyword matching with more patterns:
- **Payroll keywords**: salary, payroll, employees, EOBI, PF
- **Tax keywords**: tax, GST, FBR, SRB, return, filing
- **Inventory keywords**: stock, inventory, products, reorder
- **Purchase keywords**: purchases, vendors, bills, expenses
- **Fallback**: If no match, try general accounting terms

---

## Edge Cases

- **No chat history**: Show empty state with suggested prompts
- **API rate limit**: Show "Please wait" message, retry after delay
- **Streaming failure**: Fall back to buffered response
- **Empty data**: "Is bare mein data available nahi hai"
- **Long responses**: Truncate at 2000 characters, add "... (truncated)"
- **Concurrent messages**: Queue messages, process one at a time

---

## Out of Scope

- Vector embeddings / semantic search
- Document upload / knowledge base
- Tool/function calling (AI cannot invoke functions)
- Multi-modal (image processing)
- Voice input/output
- Conversation threads / naming

---

## Acceptance Criteria

- [ ] Chat history persists across page refreshes
- [ ] Messages load within 1 second
- [ ] Streaming response starts within 500ms
- [ ] Suggested prompts are clickable and send messages
- [ ] Payroll, tax, inventory data accessible via chat
- [ ] Intent detection catches all FTE domain queries
- [ ] All existing chat functionality continues to work
- [ ] Messages older than 30 days are auto-deleted
