"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Users, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAttendanceReport } from "@/lib/actions/reports";

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await getAttendanceReport(selectedMonth, selectedYear);
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

  const totalRecords = reportData?.length || 0;
  const presentCount = reportData?.filter((r: any) => r.status === "present").length || 0;
  const absentCount = reportData?.filter((r: any) => r.status === "absent").length || 0;
  const lateCount = reportData?.filter((r: any) => r.status === "late").length || 0;
  const avgHours = reportData?.length > 0
    ? reportData.reduce((sum: number, r: any) => sum + (r.workingHours || 0), 0) / reportData.length
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-800 border-green-200";
      case "absent": return "bg-red-100 text-red-800 border-red-200";
      case "late": return "bg-amber-100 text-amber-800 border-amber-200";
      case "half-day": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-nexabook-100 text-nexabook-800 border-nexabook-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case "absent": return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      case "late": return <AlertCircle className="h-3.5 w-3.5 text-amber-600" />;
      default: return <Clock className="h-3.5 w-3.5 text-nexabook-600" />;
    }
  };

  return (
    <ReportLayout
      title="Attendance Report"
      breadcrumb="Attendance"
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
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    <p className="text-xs text-nexabook-600">Total Records</p>
                    <p className="text-xl font-bold text-nexabook-900">{totalRecords}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Present</p>
                    <p className="text-xl font-bold text-green-700">{presentCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Absent</p>
                    <p className="text-xl font-bold text-red-700">{absentCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Late</p>
                    <p className="text-xl font-bold text-amber-700">{lateCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Avg Hours</p>
                    <p className="text-xl font-bold text-purple-700">{avgHours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Attendance Records</CardTitle>
              <p className="text-sm text-nexabook-600">
                {new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Late (min)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((record: any, index: number) => {
                    const date = record.date ? new Date(record.date).toLocaleDateString("en-PK") : "-";
                    const checkIn = record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "-";
                    const checkOut = record.checkOut ? new Date(record.checkOut).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "-";
                    return (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{record.employeeName || "N/A"}</TableCell>
                        <TableCell className="text-nexabook-600">{record.employeeCode || "-"}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{date}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{checkIn}</TableCell>
                        <TableCell className="text-nexabook-600 text-sm">{checkOut}</TableCell>
                        <TableCell className="text-right">{record.workingHours ? `${record.workingHours}h` : "-"}</TableCell>
                        <TableCell className="text-right text-green-600">{record.overtime ? `${record.overtime}h` : "-"}</TableCell>
                        <TableCell className="text-right text-red-600">{record.lateMinutes ? `${record.lateMinutes}m` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`flex items-center gap-1 w-fit ${getStatusBadge(record.status)}`}>
                            {getStatusIcon(record.status)}
                            <span className="capitalize">{record.status}</span>
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
            <p className="text-nexabook-600">No attendance records found for the selected month</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
