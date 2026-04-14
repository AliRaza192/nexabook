"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getBalanceSheetReport } from "@/lib/actions/reports";

export default function BalanceSheetReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const today = new Date().toISOString().split("T")[0];
  const [asOfDate, setAsOfDate] = useState(today);

  const loadReport = async (filters: ReportFilters) => {
    setLoading(true);
    const dateToUse = filters.dateTo || today;
    setAsOfDate(dateToUse);
    try {
      const result = await getBalanceSheetReport(dateToUse);
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
    loadReport({ dateFrom: today, dateTo: today });
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
      title="Balance Sheet"
      breadcrumb="Balance Sheet"
      category="Financial Reports"
      categoryHref="/reports"
    >
      {/* Filter Bar - Hidden on print */}
      <div className="print-hidden">
        <ReportFilterBar onFilterChange={loadReport} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Assets</p>
                    <p className="text-xl font-bold text-blue-700">
                      {formatCurrency(reportData.totalAssets)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Liabilities</p>
                    <p className="text-xl font-bold text-amber-700">
                      {formatCurrency(reportData.totalLiabilities)}
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
                    <p className="text-xs text-nexabook-600">Total Equity</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(reportData.totalEquity)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Sheet Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <Card className="enterprise-card">
              <CardHeader>
                <CardTitle className="text-xl text-nexabook-900">Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table id="balance-sheet-assets" className="w-full">
                    <thead>
                      <tr className="border-b-2 border-nexabook-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                          Account
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.assets.map((asset: any, index: number) => (
                        <motion.tr
                          key={asset.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-nexabook-100"
                        >
                          <td className="py-2 px-4 text-sm text-nexabook-900">
                            {asset.code} - {asset.name}
                          </td>
                          <td className="py-2 px-4 text-sm text-right font-medium text-nexabook-900">
                            {formatCurrency(asset.balance)}
                          </td>
                        </motion.tr>
                      ))}
                      <tr className="border-t-2 border-nexabook-300 bg-blue-50">
                        <td className="py-3 px-4 text-sm font-bold text-nexabook-900">
                          Total Assets
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold text-blue-700">
                          {formatCurrency(reportData.totalAssets)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Liabilities + Equity */}
            <div className="space-y-6">
              {/* Liabilities */}
              <Card className="enterprise-card">
                <CardHeader>
                  <CardTitle className="text-xl text-nexabook-900">Liabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table id="balance-sheet-liabilities" className="w-full">
                      <thead>
                        <tr className="border-b-2 border-nexabook-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                            Account
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.liabilities.map((liability: any, index: number) => (
                          <motion.tr
                            key={liability.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-nexabook-100"
                          >
                            <td className="py-2 px-4 text-sm text-nexabook-900">
                              {liability.code} - {liability.name}
                            </td>
                            <td className="py-2 px-4 text-sm text-right font-medium text-nexabook-900">
                              {formatCurrency(liability.balance)}
                            </td>
                          </motion.tr>
                        ))}
                        <tr className="border-t-2 border-nexabook-300 bg-amber-50">
                          <td className="py-3 px-4 text-sm font-bold text-nexabook-900">
                            Total Liabilities
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-amber-700">
                            {formatCurrency(reportData.totalLiabilities)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Equity */}
              <Card className="enterprise-card">
                <CardHeader>
                  <CardTitle className="text-xl text-nexabook-900">Equity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table id="balance-sheet-equity" className="w-full">
                      <thead>
                        <tr className="border-b-2 border-nexabook-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                            Account
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.equity.map((equityItem: any, index: number) => (
                          <motion.tr
                            key={equityItem.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-nexabook-100"
                          >
                            <td className="py-2 px-4 text-sm text-nexabook-900">
                              {equityItem.code} - {equityItem.name}
                            </td>
                            <td className="py-2 px-4 text-sm text-right font-medium text-nexabook-900">
                              {formatCurrency(equityItem.balance)}
                            </td>
                          </motion.tr>
                        ))}
                        <tr className="border-t-2 border-nexabook-300 bg-green-50">
                          <td className="py-3 px-4 text-sm font-bold text-nexabook-900">
                            Total Equity
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-bold text-green-700">
                            {formatCurrency(reportData.totalEquity)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Balance Check */}
          <Card className="enterprise-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-nexabook-600">Balance Check</p>
                  <p className="text-xs text-nexabook-600 mt-1">
                    Assets = Liabilities + Equity
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-nexabook-900">
                    {formatCurrency(reportData.totalAssets)} = {formatCurrency(reportData.totalLiabilities)} + {formatCurrency(reportData.totalEquity)}
                  </p>
                  <p className="text-xs text-nexabook-600 mt-1">
                    Difference: {formatCurrency(reportData.totalAssets - (reportData.totalLiabilities + reportData.totalEquity))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No data available for the selected date</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
