"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Calendar, CheckCircle, XCircle, Clock, Loader2, 
  Users, Filter, AlertCircle, Check, X
} from "lucide-react";
import {
  getLeaveApplications,
  createLeaveApplication,
  approveLeaveApplication,
  rejectLeaveApplication,
  getLeaveTypes,
  getLeaveBalance,
} from "@/lib/actions/leaves";
import { getEmployees } from "@/lib/actions/hr-payroll";
import ReportExportButtons from "@/components/reports/ReportExportButtons";

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
  };
  return map[status] || "bg-gray-100 text-gray-800 border-gray-300";
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return map[status] || status;
};

export default function LeaveManagementPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formLeaveTypeId, setFormLeaveTypeId] = useState("");
  const [formFromDate, setFormFromDate] = useState("");
  const [formToDate, setFormToDate] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    
    const [appsRes, typesRes, employeesRes] = await Promise.all([
      getLeaveApplications(),
      getLeaveTypes(),
      getEmployees("active"),
    ]);

    if (appsRes.success && appsRes.data) {
      setApplications(appsRes.data as any[]);
    }
    if (typesRes.success && typesRes.data) {
      setLeaveTypes(typesRes.data as any[]);
    }
    if (employeesRes.success && employeesRes.data) {
      setEmployees(employeesRes.data as any[]);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load leave balance when employee is selected
  useEffect(() => {
    async function loadBalance() {
      if (formEmployeeId) {
        const res = await getLeaveBalance(formEmployeeId);
        if (res.success && res.data) {
          setLeaveBalance(res.data);
        }
      }
    }
    loadBalance();
  }, [formEmployeeId]);

  const resetForm = () => {
    setFormEmployeeId("");
    setFormLeaveTypeId("");
    setFormFromDate("");
    setFormToDate("");
    setFormReason("");
    setFormNotes("");
    setLeaveBalance([]);
  };

  const handleCreate = async () => {
    if (!formEmployeeId || !formLeaveTypeId || !formFromDate || !formToDate || !formReason) {
      alert("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    const res = await createLeaveApplication({
      employeeId: formEmployeeId,
      leaveTypeId: formLeaveTypeId,
      fromDate: formFromDate,
      toDate: formToDate,
      reason: formReason,
      notes: formNotes,
    });

    if (res.success) {
      await loadData();
      resetForm();
      setDialogOpen(false);
      alert("Leave application created successfully");
    } else {
      alert(res.error || "Failed to create leave application");
    }
    setSubmitting(false);
  };

  const handleApprove = async (applicationId: string) => {
    if (!confirm("Are you sure you want to approve this leave application?")) return;
    
    const res = await approveLeaveApplication(applicationId);
    if (res.success) {
      await loadData();
      alert("Leave application approved successfully");
    } else {
      alert(res.error || "Failed to approve leave application");
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    const res = await rejectLeaveApplication(selectedApplication.id, rejectionReason);
    if (res.success) {
      await loadData();
      setRejectDialogOpen(false);
      setSelectedApplication(null);
      setRejectionReason("");
      alert("Leave application rejected");
    } else {
      alert(res.error || "Failed to reject leave application");
    }
  };

  const openRejectDialog = (application: any) => {
    setSelectedApplication(application);
    setRejectDialogOpen(true);
  };

  // Filter applications
  const filteredApplications = filterStatus === "all" 
    ? applications 
    : applications.filter(app => app.status === filterStatus);

  // Stats
  const totalApplications = applications.length;
  const pendingCount = applications.filter(a => a.status === "pending").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;
  const rejectedCount = applications.filter(a => a.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900 flex items-center gap-2">
              <Calendar className="h-8 w-8 text-nexabook-700" />
              Leave Management
            </h1>
            <p className="text-nexabook-600 mt-1">Manage employee leave applications and track leave balances</p>
          </div>
          <div className="flex gap-2">
            {applications.length > 0 && (
              <ReportExportButtons reportTitle="Leave Management" tableId="leave-applications-table" />
            )}
            <Button 
              onClick={() => { resetForm(); setDialogOpen(true); }} 
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              <Plus className="h-4 w-4 mr-2" />Apply for Leave
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-nexabook-900">{totalApplications}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Approved</p>
                <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Rejected</p>
                <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        </div>
      )}

      {/* Applications Table */}
      {!loading && (
        <Card className="enterprise-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-nexabook-900">Leave Applications</CardTitle>
                <CardDescription>{filteredApplications.length} application{filteredApplications.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-nexabook-500" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40 border-slate-200">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          {filteredApplications.length === 0 ? (
            <CardContent className="p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
              <h3 className="text-lg font-medium text-nexabook-700">No leave applications</h3>
              <p className="text-sm text-nexabook-500 mt-1">
                {filterStatus !== "all" ? "Try changing the filter" : "Click 'Apply for Leave' to create a new application"}
              </p>
            </CardContent>
          ) : (
            <Table id="leave-applications-table">
              <TableHeader>
                <TableRow className="bg-nexabook-50">
                  <TableHead className="text-nexabook-900">Employee</TableHead>
                  <TableHead className="text-nexabook-900">Leave Type</TableHead>
                  <TableHead className="text-nexabook-900">From Date</TableHead>
                  <TableHead className="text-nexabook-900">To Date</TableHead>
                  <TableHead className="text-right text-nexabook-900">Days</TableHead>
                  <TableHead className="text-nexabook-900">Status</TableHead>
                  <TableHead className="text-center text-nexabook-900 print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-nexabook-900">{app.employeeName}</p>
                        <p className="text-xs text-nexabook-500">{app.employeeCode} • {app.department}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-300">
                        {app.leaveTypeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-nexabook-700">
                      {new Date(app.fromDate).toLocaleDateString("en-PK", { 
                        year: "numeric", month: "short", day: "numeric" 
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-nexabook-700">
                      {new Date(app.toDate).toLocaleDateString("en-PK", { 
                        year: "numeric", month: "short", day: "numeric" 
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-nexabook-900">
                      {app.totalDays}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(app.status)}>
                        {statusLabel(app.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center print:hidden">
                      {app.status === "pending" && (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => handleApprove(app.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => openRejectDialog(app)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Add Leave Application Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-nexabook-900">Apply for Leave</DialogTitle>
          </DialogHeader>
          
          {/* Leave Balance Widget */}
          {leaveBalance.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-nexabook-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Leave Balance
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {leaveBalance.map((balance: any) => (
                    <div key={balance.leaveTypeId} className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-nexabook-500 mb-1">{balance.leaveTypeName}</p>
                      <div className="flex items-end gap-2">
                        <p className="text-lg font-bold text-nexabook-900">
                          {balance.daysRemaining}
                        </p>
                        <p className="text-xs text-nexabook-500 mb-1">
                          / {balance.daysAllowed} days
                        </p>
                      </div>
                      <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-600 rounded-full"
                          style={{ width: `${(balance.daysRemaining / balance.daysAllowed) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label className="text-nexabook-700">Employee *</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Leave Type *</Label>
              <Select value={formLeaveTypeId} onValueChange={setFormLeaveTypeId}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.daysAllowed} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Department</Label>
              <Input 
                value={employees.find(e => e.id === formEmployeeId)?.department || ""} 
                disabled
                className="border-slate-200 bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">From Date *</Label>
              <Input 
                type="date" 
                value={formFromDate} 
                onChange={e => setFormFromDate(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">To Date *</Label>
              <Input 
                type="date" 
                value={formToDate} 
                onChange={e => setFormToDate(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-nexabook-700">Reason *</Label>
              <Textarea 
                value={formReason} 
                onChange={e => setFormReason(e.target.value)} 
                placeholder="Reason for leave..."
                className="border-slate-200"
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-nexabook-700">Notes (Optional)</Label>
              <Textarea 
                value={formNotes} 
                onChange={e => setFormNotes(e.target.value)} 
                placeholder="Additional notes..."
                className="border-slate-200"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleCreate} 
              disabled={submitting || !formEmployeeId || !formLeaveTypeId || !formFromDate || !formToDate || !formReason}
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Reject Leave Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedApplication && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-nexabook-900">
                  {selectedApplication.employeeName}
                </p>
                <p className="text-xs text-nexabook-500">
                  {selectedApplication.leaveTypeName} • {selectedApplication.totalDays} days
                </p>
                <p className="text-xs text-nexabook-500">
                  {new Date(selectedApplication.fromDate).toLocaleDateString("en-PK")} - {new Date(selectedApplication.toDate).toLocaleDateString("en-PK")}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-nexabook-700">Rejection Reason *</Label>
              <Textarea 
                value={rejectionReason} 
                onChange={e => setRejectionReason(e.target.value)} 
                placeholder="Reason for rejection..."
                className="border-slate-200"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
