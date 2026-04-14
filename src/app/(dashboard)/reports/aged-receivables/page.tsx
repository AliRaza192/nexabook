"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Users, Wallet, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getAgedReceivablesReport } from "@/lib/actions/reports";

export default function AgedReceivablesPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getAgedReceivablesReport();
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

  const totalBalance = reportData?.reduce((sum: number, c: any) => sum + c.balance, 0) || 0;
  const totalCurrent = reportData?.reduce((sum: number, c: any) => sum + c.current, 0) || 0;
  const total30 = reportData?.reduce((sum: number, c: any) => sum + c.days30, 0) || 0;
  const total60 = reportData?.reduce((sum: number, c: any) => sum + c.days60, 0) || 0;
  const total90Plus = reportData?.reduce((sum: number, c: any) => sum + c.days90Plus, 0) || 0;

  return (
    <ReportLayout
      title="Aged Receivables"
      breadcrumb="Aged Receivables"
      category="Sales Reports"
      categoryHref="/reports"
    >
      {/* Loading - Hidden on print */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData && reportData.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Outstanding</p>
                    <p className="text-xl font-bold text-nexabook-900">{formatCurrency(totalBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Current</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(totalCurrent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">30 Days</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(total30)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">60 Days</p>
                    <p className="text-xl font-bold text-orange-700">{formatCurrency(total60)}</p>
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
                    <p className="text-xl font-bold text-red-700">{formatCurrency(total90Plus)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Customer Aging Summary</CardTitle>
              <p className="text-sm text-nexabook-600">Outstanding balances by aging bucket</p>
            </CardHeader>
            <CardContent>
              <Table id="aged-receivables-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">1-30 Days</TableHead>
                    <TableHead className="text-right">31-60 Days</TableHead>
                    <TableHead className="text-right">61-90 Days</TableHead>
                    <TableHead className="text-right">90+ Days</TableHead>
                    <TableHead className="text-right">Total Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((customer: any, index: number) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <TableCell className="font-medium text-nexabook-900">{customer.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {formatCurrency(customer.current)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {formatCurrency(customer.days30)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {formatCurrency(customer.days60)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {formatCurrency(customer.days90Plus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-nexabook-900">
                        {formatCurrency(customer.balance)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No receivables data available</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
