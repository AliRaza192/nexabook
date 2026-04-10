"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Check,
  X,
  Loader2,
  Search,
  Users,
  Coffee,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  getEmployees,
  markAttendance,
  getAttendance,
} from "@/lib/actions/hr-payroll";

interface Employee {
  id: string;
  fullName: string;
  employeeCode: string;
  department: string | null;
  designation: string | null;
}

interface AttendanceRecord {
  employeeId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Late' | 'Half Day';
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);

  // Load employees
  useEffect(() => {
    loadEmployees();
  }, []);

  // Initialize attendance data when employees load
  useEffect(() => {
    if (employees.length > 0) {
      const initialData: Record<string, AttendanceRecord> = {};
      employees.forEach((emp) => {
        initialData[emp.id] = {
          employeeId: emp.id,
          date: selectedDate,
          status: 'Present',
        };
      });
      setAttendanceData(initialData);
    }
  }, [employees, selectedDate]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const result = await getEmployees("Active");
      if (result.success && result.data) {
        setEmployees(result.data as Employee[]);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update attendance record
  const updateAttendance = (employeeId: string, field: keyof AttendanceRecord, value: any) => {
    setAttendanceData((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      },
    }));
  };

  // Mark all as present
  const markAllPresent = () => {
    const updated: Record<string, AttendanceRecord> = {};
    employees.forEach((emp) => {
      updated[emp.id] = {
        employeeId: emp.id,
        date: selectedDate,
        status: 'Present',
        checkIn: new Date().toTimeString().slice(0, 5),
      };
    });
    setAttendanceData(updated);
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.values(attendanceData);
      const result = await markAttendance(records);
      if (result.success) {
        alert(result.message || "Attendance saved successfully");
      } else {
        alert(result.error || "Failed to save attendance");
      }
    } catch (error) {
      console.error("Save attendance error:", error);
      alert("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))] as string[];

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 border-green-300';
      case 'Absent': return 'bg-red-100 text-red-800 border-red-300';
      case 'Leave': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Late': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Half Day': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Count by status
  const statusCounts = {
    Present: Object.values(attendanceData).filter(a => a.status === 'Present').length,
    Absent: Object.values(attendanceData).filter(a => a.status === 'Absent').length,
    Leave: Object.values(attendanceData).filter(a => a.status === 'Leave').length,
    Late: Object.values(attendanceData).filter(a => a.status === 'Late').length,
    'Half Day': Object.values(attendanceData).filter(a => a.status === 'Half Day').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading attendance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-slate-600 mt-1">Track daily employee attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={markAllPresent}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark All Present
          </Button>
          <Button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Attendance
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Date & Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-[200px]">
              <Label className="text-slate-700 mb-2 block">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-slate-300"
              />
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
            <div className="w-[200px]">
              <Label className="text-slate-700 mb-2 block">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700">Present</p>
                <p className="text-xl font-bold text-green-900">{statusCounts.Present}</p>
              </div>
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700">Absent</p>
                <p className="text-xl font-bold text-red-900">{statusCounts.Absent}</p>
              </div>
              <X className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700">Leave</p>
                <p className="text-xl font-bold text-blue-900">{statusCounts.Leave}</p>
              </div>
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-700">Late</p>
                <p className="text-xl font-bold text-yellow-900">{statusCounts.Late}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700">Half Day</p>
                <p className="text-xl font-bold text-purple-900">{statusCounts['Half Day']}</p>
              </div>
              <Coffee className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Employee Attendance - {new Date(selectedDate).toLocaleDateString("en-PK", { year: 'numeric', month: 'long', day: 'numeric' })}
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
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Check In</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Check Out</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, index) => {
                  const record = attendanceData[employee.id];
                  if (!record) return null;

                  return (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-slate-500">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{employee.fullName}</p>
                          <p className="text-xs text-slate-500 font-mono">{employee.employeeCode}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{employee.department || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        <Select
                          value={record.status}
                          onValueChange={(value) => updateAttendance(employee.id, 'status', value)}
                        >
                          <SelectTrigger className={`w-[120px] ${getStatusColor(record.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Present">Present</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                            <SelectItem value="Leave">Leave</SelectItem>
                            <SelectItem value="Late">Late</SelectItem>
                            <SelectItem value="Half Day">Half Day</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Input
                          type="time"
                          value={record.checkIn || ""}
                          onChange={(e) => updateAttendance(employee.id, 'checkIn', e.target.value)}
                          className="w-[120px] border-slate-300 text-center"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Input
                          type="time"
                          value={record.checkOut || ""}
                          onChange={(e) => updateAttendance(employee.id, 'checkOut', e.target.value)}
                          className="w-[120px] border-slate-300 text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="text"
                          placeholder="Optional notes..."
                          value={record.notes || ""}
                          onChange={(e) => updateAttendance(employee.id, 'notes', e.target.value)}
                          className="border-slate-300 text-sm"
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No employees found</h3>
                <p className="text-slate-600">Add employees to track attendance</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Important Note</p>
              <p className="text-sm text-yellow-700 mt-1">
                Attendance records are used for payroll calculations. Unpaid absences will be deducted 
                from the monthly salary. Please ensure accurate attendance tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
