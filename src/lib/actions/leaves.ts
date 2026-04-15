"use server";

import { db } from "@/db";
import {
  leaveTypes,
  leaveApplications,
  employees,
  payslips,
  auditLogs,
} from "@/db/schema";
import { eq, and, desc, ilike, or, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// ==========================================
// LEAVE TYPES
// ==========================================

export interface LeaveTypeFormData {
  name: string;
  daysAllowed: string;
  isPaid: boolean;
  carryForward?: boolean;
  requiresApproval?: boolean;
}

/**
 * Get all leave types for the current organization
 */
export async function getLeaveTypes() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const types = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.orgId, orgId))
      .orderBy(leaveTypes.name);

    return { success: true, data: types };
  } catch (error) {
    return { success: false, error: "Failed to fetch leave types" };
  }
}

/**
 * Create a leave type
 */
export async function createLeaveType(data: LeaveTypeFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.name || !data.daysAllowed) {
      return { success: false, error: "Name and days allowed are required" };
    }

    const daysAllowed = parseInt(data.daysAllowed);
    if (isNaN(daysAllowed) || daysAllowed < 0) {
      return { success: false, error: "Invalid days allowed" };
    }

    const [leaveType] = await db
      .insert(leaveTypes)
      .values({
        orgId,
        name: data.name,
        daysAllowed,
        isPaid: data.isPaid,
        carryForward: data.carryForward || false,
        requiresApproval: data.requiresApproval !== false,
      })
      .returning();

    revalidatePath("/hr-payroll/leaves");
    return { success: true, data: leaveType, message: "Leave type created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create leave type" };
  }
}

// ==========================================
// LEAVE APPLICATIONS
// ==========================================

export interface LeaveApplicationFormData {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  notes?: string;
}

/**
 * Get leave applications with optional filters
 */
export async function getLeaveApplications(
  employeeId?: string,
  status?: string
) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(leaveApplications.orgId, orgId)];
    
    if (employeeId) {
      conditions.push(eq(leaveApplications.employeeId, employeeId));
    }
    
    if (status) {
      conditions.push(eq(leaveApplications.status, status));
    }

    const applications = await db
      .select({
        id: leaveApplications.id,
        employeeId: leaveApplications.employeeId,
        leaveTypeId: leaveApplications.leaveTypeId,
        fromDate: leaveApplications.fromDate,
        toDate: leaveApplications.toDate,
        totalDays: leaveApplications.totalDays,
        reason: leaveApplications.reason,
        status: leaveApplications.status,
        appliedBy: leaveApplications.appliedBy,
        reviewedBy: leaveApplications.reviewedBy,
        reviewedAt: leaveApplications.reviewedAt,
        rejectionReason: leaveApplications.rejectionReason,
        notes: leaveApplications.notes,
        createdAt: leaveApplications.createdAt,
        updatedAt: leaveApplications.updatedAt,
        // Employee info
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        department: employees.department,
        designation: employees.designation,
        // Leave type info
        leaveTypeName: leaveTypes.name,
        leaveTypeIsPaid: leaveTypes.isPaid,
      })
      .from(leaveApplications)
      .innerJoin(employees, eq(leaveApplications.employeeId, employees.id))
      .innerJoin(leaveTypes, eq(leaveApplications.leaveTypeId, leaveTypes.id))
      .where(and(...conditions))
      .orderBy(desc(leaveApplications.createdAt));

    return { success: true, data: applications };
  } catch (error) {
    console.error("Failed to fetch leave applications:", error);
    return { success: false, error: "Failed to fetch leave applications" };
  }
}

/**
 * Create a leave application
 */
export async function createLeaveApplication(data: LeaveApplicationFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.employeeId || !data.leaveTypeId || !data.fromDate || !data.toDate || !data.reason) {
      return { success: false, error: "All fields are required" };
    }

    // Validate dates
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);
    
    if (toDate < fromDate) {
      return { success: false, error: "End date must be after start date" };
    }

    // Calculate total days
    const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    const leaveType = await db
      .select()
      .from(leaveTypes)
      .where(and(eq(leaveTypes.id, data.leaveTypeId), eq(leaveTypes.orgId, orgId)))
      .limit(1);

    if (leaveType.length === 0) {
      return { success: false, error: "Leave type not found" };
    }

    const approvedLeaves = await db
      .select({ totalDays: sql<number>`sum(${leaveApplications.totalDays})` })
      .from(leaveApplications)
      .where(and(
        eq(leaveApplications.employeeId, data.employeeId),
        eq(leaveApplications.leaveTypeId, data.leaveTypeId),
        eq(leaveApplications.status, "approved"),
        sql`EXTRACT(YEAR FROM ${leaveApplications.fromDate}) = ${fromDate.getFullYear()}`
      ));

    const usedDays = approvedLeaves[0]?.totalDays || 0;
    const remainingDays = leaveType[0].daysAllowed - usedDays;

    if (totalDays > remainingDays) {
      return { 
        success: false, 
        error: `Insufficient leave balance. Available: ${remainingDays} days, Requested: ${totalDays} days` 
      };
    }

    const [application] = await db
      .insert(leaveApplications)
      .values({
        orgId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        fromDate,
        toDate,
        totalDays,
        reason: data.reason,
        status: leaveType[0].requiresApproval ? "pending" : "approved",
        appliedBy: (await auth()).userId || "system",
        notes: data.notes,
      })
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || "system",
      action: "LEAVE_APPLICATION_CREATED",
      entityType: "leave_application",
      entityId: application.id,
      changes: JSON.stringify({
        employeeId: data.employeeId,
        leaveType: leaveType[0].name,
        fromDate: data.fromDate,
        toDate: data.toDate,
        totalDays,
      }),
    });

    revalidatePath("/hr-payroll/leaves");
    return { success: true, data: application, message: "Leave application created successfully" };
  } catch (error) {
    console.error("Failed to create leave application:", error);
    return { success: false, error: "Failed to create leave application" };
  }
}

/**
 * Approve a leave application
 */
export async function approveLeaveApplication(applicationId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [application] = await db
      .select()
      .from(leaveApplications)
      .where(and(eq(leaveApplications.id, applicationId), eq(leaveApplications.orgId, orgId)))
      .limit(1);

    if (!application) return { success: false, error: "Leave application not found" };
    if (application.status !== "pending") {
      return { success: false, error: "Leave application is not pending" };
    }

    const [updated] = await db
      .update(leaveApplications)
      .set({
        status: "approved",
        reviewedBy: (await auth()).userId || "system",
        reviewedAt: new Date(),
      })
      .where(eq(leaveApplications.id, applicationId))
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || "system",
      action: "LEAVE_APPLICATION_APPROVED",
      entityType: "leave_application",
      entityId: applicationId,
      changes: JSON.stringify({ applicationId }),
    });

    revalidatePath("/hr-payroll/leaves");
    return { success: true, data: updated, message: "Leave application approved successfully" };
  } catch (error) {
    return { success: false, error: "Failed to approve leave application" };
  }
}

/**
 * Reject a leave application
 */
export async function rejectLeaveApplication(applicationId: string, reason: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [application] = await db
      .select()
      .from(leaveApplications)
      .where(and(eq(leaveApplications.id, applicationId), eq(leaveApplications.orgId, orgId)))
      .limit(1);

    if (!application) return { success: false, error: "Leave application not found" };
    if (application.status !== "pending") {
      return { success: false, error: "Leave application is not pending" };
    }

    const [updated] = await db
      .update(leaveApplications)
      .set({
        status: "rejected",
        reviewedBy: (await auth()).userId || "system",
        reviewedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(leaveApplications.id, applicationId))
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      orgId,
      userId: (await auth()).userId || "system",
      action: "LEAVE_APPLICATION_REJECTED",
      entityType: "leave_application",
      entityId: applicationId,
      changes: JSON.stringify({ applicationId, reason }),
    });

    revalidatePath("/hr-payroll/leaves");
    return { success: true, data: updated, message: "Leave application rejected" };
  } catch (error) {
    return { success: false, error: "Failed to reject leave application" };
  }
}

/**
 * Get leave balance for an employee
 * Returns remaining days for each leave type
 */
export async function getLeaveBalance(employeeId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get all leave types
    const allLeaveTypes = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.orgId, orgId));

    const currentYear = new Date().getFullYear();
    const balance: Array<{
      leaveTypeId: string;
      leaveTypeName: string;
      daysAllowed: number;
      daysUsed: number;
      daysRemaining: number;
      isPaid: boolean;
    }> = [];

    for (const leaveType of allLeaveTypes) {
      // Get approved leaves for this employee and type in current year
      const approvedLeaves = await db
        .select({ totalDays: sql<number>`sum(${leaveApplications.totalDays})` })
        .from(leaveApplications)
        .where(and(
          eq(leaveApplications.employeeId, employeeId),
          eq(leaveApplications.leaveTypeId, leaveType.id),
          eq(leaveApplications.status, "approved"),
          sql`EXTRACT(YEAR FROM ${leaveApplications.fromDate}) = ${currentYear}`
        ));

      const daysUsed = approvedLeaves[0]?.totalDays || 0;
      const daysRemaining = leaveType.daysAllowed - daysUsed;

      balance.push({
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        daysAllowed: leaveType.daysAllowed,
        daysUsed,
        daysRemaining: Math.max(0, daysRemaining),
        isPaid: leaveType.isPaid,
      });
    }

    return { success: true, data: balance };
  } catch (error) {
    return { success: false, error: "Failed to fetch leave balance" };
  }
}

/**
 * Calculate unpaid leave deduction for payroll
 * Returns total unpaid leave days and deduction amount
 */
export async function calculateUnpaidLeaveDeduction(
  employeeId: string,
  month: number,
  year: number
): Promise<{
  success: boolean;
  data?: {
    unpaidLeaveDays: number;
    deductionAmount: number;
    dailyRate: number;
  };
  error?: string;
}> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get employee salary
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.orgId, orgId)))
      .limit(1);

    if (!employee) return { success: false, error: "Employee not found" };

    // Calculate daily rate
    const basicSalary = parseFloat(employee.basicSalary || "0");
    const dailyRate = basicSalary / 30; // Assuming 30 days per month

    // Get approved unpaid leaves for the month
    const unpaidLeaves = await db
      .select({ totalDays: sql<number>`sum(${leaveApplications.totalDays})` })
      .from(leaveApplications)
      .innerJoin(leaveTypes, eq(leaveApplications.leaveTypeId, leaveTypes.id))
      .where(and(
        eq(leaveApplications.employeeId, employeeId),
        eq(leaveApplications.status, "approved"),
        eq(leaveTypes.isPaid, false),
        sql`EXTRACT(MONTH FROM ${leaveApplications.fromDate}) = ${month}`,
        sql`EXTRACT(YEAR FROM ${leaveApplications.fromDate}) = ${year}`
      ));

    const unpaidLeaveDays = unpaidLeaves[0]?.totalDays || 0;
    const deductionAmount = unpaidLeaveDays * dailyRate;

    return {
      success: true,
      data: {
        unpaidLeaveDays,
        deductionAmount: Math.round(deductionAmount * 100) / 100,
        dailyRate: Math.round(dailyRate * 100) / 100,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to calculate unpaid leave deduction" };
  }
}
