"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Ticket,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTickets,
  getTicketStats,
  deleteTicket,
  resolveTicket,
  updateTicket,
} from "@/lib/actions/crm";

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  customer: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  reopened: "bg-orange-100 text-orange-800",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatHours(hours: number): string {
  if (hours < 1) return "< 1 hr";
  if (hours < 24) return `${Math.round(hours)} hrs`;
  return `${Math.round(hours / 24)} days`;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [stats, setStats] = useState<{ openTickets: number; resolvedToday: number; avgResolutionHours: number; totalTickets: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await getTickets(searchQuery, statusFilter, priorityFilter);
      if (result.success && result.data) {
        setTickets(result.data as TicketData[]);
      }
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getTicketStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      // silently fail
    }
  };

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [searchQuery, statusFilter, priorityFilter]);

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Delete this ticket?")) return;
    setActionLoading(ticketId);
    try {
      const result = await deleteTicket(ticketId);
      if (result.success) {
        await loadTickets();
        await loadStats();
      } else {
        alert(result.error || "Failed to delete ticket");
      }
    } catch (error) {
      alert("Failed to delete ticket");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (ticketId: string) => {
    setActionLoading(ticketId);
    try {
      const result = await resolveTicket(ticketId);
      if (result.success) {
        await loadTickets();
        await loadStats();
      } else {
        alert(result.error || "Failed to resolve ticket");
      }
    } catch (error) {
      alert("Failed to resolve ticket");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    setActionLoading(ticketId);
    try {
      const result = await updateTicket(ticketId, { status });
      if (result.success) {
        await loadTickets();
        await loadStats();
      } else {
        alert(result.error || "Failed to update status");
      }
    } catch (error) {
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !tickets.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-nexabook-900">Support Tickets</h1>
          <p className="text-nexabook-600 mt-1">
            Manage customer support requests and track resolution.
          </p>
        </div>
        <Link href="/crm/tickets/new">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Open Tickets</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.openTickets}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Resolved Today</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Avg Resolution Time</p>
                  <p className="text-2xl font-bold text-nexabook-900">
                    {formatHours(stats.avgResolutionHours)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search by ticket#, subject, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-nexabook-900">
            Tickets ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No tickets found</h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first support ticket"}
              </p>
              {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                <Link href="/crm/tickets/new">
                  <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                    <Plus className="mr-2 h-4 w-4" />
                    New Ticket
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200 bg-nexabook-50">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Ticket#</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Subject</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Customer</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Priority</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Status</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Assigned To</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Created</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <span className="text-sm font-mono font-medium text-nexabook-900">
                          {ticket.ticketNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="text-sm text-nexabook-900 max-w-[250px] truncate" title={ticket.subject}>
                          {ticket.subject}
                        </p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-sm text-nexabook-600">
                          {ticket.customer?.name || ticket.lead?.name || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs border ${priorityColors[ticket.priority] || priorityColors.medium}`}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${statusColors[ticket.status] || statusColors.open}`}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-sm text-nexabook-600">
                          {ticket.assignedTo || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs text-nexabook-500">{formatDate(ticket.createdAt)}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1">
                          {actionLoading === ticket.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-nexabook-400" />
                          )}
                          {(ticket.status === "open" || ticket.status === "in_progress") && (
                            <button
                              onClick={() => handleResolve(ticket.id)}
                              className="text-xs text-green-600 hover:text-green-800"
                              disabled={actionLoading === ticket.id}
                            >
                              Resolve
                            </button>
                          )}
                          {ticket.status !== "resolved" && ticket.status !== "closed" && (
                            <Select onValueChange={(val) => handleStatusChange(ticket.id, val)}>
                              <SelectTrigger className="h-6 w-[70px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <button
                            onClick={() => handleDelete(ticket.id)}
                            className="text-xs text-red-500 hover:text-red-700 ml-1"
                            disabled={actionLoading === ticket.id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
