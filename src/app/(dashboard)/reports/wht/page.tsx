"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Receipt, DollarSign, FileText, TrendingUp, Download, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getWithholdingTaxReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function WHTPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<any>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  const loadReport = async (reportFilters: any) => {
    setLoading(true);
    setFilters(reportFilters);
    try {
      const result = await getWithholdingTaxReport(reportFilters.dateFrom, reportFilters.dateTo);
      if (result.success && result.data) setReportData(result.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(filters); }, []);

  const formatCurrency = (value: number) => formatPKR(value, 'south-asian');

  const totalWHT = reportData?.totalWHT || 0;
  const transactions = reportData?.transactions || [];

  const downloadCertificate = async () => {
    if (transactions.length === 0) return;
    const url = `/api/wht-certificate?vendorId=${transactions[0].vendorId || ''}&dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}`;
    window.open(url, '_blank');
  };

  return (
    <ReportLayout
      title="Withholding Tax Report"
      breadcrumb="Withholding Tax"
      category="Accounts Reports"
      categoryHref="/reports"
    >
      <div className="print-hidden">
        <ReportFilterBar onFilterChange={loadReport} />
      </div>

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
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(totalWHT)}</p>
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
                      {totalWHT > 0 ? "Recorded" : "No WHT"}
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
                    <p className="text-xs text-nexabook-600">Transactions</p>
                    <p className="text-lg font-bold text-purple-700">{transactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-nexabook-900">Withholding Tax Summary</CardTitle>
                  <p className="text-sm text-nexabook-600">
                    {reportData.dateFrom ? new Date(reportData.dateFrom).toLocaleDateString() : ""} - {reportData.dateTo ? new Date(reportData.dateTo).toLocaleDateString() : ""}
                  </p>
                </div>
                {transactions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadCertificate}>
                      <Download className="h-4 w-4 mr-1" /> Download Certificate
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" /> Vendor Wise
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table id="wht-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>NTN</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">WHT Rate</TableHead>
                    <TableHead className="text-right">WHT Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? transactions.map((tx: any, i: number) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <TableCell className="font-medium text-nexabook-900">{tx.paymentNumber}</TableCell>
                      <TableCell className="text-nexabook-600">{new Date(tx.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-nexabook-900">{tx.vendorName}</TableCell>
                      <TableCell className="text-nexabook-600">{tx.vendorNtn || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(tx.paymentAmount)}</TableCell>
                      <TableCell className="text-right">{tx.whtRate > 0 ? `${tx.whtRate}%` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {formatCurrency(tx.whtAmount)}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-nexabook-500">
                        No withholding tax transactions found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {transactions.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <div className="bg-amber-50 rounded-lg px-6 py-3 border border-amber-200">
                    <p className="text-sm text-amber-700">
                      Total WHT Deducted: <span className="font-bold text-lg">{formatCurrency(totalWHT)}</span>
                    </p>
                  </div>
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
