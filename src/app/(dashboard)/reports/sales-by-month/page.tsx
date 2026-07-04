"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Package, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getSalesByProductReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function SalesByMonthPage() {
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
  const totalQty = reportData?.reduce((sum: number, p: any) => sum + parseFloat(p.totalQuantity || "0"), 0) || 0;

  // Group data by month from the date range
  const getMonthLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PK", { month: "short", year: "numeric" });
  };

  return (
    <ReportLayout
      title="Sales by Month"
      breadcrumb="Sales by Month"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <p className="text-xs text-nexabook-600">Products Sold</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Quantity</p>
                    <p className="text-xl font-bold text-nexabook-900">{totalQty.toLocaleString("en-PK")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">
                Sales Trend — {getMonthLabel(filters.dateFrom)} to {getMonthLabel(filters.dateTo)}
              </CardTitle>
              <p className="text-sm text-nexabook-600">Product-wise sales breakdown</p>
            </CardHeader>
            <CardContent>
              <Table id="sales-by-month-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: any, index: number) => {
                    const qty = parseFloat(item.totalQuantity || "0");
                    const rev = parseFloat(item.totalRevenue || "0");
                    const avgPrice = qty > 0 ? rev / qty : 0;
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
                        <TableCell className="text-right font-semibold text-nexabook-900">{formatCurrency(rev)}</TableCell>
                        <TableCell className="text-right text-nexabook-600">{formatCurrency(avgPrice)}</TableCell>
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
            <p className="text-nexabook-600">No sales data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
