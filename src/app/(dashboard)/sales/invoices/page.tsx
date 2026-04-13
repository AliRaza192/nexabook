"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Loader2,
  FilePlus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
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
import {
  getInvoices,
  getInvoiceStats,
  getInvoiceWithDetails,
} from "@/lib/actions/sales";
import { downloadInvoicePDF, InvoicePDFData } from "@/lib/utils/invoice-pdf";

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  grossAmount: string | null;
  taxAmount: string | null;
  netAmount: string | null;
  balanceAmount: string | null;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
  } | null;
}

interface InvoiceStats {
  totalInvoices: number;
  totalRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
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
  color: "blue" | "green" | "orange" | "red";
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      border: "border-blue-200",
    },
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      border: "border-green-200",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      border: "border-orange-200",
    },
    red: {
      bg: "bg-red-50",
      icon: "text-red-600",
      border: "border-red-200",
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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
    draft: { label: "Draft", variant: "outline" as const, icon: FileText },
    pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
    approved: { label: "Approved", variant: "success" as const, icon: CheckCircle },
    sent: { label: "Sent", variant: "default" as const, icon: Clock },
    paid: { label: "Paid", variant: "success" as const, icon: CheckCircle },
    partial: { label: "Partial", variant: "warning" as const, icon: DollarSign },
    overdue: { label: "Overdue", variant: "destructive" as const, icon: AlertCircle },
    cancelled: { label: "Cancelled", variant: "outline" as const, icon: AlertCircle },
  };

  return statusConfig[status] || statusConfig.draft;
}

// Main Invoices List Page
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load invoices and stats
  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, statsRes] = await Promise.all([
        getInvoices(searchQuery, statusFilter === "all" ? undefined : statusFilter),
        getInvoiceStats(),
      ]);

      if (invoicesRes.success && invoicesRes.data) {
        setInvoices(invoicesRes.data as Invoice[]);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
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
    if (!value) return "Rs. 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
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

  // Download PDF for an invoice
  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const result = await getInvoiceWithDetails(invoiceId);
      if (result.success && result.data) {
        const data = result.data;
        const pdfData: InvoicePDFData = {
          orgName: data.orgName,
          orgNtn: data.orgNtn,
          orgStrn: data.orgStrn,
          orgAddress: data.orgAddress,
          orgCity: data.orgCity,
          orgCountry: data.orgCountry,
          orgPhone: data.orgPhone,
          orgEmail: data.orgEmail,
          orgLogo: data.orgLogo,
          invoiceNumber: data.invoiceNumber,
          invoiceSubject: data.subject,
          invoiceReference: data.reference,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          status: data.status,
          customerName: data.customerName,
          customerNtn: data.customerNtn,
          customerAddress: data.customerAddress,
          customerCity: data.customerCity,
          customerPhone: data.customerPhone,
          items: data.items.map(item => ({
            ...item,
            productName: item.productName || undefined,
          })),
          grossAmount: data.grossAmount,
          discountAmount: data.discountAmount,
          discountPercentage: data.discountPercentage,
          taxAmount: data.taxAmount,
          shippingCharges: data.shippingCharges,
          roundOff: data.roundOff,
          netAmount: data.netAmount,
          receivedAmount: data.receivedAmount,
          balanceAmount: data.balanceAmount,
          notes: data.notes,
          orderBooker: data.orderBooker,
        };
        await downloadInvoicePDF(pdfData);
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
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
          <h1 className="text-3xl font-bold text-nexabook-900">Invoice Management</h1>
          <p className="text-nexabook-600 mt-1">
            Create, manage, and track all your sales invoices.
          </p>
        </div>

        <Link href="/sales/invoices/new">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={FileText}
            description="All time"
            color="blue"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue.toString())}
            icon={TrendingUp}
            description="From all invoices"
            color="green"
          />
          <StatCard
            title="Pending"
            value={stats.pendingInvoices}
            icon={Clock}
            description="Awaiting payment"
            color="orange"
          />
          <StatCard
            title="Overdue"
            value={stats.overdueInvoices}
            icon={AlertCircle}
            description="Past due date"
            color="red"
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
                placeholder="Search by invoice number or customer..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
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
            Invoices ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FilePlus className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No invoices found
              </h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first invoice to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/sales/invoices/new">
                  <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
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
                      Invoice #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Issue Date
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
                          <Link
                            href={`/sales/invoices/${invoice.id}`}
                            className="text-sm font-medium text-nexabook-900 hover:text-nexabook-600"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-nexabook-900">
                            {invoice.customer?.name || "Unknown Customer"}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-nexabook-600">
                            {formatDate(invoice.issueDate)}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice.id)}
                            className="h-8 w-8 p-0 text-nexabook-600 hover:bg-nexabook-100"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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
