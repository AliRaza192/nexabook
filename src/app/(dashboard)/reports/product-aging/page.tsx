"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Package, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getProductAgingReport } from "@/lib/actions/reports";

export default function ProductAgingPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getProductAgingReport();
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

  const getAgingColor = (category: string) => {
    switch (category) {
      case "0-30 days": return "bg-green-50 text-green-700 border-green-200";
      case "30-60 days": return "bg-amber-50 text-amber-700 border-amber-200";
      case "60-90 days": return "bg-orange-50 text-orange-700 border-orange-200";
      case "90+ days": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-nexabook-50 text-nexabook-700 border-nexabook-200";
    }
  };

  const countByCategory = (category: string) =>
    reportData?.filter((p: any) => p.agingCategory === category).length || 0;

  return (
    <ReportLayout
      title="Product Aging"
      breadcrumb="Product Aging"
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
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Products</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">0-30 Days</p>
                    <p className="text-xl font-bold text-green-700">{countByCategory("0-30 days")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">60-90 Days</p>
                    <p className="text-xl font-bold text-orange-700">{countByCategory("60-90 days")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">90+ Days</p>
                    <p className="text-xl font-bold text-red-700">{countByCategory("90+ days")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Inventory Aging Analysis</CardTitle>
              <p className="text-sm text-nexabook-600">Days products have been in stock</p>
            </CardHeader>
            <CardContent>
              <Table id="product-aging-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Days in Stock</TableHead>
                    <TableHead className="text-right">Aging Category</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: any, index: number) => {
                    const stock = item.currentStock || 0;
                    const cost = item.costPrice ? parseFloat(item.costPrice) : 0;
                    const value = stock * cost;
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
                        <TableCell className="text-right">{stock.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{item.daysInStock} days</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={getAgingColor(item.agingCategory)}>
                            {item.agingCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">
                          {new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(value)}
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
            <p className="text-nexabook-600">No product aging data available</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
