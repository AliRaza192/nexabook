"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Lock, Unlock, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getFiscalPeriods, createFiscalPeriod, togglePeriodLock, deleteFiscalPeriod } from "@/lib/actions/fiscal-periods";

export default function FiscalPeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });

  const loadPeriods = async () => {
    setLoading(true);
    const result = await getFiscalPeriods();
    if (result.success) setPeriods(result.data || []);
    setLoading(false);
  };

  useEffect(() => { loadPeriods(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) return;
    const result = await createFiscalPeriod(form);
    if (result.success) {
      toast.success("Fiscal period created");
      setOpen(false);
      setForm({ name: "", startDate: "", endDate: "" });
      loadPeriods();
    } else {
      toast.error(result.error);
    }
  };

  const handleLock = async (id: string, locked: boolean) => {
    const result = await togglePeriodLock(id, !locked);
    if (result.success) {
      toast.success(locked ? "Period unlocked" : "Period locked");
      loadPeriods();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteFiscalPeriod(id);
    if (result.success) {
      toast.success("Period deleted");
      loadPeriods();
    } else {
      toast.error(result.error);
    }
  };

  const isLocked = (p: any) => p.isLocked;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">Fiscal Periods</h1>
          <p className="text-sm text-nexabook-500 mt-1">Manage fiscal periods and lock closed periods</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fiscal Period</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Period Name</Label>
                <Input
                  placeholder="e.g. FY 2025 Q1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>Create Period</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
        </div>
      ) : periods.length === 0 ? (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-nexabook-400 mb-4" />
            <p className="text-nexabook-600">No fiscal periods created yet</p>
            <p className="text-sm text-nexabook-500 mt-1">Create periods to enable prior-period locking</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {periods.map((period, index) => (
            <motion.div
              key={period.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`enterprise-card ${isLocked(period) ? 'border-amber-300 bg-amber-50/30' : ''}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isLocked(period) ? 'bg-amber-100' : 'bg-green-100'}`}>
                      {isLocked(period)
                        ? <Lock className="h-5 w-5 text-amber-600" />
                        : <Unlock className="h-5 w-5 text-green-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-nexabook-900">{period.name}</p>
                      <p className="text-sm text-nexabook-500">
                        {new Date(period.startDate).toLocaleDateString()} — {new Date(period.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isLocked(period) ? "destructive" : "secondary"}>
                      {isLocked(period) ? "Locked" : "Open"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLock(period.id, isLocked(period))}
                    >
                      {isLocked(period) ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(period.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
