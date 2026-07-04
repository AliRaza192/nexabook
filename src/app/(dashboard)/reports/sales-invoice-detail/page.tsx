"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getSalesInvoiceDetailReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-orange-100 text-orange-800",
  overdue: "bg-red-100 text-red-800",
};

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

export default function SalesInvoiceDetailReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getSalesInvoiceDetailReport(f.dateFrom, f.dateTo, f.customerId, undefined);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Sales Invoice Detail Report"
      breadcrumb="Sales Invoice Detail"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="sales-invoice-detail-table"
      reportData={data}
    >
      <div className="print-hidden">
        <ReportFilterBar onFilterChange={loadReport} showCustomerFilter customers={customers} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Invoices", value: data.rows.length.toString(), color: "text-nexabook-900" },
              { label: "Gross Amount", value: formatPKR(data.totals.grossAmount), color: "text-nexabook-800" },
              { label: "Discount", value: formatPKR(data.totals.discountAmount), color: "text-red-600" },
              { label: "Tax", value: formatPKR(data.totals.taxAmount), color: "text-orange-600" },
              { label: "Net Amount", value: formatPKR(data.totals.netAmount), color: "text-blue-700" },
              { label: "Balance Due", value: formatPKR(data.totals.balanceAmount), color: "text-red-700" },
            ].map((s) => (
              <Card key={s.label} className="enterprise-card">
                <CardContent className="p-3">
                  <p className="text-xs text-nexabook-500 mb-1">{s.label}</p>
                  <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table id="sales-invoice-detail-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Invoice #", "Date", "Due Date", "Customer", "Gross", "Discount", "Tax", "Net Amount", "Received", "Balance", "Status"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-nexabook-400">No invoices found for this period</td></tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50"
                    >
                      <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.invoiceNumber}</td>
                      <td className="py-2 px-3 text-nexabook-700 whitespace-nowrap">
                        {new Date(row.issueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 text-nexabook-600 whitespace-nowrap">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="py-2 px-3 text-nexabook-900 font-medium">{row.customerName}</td>
                      <td className="py-2 px-3 text-right">{formatPKR(parseFloat(row.grossAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-red-600">{formatPKR(parseFloat(row.discountAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-orange-600">{formatPKR(parseFloat(row.taxAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right font-semibold text-blue-700">{formatPKR(parseFloat(row.netAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-green-700">{formatPKR(parseFloat(row.receivedAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right font-semibold text-red-600">{formatPKR(parseFloat(row.balanceAmount || "0"))}</td>
                      <td className="py-2 px-3">
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[row.status] || "bg-gray-100"}`}>{row.status}</Badge>
                      </td>
                    </motion.tr>
                  ))
                )}
                {/* Totals row */}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={4} className="py-3 px-3 text-nexabook-900">Grand Total ({data.rows.length} invoices)</td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.grossAmount)}</td>
                    <td className="py-3 px-3 text-right text-red-600">{formatPKR(data.totals.discountAmount)}</td>
                    <td className="py-3 px-3 text-right text-orange-600">{formatPKR(data.totals.taxAmount)}</td>
                    <td className="py-3 px-3 text-right text-blue-700">{formatPKR(data.totals.netAmount)}</td>
                    <td className="py-3 px-3 text-right text-green-700">{formatPKR(data.totals.receivedAmount)}</td>
                    <td className="py-3 px-3 text-right text-red-700">{formatPKR(data.totals.balanceAmount)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-16 text-center">
            <FileText className="h-14 w-14 text-nexabook-300 mx-auto mb-4" />
            <p className="text-nexabook-600">Apply filters to load the report</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}