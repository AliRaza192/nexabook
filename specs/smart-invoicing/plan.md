# Smart Invoicing — Implementation Plan

## Context
Current invoice creation has basic auto-fill (product → price, stock filtering) but lacks intelligence. User fills every field manually — no suggestions, no duplicate detection, no anomaly flagging.

**Goal:** Make invoice creation faster and smarter by learning from historical data.

**Approach:** Server-side analysis functions + client-side smart UI hints.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to run AI logic? | Server actions (Gemini free tier) | Same pattern as bank reconciliation — 15 RPM is enough for invoice creation |
| Data stored? | No new tables needed | Use existing `invoices` + `invoice_items` tables for historical analysis |
| UI integration? | Non-intrusive hints/suggestions | Don't block workflow — show suggestions as optional helpers |
| Pricing source? | Last 30 days average + last sold price | Most relevant for Pakistani business context |
| Duplicate threshold? | Same customer + 80% item overlap + ±20% amount within 7 days | Avoid false positives |
| Anomaly detection? | Amount > 3x customer average OR new customer + high amount | Simple but effective for fraud prevention |

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/actions/smart-invoice.ts` | **CREATE** | Server actions: analyze, suggest, detect duplicates, detect anomalies |
| `src/components/smart-invoicing/smart-suggestions.tsx` | **CREATE** | UI component: pricing suggestions, duplicate warnings, anomaly flags |
| `src/app/(dashboard)/sales/invoices/new/page.tsx` | **MODIFY** | Integrate smart suggestions into invoice create form |
| `src/lib/smart-invoice.test.ts` | **CREATE** | Tests for all analysis functions |

---

## Implementation Order

1. **Server actions** (`smart-invoice.ts`) — core analysis functions
2. **Smart suggestions component** (`smart-suggestions.tsx`) — UI for hints
3. **Integrate into create page** — wire up suggestions
4. **Tests** — unit tests for analysis logic
