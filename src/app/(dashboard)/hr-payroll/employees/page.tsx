"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  X,
  Loader2,
  Check,
  User,
  Building2,
  Wallet,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  type EmployeeFormData,
} from "@/lib/actions/hr-payroll";

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  cnic: string | null;
  fatherName: string | null;
  department: string | null;
  designation: string | null;
  basicSalary: string | null;
  houseRent: string | null;
  medicalAllowance: string | null;
  status: string;
  joiningDate: Date;
  isActive: boolean;
}

const initialFormData: EmployeeFormData = {
  employeeCode: "",
  fullName: "",
  email: "",
  phone: "",
  cnic: "",
  fatherName: "",
  dateOfBirth: "",
  address: "",
  city: "",
  department: "",
  designation: "",
  joiningDate: new Date().toISOString().split("T")[0],
  confirmationDate: "",
  bankName: "",
  accountNumber: "",
  branchName: "",
  basicSalary: "0",
  houseRent: "0",
  medicalAllowance: "0",
  conveyanceAllowance: "0",
  otherAllowances: "0",
  eobiDeduction: "0",
  incomeTaxDeduction: "0",
  status: "Active",
  emergencyContact: "",
  emergencyPhone: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "job" | "salary">("personal");

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesRes, departmentsRes] = await Promise.all([
        getEmployees(statusFilter !== "all" ? statusFilter : undefined, searchQuery || undefined, departmentFilter !== "all" ? departmentFilter : undefined),
        getDepartments(),
      ]);

      if (employeesRes.success && employeesRes.data) {
        setEmployees(employeesRes.data as Employee[]);
      }
      if (departmentsRes.success && departmentsRes.data) {
        setDepartments(departmentsRes.data as string[]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter handlers
  const handleSearch = () => {
    loadData();
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setTimeout(loadData, 100);
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
    setTimeout(loadData, 100);
  };

  // Dialog handlers
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData(initialFormData);
    setActiveTab("personal");
    setDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      email: employee.email || "",
      phone: employee.phone || "",
      cnic: employee.cnic || "",
      fatherName: employee.fatherName || "",
      dateOfBirth: "",
      address: "",
      city: "",
      department: employee.department || "",
      designation: employee.designation || "",
      joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      confirmationDate: "",
      bankName: "",
      accountNumber: "",
      branchName: "",
      basicSalary: employee.basicSalary || "0",
      houseRent: employee.houseRent || "0",
      medicalAllowance: employee.medicalAllowance || "0",
      conveyanceAllowance: "0",
      otherAllowances: "0",
      eobiDeduction: "0",
      incomeTaxDeduction: "0",
      status: employee.status,
      emergencyContact: "",
      emergencyPhone: "",
    });
    setActiveTab("personal");
    setDialogOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to remove this employee?")) return;
    
    const result = await deleteEmployee(id);
    if (result.success) {
      loadData();
    } else {
      alert(result.error || "Failed to remove employee");
    }
  };

  // Form submission
  const handleSubmit = async () => {
    if (!formData.employeeCode || !formData.fullName || !formData.joiningDate) {
      alert("Employee Code, Full Name, and Joining Date are required");
      return;
    }

    setSubmitting(true);
    try {
      const result = editingEmployee
        ? await updateEmployee(editingEmployee.id, formData)
        : await createEmployee(formData);

      if (result.success) {
        setDialogOpen(false);
        loadData();
      } else {
        alert(result.error || "Failed to save employee");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save employee");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "PKR 0";
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 border-green-300";
      case "On Leave": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Terminated": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-600 mt-1">Manage your organization's employees</p>
        </div>
        <Button onClick={handleAddEmployee} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search by name, code, or CNIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[160px] border-slate-300">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={handleDepartmentFilter}>
              <SelectTrigger className="w-[160px] border-slate-300">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Employees ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Employee</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Designation</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Basic Salary</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.fullName}</p>
                          <p className="text-xs text-slate-500">{emp.email || "No email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700 font-mono">{emp.employeeCode}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{emp.department || "-"}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{emp.designation || "-"}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">{formatCurrency(emp.basicSalary)}</td>
                    <td className="py-3 px-4">
                      <Badge className={`text-xs ${getStatusColor(emp.status)}`}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEditEmployee(emp)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteEmployee(emp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {employees.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No employees found</h3>
                <p className="text-slate-600 mb-4">Add your first employee to get started</p>
                <Button onClick={handleAddEmployee} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {editingEmployee ? "Update employee information" : "Fill in the employee details"}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-slate-200">
            <Button
              variant={activeTab === "personal" ? "default" : "ghost"}
              className={activeTab === "personal" ? "bg-slate-900" : ""}
              onClick={() => setActiveTab("personal")}
            >
              <User className="h-4 w-4 mr-2" />
              Personal Info
            </Button>
            <Button
              variant={activeTab === "job" ? "default" : "ghost"}
              className={activeTab === "job" ? "bg-slate-900" : ""}
              onClick={() => setActiveTab("job")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Job Info
            </Button>
            <Button
              variant={activeTab === "salary" ? "default" : "ghost"}
              className={activeTab === "salary" ? "bg-slate-900" : ""}
              onClick={() => setActiveTab("salary")}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Salary Structure
            </Button>
          </div>

          <div className="space-y-4 py-4">
            {/* Personal Info Tab */}
            {activeTab === "personal" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 mb-1 block">Employee Code *</Label>
                  <Input
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="border-slate-300"
                    placeholder="EMP-001"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Full Name *</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="border-slate-300"
                    placeholder="Muhammad Ali"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">CNIC</Label>
                  <Input
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                    className="border-slate-300"
                    placeholder="12345-1234567-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Father/Husband Name</Label>
                  <Input
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="border-slate-300"
                    placeholder="Ahmed Khan"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-slate-300"
                    placeholder="employee@example.com"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="border-slate-300"
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="border-slate-300"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="border-slate-300"
                    placeholder="Karachi"
                  />
                </div>
              </div>
            )}

            {/* Job Info Tab */}
            {activeTab === "job" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 mb-1 block">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Designation</Label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="border-slate-300"
                    placeholder="Senior Developer"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Joining Date *</Label>
                  <Input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Bank Name</Label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="border-slate-300"
                    placeholder="HBL"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Account Number</Label>
                  <Input
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="border-slate-300"
                    placeholder="PK36HABB0000000000"
                  />
                </div>
              </div>
            )}

            {/* Salary Structure Tab */}
            {activeTab === "salary" && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Earnings (Monthly)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-blue-800 mb-1 block text-sm">Basic Salary *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.basicSalary}
                        onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <Label className="text-blue-800 mb-1 block text-sm">House Rent</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.houseRent}
                        onChange={(e) => setFormData({ ...formData, houseRent: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <Label className="text-blue-800 mb-1 block text-sm">Medical Allowance</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.medicalAllowance}
                        onChange={(e) => setFormData({ ...formData, medicalAllowance: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <Label className="text-blue-800 mb-1 block text-sm">Conveyance Allowance</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.conveyanceAllowance}
                        onChange={(e) => setFormData({ ...formData, conveyanceAllowance: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <Label className="text-blue-800 mb-1 block text-sm">Other Allowances</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.otherAllowances}
                        onChange={(e) => setFormData({ ...formData, otherAllowances: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-900">Total Earnings:</span>
                      <span className="font-bold text-blue-900">
                        {formatCurrency(
                          String(
                            parseFloat(formData.basicSalary || "0") +
                            parseFloat(formData.houseRent || "0") +
                            parseFloat(formData.medicalAllowance || "0") +
                            parseFloat(formData.conveyanceAllowance || "0") +
                            parseFloat(formData.otherAllowances || "0")
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-3">Deductions (Monthly)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-red-800 mb-1 block text-sm">EOBI Deduction</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.eobiDeduction}
                        onChange={(e) => setFormData({ ...formData, eobiDeduction: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <Label className="text-red-800 mb-1 block text-sm">Income Tax</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.incomeTaxDeduction}
                        onChange={(e) => setFormData({ ...formData, incomeTaxDeduction: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingEmployee ? "Update Employee" : "Add Employee"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
