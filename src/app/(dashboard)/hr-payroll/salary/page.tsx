"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, DollarSign, CheckCircle, Clock } from "lucide-react";
import { getPayrollSummaryReportFull } from "@/lib/actions/reports";

export default function SalaryProcessingPage() {
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    setLoading(true);
    const res = await getPayrollSummaryReportFull(month, year);
    if (res.success) setPayrollData(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [month, year]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Salary Processing</h1>
            <p className="text-nexabook-600 mt-1">Process and manage employee salaries</p>
          </div>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label>Month</Label>
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="rounded-md border border-nexabook-200 px-3 py-2">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24" />
            </div>
          </div>
        </div>
      </motion.div>

      {payrollData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-nexabook-600">Total Employees</p><p className="text-2xl font-bold">{payrollData.payslips?.length || 0}</p></div><DollarSign className="h-10 w-10 text-nexabook-200" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-nexabook-600">Total Earnings</p><p className="text-2xl font-bold">Rs. {payrollData.payslips?.reduce((s: number, p: any) => s + parseFloat(p.totalEarnings || "0"), 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p></div><DollarSign className="h-10 w-10 text-green-200" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-nexabook-600">Total Deductions</p><p className="text-2xl font-bold">Rs. {payrollData.payslips?.reduce((s: number, p: any) => s + parseFloat(p.totalDeductions || "0"), 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p></div><DollarSign className="h-10 w-10 text-red-200" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-nexabook-600">Net Pay</p><p className="text-2xl font-bold">Rs. {payrollData.payslips?.reduce((s: number, p: any) => s + parseFloat(p.netSalary || "0"), 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p></div><DollarSign className="h-10 w-10 text-nexabook-200" /></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Payslips</CardTitle><CardDescription>{new Date(0, month - 1).toLocaleString("default", { month: "long" })} {year}</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Code</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Basic</TableHead><TableHead className="text-right">Earnings</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net Salary</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payrollData.payslips?.map((p: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{p.employeeName}</TableCell>
                      <TableCell><Badge variant="outline">{p.employeeCode}</Badge></TableCell>
                      <TableCell>{p.department || "-"}</TableCell>
                      <TableCell className="text-right">Rs. {parseFloat(p.basicSalary || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-green-600">Rs. {parseFloat(p.totalEarnings || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-red-600">Rs. {parseFloat(p.totalDeductions || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold">Rs. {parseFloat(p.netSalary || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge variant={p.isPaid ? "default" : "outline"} className="gap-1">{p.isPaid ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{p.isPaid ? "Paid" : "Pending"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="p-8 text-center"><DollarSign className="h-16 w-16 mx-auto mb-4 text-nexabook-300" /><h2 className="text-xl font-bold text-nexabook-900 mb-2">No Payroll Run Found</h2><p className="text-nexabook-600">Create a payroll run for {new Date(0, month - 1).toLocaleString("default", { month: "long" })} {year} from the HR & Payroll module.</p></CardContent></Card>
      )}
    </div>
  );
}
