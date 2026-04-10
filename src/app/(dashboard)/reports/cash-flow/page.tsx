"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getCashFlowReport } from "@/lib/actions/reports";

export default function CashFlowPage() {
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
      const result = await getCashFlowReport(reportFilters.dateFrom, reportFilters.dateTo);
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

  const operating = reportData?.operatingActivities || {};
  const netCash = reportData?.netCashFlow || 0;
  const inflow = operating.salesInflow || 0;
  const outflow = operating.expenseOutflow || 0;

  return (
    <ReportLayout
      title="Cash Flow Statement"
      breadcrumb="Cash Flow"
      category="Accounts Reports"
      categoryHref="/reports"
    >
      <ReportFilterBar onFilterChange={loadReport} />

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Cash Inflow</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(inflow)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <ArrowDownLeft className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Cash Outflow</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(outflow)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${netCash >= 0 ? "bg-blue-50" : "bg-red-50"} rounded-lg`}>
                    <Wallet className={`h-5 w-5 ${netCash >= 0 ? "text-blue-600" : "text-red-600"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Net Cash Flow</p>
                    <p className={`text-xl font-bold ${netCash >= 0 ? "text-blue-700" : "text-red-700"}`}>
                      {formatCurrency(netCash)}
                    </p>
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
                    <p className="text-xs text-nexabook-600">Cash Position</p>
                    <p className={`text-lg font-bold ${netCash >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {netCash >= 0 ? "Positive" : "Negative"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Cash Flow Statement</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(filters.dateFrom).toLocaleDateString()} - {new Date(filters.dateTo).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Operating Activities */}
                <div>
                  <h3 className="text-base font-bold text-nexabook-900 mb-3 pb-2 border-b-2 border-nexabook-200">
                    Operating Activities
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-nexabook-600">Cash received from customers (Sales)</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          {formatCurrency(inflow)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-nexabook-600">Cash paid for expenses</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          ({formatCurrency(outflow)})
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-nexabook-50 font-bold">
                        <TableCell className="text-nexabook-900">Net Cash from Operating Activities</TableCell>
                        <TableCell className={`text-right text-lg font-bold ${netCash >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {formatCurrency(netCash)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-nexabook-900">Net Cash Position</h3>
                      <p className="text-sm text-nexabook-600 mt-1">After all operating cash flows</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${netCash >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {netCash >= 0 ? "+" : ""}{formatCurrency(netCash)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-nexabook-900">Inflow Sources</span>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Sales Receipts
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-green-700 mt-2">{formatCurrency(inflow)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowDownLeft className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-semibold text-nexabook-900">Outflow Uses</span>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Expense Payments
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(outflow)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No cash flow data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
