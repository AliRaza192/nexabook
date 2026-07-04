# Payroll Automation — Feature Specification

## Goal
Make payroll processing faster and more accurate with automatic EOBI calculation, Provident Fund support, bonus input, and bank file export for salary disbursement.

---

## User Scenarios

### Scenario 1: Auto EOBI Calculation
HR runs payroll for January 2026. For employee "Ahmed" with basic salary Rs. 50,000:
- Employee EOBI (1%): Rs. 500 (auto-calculated)
- Employer EOBI (5%): Rs. 2,500 (tracked as expense)
- Previously: HR had to manually enter Rs. 500 per employee

### Scenario 2: Provident Fund
Company policy: 8.33% of basic salary as Provident Fund deduction. HR enables PF in settings, sets rate to 8.33%. When payroll runs:
- PF Deduction = Rs. 50,000 × 8.33% = Rs. 4,165 (auto-calculated)
- Shown on payslip as "Provident Fund"

### Scenario 3: Eid Bonus
It's Eid. HR adds Rs. 25,000 bonus for each employee. In the payroll run, HR clicks "Add Bonus" → enters amount per employee → bonus is included in earnings and payslip.

### Scenario 4: Bank File Export
Payroll is approved. HR clicks "Export Bank File" → downloads a CSV file with columns: Employee Name, Bank Name, Account Number, Amount. HR uploads this to HBL's online portal for salary disbursement.

### Scenario 5: Department Management
Admin creates departments: Sales, Marketing, Finance, HR, IT. When adding an employee, admin selects department from dropdown (no more free-text typos).

---

## Functional Requirements

### FR-1: Auto EOBI Calculation
Automatically calculate EOBI deduction based on basic salary:
- **Employee share**: 1% of basic salary (capped at minimum wage ceiling)
- **Employer share**: 5% of basic salary (tracked as employer expense)
- **Minimum wage ceiling**: Rs. 25,000 (EOBI minimum pensionable salary)
- **Behavior**: Auto-calculate when payroll runs, override manual entry if set
- **Payslip**: Show "EOBI (1%)" as deduction, "Employer EOBI (5%)" as info

### FR-2: Provident Fund Support
Support Provident Fund deduction:
- **Configurable rate**: Organization sets PF rate (e.g., 8.33%, 10%)
- **Calculation**: basicSalary × PF rate
- **Payslip**: Show "Provident Fund" as deduction
- **Journal entry**: Credit to PF payable account

### FR-3: Bonus Support
Allow bonus input per employee:
- **Input**: Per-employee bonus amount during payroll run
- **Types**: Eid bonus, performance bonus, festival bonus
- **Earnings**: Added to total earnings
- **Payslip**: Show "Bonus" as earning line
- **Tax**: Bonus is taxable (included in annual salary for tax calc)

### FR-4: Bank File Export
Export salary disbursement file for bank upload:
- **Format**: CSV with columns: Employee Name, Bank Name, Account Number, Branch Name, Amount
- **Filter**: By payroll run (select which month to export)
- **Amount**: Net salary per employee
- **Validation**: Skip employees without bank details
- **Download**: CSV file ready for bank portal upload

### FR-5: Department Management
Create and manage departments as proper entities:
- **CRUD**: Create, read, update, delete departments
- **Fields**: Name, description, manager (optional employee reference)
- **Employee link**: Employee department becomes a FK to departments table
- **Reporting**: Department-wise payroll summary

---

## Edge Cases

- **No bank details**: Skip employee in bank file export, show warning
- **EOBI ceiling exceeded**: Cap at minimum wage ceiling (Rs. 25,000)
- **PF rate changes mid-year**: Use current rate for current payroll
- **Bonus exceeds salary**: Allow (some companies give 2x salary as bonus)
- **No departments created**: Fall back to free-text department field
- **Employee has no attendance data**: Use full month (26 days) for calculation

---

## Out of Scope

- Real bank API integration (CSV export only)
- Multi-currency payroll (PKR only)
- Gratuity calculation
- Pension fund management
- Payroll scheduling (auto-run on date)

---

## Acceptance Criteria

- [ ] EOBI auto-calculates as 1% of basic (employee) and 5% (employer)
- [ ] EOBI respects minimum wage ceiling
- [ ] Provident Fund auto-calculates based on configured rate
- [ ] Bonus can be added per employee during payroll run
- [ ] Bank file export generates valid CSV for bank upload
- [ ] Bank file skips employees without bank details
- [ ] Departments can be created and assigned to employees
- [ ] All existing payroll functionality continues to work
- [ ] Payslip shows all earnings and deductions correctly
