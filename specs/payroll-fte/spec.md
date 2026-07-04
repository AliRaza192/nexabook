# spec.md — Payroll FTE

## Goal

Automate Pakistani payroll processing for SMEs: salary calculation, EOBI contributions, income tax deduction, payslip generation, and disbursement tracking. Ensure employees are paid correctly and compliantly every month.

## User Scenarios

- When a new employee is added, then salary structure is defined (basic, allowances, deductions)
- When month-end arrives, then salary is auto-calculated with all applicable deductions
- When salary is processed, then EOBI employer and employee contributions are calculated
- When income tax threshold is crossed, then tax is deducted per FBR slabs
- When salary is disbursed, then payment record is created and accounting entry generated
- When payslip is needed, then PDF is generated and available for download or email

## Functional Requirements

### FR-1: Salary Structure Definition
- Define salary components for each employee:
  - **Basic Salary** (fully taxable)
  - **House Rent Allowance (HRA)** (exempt up to 45% of basic per FBR)
  - **Medical Allowance** (exempt up to Rs. 15,000 per month)
  - **Conveyance Allowance** (exempt up to Rs. 20,000 per month)
  - **Utility Allowance** (taxable)
  - **Other Allowances** (taxable)
- Define deductions for each employee:
  - **EOBI Employee contribution** (1% of minimum wage)
  - **Income Tax** (per FBR annual tax slabs, monthly equivalent)
  - **Advance or Loan Recovery** (fixed monthly installment)
  - **Other Deductions** (as configured)

### FR-2: Monthly Salary Processing
- Auto-calculate gross salary from configured components
- Apply tax-exempt allowances to reduce taxable income
- Calculate taxable income (Gross minus exempt allowances)
- Apply FBR income tax slabs (2025-26 rates):
  - Up to Rs. 600,000 annual: 0%
  - Rs. 600,001 to 1,200,000: 5%
  - Rs. 1,200,001 to 1,800,000: 10%
  - Rs. 1,800,001 to 2,500,000: 15%
  - Rs. 2,500,001 to 3,500,000: 20%
  - Rs. 3,500,001 to 5,000,000: 25%
  - Above Rs. 5,000,000: 30% (with applicable surcharge)
- Calculate net salary: Gross Salary minus Total Deductions
- Generate accounting journal entry: Debit Salary Expense, Credit Salary Payable

### FR-3: EOBI Contributions
- **EOBI Employee:** 1% of current minimum wage (Rs. 25,000) = Rs. 250 per month
- **EOBI Employer:** 5% of current minimum wage = Rs. 1,250 per month
- Track EOBI payment status (paid/unpaid) per month
- Generate EOBI contribution report for submission

### FR-4: Payslip Generation
- Generate monthly payslip as downloadable PDF
- Include on payslip: employee name, designation, employee ID, month/year
- Include: basic salary, each allowance with amount, each deduction with amount
- Include: gross salary, total deductions, net pay
- Include: EOBI contribution, income tax deducted
- Store payslip record in database
- Email payslip to employee via Resend (if email configured)

### FR-5: Salary Disbursement
- Track salary payment status per employee per month (pending/paid)
- Record payment date and method (bank transfer, cash, cheque)
- Generate bank transfer CSV file for bulk salary payments
- Create accounting entry for salary payment: Debit Salary Payable, Credit Bank/Cash

### FR-6: Employee Management
- Employee profile: name, CNIC, designation, department, joining date
- Employment history: promotions, transfers, salary revisions
- Leave tracking: annual, casual, sick leave balances
- Loan and advance tracking: amount, installment, recovery schedule
- Full and final settlement for departing employees

## Edge Cases

- Employee joining mid-month (pro-rata salary for days worked)
- Employee leaving mid-month (full and final settlement within 7 days)
- Multiple employees with same CNIC (block duplicate, warn)
- Salary advance recovery spread over multiple months
- Overtime calculation (hourly rate based on basic/30/8)
- Gratuity calculation (30 days basic salary per completed year of service)
- Leave without pay (deduct from gross salary)
- Minimum wage compliance (Rs. 25,000 — block salary below this)
- Employee with zero basic (invalid, block with error)

## Out of Scope

- Time and attendance system (manual entry for now)
- Performance management or appraisals
- Benefits management (insurance, provident fund)
- Multi-currency payroll (PKR only)
- Statutory filing (EOBI/PESSI submission — data preparation only)
- Gratuity fund management

## Acceptance Criteria

- [ ] Salary calculated correctly: Basic plus Allowances minus Deductions equals Net
- [ ] Income tax calculated per current FBR slabs (mathematical accuracy)
- [ ] EOBI calculated correctly: 1% employee, 5% employer of minimum wage
- [ ] Payslip PDF generated with all components and correct amounts
- [ ] Journal entries generated for salary expense and payment
- [ ] All payroll queries filter by `orgId`
- [ ] Minimum wage compliance enforced (Rs. 25,000 floor)
- [ ] Mid-month joining/leaving pro-rated correctly (days worked / 30)
- [ ] TypeScript: 0 errors
- [ ] All tests pass (`npm run test`)

## Skills

### payroll-salary-calculation
**Description:** Calculates monthly salary with all components and deductions. Fires on month-end or manual salary process request.
- Input: Employee salary structure, tax slabs, EOBI rates
- Output: Calculated salary with breakdown
- Guard: Never calculate salary below minimum wage

### payroll-eobi
**Description:** Calculates EOBI employer and employee contributions. Fires alongside salary calculation.
- Input: Employee count, minimum wage rate
- Output: EOBI amounts per employee and totals
- Guard: Always use current minimum wage rate

### payroll-payslip
**Description:** Generates payslip PDF for employees. Fires on salary processing or manual request.
- Input: Calculated salary data
- Output: Formatted PDF payslip
- Guard: Always include all components, never omit deductions

### payroll-disbursement
**Description:** Tracks salary payments and generates bank transfer files. Fires on payment processing.
- Input: Payment details, bank information
- Output: Payment record, CSV file for bank
- Guard: Never mark as paid without payment confirmation
