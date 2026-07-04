# Payroll Automation — Implementation Tasks

## Phase 1: Schema & Server Actions
- [ ] Add `pfDeduction` column to `employees` and `payslips` tables in schema.ts
- [ ] Auto EOBI calculation in `getPayrollCalculations()` — 1% employee, 6% employer
- [ ] Auto PF calculation — configurable rate per org
- [ ] Bonus input support — add bonus field to PayrollCalculation interface
- [ ] Bank file export function — generate CSV from payroll run
- [ ] Departments CRUD — create, list, update, delete departments

## Phase 2: Bank File Export Component
- [ ] Create `src/components/payroll/bank-file-export.tsx`:
  - [ ] Select payroll run
  - [ ] Preview employees with bank details
  - [ ] Export CSV button
  - [ ] Show skipped employees (no bank details)

## Phase 3: Tests
- [ ] Create `src/lib/payroll-automation.test.ts`:
  - [ ] Test EOBI auto-calculation (1% employee, 6% employer)
  - [ ] Test EOBI ceiling (minimum wage)
  - [ ] Test PF auto-calculation
  - [ ] Test bonus inclusion in total earnings
  - [ ] Test bank file CSV generation
  - [ ] Test department CRUD

## Verification
- [ ] TypeScript: 0 errors
- [ ] Tests: all pass
- [ ] Existing payroll run still works
- [ ] Payslip shows new fields correctly
