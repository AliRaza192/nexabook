"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Plus,
  Search,
  Loader2,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Mail,
  CheckSquare,
  Clock,
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
  getCrmEvents,
  deleteCrmEvent,
  updateCrmEvent,
} from "@/lib/actions/crm";

interface CrmEventData {
  id: string;
  title: string;
  eventType: string;
  description: string | null;
  scheduledAt: Date;
  duration: number | null;
  status: string;
  location: string | null;
  createdBy: string;
  notes: string | null;
  createdAt: Date;
  customer: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
}

const eventColors: Record<string, string> = {
  Meeting: "bg-blue-100 text-blue-800 border-blue-200",
  Call: "bg-purple-100 text-purple-800 border-purple-200",
  Email: "bg-green-100 text-green-800 border-green-200",
  Task: "bg-orange-100 text-orange-800 border-orange-200",
  Note: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "no_show": "bg-yellow-100 text-yellow-800",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "30 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const eventIcons: Record<string, React.FC<{ className?: string }>> = {
  Meeting: Calendar,
  Call: Phone,
  Email: Mail,
  Task: CheckSquare,
  Note: MapPin,
};

export default function EventsPage() {
  const [events, setEvents] = useState<CrmEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const result = await getCrmEvents(searchQuery, typeFilter, statusFilter);
      if (result.success && result.data) {
        setEvents(result.data as CrmEventData[]);
      }
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [searchQuery, typeFilter, statusFilter]);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    setActionLoading(eventId);
    try {
      const result = await deleteCrmEvent(eventId);
      if (result.success) {
        await loadEvents();
      } else {
        alert(result.error || "Failed to delete event");
      }
    } catch (error) {
      alert("Failed to delete event");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (eventId: string, status: string) => {
    setActionLoading(eventId);
    try {
      const result = await updateCrmEvent(eventId, { status });
      if (result.success) {
        await loadEvents();
      } else {
        alert(result.error || "Failed to update status");
      }
    } catch (error) {
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !events.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading events...</p>
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
          <h1 className="text-3xl font-bold text-nexabook-900">Events & Meetings</h1>
          <p className="text-nexabook-600 mt-1">
            Schedule and track meetings, calls, emails, and tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md border ${
                viewMode === "list"
                  ? "bg-nexabook-900 text-white border-nexabook-900"
                  : "bg-white text-nexabook-600 border-nexabook-200"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded-md border ${
                viewMode === "calendar"
                  ? "bg-nexabook-900 text-white border-nexabook-900"
                  : "bg-white text-nexabook-600 border-nexabook-200"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Link href="/crm/events/new">
            <Button className="bg-nexabook-900 hover:bg-nexabook-800">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search by title, customer, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Call">Call</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Task">Task</SelectItem>
                <SelectItem value="Note">Note</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List View */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-nexabook-900">
              Events ({events.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No events found</h3>
                <p className="text-nexabook-600 mb-4">
                  {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Schedule your first event"}
                </p>
                {!searchQuery && typeFilter === "all" && statusFilter === "all" && (
                  <Link href="/crm/events/new">
                    <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                      <Plus className="mr-2 h-4 w-4" />
                      New Event
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-nexabook-200 bg-nexabook-50">
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Title</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Type</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Customer</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Scheduled</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Duration</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Status</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Location</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const EventIcon = eventIcons[event.eventType] || eventIcons.Meeting;
                      return (
                        <motion.tr
                          key={event.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-nexabook-100 flex items-center justify-center flex-shrink-0">
                                <EventIcon className="h-3.5 w-3.5 text-nexabook-600" />
                              </div>
                              <span className="text-sm font-medium text-nexabook-900 max-w-[200px] truncate">
                                {event.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge className={`text-xs border ${eventColors[event.eventType] || eventColors.Meeting}`}>
                              {event.eventType}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-sm text-nexabook-600">
                              {event.customer?.name || event.lead?.name || "—"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-xs text-nexabook-600">
                              {formatDateTime(event.scheduledAt)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-xs text-nexabook-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(event.duration)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge className={`text-xs ${statusColors[event.status] || statusColors.scheduled}`}>
                              {event.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4">
                            {event.location ? (
                              <span className="text-xs text-nexabook-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="max-w-[120px] truncate">{event.location}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-nexabook-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1">
                              {actionLoading === event.id && (
                                <Loader2 className="h-3 w-3 animate-spin text-nexabook-400" />
                              )}
                              {event.status === "scheduled" && (
                                <Select onValueChange={(val) => handleStatusChange(event.id, val)}>
                                  <SelectTrigger className="h-6 w-[90px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="no_show">No Show</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="text-xs text-red-500 hover:text-red-700 ml-1"
                                disabled={actionLoading === event.id}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar View - Simple grid by date */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {events.length === 0 ? (
            <div className="col-span-7 text-center py-12">
              <Calendar className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <p className="text-nexabook-600">No events to display</p>
            </div>
          ) : (
            events.map((event) => {
              const EventIcon = eventIcons[event.eventType] || eventIcons.Meeting;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-nexabook-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <EventIcon className="h-4 w-4 text-nexabook-600" />
                    <span className="text-sm font-medium text-nexabook-900 truncate">{event.title}</span>
                  </div>
                  <Badge className={`text-xs border mb-2 ${eventColors[event.eventType] || eventColors.Meeting}`}>
                    {event.eventType}
                  </Badge>
                  <div className="space-y-1 text-xs text-nexabook-500">
                    <p>{formatDateTime(event.scheduledAt)}</p>
                    {event.customer && <p>{event.customer.name}</p>}
                    {event.location && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-nexabook-100">
                    <Badge className={`text-xs ${statusColors[event.status] || statusColors.scheduled}`}>
                      {event.status.replace("_", " ")}
                    </Badge>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
