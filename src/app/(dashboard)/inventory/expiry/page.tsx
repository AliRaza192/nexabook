"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Loader2,
  Clock,
  Package,
  ArrowRight,
  TrendingUp,
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
import { getExpiryReport } from "@/lib/actions/inventory";

interface ExpiryItem {
  id: string;
  batchNo: string;
  expiryDate: Date | null;
  currentQty: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseName: string;
}

export default function ExpiryReportPage() {
  const [data, setData] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const res = await getExpiryReport();
      if (res.success && res.data) {
        setData(res.data as any);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const getStatus = (expiryDate: Date | null) => {
    if (!expiryDate) return { label: "No Expiry", variant: "outline" as const, color: "text-gray-500" };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    
    if (exp < today) return { label: "Expired", variant: "destructive" as const, color: "text-red-600" };
    
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return { label: "Expiring soon (30d)", variant: "warning" as const, color: "text-orange-600" };
    if (diffDays <= 90) return { label: "Expiring soon (90d)", variant: "warning" as const, color: "text-amber-600" };
    
    return { label: "Healthy", variant: "success" as const, color: "text-green-600" };
  };

  const filteredData = data.filter((item) => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getStatus(item.expiryDate);
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "expired" && status.label === "Expired") ||
      (statusFilter === "near-expiry" && status.label.includes("soon"));
    
    return matchesSearch && matchesStatus;
  });

  const expiredCount = data.filter(item => getStatus(item.expiryDate).label === "Expired").length;
  const nearExpiryCount = data.filter(item => getStatus(item.expiryDate).label.includes("soon")).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Generating expiry report...</p>
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
          <h1 className="text-3xl font-bold text-nexabook-900">Expiry Management</h1>
          <p className="text-nexabook-600 mt-1">
            Monitor product batches nearing expiry and manage expired stock.
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-100 bg-red-50/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 mb-1">Expired Batches</p>
              <p className="text-3xl font-bold text-red-700">{expiredCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-100 bg-orange-50/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Expiring within 90 days</p>
              <p className="text-3xl font-bold text-orange-700">{nearExpiryCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-100 bg-green-50/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Healthy Batches</p>
              <p className="text-3xl font-bold text-green-700">{data.length - expiredCount - nearExpiryCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search products, batches, or SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-nexabook-600" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="expired">Expired Only</SelectItem>
                  <SelectItem value="near-expiry">Near Expiry Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Batch Expiry Report ({filteredData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nexabook-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Batch No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Warehouse</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Expiry Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Quantity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Package className="h-12 w-12 text-nexabook-200 mb-2" />
                        <p className="text-nexabook-500 font-medium">No batch records match your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const status = getStatus(item.expiryDate);
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-nexabook-50 hover:bg-nexabook-50/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-nexabook-900 text-sm">{item.productName}</p>
                            <p className="text-[10px] text-nexabook-500 uppercase tracking-wider">{item.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-nexabook-100 px-2 py-1 rounded text-nexabook-800">
                            {item.batchNo}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-sm text-nexabook-600">
                          {item.warehouseName}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-nexabook-900">
                          {item.currentQty}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={status.variant} className="text-[10px]">
                            {status.label}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
