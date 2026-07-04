"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Clock, Search, Loader2, Trash2, X,
  Calendar, CheckCircle2, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getTimesheets, createTimesheet, updateTimesheetStatus, deleteTimesheet,
  getProjects,
} from "@/lib/actions/projects";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const INITIAL_FORM = { projectId: "", taskId: "", date: new Date().toISOString().split("T")[0], hours: "", description: "", billable: true };

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAll(); }, [statusFilter]);

  const loadAll = async () => {
    setLoading(true);
    const [tsRes, pRes] = await Promise.all([
      getTimesheets(statusFilter !== "all" ? { status: statusFilter } : undefined),
      getProjects(),
    ]);
    if (tsRes.success) setTimesheets(tsRes.data);
    if (pRes.success) setProjects(pRes.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.projectId || !form.hours) return;
    setSubmitting(true);
    const res = await createTimesheet(form);
    setSubmitting(false);
    if (res.success) {
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      loadAll();
    }
  };

  const handleStatus = async (id: string, status: string) => {
    await updateTimesheetStatus(id, status);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const res = await deleteTimesheet(id);
    if (res.success) loadAll();
  };

  const totalHours = timesheets.reduce((sum, t) => sum + parseFloat(t.hours || "0"), 0);
  const billableHours = timesheets.filter((t) => t.billable).reduce((sum, t) => sum + parseFloat(t.hours || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">Timesheets</h1>
          <p className="text-nexabook-500 mt-1">Track time spent on projects and tasks</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Log Time
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock, color: "text-blue-600" },
          { label: "Billable Hours", value: billableHours.toFixed(1), icon: CheckCircle2, color: "text-green-600" },
          { label: "Entries", value: timesheets.length, icon: FileText, color: "text-nexabook-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
              <div>
                <p className="text-2xl font-bold text-nexabook-900">{s.value}</p>
                <p className="text-xs text-nexabook-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timesheet List */}
      <Card>
        <CardHeader><CardTitle>Time Entries ({timesheets.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-nexabook-400" /></div>
          ) : timesheets.length === 0 ? (
            <div className="text-center py-12 text-nexabook-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No timesheet entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-nexabook-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">Hours</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0 hover:bg-nexabook-50"
                    >
                      <td className="py-3 text-nexabook-900">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-nexabook-400" />
                          {new Date(t.date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3">{t.projectId ? projects.find((p) => p.id === t.projectId)?.name || "—" : "—"}</td>
                      <td className="py-3 font-medium">{t.hours}h</td>
                      <td className="py-3 text-nexabook-500 max-w-[200px] truncate">{t.description || "—"}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={STATUS_STYLES[t.status]}>{t.status}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {t.status === "draft" && (
                            <>
                              <button onClick={() => handleStatus(t.id, "submitted")} className="p-1.5 hover:bg-blue-50 rounded" title="Submit">
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                              </button>
                              <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </button>
                            </>
                          )}
                          {t.status === "submitted" && (
                            <>
                              <button onClick={() => handleStatus(t.id, "approved")} className="p-1.5 hover:bg-green-50 rounded" title="Approve">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              </button>
                              <button onClick={() => handleStatus(t.id, "rejected")} className="p-1.5 hover:bg-red-50 rounded" title="Reject">
                                <X className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Time Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hours *</Label>
                <Input type="number" step="0.5" min="0" max="24" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What did you work on?" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="billable" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} className="rounded" />
              <Label htmlFor="billable" className="mb-0">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.projectId || !form.hours} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
