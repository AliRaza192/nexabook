"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { getStockOnHandReport } from "@/lib/actions/reports";

export default function StockOnHandReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getStockOnHandReport();
      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        // Error handled silently
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ReportLayout
      title="Stock on Hand"
      breadcrumb="Stock on Hand"
      category="Inventory Reports"
      categoryHref="/reports"
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="enterprise-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Items</p>
                    <p className="text-2xl font-bold text-nexabook-900">
                      {reportData.items.length}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-nexabook-600">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(reportData.totalValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Table */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">
                Inventory Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-nexabook-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Product
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        SKU
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Category
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Stock
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Unit
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Cost Price
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Stock Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.items.map((item: any, index: number) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`border-b border-nexabook-100 hover:bg-nexabook-50 ${
                          item.currentStock === 0 ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-nexabook-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-nexabook-700">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4 text-sm text-nexabook-700">
                          {item.category ? (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-center font-bold text-nexabook-900">
                          {item.currentStock || 0}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-nexabook-700">
                          {item.unit || "Pcs"}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-nexabook-900">
                          {item.costPrice ? formatCurrency(parseFloat(item.costPrice)) : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-blue-700">
                          {formatCurrency(item.stockValue)}
                        </td>
                      </motion.tr>
                    ))}

                    {/* Total Row */}
                    <tr className="border-t-2 border-nexabook-300 bg-blue-50">
                      <td colSpan={6} className="py-3 px-4 text-sm font-bold text-nexabook-900 text-right">
                        Total Stock Value
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-blue-700">
                        {formatCurrency(reportData.totalValue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
            <p className="text-nexabook-600">No inventory data available</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
