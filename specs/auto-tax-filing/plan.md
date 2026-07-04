# Auto Tax Filing — Implementation Plan

## Context
Tax system already has: FBR API (real + simulation), tax return generation, tax return PDF, WHT certificates. Key gaps: no batch FBR submission, no status dashboard, no NTN/STRN validation, no filing reminders, no provincial returns.

**Goal:** Make tax filing faster and more reliable — batch submit, track status, validate inputs, remind deadlines.

**Approach:** Enhance existing tax-returns.ts + add batch submission + status dashboard + reminders.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Batch submission? | Yes — submit multiple invoices at once | Pakistani businesses submit 50-200 invoices/month. Manual one-by-one is painful. |
| NTN/STRN validation? | Client + server side | Prevent bad data early. NTN: 5-7 digits, STRN: 13 chars. |
| Filing reminders? | NexaBot notification | Monthly GST return due by 18th of next month. |
| Provincial returns? | SRB/PRA/KPRA/BRA return preparation | Same structure as GST return but for provincial taxes. |
| Status dashboard? | Yes — show pending/failed/submitted | Visibility into FBR submission status. |
| Retry mechanism? | Yes — retry failed submissions | API failures happen, retry is essential. |

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/actions/tax-filing.ts` | **CREATE** | Batch submission, status tracking, reminders, provincial returns |
| `src/components/tax-filing/fbr-status-dashboard.tsx` | **CREATE** | Status dashboard for FBR submissions |
| `src/components/tax-filing/filing-reminders.tsx` | **CREATE** | Filing deadline reminders |
| `src/app/(dashboard)/reports/tax-returns/page.tsx` | **MODIFY** | Add batch submit button + status dashboard |
| `src/lib/tax-filing.test.ts` | **CREATE** | Tests for batch submission, validation, reminders |

---

## Implementation Order

1. **Server actions** (`tax-filing.ts`) — batch submission, validation, reminders, provincial returns
2. **Status dashboard** (`fbr-status-dashboard.tsx`) — UI for tracking submissions
3. **Filing reminders** (`filing-reminders.tsx`) — deadline notifications
4. **Integrate into tax returns page** — wire up batch submit + dashboard
5. **Tests** — unit tests for all logic
