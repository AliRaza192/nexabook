"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getStockMovementReport } from "@/lib/actions/reports";

export default function StockMovementPage() {
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
      const result = await getStockMovementReport(undefined, reportFilters.dateFrom, reportFilters.dateTo);
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

  const stockIn = reportData?.filter((m: any) => m.movementType === "in") || [];
  const stockOut = reportData?.filter((m: any) => m.movementType === "out") || [];
  const totalInQty = stockIn.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
  const totalOutQty = stockOut.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
  const totalInValue = stockIn.reduce((sum: number, m: any) => sum + (m.totalValue ? parseFloat(m.totalValue) : 0), 0);

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "in": return "bg-green-100 text-green-800 border-green-200";
      case "out": return "bg-red-100 text-red-800 border-red-200";
      case "adjustment": return "bg-amber-100 text-amber-800 border-amber-200";
      case "transfer": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-nexabook-100 text-nexabook-800 border-nexabook-200";
    }
  };

  return (
    <ReportLayout
      title="Stock Movement"
      breadcrumb="Stock Movement"
      category="Inventory Reports"
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
                    <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Movements</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Stock In Qty</p>
                    <p className="text-xl font-bold text-green-700">{totalInQty.toLocaleString("en-PK")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Stock Out Qty</p>
                    <p className="text-xl font-bold text-red-700">{totalOutQty.toLocaleString("en-PK")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Stock In Value</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(totalInValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Stock Movement Ledger</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(filters.dateFrom).toLocaleDateString()} - {new Date(filters.dateTo).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <Table id="stock-movement-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((movement: any, index: number) => {
                    const date = movement.createdAt ? new Date(movement.createdAt).toLocaleDateString("en-PK") : "-";
                    const unitCost = movement.unitCost ? parseFloat(movement.unitCost) : 0;
                    const totalVal = movement.totalValue ? parseFloat(movement.totalValue) : 0;
                    return (
                      <motion.tr
                        key={movement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{date}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{movement.productName || "N/A"}</TableCell>
                        <TableCell className="text-nexabook-600">{movement.productSku || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getMovementBadge(movement.movementType)}>
                            {movement.movementType === "in" ? "Stock In" : movement.movementType === "out" ? "Stock Out" : movement.movementType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-nexabook-600 text-sm max-w-[200px] truncate">{movement.reason || "-"}</TableCell>
                        <TableCell className={`text-right font-semibold ${movement.movementType === "in" ? "text-green-700" : "text-red-700"}`}>
                          {movement.movementType === "in" ? "+" : "-"}{movement.quantity?.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-nexabook-600">{formatCurrency(unitCost)}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">{formatCurrency(totalVal)}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{movement.referenceNumber || "-"}</TableCell>
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
            <p className="text-nexabook-600">No stock movement data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
