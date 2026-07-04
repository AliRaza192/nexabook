"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2, Banknote, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getReceivePaymentReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", cheque: "Cheque",
  online: "Online", jazzcash: "JazzCash", easypaisa: "EasyPaisa",
};
const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-800", bank_transfer: "bg-blue-100 text-blue-800",
  cheque: "bg-purple-100 text-purple-800", online: "bg-cyan-100 text-cyan-800",
  jazzcash: "bg-orange-100 text-orange-800", easypaisa: "bg-teal-100 text-teal-800",
};

export default function ReceivePaymentReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getReceivePaymentReport(f.dateFrom, f.dateTo, f.customerId);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Receive Payment Report"
      breadcrumb="Receive Payment"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="receive-payment-table"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <p className="text-sm text-nexabook-500 mb-1">Total Received</p>
                <p className="text-2xl font-bold text-green-700">{formatPKR(data.totalAmount)}</p>
                <p className="text-xs text-nexabook-400 mt-1">{data.rows.length} payments</p>
              </CardContent>
            </Card>
            {/* Method breakdown */}
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <p className="text-sm text-nexabook-500 mb-2">By Payment Method</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.byMethod).map(([method, amt]) => (
                    <div key={method} className="flex items-center gap-1">
                      <Badge className={`text-xs ${METHOD_COLORS[method] || "bg-gray-100 text-gray-700"}`}>
                        {METHOD_LABELS[method] || method}
                      </Badge>
                      <span className="text-xs font-medium text-nexabook-700">
                        {formatPKR(amt as number)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table id="receive-payment-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Payment #", "Date", "Customer", "Method", "Amount", "Reference", "Notes"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-nexabook-400">No payments found for this period</td></tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50">
                      <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.paymentNumber}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.paymentDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 font-medium">{row.customerName}</td>
                      <td className="py-2 px-3">
                        <Badge className={`text-xs ${METHOD_COLORS[row.paymentMethod] || "bg-gray-100 text-gray-700"}`}>
                          {METHOD_LABELS[row.paymentMethod] || row.paymentMethod}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-green-700">{formatPKR(parseFloat(row.amount || "0"))}</td>
                      <td className="py-2 px-3 text-nexabook-500">{row.reference || "—"}</td>
                      <td className="py-2 px-3 text-nexabook-500 max-w-[160px] truncate">{row.notes || "—"}</td>
                    </motion.tr>
                  ))
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={4} className="py-3 px-3">Grand Total ({data.rows.length} payments)</td>
                    <td className="py-3 px-3 text-right text-green-700">{formatPKR(data.totalAmount)}</td>
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