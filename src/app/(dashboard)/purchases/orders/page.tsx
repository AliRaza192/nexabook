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
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp,
  Package,
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
  getPurchaseOrders,
  approvePurchaseOrder,
  deletePurchaseOrder,
} from "@/lib/actions/purchases";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  status: 'draft' | 'pending' | 'approved' | 'confirmed' | 'delivered' | 'cancelled';
  netAmount: string | null;
  grossAmount: string | null;
  createdAt: Date;
  vendor: { id: string; name: string } | null;
}

interface OrderStats {
  totalPOs: number;
  pendingApproval: number;
  approvedThisMonth: number;
}

function StatCard({ title, value, icon: Icon, description, color }: { title: string; value: string | number; icon: any; description: string; color: "blue" | "green" | "orange" }) {
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

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
    draft: { label: "Draft", variant: "outline" as const, icon: Clock },
    pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
    approved: { label: "Approved", variant: "success" as const, icon: CheckCircle },
    confirmed: { label: "Confirmed", variant: "success" as const, icon: CheckCircle },
    delivered: { label: "Delivered", variant: "default" as const, icon: Package },
    cancelled: { label: "Cancelled", variant: "destructive" as const, icon: Trash2 },
  };
  return statusConfig[status] || statusConfig.draft;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const ordersRes = await getPurchaseOrders(
        searchQuery,
        statusFilter === "all" ? undefined : statusFilter
      );
      if (ordersRes.success && ordersRes.data) {
        const orderData = ordersRes.data as PurchaseOrder[];
        setOrders(orderData);

        const totalPOs = orderData.length;
        const pendingApproval = orderData.filter(o => o.status === 'draft' || o.status === 'pending').length;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const approvedThisMonth = orderData.filter(o => o.status === 'approved' && new Date(o.createdAt) >= monthStart).length;

        setStats({ totalPOs, pendingApproval, approvedThisMonth });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [searchQuery, statusFilter]);

  const formatCurrency = (value: string | null) => {
    if (!value) return "Rs. 0";
    return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(parseFloat(value));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleApprove = async (orderId: string) => {
    if (!confirm("Are you sure you want to approve this purchase order?")) return;
    const result = await approvePurchaseOrder(orderId);
    if (result.success) { alert("Purchase order approved!"); loadData(); }
    else alert((result as any).error || "Failed to approve");
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this purchase order? This cannot be undone.")) return;
    const result = await deletePurchaseOrder(orderId);
    if (result.success) { alert("Purchase order deleted!"); loadData(); }
    else alert((result as any).error || "Failed to delete");
  };

  if (loading && !orders.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-nexabook-900">Purchase Orders</h1>
          <p className="text-nexabook-600 mt-1">Create and manage purchase orders for your vendors.</p>
        </div>
        <Link href="/purchases/orders/new">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
      </motion.div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total POs" value={stats.totalPOs} icon={FileText} description="All time" color="blue" />
          <StatCard title="Pending Approval" value={stats.pendingApproval} icon={Clock} description="Needs approval" color="orange" />
          <StatCard title="Approved This Month" value={stats.approvedThisMonth} icon={CheckCircle} description="Current month" color="green" />
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input type="search" placeholder="Search by PO number or vendor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
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
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">Purchase Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No purchase orders found</h3>
              <p className="text-nexabook-600 mb-4">{searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters" : "Create your first purchase order"}</p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/purchases/orders/new">
                  <Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="mr-2 h-4 w-4" />New Purchase Order</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">PO#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Order Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Expected Delivery</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Net Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const statusConfig = getStatusBadge(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <motion.tr key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors">
                        <td className="py-3 px-4"><p className="text-sm font-medium text-nexabook-900">{order.orderNumber}</p></td>
                        <td className="py-3 px-4"><p className="text-sm font-medium text-nexabook-900">{order.vendor?.name || "Unknown Vendor"}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-nexabook-600">{formatDate(order.orderDate)}</p></td>
                        <td className="py-3 px-4"><p className="text-sm text-nexabook-600">{formatDate(order.expectedDeliveryDate)}</p></td>
                        <td className="py-3 px-4"><p className="text-sm font-semibold text-nexabook-900">{formatCurrency(order.netAmount)}</p></td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConfig.variant} className="text-xs gap-1"><StatusIcon className="h-3 w-3" />{statusConfig.label}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-nexabook-100" title="View"><Eye className="h-4 w-4 text-nexabook-600" /></Button>
                            {(order.status === 'draft' || order.status === 'pending') && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-nexabook-100" title="Edit"><Edit className="h-4 w-4 text-blue-600" /></Button>
                            )}
                            {(order.status === 'draft' || order.status === 'pending') && (
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-green-600 hover:bg-green-50" onClick={() => handleApprove(order.id)}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                            )}
                            {(order.status === 'draft' || order.status === 'pending') && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50" title="Delete" onClick={() => handleDelete(order.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                            )}
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