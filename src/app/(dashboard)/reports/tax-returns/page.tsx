"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, FileText, Send, Plus, Trash2, Download, AlertCircle, CheckCircle2, Clock, Calculator } from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";
import { generateTaxReturn, submitTaxReturn, getTaxReturns, deleteTaxReturn } from "@/lib/actions/tax-returns";

export default function TaxReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [period, setPeriod] = useState((new Date().getMonth() + 1).toString());
  const [returnType, setReturnType] = useState<"monthly" | "quarterly">("monthly");
  const [showGenerate, setShowGenerate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadReturns = async () => {
    setLoading(true);
    const result = await getTaxReturns();
    if (result.success) setReturns(result.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    await generateTaxReturn(parseInt(year), parseInt(period), returnType);
    setGenerating(false);
    setShowGenerate(false);
    loadReturns();
  };

  const handleSubmit = async (returnId: string) => {
    setSubmitting(returnId);
    await submitTaxReturn(returnId);
    setSubmitting(null);
    loadReturns();
  };

  const handleDelete = async (returnId: string) => {
    await deleteTaxReturn(returnId);
    setDeleteConfirm(null);
    loadReturns();
  };

  const fmt = (val: string) => formatPKR(parseFloat(val), 'south-asian');

  const statusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case "calculated": return <Badge className="bg-blue-100 text-blue-800 text-xs"><Calculator className="h-3 w-3 mr-1" />Calculated</Badge>;
      case "submitted": return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Submitted</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Sales Tax Returns</h1>
            <p className="text-nexabook-600 mt-1">Generate, review, and file sales tax returns with FBR</p>
          </div>
          <Button onClick={() => setShowGenerate(true)} className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="h-4 w-4 mr-2" />Generate Return
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Return History</CardTitle>
          <CardDescription>All generated sales tax returns for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-nexabook-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-nexabook-700">No tax returns yet</h3>
              <p className="text-sm text-nexabook-500 mt-1">Generate your first sales tax return to get started</p>
              <Button onClick={() => setShowGenerate(true)} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />Generate Return
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Output Tax</TableHead>
                  <TableHead className="text-right">Input Tax</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.periodLabel}</TableCell>
                    <TableCell className="capitalize text-xs">{r.returnType}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.totalSales)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-blue-700">{fmt(r.totalOutputTax)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-amber-700">{fmt(r.totalInputTax)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-semibold ${parseFloat(r.netPayable) >= 0 ? "text-red-700" : "text-green-700"}`}>
                      {fmt(r.netPayable)}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-nexabook-500">
                      {new Date(r.createdAt).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "calculated" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSubmit(r.id)}
                            disabled={submitting === r.id}
                          >
                            {submitting === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 text-blue-600" />
                            )}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/api/tax-returns/${r.id}/pdf`} target="_blank">
                            <Download className="h-4 w-4 text-nexabook-600" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(r.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Tax Return</DialogTitle>
            <DialogDescription>Select the period for which you want to generate a sales tax return</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Return Type</label>
              <Select value={returnType} onValueChange={(v) => setReturnType(v as "monthly" | "quarterly")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {returnType === "monthly" ? "Month" : "Quarter"}
              </label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {returnType === "monthly"
                    ? Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {new Date(2000, i, 1).toLocaleString("default", { month: "long" })}
                        </SelectItem>
                      ))
                    : [1, 2, 3, 4].map((q) => (
                        <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            <AlertCircle className="h-4 w-4 text-nexabook-400 inline" />
            <span className="text-xs text-nexabook-500 ml-1">
              Tax will be auto-calculated from approved invoices in this period
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-nexabook-900 hover:bg-nexabook-800">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
              {generating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tax Return</DialogTitle>
            <DialogDescription>Are you sure you want to delete this tax return? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
