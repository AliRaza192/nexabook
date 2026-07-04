# Auto Tax Filing — Implementation Tasks

## Phase 1: Server Actions
- [ ] Create `src/lib/actions/tax-filing.ts`:
  - [ ] `batchSubmitToFBR(invoiceIds, orgId)` — submit multiple invoices in parallel (5 at a time)
  - [ ] `retryFailedSubmissions(orgId)` — retry all failed FBR submissions
  - [ ] `validateNTN(ntn)` — validate NTN format (5-7 digits)
  - [ ] `validateSTRN(strn)` — validate STRN format (13 characters)
  - [ ] `getFilingDeadlines(orgId)` — calculate upcoming deadlines
  - [ ] `generateProvincialReturn(taxAuthority, year, month, orgId)` — generate SRB/PRA/KPRA/BRA return
  - [ ] `getFBRSubmissionStats(orgId)` — get submission status counts
  - [ ] `getFBRSubmissions(orgId, status?, pagination?)` — list submissions with filter

## Phase 2: Status Dashboard
- [ ] Create `src/components/tax-filing/fbr-status-dashboard.tsx`:
  - [ ] Summary cards: submitted, pending, failed
  - [ ] Invoice list with status filter
  - [ ] Retry failed button
  - [ ] Detail view for each submission
  - [ ] CSV export

## Phase 3: Filing Reminders
- [ ] Create `src/components/tax-filing/filing-reminders.tsx`:
  - [ ] Calculate days until deadline
  - [ ] Show reminder banner with urgency color
  - [ ] Link to tax returns page

## Phase 4: Integration
- [ ] Modify `src/app/(dashboard)/reports/tax-returns/page.tsx`:
  - [ ] Add batch submit button
  - [ ] Add status dashboard component
  - [ ] Add filing reminders component
- [ ] Modify `src/app/(dashboard)/settings/page.tsx`:
  - [ ] Add NTN/STRN validation

## Phase 5: Tests
- [ ] Create `src/lib/tax-filing.test.ts`:
  - [ ] Test batch submission logic
  - [ ] Test NTN validation (valid/invalid)
  - [ ] Test STRN validation (valid/invalid)
  - [ ] Test filing deadline calculation
  - [ ] Test provincial return calculation

## Verification
- [ ] TypeScript: 0 errors
- [ ] Tests: all pass
- [ ] Existing tax returns still work
