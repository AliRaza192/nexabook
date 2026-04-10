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
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
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
  getSaleOrders,
} from "@/lib/actions/sales";

interface SaleOrder {
  id: string;
  orderNumber: string;
  orderDate: Date;
  deliveryDate: Date | null;
  status: 'draft' | 'pending' | 'approved' | 'confirmed' | 'delivered' | 'cancelled';
  grossAmount: string | null;
  taxAmount: string | null;
  netAmount: string | null;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
  } | null;
}

interface OrderStats {
  totalOrders: number;
  totalValue: number;
  approvedOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
}

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
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200" },
    red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-200" },
  };
  const colors = colorClasses[color];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${colors.border} hover:shadow-md transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-2">{description}</p>
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

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
    draft: { label: "Draft", variant: "outline" as const, icon: FileText },
    pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
    approved: { label: "Approved", variant: "success" as const, icon: CheckCircle },
    confirmed: { label: "Confirmed", variant: "default" as const, icon: CheckCircle },
    delivered: { label: "Delivered", variant: "success" as const, icon: CheckCircle },
    cancelled: { label: "Cancelled", variant: "destructive" as const, icon: AlertCircle },
  };
  return statusConfig[status] || statusConfig.draft;
}

export default function SaleOrdersPage() {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const ordersRes = await getSaleOrders(searchQuery, statusFilter === "all" ? undefined : statusFilter);
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data as SaleOrder[]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  const formatCurrency = (value: string | null) => {
    if (!value) return "Rs. 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stats = {
    totalOrders: orders.length,
    totalValue: orders.reduce((sum, o) => sum + parseFloat(o.netAmount || "0"), 0),
    approvedOrders: orders.filter(o => o.status === 'approved' || o.status === 'confirmed').length,
    pendingOrders: orders.filter(o => o.status === 'draft' || o.status === 'pending').length,
  };

  if (loading && !orders.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sale Orders</h1>
          <p className="text-gray-600 mt-1">Manage your sales orders and track deliveries.</p>
        </div>
        <Link href="/sales/orders/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={stats.totalOrders} icon={FileText} description="All orders" color="blue" />
        <StatCard title="Total Value" value={formatCurrency(stats.totalValue.toFixed(2))} icon={DollarSign} description="Order value" color="green" />
        <StatCard title="Approved" value={stats.approvedOrders} icon={CheckCircle} description="Confirmed orders" color="orange" />
        <StatCard title="Pending" value={stats.pendingOrders} icon={Clock} description="Awaiting approval" color="red" />
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input type="search" placeholder="Search by order # or customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">{searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters" : "Create your first order to get started"}</p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/sales/orders/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Delivery Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const statusConfig = getStatusBadge(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <motion.tr key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/sales/orders/${order.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">{order.orderNumber}</Link>
                        </td>
                        <td className="py-3 px-4"><p className="text-sm font-medium text-gray-900">{order.customer?.name || "Unknown Customer"}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-600">{formatDate(order.orderDate)}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-gray-600">{formatDate(order.deliveryDate)}</p></td>
                        <td className="py-3 px-4"><p className="text-sm font-semibold text-gray-900">{formatCurrency(order.netAmount)}</p></td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConfig.variant} className="text-xs gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
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
