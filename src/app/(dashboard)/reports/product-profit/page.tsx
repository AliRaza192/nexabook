"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getSalesByProductReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function ProductProfitPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  const loadReport = async (reportFilters: ReportFilters) => {
    setLoading(true);
    setFilters(reportFilters);
    try {
      const result = await getSalesByProductReport(reportFilters.dateFrom, reportFilters.dateTo);
      if (result.success && result.data) {
        setReportData(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(filters);
  }, []);

  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  const totalRevenue = reportData?.reduce((sum: number, p: any) => sum + parseFloat(p.totalRevenue || "0"), 0) || 0;

  return (
    <ReportLayout
      title="Product Profit"
      breadcrumb="Product Profit"
      category="Sales Reports"
      categoryHref="/reports"
    >
      <div className="print-hidden">
        <ReportFilterBar onFilterChange={loadReport} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData && reportData.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Revenue</p>
                    <p className="text-xl font-bold text-nexabook-900">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Products Tracked</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Top Product</p>
                    <p className="text-xl font-bold text-emerald-700 truncate max-w-[160px]">
                      {reportData[0]?.productName || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Avg Revenue/Product</p>
                    <p className="text-xl font-bold text-amber-700">
                      {reportData.length > 0 ? formatCurrency(totalRevenue / reportData.length) : "0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Product Profit Analysis</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(filters.dateFrom).toLocaleDateString()} - {new Date(filters.dateTo).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <Table id="product-profit-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Est. Cost (60%)</TableHead>
                    <TableHead className="text-right">Est. Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: any, index: number) => {
                    const qty = parseFloat(item.totalQuantity || "0");
                    const revenue = parseFloat(item.totalRevenue || "0");
                    const estCost = revenue * 0.6;
                    const estProfit = revenue - estCost;
                    const margin = revenue > 0 ? ((estProfit / revenue) * 100) : 0;
                    return (
                      <motion.tr
                        key={item.productId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{item.productName || "N/A"}</TableCell>
                        <TableCell className="text-nexabook-600">{item.sku || "-"}</TableCell>
                        <TableCell className="text-right">{qty.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">{formatCurrency(revenue)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(estCost)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">{formatCurrency(estProfit)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={margin > 30 ? "default" : "secondary"} className={margin > 30 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No product profit data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
