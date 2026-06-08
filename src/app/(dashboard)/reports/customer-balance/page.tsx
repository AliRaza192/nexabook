"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getCustomerBalanceReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date().toISOString().split("T")[0];

export default function CustomerBalanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: today, dateTo: today });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getCustomerBalanceReport(f.customerId, f.dateTo);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Customer Balance Report"
      breadcrumb="Customer Balance"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="customer-balance-table"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Invoiced", value: formatPKR(data.grandTotal.totalInvoiced), color: "text-blue-700", icon: <TrendingUp className="h-5 w-5 text-blue-500" /> },
              { label: "Total Received", value: formatPKR(data.grandTotal.totalReceived), color: "text-green-700", icon: <TrendingDown className="h-5 w-5 text-green-500" /> },
              { label: "Outstanding Balance", value: formatPKR(Math.abs(data.grandTotal.balance)), color: data.grandTotal.balance > 0 ? "text-red-700" : "text-green-700", icon: <Users className="h-5 w-5 text-nexabook-500" /> },
            ].map((s) => (
              <Card key={s.label} className="enterprise-card">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-nexabook-500">{s.label}</p>
                    {s.icon}
                  </div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table id="customer-balance-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["#", "Customer", "Phone", "City", "Opening Balance", "Total Invoiced", "Total Received", "Balance"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-nexabook-400">No customer data found</td></tr>
                ) : (
                  data.rows.map((row: any, i: number) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50"
                    >
                      <td className="py-2 px-3 text-nexabook-500">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-nexabook-900">{row.name}</td>
                      <td className="py-2 px-3 text-nexabook-600">{row.phone || "—"}</td>
                      <td className="py-2 px-3 text-nexabook-600">{row.city || "—"}</td>
                      <td className="py-2 px-3 text-right">{formatPKR(row.openingBalance)}</td>
                      <td className="py-2 px-3 text-right text-blue-700">{formatPKR(row.totalInvoiced)}</td>
                      <td className="py-2 px-3 text-right text-green-700">{formatPKR(row.totalReceived)}</td>
                      <td className={`py-2 px-3 text-right font-bold ${row.balance > 0 ? "text-red-600" : "text-green-700"}`}>
                        {formatPKR(Math.abs(row.balance))}
                        <span className="text-xs ml-1">{row.balance > 0 ? "Dr" : row.balance < 0 ? "Cr" : ""}</span>
                      </td>
                    </motion.tr>
                  ))
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={5} className="py-3 px-3 text-nexabook-900">Grand Total</td>
                    <td className="py-3 px-3 text-right text-blue-700">{formatPKR(data.grandTotal.totalInvoiced)}</td>
                    <td className="py-3 px-3 text-right text-green-700">{formatPKR(data.grandTotal.totalReceived)}</td>
                    <td className={`py-3 px-3 text-right ${data.grandTotal.balance > 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatPKR(Math.abs(data.grandTotal.balance))}
                    </td>
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