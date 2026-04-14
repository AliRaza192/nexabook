"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Package, TrendingDown, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getLowStockReport } from "@/lib/actions/reports";

export default function LowInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getLowStockReport();
      if (result.success && result.data) {
        setReportData(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(value);
  };

  const totalValue = reportData?.reduce((sum: number, p: any) => {
    const stock = p.currentStock || 0;
    const cost = p.costPrice ? parseFloat(p.costPrice) : 0;
    return sum + stock * cost;
  }, 0) || 0;

  const getSeverity = (current: number, min: number) => {
    if (min === 0) return "bg-nexabook-100 text-nexabook-800";
    const ratio = current / min;
    if (ratio <= 0.25) return "bg-red-100 text-red-800 border-red-200";
    if (ratio <= 0.5) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  return (
    <ReportLayout
      title="Low Inventory"
      breadcrumb="Low Inventory"
      category="Inventory Reports"
      categoryHref="/reports"
    >
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
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Low Stock Items</p>
                    <p className="text-xl font-bold text-red-700">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Stock Value</p>
                    <p className="text-xl font-bold text-nexabook-900">{formatCurrency(totalValue)}</p>
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
                    <p className="text-xs text-nexabook-600">Critical Items</p>
                    <p className="text-xl font-bold text-amber-700">
                      {reportData.filter((p: any) => {
                        const min = p.minStockLevel || 0;
                        const ratio = min > 0 ? (p.currentStock || 0) / min : 1;
                        return ratio <= 0.25;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Action Required</p>
                    <p className="text-sm font-semibold text-green-700">Reorder recommended</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Items Below Minimum Stock Level</CardTitle>
              <p className="text-sm text-nexabook-600">Products that need reordering</p>
            </CardHeader>
            <CardContent>
              <Table id="low-inventory-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: any, index: number) => {
                    const currentStock = item.currentStock || 0;
                    const minLevel = item.minStockLevel || 0;
                    const shortfall = Math.max(0, minLevel - currentStock);
                    const costPrice = item.costPrice ? parseFloat(item.costPrice) : 0;
                    const value = currentStock * costPrice;
                    const severity = getSeverity(currentStock, minLevel);
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{item.name}</TableCell>
                        <TableCell className="text-nexabook-600">{item.sku || "-"}</TableCell>
                        <TableCell className="text-nexabook-600">{item.unit || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">
                          {currentStock.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-nexabook-600">
                          {minLevel.toLocaleString("en-PK")}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          -{shortfall.toLocaleString("en-PK")}
                        </TableCell>
                        <TableCell className="text-right text-nexabook-600">{formatCurrency(costPrice)}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">{formatCurrency(value)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={severity}>
                            {minLevel > 0 && currentStock / minLevel <= 0.25 ? "Critical" : minLevel > 0 && currentStock / minLevel <= 0.5 ? "Warning" : "Low"}
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
            <p className="text-nexabook-600">All inventory levels are healthy. No items below minimum stock.</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
