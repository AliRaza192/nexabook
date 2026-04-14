"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, FileText, Building2, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getPurchaseDetailsReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function PurchaseDetailsPage() {
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
      const result = await getPurchaseDetailsReport(reportFilters.dateFrom, reportFilters.dateTo);
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

  const totalGross = reportData?.reduce((sum: number, p: any) => sum + (p.grossAmount ? parseFloat(p.grossAmount) : 0), 0) || 0;
  const totalNet = reportData?.reduce((sum: number, p: any) => sum + (p.netAmount ? parseFloat(p.netAmount) : 0), 0) || 0;
  const totalTax = reportData?.reduce((sum: number, p: any) => sum + (p.taxTotal ? parseFloat(p.taxTotal) : 0), 0) || 0;
  const totalDiscount = reportData?.reduce((sum: number, p: any) => sum + (p.discountTotal ? parseFloat(p.discountTotal) : 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800 border-green-200";
      case "Pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Draft": return "bg-nexabook-100 text-nexabook-800 border-nexabook-200";
      case "Rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-nexabook-100 text-nexabook-800 border-nexabook-200";
    }
  };

  return (
    <ReportLayout
      title="Purchase Details"
      breadcrumb="Purchase Details"
      category="Purchase Reports"
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
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Purchases</p>
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
                    <p className="text-xs text-nexabook-600">Net Amount</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(totalNet)}</p>
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
                    <p className="text-xs text-nexabook-600">Total Tax</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(totalTax)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Unique Vendors</p>
                    <p className="text-xl font-bold text-purple-700">
                      {new Set(reportData.map((p: any) => p.vendorId).filter(Boolean)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Purchase Invoice Register</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(filters.dateFrom).toLocaleDateString()} - {new Date(filters.dateTo).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <Table id="purchase-details-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((purchase: any, index: number) => {
                    const gross = purchase.grossAmount ? parseFloat(purchase.grossAmount) : 0;
                    const discount = purchase.discountTotal ? parseFloat(purchase.discountTotal) : 0;
                    const tax = purchase.taxTotal ? parseFloat(purchase.taxTotal) : 0;
                    const net = purchase.netAmount ? parseFloat(purchase.netAmount) : 0;
                    const date = purchase.date ? new Date(purchase.date).toLocaleDateString("en-PK") : "-";
                    return (
                      <motion.tr
                        key={purchase.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="font-medium text-nexabook-900">{purchase.billNumber}</TableCell>
                        <TableCell className="text-nexabook-600">{date}</TableCell>
                        <TableCell className="text-nexabook-600">{purchase.vendorName || "N/A"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gross)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(discount)}</TableCell>
                        <TableCell className="text-right text-amber-700">{formatCurrency(tax)}</TableCell>
                        <TableCell className="text-right font-bold text-nexabook-900">{formatCurrency(net)}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{purchase.reference || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadge(purchase.status)}>
                            {purchase.status || "Draft"}
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
            <p className="text-nexabook-600">No purchase data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
