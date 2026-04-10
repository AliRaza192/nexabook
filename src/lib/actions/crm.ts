"use server";

import { db } from "@/db";
import {
  leads,
  tickets,
  crmEvents,
  crmCalls,
  customers,
  organizations,
  profiles,
} from "@/db/schema";
import { eq, and, or, ilike, desc, gte, lte, sql } from "drizzle-orm";
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

    const user = await currentUser();
    if (!user) return null;

    const fullName = user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
    const slug = fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const [org] = await db
      .insert(organizations)
      .values({ name: fullName + "'s Organization", slug })
      .returning({ id: organizations.id });

    const [newProfile] = await db
      .insert(profiles)
      .values({ userId, orgId: org.id, role: 'admin', fullName, email: user.emailAddresses[0]?.emailAddress || '' })
      .returning({ orgId: profiles.orgId });

    return newProfile.orgId;
  } catch (error) {
    return null;
  }
}

// ==================== LEADS ACTIONS ====================

export interface LeadFormData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  designation?: string;
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  estimatedValue?: string;
  assignedTo?: string;
  notes?: string;
}

export interface LeadWithCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  designation: string | null;
  source: string | null;
  status: string;
  estimatedValue: string | null;
  assignedTo: string | null;
  notes: string | null;
  isConverted: boolean;
  createdAt: Date;
  updatedAt: Date;
  convertedCustomer?: { id: string; name: string } | null;
}

// Generate lead reference number
async function generateLeadNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.orgId, orgId))
    .orderBy(desc(leads.createdAt))
    .limit(1);

  let nextNumber = result.length + 1;
  return `LEAD-${String(nextNumber).padStart(5, '0')}`;
}

// Get all leads
export async function getLeads(searchQuery?: string, statusFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(leads.orgId, orgId)];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(leads.status, statusFilter as any));
    }

    let result = await db
      .select()
      .from(leads)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(leads.createdAt));

    if (searchQuery) {
      result = result.filter(lead =>
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.phone && lead.phone.includes(searchQuery))
      );
    }

    // Enrich with converted customer info
    const leadsWithCustomer: LeadWithCustomer[] = await Promise.all(
      result.map(async (lead) => {
        let convertedCustomer = null;
        if (lead.convertedToCustomerId) {
          const [cust] = await db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(eq(customers.id, lead.convertedToCustomerId!))
            .limit(1);
          convertedCustomer = cust || null;
        }
        return { ...lead, convertedCustomer };
      })
    );

    return { success: true, data: leadsWithCustomer };
  } catch (error) {
    return { success: false, error: "Failed to fetch leads" };
  }
}

// Get lead by ID
export async function getLeadById(leadId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
      .limit(1);

    if (!lead) return { success: false, error: "Lead not found" };

    let convertedCustomer = null;
    if (lead.convertedToCustomerId) {
      const [cust] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.id, lead.convertedToCustomerId!))
        .limit(1);
      convertedCustomer = cust || null;
    }

    return { success: true, data: { ...lead, convertedCustomer } };
  } catch (error) {
    return { success: false, error: "Failed to fetch lead" };
  }
}

// Create lead
export async function createLead(data: LeadFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.name) return { success: false, error: "Lead name is required" };

    const [newLead] = await db
      .insert(leads)
      .values({
        orgId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        designation: data.designation || null,
        source: data.source || null,
        status: data.status || 'new',
        estimatedValue: data.estimatedValue || '0',
        assignedTo: data.assignedTo || null,
        notes: data.notes || null,
      })
      .returning();

    revalidatePath('/crm/leads');
    revalidatePath('/crm');

    return { success: true, data: newLead, message: "Lead created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create lead" };
  }
}

// Update lead
export async function updateLead(leadId: string, data: Partial<LeadFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updatedLead] = await db
      .update(leads)
      .set(updateData)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
      .returning();

    if (!updatedLead) return { success: false, error: "Lead not found" };

    revalidatePath('/crm/leads');
    revalidatePath('/crm');

    return { success: true, data: updatedLead, message: "Lead updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update lead" };
  }
}

// Delete lead
export async function deleteLead(leadId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)));

    revalidatePath('/crm/leads');

    return { success: true, message: "Lead deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete lead" };
  }
}

// Convert lead to customer
export async function convertLeadToCustomer(leadId: string, customerData?: { address?: string; city?: string }) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
      .limit(1);

    if (!lead) return { success: false, error: "Lead not found" };
    if (lead.isConverted) return { success: false, error: "Lead is already converted" };

    // Create customer from lead
    const [newCustomer] = await db
      .insert(customers)
      .values({
        orgId,
        name: lead.name,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        address: customerData?.address || lead.company || undefined,
        city: customerData?.city || undefined,
        balance: '0',
        openingBalance: '0',
      })
      .returning();

    // Update lead as converted
    const [updatedLead] = await db
      .update(leads)
      .set({
        isConverted: true,
        convertedToCustomerId: newCustomer.id,
        status: 'won',
      })
      .where(eq(leads.id, leadId))
      .returning();

    revalidatePath('/crm/leads');
    revalidatePath('/sales/customers');

    return { success: true, data: { lead: updatedLead, customer: newCustomer }, message: "Lead converted to customer successfully" };
  } catch (error) {
    return { success: false, error: "Failed to convert lead to customer" };
  }
}

// Update lead status
export async function updateLeadStatus(leadId: string, status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost') {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [updatedLead] = await db
      .update(leads)
      .set({ status })
      .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)))
      .returning();

    if (!updatedLead) return { success: false, error: "Lead not found" };

    revalidatePath('/crm/leads');
    revalidatePath('/crm');

    return { success: true, data: updatedLead, message: "Lead status updated" };
  } catch (error) {
    return { success: false, error: "Failed to update lead status" };
  }
}

// Get lead stats
export async function getLeadStats() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allLeads = await db
      .select({
        id: leads.id,
        status: leads.status,
        estimatedValue: leads.estimatedValue,
        createdAt: leads.createdAt,
        isConverted: leads.isConverted,
      })
      .from(leads)
      .where(eq(leads.orgId, orgId));

    const totalLeads = allLeads.length;
    const wonLeads = allLeads.filter(l => l.status === 'won').length;
    const pipelineValue = allLeads
      .filter(l => !['won', 'lost'].includes(l.status))
      .reduce((sum, l) => sum + parseFloat(l.estimatedValue || '0'), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonThisMonth = allLeads.filter(l =>
      l.status === 'won' && l.createdAt >= startOfMonth
    ).length;

    return {
      success: true,
      data: { totalLeads, wonLeads, pipelineValue, wonThisMonth },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch lead stats" };
  }
}

// ==================== TICKETS ACTIONS ====================

export interface TicketFormData {
  customerId?: string;
  leadId?: string;
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  notes?: string;
}

// Generate ticket number
async function generateTicketNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ ticketNumber: tickets.ticketNumber })
    .from(tickets)
    .where(eq(tickets.orgId, orgId))
    .orderBy(desc(tickets.createdAt))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].ticketNumber) {
    const match = result[0].ticketNumber.match(/\d+$/);
    if (match) {
      const lastNumber = parseInt(match[0]);
      nextNumber = lastNumber + 1;
    }
  }

  return `TKT-${String(nextNumber).padStart(5, '0')}`;
}

// Get all tickets
export async function getTickets(searchQuery?: string, statusFilter?: string, priorityFilter?: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(tickets.orgId, orgId)];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(tickets.status, statusFilter as any));
    }
    if (priorityFilter && priorityFilter !== 'all') {
      conditions.push(eq(tickets.priority, priorityFilter as any));
    }

    let result = await db
      .select({
        id: tickets.id,
        ticketNumber: tickets.ticketNumber,
        subject: tickets.subject,
        priority: tickets.priority,
        status: tickets.status,
        assignedTo: tickets.assignedTo,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        resolvedAt: tickets.resolvedAt,
        customer: { id: customers.id, name: customers.name },
        lead: { id: leads.id, name: leads.name },
      })
      .from(tickets)
      .leftJoin(customers, eq(tickets.customerId, customers.id))
      .leftJoin(leads, eq(tickets.leadId, leads.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(tickets.createdAt));

    if (searchQuery) {
      result = result.filter(t =>
        t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.customer?.name && t.customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch tickets" };
  }
}

// Get ticket by ID
export async function getTicketById(ticketId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)))
      .limit(1);

    if (!ticket) return { success: false, error: "Ticket not found" };

    return { success: true, data: ticket };
  } catch (error) {
    return { success: false, error: "Failed to fetch ticket" };
  }
}

// Create ticket
export async function createTicket(data: TicketFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.subject) return { success: false, error: "Subject is required" };
    if (!data.description) return { success: false, error: "Description is required" };

    const ticketNumber = await generateTicketNumber(orgId);

    const [newTicket] = await db
      .insert(tickets)
      .values({
        orgId,
        ticketNumber,
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'medium',
        status: 'open',
        assignedTo: data.assignedTo || null,
      })
      .returning();

    revalidatePath('/crm/tickets');
    revalidatePath('/crm');

    return { success: true, data: newTicket, message: "Ticket created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create ticket" };
  }
}

// Update ticket
export async function updateTicket(ticketId: string, data: Partial<TicketFormData> & { status?: string }) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = {};
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.leadId !== undefined) updateData.leadId = data.leadId;

    const [updatedTicket] = await db
      .update(tickets)
      .set(updateData)
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)))
      .returning();

    if (!updatedTicket) return { success: false, error: "Ticket not found" };

    revalidatePath('/crm/tickets');

    return { success: true, data: updatedTicket, message: "Ticket updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update ticket" };
  }
}

// Delete ticket
export async function deleteTicket(ticketId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(tickets)
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)));

    revalidatePath('/crm/tickets');

    return { success: true, message: "Ticket deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete ticket" };
  }
}

// Resolve ticket
export async function resolveTicket(ticketId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const { userId } = await auth();

    const [updatedTicket] = await db
      .update(tickets)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId || null,
      })
      .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)))
      .returning();

    if (!updatedTicket) return { success: false, error: "Ticket not found" };

    revalidatePath('/crm/tickets');

    return { success: true, data: updatedTicket, message: "Ticket resolved successfully" };
  } catch (error) {
    return { success: false, error: "Failed to resolve ticket" };
  }
}

// Get ticket stats
export async function getTicketStats() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allTickets = await db
      .select({
        status: tickets.status,
        priority: tickets.priority,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
      })
      .from(tickets)
      .where(eq(tickets.orgId, orgId));

    const openTickets = allTickets.filter(t => ['open', 'in_progress'].includes(t.status)).length;
    const resolvedToday = allTickets.filter(t => {
      if (!t.resolvedAt) return false;
      const today = new Date();
      return t.resolvedAt.toDateString() === today.toDateString();
    }).length;

    // Calculate average resolution time for resolved tickets
    const resolvedTickets = allTickets.filter(t => t.resolvedAt && ['resolved', 'closed'].includes(t.status));
    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, t) => {
        const hours = (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
    }

    return {
      success: true,
      data: { openTickets, resolvedToday, avgResolutionHours, totalTickets: allTickets.length },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch ticket stats" };
  }
}

// ==================== EVENTS ACTIONS ====================

export interface CrmEventFormData {
  title: string;
  eventType: string;
  customerId?: string;
  leadId?: string;
  description?: string;
  scheduledAt: Date;
  duration?: number;
  status?: string;
  location?: string;
  notes?: string;
}

// Generate event number
async function generateEventNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ id: crmEvents.id })
    .from(crmEvents)
    .where(eq(crmEvents.orgId, orgId))
    .orderBy(desc(crmEvents.createdAt))
    .limit(1);

  let nextNumber = result.length + 1;
  return `EVT-${String(nextNumber).padStart(5, '0')}`;
}

// Get all CRM events
export async function getCrmEvents(searchQuery?: string, typeFilter?: string, statusFilter?: string, dateRange?: { from: Date; to: Date }) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(crmEvents.orgId, orgId)];

    if (typeFilter && typeFilter !== 'all') {
      conditions.push(eq(crmEvents.eventType, typeFilter));
    }
    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(crmEvents.status, statusFilter));
    }
    if (dateRange) {
      conditions.push(
        and(
          gte(crmEvents.scheduledAt, dateRange.from),
          lte(crmEvents.scheduledAt, dateRange.to)
        ) as any
      );
    }

    let result = await db
      .select({
        id: crmEvents.id,
        title: crmEvents.title,
        eventType: crmEvents.eventType,
        description: crmEvents.description,
        scheduledAt: crmEvents.scheduledAt,
        duration: crmEvents.duration,
        status: crmEvents.status,
        location: crmEvents.location,
        createdBy: crmEvents.createdBy,
        notes: crmEvents.notes,
        createdAt: crmEvents.createdAt,
        customer: { id: customers.id, name: customers.name },
        lead: { id: leads.id, name: leads.name },
      })
      .from(crmEvents)
      .leftJoin(customers, eq(crmEvents.customerId, customers.id))
      .leftJoin(leads, eq(crmEvents.leadId, leads.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(crmEvents.scheduledAt));

    if (searchQuery) {
      result = result.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.customer?.name && e.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch events" };
  }
}

// Get event by ID
export async function getCrmEventById(eventId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [event] = await db
      .select()
      .from(crmEvents)
      .where(and(eq(crmEvents.id, eventId), eq(crmEvents.orgId, orgId)))
      .limit(1);

    if (!event) return { success: false, error: "Event not found" };

    return { success: true, data: event };
  } catch (error) {
    return { success: false, error: "Failed to fetch event" };
  }
}

// Create CRM event
export async function createCrmEvent(data: CrmEventFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.title) return { success: false, error: "Title is required" };

    const { userId } = await auth();

    const [newEvent] = await db
      .insert(crmEvents)
      .values({
        orgId,
        title: data.title,
        eventType: data.eventType,
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        description: data.description || null,
        scheduledAt: data.scheduledAt,
        duration: data.duration || 30,
        status: data.status || 'scheduled',
        location: data.location || null,
        createdBy: userId || 'system',
        notes: data.notes || null,
      })
      .returning();

    revalidatePath('/crm/events');
    revalidatePath('/crm');

    return { success: true, data: newEvent, message: "Event created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create event" };
  }
}

// Update CRM event
export async function updateCrmEvent(eventId: string, data: Partial<CrmEventFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.leadId !== undefined) updateData.leadId = data.leadId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updatedEvent] = await db
      .update(crmEvents)
      .set(updateData)
      .where(and(eq(crmEvents.id, eventId), eq(crmEvents.orgId, orgId)))
      .returning();

    if (!updatedEvent) return { success: false, error: "Event not found" };

    revalidatePath('/crm/events');

    return { success: true, data: updatedEvent, message: "Event updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update event" };
  }
}

// Delete CRM event
export async function deleteCrmEvent(eventId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(crmEvents)
      .where(and(eq(crmEvents.id, eventId), eq(crmEvents.orgId, orgId)));

    revalidatePath('/crm/events');

    return { success: true, message: "Event deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete event" };
  }
}

// ==================== CALLS ACTIONS ====================

export interface CrmCallFormData {
  customerId?: string;
  leadId?: string;
  callType: string;
  subject: string;
  duration?: number;
  summary?: string;
  outcome?: string;
  followUpDate?: Date;
}

// Generate call number
async function generateCallNumber(orgId: string): Promise<string> {
  const result = await db
    .select({ id: crmCalls.id })
    .from(crmCalls)
    .where(eq(crmCalls.orgId, orgId))
    .orderBy(desc(crmCalls.createdAt))
    .limit(1);

  let nextNumber = result.length + 1;
  return `CALL-${String(nextNumber).padStart(5, '0')}`;
}

// Get all CRM calls
export async function getCrmCalls(searchQuery?: string, typeFilter?: string, outcomeFilter?: string, dateRange?: { from: Date; to: Date }) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const conditions = [eq(crmCalls.orgId, orgId)];

    if (typeFilter && typeFilter !== 'all') {
      conditions.push(eq(crmCalls.callType, typeFilter));
    }
    if (outcomeFilter && outcomeFilter !== 'all') {
      conditions.push(eq(crmCalls.outcome, outcomeFilter));
    }
    if (dateRange) {
      conditions.push(
        and(
          gte(crmCalls.createdAt, dateRange.from),
          lte(crmCalls.createdAt, dateRange.to)
        ) as any
      );
    }

    let result = await db
      .select({
        id: crmCalls.id,
        callType: crmCalls.callType,
        subject: crmCalls.subject,
        duration: crmCalls.duration,
        summary: crmCalls.summary,
        outcome: crmCalls.outcome,
        followUpDate: crmCalls.followUpDate,
        createdBy: crmCalls.createdBy,
        createdAt: crmCalls.createdAt,
        customer: { id: customers.id, name: customers.name },
        lead: { id: leads.id, name: leads.name },
      })
      .from(crmCalls)
      .leftJoin(customers, eq(crmCalls.customerId, customers.id))
      .leftJoin(leads, eq(crmCalls.leadId, leads.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(crmCalls.createdAt));

    if (searchQuery) {
      result = result.filter(c =>
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.customer?.name && c.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.summary && c.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch calls" };
  }
}

// Get call by ID
export async function getCrmCallById(callId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [call] = await db
      .select()
      .from(crmCalls)
      .where(and(eq(crmCalls.id, callId), eq(crmCalls.orgId, orgId)))
      .limit(1);

    if (!call) return { success: false, error: "Call not found" };

    return { success: true, data: call };
  } catch (error) {
    return { success: false, error: "Failed to fetch call" };
  }
}

// Create CRM call
export async function createCrmCall(data: CrmCallFormData) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    if (!data.subject) return { success: false, error: "Subject is required" };

    const { userId } = await auth();

    const [newCall] = await db
      .insert(crmCalls)
      .values({
        orgId,
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        callType: data.callType,
        subject: data.subject,
        duration: data.duration || 0,
        summary: data.summary || null,
        outcome: data.outcome || null,
        followUpDate: data.followUpDate || null,
        createdBy: userId || 'system',
      })
      .returning();

    revalidatePath('/crm/calls');
    revalidatePath('/crm');

    return { success: true, data: newCall, message: "Call logged successfully" };
  } catch (error) {
    return { success: false, error: "Failed to log call" };
  }
}

// Update CRM call
export async function updateCrmCall(callId: string, data: Partial<CrmCallFormData>) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const updateData: Record<string, any> = {};
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.leadId !== undefined) updateData.leadId = data.leadId;
    if (data.callType !== undefined) updateData.callType = data.callType;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.outcome !== undefined) updateData.outcome = data.outcome;
    if (data.followUpDate !== undefined) updateData.followUpDate = data.followUpDate;

    const [updatedCall] = await db
      .update(crmCalls)
      .set(updateData)
      .where(and(eq(crmCalls.id, callId), eq(crmCalls.orgId, orgId)))
      .returning();

    if (!updatedCall) return { success: false, error: "Call not found" };

    revalidatePath('/crm/calls');

    return { success: true, data: updatedCall, message: "Call updated successfully" };
  } catch (error) {
    return { success: false, error: "Failed to update call" };
  }
}

// Delete CRM call
export async function deleteCrmCall(callId: string) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    await db
      .delete(crmCalls)
      .where(and(eq(crmCalls.id, callId), eq(crmCalls.orgId, orgId)));

    revalidatePath('/crm/calls');

    return { success: true, message: "Call deleted successfully" };
  } catch (error) {
    return { success: false, error: "Failed to delete call" };
  }
}

// Get call stats
export async function getCallStats() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allCalls = await db
      .select({
        callType: crmCalls.callType,
        duration: crmCalls.duration,
        outcome: crmCalls.outcome,
        createdAt: crmCalls.createdAt,
      })
      .from(crmCalls)
      .where(eq(crmCalls.orgId, orgId));

    const callsToday = allCalls.filter(c => c.createdAt >= today && c.createdAt < tomorrow);
    const totalCallsToday = callsToday.length;

    const totalDuration = callsToday.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = totalCallsToday > 0 ? Math.round(totalDuration / totalCallsToday) : 0;

    const connectedCalls = callsToday.filter(c => c.outcome === 'Connected').length;
    const connectedRate = totalCallsToday > 0 ? Math.round((connectedCalls / totalCallsToday) * 100) : 0;

    return {
      success: true,
      data: { totalCallsToday, avgDuration, connectedRate },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch call stats" };
  }
}

// ==================== CUSTOMER/LEAD DROPDOWN ACTIONS ====================

// Get customers for dropdown
export async function getCustomersForDropdown() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.orgId, orgId), eq(customers.isActive, true)))
      .orderBy(customers.name);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch customers" };
  }
}

// Get leads for dropdown
export async function getLeadsForDropdown() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const result = await db
      .select({ id: leads.id, name: leads.name, company: leads.company })
      .from(leads)
      .where(eq(leads.orgId, orgId))
      .orderBy(desc(leads.createdAt));

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to fetch leads" };
  }
}

// ==================== CRM DASHBOARD ACTIONS ====================

export interface CrmDashboardData {
  totalLeads: number;
  wonLeads: number;
  openTickets: number;
  scheduledCalls: number;
  recentLeads: Array<{
    id: string;
    name: string;
    company: string | null;
    status: string;
    estimatedValue: string | null;
    createdAt: Date;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    scheduledAt: Date;
    customer: { name: string } | null;
  }>;
  pipelineValue: number;
  ticketsByPriority: Record<string, number>;
}

export async function getCrmDashboardData(): Promise<{ success: boolean; data?: CrmDashboardData; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    // Get all leads
    const allLeads = await db
      .select({
        id: leads.id,
        name: leads.name,
        company: leads.company,
        status: leads.status,
        estimatedValue: leads.estimatedValue,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(eq(leads.orgId, orgId))
      .orderBy(desc(leads.createdAt))
      .limit(50);

    const totalLeads = allLeads.length;
    const wonLeads = allLeads.filter(l => l.status === 'won').length;
    const pipelineValue = allLeads
      .filter(l => !['won', 'lost'].includes(l.status))
      .reduce((sum, l) => sum + parseFloat(l.estimatedValue || '0'), 0);

    const recentLeads = allLeads.slice(0, 5);

    // Get open tickets
    const openTicketsResult = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(and(
        eq(tickets.orgId, orgId),
        sql`${tickets.status} IN ('open', 'in_progress')`
      ));
    const openTickets = openTicketsResult.length;

    // Get scheduled events (upcoming)
    const now = new Date();
    const upcomingEventsResult = await db
      .select({
        id: crmEvents.id,
        title: crmEvents.title,
        eventType: crmEvents.eventType,
        scheduledAt: crmEvents.scheduledAt,
        customer: { name: customers.name },
      })
      .from(crmEvents)
      .leftJoin(customers, eq(crmEvents.customerId, customers.id))
      .where(and(
        eq(crmEvents.orgId, orgId),
        gte(crmEvents.scheduledAt, now),
        eq(crmEvents.status, 'scheduled')
      ))
      .orderBy(crmEvents.scheduledAt)
      .limit(5);

    const scheduledCalls = await db
      .select({ id: crmEvents.id })
      .from(crmEvents)
      .where(and(
        eq(crmEvents.orgId, orgId),
        eq(crmEvents.eventType, 'Call'),
        eq(crmEvents.status, 'scheduled'),
        gte(crmEvents.scheduledAt, now)
      ));

    // Tickets by priority
    const allTickets = await db
      .select({ priority: tickets.priority })
      .from(tickets)
      .where(and(
        eq(tickets.orgId, orgId),
        sql`${tickets.status} IN ('open', 'in_progress')`
      ));

    const ticketsByPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const ticket of allTickets) {
      if (ticket.priority in ticketsByPriority) {
        ticketsByPriority[ticket.priority]++;
      }
    }

    return {
      success: true,
      data: {
        totalLeads,
        wonLeads,
        openTickets,
        scheduledCalls: scheduledCalls.length,
        recentLeads,
        upcomingEvents: upcomingEventsResult,
        pipelineValue,
        ticketsByPriority,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch CRM dashboard data" };
  }
}
