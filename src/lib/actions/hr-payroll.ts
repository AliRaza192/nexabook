"use server";

import { db } from "@/db";
import {
  employees,
  attendance,
  payrollRuns,
  payslips,
  organizations,
  auditLogs,
  profiles,
  taxSlabs,
} from "@/db/schema";
import { eq, and, desc, ilike, or, sql, gte, lte, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId, requireRole } from "./shared";
import { checkPeriodLocked } from "./fiscal-periods";
import { postTransaction, resolveAccount } from "../accounting/posting-engine";
import { captureException } from "@/lib/error-handler";
import { roundDecimal } from "@/lib/utils/decimal";

const VALID_EMPLOYEE_STATUSES = ["Active", "On Leave", "Terminated"] as const;

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
    captureException(error, { module: "hr-payroll", function: "getCurrentUserName" });
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

function validateEmployeeStatus(status: string): status is typeof VALID_EMPLOYEE_STATUSES[number] {
  return (VALID_EMPLOYEE_STATUSES as readonly string[]).includes(status);
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
    captureException(error, { module: "hr-payroll", function: "getEmployees" });
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
    captureException(error, { module: "hr-payroll", function: "getEmployee" });
    return { success: false, error: "Failed to fetch employee" };
  }
}

// Create employee
// FIX (2026 review): added requireRole (was completely open — any
// authenticated user could create employees with arbitrary salary figures)
// and status validated against the schema's allowed values.
export async function createEmployee(data: EmployeeFormData) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    if (!validateEmployeeStatus(data.status)) {
      return { success: false, error: `Invalid status: must be one of ${VALID_EMPLOYEE_STATUSES.join(", ")}` };
    }

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
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      return { success: false, error: "Employee code already exists" };
    }
    captureException(error, { module: "hr-payroll", function: "createEmployee" });
    return { success: false, error: "Failed to create employee" };
  }
}

// Update employee
export async function updateEmployee(id: string, data: EmployeeFormData) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    if (!validateEmployeeStatus(data.status)) {
      return { success: false, error: `Invalid status: must be one of ${VALID_EMPLOYEE_STATUSES.join(", ")}` };
    }

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
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      return { success: false, error: "Employee code already exists" };
    }
    captureException(error, { module: "hr-payroll", function: "updateEmployee" });
    return { success: false, error: "Failed to update employee" };
  }
}

// Delete employee (soft delete)
export async function deleteEmployee(id: string) {
  try {
    await requireRole(["admin"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    await db
      .update(employees)
      .set({ isActive: false, status: 'Terminated', exitDate: new Date(), updatedAt: new Date() })
      .where(and(eq(employees.id, id), eq(employees.orgId, orgId)));

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
    captureException(error, { module: "hr-payroll", function: "deleteEmployee" });
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
    captureException(error, { module: "hr-payroll", function: "getAttendance" });
    return { success: false, error: "Failed to fetch attendance" };
  }
}

// Mark attendance for a day
// FIX (2026 review): the onConflictDoUpdate target (employeeId, date) had no
// matching unique constraint in the schema — every call would throw
// "no unique or exclusion constraint matching the ON CONFLICT specification".
// Migration 0007 adds uq_attendance_employee_date; this now works as intended.
export async function markAttendance(records: AttendanceRecord[]) {
  try {
    await requireRole(["admin", "manager"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    for (const record of records) {
      const checkIn = record.checkIn ? new Date(record.checkIn) : null;
      const checkOut = record.checkOut ? new Date(record.checkOut) : null;

      let workingHours = null;
      if (checkIn && checkOut) {
        workingHours = ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);
      }

      let lateMinutes = 0;
      if (record.status === 'Late' && checkIn) {
        const expectedTime = new Date(record.date);
        expectedTime.setHours(9, 0, 0, 0);
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
    captureException(error, { module: "hr-payroll", function: "markAttendance" });
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

/**
 * FIX (2026 review): replaces the hardcoded 5-bracket table (which predates
 * the FY2026-27 slabs effective 1 July 2026 — confirmed via Finance Act 2026
 * coverage: 7 brackets, top-rate threshold raised to Rs 7M, 9% surcharge
 * abolished for salaried individuals). The exact new bracket boundaries and
 * rates were NOT available from a single authoritative source at review
 * time, so rather than guess a table for a legally binding payroll
 * calculation, slabs are now read from the org-configurable `taxSlabs`
 * table (migration 0007). Seed it from the official FBR/Finance Act 2026
 * document for the org's applicable fiscal year before running payroll.
 */
async function calculateIncomeTax(orgId: string, annualSalary: number, fiscalYear: string): Promise<number> {
  const slabs = await db
    .select()
    .from(taxSlabs)
    .where(and(
      eq(taxSlabs.orgId, orgId),
      eq(taxSlabs.fiscalYear, fiscalYear),
      eq(taxSlabs.isActive, true),
    ))
    .orderBy(asc(taxSlabs.minAnnualIncome));

  if (slabs.length === 0) {
    // No configured slabs for this fiscal year — fail loudly rather than
    // silently using a stale/guessed table.
    throw new Error(
      `No income tax slabs configured for fiscal year ${fiscalYear}. Please add them under Settings > Tax Slabs before running payroll.`
    );
  }

  let applicable = slabs[0];
  for (const slab of slabs) {
    const min = parseFloat(slab.minAnnualIncome);
    const max = slab.maxAnnualIncome ? parseFloat(slab.maxAnnualIncome) : Infinity;
    if (annualSalary >= min && annualSalary < max) {
      applicable = slab;
      break;
    }
  }

  const base = parseFloat(applicable.baseTax);
  const rate = parseFloat(applicable.ratePercentage);
  const min = parseFloat(applicable.minAnnualIncome);
  const monthlyTax = (base + (annualSalary - min) * (rate / 100)) / 12;
  return Math.max(0, monthlyTax);
}

// Get payroll calculations for a month
// FIX (2026 review): EOBI now calculated on the org's configured statutory
// minimum wage (organizations.eobiMinimumWage), not on basic salary — this
// was factually wrong per current EOBI rules (contribution is fixed to the
// government-notified minimum wage regardless of actual salary). Income tax
// now routed through calculateIncomeTax() / configurable taxSlabs.
export async function getPayrollCalculations(month: number, year: number) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [org] = await db
      .select({ eobiMinimumWage: organizations.eobiMinimumWage })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    const eobiMinimumWage = parseFloat(org?.eobiMinimumWage || "40700");

    // Fiscal year label used for slab lookup — Pakistani FY runs Jul-Jun.
    const fiscalYear = month >= 7 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;

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

    const calculations: PayrollCalculation[] = [];

    for (const emp of activeEmployees) {
      const basicSalary = parseFloat(emp.basicSalary || '0');
      const houseRent = parseFloat(emp.houseRent || '0');
      const medicalAllowance = parseFloat(emp.medicalAllowance || '0');
      const conveyanceAllowance = parseFloat(emp.conveyanceAllowance || '0');
      const otherAllowances = parseFloat(emp.otherAllowances || '0');
      const eobiDeductionOverride = parseFloat(emp.eobiDeduction || '0');
      const incomeTaxOverride = parseFloat(emp.incomeTaxDeduction || '0');

      const empAttendance = attendanceRecords.filter(a => a.employeeId === emp.id);
      const presentDays = empAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const absentDays = empAttendance.filter(a => a.status === 'Absent').length;
      const leaveDays = empAttendance.filter(a => a.status === 'Leave').length;
      const unpaidLeaveDays = empAttendance.filter(a => a.status === 'Half Day').length * 0.5;
      const totalWorkingDays = 26; // Standard working days in Pakistan

      const totalOvertime = empAttendance.reduce((sum, a) => sum + parseFloat(a.overtime || '0'), 0);
      const overtimeRate = basicSalary / (totalWorkingDays * 8) * 1.5;
      const overtimePay = totalOvertime * overtimeRate;

      const perDaySalary = basicSalary / totalWorkingDays;
      const unpaidLeaveDeduction = (absentDays * 0.5 + unpaidLeaveDays) * perDaySalary;

      let incomeTax = incomeTaxOverride;
      if (incomeTaxOverride === 0 && basicSalary > 0) {
        const annualSalary = basicSalary * 12;
        incomeTax = await calculateIncomeTax(orgId, annualSalary, fiscalYear);
      }

      // EOBI: 1% of the statutory minimum wage — fixed regardless of actual
      // salary. An explicit per-employee override (emp.eobiDeduction) still
      // takes precedence if set.
      const autoEobiDeduction = eobiMinimumWage * 0.01;
      const finalEobiDeduction = eobiDeductionOverride > 0 ? eobiDeductionOverride : autoEobiDeduction;

      const PF_RATE = 0.0833;
      const providentFund = basicSalary * PF_RATE;

      const totalEarnings = basicSalary + houseRent + medicalAllowance + conveyanceAllowance + otherAllowances + overtimePay;
      const totalDeductions = finalEobiDeduction + incomeTax + providentFund + unpaidLeaveDeduction;
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
        eobiDeduction: Math.round(finalEobiDeduction * 100) / 100,
        incomeTax: Math.round(incomeTax * 100) / 100,
        providentFund: Math.round(providentFund * 100) / 100,
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
    captureException(error, { module: "hr-payroll", function: "getPayrollCalculations" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to calculate payroll" };
  }
}

// Generate and approve payroll
// FIX (2026 review): JE construction now routed through
// postTransaction()/resolveAccount() (was hand-rolled, independent of and
// divergent from accounting.ts's postPayrollToLedger). EOBI and income tax
// are now posted as two separate liability lines instead of being merged
// into one ambiguous "totalTax" line. If required accounts are missing, this
// now throws (aborting the whole transaction) instead of silently skipping
// the JE while still marking the run "Posted".
export async function generateAndApprovePayroll(month: number, year: number, calculations: PayrollCalculation[]) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const locked = await checkPeriodLocked(new Date(year, month - 1, 1));
    if (locked) return { success: false, error: "Cannot process payroll for a locked fiscal period" };

    const { userId } = await auth();
    if (!userId) return { success: false, error: "Not authenticated" };

    const userName = await getCurrentUserName();

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

    const totalGross = roundDecimal(calculations.reduce((sum, c) => sum + c.totalEarnings, 0));
    const totalDeductions = roundDecimal(calculations.reduce((sum, c) => sum + c.totalDeductions, 0));
    const totalNet = roundDecimal(calculations.reduce((sum, c) => sum + c.netSalary, 0));
    const totalEobi = roundDecimal(calculations.reduce((sum, c) => sum + c.eobiDeduction, 0));
    const totalIncomeTax = roundDecimal(calculations.reduce((sum, c) => sum + c.incomeTax, 0));
    const totalProvidentFund = roundDecimal(calculations.reduce((sum, c) => sum + c.providentFund, 0));
    const totalUnpaidLeave = roundDecimal(calculations.reduce((sum, c) => sum + c.unpaidLeaveDeduction, 0));

    let payrollRunId = '';
    let journalEntryId = '';

    await db.transaction(async (tx) => {
      if (existingPayroll.length > 0) {
        payrollRunId = existingPayroll[0].id;
        await tx
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

        await tx
          .delete(payslips)
          .where(eq(payslips.payrollRunId, payrollRunId));
      } else {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const [payrollRun] = await tx
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

      if (calculations.length > 0) {
        await tx.insert(payslips).values(calculations.map((calc) => ({
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
        })));
      }

      const salaryExpense = await resolveAccount(tx, orgId, "salary_expense");
      const salariesPayable = await resolveAccount(tx, orgId, "salaries_payable");

      const salaryExpenseAmount = totalGross - totalUnpaidLeave;

      const lines: { accountId: string; description: string; debit: string; credit: string }[] = [
        {
          accountId: salaryExpense.id,
          description: "Salaries & Wages Expense",
          debit: salaryExpenseAmount.toFixed(2),
          credit: "0",
        },
        {
          accountId: salariesPayable.id,
          description: "Net Salaries Payable",
          debit: "0",
          credit: totalNet.toFixed(2),
        },
      ];

      if (totalEobi > 0) {
        const eobiPayable = await resolveAccount(tx, orgId, "eobi_payable");
        lines.push({
          accountId: eobiPayable.id,
          description: "EOBI Payable",
          debit: "0",
          credit: (totalEobi * 2).toFixed(2),
        });

        const eobiExpense = await resolveAccount(tx, orgId, "eobi_expense");
        lines.push({
          accountId: eobiExpense.id,
          description: "EOBI Expense (Employer Share)",
          debit: totalEobi.toFixed(2),
          credit: "0",
        });
      }

      if (totalIncomeTax > 0) {
        const incomeTaxPayable = await resolveAccount(tx, orgId, "income_tax_payable");
        lines.push({
          accountId: incomeTaxPayable.id,
          description: "Income Tax Withheld Payable",
          debit: "0",
          credit: totalIncomeTax.toFixed(2),
        });
      }

      if (totalProvidentFund > 0) {
        const pfPayable = await resolveAccount(tx, orgId, "pf_payable");
        lines.push({
          accountId: pfPayable.id,
          description: "Provident Fund Payable",
          debit: "0",
          credit: totalProvidentFund.toFixed(2),
        });
      }

      const { journalEntryId: entryId } = await postTransaction(tx, {
        orgId,
        description: `Payroll for month ${month}/${year} - Total: PKR ${totalNet.toFixed(2)}`,
        date: new Date(year, month - 1, 1),
        referenceType: "payroll",
        referenceId: payrollRunId,
        sourceType: "payroll",
        createdBy: userId,
        lines,
      });

      journalEntryId = entryId;

      await tx
        .update(payrollRuns)
        .set({
          journalEntryId,
          status: 'Posted',
          updatedAt: new Date(),
        })
        .where(eq(payrollRuns.id, payrollRunId));

      await tx.insert(auditLogs).values({
        orgId,
        userId,
        action: 'PAYROLL_APPROVED',
        entityType: 'payroll_run',
        entityId: payrollRunId,
        changes: JSON.stringify({ month, year, totalEmployees: calculations.length, totalNet }),
      });
    });

    revalidatePath('/hr-payroll/run');
    revalidatePath('/hr-payroll/reports');
    return {
      success: true,
      message: `Payroll approved and posted for ${calculations.length} employees. Total: PKR ${totalNet.toFixed(2)}`,
      payrollRunId,
      journalEntryId,
    };
  } catch (error) {
    captureException(error, { module: "hr-payroll", function: "generateAndApprovePayroll" });
    return { success: false, error: error instanceof Error ? error.message : "Failed to process payroll" };
  }
}

// ============ Payroll Run Actions ============

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
    captureException(error, { module: "hr-payroll", function: "getPayrollRuns" });
    return { success: false, error: "Failed to fetch payroll runs" };
  }
}

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
    captureException(error, { module: "hr-payroll", function: "getPayslips" });
    return { success: false, error: "Failed to fetch payslips" };
  }
}

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
    captureException(error, { module: "hr-payroll", function: "getPayslip" });
    return { success: false, error: "Failed to fetch payslip" };
  }
}

// Mark payslip as paid
export async function markPayslipPaid(id: string, paymentMethod: string) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [payslip] = await db
      .select()
      .from(payslips)
      .where(and(eq(payslips.id, id), eq(payslips.orgId, orgId)))
      .limit(1);
    if (!payslip) return { success: false, error: "Payslip not found" };
    if (payslip.isPaid) return { success: false, error: "Already paid" };

    const { userId } = await auth();

    await db.transaction(async (tx) => {
      await tx
        .update(payslips)
        .set({
          isPaid: true,
          paymentDate: new Date(),
          paymentMethod,
          updatedAt: new Date(),
        })
        .where(and(eq(payslips.id, id), eq(payslips.orgId, orgId)));

      const salariesPayable = await resolveAccount(tx, orgId, "salaries_payable");
      const cashAcc = await resolveAccount(tx, orgId, "cash");

      await postTransaction(tx, {
        orgId,
        description: `Payroll Payment - ${payslip.employeeName}`,
        date: new Date(),
        referenceType: "payroll_payment",
        referenceId: id,
        sourceType: "payroll",
        createdBy: userId || "system",
        lines: [
          {
            accountId: salariesPayable.id,
            description: "Dr Salaries Payable",
            debit: payslip.netSalary,
            credit: "0",
          },
          {
            accountId: cashAcc.id,
            description: "Cr Cash",
            debit: "0",
            credit: payslip.netSalary,
          },
        ],
      });

      await tx.insert(auditLogs).values({
        orgId,
        userId: userId || "system",
        action: "PAYSLIP_PAID",
        entityType: "payslip",
        entityId: id,
        changes: JSON.stringify({ netSalary: payslip.netSalary, paymentMethod }),
      });
    });

    revalidatePath('/hr-payroll/reports');
    return { success: true, message: "Payslip marked as paid" };
  } catch (error) {
    captureException(error, { module: "hr-payroll", function: "markPayslipPaid" });
    return { success: false, error: "Failed to mark payslip as paid" };
  }
}

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
    captureException(error, { module: "hr-payroll", function: "getDepartments" });
    return { success: false, error: "Failed to fetch departments" };
  }
}

// ==================== TAX SLAB CONFIGURATION ====================

export interface TaxSlabInput {
  fiscalYear: string; // e.g. "2026-27"
  minAnnualIncome: string;
  maxAnnualIncome?: string; // omit for the top, unbounded bracket
  baseTax: string;
  ratePercentage: string;
}

// Replace all slabs for a given fiscal year in one atomic operation —
// avoids ending up with a half-old, half-new table if a save is interrupted.
export async function saveTaxSlabs(fiscalYear: string, slabs: TaxSlabInput[]) {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!fiscalYear || slabs.length === 0) {
      return { success: false, error: "Fiscal year and at least one slab are required" };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(taxSlabs)
        .where(and(eq(taxSlabs.orgId, orgId), eq(taxSlabs.fiscalYear, fiscalYear)));

      await tx.insert(taxSlabs).values(
        slabs.map((s) => ({
          orgId,
          fiscalYear,
          minAnnualIncome: s.minAnnualIncome,
          maxAnnualIncome: s.maxAnnualIncome || null,
          baseTax: s.baseTax,
          ratePercentage: s.ratePercentage,
          isActive: true,
        })),
      );
    });

    revalidatePath('/hr-payroll/settings/tax-slabs');
    return { success: true, message: `Saved ${slabs.length} tax slabs for FY ${fiscalYear}` };
  } catch (error) {
    captureException(error, { module: "hr-payroll", function: "saveTaxSlabs" });
    return { success: false, error: "Failed to save tax slabs" };
  }
}

export async function getTaxSlabs(fiscalYear: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select()
      .from(taxSlabs)
      .where(and(
        eq(taxSlabs.orgId, orgId),
        eq(taxSlabs.fiscalYear, fiscalYear),
        eq(taxSlabs.isActive, true),
      ))
      .orderBy(asc(taxSlabs.minAnnualIncome));

    return { success: true, data: result };
  } catch (error) {
    captureException(error, { module: "hr-payroll", function: "getTaxSlabs" });
    return { success: false, error: "Failed to fetch tax slabs" };
  }
}

// ==================== BANK FILE EXPORT ====================

export interface BankFileRow {
  employeeName: string;
  bankName: string;
  accountNumber: string;
  branchName: string;
  amount: number;
}

// FIX (2026 review): added requireRole — this exports employee bank account
// numbers to a downloadable CSV and had no access control.
export async function generateBankFile(payrollRunId: string): Promise<{
  success: boolean;
  data?: { csv: string; skippedCount: number; totalAmount: number };
  error?: string;
}> {
  try {
    await requireRole(["admin", "accountant"]);
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const payslipList = await db
      .select({
        employeeName: payslips.employeeName,
        bankName: payslips.bankName,
        accountNumber: payslips.accountNumber,
        netSalary: payslips.netSalary,
      })
      .from(payslips)
      .where(
        and(
          eq(payslips.orgId, orgId),
          eq(payslips.payrollRunId, payrollRunId),
          eq(payslips.isPaid, false)
        )
      );

    const validPayslips = payslipList.filter(
      (p) => p.bankName && p.accountNumber
    );
    const skippedCount = payslipList.length - validPayslips.length;

    const headers = ["Employee Name", "Bank Name", "Account Number", "Amount"];
    const rows = validPayslips.map((p) => [
      p.employeeName,
      p.bankName || "",
      p.accountNumber || "",
      parseFloat(p.netSalary).toFixed(2),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const totalAmount = validPayslips.reduce(
      (sum, p) => sum + parseFloat(p.netSalary),
      0
    );

    return {
      success: true,
      data: {
        csv,
        skippedCount,
        totalAmount: Math.round(totalAmount * 100) / 100,
      },
    };
  } catch (error) {
    captureException(error, { module: "hr-payroll", function: "generateBankFile" });
    return { success: false, error: "Failed to generate bank file" };
  }
}