"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getPurchaseInvoiceDetailReport, getVendors } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Approved: "bg-green-100 text-green-800",
  Revised: "bg-blue-100 text-blue-800",
};

export default function PurchaseInvoiceDetailReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getVendors().then((r) => { if (r.success) setVendors(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getPurchaseInvoiceDetailReport(f.dateFrom, f.dateTo, f.vendorId);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Purchase Invoice Detail Report"
      breadcrumb="Purchase Invoice Detail"
      category="Purchase Reports"
      categoryHref="/reports"
      tableId="purchase-invoice-detail-table"
      reportData={data}
    >
      <div className="print-hidden">
        <ReportFilterBar onFilterChange={loadReport} showVendorFilter vendors={vendors} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Bills", value: data.rows.length.toString(), color: "text-nexabook-900" },
              { label: "Gross Amount", value: formatPKR(data.totals.grossAmount), color: "text-nexabook-800" },
              { label: "Tax Total", value: formatPKR(data.totals.taxTotal), color: "text-orange-600" },
              { label: "Net Amount", value: formatPKR(data.totals.netAmount), color: "text-red-700" },
            ].map((s) => (
              <Card key={s.label} className="enterprise-card">
                <CardContent className="p-3">
                  <p className="text-xs text-nexabook-500 mb-1">{s.label}</p>
                  <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table id="purchase-invoice-detail-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Bill #", "Date", "Due Date", "Vendor", "Gross", "Discount", "Tax", "Net Amount", "Reference", "Status"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-nexabook-400">No purchase invoices found for this period</td></tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50">
                      <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.billNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="py-2 px-3 font-medium">{row.vendorName}</td>
                      <td className="py-2 px-3 text-right">{formatPKR(parseFloat(row.grossAmount || "0"))}</td>
                      <td className="py-2 px-3 text-right text-red-500">{formatPKR(parseFloat(row.discountTotal || "0"))}</td>
                      <td className="py-2 px-3 text-right text-orange-600">{formatPKR(parseFloat(row.taxTotal || "0"))}</td>
                      <td className="py-2 px-3 text-right font-semibold text-red-700">{formatPKR(parseFloat(row.netAmount || "0"))}</td>
                      <td className="py-2 px-3 text-nexabook-500">{row.reference || "—"}</td>
                      <td className="py-2 px-3">
                        <Badge className={`text-xs ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-700"}`}>{row.status}</Badge>
                      </td>
                    </motion.tr>
                  ))
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={4} className="py-3 px-3">Grand Total ({data.rows.length} bills)</td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.grossAmount)}</td>
                    <td className="py-3 px-3 text-right text-red-500">{formatPKR(data.totals.discountTotal)}</td>
                    <td className="py-3 px-3 text-right text-orange-600">{formatPKR(data.totals.taxTotal)}</td>
                    <td className="py-3 px-3 text-right text-red-700">{formatPKR(data.totals.netAmount)}</td>
                    <td colSpan={2} />
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