"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Handshake,
  Ticket,
  Phone,
  TrendingUp,
  Calendar,
  Loader2,
  ArrowRight,
  MapPin,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCrmDashboardData, type CrmDashboardData } from "@/lib/actions/crm";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-cyan-100 text-cyan-800",
  qualified: "bg-purple-100 text-purple-800",
  proposal: "bg-yellow-100 text-yellow-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const eventIcons: Record<string, typeof Calendar> = {
  Meeting: Calendar,
  Call: Phone,
  Email: MapPin,
  Task: Building2,
  Note: Handshake,
};

export default function CRMPage() {
  const [data, setData] = useState<CrmDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getCrmDashboardData();
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (error) {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading CRM dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-nexabook-600">Failed to load dashboard data</p>
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
      >
        <h1 className="text-3xl font-bold text-nexabook-900">CRM Dashboard</h1>
        <p className="text-nexabook-600 mt-1">
          Manage leads, support tickets, events, and call logs.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Total Leads</p>
                  <p className="text-2xl font-bold text-nexabook-900 mt-1">{data.totalLeads}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {data.wonLeads} won
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Pipeline Value</p>
                  <p className="text-2xl font-bold text-nexabook-900 mt-1">
                    {formatCurrency(data.pipelineValue)}
                  </p>
                  <p className="text-xs text-nexabook-500 mt-1">
                    Active pipeline
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Open Tickets</p>
                  <p className="text-2xl font-bold text-nexabook-900 mt-1">{data.openTickets}</p>
                  <div className="flex gap-1 mt-1">
                    {data.ticketsByPriority.urgent > 0 && (
                      <Badge className="text-xs bg-red-100 text-red-800 border-0">
                        {data.ticketsByPriority.urgent} urgent
                      </Badge>
                    )}
                    {data.ticketsByPriority.high > 0 && (
                      <Badge className="text-xs bg-orange-100 text-orange-800 border-0">
                        {data.ticketsByPriority.high} high
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Scheduled Calls</p>
                  <p className="text-2xl font-bold text-nexabook-900 mt-1">{data.scheduledCalls}</p>
                  <p className="text-xs text-nexabook-500 mt-1">
                    Upcoming events
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Leads & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-nexabook-900">Recent Leads</CardTitle>
                <Link href="/crm/leads" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentLeads.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-nexabook-300 mx-auto mb-2" />
                  <p className="text-sm text-nexabook-500">No leads yet</p>
                  <Link href="/crm/leads/new">
                    <span className="text-sm text-blue-600 hover:underline">Add your first lead</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-nexabook-900 truncate">{lead.name}</p>
                          <Badge className={`text-xs ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                            {lead.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {lead.company && (
                            <span className="text-xs text-nexabook-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {lead.company}
                            </span>
                          )}
                          {lead.estimatedValue && parseFloat(lead.estimatedValue) > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              {formatCurrency(parseFloat(lead.estimatedValue))}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-nexabook-400 whitespace-nowrap ml-2">
                        {formatDate(lead.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-nexabook-900">Upcoming Events</CardTitle>
                <Link href="/crm/events" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-nexabook-300 mx-auto mb-2" />
                  <p className="text-sm text-nexabook-500">No upcoming events</p>
                  <Link href="/crm/events/new">
                    <span className="text-sm text-blue-600 hover:underline">Schedule an event</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.upcomingEvents.map((event) => {
                    const EventIcon = eventIcons[event.eventType] || Calendar;
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-nexabook-100 flex items-center justify-center flex-shrink-0">
                            <EventIcon className="h-4 w-4 text-nexabook-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-nexabook-900 truncate">{event.title}</p>
                            <div className="flex items-center gap-2 text-xs text-nexabook-500">
                              <Badge variant="outline" className="text-xs">{event.eventType}</Badge>
                              {event.customer && (
                                <span className="truncate">{event.customer.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-nexabook-400 whitespace-nowrap ml-2">
                          {formatDateTime(event.scheduledAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-nexabook-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/crm/leads/new">
                <div className="p-4 rounded-lg border border-nexabook-200 hover:border-nexabook-400 hover:bg-nexabook-50 transition-all cursor-pointer text-center">
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-nexabook-900">Add Lead</p>
                </div>
              </Link>
              <Link href="/crm/tickets/new">
                <div className="p-4 rounded-lg border border-nexabook-200 hover:border-nexabook-400 hover:bg-nexabook-50 transition-all cursor-pointer text-center">
                  <Ticket className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-nexabook-900">New Ticket</p>
                </div>
              </Link>
              <Link href="/crm/events/new">
                <div className="p-4 rounded-lg border border-nexabook-200 hover:border-nexabook-400 hover:bg-nexabook-50 transition-all cursor-pointer text-center">
                  <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-nexabook-900">Schedule Event</p>
                </div>
              </Link>
              <Link href="/crm/calls/new">
                <div className="p-4 rounded-lg border border-nexabook-200 hover:border-nexabook-400 hover:bg-nexabook-50 transition-all cursor-pointer text-center">
                  <Phone className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-nexabook-900">Log Call</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
