"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RotateCcw, Plus, Trash2, Loader2, ArrowLeft, Save, X, Calculator } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR } from "@/lib/utils/number-format";
import { getVendors, getPurchaseInvoices, createPurchaseReturn, approvePurchaseReturn, getNextPurchaseReturnNumber, type PurchaseReturnFormData } from "@/lib/actions/purchases";
import { getProducts } from "@/lib/actions/inventory";

interface Vendor { id: string; name: string; }
interface Product { id: string; name: string; sku: string; currentStock: number | null; }
interface InvoiceItem { id: string; productId: string | null; description: string; quantity: string; unitPrice: string; lineTotal: string; }
interface ReturnItem { productId?: string; description: string; quantity: string; unitPrice: string; }

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [returnNumber, setReturnNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState<"defective" | "wrong_item" | "not_as_described" | "damaged_in_transit" | "other">("defective");
  const [reasonDetails, setReasonDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, productsRes, invoicesRes, retNumRes] = await Promise.all([getVendors(), getProducts(), getPurchaseInvoices(), getNextPurchaseReturnNumber()]);
        if (vendorsRes.success && vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
        if (productsRes.success && productsRes.data) setProducts(productsRes.data as Product[]);
        if (invoicesRes.success && invoicesRes.data) setInvoices(invoicesRes.data as any[]);
        if (retNumRes.success && retNumRes.data) setReturnNumber(retNumRes.data as string);
      } catch (error) {} finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleInvoiceSelect = useCallback((invId: string) => {
    setSelectedInvoice(invId);
    const inv = invoices.find(i => i.id === invId);
    if (inv && inv.items) {
      const returnItems: ReturnItem[] = inv.items.map((item: InvoiceItem) => ({
        productId: item.productId || undefined,
        description: item.description,
        quantity: "0",
        unitPrice: item.unitPrice,
      }));
      setItems(returnItems);
    }
    if (inv?.vendorId) setVendorId(inv.vendorId);
  }, [invoices]);

  const updateItem = (index: number, field: keyof ReturnItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); };
  const addItem = () => { setItems([...items, { productId: "", description: "", quantity: "0", unitPrice: "0" }]); };

  const lineAmounts = items.map(item => parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0"));
  const grossAmount = lineAmounts.reduce((sum, a) => sum + a, 0);

  const formatCurrency = (v: number) => formatPKR(v, 'south-asian');

  const handleSave = async (action: "save" | "approve") => {
    if (!vendorId) { alert("Please select a vendor"); return; }
    if (items.length === 0) { alert("Please add at least one item"); return; }

    setSubmitting(true);
    try {
      const data: PurchaseReturnFormData = {
        purchaseInvoiceId: selectedInvoice || undefined,
        vendorId,
        returnDate,
        reason,
        reasonDetails: reasonDetails || undefined,
        items,
        notes: notes || undefined,
      };
      const res = await createPurchaseReturn(data);
      if (res.success && res.data) {
        if (action === "approve") {
          const id = (res.data as any).id;
          const ar = await approvePurchaseReturn(id);
          if (!ar.success) { alert(`Created but approval failed: ${(ar as any).error}`); router.push("/purchases/returns"); return; }
          alert("Return created and approved - stock reduced!");
        } else {
          alert("Purchase return created (pending approval)");
        }
        router.push("/purchases/returns");
      } else alert(res.error || "Failed");
    } catch (error) { alert("Failed to create return"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/purchases/returns"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-600" />Purchase Return</h1></div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm font-mono bg-orange-50 text-orange-700 border-orange-200 px-3 py-1">{returnNumber}</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">PENDING</Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Vendor*</Label><Select value={vendorId} onValueChange={setVendorId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Linked Invoice</Label><Select value={selectedInvoice} onValueChange={handleInvoiceSelect}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select invoice (optional)" /></SelectTrigger><SelectContent>{invoices.filter(inv => !vendorId || (inv as any).vendorId === vendorId).map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.billNumber}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Return Date*</Label><Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reason*</Label><Select value={reason} onValueChange={v => setReason(v as any)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="defective">Defective</SelectItem><SelectItem value="wrong_item">Wrong Item</SelectItem><SelectItem value="not_as_described">Not as Described</SelectItem><SelectItem value="damaged_in_transit">Damaged in Transit</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reason Details</Label><Textarea value={reasonDetails} onChange={e => setReasonDetails(e.target.value)} className="min-h-[50px] text-xs" placeholder="Additional details about the return reason..." /></div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-4 flex items-center">Product / Description</div>
              <div className="col-span-2 flex items-center">Return Qty</div>
              <div className="col-span-2 flex items-center">Unit Price</div>
              <div className="col-span-2 flex items-center">Line Total</div>
              <div className="col-span-2 text-center">Action</div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {items.map((item, i) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 transition-colors group">
                    <div className="col-span-4">
                      <Select value={item.productId || ""} onValueChange={(v) => updateItem(i, "productId", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id} className="text-xs"><div>{p.name} <span className="text-gray-500">(Stock: {p.currentStock || 0})</span></div></SelectItem>)}</SelectContent>
                      </Select>
                      <Textarea value={item.description} onChange={e => updateItem(i, "description", e.target.value)} className="h-10 mt-1 text-xs resize-none" placeholder="Description" />
                    </div>
                    <div className="col-span-2 flex items-center"><Input type="number" min="0" step="1" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2 flex items-center"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(i, "unitPrice", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2 flex items-center"><div className="h-8 px-2 flex items-center bg-gray-50 rounded border border-gray-200 w-full"><span className="text-xs font-semibold">{formatCurrency(lineAmounts[i])}</span></div></div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      {items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-gray-200"><Button onClick={addItem} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600"><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button></div>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Return Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Items</span><span className="text-sm font-semibold">{items.length}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Qty</span><span className="text-sm font-semibold">{items.reduce((s, i) => s + parseFloat(i.quantity || "0"), 0)}</span></div>
              <div className="flex justify-between py-3 bg-orange-50 px-3 rounded-lg border border-orange-200 mt-3">
                <span className="text-sm font-bold text-orange-900">Net Amount</span>
                <span className="text-xl font-bold text-orange-900">{formatCurrency(grossAmount)}</span>
              </div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-10" disabled={submitting} onClick={() => handleSave("approve")}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Save className="mr-2 h-4 w-4" />Approve & Process Return</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => handleSave("save")}>Save as Pending</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/purchases/returns")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}