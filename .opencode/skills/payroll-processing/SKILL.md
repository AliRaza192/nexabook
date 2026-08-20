---
name: payroll-processing
description: >
  Processes monthly payroll with EOBI, PF, income tax deductions, and payslip generation.
  Use when: "process payroll", "salary calculate", "payroll run", "payslip",
  "salary banao", "payroll process karo", "employee salary", " EOBI calculate".
  Do NOT use for: employee management, attendance tracking, or leave applications.
---

# Payroll Processing Skill

## Goal

Accurately process monthly payroll with Pakistani labor law compliance: EOBI contributions, Provident Fund deductions, income tax calculation, and professional payslip generation.

## When to Use

- User wants to run monthly payroll
- User says "salary process karo" or "payroll banao"
- User wants to calculate employee take-home pay
- User wants to generate payslips

## Instructions

### Step 1: Select Payroll Period

- Define month/year for payroll
- Check if payroll already run for this period (prevent duplicates)
- Lock attendance data for the period

### Step 2: Gather Employee Data

For each active employee:
- Basic salary
- Allowances (house rent, transport, medical, etc.)
- Deductions (loan installments, advances, etc.)
- Attendance record (present days, absent days, late, overtime)
- EOBI registration status
- PF registration status (if applicable)

### Step 3: Calculate Gross Salary

```
Gross Salary = Basic Salary + All Allowances

Example:
Basic Salary:        100,000
House Allowance:      30,000
Transport Allowance:  10,000
Medical Allowance:     5,000
─────────────────────────────
Gross Salary:        145,000
```

### Step 4: Calculate EOBI Deduction

**EOBI (Employees' Old-Age Benefits Institution):**

Employee contribution: **1%** of minimum wages (capped)
Employer contribution: **5%** of minimum wages (capped)

Current minimum wages (verify current rate):
- Employee: Rs. 315/month
- Employer: Rs. 1,890/month

```
EOBI Employee = 315
EOBI Employer = 1,890
```

### Step 5: Calculate Provident Fund (if applicable)

PF contribution (if organization has PF scheme):
- Employee: **8.33%** of basic salary
- Employer: **8.33%** of basic salary (matching)

```
PF Employee = Basic × 8.33%
PF Employer = Basic × 8.33%
```

### Step 6: Calculate Income Tax

Pakistan income tax slabs (FY 2025-26, verify current):

```
Up to Rs. 600,000:        0%
Rs. 600,001 - 1,200,000:  5% of excess over 600,000
Rs. 1,200,001 - 1,800,000: Rs. 30,000 + 10% of excess over 1,200,000
Rs. 1,800,001 - 2,500,000: Rs. 90,000 + 15% of excess over 1,800,000
Rs. 2,500,001 - 3,500,000: Rs. 195,000 + 17.5% of excess over 2,500,000
Rs. 3,500,001 - 5,000,000: Rs. 370,000 + 20% of excess over 3,500,000
Above Rs. 5,000,000:      Rs. 670,000 + 22.5% of excess over 5,000,000
```

Annual tax = slab calculation
Monthly tax deduction = Annual tax / 12

### Step 7: Calculate Other Deductions

```
Deductions:
- EOBI (Employee share):    315
- PF (Employee share):      8,333
- Income Tax:              12,500
- Loan Installment:         5,000 (if applicable)
- Advance Recovery:         2,000 (if applicable)
────────────────────────────────────
Total Deductions:          28,148
```

### Step 8: Calculate Net Salary

```
Net Salary = Gross Salary - Total Deductions
           = 145,000 - 28,148
           = 116,852
```

### Step 9: Create Payroll Run

Insert into `payrollRuns` table:
- `month`, `year`
- `totalEmployees`
- `totalGross`
- `totalDeductions`
- `totalNet`
- `status` = 'DRAFT'

### Step 10: Create Payslips

For each employee, insert into `payslips` table:
- `payrollRunId`, `employeeId`
- `basicSalary`, `allowances`, `grossSalary`
- `eobiDeduction`, `pfDeduction`, `incomeTax`
- `otherDeductions`, `totalDeductions`
- `netSalary`
- `status` = 'DRAFT'

### Step 11: Create Journal Entry

```
Dr. Salary Expense (Gross)     145,000
    Cr. EOBI Payable (Employer)       1,890
    Cr. PF Payable (Employer)         8,333
    Cr. EOBI Payable (Employee)         315
    Cr. PF Payable (Employee)          8,333
    Cr. Income Tax Payable           12,500
    Cr. Bank Account                116,852
```

### Step 12: Generate Payslip PDF

For each payslip:
1. Calculate all amounts
2. Generate PDF with company logo
3. Include all deductions breakdown
4. Include bank details for salary transfer
5. Save to `public/payslips/` directory

### Step 13: Bank Transfer File

Generate bank file for salary transfer:
1. Get bank account details from employees
2. Generate IBFT file in bank format
3. Include employee name, account number, amount
4. Save for review before upload to bank

## Edge Cases

- **Mid-month join:** Pro-rata salary (days worked / total days)
- **Mid-month exit:** Full month salary, final settlement separate
- **Multiple departments:** Separate payslips per department
- **Overtime:** Calculate at 1.5x or 2x rate as per policy
- **Late deductions:** Per organization policy (e.g., Rs. 500 per late)
- **Absent without leave:** Deduct daily rate × absent days
- **Advance recovery:** Deduct installment amount
- **Loan recovery:** Deduct installment amount

## References

- [EOBI Rates](references/eobi-rates.md)
- [Income Tax Slabs](references/tax-slabs.md)
- [PF Rules](references/pf-rules.md)
