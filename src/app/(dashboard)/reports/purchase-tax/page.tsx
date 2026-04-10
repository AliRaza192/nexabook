"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Building2, DollarSign, Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getPurchaseTaxReport } from "@/lib/actions/reports";

export default function PurchaseTaxPage() {
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
      const result = await getPurchaseTaxReport(reportFilters.dateFrom, reportFilters.dateTo);
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
    return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(value);
  };

  const totalTax = reportData?.reduce((sum: number, v: any) => sum + (v.totalTax ? parseFloat(v.totalTax) : 0), 0) || 0;
  const totalAmount = reportData?.reduce((sum: number, v: any) => sum + (v.totalAmount ? parseFloat(v.totalAmount) : 0), 0) || 0;
  const avgTaxRate = totalAmount > 0 ? ((totalTax / totalAmount) * 100) : 0;

  return (
    <ReportLayout
      title="Purchase Tax Report"
      breadcrumb="Purchase Tax"
      category="Purchase Reports"
      categoryHref="/reports"
    >
      <ReportFilterBar onFilterChange={loadReport} />

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
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Vendors</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Purchases</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Receipt className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Tax Paid</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(totalTax)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Avg Tax Rate</p>
                    <p className="text-xl font-bold text-purple-700">{avgTaxRate.toFixed(2)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Tax Breakdown by Vendor</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(filters.dateFrom).toLocaleDateString()} - {new Date(filters.dateTo).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Total Purchase Amount</TableHead>
                    <TableHead className="text-right">Tax Paid</TableHead>
                    <TableHead className="text-right">Effective Tax Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((vendor: any, index: number) => {
                    const amount = vendor.totalAmount ? parseFloat(vendor.totalAmount) : 0;
                    const tax = vendor.totalTax ? parseFloat(vendor.totalTax) : 0;
                    const rate = amount > 0 ? ((tax / amount) * 100) : 0;
                    return (
                      <motion.tr
                        key={vendor.vendorId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{vendor.vendorName || "N/A"}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">{formatCurrency(amount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {formatCurrency(tax)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-nexabook-600">{rate.toFixed(2)}%</TableCell>
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
            <p className="text-nexabook-600">No purchase tax data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
