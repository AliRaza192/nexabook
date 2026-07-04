"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Loader2,
  FilePlus,
  TrendingUp,
  CheckCircle,
  Clock,
  Eye,
  RotateCcw,
  Copy,
} from "lucide-react";
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
import { formatPKR } from "@/lib/utils/number-format";
import {
  getPurchaseInvoices,
  approvePurchaseInvoice,
  revisePurchaseInvoice,
  duplicatePurchaseInvoice,
} from "@/lib/actions/purchases";

interface PurchaseInvoice {
  id: string;
  billNumber: string;
  date: Date;
  dueDate: Date | null;
  status: 'Draft' | 'Approved' | 'Revised';
  netAmount: string | null;
  grossAmount: string | null;
  taxTotal: string | null;
  createdAt: Date;
  vendor: {
    id: string;
    name: string;
  } | null;
}

interface InvoiceStats {
  totalInvoices: number;
  totalPurchases: number;
  approvedInvoices: number;
  draftInvoices: number;
}

// Stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  color: "blue" | "green" | "orange";
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${colors.border} hover:shadow-md transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-nexabook-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-nexabook-900">{value}</p>
              <p className="text-xs text-nexabook-500 mt-2">{description}</p>
            </div>
            <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${colors.icon}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Get status badge config
function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
    Draft: { label: "Draft", variant: "outline" as const, icon: Clock },
    Approved: { label: "Approved", variant: "success" as const, icon: CheckCircle },
    Revised: { label: "Revised", variant: "secondary" as const, icon: RotateCcw },
  };

  return statusConfig[status] || statusConfig.Draft;
}

// Main Purchase Invoices List Page
export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load invoices and stats
  const loadData = async () => {
    setLoading(true);
    try {
      const invoicesRes = await getPurchaseInvoices(
        searchQuery,
        statusFilter === "all" ? undefined : statusFilter
      );

      if (invoicesRes.success && invoicesRes.data) {
        const invoiceData = invoicesRes.data as PurchaseInvoice[];
        setInvoices(invoiceData);

        // Calculate stats
        const totalInvoices = invoiceData.length;
        const approvedInvoices = invoiceData.filter(inv => inv.status === 'Approved').length;
        const draftInvoices = invoiceData.filter(inv => inv.status === 'Draft').length;
        const totalPurchases = invoiceData.reduce((sum, inv) => {
          return sum + (inv.netAmount ? parseFloat(inv.netAmount) : 0);
        }, 0);

        setStats({ totalInvoices, totalPurchases, approvedInvoices, draftInvoices });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  // Format currency
  const formatCurrency = (value: string | null) => {
    if (!value) return formatPKR(0, 'south-asian');
    return formatPKR(parseFloat(value), 'south-asian');
  };

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleApprove = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to approve this purchase invoice? This will add stock and create journal entries.")) {
      return;
    }

    const result = await approvePurchaseInvoice(invoiceId);
    if (result.success) {
      alert("Invoice approved successfully!");
      loadData();
    } else {
      alert((result as any).error || "Failed to approve invoice");
    }
  };

  const handleRevise = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to revise this purchase invoice? This will reverse stock and journal entries.")) {
      return;
    }

    const result = await revisePurchaseInvoice(invoiceId);
    if (result.success) {
      alert("Invoice revised successfully!");
      loadData();
    } else {
      alert((result as any).error || "Failed to revise invoice");
    }
  };

  // Duplicate purchase invoice
  const handleDuplicate = async (invoiceId: string) => {
    try {
      const result = await duplicatePurchaseInvoice(invoiceId);
      if (result.success && result.data) {
        alert(`Document duplicated as ${result.billNumber}. You are now editing the copy.`);
        window.location.href = `/purchases/invoices/new?id=${result.data.id}`;
      } else {
        alert(result.error || "Failed to duplicate invoice");
      }
    } catch (error) {
      console.error("Failed to duplicate invoice:", error);
      alert("Failed to duplicate invoice. Please try again.");
    }
  };

  if (loading && !invoices.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading invoices...</p>
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
          <h1 className="text-3xl font-bold text-nexabook-900">Purchase Invoice Management</h1>
          <p className="text-nexabook-600 mt-1">
            Create, manage, and track all your purchase invoices.
          </p>
        </div>

        <Link href="/purchases/invoices/new">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="mr-2 h-4 w-4" />
            Create Purchase Invoice
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={ShoppingCart}
            description="All time"
            color="blue"
          />
          <StatCard
            title="Total Purchases"
            value={formatCurrency(stats.totalPurchases.toString())}
            icon={TrendingUp}
            description="From all invoices"
            color="green"
          />
          <StatCard
            title="Approved"
            value={stats.approvedInvoices}
            icon={CheckCircle}
            description="Stock added"
            color="green"
          />
          <StatCard
            title="Draft"
            value={stats.draftInvoices}
            icon={Clock}
            description="Pending approval"
            color="orange"
          />
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search by bill number or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-nexabook-600" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Revised">Revised</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Purchase Invoices ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FilePlus className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No purchase invoices found
              </h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first purchase invoice to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/purchases/invoices/new">
                  <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Purchase Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Bill #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Vendor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Due Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => {
                    const statusConfig = getStatusBadge(invoice.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-nexabook-900">
                            {invoice.billNumber}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-nexabook-900">
                            {invoice.vendor?.name || "Unknown Vendor"}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-nexabook-600">
                            {formatDate(invoice.date)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-nexabook-600">
                            {formatDate(invoice.dueDate)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold text-nexabook-900">
                            {formatCurrency(invoice.netAmount)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={statusConfig.variant}
                            className="text-xs gap-1"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-nexabook-100"
                              title="View"
                            >
                              <Eye className="h-4 w-4 text-nexabook-600" />
                            </Button>
                            {invoice.status === 'Draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-green-600 hover:bg-green-50"
                                onClick={() => handleApprove(invoice.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {invoice.status === 'Approved' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-orange-600 hover:bg-orange-50"
                                onClick={() => handleRevise(invoice.id)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Revise
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(invoice.id)}
                              className="h-8 w-8 p-0 text-nexabook-600 hover:bg-nexabook-100"
                              title="Duplicate Invoice"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
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
