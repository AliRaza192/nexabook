# Payroll Automation — Implementation Plan

## Context
Payroll system already has: employee CRUD, attendance tracking, payroll calculation engine, payslip generation, leave management, journal entries. Key gaps: EOBI is manual, Provident Fund always 0, no bonus support, no bank file export, departments are free-text.

**Goal:** Make payroll faster with auto-calculations (EOBI, PF), bonus support, and bank file export.

**Approach:** Enhance existing payroll engine + add departments entity + bank file export.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auto EOBI? | Yes — 1% employee, 6% employer | Pakistani law (EOBI Act 1992). Currently manual. |
| Provident Fund? | Yes — configurable % of basic | Common in Pakistani companies. Currently always 0. |
| Bonus support? | Yes — per-employee bonus input | Eid bonus, performance bonus common in Pakistan. |
| Bank file export? | Yes — CSV for bank upload | Pakistani banks accept CSV for salary disbursement. |
| Departments table? | Yes — proper entity | Currently free-text, leads to inconsistent data. |
| Payroll scheduling? | No — too complex for now | Keep manual run for now. |

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | **MODIFY** | Add `departments` table, add `pfDeduction` to employees/payslips |
| `src/lib/actions/hr-payroll.ts` | **MODIFY** | Auto EOBI, auto PF, bonus input, bank file export, departments CRUD |
| `src/components/payroll/bank-file-export.tsx` | **CREATE** | Bank file export component |
| `src/lib/payroll-automation.test.ts` | **CREATE** | Tests for auto EOBI, PF, bonus, bank file |

---

## Implementation Order

1. **Schema update** — add departments table, add pfDeduction columns
2. **Server actions** — auto EOBI, auto PF, bonus, departments CRUD, bank file export
3. **Bank file export component** — UI for selecting payroll run and exporting
4. **Tests** — unit tests for all logic
