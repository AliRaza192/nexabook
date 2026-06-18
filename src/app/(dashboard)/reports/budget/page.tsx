"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getBudgetVsActual, setBudget, getBudgets } from "@/lib/actions/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { BarChart3, Save, Loader2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function BudgetPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear()}`);
  const [showDialog, setShowDialog] = useState(false);
  const [editAccount, setEditAccount] = useState("");
  const [editMonth, setEditMonth] = useState("1");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [fiscalYear]);

  const load = async () => {
    setLoading(true);
    const [res] = await Promise.all([getBudgetVsActual(fiscalYear)]);
    if (res.success) setData(res.data || []);
    setLoading(false);
  };

  const openAdd = async () => {
    const res = await getBudgets(fiscalYear);
    if (res.success && res.data) {
    }
    setEditAccount("");
    setEditMonth("1");
    setEditAmount("");
    setEditNotes("");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!editAccount || !editAmount) return;
    setSaving(true);
    await setBudget({ fiscalYear, accountId: editAccount, month: parseInt(editMonth), budgetedAmount: editAmount, notes: editNotes });
    setSaving(false);
    setShowDialog(false);
    load();
  };

  const totalBudgeted = data.reduce((s, r) => s + r.totalBudgeted, 0);
  const totalActual = data.reduce((s, r) => s + r.totalActual, 0);
  const totalVariance = totalActual - totalBudgeted;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-nexabook-600" />
            Budget vs Actual
          </h1>
          <p className="text-nexabook-500 text-sm mt-1">Compare budgeted amounts with actual financial performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={`${y}`}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAdd} className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Budget
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <p className="text-sm text-nexabook-500">Total Budgeted</p>
            <p className="text-2xl font-bold text-nexabook-900 mt-1">{formatPKR(totalBudgeted)}</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <p className="text-sm text-nexabook-500">Total Actual</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatPKR(totalActual)}</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-5">
            <p className="text-sm text-nexabook-500">Variance</p>
            <p className={`text-2xl font-bold mt-1 flex items-center gap-1 ${totalVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {formatPKR(Math.abs(totalVariance))}
              <span className="text-sm font-normal">{totalVariance >= 0 ? "Favourable" : "Unfavourable"}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account-wise table */}
      <Card className="enterprise-card">
        <CardHeader className="pb-3 border-b border-nexabook-50">
          <CardTitle className="text-base font-semibold text-nexabook-900">Account Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-nexabook-400" /></div>
          ) : data.length === 0 ? (
            <div className="text-center py-10 text-nexabook-400 text-sm">
              No budgets set for {fiscalYear}. Click "Add Budget" to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-nexabook-50 border-b border-nexabook-200">
                    <th className="py-3 px-4 text-left font-semibold text-nexabook-700">Account</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="py-3 px-2 text-right font-semibold text-nexabook-700 text-xs">{m}</th>
                    ))}
                    <th className="py-3 px-3 text-right font-semibold text-nexabook-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <motion.tr
                      key={row.accountId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50"
                    >
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-nexabook-900 text-xs">{row.accountCode}</p>
                        <p className="text-xs text-nexabook-500">{row.accountName}</p>
                      </td>
                      {row.months.map((m: any) => (
                        <td key={m.month} className="py-2.5 px-2 text-right">
                          <div className="space-y-0.5">
                            <p className="text-xs text-nexabook-400">B: {formatPKR(m.budgeted)}</p>
                            <p className="text-xs text-nexabook-700">A: {formatPKR(m.actual)}</p>
                            <p className={`text-[10px] ${m.variance >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {m.variance >= 0 ? "+" : ""}{formatPKR(m.variance)}
                            </p>
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-right">
                        <p className="text-xs text-nexabook-500">B: {formatPKR(row.totalBudgeted)}</p>
                        <p className="text-xs font-semibold text-nexabook-700">A: {formatPKR(row.totalActual)}</p>
                        <p className={`text-xs font-bold ${row.totalVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {row.totalVariance >= 0 ? "+" : ""}{formatPKR(row.totalVariance)}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Budget Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-nexabook-600" />
              Set Budget — {fiscalYear}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Account</Label>
              <Select value={editAccount} onValueChange={setEditAccount}>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {data.map((r: any) => (
                    <SelectItem key={r.accountId} value={r.accountId}>
                      {r.accountCode} — {r.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={editMonth} onValueChange={setEditMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={`${i + 1}`}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Budgeted Amount (Rs.)</Label>
              <Input type="number" step="0.01" value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Reason for budget" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !editAccount || !editAmount}
              className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
