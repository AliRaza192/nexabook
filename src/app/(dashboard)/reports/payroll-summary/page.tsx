"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Users, DollarSign, Wallet, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getPayrollSummaryReportFull } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function PayrollSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getPayrollSummaryReportFull(selectedMonth, selectedYear);
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

  const handleApply = () => {
    loadReport();
  };

  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  const payslips = reportData?.payslips || [];
  const totalEarnings = payslips.reduce((sum: number, p: any) => sum + (p.totalEarnings ? parseFloat(p.totalEarnings) : 0), 0);
  const totalDeductions = payslips.reduce((sum: number, p: any) => sum + (p.totalDeductions ? parseFloat(p.totalDeductions) : 0), 0);
  const totalNet = payslips.reduce((sum: number, p: any) => sum + (p.netSalary ? parseFloat(p.netSalary) : 0), 0);
  const paidCount = payslips.filter((p: any) => p.isPaid).length;

  return (
    <ReportLayout
      title="Payroll Summary"
      breadcrumb="Payroll Summary"
      category="HR & Payroll"
      categoryHref="/reports"
    >
      <Card className="enterprise-card mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i).toLocaleDateString("en-PK", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApply} className="bg-nexabook-900 hover:bg-nexabook-800 h-9">
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData && payslips.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Employees</p>
                    <p className="text-xl font-bold text-nexabook-900">{payslips.length}</p>
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
                    <p className="text-xs text-nexabook-600">Total Earnings</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(totalEarnings)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Deductions</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(totalDeductions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Wallet className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Net Payable</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(totalNet)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Paid</p>
                    <p className="text-xl font-bold text-purple-700">{paidCount}/{payslips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Payroll Summary by Employee</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
                {reportData.payrollRun?.name ? ` — ${reportData.payrollRun.name}` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <Table id="payroll-summary-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Total Earnings</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip: any, index: number) => {
                    const basic = payslip.basicSalary ? parseFloat(payslip.basicSalary) : 0;
                    const earnings = payslip.totalEarnings ? parseFloat(payslip.totalEarnings) : 0;
                    const deductions = payslip.totalDeductions ? parseFloat(payslip.totalDeductions) : 0;
                    const net = payslip.netSalary ? parseFloat(payslip.netSalary) : 0;
                    return (
                      <motion.tr
                        key={payslip.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{payslip.employeeName}</TableCell>
                        <TableCell className="text-nexabook-600">{payslip.employeeCode || "-"}</TableCell>
                        <TableCell className="text-nexabook-600">{payslip.department || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(basic)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">{formatCurrency(earnings)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(deductions)}</TableCell>
                        <TableCell className="text-right font-bold text-nexabook-900">{formatCurrency(net)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={payslip.isPaid ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                            {payslip.isPaid ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
                <TableRow className="bg-nexabook-50 font-bold">
                  <TableCell colSpan={4} className="text-nexabook-900">Totals</TableCell>
                  <TableCell className="text-right text-nexabook-900">{formatCurrency(payslips.reduce((s: number, p: any) => s + (p.basicSalary ? parseFloat(p.basicSalary) : 0), 0))}</TableCell>
                  <TableCell className="text-right text-green-700">{formatCurrency(totalEarnings)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(totalDeductions)}</TableCell>
                  <TableCell className="text-right text-nexabook-900">{formatCurrency(totalNet)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No payroll run found for the selected month and year</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
