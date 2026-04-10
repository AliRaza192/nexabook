"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Loader2,
  LayoutGrid,
  List,
  Building2,
  DollarSign,
  Mail,
  Phone,
  ArrowRight,
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
  getLeads,
  getLeadStats,
  updateLeadStatus,
  deleteLead,
  convertLeadToCustomer,
  type LeadWithCustomer,
} from "@/lib/actions/crm";

const COLUMNS = [
  { key: "new", label: "New", color: "bg-blue-500", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { key: "contacted", label: "Contacted", color: "bg-cyan-500", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  { key: "qualified", label: "Qualified", color: "bg-purple-500", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { key: "proposal", label: "Proposal", color: "bg-yellow-500", bgColor: "bg-yellow-50", borderColor: "border-yellow-200" },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-500", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  { key: "won", label: "Won", color: "bg-green-500", bgColor: "bg-green-50", borderColor: "border-green-200" },
  { key: "lost", label: "Lost", color: "bg-red-500", bgColor: "bg-red-50", borderColor: "border-red-50" },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-cyan-100 text-cyan-800",
  qualified: "bg-purple-100 text-purple-800",
  proposal: "bg-yellow-100 text-yellow-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

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
  });
}

// Lead Card Component
function LeadCard({
  lead,
  onStatusChange,
  onDelete,
  onConvert,
}: {
  lead: LeadWithCustomer;
  onStatusChange: (leadId: string, status: string) => void;
  onDelete: (leadId: string) => void;
  onConvert: (leadId: string) => void;
}) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await onStatusChange(lead.id, newStatus);
    } finally {
      setUpdating(false);
      setShowStatusDropdown(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-nexabook-200 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-nexabook-900 truncate">{lead.name}</h4>
          {lead.company && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 text-nexabook-400" />
              <span className="text-xs text-nexabook-500 truncate">{lead.company}</span>
            </div>
          )}
        </div>
        {updating && <Loader2 className="h-3 w-3 animate-spin text-nexabook-400" />}
      </div>

      <div className="flex items-center justify-between mb-2">
        {lead.estimatedValue && parseFloat(lead.estimatedValue) > 0 ? (
          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(parseFloat(lead.estimatedValue))}
          </span>
        ) : (
          <span className="text-xs text-nexabook-400">No value</span>
        )}
        <Badge className={`text-xs ${statusColors[lead.status]}`}>
          {lead.status}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-nexabook-400 mb-2">
        {lead.email && (
          <span className="truncate flex items-center gap-0.5">
            <Mail className="h-3 w-3" />
            {lead.email.split("@")[0]}
          </span>
        )}
        {lead.phone && !lead.email && (
          <span className="flex items-center gap-0.5">
            <Phone className="h-3 w-3" />
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-nexabook-100">
        <span className="text-xs text-nexabook-400">{formatDate(lead.createdAt)}</span>
        <div className="flex items-center gap-1">
          {lead.status !== "won" && lead.status !== "lost" && !lead.isConverted && (
            <button
              onClick={() => onConvert(lead.id)}
              className="text-xs text-green-600 hover:text-green-800 flex items-center gap-0.5"
              title="Convert to Customer"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="text-xs text-blue-600 hover:text-blue-800"
              title="Change Status"
            >
              Status
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 top-6 bg-white border border-nexabook-200 rounded-md shadow-lg z-10 min-w-[140px]">
                {COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => handleStatusChange(col.key)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-nexabook-50 flex items-center gap-2 ${
                      lead.status === col.key ? "bg-nexabook-50 font-medium" : ""
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${col.color}`} />
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm("Delete this lead?")) onDelete(lead.id);
            }}
            className="text-xs text-red-500 hover:text-red-700"
            title="Delete"
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact Table Row
function LeadTableRow({
  lead,
  onStatusChange,
  onDelete,
  onConvert,
}: {
  lead: LeadWithCustomer;
  onStatusChange: (leadId: string, status: string) => void;
  onDelete: (leadId: string) => void;
  onConvert: (leadId: string) => void;
}) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await onStatusChange(lead.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <tr className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors">
      <td className="py-2 px-3">
        <div>
          <p className="font-medium text-sm text-nexabook-900">{lead.name}</p>
          {lead.company && (
            <p className="text-xs text-nexabook-500">{lead.company}</p>
          )}
        </div>
      </td>
      <td className="py-2 px-3 text-sm text-nexabook-600">{lead.email || "—"}</td>
      <td className="py-2 px-3 text-sm text-nexabook-600">{lead.phone || "—"}</td>
      <td className="py-2 px-3">
        {lead.estimatedValue && parseFloat(lead.estimatedValue) > 0 ? (
          <span className="text-sm font-medium text-green-600">
            {formatCurrency(parseFloat(lead.estimatedValue))}
          </span>
        ) : (
          <span className="text-xs text-nexabook-400">—</span>
        )}
      </td>
      <td className="py-2 px-3">
        <Badge className={`text-xs ${statusColors[lead.status]}`}>{lead.status}</Badge>
      </td>
      <td className="py-2 px-3">
        {lead.source && <span className="text-xs text-nexabook-500">{lead.source}</span>}
      </td>
      <td className="py-2 px-3">
        <Select value={lead.status} onValueChange={handleStatusChange} disabled={updating}>
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((col) => (
              <SelectItem key={col.key} value={col.key} className="text-xs">
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1">
          {lead.status !== "won" && lead.status !== "lost" && !lead.isConverted && (
            <button
              onClick={() => onConvert(lead.id)}
              className="text-xs text-green-600 hover:text-green-800"
              title="Convert to Customer"
            >
              Convert
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this lead?")) onDelete(lead.id);
            }}
            className="text-xs text-red-500 hover:text-red-700 ml-1"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [stats, setStats] = useState<{ totalLeads: number; wonLeads: number; pipelineValue: number; wonThisMonth: number } | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const result = await getLeads(searchQuery, statusFilter);
      if (result.success && result.data) {
        setLeads(result.data as LeadWithCustomer[]);
      }
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getLeadStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      // silently fail
    }
  };

  useEffect(() => {
    loadLeads();
    loadStats();
  }, [searchQuery, statusFilter]);

  const handleStatusChange = async (leadId: string, status: string) => {
    const result = await updateLeadStatus(leadId, status as any);
    if (result.success) {
      await loadLeads();
      await loadStats();
    } else {
      alert(result.error || "Failed to update status");
    }
  };

  const handleDelete = async (leadId: string) => {
    const result = await deleteLead(leadId);
    if (result.success) {
      await loadLeads();
      await loadStats();
    } else {
      alert(result.error || "Failed to delete lead");
    }
  };

  const handleConvert = async (leadId: string) => {
    setConverting(leadId);
    try {
      const result = await convertLeadToCustomer(leadId);
      if (result.success) {
        await loadLeads();
        await loadStats();
        alert("Lead converted to customer successfully!");
      } else {
        alert(result.error || "Failed to convert lead");
      }
    } catch (error) {
      alert("Failed to convert lead");
    } finally {
      setConverting(null);
    }
  };

  const columns = COLUMNS.map((col) => ({
    ...col,
    leads: leads.filter((l) => l.status === col.key),
  }));

  if (loading && !leads.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading leads...</p>
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
          <h1 className="text-3xl font-bold text-nexabook-900">Leads</h1>
          <p className="text-nexabook-600 mt-1">
            Manage your sales pipeline and track lead progression.
          </p>
        </div>
        <Link href="/crm/leads/new">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Total Leads</p>
                  <p className="text-2xl font-bold text-nexabook-900">{stats.totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Won This Month</p>
                  <p className="text-2xl font-bold text-green-600">{stats.wonThisMonth}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Pipeline Value</p>
                  <p className="text-2xl font-bold text-nexabook-900">
                    {formatCurrency(stats.pipelineValue)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-nexabook-600">Won Total</p>
                  <p className="text-2xl font-bold text-nexabook-900">{stats.wonLeads}</p>
                </div>
                <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">{stats.wonLeads}</Badge>
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
                placeholder="Search by name, email, company, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {COLUMNS.map((col) => (
                  <SelectItem key={col.key} value={col.key}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded-md border ${
                  viewMode === "kanban"
                    ? "bg-nexabook-900 text-white border-nexabook-900"
                    : "bg-white text-nexabook-600 border-nexabook-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md border ${
                  viewMode === "table"
                    ? "bg-nexabook-900 text-white border-nexabook-900"
                    : "bg-white text-nexabook-600 border-nexabook-200"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column, colIndex) => (
            <motion.div
              key={column.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIndex * 0.05 }}
              className="min-w-[280px] w-[280px] flex-shrink-0"
            >
              <div className={`${column.bgColor} rounded-lg border ${column.borderColor} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${column.color}`} />
                    <h3 className="font-semibold text-sm text-nexabook-900">{column.label}</h3>
                  </div>
                  <span className="text-xs text-nexabook-500 bg-white px-2 py-0.5 rounded-full">
                    {column.leads.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {column.leads.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-nexabook-400">No leads</p>
                    </div>
                  ) : (
                    column.leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onConvert={handleConvert}
                      />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <CardContent className="p-0">
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No leads found</h3>
                <p className="text-nexabook-600 mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first lead"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Link href="/crm/leads/new">
                    <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Lead
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-nexabook-200 bg-nexabook-50">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Phone</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Value</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Source</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Change Status</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <LeadTableRow
                        key={lead.id}
                        lead={lead}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onConvert={handleConvert}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
