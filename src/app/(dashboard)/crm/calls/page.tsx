"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Plus,
  Search,
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  CheckCircle,
  TrendingUp,
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
  getCrmCalls,
  getCallStats,
  deleteCrmCall,
  updateCrmCall,
} from "@/lib/actions/crm";

interface CrmCallData {
  id: string;
  callType: string;
  subject: string;
  duration: number | null;
  summary: string | null;
  outcome: string | null;
  followUpDate: Date | null;
  createdBy: string;
  createdAt: Date;
  customer: { id: string; name: string } | null;
  lead: { id: string; name: string } | null;
}

const callTypeIcons: Record<string, typeof PhoneIncoming> = {
  Incoming: PhoneIncoming,
  Outgoing: PhoneOutgoing,
  Missed: PhoneMissed,
};

const callTypeColors: Record<string, string> = {
  Incoming: "bg-green-100 text-green-800 border-green-200",
  Outgoing: "bg-blue-100 text-blue-800 border-blue-200",
  Missed: "bg-red-100 text-red-800 border-red-200",
};

const outcomeColors: Record<string, string> = {
  Connected: "bg-green-100 text-green-800",
  "Voicemail": "bg-yellow-100 text-yellow-800",
  "No Answer": "bg-orange-100 text-orange-800",
  Busy: "bg-red-100 text-red-800",
  "Call Back Later": "bg-blue-100 text-blue-800",
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

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CrmCallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [stats, setStats] = useState<{ totalCallsToday: number; avgDuration: number; connectedRate: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const result = await getCrmCalls(searchQuery, typeFilter, outcomeFilter);
      if (result.success && result.data) {
        setCalls(result.data as CrmCallData[]);
      }
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getCallStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      // silently fail
    }
  };

  useEffect(() => {
    loadCalls();
    loadStats();
  }, [searchQuery, typeFilter, outcomeFilter]);

  const handleDelete = async (callId: string) => {
    if (!confirm("Delete this call log?")) return;
    setActionLoading(callId);
    try {
      const result = await deleteCrmCall(callId);
      if (result.success) {
        await loadCalls();
        await loadStats();
      } else {
        alert(result.error || "Failed to delete call");
      }
    } catch (error) {
      alert("Failed to delete call");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOutcomeChange = async (callId: string, outcome: string) => {
    setActionLoading(callId);
    try {
      const result = await updateCrmCall(callId, { outcome });
      if (result.success) {
        await loadCalls();
        await loadStats();
      } else {
        alert(result.error || "Failed to update outcome");
      }
    } catch (error) {
      alert("Failed to update outcome");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !calls.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading call logs...</p>
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
          <h1 className="text-3xl font-bold text-nexabook-900">Call Logs</h1>
          <p className="text-nexabook-600 mt-1">
            Track incoming, outgoing, and missed calls with customers.
          </p>
        </div>
        <Link href="/crm/calls/new">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="mr-2 h-4 w-4" />
            Log Call
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
                  <p className="text-sm font-medium text-nexabook-600">Total Calls Today</p>
                  <p className="text-2xl font-bold text-nexabook-900">{stats.totalCallsToday}</p>
                </div>
                <Phone className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-nexabook-900">
                    {stats.avgDuration > 60
                      ? `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`
                      : `${stats.avgDuration}s`}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Connected Rate</p>
                  <p className="text-2xl font-bold text-green-600">{stats.connectedRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
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
                placeholder="Search by subject, customer, or summary..."
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
                <SelectItem value="Incoming">Incoming</SelectItem>
                <SelectItem value="Outgoing">Outgoing</SelectItem>
                <SelectItem value="Missed">Missed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="Voicemail">Voicemail</SelectItem>
                <SelectItem value="No Answer">No Answer</SelectItem>
                <SelectItem value="Busy">Busy</SelectItem>
                <SelectItem value="Call Back Later">Call Back Later</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-nexabook-900">
            Call Logs ({calls.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No call logs found</h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery || typeFilter !== "all" || outcomeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Log your first call"}
              </p>
              {!searchQuery && typeFilter === "all" && outcomeFilter === "all" && (
                <Link href="/crm/calls/new">
                  <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                    <Plus className="mr-2 h-4 w-4" />
                    Log Call
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200 bg-nexabook-50">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Customer</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Lead</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Type</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Subject</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Duration</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Outcome</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Date</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-nexabook-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => {
                    const CallIcon = callTypeIcons[call.callType] || Phone;
                    return (
                      <motion.tr
                        key={call.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <span className="text-sm text-nexabook-900">
                            {call.customer?.name || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-sm text-nexabook-600">
                            {call.lead?.name || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <CallIcon className="h-3.5 w-3.5 text-nexabook-500" />
                            <Badge className={`text-xs border ${callTypeColors[call.callType] || callTypeColors.Outgoing}`}>
                              {call.callType}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-sm text-nexabook-900 max-w-[200px] truncate block" title={call.subject}>
                            {call.subject}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs text-nexabook-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {call.outcome ? (
                            <Badge className={`text-xs ${outcomeColors[call.outcome] || "bg-gray-100 text-gray-800"}`}>
                              {call.outcome}
                            </Badge>
                          ) : (
                            <Select onValueChange={(val) => handleOutcomeChange(call.id, val)}>
                              <SelectTrigger className="h-6 w-[120px] text-xs">
                                <SelectValue placeholder="Set outcome" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Connected">Connected</SelectItem>
                                <SelectItem value="Voicemail">Voicemail</SelectItem>
                                <SelectItem value="No Answer">No Answer</SelectItem>
                                <SelectItem value="Busy">Busy</SelectItem>
                                <SelectItem value="Call Back Later">Call Back Later</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-xs text-nexabook-500">{formatDateTime(call.createdAt)}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1">
                            {actionLoading === call.id && (
                              <Loader2 className="h-3 w-3 animate-spin text-nexabook-400" />
                            )}
                            <button
                              onClick={() => handleDelete(call.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                              disabled={actionLoading === call.id}
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
    </div>
  );
}
