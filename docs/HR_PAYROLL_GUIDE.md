# HR & Payroll Module - NexaBook

## Overview
Complete HR & Payroll management system with Pakistan-specific compliance logic for employee management, attendance tracking, payroll processing, and payslip generation.

## Features

### 1. Employee Management (`/hr-payroll/employees`)
- **Employee List View**: Professional table with search and filters
- **Add/Edit Employee Dialog**: Multi-tab form with:
  - **Personal Info**: Name, CNIC, Father's Name, Email, Phone, Address, City
  - **Job Info**: Department, Designation, Joining Date, Status, Bank Details
  - **Salary Structure**: Basic Salary, House Rent, Medical Allowance, Conveyance, Other Allowances, EOBI Deduction, Income Tax
- **Status Filters**: Active, On Leave, Terminated
- **Department Filters**: Dynamic dropdown based on existing departments

### 2. Attendance Management (`/hr-payroll/attendance`)
- **Daily Attendance Tracking**: Mark attendance for each employee
- **Attendance Status**: Present, Absent, Leave, Late, Half Day
- **Check-In/Check-Out**: Time tracking for working hours calculation
- **Bulk Actions**: "Mark All Present" button for quick entry
- **Attendance Summary**: Visual cards showing counts by status
- **Date Selection**: View and manage attendance for any date

### 3. Payroll Processing (`/hr-payroll/run`)
- **Monthly Payroll Generation**: 
  - Select month and year
  - Fetch all active employees
  - Calculate: Basic + Allowances - Deductions
  - Account for unpaid leaves based on attendance
- **Payroll Calculation Includes**:
  - Basic Salary
  - House Rent Allowance
  - Medical Allowance
  - Conveyance Allowance
  - Overtime Pay (1.5x hourly rate)
  - EOBI Deduction (1% employee, 6% employer)
  - Income Tax (Pakistan tax slabs)
  - Unpaid Leave Deduction
- **Approval Workflow**:
  - Review payroll details
  - Confirm & Approve button
  - Creates journal entries automatically
  - Generates individual payslips
- **Journal Entry Creation**:
  - Debit: Salaries & Wages Expense
  - Credit: Salaries Payable
  - Credit: Tax Deductions Payable (if applicable)

### 4. Payslip Reports (`/hr-payroll/reports`)
- **Payslip List**: View all payslips for a payroll run
- **Search**: Filter by employee name or code
- **Professional Payslip View**:
  - Company header
  - Employee information
  - Attendance summary
  - Earnings breakdown
  - Deductions breakdown
  - Net salary
  - Payment status
- **Print Functionality**: Print-ready layout
- **Payment Tracking**: Mark payslips as paid

## Database Schema

### employees
- `id`: UUID (primary key)
- `org_id`: UUID (references organizations)
- `employee_code`: String (unique)
- `full_name`: String
- `cnic`: String (Pakistani CNIC format: 12345-1234567-1)
- `father_name`: String
- `date_of_birth`: Timestamp
- `address`: Text
- `city`: String
- `department`: String
- `designation`: String
- `joining_date`: Timestamp
- `confirmation_date`: Timestamp
- `bank_name`: String
- `account_number`: String
- `branch_name`: String
- `basic_salary`: Decimal
- `house_rent`: Decimal
- `medical_allowance`: Decimal
- `conveyance_allowance`: Decimal
- `other_allowances`: Decimal
- `eobi_deduction`: Decimal
- `income_tax_deduction`: Decimal
- `status`: String (Active, On Leave, Terminated)
- `exit_date`: Timestamp
- `emergency_contact`: String
- `emergency_phone`: String
- `is_active`: Boolean

### attendance
- `id`: UUID (primary key)
- `org_id`: UUID (references organizations)
- `employee_id`: UUID (references employees)
- `date`: Timestamp
- `status`: String (Present, Absent, Leave, Late, Half Day)
- `check_in`: Timestamp
- `check_out`: Timestamp
- `working_hours`: Decimal
- `overtime`: Decimal
- `late_minutes`: Integer
- `notes`: Text

### payroll_runs
- `id`: UUID (primary key)
- `org_id`: UUID (references organizations)
- `month`: Integer (1-12)
- `year`: Integer
- `title`: String
- `total_employees`: Integer
- `total_gross`: Decimal
- `total_deductions`: Decimal
- `total_net`: Decimal
- `status`: String (Draft, Processing, Approved, Posted)
- `journal_entry_id`: UUID
- `processed_by`: String
- `approved_by`: String
- `approved_at`: Timestamp
- `notes`: Text

### payslips
- `id`: UUID (primary key)
- `org_id`: UUID (references organizations)
- `payroll_run_id`: UUID (references payroll_runs)
- `employee_id`: UUID (references employees)
- `employee_name`: String
- `employee_code`: String
- `designation`: String
- `department`: String
- `cnic`: String
- `bank_name`: String
- `account_number`: String
- **Earnings**:
  - `basic_salary`: Decimal
  - `house_rent`: Decimal
  - `medical_allowance`: Decimal
  - `conveyance_allowance`: Decimal
  - `other_allowances`: Decimal
  - `overtime_pay`: Decimal
  - `bonus`: Decimal
  - `total_earnings`: Decimal
- **Deductions**:
  - `eobi_deduction`: Decimal
  - `income_tax`: Decimal
  - `provident_fund`: Decimal
  - `other_deductions`: Decimal
  - `unpaid_leave_deduction`: Decimal
  - `total_deductions`: Decimal
- `net_salary`: Decimal
- **Attendance**:
  - `present_days`: Decimal
  - `absent_days`: Decimal
  - `leave_days`: Decimal
  - `unpaid_leave_days`: Decimal
  - `total_working_days`: Integer
- **Payment**:
  - `is_paid`: Boolean
  - `payment_date`: Timestamp
  - `payment_method`: String

## Pakistan Compliance Features

### 1. EOBI (Employees' Old-Age Benefits Institution)
- Employee contribution: 1% of basic salary
- Employer contribution: 6% of basic salary
- Tracked in employee profile and payslips

### 2. Income Tax Calculation
Automatic tax calculation based on Pakistan income tax slabs (FY 2025-26):
- Up to PKR 600,000: 0%
- PKR 600,001 - 1,200,000: 2.5%
- PKR 1,200,001 - 2,200,000: 15% + fixed
- PKR 2,200,001 - 3,200,000: 25% + fixed
- Above PKR 3,200,000: 35% + fixed

### 3. Working Days
- Standard: 26 working days per month
- Overtime rate: 1.5x hourly rate (as per labor laws)
- Unpaid leave deduction: Per-day salary × absent days

### 4. CNIC Tracking
- Pakistani CNIC format: 12345-1234567-1
- Mandatory field for all employees

### 5. Bank Account Details
- Bank name, account number, branch name
- Required for salary transfer

## Server Actions

### Employee Actions
- `getEmployees(status?, searchQuery?, department?)`: Fetch employees with filters
- `getEmployee(id)`: Get single employee details
- `createEmployee(data)`: Create new employee
- `updateEmployee(id, data)`: Update employee information
- `deleteEmployee(id)`: Soft delete employee

### Attendance Actions
- `getAttendance(startDate, endDate)`: Get attendance records for date range
- `markAttendance(records)`: Mark attendance for multiple employees

### Payroll Actions
- `getPayrollCalculations(month, year)`: Calculate payroll for all active employees
- `generateAndApprovePayroll(month, year, calculations)`: Process and approve payroll
- `getPayrollRuns()`: Get all payroll runs
- `getPayslips(payrollRunId)`: Get payslips for a payroll run
- `getPayslip(id)`: Get single payslip
- `markPayslipPaid(id, paymentMethod)`: Mark payslip as paid

### Utility Actions
- `getDepartments()`: Get list of departments

## UI/UX Design

### Theme Consistency
- **Primary Color**: Nexa-Blue (#0F172A / slate-900)
- **Secondary**: Blue-600 for action buttons
- **Background**: Slate-50
- **Cards**: White with slate-200 borders
- **Success**: Green shades
- **Danger**: Red shades
- **Warning**: Yellow shades

### Component Patterns
- Consistent with Invoicing and POS modules
- Card-based layouts with shadows
- Dialog forms with multi-tab support
- Badge status indicators
- Hover effects and transitions
- Responsive design

## Migration

Run the migration script to create/update database tables:

```bash
npx tsx scripts/migrate-hr-payroll.ts
```

Or manually run the SQL file:

```bash
psql -f drizzle/migrations/005_hr_payroll.sql
```

## Usage Workflow

1. **Add Employees**: Go to Employee Management → Add Employee
2. **Mark Attendance**: Go to Attendance Management → Select Date → Mark Status
3. **Run Payroll**: Go to Run Payroll → Select Month/Year → Generate → Approve
4. **View Payslips**: Go to Payslip Reports → Select Payroll Run → View/Print

## Future Enhancements

- [ ] Attendance import from CSV/Excel
- [ ] Leave management module
- [ ] Employee self-service portal
- [ ] Automated payroll email to employees
- [ ] Year-end tax certificate generation
- [ ] Provident fund management
- [ ] Loan management
- [ ] Performance review integration
