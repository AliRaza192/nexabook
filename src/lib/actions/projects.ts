"use server";

import { db } from "@/db";
import {
  projects, tasks, timesheets,
  profiles, customers,
  type Project, type Task, type Timesheet,
} from "@/db/schema";
import { createAuditLog } from "./audit";
import { eq, and, desc, asc, ilike, or, sql, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrgId } from "./shared";

// ─── PROJECTS ───

export async function getProjects(search?: string, status?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const conditions = [eq(projects.orgId, orgId)];
    if (status && status !== "all") conditions.push(eq(projects.status, status as any));
    if (search) conditions.push(ilike(projects.name, `%${search}%`));

    const data = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));

    return { success: true as const, data };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load projects" };
  }
}

export async function getProject(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
      .limit(1);

    if (!project) return { success: false as const, error: "Project not found" };
    return { success: true as const, data: project };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load project" };
  }
}

export async function createProject(data: {
  name: string;
  code?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budgetAmount?: string;
  hourlyRate?: string;
  clientId?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };
    const { userId } = await auth();
    if (!userId) return { success: false as const, error: "Not authenticated" };

    const [project] = await db
      .insert(projects)
      .values({
        orgId,
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        budgetAmount: data.budgetAmount || "0",
        hourlyRate: data.hourlyRate || "0",
        clientId: data.clientId || null,
      })
      .returning();

    revalidatePath("/projects");
    await createAuditLog({ action: "PROJECT_CREATED", entityType: "project", entityId: project.id });
    return { success: true as const, data: project, message: "Project created successfully" };
  } catch (error: any) {
    if (error.code === "23505") return { success: false as const, error: "A project with this code already exists" };
    return { success: false as const, error: error.message || "Failed to create project" };
  }
}

export async function updateProject(id: string, data: {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  budgetAmount?: string;
  hourlyRate?: string;
  clientId?: string | null;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [project] = await db
      .update(projects)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.budgetAmount !== undefined && { budgetAmount: data.budgetAmount }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
      .returning();

    if (!project) return { success: false as const, error: "Project not found" };
    revalidatePath("/projects");
    await createAuditLog({ action: "PROJECT_UPDATED", entityType: "project", entityId: id });
    return { success: true as const, data: project, message: "Project updated successfully" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to update project" };
  }
}

export async function deleteProject(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.orgId, orgId)));
    revalidatePath("/projects");
    await createAuditLog({ action: "PROJECT_DELETED", entityType: "project", entityId: id });
    return { success: true as const, message: "Project deleted successfully" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete project" };
  }
}

// ─── TASKS ───

export async function getTasks(projectId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const data = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.orgId, orgId)))
      .orderBy(desc(tasks.createdAt));

    return { success: true as const, data };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load tasks" };
  }
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [task] = await db
      .insert(tasks)
      .values({
        orgId,
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        assigneeId: data.assigneeId || null,
        priority: (data.priority as any) || "medium",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours || "0",
      })
      .returning();

    revalidatePath(`/projects/${data.projectId}`);
    await createAuditLog({ action: "TASK_CREATED", entityType: "task", entityId: task.id });
    return { success: true as const, data: task, message: "Task created successfully" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to create task" };
  }
}

export async function updateTask(id: string, data: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimatedHours?: string;
  actualHours?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [task] = await db
      .update(tasks)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.priority !== undefined && { priority: data.priority as any }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(data.actualHours !== undefined && { actualHours: data.actualHours }),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)))
      .returning();

    if (!task) return { success: false as const, error: "Task not found" };
    revalidatePath(`/projects/${task.projectId}`);
    await createAuditLog({ action: "TASK_UPDATED", entityType: "task", entityId: id });
    return { success: true as const, data: task, message: "Task updated successfully" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to update task" };
  }
}

export async function deleteTask(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
    revalidatePath("/projects");
    await createAuditLog({ action: "TASK_DELETED", entityType: "task", entityId: id });
    return { success: true as const, message: "Task deleted successfully" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete task" };
  }
}

// ─── TIMESHEETS ───

export async function getTimesheets(filters?: {
  projectId?: string;
  profileId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const conditions = [eq(timesheets.orgId, orgId)];
    if (filters?.projectId) conditions.push(eq(timesheets.projectId, filters.projectId));
    if (filters?.profileId) conditions.push(eq(timesheets.profileId, filters.profileId));
    if (filters?.status) conditions.push(eq(timesheets.status, filters.status as any));
    if (filters?.startDate) conditions.push(gte(timesheets.date, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(timesheets.date, new Date(filters.endDate)));

    const data = await db
      .select()
      .from(timesheets)
      .where(and(...conditions))
      .orderBy(desc(timesheets.date));

    return { success: true as const, data };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load timesheets" };
  }
}

export async function createTimesheet(data: {
  projectId: string;
  date: string;
  hours: string;
  description?: string;
  taskId?: string;
  billable?: boolean;
}) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };
    const { userId } = await auth();
    if (!userId) return { success: false as const, error: "Not authenticated" };

    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) return { success: false as const, error: "Profile not found" };

    const [timesheet] = await db
      .insert(timesheets)
      .values({
        orgId,
        profileId: profile.id,
        projectId: data.projectId,
        taskId: data.taskId || null,
        date: new Date(data.date),
        hours: data.hours,
        description: data.description || null,
        billable: data.billable ?? true,
      })
      .returning();

    revalidatePath("/timesheets");
    await createAuditLog({ action: "TIMESHEET_CREATED", entityType: "timesheet", entityId: timesheet.id });
    return { success: true as const, data: timesheet, message: "Timesheet entry added" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to create timesheet entry" };
  }
}

export async function updateTimesheetStatus(id: string, status: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const [timesheet] = await db
      .update(timesheets)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(timesheets.id, id), eq(timesheets.orgId, orgId)))
      .returning();

    if (!timesheet) return { success: false as const, error: "Timesheet not found" };
    revalidatePath("/timesheets");
    await createAuditLog({ action: "TIMESHEET_STATUS_UPDATED", entityType: "timesheet", entityId: id });
    return { success: true as const, data: timesheet, message: `Timesheet ${status}` };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to update timesheet" };
  }
}

export async function deleteTimesheet(id: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };
    await db.delete(timesheets).where(and(eq(timesheets.id, id), eq(timesheets.orgId, orgId)));
    revalidatePath("/timesheets");
    await createAuditLog({ action: "TIMESHEET_DELETED", entityType: "timesheet", entityId: id });
    return { success: true as const, message: "Timesheet entry deleted" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to delete timesheet" };
  }
}

// ─── PROJECT PROFITABILITY REPORT ───

export async function getProjectProfitability() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false as const, error: "No organization found" };

    const data = await db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
        status: projects.status,
        budgetAmount: projects.budgetAmount,
        hourlyRate: projects.hourlyRate,
        clientId: projects.clientId,
      })
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projects.createdAt));

    const projectIds = data.map((p) => p.id);

    const timesheetAggs = projectIds.length > 0 ? await db
      .select({
        projectId: timesheets.projectId,
        totalHours: sql<string>`COALESCE(SUM(CAST(${timesheets.hours} AS DECIMAL)), '0')`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${timesheets.billable} = true THEN CAST(${timesheets.hours} AS DECIMAL) ELSE 0 END), '0')`,
        entryCount: sql<number>`COUNT(*)`,
      })
      .from(timesheets)
      .where(and(eq(timesheets.orgId, orgId), sql`${timesheets.projectId} = ANY(${projectIds}::uuid[])`))
      .groupBy(timesheets.projectId) : [];

    const timesheetMap = new Map(timesheetAggs.map((t) => [t.projectId, t]));

    const result = data.map((project) => {
      const t = timesheetMap.get(project.id);
      const totalHours = parseFloat(t?.totalHours || "0");
      const billableHours = parseFloat(t?.billableHours || "0");
      const hourlyRate = parseFloat(project.hourlyRate || "0");
      const budgetAmount = parseFloat(project.budgetAmount || "0");
      const revenue = billableHours * hourlyRate;
      const cost = 0; // Would need employee cost data for true profitability
      const profit = revenue - cost;
      const budgetUtilization = budgetAmount > 0 ? (revenue / budgetAmount) * 100 : 0;

      return {
        ...project,
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        entryCount: t?.entryCount || 0,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        budgetUtilization,
      };
    });

    return { success: true as const, data: result };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Failed to load project profitability" };
  }
}
