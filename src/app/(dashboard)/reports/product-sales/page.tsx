"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Loader2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getProductSalesReport, getCustomers, getProductsList } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

export default function ProductSalesReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getCustomers().then((r) => { if (r.success) setCustomers(r.data as any); });
    getProductsList().then((r) => { if (r.success) setProducts(r.data as any); });
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters) => {
    setLoading(true);
    const r = await getProductSalesReport(f.dateFrom, f.dateTo, f.productId, f.customerId);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="Product Sales Report"
      breadcrumb="Product Sales"
      category="Sales Reports"
      categoryHref="/reports"
      tableId="product-sales-table"
      reportData={data}
    >
      <div className="print-hidden">
        <ReportFilterBar
          onFilterChange={loadReport}
          showCustomerFilter
          customers={customers}
          showProductFilter
          productsList={products}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Products Sold", value: data.summary.length.toString(), color: "text-nexabook-900" },
              { label: "Total Revenue", value: formatPKR(data.totals.totalRevenue), color: "text-blue-700" },
              { label: "Total Cost", value: formatPKR(data.totals.totalCost), color: "text-orange-600" },
              {
                label: "Gross Profit",
                value: formatPKR(data.totals.grossProfit),
                color: data.totals.grossProfit >= 0 ? "text-green-700" : "text-red-600",
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
            <table id="product-sales-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["", "Product", "SKU", "Category", "Qty Sold", "Revenue", "Cost", "Gross Profit", "Margin %"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.summary.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-nexabook-400">No product sales found for this period</td>
                  </tr>
                ) : (
                  data.summary.map((product: any, i: number) => {
                    const margin = product.totalRevenue > 0
                      ? (product.grossProfit / product.totalRevenue) * 100
                      : 0;
                    const isExpanded = expanded === product.productId;
                    return (
                      <>
                        <motion.tr
                          key={product.productId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.015 }}
                          className={`border-b border-nexabook-100 hover:bg-nexabook-50 cursor-pointer ${isExpanded ? "bg-nexabook-50" : ""}`}
                          onClick={() => setExpanded(isExpanded ? null : product.productId)}
                        >
                          <td className="py-2 px-3 text-nexabook-400">
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </td>
                          <td className="py-2 px-3 font-medium text-nexabook-900">{product.productName}</td>
                          <td className="py-2 px-3 font-mono text-xs text-nexabook-500">{product.sku || "—"}</td>
                          <td className="py-2 px-3 text-nexabook-600">{product.category}</td>
                          <td className="py-2 px-3 text-right font-medium">{product.totalQty.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-blue-700">{formatPKR(product.totalRevenue)}</td>
                          <td className="py-2 px-3 text-right text-orange-600">{formatPKR(product.totalCost)}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${product.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {formatPKR(product.grossProfit)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${margin >= 20 ? "bg-green-100 text-green-700" : margin >= 10 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </motion.tr>
                        {/* Expandable transaction rows */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr key={`exp-${product.productId}`}>
                              <td colSpan={9} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-nexabook-50 border-b border-nexabook-200"
                                >
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-nexabook-100">
                                        <th className="py-1.5 px-6 text-left text-nexabook-500 font-medium">Date</th>
                                        <th className="py-1.5 px-3 text-left text-nexabook-500 font-medium">Invoice #</th>
                                        <th className="py-1.5 px-3 text-left text-nexabook-500 font-medium">Customer</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Qty</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Unit Price</th>
                                        <th className="py-1.5 px-3 text-right text-nexabook-500 font-medium">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {product.transactions.map((t: any, ti: number) => (
                                        <tr key={ti} className="border-b border-nexabook-100">
                                          <td className="py-1.5 px-6 text-nexabook-600">
                                            {new Date(t.date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                                          </td>
                                          <td className="py-1.5 px-3 font-mono text-nexabook-700">{t.invoiceNumber}</td>
                                          <td className="py-1.5 px-3 text-nexabook-700">{t.customer}</td>
                                          <td className="py-1.5 px-3 text-right">{t.qty}</td>
                                          <td className="py-1.5 px-3 text-right">{formatPKR(t.unitPrice)}</td>
                                          <td className="py-1.5 px-3 text-right font-medium text-blue-700">{formatPKR(t.lineTotal)}</td>
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
                {data.summary.length > 0 && (
                  <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                    <td colSpan={4} className="py-3 px-3 text-nexabook-900">Grand Total ({data.summary.length} products)</td>
                    <td className="py-3 px-3 text-right">{data.totals.totalQty?.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-blue-700">{formatPKR(data.totals.totalRevenue)}</td>
                    <td className="py-3 px-3 text-right text-orange-600">{formatPKR(data.totals.totalCost)}</td>
                    <td className={`py-3 px-3 text-right ${data.totals.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatPKR(data.totals.grossProfit)}
                    </td>
                    <td className="py-3 px-3 text-right text-nexabook-500">
                      {data.totals.totalRevenue > 0
                        ? `${((data.totals.grossProfit / data.totals.totalRevenue) * 100).toFixed(1)}%`
                        : "—"}
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