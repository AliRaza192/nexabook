"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Edit, Trash2, Loader2, Check, X,
  Calendar, Clock, User as UserIcon, AlertCircle, Flag,
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
  getProject, getTasks, createTask, updateTask, deleteTask, updateProject,
} from "@/lib/actions/projects";

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  low: <Flag className="h-3.5 w-3.5 text-gray-400" />,
  medium: <Flag className="h-3.5 w-3.5 text-blue-500" />,
  high: <Flag className="h-3.5 w-3.5 text-amber-500" />,
  urgent: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
};

const INITIAL_TASK = { title: "", description: "", assigneeId: "", priority: "medium", dueDate: "", estimatedHours: "" };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [taskForm, setTaskForm] = useState(INITIAL_TASK);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (id) loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    const [pRes, tRes] = await Promise.all([getProject(id), getTasks(id)]);
    if (pRes.success) setProject(pRes.data);
    if (tRes.success) setTasks(tRes.data);
    setLoading(false);
  };

  const openTaskCreate = () => {
    setEditingTask(null);
    setTaskForm(INITIAL_TASK);
    setTaskDialog(true);
  };

  const openTaskEdit = (t: any) => {
    setEditingTask(t);
    setTaskForm({
      title: t.title, description: t.description || "",
      assigneeId: t.assigneeId || "", priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
      estimatedHours: t.estimatedHours,
    });
    setTaskDialog(true);
  };

  const handleTaskSubmit = async () => {
    if (!taskForm.title.trim()) return;
    setSubmitting(true);
    const payload = { ...taskForm, projectId: id };
    const res = editingTask
      ? await updateTask(editingTask.id, payload)
      : await createTask(payload);
    setSubmitting(false);
    if (res.success) {
      setTaskDialog(false);
      loadAll();
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    const res = await deleteTask(taskId);
    if (res.success) loadAll();
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    await updateTask(taskId, { status });
    loadAll();
  };

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-nexabook-400" /></div>
  );
  if (!project) return <div className="py-20 text-center text-nexabook-400">Project not found</div>;

  const taskCounts = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-nexabook-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-nexabook-900">{project.name}</h1>
            <Badge variant="outline" className={STATUS_STYLES[project.status] || ""}>{project.status.replace("_", " ")}</Badge>
          </div>
          {project.code && <p className="text-sm text-nexabook-400">{project.code}</p>}
        </div>
        <Button onClick={openTaskCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </div>

      {project.description && (
        <Card><CardContent className="p-4 text-sm text-nexabook-600">{project.description}</CardContent></Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", value: taskCounts.total, color: "text-nexabook-900" },
          { label: "To Do", value: taskCounts.todo, color: "text-gray-500" },
          { label: "In Progress", value: taskCounts.in_progress, color: "text-blue-600" },
          { label: "Done", value: taskCounts.done, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold {s.color}">{s.value}</p>
              <p className="text-xs text-nexabook-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader><CardTitle>Tasks ({tasks.length})</CardTitle></CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-nexabook-400">No tasks yet. Add your first task!</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <motion.div key={t.id} layout className="flex items-center gap-3 p-3 rounded-lg border hover:bg-nexabook-50 transition-colors">
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    className="text-xs border rounded px-1.5 py-1 bg-white"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {PRIORITY_ICONS[t.priority]}
                      <span className={`text-sm font-medium ${t.status === "done" ? "line-through text-nexabook-400" : "text-nexabook-900"}`}>
                        {t.title}
                      </span>
                    </div>
                    {t.description && <p className="text-xs text-nexabook-400 mt-0.5 line-clamp-1">{t.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-nexabook-400">
                      {t.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(t.dueDate).toLocaleDateString()}</span>}
                      {t.estimatedHours && parseFloat(t.estimatedHours) > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.estimatedHours}h</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openTaskEdit(t)} className="p-1.5 hover:bg-nexabook-100 rounded"><Edit className="h-3.5 w-3.5 text-nexabook-400" /></button>
                    <button onClick={() => handleTaskDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Est. Hours</Label>
              <Input type="number" value={taskForm.estimatedHours} onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(false)}>Cancel</Button>
            <Button onClick={handleTaskSubmit} disabled={submitting || !taskForm.title.trim()} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
