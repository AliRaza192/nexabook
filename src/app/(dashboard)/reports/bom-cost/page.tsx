"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Package, DollarSign, Layers, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getBomCostReport } from "@/lib/actions/reports";

export default function BomCostPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getBomCostReport();
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

  const totalCost = reportData?.reduce((sum: number, b: any) => sum + (b.totalCost || 0), 0) || 0;
  const avgCost = reportData && reportData.length > 0 ? totalCost / reportData.length : 0;
  const maxCostBom = reportData?.reduce((max: any, b: any) => (b.totalCost || 0) > (max.totalCost || 0) ? b : max, reportData[0] || {});

  return (
    <ReportLayout
      title="BOM Cost Analysis"
      breadcrumb="BOM Cost"
      category="Manufacturing Reports"
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
                    <Layers className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Active BOMs</p>
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
                    <p className="text-xs text-nexabook-600">Total BOM Cost</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(totalCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Calculator className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Avg Cost/BOM</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(avgCost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Highest Cost BOM</p>
                    <p className="text-sm font-bold text-purple-700 truncate max-w-[180px]">
                      {maxCostBom?.name || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Bill of Materials — Cost Breakdown</CardTitle>
              <p className="text-sm text-nexabook-600">Component costs for each active BOM</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>BOM Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Components</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Cost/Component</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((bom: any, index: number) => {
                    const costPerComponent = bom.componentCount > 0 ? bom.totalCost / bom.componentCount : 0;
                    return (
                      <motion.tr
                        key={bom.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{bom.name}</TableCell>
                        <TableCell className="text-nexabook-600">{bom.version || "1.0"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{bom.componentCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-nexabook-900">
                          {formatCurrency(bom.totalCost)}
                        </TableCell>
                        <TableCell className="text-right text-nexabook-600">
                          {formatCurrency(costPerComponent)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={bom.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-nexabook-100 text-nexabook-700 border-nexabook-200"}>
                            {bom.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
                <TableRow className="bg-nexabook-50 font-bold">
                  <TableCell colSpan={4} className="text-nexabook-900">Total</TableCell>
                  <TableCell className="text-right text-nexabook-900">{formatCurrency(totalCost)}</TableCell>
                  <TableCell className="text-right text-nexabook-600">{formatCurrency(avgCost)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No BOM data available. Create manufacturing BOMs to see cost analysis.</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
