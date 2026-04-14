"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, User, CreditCard, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getEmployeeLedgerReport } from "@/lib/actions/reports";
import { getEmployees } from "@/lib/actions/hr-payroll";

export default function EmployeeLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadEmployees = async () => {
    try {
      const result = await getEmployees();
      if (result.success && result.data) {
        setEmployees(result.data);
        if (result.data.length > 0) {
          setSelectedEmployee(result.data[0].id);
        }
      }
    } catch (error) {
      // silently handle
    }
  };

  const loadReport = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    try {
      const result = await getEmployeeLedgerReport(selectedEmployee, selectedMonth, selectedYear);
      if (result.success && result.data) {
        setReportData(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadReport();
    }
  }, [selectedEmployee, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(value);
  };

  const handleApply = () => {
    loadReport();
  };

  return (
    <ReportLayout
      title="Employee Ledger"
      breadcrumb="Employee Ledger"
      category="HR & Payroll"
      categoryHref="/reports"
    >
      <Card className="enterprise-card mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode || "N/A"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData && reportData.payslips && reportData.payslips.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Employee</p>
                    <p className="text-lg font-bold text-nexabook-900">{reportData.employee?.fullName}</p>
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
                    <p className="text-xs text-nexabook-600">Payslips</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.payslips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Latest Net</p>
                    <p className="text-xl font-bold text-amber-700">
                      {formatCurrency(reportData.payslips[0]?.netSalary ? parseFloat(reportData.payslips[0].netSalary) : 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Department</p>
                    <p className="text-lg font-bold text-nexabook-900">{reportData.employee?.department || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Payroll History</CardTitle>
              <p className="text-sm text-nexabook-600">
                {reportData.employee?.fullName} — All recorded payslips
              </p>
            </CardHeader>
            <CardContent>
              <Table id="employee-ledger-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Total Earnings</TableHead>
                    <TableHead className="text-right">Total Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.payslips.map((payslip: any, index: number) => {
                    const basic = payslip.basicSalary ? parseFloat(payslip.basicSalary) : 0;
                    const earnings = payslip.totalEarnings ? parseFloat(payslip.totalEarnings) : 0;
                    const deductions = payslip.totalDeductions ? parseFloat(payslip.totalDeductions) : 0;
                    const net = payslip.netSalary ? parseFloat(payslip.netSalary) : 0;
                    const date = payslip.createdAt ? new Date(payslip.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "-";
                    return (
                      <motion.tr
                        key={payslip.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="text-nexabook-600">{date}</TableCell>
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
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No payroll history found for this employee</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
