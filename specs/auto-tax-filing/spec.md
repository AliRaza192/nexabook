# Auto Tax Filing — Feature Specification

## Goal
Make FBR/SRB tax filing faster, more reliable, and less error-prone. Batch submit invoices, track submission status, validate tax IDs, and get filing deadline reminders.

---

## User Scenarios

### Scenario 1: Batch FBR Submission
Ahmed has 45 approved invoices to submit to FBR this month. Instead of submitting one-by-one, he clicks "Batch Submit" → selects all pending invoices → clicks "Submit to FBR". The system submits them in parallel (5 at a time) and shows a progress bar: "12/45 submitted, 3 failed, 30 pending".

### Scenario 2: NTN/STRN Validation
Ali enters NTN as "12345" (only 5 digits). The system shows: "NTN must be 8 digits. Current: 12345. Example: 12345678". He corrects it to "12345678" and proceeds.

### Scenario 3: Filing Deadline Reminder
It's January 15th. NexaBot sends a notification: "⚠️ GST return for December 2025 is due in 3 days (January 18th). You have 3 approved invoices pending FBR submission. File now?"

### Scenario 4: Retry Failed Submissions
3 invoices failed FBR submission due to API timeout. Ahmed clicks "Retry Failed" → system resubmits only the 3 failed invoices → all succeed. Status updates to "submitted".

### Scenario 5: Provincial Tax Return
Ahmed needs to file SRB return for Sindh. He selects "SRB" as tax authority, picks the month, and the system calculates: total SRB sales, total SRB tax, net payable. He submits to SRB portal.

---

## Functional Requirements

### FR-1: Batch FBR Submission
Submit multiple invoices to FBR in one action:
- **Selection**: Select invoices by status (pending/failed), date range, or individually
- **Parallel processing**: Submit 5 invoices at a time (FBR rate limit)
- **Progress tracking**: Show submitted/failed/pending counts in real-time
- **Error handling**: If one invoice fails, continue with others
- **Status update**: Each invoice gets individual FBR status (submitted/failed)
- **Output**: Summary report — "X submitted, Y failed, Z total"

### FR-2: NTN/STRN Validation
Validate tax registration numbers before saving:
- **NTN format**: exactly 8 digits (Pakistani National Tax Number)
- **STRN format**: exactly 13 characters (Sales Tax Registration Number)
- **Validation timing**: On blur in settings form, on submit in invoice creation
- **Error message**: Clear message with expected format and example
- **Server-side**: Also validate in server actions (not just client-side)

### FR-3: Filing Deadline Reminders
Notify users of upcoming tax filing deadlines:
- **GST return**: Due 18th of each month (for previous month)
- **Provincial returns**: Due 15th of each month (varies by province)
- **Reminder timing**: 7 days, 3 days, 1 day before deadline
- **Notification method**: NexaBot in-app notification
- **Content**: "GST return for [Month] is due in [X] days. [N] invoices pending submission."

### FR-4: FBR Status Dashboard
Track and display FBR submission status:
- **Summary cards**: Total submitted, pending, failed this month
- **Invoice list**: Filterable by FBR status (submitted/pending/failed)
- **Retry button**: Retry failed submissions individually or in batch
- **Detail view**: Click invoice to see FBR response, submission ID, timestamp
- **Export**: Download submission report as CSV

### FR-5: Provincial Tax Returns
Generate and submit provincial tax returns:
- **Tax authorities**: SRB (Sindh), PRA (Punjab), KPRA (KP), BRA (Balochistan)
- **Return generation**: Same as GST — calculate sales, tax, net payable by tax type
- **Submission**: Simulated (like FBR — no real provincial APIs available)
- **PDF export**: Same format as GST return PDF
- **Period**: Monthly

---

## Edge Cases

- **No invoices to submit**: Show "No pending invoices" message
- **API rate limit hit**: Queue remaining invoices, retry after delay
- **Network failure during batch**: Save progress, allow resume
- **Invalid NTN/STRN**: Block save, show clear error
- **Duplicate return prevention**: Already exists — prevent generating return for same period
- **Provincial tax with no data**: Show "No transactions found for this period"

---

## Out of Scope

- Real provincial tax authority API integration (simulated only)
- WHT return preparation (separate feature)
- Annual income tax return preparation
- Tax exemption certificate handling
- Inter-provincial supply tax rules

---

## Acceptance Criteria

- [ ] Batch submit processes 5 invoices at a time
- [ ] Batch submit shows real-time progress
- [ ] NTN validation rejects numbers that are not exactly 8 digits
- [ ] STRN validation rejects != 13 character strings
- [ ] Filing reminders appear 7, 3, 1 days before deadline
- [ ] Status dashboard shows accurate submission counts
- [ ] Retry mechanism resubmits only failed invoices
- [ ] Provincial returns calculate correctly by tax type
- [ ] All existing tax functionality continues to work
