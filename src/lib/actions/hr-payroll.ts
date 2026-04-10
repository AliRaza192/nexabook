"use server";

import { db } from "@/db";
import {
  employees,
  attendance,
  payrollRuns,
  payslips,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  auditLogs,
  profiles,
  organizations,
} from "@/db/schema";
import { eq, and, desc, asc, ilike, or, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper function to get current user's orgId
async function getCurrentOrgId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const userProfile = await db
      .select({ orgId: profiles.orgId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length > 0 && userProfile[0].orgId) {
      return userProfile[0].orgId;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Helper: Get current user name
async function getCurrentUserName(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const userProfile = await db
      .select({ fullName: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length > 0) {
      return userProfile[0].fullName;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ============ Employee Actions ============

export type EmployeeFormData = {
  employeeCode: string;
  fullName: string;
  email?: string;
  phone?: string;
  cnic?: string;
  fatherName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  department?: string;
  designation?: string;
  joiningDate: string;
  confirmationDate?: string;
  bankName?: string;
  accountNumber?: string;
  branchName?: string;
  basicSalary: string;
  houseRent: string;
  medicalAllowance: string;
  conveyanceAllowance: string;
  otherAllowances: string;
  eobiDeduction: string;
  incomeTaxDeduction: string;
  status: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

// Get all employees
export async function getEmployees(status?: string, searchQuery?: string, department?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(employees.orgId, orgId)];

    if (status && status !== "all") {
      conditions.push(eq(employees.status, status));
    }

    if (department && department !== "all") {
      conditions.push(eq(employees.department, department));
    }

    if (searchQuery) {
      conditions.push(
        or(
          ilike(employees.fullName, `%${searchQuery}%`),
          ilike(employees.employeeCode, `%${searchQuery}%`),
          ilike(employees.cnic, `%${searchQuery}%`)
        )!
      );
    }

    const result = await db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(employees.fullName);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch employees" };
  }
}

// Get single employee
export async function getEmployee(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.orgId, orgId)))
      .limit(1);

    if (result.length === 0) return { success: false, error: "Employee not found" };

    return { success: true, data: result[0] };
  } catch (error) {
    return { success: false, error: "Failed to fetch employee" };
  }
}

// Create employee
export async function createEmployee(data: EmployeeFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const [newEmployee] = await db
      .insert(employees)
      .values({
        orgId,
        employeeCode: data.employeeCode,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        cnic: data.cnic || null,
        fatherName: data.fatherName || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address || null,
        city: data.city || null,
        department: data.department || null,
        designation: data.designation || null,
        joiningDate: new Date(data.joiningDate),
        confirmationDate: data.confirmationDate ? new Date(data.confirmationDate) : null,
        bankName: data.bankName || null,
        accountNumber: data.accountNumber || null,
        branchName: data.branchName || null,
        basicSalary: data.basicSalary,
        houseRent: data.houseRent,
        medicalAllowance: data.medicalAllowance,
        conveyanceAllowance: data.conveyanceAllowance,
        otherAllowances: data.otherAllowances,
        eobiDeduction: data.eobiDeduction,
        incomeTaxDeduction: data.incomeTaxDeduction,
        status: data.status,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'employee',
      entityId: newEmployee.id,
      changes: JSON.stringify({ employeeCode: newEmployee.employeeCode, fullName: newEmployee.fullName }),
    });

    revalidatePath('/hr-payroll/employees');
    return { success: true, data: newEmployee, message: "Employee created successfully" };
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: "Employee code already exists" };
    }
    return { success: false, error: "Failed to create employee" };
  }
}

// Update employee
export async function updateEmployee(id: string, data: EmployeeFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const [updatedEmployee] = await db
      .update(employees)
      .set({
        employeeCode: data.employeeCode,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        cnic: data.cnic || null,
        fatherName: data.fatherName || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address || null,
        city: data.city || null,
        department: data.department || null,
        designation: data.designation || null,
        joiningDate: new Date(data.joiningDate),
        confirmationDate: data.confirmationDate ? new Date(data.confirmationDate) : null,
        bankName: data.bankName || null,
        accountNumber: data.accountNumber || null,
        branchName: data.branchName || null,
        basicSalary: data.basicSalary,
        houseRent: data.houseRent,
        medicalAllowance: data.medicalAllowance,
        conveyanceAllowance: data.conveyanceAllowance,
        otherAllowances: data.otherAllowances,
        eobiDeduction: data.eobiDeduction,
        incomeTaxDeduction: data.incomeTaxDeduction,
        status: data.status,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        updatedAt: new Date(),
      })
      .where(and(eq(employees.id, id), eq(employees.orgId, orgId)))
      .returning();

    if (!updatedEmployee) return { success: false, error: "Employee not found" };

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'employee',
      entityId: updatedEmployee.id,
      changes: JSON.stringify({ employeeCode: updatedEmployee.employeeCode, fullName: updatedEmployee.fullName }),
    });

    revalidatePath('/hr-payroll/employees');
    return { success: true, data: updatedEmployee, message: "Employee updated successfully" };
  } catch (error: any) {
    if (error.code === '23505') {
      return { success: false, error: "Employee code already exists" };
    }
    return { success: false, error: "Failed to update employee" };
  }
}

// Delete employee (soft delete)
export async function deleteEmployee(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    await db
      .update(employees)
      .set({ isActive: false, status: 'Terminated', exitDate: new Date(), updatedAt: new Date() })
      .where(and(eq(employees.id, id), eq(employees.orgId, orgId)));

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'EMPLOYEE_DELETED',
      entityType: 'employee',
      entityId: id,
      changes: JSON.stringify({ action: 'soft_delete' }),
    });

    revalidatePath('/hr-payroll/employees');
    return { success: true, message: "Employee removed successfully" };
  } catch (error) {
    return { success: false, error: "Failed to remove employee" };
  }
}

// ============ Attendance Actions ============

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Late' | 'Half Day';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

// Get attendance records for a date range
export async function getAttendance(startDate: string, endDate: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        designation: employees.designation,
        department: employees.department,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingHours: attendance.workingHours,
        overtime: attendance.overtime,
        lateMinutes: attendance.lateMinutes,
        notes: attendance.notes,
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .where(and(
        eq(attendance.orgId, orgId),
        gte(attendance.date, new Date(startDate)),
        lte(attendance.date, new Date(endDate))
      ))
      .orderBy(attendance.date, employees.fullName);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch attendance" };
  }
}

// Mark attendance for a day
export async function markAttendance(records: AttendanceRecord[]) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    for (const record of records) {
      const checkIn = record.checkIn ? new Date(record.checkIn) : null;
      const checkOut = record.checkOut ? new Date(record.checkOut) : null;
      
      // Calculate working hours
      let workingHours = null;
      if (checkIn && checkOut) {
        workingHours = ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);
      }

      // Calculate late minutes
      let lateMinutes = 0;
      if (record.status === 'Late' && checkIn) {
        const expectedTime = new Date(record.date);
        expectedTime.setHours(9, 0, 0, 0); // 9 AM expected
        lateMinutes = Math.max(0, Math.floor((checkIn.getTime() - expectedTime.getTime()) / (1000 * 60)));
      }

      await db
        .insert(attendance)
        .values({
          orgId,
          employeeId: record.employeeId,
          date: new Date(record.date),
          status: record.status,
          checkIn,
          checkOut,
          workingHours,
          lateMinutes,
          notes: record.notes || null,
        })
        .onConflictDoUpdate({
          target: [attendance.employeeId, attendance.date],
          set: {
            status: record.status,
            checkIn,
            checkOut,
            workingHours,
            lateMinutes,
            notes: record.notes || null,
            updatedAt: new Date(),
          },
        });
    }

    revalidatePath('/hr-payroll/attendance');
    return { success: true, message: `Attendance marked for ${records.length} employees` };
  } catch (error) {
    return { success: false, error: "Failed to mark attendance" };
  }
}

// ============ Payroll Processing Actions ============

export interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  cnic: string | null;
  bankName: string | null;
  accountNumber: string | null;
  basicSalary: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  overtimePay: number;
  bonus: number;
  totalEarnings: number;
  eobiDeduction: number;
  incomeTax: number;
  providentFund: number;
  otherDeductions: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  totalWorkingDays: number;
}

// Get payroll calculations for a month
export async function getPayrollCalculations(month: number, year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get all active employees
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(and(
        eq(employees.orgId, orgId),
        eq(employees.status, 'Active'),
        eq(employees.isActive, true)
      ))
      .orderBy(employees.fullName);

    if (activeEmployees.length === 0) {
      return { success: false, error: "No active employees found" };
    }

    // Get attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const attendanceRecords = await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.orgId, orgId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ));

    // Calculate payroll for each employee
    const calculations: PayrollCalculation[] = [];

    for (const emp of activeEmployees) {
      const basicSalary = parseFloat(emp.basicSalary || '0');
      const houseRent = parseFloat(emp.houseRent || '0');
      const medicalAllowance = parseFloat(emp.medicalAllowance || '0');
      const conveyanceAllowance = parseFloat(emp.conveyanceAllowance || '0');
      const otherAllowances = parseFloat(emp.otherAllowances || '0');
      const eobiDeduction = parseFloat(emp.eobiDeduction || '0');
      const incomeTaxDeduction = parseFloat(emp.incomeTaxDeduction || '0');

      // Get attendance stats for this employee
      const empAttendance = attendanceRecords.filter(a => a.employeeId === emp.id);
      const presentDays = empAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const absentDays = empAttendance.filter(a => a.status === 'Absent').length;
      const leaveDays = empAttendance.filter(a => a.status === 'Leave').length;
      const unpaidLeaveDays = empAttendance.filter(a => a.status === 'Half Day').length * 0.5;
      const totalWorkingDays = 26; // Standard working days in Pakistan

      // Calculate overtime
      const totalOvertime = empAttendance.reduce((sum, a) => sum + parseFloat(a.overtime || '0'), 0);
      const overtimeRate = basicSalary / (totalWorkingDays * 8) * 1.5; // 1.5x hourly rate
      const overtimePay = totalOvertime * overtimeRate;

      // Calculate unpaid leave deduction
      const perDaySalary = basicSalary / totalWorkingDays;
      const unpaidLeaveDeduction = (absentDays * 0.5 + unpaidLeaveDays) * perDaySalary;

      // Calculate income tax (Pakistan tax slabs - simplified)
      let incomeTax = incomeTaxDeduction;
      if (incomeTaxDeduction === 0 && basicSalary > 0) {
        const annualSalary = basicSalary * 12;
        if (annualSalary <= 600000) {
          incomeTax = 0;
        } else if (annualSalary <= 1200000) {
          incomeTax = (annualSalary - 600000) * 0.025 / 12;
        } else if (annualSalary <= 2200000) {
          incomeTax = (15000 + (annualSalary - 1200000) * 0.15) / 12;
        } else if (annualSalary <= 3200000) {
          incomeTax = (165000 + (annualSalary - 2200000) * 0.25) / 12;
        } else {
          incomeTax = (415000 + (annualSalary - 3200000) * 0.35) / 12;
        }
      }

      // Total earnings
      const totalEarnings = basicSalary + houseRent + medicalAllowance + conveyanceAllowance + otherAllowances + overtimePay;
      
      // Total deductions
      const totalDeductions = eobiDeduction + incomeTax + unpaidLeaveDeduction;

      // Net salary
      const netSalary = totalEarnings - totalDeductions;

      calculations.push({
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        designation: emp.designation,
        department: emp.department,
        cnic: emp.cnic,
        bankName: emp.bankName,
        accountNumber: emp.accountNumber,
        basicSalary,
        houseRent,
        medicalAllowance,
        conveyanceAllowance,
        otherAllowances,
        overtimePay: Math.round(overtimePay * 100) / 100,
        bonus: 0,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        eobiDeduction,
        incomeTax: Math.round(incomeTax * 100) / 100,
        providentFund: 0,
        otherDeductions: 0,
        unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        presentDays,
        absentDays,
        leaveDays,
        unpaidLeaveDays,
        totalWorkingDays,
      });
    }

    return { success: true, data: calculations };
  } catch (error) {
    return { success: false, error: "Failed to calculate payroll" };
  }
}

// Generate and approve payroll
export async function generateAndApprovePayroll(month: number, year: number, calculations: PayrollCalculation[]) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const userName = await getCurrentUserName();

    // Check if payroll already exists for this month
    const existingPayroll = await db
      .select()
      .from(payrollRuns)
      .where(and(
        eq(payrollRuns.orgId, orgId),
        eq(payrollRuns.month, month),
        eq(payrollRuns.year, year)
      ))
      .limit(1);

    if (existingPayroll.length > 0 && existingPayroll[0].status !== 'Draft') {
      return { success: false, error: "Payroll already exists and has been approved for this month" };
    }

    // Calculate totals
    const totalGross = calculations.reduce((sum, c) => sum + c.totalEarnings, 0);
    const totalDeductions = calculations.reduce((sum, c) => sum + c.totalDeductions, 0);
    const totalNet = calculations.reduce((sum, c) => sum + c.netSalary, 0);

    let payrollRunId: string;

    if (existingPayroll.length > 0) {
      // Update existing draft
      payrollRunId = existingPayroll[0].id;
      await db
        .update(payrollRuns)
        .set({
          totalEmployees: calculations.length,
          totalGross: totalGross.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          totalNet: totalNet.toFixed(2),
          status: 'Approved',
          approvedBy: userName || undefined,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payrollRuns.id, payrollRunId));

      // Delete old payslips
      await db
        .delete(payslips)
        .where(eq(payslips.payrollRunId, payrollRunId));
    } else {
      // Create new payroll run
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const [payrollRun] = await db
        .insert(payrollRuns)
        .values({
          orgId,
          month,
          year,
          title: `${monthNames[month - 1]} ${year} Payroll`,
          totalEmployees: calculations.length,
          totalGross: totalGross.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          totalNet: totalNet.toFixed(2),
          status: 'Approved',
          processedBy: userName || undefined,
          approvedBy: userName || undefined,
          approvedAt: new Date(),
        })
        .returning({ id: payrollRuns.id });

      payrollRunId = payrollRun.id;
    }

    // Create payslips
    for (const calc of calculations) {
      await db.insert(payslips).values({
        orgId,
        payrollRunId,
        employeeId: calc.employeeId,
        employeeName: calc.employeeName,
        employeeCode: calc.employeeCode,
        designation: calc.designation,
        department: calc.department,
        cnic: calc.cnic,
        bankName: calc.bankName,
        accountNumber: calc.accountNumber,
        basicSalary: calc.basicSalary.toFixed(2),
        houseRent: calc.houseRent.toFixed(2),
        medicalAllowance: calc.medicalAllowance.toFixed(2),
        conveyanceAllowance: calc.conveyanceAllowance.toFixed(2),
        otherAllowances: calc.otherAllowances.toFixed(2),
        overtimePay: calc.overtimePay.toFixed(2),
        bonus: calc.bonus.toFixed(2),
        totalEarnings: calc.totalEarnings.toFixed(2),
        eobiDeduction: calc.eobiDeduction.toFixed(2),
        incomeTax: calc.incomeTax.toFixed(2),
        providentFund: calc.providentFund.toFixed(2),
        otherDeductions: calc.otherDeductions.toFixed(2),
        unpaidLeaveDeduction: calc.unpaidLeaveDeduction.toFixed(2),
        totalDeductions: calc.totalDeductions.toFixed(2),
        netSalary: calc.netSalary.toFixed(2),
        presentDays: calc.presentDays.toFixed(2),
        absentDays: calc.absentDays.toFixed(2),
        leaveDays: calc.leaveDays.toFixed(2),
        unpaidLeaveDays: calc.unpaidLeaveDays.toFixed(2),
        totalWorkingDays: calc.totalWorkingDays,
      });
    }

    // Create journal entry
    const entryNumber = `PAYROLL-${year}-${String(month).padStart(2, '0')}-${Date.now()}`;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        orgId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'payroll',
        referenceId: payrollRunId,
        description: `Payroll for ${monthNames[month - 1]} ${year} - Total: PKR ${totalNet.toFixed(2)}`,
      })
      .returning();

    // Find accounts
    const [salaryExpenseAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Salaries & Wages Expense')
      ))
      .limit(1);

    const [salariesPayableAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.name, 'Salaries Payable')
      ))
      .limit(1);

    // Create journal entry lines
    if (salaryExpenseAccount && salariesPayableAccount) {
      // Debit: Salaries & Wages Expense
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: salaryExpenseAccount.id,
        description: `Debit - Salaries & Wages Expense (${monthNames[month - 1]} ${year})`,
        debitAmount: totalGross.toFixed(2),
        creditAmount: '0',
      });

      // Credit: Salaries Payable
      await db.insert(journalEntryLines).values({
        orgId,
        journalEntryId: journalEntry.id,
        accountId: salariesPayableAccount.id,
        description: `Credit - Salaries Payable (${monthNames[month - 1]} ${year})`,
        debitAmount: '0',
        creditAmount: totalNet.toFixed(2),
      });

      // Credit: Tax Deductions Payable (if applicable)
      const totalTax = calculations.reduce((sum, c) => sum + c.incomeTax + c.eobiDeduction, 0);
      if (totalTax > 0) {
        const [taxPayableAccount] = await db
          .select()
          .from(chartOfAccounts)
          .where(and(
            eq(chartOfAccounts.orgId, orgId),
            or(
              eq(chartOfAccounts.name, 'Income Tax Payable'),
              eq(chartOfAccounts.name, 'Tax Payable')
            )
          ))
          .limit(1);

        if (taxPayableAccount) {
          await db.insert(journalEntryLines).values({
            orgId,
            journalEntryId: journalEntry.id,
            accountId: taxPayableAccount.id,
            description: `Credit - Tax Deductions Payable (${monthNames[month - 1]} ${year})`,
            debitAmount: '0',
            creditAmount: totalTax.toFixed(2),
          });
        }
      }
    }

    // Update payroll run with journal entry ID
    await db
      .update(payrollRuns)
      .set({
        journalEntryId: journalEntry.id,
        status: 'Posted',
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, payrollRunId));

    // Audit log
    await db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'PAYROLL_APPROVED',
      entityType: 'payroll_run',
      entityId: payrollRunId,
      changes: JSON.stringify({ month, year, totalEmployees: calculations.length, totalNet }),
    });

    revalidatePath('/hr-payroll/run');
    revalidatePath('/hr-payroll/reports');
    return { 
      success: true, 
      message: `Payroll approved and posted for ${calculations.length} employees. Total: PKR ${totalNet.toFixed(2)}`,
      payrollRunId,
      journalEntryId: journalEntry.id,
    };
  } catch (error) {
    return { success: false, error: "Failed to process payroll" };
  }
}

// ============ Payroll Run Actions ============

// Get all payroll runs
export async function getPayrollRuns() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.orgId, orgId))
      .orderBy(desc(payrollRuns.createdAt));

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch payroll runs" };
  }
}

// Get payslips for a payroll run
export async function getPayslips(payrollRunId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(payslips)
      .where(and(eq(payslips.payrollRunId, payrollRunId), eq(payslips.orgId, orgId)))
      .orderBy(payslips.employeeName);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch payslips" };
  }
}

// Get single payslip
export async function getPayslip(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(payslips)
      .where(and(eq(payslips.id, id), eq(payslips.orgId, orgId)))
      .limit(1);

    if (result.length === 0) return { success: false, error: "Payslip not found" };

    return { success: true, data: result[0] };
  } catch (error) {
    return { success: false, error: "Failed to fetch payslip" };
  }
}

// Mark payslip as paid
export async function markPayslipPaid(id: string, paymentMethod: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .update(payslips)
      .set({
        isPaid: true,
        paymentDate: new Date(),
        paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(payslips.id, id));

    revalidatePath('/hr-payroll/reports');
    return { success: true, message: "Payslip marked as paid" };
  } catch (error) {
    return { success: false, error: "Failed to mark payslip as paid" };
  }
}

// Get departments
export async function getDepartments() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({ department: employees.department })
      .from(employees)
      .where(and(eq(employees.orgId, orgId), eq(employees.isActive, true)))
      .groupBy(employees.department)
      .orderBy(employees.department);

    const departments = result
      .map(r => r.department)
      .filter(d => d !== null) as string[];

    return { success: true, data: departments };
  } catch (error) {
    return { success: false, error: "Failed to fetch departments" };
  }
}
