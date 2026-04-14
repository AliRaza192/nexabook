"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Scale, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getTrialBalanceReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function TrialBalancePage() {
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
      const result = await getTrialBalanceReport(reportFilters.dateTo);
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

  const isBalanced = reportData ? Math.abs(reportData.totalDebit - reportData.totalCredit) < 0.01 : false;

  return (
    <ReportLayout
      title="Trial Balance"
      breadcrumb="Trial Balance"
      category="Accounts Reports"
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
      ) : reportData && reportData.accounts && reportData.accounts.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Scale className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Debit</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(reportData.totalDebit)}</p>
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
                    <p className="text-xs text-nexabook-600">Total Credit</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(reportData.totalCredit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Accounts with Balance</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.accounts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${isBalanced ? "bg-green-50" : "bg-red-50"} rounded-lg`}>
                    <Scale className={`h-5 w-5 ${isBalanced ? "text-green-600" : "text-red-600"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Balance Status</p>
                    <p className={`text-lg font-bold ${isBalanced ? "text-green-700" : "text-red-700"}`}>
                      {isBalanced ? "Balanced" : "Unbalanced"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Trial Balance</CardTitle>
              <p className="text-sm text-nexabook-600">
                As of {reportData.asOfDate ? new Date(reportData.asOfDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              </p>
            </CardHeader>
            <CardContent>
              <Table id="trial-balance-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.accounts.map((account: any, index: number) => (
                    <motion.tr
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <TableCell className="font-mono text-sm text-nexabook-600">{account.code}</TableCell>
                      <TableCell className="font-medium text-nexabook-900">{account.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {account.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-nexabook-600">-</TableCell>
                      <TableCell className="text-right">
                        {account.debit > 0 ? (
                          <span className="font-semibold text-nexabook-900">{formatCurrency(account.debit)}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {account.credit > 0 ? (
                          <span className="font-semibold text-nexabook-900">{formatCurrency(account.credit)}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-nexabook-900">
                        {formatCurrency(account.debit || account.credit)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
                <TableRow className="bg-nexabook-50 font-bold">
                  <TableCell colSpan={4} className="text-nexabook-900">Totals</TableCell>
                  <TableCell className="text-right text-nexabook-900">{formatCurrency(reportData.totalDebit)}</TableCell>
                  <TableCell className="text-right text-nexabook-900">{formatCurrency(reportData.totalCredit)}</TableCell>
                  <TableCell className="text-right text-nexabook-900">
                    {formatCurrency(reportData.totalDebit + reportData.totalCredit)}
                  </TableCell>
                </TableRow>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No trial balance data available</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
