"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Printer,
  Download,
  Search,
  Calendar,
  Eye,
  Check,
  Loader2,
  DollarSign,
  Building2,
  User,
  TrendingDown,
} from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPayrollRuns,
  getPayslips,
  markPayslipPaid,
} from "@/lib/actions/hr-payroll";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface Payslip {
  id: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  cnic: string | null;
  bankName: string | null;
  accountNumber: string | null;
  basicSalary: string;
  houseRent: string;
  medicalAllowance: string;
  conveyanceAllowance: string;
  otherAllowances: string;
  overtimePay: string;
  bonus: string;
  totalEarnings: string;
  eobiDeduction: string;
  incomeTax: string;
  providentFund: string;
  otherDeductions: string;
  unpaidLeaveDeduction: string;
  totalDeductions: string;
  netSalary: string;
  presentDays: string;
  absentDays: string;
  leaveDays: string;
  unpaidLeaveDays: string;
  totalWorkingDays: number | null;
  isPaid: boolean;
  paymentDate: Date | null;
  paymentMethod: string | null;
}

export default function PayslipReportsPage() {
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<string | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load payroll runs
  useEffect(() => {
    loadPayrollRuns();
  }, []);

  const loadPayrollRuns = async () => {
    const result = await getPayrollRuns();
    if (result.success && result.data) {
      setPayrollRuns(result.data);
      // Auto-select first approved run
      const approvedRun = result.data.find((r: any) => r.status === 'Approved' || r.status === 'Posted');
      if (approvedRun) {
        setSelectedPayrollRun(approvedRun.id);
        loadPayslips(approvedRun.id);
      }
    }
  };

  const loadPayslips = async (runId: string) => {
    setLoading(true);
    const result = await getPayslips(runId);
    if (result.success && result.data) {
      setPayslips(result.data as Payslip[]);
    }
    setLoading(false);
  };

  const handlePayrollRunChange = (runId: string) => {
    setSelectedPayrollRun(runId);
    loadPayslips(runId);
  };

  const handleViewPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setPrintDialogOpen(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    const result = await markPayslipPaid(id, "Bank Transfer");
    if (result.success) {
      if (selectedPayrollRun) loadPayslips(selectedPayrollRun);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: string) => {
    return formatPKR(parseFloat(value || "0"), 'south-asian');
  };

  const filteredPayslips = payslips.filter((p) =>
    p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedRun = payrollRuns.find((r) => r.id === selectedPayrollRun);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payslip Reports</h1>
          <p className="text-slate-600 mt-1">View and print employee payslips</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Label className="text-slate-700 mb-2 block">Payroll Period</Label>
              <Select value={selectedPayrollRun || ""} onValueChange={handlePayrollRunChange}>
                <SelectTrigger className="border-slate-300">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select payroll run" />
                </SelectTrigger>
                <SelectContent>
                  {payrollRuns.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.title} ({run.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[250px]">
              <Label className="text-slate-700 mb-2 block">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-300"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      {selectedPayrollRun && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Payslips - {selectedRun?.title}
              </div>
              <Badge className="bg-blue-600">
                {filteredPayslips.length} Employees
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">#</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Gross Salary</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Deductions</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Net Salary</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayslips.map((payslip, index) => (
                      <motion.tr
                        key={payslip.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-500">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-900">{payslip.employeeName}</p>
                            <p className="text-xs text-slate-500 font-mono">{payslip.employeeCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">{payslip.department || "-"}</td>
                        <td className="py-3 px-4 text-right text-sm text-slate-700">{formatCurrency(payslip.totalEarnings)}</td>
                        <td className="py-3 px-4 text-right text-sm text-red-700">{formatCurrency(payslip.totalDeductions)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-blue-700">{formatCurrency(payslip.netSalary)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {payslip.isPaid ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleViewPayslip(payslip)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-50"
                              onClick={() => handlePrint()}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {!payslip.isPaid && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                                onClick={() => handleMarkAsPaid(payslip.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>

                {filteredPayslips.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No payslips found</h3>
                    <p className="text-slate-600">Generate payroll to create payslips</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payslip Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Employee Payslip
              </div>
              <Button onClick={handlePrint} size="sm" className="bg-slate-900 hover:bg-slate-800">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {selectedPayslip?.employeeName} - {selectedRun?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedPayslip && (
            <div ref={printRef} className="space-y-6 py-4">
              {/* Company Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h1 className="text-2xl font-bold text-slate-900">NexaBook</h1>
                <p className="text-sm text-slate-600">Employee Salary Slip</p>
                <p className="text-lg font-semibold text-slate-800 mt-2">{selectedRun?.title}</p>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Employee Name</p>
                  <p className="font-semibold text-slate-900">{selectedPayslip.employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employee Code</p>
                  <p className="font-semibold text-slate-900">{selectedPayslip.employeeCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Designation</p>
                  <p className="font-semibold text-slate-900">{selectedPayslip.designation || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="font-semibold text-slate-900">{selectedPayslip.department || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CNIC</p>
                  <p className="font-semibold text-slate-900">{selectedPayslip.cnic || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Bank Account</p>
                  <p className="font-semibold text-slate-900">
                    {selectedPayslip.bankName} - {selectedPayslip.accountNumber || "-"}
                  </p>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedPayslip.presentDays}</p>
                    <p className="text-xs text-slate-600">Present Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-700">{selectedPayslip.absentDays}</p>
                    <p className="text-xs text-slate-600">Absent Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-700">{selectedPayslip.leaveDays}</p>
                    <p className="text-xs text-slate-600">Leave Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-700">{selectedPayslip.totalWorkingDays}</p>
                    <p className="text-xs text-slate-600">Total Days</p>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Earnings
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">Basic Salary</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">House Rent</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.houseRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">Medical Allowance</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.medicalAllowance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">Conveyance Allowance</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.conveyanceAllowance)}</span>
                    </div>
                    {parseFloat(selectedPayslip.otherAllowances) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-700">Other Allowances</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.otherAllowances)}</span>
                      </div>
                    )}
                    {parseFloat(selectedPayslip.overtimePay) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-700">Overtime Pay</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.overtimePay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-green-300">
                      <span className="font-bold text-green-900">Total Earnings</span>
                      <span className="font-bold text-green-900">{formatCurrency(selectedPayslip.totalEarnings)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Deductions
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">EOBI Deduction</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.eobiDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-700">Income Tax</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.incomeTax)}</span>
                    </div>
                    {parseFloat(selectedPayslip.providentFund) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-700">Provident Fund</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.providentFund)}</span>
                      </div>
                    )}
                    {parseFloat(selectedPayslip.unpaidLeaveDeduction) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-700">Unpaid Leave</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.unpaidLeaveDeduction)}</span>
                      </div>
                    )}
                    {parseFloat(selectedPayslip.otherDeductions) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-700">Other Deductions</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(selectedPayslip.otherDeductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-red-300">
                      <span className="font-bold text-red-900">Total Deductions</span>
                      <span className="font-bold text-red-900">{formatCurrency(selectedPayslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="p-6 bg-slate-900 rounded-lg text-center">
                <p className="text-sm text-slate-400 mb-2">Net Salary</p>
                <p className="text-4xl font-bold text-blue-400">{formatCurrency(selectedPayslip.netSalary)}</p>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Payment Status</p>
                  <p className="font-semibold text-slate-900">
                    {selectedPayslip.isPaid ? "Paid" : "Pending"}
                  </p>
                  {selectedPayslip.isPaid && selectedPayslip.paymentDate && (
                    <p className="text-xs text-slate-500">
                      Paid on {new Date(selectedPayslip.paymentDate).toLocaleDateString()} via {selectedPayslip.paymentMethod}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Generated on</p>
                  <p className="font-semibold text-slate-900">
                    {new Date().toLocaleDateString("en-PK", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
                <p>This is a computer-generated document. No signature required.</p>
                <p>NexaBook - HR & Payroll Management System</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
