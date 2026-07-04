"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getSaleReturnReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  refunded: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function SaleReturnReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getSaleReturnReport(f.dateFrom, f.dateTo, f.customerId);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Sale Return Report"
      breadcrumb="Sale Return"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="sale-return-table"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Returns", value: data.rows.length.toString(), color: "text-nexabook-900" },
              { label: "Total Net Amount", value: formatPKR(data.totals.netAmount), color: "text-red-700" },
              { label: "Total Refunded", value: formatPKR(data.totals.refundAmount), color: "text-orange-700" },
            ].map((s) => (
              <Card key={s.label} className="enterprise-card">
                <CardContent className="p-4">
                  <p className="text-sm text-nexabook-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table id="sale-return-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Return #", "Date", "Customer", "Against Invoice", "Reason", "Gross", "Net Amount", "Refund", "Status"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-nexabook-400">No returns found for this period</td></tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50">
                      <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.returnNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.returnDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 font-medium">{row.customerName}</td>
                      <td className="py-2 px-3 font-mono text-nexabook-600">{row.invoiceNumber}</td>
                      <td className="py-2 px-3 capitalize text-nexabook-600">{row.reason?.replace("_", " ") || "—"}</td>
                      <td className="py-2 px-3 text-right">{formatPKR(parseFloat(row.grossAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-red-600 font-semibold">{formatPKR(parseFloat(row.netAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-orange-600">{formatPKR(parseFloat(row.refundAmount || "0"))}</td>
                      <td className="py-2 px-3">
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[row.status?.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>{row.status}</Badge>
                      </td>
                    </motion.tr>
                  ))
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={5} className="py-3 px-3">Grand Total ({data.rows.length} returns)</td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.grossAmount)}</td>
                    <td className="py-3 px-3 text-right text-red-700">{formatPKR(data.totals.netAmount)}</td>
                    <td className="py-3 px-3 text-right text-orange-700">{formatPKR(data.totals.refundAmount)}</td>
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