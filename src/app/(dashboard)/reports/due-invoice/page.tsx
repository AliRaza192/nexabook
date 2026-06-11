"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Clock } from "lucide-react";
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
import { getDueInvoiceReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date().toISOString().split("T")[0];

function getOverdueBadge(days: number) {
  if (days === 0) return <Badge className="bg-green-100 text-green-700 text-xs">Current</Badge>;
  if (days <= 30) return <Badge className="bg-yellow-100 text-yellow-700 text-xs">1-30 days</Badge>;
  if (days <= 60) return <Badge className="bg-orange-100 text-orange-700 text-xs">31-60 days</Badge>;
  if (days <= 90) return <Badge className="bg-red-100 text-red-700 text-xs">61-90 days</Badge>;
  return <Badge className="bg-red-700 text-white text-xs">90+ days</Badge>;
}

export default function DueInvoiceReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [agingFilter, setAgingFilter] = useState("0");
  const [asOf, setAsOf] = useState(today);
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>();

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: today, dateTo: today });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getDueInvoiceReport(f.dateTo, f.customerId, parseInt(agingFilter));
    if (r.success) setData(r.data);
    setLoading(false);
  };

  const handleAgingChange = async (val: string) => {
    setAgingFilter(val);
    setLoading(true);
    const r = await getDueInvoiceReport(asOf, selectedCustomer, parseInt(val));
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Due Invoice Report"
      breadcrumb="Due Invoice"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="due-invoice-table"
      reportData={data}
    >
      <div className="print-hidden space-y-3">
        <ReportFilterBar
          onFilterChange={(f) => { setAsOf(f.dateTo); setSelectedCustomer(f.customerId); loadReport(f); }}
          showCustomerFilter
          customers={customers}
          dateLabel="As of Date"
        />
        {/* Aging filter */}
        <div className="flex items-center gap-3">
          <Label className="text-sm text-nexabook-700 whitespace-nowrap">Overdue Filter:</Label>
          <Select value={agingFilter} onValueChange={handleAgingChange}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Due</SelectItem>
              <SelectItem value="1">1–30 Days</SelectItem>
              <SelectItem value="31">31–60 Days</SelectItem>
              <SelectItem value="61">61–90 Days</SelectItem>
              <SelectItem value="91">Over 90 Days</SelectItem>
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
          {/* Aging Summary Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Current", value: data.aging.current, color: "text-green-700", bg: "bg-green-50" },
              { label: "1–30 Days", value: data.aging.days1to30, color: "text-yellow-700", bg: "bg-yellow-50" },
              { label: "31–60 Days", value: data.aging.days31to60, color: "text-orange-700", bg: "bg-orange-50" },
              { label: "61–90 Days", value: data.aging.days61to90, color: "text-red-600", bg: "bg-red-50" },
              { label: "Over 90 Days", value: data.aging.over90, color: "text-red-800", bg: "bg-red-100" },
            ].map((s) => (
              <Card key={s.label} className={`enterprise-card ${s.bg}`}>
                <CardContent className="p-3">
                  <p className="text-xs text-nexabook-500 mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{s.label}
                  </p>
                  <p className={`font-bold text-sm ${s.color}`}>{formatPKR(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
              <span className="text-nexabook-500">Total Outstanding: </span>
              <span className="font-bold text-red-700 text-base">{formatPKR(data.totals.totalBalance)}</span>
              <span className="text-nexabook-400 ml-2">({data.rows.length} invoices)</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table id="due-invoice-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Invoice #", "Issue Date", "Due Date", "Customer", "Phone", "Net Amount", "Received", "Balance", "Overdue"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-nexabook-400">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No due invoices found
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className={`border-b border-nexabook-100 hover:bg-nexabook-50 ${row.overdueDays > 90 ? "bg-red-50/30" : row.overdueDays > 60 ? "bg-orange-50/20" : ""}`}
                    >
                      <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.invoiceNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.issueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.dueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 font-medium">{row.customerName}</td>
                      <td className="py-2 px-3 text-nexabook-500">{row.customerPhone || "—"}</td>
                      <td className="py-2 px-3 text-right">{formatPKR(parseFloat(row.netAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-green-600">{formatPKR(parseFloat(row.receivedAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right font-bold text-red-600">{formatPKR(parseFloat(row.balanceAmount || "0"))}</td>
                      <td className="py-2 px-3">{getOverdueBadge(row.overdueDays)}</td>
                    </motion.tr>
                  ))
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={5} className="py-3 px-3">Grand Total ({data.rows.length} invoices)</td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.totalNet)}</td>
                    <td className="py-3 px-3 text-right text-green-600">{formatPKR(data.totals.totalReceived)}</td>
                    <td className="py-3 px-3 text-right text-red-700">{formatPKR(data.totals.totalBalance)}</td>
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