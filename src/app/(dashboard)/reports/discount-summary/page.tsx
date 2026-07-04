"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getDiscountSummaryReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

export default function DiscountSummaryReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getDiscountSummaryReport(f.dateFrom, f.dateTo, f.customerId);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Discount Summary Report"
      breadcrumb="Discount Summary"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="discount-summary-table"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: "Invoices with Discount", value: data.rows.length.toString(), color: "text-nexabook-900" },
              { label: "Gross Amount", value: formatPKR(data.totals.grossAmount), color: "text-nexabook-800" },
              { label: "Total Discount Given", value: formatPKR(data.totals.discountAmount), color: "text-red-600" },
              {
                label: "Avg Discount %",
                value: data.totals.grossAmount > 0
                  ? `${((data.totals.discountAmount / data.totals.grossAmount) * 100).toFixed(1)}%`
                  : "0%",
                color: "text-orange-600",
              },
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
            <table id="discount-summary-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["", "Invoice #", "Date", "Customer", "Gross", "Discount", "Disc %", "Net Amount"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-nexabook-400">No discounted invoices found for this period</td>
                  </tr>
                ) : (
                  data.rows.map((row: any, i: number) => {
                    const isExpanded = expanded === row.invoiceId;
                    return (
                      <>
                        <motion.tr
                          key={row.invoiceId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.015 }}
                          className={`border-b border-nexabook-100 hover:bg-nexabook-50 ${row.items.length > 0 ? "cursor-pointer" : ""}`}
                          onClick={() => row.items.length > 0 && setExpanded(isExpanded ? null : row.invoiceId)}
                        >
                          <td className="py-2 px-3 text-nexabook-400">
                            {row.items.length > 0 ? (isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-nexabook-800">{row.invoiceNumber}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {new Date(row.issueDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-2 px-3 font-medium">{row.customerName}</td>
                          <td className="py-2 px-3 text-right">{formatPKR(row.grossAmount)}</td>
                          <td className="py-2 px-3 text-right text-red-600 font-medium">{formatPKR(row.discountAmount)}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                              {row.discountPct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-nexabook-800">{formatPKR(row.netAmount)}</td>
                        </motion.tr>
                        <AnimatePresence>
                          {isExpanded && row.items.length > 0 && (
                            <tr key={`exp-${row.invoiceId}`}>
                              <td colSpan={8} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-red-50/40 border-b border-nexabook-200"
                                >
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-red-50">
                                        <th className="py-1.5 px-10 text-left text-nexabook-500 font-medium">Product</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Qty</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Unit Price</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Disc %</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Disc Amt</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.items.map((item: any, ii: number) => (
                                        <tr key={ii} className="border-b border-red-100">
                                          <td className="py-1.5 px-10 text-nexabook-700">{item.productName}</td>
                                          <td className="py-1.5 px-3 text-right">{item.qty}</td>
                                          <td className="py-1.5 px-3 text-right">{formatPKR(item.unitPrice)}</td>
                                          <td className="py-1.5 px-3 text-right text-red-600">{item.discountPct}%</td>
                                          <td className="py-1.5 px-3 text-right text-red-600 font-medium">{formatPKR(item.discountAmt)}</td>
                                          <td className="py-1.5 px-3 text-right font-medium">{formatPKR(item.lineTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </>
                    );
                  })
                )}
                {data.rows.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={4} className="py-3 px-3">Grand Total ({data.rows.length} invoices)</td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.grossAmount)}</td>
                    <td className="py-3 px-3 text-right text-red-600">{formatPKR(data.totals.discountAmount)}</td>
                    <td className="py-3 px-3 text-right text-orange-600">
                      {data.totals.grossAmount > 0
                        ? `${((data.totals.discountAmount / data.totals.grossAmount) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">{formatPKR(data.totals.netAmount)}</td>
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