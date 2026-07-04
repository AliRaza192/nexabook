"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Trash2, Package, CheckCircle, Clock, FileText } from "lucide-react";
import {
  getProductsForStockAdjustment, addStockAdjustment, approveStockAdjustment, getStockAdjustments, getStockAdjustmentById,
  type StockAdjustmentFormData,
} from "@/lib/actions/inventory-depth";

export default function StockAdjustmentPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lines, setLines] = useState<{ productId: string; adjustedQuantity: string; notes?: string }[]>([]);
  const [selectedAdjustment, setSelectedAdjustment] = useState<string | null>(null);
  const [adjustmentDetail, setAdjustmentDetail] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const [prodRes, adjRes] = await Promise.all([
      getProductsForStockAdjustment(),
      getStockAdjustments(),
    ]);
    if (prodRes.success) setProducts(prodRes.data || []);
    if (adjRes.success) setAdjustments(adjRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const addLine = () => setLines([...lines, { productId: "", adjustedQuantity: "", notes: "" }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (formData: FormData) => {
    if (lines.length === 0) return alert("Add at least one line item");
    setSubmitting(true);
    const data: StockAdjustmentFormData = {
      adjustmentDate: formData.get("adjustmentDate") as string,
      reason: formData.get("reason") as any,
      notes: formData.get("notes") as string,
      lines,
    };
    const res = await addStockAdjustment(data);
    if (res.success) { setLines([]); loadData(); }
    setSubmitting(false);
  };

  const handleApprove = async (id: string) => {
    const res = await approveStockAdjustment(id);
    if (res.success) loadData();
  };

  const viewAdjustment = async (id: string) => {
    setSelectedAdjustment(id);
    const res = await getStockAdjustmentById(id);
    if (res.success) setAdjustmentDetail(res.data);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-nexabook-900">Stock Adjustment</h1>
        <p className="text-nexabook-600 mt-1">Manually adjust stock levels with reasons</p>
      </motion.div>

      {/* Adjustment Form */}
      <Card>
        <CardHeader><CardTitle>New Stock Adjustment</CardTitle><CardDescription>Adjust stock levels for damage, gifts, corrections, etc.</CardDescription></CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Adjustment Date*</Label><Input name="adjustmentDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
              <div className="space-y-2"><Label>Reason*</Label>
                <select name="reason" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                  <option value="damage">Damage</option><option value="gift">Gift</option><option value="correction">Correction</option>
                  <option value="expired">Expired</option><option value="lost">Lost</option><option value="found">Found</option>
                  <option value="sample">Sample</option>
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products to Adjust</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Product</Button>
              </div>

              {lines.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 text-nexabook-300" />
                  <p className="text-nexabook-500">No products added. Click "Add Product" to begin.</p>
                </div>
              )}

              {lines.map((line, idx) => {
                const product = products.find(p => p.id === line.productId);
                const currentStock = product?.currentStock || 0;
                const newStock = parseFloat(line.adjustedQuantity || "0");
                const diff = newStock - currentStock;

                return (
                  <div key={idx} className="grid grid-cols-12 gap-3 p-4 border rounded-lg bg-nexabook-50/50">
                    <div className="col-span-3 space-y-1"><Label className="text-xs">Product*</Label>
                      <select value={line.productId} onChange={e => updateLine(idx, "productId", e.target.value)} className="w-full rounded-md border border-nexabook-200 px-2 py-1.5 text-sm" required>
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Stock: {p.currentStock || 0}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Current Stock</Label>
                      <Input value={currentStock} disabled className="text-sm bg-nexabook-100" />
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">New Stock*</Label>
                      <Input value={line.adjustedQuantity} onChange={e => updateLine(idx, "adjustedQuantity", e.target.value)} type="number" step="0.01" className="text-sm" placeholder="Enter new qty" required />
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Difference</Label>
                      <Input value={line.adjustedQuantity ? `${diff > 0 ? "+" : ""}${diff}` : "-"} disabled className={`text-sm font-semibold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`} />
                    </div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Notes</Label>
                      <Input value={line.notes || ""} onChange={e => updateLine(idx, "notes", e.target.value)} className="text-sm" placeholder="Optional" />
                    </div>
                    <div className="col-span-1 flex items-end"><Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2"><Label>Overall Notes</Label><Textarea name="notes" rows={2} placeholder="Reason for adjustment..." /></div>
            <DialogFooter>
              <Button type="submit" disabled={submitting || lines.length === 0} className="bg-nexabook-900 hover:bg-nexabook-800">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Submit for Approval"}
              </Button>
            </DialogFooter>
          </form>
        </CardContent>
      </Card>

      {/* Recent Adjustments */}
      <Card>
        <CardHeader><CardTitle>Recent Adjustments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Adjustment #</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {adjustments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-nexabook-500">No adjustments yet</TableCell></TableRow> :
                adjustments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.adjustmentNumber}</TableCell>
                    <TableCell>{new Date(a.adjustmentDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">{a.reason}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={a.approvalStatus === "approved" ? "default" : "outline"} className="gap-1">
                        {a.approvalStatus === "approved" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {a.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => viewAdjustment(a.id)}>View</Button>
                        {a.approvalStatus !== "approved" && <Button size="sm" onClick={() => handleApprove(a.id)}>Approve</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAdjustment} onOpenChange={() => { setSelectedAdjustment(null); setAdjustmentDetail(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Adjustment Details</DialogTitle></DialogHeader>
          {adjustmentDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-sm text-nexabook-600">Adjustment #</p><p className="font-semibold">{adjustmentDetail.adjustmentNumber}</p></div>
                <div><p className="text-sm text-nexabook-600">Date</p><p>{new Date(adjustmentDetail.adjustmentDate).toLocaleDateString()}</p></div>
                <div><p className="text-sm text-nexabook-600">Reason</p><Badge variant="outline">{adjustmentDetail.reason}</Badge></div>
              </div>
              {adjustmentDetail.notes && <div><p className="text-sm text-nexabook-600">Notes</p><p>{adjustmentDetail.notes}</p></div>}
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Current</TableHead><TableHead>New</TableHead><TableHead>Difference</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  {adjustmentDetail.lines?.map((line: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell><div className="font-medium">{line.productName}</div><p className="text-xs text-nexabook-500">{line.productSku}</p></TableCell>
                      <TableCell>{parseFloat(line.currentStock || "0").toLocaleString()}</TableCell>
                      <TableCell>{parseFloat(line.adjustedQuantity || "0").toLocaleString()}</TableCell>
                      <TableCell className={`font-semibold ${parseFloat(line.difference || "0") > 0 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(line.difference || "0") > 0 ? "+" : ""}{parseFloat(line.difference || "0").toLocaleString()}
                      </TableCell>
                      <TableCell>Rs. {parseFloat(line.totalValue || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
