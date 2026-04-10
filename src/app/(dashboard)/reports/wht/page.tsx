"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Receipt, DollarSign, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getWithholdingTaxReport } from "@/lib/actions/reports";

export default function WHTPage() {
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
      const result = await getWithholdingTaxReport(reportFilters.dateFrom, reportFilters.dateTo);
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

  const whtAmount = reportData?.withholdingTax || 0;

  return (
    <ReportLayout
      title="Withholding Tax Report"
      breadcrumb="Withholding Tax"
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
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Report Period</p>
                    <p className="text-sm font-bold text-nexabook-900">
                      {reportData.dateFrom ? new Date(reportData.dateFrom).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "-"}
                    </p>
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
                    <p className="text-xs text-nexabook-600">Total WHT</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(whtAmount)}</p>
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
                    <p className="text-xs text-nexabook-600">WHT Status</p>
                    <p className="text-lg font-bold text-green-700">
                      {whtAmount > 0 ? "Recorded" : "No WHT"}
                    </p>
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
                    <p className="text-xs text-nexabook-600">Note</p>
                    <p className="text-sm font-semibold text-purple-700">Calculated from vendor payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Withholding Tax Summary</CardTitle>
              <p className="text-sm text-nexabook-600">
                {reportData.dateFrom ? new Date(reportData.dateFrom).toLocaleDateString() : ""} - {reportData.dateTo ? new Date(reportData.dateTo).toLocaleDateString() : ""}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (PKR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <TableCell className="font-medium text-nexabook-900">
                      Total Withholding Tax Deducted
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-base px-4 py-1.5">
                        {formatCurrency(whtAmount)}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <TableCell className="text-nexabook-600">
                      WHT Rate (Standard)
                    </TableCell>
                    <TableCell className="text-right text-nexabook-600">
                      As per applicable tax slabs
                    </TableCell>
                  </motion.tr>
                </TableBody>
              </Table>
              {whtAmount === 0 && (
                <div className="mt-4 p-4 bg-nexabook-50 rounded-lg text-center">
                  <p className="text-sm text-nexabook-600">
                    No withholding tax transactions found for the selected period. WHT is calculated from vendor payments based on applicable tax rates.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No withholding tax data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
