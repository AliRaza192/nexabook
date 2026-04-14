"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getCashBookReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";
import ReportExportButtons from "@/components/reports/ReportExportButtons";

export default function CashBookPage() {
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
      const result = await getCashBookReport(reportFilters.dateFrom, reportFilters.dateTo);
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
    return formatPKR(value, 'south-asian');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ReportLayout
      title="Cash Book"
      breadcrumb="Cash Book"
      category="Banking Reports"
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
      ) : reportData && reportData.transactions ? (
        <div className="space-y-6">
          {/* Export Buttons - Hidden on print */}
          <div className="print-hidden flex justify-end gap-2">
            <ReportExportButtons reportTitle="Cash Book Report" reportData={reportData} />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Opening Balance</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(reportData.openingBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Cash In</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(reportData.totalCashIn)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Cash Out</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(reportData.totalCashOut)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-nexabook-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-nexabook-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Closing Balance</p>
                    <p className={`text-xl font-bold ${reportData.closingBalance >= 0 ? 'text-nexabook-900' : 'text-red-700'}`}>
                      {formatCurrency(reportData.closingBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Account Info */}
          {reportData.cashAccount && (
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    Cash Account: {reportData.cashAccount.name} ({reportData.cashAccount.code})
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions Table */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-lg text-nexabook-900">Cash Book Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No Transactions Found</h3>
                  <p className="text-nexabook-600">
                    No cash transactions found for the selected date range.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-nexabook-50">
                        <TableHead className="text-left">Date</TableHead>
                        <TableHead className="text-left">Entry #</TableHead>
                        <TableHead className="text-left">Description</TableHead>
                        <TableHead className="text-right">Cash In (Dr)</TableHead>
                        <TableHead className="text-right">Cash Out (Cr)</TableHead>
                        <TableHead className="text-right">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening Balance Row */}
                      <TableRow className="bg-blue-50 font-semibold">
                        <TableCell>{formatDate(filters.dateFrom ? new Date(filters.dateFrom) : new Date())}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell className="font-medium text-nexabook-900">Opening Balance</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right font-bold text-nexabook-900">
                          {formatCurrency(reportData.openingBalance)}
                        </TableCell>
                      </TableRow>

                      {/* Transaction Rows */}
                      {reportData.transactions.map((transaction: any, index: number) => (
                        <motion.tr
                          key={transaction.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-nexabook-50"
                        >
                          <TableCell className="text-sm">
                            {formatDate(transaction.date)}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-nexabook-900">
                            {transaction.entryNumber}
                          </TableCell>
                          <TableCell className="text-sm text-nexabook-700">
                            {transaction.description || '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-green-700">
                            {transaction.cashIn > 0 ? formatCurrency(transaction.cashIn) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-red-700">
                            {transaction.cashOut > 0 ? formatCurrency(transaction.cashOut) : '—'}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-bold ${transaction.runningBalance >= 0 ? 'text-nexabook-900' : 'text-red-700'}`}>
                            {formatCurrency(transaction.runningBalance)}
                          </TableCell>
                        </motion.tr>
                      ))}

                      {/* Closing Balance Row */}
                      <TableRow className="bg-nexabook-100 font-bold">
                        <TableCell colSpan={3} className="text-nexabook-900">
                          Closing Balance
                        </TableCell>
                        <TableCell className="text-right text-green-700">
                          {formatCurrency(reportData.totalCashIn)}
                        </TableCell>
                        <TableCell className="text-right text-red-700">
                          {formatCurrency(reportData.totalCashOut)}
                        </TableCell>
                        <TableCell className="text-right text-nexabook-900">
                          {formatCurrency(reportData.closingBalance)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <Wallet className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-nexabook-900 mb-2">No Data Available</h3>
          <p className="text-nexabook-600">
            Unable to load cash book report. Please ensure you have a Cash account configured.
          </p>
        </div>
      )}
    </ReportLayout>
  );
}
