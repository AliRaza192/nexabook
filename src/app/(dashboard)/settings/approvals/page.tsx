"use client";

import { useState, useEffect } from "react";
import { getWorkflows, createWorkflow, deleteWorkflow } from "@/lib/actions/approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Settings2 } from "lucide-react";

export default function ApprovalWorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", entityType: "invoice", minAmount: "0",
    maxAmount: "", approverRole: "manager", orderIndex: 1,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await getWorkflows();
    if (res.success) setWorkflows(res.data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    await createWorkflow(form);
    setSaving(false);
    setShowNew(false);
    setForm({ name: "", entityType: "invoice", minAmount: "0", maxAmount: "", approverRole: "manager", orderIndex: 1 });
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteWorkflow(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-nexabook-600" />
            Approval Workflows
          </h1>
          <p className="text-nexabook-500 text-sm mt-1">Configure multi-level approval rules for documents</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> New Rule
        </Button>
      </div>

      <Card className="enterprise-card">
        <CardHeader className="pb-3 border-b border-nexabook-50">
          <CardTitle className="text-base font-semibold text-nexabook-900">Approval Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-nexabook-400" /></div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-10 text-nexabook-400 text-sm">No approval rules configured</div>
          ) : (
            <div className="divide-y divide-nexabook-100">
              {workflows.map((wf) => (
                <div key={wf.id} className="flex items-center justify-between px-5 py-4 hover:bg-nexabook-50">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-blue-100 text-blue-800 text-xs capitalize">{wf.entityType}</Badge>
                    <div>
                      <p className="text-sm font-medium text-nexabook-900">{wf.name}</p>
                      <p className="text-xs text-nexabook-400">
                        Amount: Rs. {parseFloat(wf.minAmount).toLocaleString()} 
                        {wf.maxAmount ? ` — Rs. ${parseFloat(wf.maxAmount).toLocaleString()}` : "+"}
                        {" | "}Approver: {wf.approverRole}
                        {" | "}Order: {wf.orderIndex}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(wf.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-nexabook-600" />
              New Approval Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Rule Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Manager approves invoices > 50k" />
            </div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={form.entityType} onValueChange={(v) => setForm({ ...form, entityType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Sales Invoice</SelectItem>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Min Amount</Label>
                <Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Max Amount (optional)</Label>
                <Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Approver Role</Label>
              <Select value={form.approverRole} onValueChange={(v) => setForm({ ...form, approverRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Input type="number" min={1} max={10} value={form.orderIndex}
                onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}
              className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
