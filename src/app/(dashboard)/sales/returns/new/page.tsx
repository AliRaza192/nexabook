"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RotateCcw, Plus, Trash2, Loader2, ArrowLeft, Calculator, Save, X, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomers, createSalesReturn, approveSalesReturn, getInvoices, type SalesReturnFormData } from "@/lib/actions/sales";
import { getProducts } from "@/lib/actions/inventory";

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; salePrice: string | null; description: string | null; }

const reasons = [
  { value: "defective", label: "Defective" }, { value: "wrong_item", label: "Wrong Item" },
  { value: "not_as_described", label: "Not as Described" }, { value: "customer_request", label: "Customer Request" },
  { value: "damaged_in_transit", label: "Damaged in Transit" }, { value: "other", label: "Other" }
];

export default function NewReturnPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState<"defective" | "wrong_item" | "not_as_described" | "customer_request" | "damaged_in_transit" | "other">("customer_request");
  const [reasonDetails, setReasonDetails] = useState("");
  const [notes, setNotes] = useState("");

  const [lineItems, setLineItems] = useState<Array<{ productId: string; description: string; quantity: string; unitPrice: string }>>([
    { productId: "", description: "", quantity: "1", unitPrice: "0" }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, pRes, iRes] = await Promise.all([getCustomers(), getProducts(), getInvoices()]);
        if (cRes.success && cRes.data) setCustomers(cRes.data as Customer[]);
        if (pRes.success && pRes.data) setProducts(pRes.data as Product[]);
        if (iRes.success && iRes.data) setInvoices(iRes.data as any[]);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const loadInvoiceItems = async (invId: string) => {
    if (!invId) return;
    const { getInvoiceById } = await import("@/lib/actions/sales");
    const res = await getInvoiceById(invId);
    if (res.success && (res.data as any)?.items) {
      const items = (res.data as any).items;
      setLineItems(items.map((it: any) => ({ productId: it.productId || "", description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })));
      if ((res.data as any)?.customerId) setCustomerId((res.data as any).customerId);
    }
  };

  const updateLineItem = useCallback((index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "productId") { const p = products.find(pr => pr.id === value); if (p) { updated[index].description = p.description || p.name; updated[index].unitPrice = p.salePrice || "0"; } }
    setLineItems(updated);
  }, [lineItems, products]);

  const addLine = () => setLineItems([...lineItems, { productId: "", description: "", quantity: "1", unitPrice: "0" }]);
  const removeLine = (i: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, idx) => idx !== i)); };

  const grossAmount = lineItems.reduce((s, item) => s + (parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0")), 0);
  const formatCurrency = (v: number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2 }).format(v);

  const handleSave = async (approve: boolean) => {
    if (!customerId) { alert("Please select a customer"); return; }
    setSubmitting(true);
    try {
      const data: SalesReturnFormData = {
        customerId, invoiceId: invoiceId || undefined, returnDate, reason,
        reasonDetails: reasonDetails || undefined, notes: notes || undefined,
        items: lineItems.map(it => ({ productId: it.productId, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice }))
      };
      const res = await createSalesReturn(data);
      if (res.success) {
        const returnId = (res.data as any)?.id;
        if (approve && returnId) {
          const ar = await approveSalesReturn(returnId);
          if (ar.success) { alert("Return created and approved - stock reversed"); router.push("/sales/returns"); return; }
          else alert("Created but approval failed: " + ar.error);
        } else {
          alert("Sales return created (pending approval)");
        }
        router.push("/sales/returns");
      } else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/sales/returns"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-blue-600" />New Sales Return</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Customer*</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Linked Invoice</Label><Select value={invoiceId} onValueChange={v => { setInvoiceId(v); loadInvoiceItems(v); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoiceNumber}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Return Date*</Label><Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reason*</Label><Select value={reason} onValueChange={v => setReason(v as any)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent>{reasons.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reason Details</Label><Textarea value={reasonDetails} onChange={e => setReasonDetails(e.target.value)} placeholder="Explain the reason..." className="min-h-[50px] text-xs" /></div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3">Product</div><div className="col-span-3">Description</div><div className="col-span-2">Return Qty</div><div className="col-span-2">Unit Price</div><div className="col-span-2">Line Total</div>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {lineItems.map((item, i) => {
                const lineTotal = parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0");
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 group">
                    <div className="col-span-3"><Select value={item.productId} onValueChange={v => updateLineItem(i, "productId", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="col-span-3"><Input value={item.description} onChange={e => updateLineItem(i, "description", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Input type="number" min="0" value={item.quantity} onChange={e => updateLineItem(i, "quantity", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(i, "unitPrice", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2 flex items-center"><span className="text-xs font-semibold">{formatCurrency(lineTotal)}</span></div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-gray-200"><Button onClick={addLine} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2"><Plus className="h-3.5 w-3.5 mr-1" />Add Line</Button></div>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Return Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Gross Amount</span><span className="text-sm font-semibold">{formatCurrency(grossAmount)}</span></div>
              <div className="flex justify-between py-3 bg-red-50 px-3 rounded-lg border border-red-200 mt-3"><span className="text-sm font-bold text-red-900">Refund Amount</span><span className="text-xl font-bold text-red-900">{formatCurrency(grossAmount)}</span></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-10" disabled={submitting} onClick={() => handleSave(true)}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><CheckCircle className="mr-2 h-4 w-4" />Approve & Process Return</>}</Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" disabled={submitting} onClick={() => handleSave(false)}><Save className="mr-2 h-4 w-4" />Save as Pending</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/sales/returns")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
