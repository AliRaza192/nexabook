# Smart Invoicing — Implementation Tasks

## Phase 1: Server Actions
- [ ] Create `src/lib/actions/smart-invoice.ts` with analysis functions:
  - [ ] `getSmartDefaults(customerId, orgId)` — due date, order booker, warehouse, currency
  - [ ] `detectDuplicateInvoices(customerId, items, netAmount, orgId)` — check last 7 days
  - [ ] `getPricingSuggestions(productId, customerId, orgId)` — last sold, 30-day avg, customer range
  - [ ] `detectAnomalies(customerId, items, netAmount, orgId)` — high amount, new customer, bulk
  - [ ] `getPaymentPrediction(customerId, orgId)` — on-time rate, average days

## Phase 2: Smart Suggestions Component
- [ ] Create `src/components/smart-invoicing/smart-suggestions.tsx`:
  - [ ] Smart defaults banner (shows after customer selection)
  - [ ] Duplicate warning dialog (blocks save until acknowledged)
  - [ ] Pricing suggestion chips (clickable, per line item)
  - [ ] Anomaly warning banner (non-blocking)
  - [ ] Payment prediction badge (informational)

## Phase 3: Integration
- [ ] Modify `src/app/(dashboard)/sales/invoices/new/page.tsx`:
  - [ ] Import smart-invoice actions
  - [ ] Call getSmartDefaults when customer changes
  - [ ] Call detectDuplicateInvoices before save
  - [ ] Call getPricingSuggestions when product changes
  - [ ] Call detectAnomalies before save
  - [ ] Show getPaymentPrediction when customer changes

## Phase 4: Tests
- [ ] Create `src/lib/smart-invoice.test.ts`:
  - [ ] Test getSmartDefaults with existing customer
  - [ ] Test getSmartDefaults with new customer (no history)
  - [ ] Test detectDuplicateInvoices finds matches
  - [ ] Test detectDuplicateInvoices ignores old invoices
  - [ ] Test getPricingSuggestions returns correct prices
  - [ ] Test detectAnomalies flags high amounts
  - [ ] Test getPaymentPrediction calculates correctly

## Verification
- [ ] TypeScript: 0 errors
- [ ] Tests: all pass
- [ ] Existing invoice create flow still works
