"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getSaleOrderReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  invoiced: "bg-purple-100 text-purple-800",
};

export default function SaleOrderReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastFilters, setLastFilters] = useState({ dateFrom: defaultFrom, dateTo: defaultTo });

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters, status?: string) => {
    setLoading(true);
    setLastFilters({ dateFrom: f.dateFrom, dateTo: f.dateTo });
    const st = status ?? statusFilter;
    const r = await getSaleOrderReport(f.dateFrom, f.dateTo, f.customerId, st === "all" ? undefined : st);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  const handleStatusChange = (s: string) => {
    setStatusFilter(s);
    loadReport(lastFilters as any, s);
  };

  return (
    <ReportLayout
      title="Sale Order Report"
      breadcrumb="Sale Order"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="sale-order-table"
      reportData={data}
    >
      <div className="print-hidden space-y-3">
        <ReportFilterBar onFilterChange={loadReport} showCustomerFilter customers={customers} />
        <div className="flex items-center gap-3">
          <Label className="text-sm text-nexabook-700">Status:</Label>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["draft", "confirmed", "processing", "delivered", "invoiced", "cancelled"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Orders", value: data.rows.length.toString(), color: "text-nexabook-900" },
              { label: "Gross Amount", value: formatPKR(data.totals.grossAmount), color: "text-nexabook-800" },
              { label: "Discount", value: formatPKR(data.totals.discountAmount), color: "text-red-600" },
              { label: "Net Amount", value: formatPKR(data.totals.netAmount), color: "text-blue-700" },
            ].map((s) => (
              <Card key={s.label} className="enterprise-card">
                <CardContent className="p-3">
                  <p className="text-xs text-nexabook-500 mb-1">{s.label}</p>
                  <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Status breakdown */}
          {data.statusCounts && Object.keys(data.statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS[status] || "bg-gray-100 text-gray-700"}`}>{status}</Badge>
                  <span className="text-xs font-semibold text-nexabook-600">{String(count)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table id="sale-order-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Order #", "Order Date", "Delivery Date", "Customer", "Subject", "Order Booker", "Gross", "Discount", "Net Amount", "Status"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-nexabook-400">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No sale orders found for this period
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50"
                    >
                      <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.orderNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.orderDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {row.deliveryDate
                          ? new Date(row.deliveryDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="py-2 px-3 font-medium">{row.customerName}</td>
                      <td className="py-2 px-3 text-nexabook-600 max-w-[120px] truncate">{row.subject || "—"}</td>
                      <td className="py-2 px-3 text-nexabook-500">{row.orderBooker || "—"}</td>
                      <td className="py-2 px-3 text-right">{formatPKR(parseFloat(row.grossAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-red-500">{formatPKR(parseFloat(row.discountAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right font-semibold text-blue-700">{formatPKR(parseFloat(row.netAmount || "0"))}</td>
                      <td className="py-2 px-3">
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-700"}`}>{row.status}</Badge>
                      </td>
                    </motion.tr>
                  ))
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={6} className="py-3 px-3">Grand Total ({data.rows.length} orders)</td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.grossAmount)}</td>
                    <td className="py-3 px-3 text-right text-red-500">{formatPKR(data.totals.discountAmount)}</td>
                    <td className="py-3 px-3 text-right text-blue-700">{formatPKR(data.totals.netAmount)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ReportLayout>
  );
}