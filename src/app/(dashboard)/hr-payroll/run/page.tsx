"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Calculator,
  Check,
  Loader2,
  AlertCircle,
  Users,
  DollarSign,
  TrendingDown,
  Receipt,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPayrollCalculations,
  generateAndApprovePayroll,
  getPayrollRuns,
  type PayrollCalculation,
} from "@/lib/actions/hr-payroll";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function RunPayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);
  const [generated, setGenerated] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);

  // Load payroll runs
  useEffect(() => {
    loadPayrollRuns();
  }, []);

  const loadPayrollRuns = async () => {
    const result = await getPayrollRuns();
    if (result.success && result.data) {
      setPayrollRuns(result.data);
    }
  };

  // Generate payroll calculations
  const handleGeneratePayroll = async () => {
    setLoading(true);
    try {
      const result = await getPayrollCalculations(selectedMonth, selectedYear);
      if (result.success && result.data) {
        setCalculations(result.data);
        setGenerated(true);
      } else {
        alert(result.error || "Failed to generate payroll calculations");
      }
    } catch (error) {
      alert("Failed to generate payroll");
    } finally {
      setLoading(false);
    }
  };

  // Approve and post payroll
  const handleApprovePayroll = async () => {
    setProcessing(true);
    setConfirmDialogOpen(false);
    try {
      const result = await generateAndApprovePayroll(selectedMonth, selectedYear, calculations);
      if (result.success) {
        setSuccessMessage(result.message || "Payroll processed successfully");
        setSuccessDialogOpen(true);
        setGenerated(false);
        setCalculations([]);
        loadPayrollRuns();
      } else {
        alert(result.error || "Failed to process payroll");
      }
    } catch (error) {
      alert("Failed to process payroll");
    } finally {
      setProcessing(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate totals
  const totalEarnings = calculations.reduce((sum, c) => sum + c.totalEarnings, 0);
  const totalDeductions = calculations.reduce((sum, c) => sum + c.totalDeductions, 0);
  const totalNet = calculations.reduce((sum, c) => sum + c.netSalary, 0);

  // Check if payroll already exists for this month
  const existingPayroll = payrollRuns.find(
    (run) => run.month === selectedMonth && run.year === selectedYear && run.status !== 'Draft'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Monthly Payroll Processing</h1>
          <p className="text-slate-600 mt-1">Generate and approve monthly payroll</p>
        </div>
      </div>

      {/* Month/Year Selector */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Select Payroll Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-slate-700 mb-2 block">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label className="text-slate-700 mb-2 block">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGeneratePayroll}
                disabled={loading || !!existingPayroll}
                className="bg-blue-600 hover:bg-blue-700 h-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Generate Payroll
                  </>
                )}
              </Button>
            </div>
          </div>

          {existingPayroll && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Payroll Already Processed</p>
                <p className="text-sm text-yellow-700">
                  Payroll for {MONTHS[selectedMonth - 1]} {selectedYear} has already been approved 
                  (Status: {existingPayroll.status})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {generated && calculations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalEarnings)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-200 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(totalDeductions)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Net Payable</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalNet)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payroll Table */}
      {generated && calculations.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Payroll Details - {MONTHS[selectedMonth - 1]} {selectedYear}
              </div>
              <Badge className="bg-blue-600">
                {calculations.length} Employees
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Basic Salary</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Allowances</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Gross Salary</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Deductions</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Net Payable</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc, index) => {
                    const allowances = calc.houseRent + calc.medicalAllowance + calc.conveyanceAllowance + calc.otherAllowances + calc.overtimePay;
                    return (
                      <motion.tr
                        key={calc.employeeId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-500">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-900">{calc.employeeName}</p>
                            <p className="text-xs text-slate-500 font-mono">{calc.employeeCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">{calc.department || "-"}</td>
                        <td className="py-3 px-4 text-right text-sm text-slate-700">{formatCurrency(calc.basicSalary)}</td>
                        <td className="py-3 px-4 text-right text-sm text-green-700 font-medium">
                          +{formatCurrency(allowances)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(calc.totalEarnings)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-red-700 font-medium">
                          -{formatCurrency(calc.totalDeductions)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-blue-700 text-base">
                            {formatCurrency(calc.netSalary)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <Badge className="bg-green-100 text-green-800">{calc.presentDays}P</Badge>
                            {calc.absentDays > 0 && (
                              <Badge className="bg-red-100 text-red-800">{calc.absentDays}A</Badge>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100">
                    <td colSpan={5} className="py-4 px-4 text-right font-bold text-slate-900">
                      Total ({calculations.length} employees)
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(totalEarnings)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-red-700">
                      {formatCurrency(totalDeductions)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-blue-700 text-lg">
                        {formatCurrency(totalNet)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Approve Button */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setGenerated(false);
                  setCalculations([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setConfirmDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 h-12 px-6"
              >
                <Check className="mr-2 h-5 w-5" />
                Approve & Post Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!generated && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <Calculator className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Payroll Generated</h3>
            <p className="text-slate-600 mb-4">
              Select a month and year, then click "Generate Payroll" to calculate salaries
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Confirm Payroll Approval
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              You are about to approve payroll for {MONTHS[selectedMonth - 1]} {selectedYear}.
              This will create journal entries and generate payslips for all employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700">Total Employees</span>
              <span className="font-bold text-slate-900">{calculations.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-green-700">Total Gross Salary</span>
              <span className="font-bold text-green-900">{formatCurrency(totalEarnings)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-red-700">Total Deductions</span>
              <span className="font-bold text-red-900">{formatCurrency(totalDeductions)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
              <span className="text-blue-800 font-semibold">Net Payable Amount</span>
              <span className="font-bold text-blue-900 text-xl">{formatCurrency(totalNet)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprovePayroll}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm & Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <Check className="h-6 w-6 text-green-600" />
              Payroll Approved Successfully
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-slate-700">{successMessage}</p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 w-full"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Payslips
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
