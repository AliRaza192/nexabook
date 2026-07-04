"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, FileText, ArrowUpCircle, ArrowDownCircle, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import {
  getCreditDebitNotes, addCreditDebitNote, approveCreditDebitNote,
  getCustomersForDropdown, getVendorsForDropdown, getProductsForDropdown,
  type CreditDebitNoteFormData,
} from "@/lib/actions/adjustments";

export default function CreditDebitNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteType, setNoteType] = useState<"credit_note" | "debit_note">("credit_note");
  const [lines, setLines] = useState([{ productId: "", description: "", quantity: "1", unitPrice: "0", taxRate: "0" }]);

  const loadData = async () => {
    setLoading(true);
    const [notesRes, custRes, vendRes, prodRes] = await Promise.all([
      getCreditDebitNotes(searchQuery),
      getCustomersForDropdown(),
      getVendorsForDropdown(),
      getProductsForDropdown(),
    ]);
    if (notesRes.success) setNotes(notesRes.data || []);
    if (custRes.success) setCustomers(custRes.data || []);
    if (vendRes.success) setVendors(vendRes.data || []);
    if (prodRes.success) setProducts(prodRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [searchQuery]);

  const addLine = () => setLines([...lines, { productId: "", description: "", quantity: "1", unitPrice: "0", taxRate: "0" }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    const data: CreditDebitNoteFormData = {
      noteType,
      customerId: formData.get("customerId") as string || undefined,
      vendorId: formData.get("vendorId") as string || undefined,
      issueDate: formData.get("issueDate") as string,
      reason: formData.get("reason") as string,
      notes: formData.get("notes") as string,
      lines,
    };
    const res = await addCreditDebitNote(data);
    if (res.success) { setDialogOpen(false); setLines([{ productId: "", description: "", quantity: "1", unitPrice: "0", taxRate: "0" }]); loadData(); }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, icon: any }> = {
      approved: { variant: "default", label: "Approved", icon: CheckCircle },
      pending_approval: { variant: "outline", label: "Pending", icon: Clock },
      rejected: { variant: "destructive", label: "Rejected", icon: XCircle },
    };
    const c = config[status] || config.pending_approval;
    const Icon = c.icon;
    return <Badge variant={c.variant} className="gap-1"><Icon className="h-3 w-3" />{c.label}</Badge>;
  };

  if (loading && !notes.length) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Credit & Debit Notes</h1>
            <p className="text-nexabook-600 mt-1">Create and manage adjustment notes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-64" />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800"><Plus className="h-4 w-4 mr-2" />New Note</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{noteType === "credit_note" ? "Credit" : "Debit"} Note Builder</DialogTitle><DialogDescription>Create adjustment note</DialogDescription></DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                  <div className="flex gap-4">
                    <Button type="button" variant={noteType === "credit_note" ? "default" : "outline"} onClick={() => setNoteType("credit_note")} className={noteType === "credit_note" ? "bg-green-600" : ""}>Credit Note</Button>
                    <Button type="button" variant={noteType === "debit_note" ? "default" : "outline"} onClick={() => setNoteType("debit_note")} className={noteType === "debit_note" ? "bg-red-600" : ""}>Debit Note</Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Customer</Label>
                      <select name="customerId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                        <option value="">Select Customer</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Vendor</Label>
                      <select name="vendorId" className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                        <option value="">Select Vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Issue Date*</Label><Input name="issueDate" type="date" required /></div>
                    <div className="space-y-2"><Label>Reason</Label><Input name="reason" /></div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Line Items</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
                    </div>
                    {lines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Product</Label>
                          <select value={line.productId} onChange={e => updateLine(idx, "productId", e.target.value)} className="w-full rounded-md border border-nexabook-200 px-2 py-1.5 text-sm">
                            <option value="">Select</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Description</Label><Input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} className="text-sm" /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Qty</Label><Input value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)} type="number" step="0.01" className="text-sm" /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Price</Label><Input value={line.unitPrice} onChange={e => updateLine(idx, "unitPrice", e.target.value)} type="number" step="0.01" className="text-sm" /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">Tax %</Label><Input value={line.taxRate} onChange={e => updateLine(idx, "taxRate", e.target.value)} type="number" step="0.01" className="text-sm" /></div>
                        <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Submit for Approval"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Note #</TableHead><TableHead>Type</TableHead><TableHead>Party</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {notes.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-nexabook-500">No notes found</TableCell></TableRow> :
                notes.map(note => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.noteNumber}</TableCell>
                    <TableCell>
                      <Badge variant={note.noteType === "credit_note" ? "default" : "destructive"} className={note.noteType === "credit_note" ? "bg-green-600" : ""}>
                        {note.noteType === "credit_note" ? <ArrowUpCircle className="h-3 w-3 mr-1" /> : <ArrowDownCircle className="h-3 w-3 mr-1" />}
                        {note.noteType === "credit_note" ? "Credit" : "Debit"}
                      </Badge>
                    </TableCell>
                    <TableCell>{note.customerId ? customers.find(c => c.id === note.customerId)?.name : vendors.find(v => v.id === note.vendorId)?.name || "-"}</TableCell>
                    <TableCell>{new Date(note.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">Rs. {parseFloat(note.amount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">Rs. {parseFloat(note.netAmount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(note.approvalStatus)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
