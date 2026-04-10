"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getProfitAndLossReport } from "@/lib/actions/reports";

export default function ProfitAndLossReportPage() {
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
      const result = await getProfitAndLossReport(reportFilters.dateFrom, reportFilters.dateTo);
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
    loadReport(filters);
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
      title="Profit & Loss Statement"
      breadcrumb="Profit & Loss"
      category="Financial Reports"
      categoryHref="/reports"
    >
      {/* Filter Bar */}
      <ReportFilterBar onFilterChange={loadReport} />

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Sales</p>
                    <p className="text-xl font-bold text-nexabook-900">
                      {formatCurrency(reportData.totalSales)}
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
                    <p className="text-xs text-nexabook-600">COGS</p>
                    <p className="text-xl font-bold text-nexabook-900">
                      {formatCurrency(reportData.totalCOGS)}
                    </p>
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
                    <p className="text-xs text-nexabook-600">Gross Profit</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(reportData.grossProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${reportData.netProfit >= 0 ? "bg-green-50" : "bg-red-50"} rounded-lg`}>
                    <DollarSign className={`h-5 w-5 ${reportData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Net Profit</p>
                    <p className={`text-xl font-bold ${reportData.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(reportData.netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Multi-step P&L Statement */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">
                Profit & Loss Statement
              </CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(filters.dateFrom).toLocaleDateString()} - {new Date(filters.dateTo).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Operating Income */}
                <div>
                  <div className="flex items-center justify-between py-3 border-b-2 border-nexabook-200">
                    <h3 className="text-base font-bold text-nexabook-900">Operating Income</h3>
                    <span className="text-base font-bold text-nexabook-900">
                      {formatCurrency(reportData.totalSales)}
                    </span>
                  </div>
                </div>

                {/* Less: Cost of Goods Sold */}
                <div>
                  <div className="flex items-center justify-between py-3 border-b border-nexabook-200">
                    <h3 className="text-sm font-semibold text-nexabook-900">Less: Cost of Goods Sold</h3>
                    <span className="text-sm font-semibold text-red-700">
                      ({formatCurrency(reportData.totalCOGS)})
                    </span>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-nexabook-900">Gross Profit</h3>
                    <span className="text-lg font-bold text-blue-700">
                      {formatCurrency(reportData.grossProfit)}
                    </span>
                  </div>
                  {reportData.totalSales > 0 && (
                    <p className="text-xs text-nexabook-600 mt-1">
                      Gross Margin: {((reportData.grossProfit / reportData.totalSales) * 100).toFixed(2)}%
                    </p>
                  )}
                </div>

                {/* Less: Operating Expenses */}
                <div>
                  <div className="flex items-center justify-between py-3 border-b border-nexabook-200">
                    <h3 className="text-sm font-semibold text-nexabook-900">Less: Operating Expenses</h3>
                    <span className="text-sm font-semibold text-red-700">
                      ({formatCurrency(reportData.totalOperatingExpenses)})
                    </span>
                  </div>
                </div>

                {/* Net Profit / (Loss) */}
                <div className={`p-4 rounded-lg ${reportData.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-nexabook-900">
                        Net {reportData.netProfit >= 0 ? "Profit" : "Loss"}
                      </h3>
                      <p className="text-xs text-nexabook-600 mt-1">
                        After all operating expenses
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${reportData.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {formatCurrency(reportData.netProfit)}
                      </span>
                      {reportData.totalSales > 0 && (
                        <p className="text-xs text-nexabook-600 mt-1">
                          Net Margin: {((Math.abs(reportData.netProfit) / reportData.totalSales) * 100).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
