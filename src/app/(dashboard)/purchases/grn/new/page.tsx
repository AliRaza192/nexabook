"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Plus, Trash2, Loader2, ArrowLeft, Save, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVendors, getPurchaseOrders, getPurchaseOrderById, createGRN, getNextGRNNumber, type GRNFormData } from "@/lib/actions/purchases";
import { getProducts } from "@/lib/actions/inventory";

interface Vendor { id: string; name: string; }
interface Product { id: string; name: string; sku: string; currentStock: number | null; }
interface POListItem { id: string; orderNumber: string; vendor: { id: string; name: string } | null; }
interface POItem { id: string; productId: string | null; description: string; quantity: string; unitPrice: string }
interface PO { id: string; orderNumber: string; vendorId: string; items: POItem[] }
interface GRNItem { productId: string; orderedQty: string; receivedQty: string; acceptedQty: string; rejectedQty: string; }

export default function NewGRNPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<POListItem[]>([]);
  const [fullPOs, setFullPOs] = useState<Record<string, PO>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [grnNumber, setGrnNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [selectedPO, setSelectedPO] = useState("");
  const [receivingDate, setReceivingDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<GRNItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, productsRes, posRes, grnNumRes] = await Promise.all([getVendors(), getProducts(), getPurchaseOrders(), getNextGRNNumber()]);
        if (vendorsRes.success && vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
        if (productsRes.success && productsRes.data) setProducts(productsRes.data as Product[]);
        if (posRes.success && posRes.data) {
          const poList = (posRes.data as any[]).map((po: any) => ({ id: po.id, orderNumber: po.orderNumber, vendor: po.vendor }));
          setPurchaseOrders(poList);
        }
        if (grnNumRes.success && grnNumRes.data) setGrnNumber(grnNumRes.data as string);
      } catch (error) {} finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handlePOSelect = useCallback(async (poId: string) => {
    setSelectedPO(poId);

    // Load full PO with items if not cached
    let po = fullPOs[poId];
    if (!po) {
      const res = await getPurchaseOrderById(poId);
      if (res.success && res.data) {
        po = res.data as PO;
        setFullPOs(prev => ({ ...prev, [poId]: po! }));
      }
    }

    if (po) {
      setVendorId(po.vendorId);
      const grnItems: GRNItem[] = po.items.map(item => ({
        productId: item.productId || "",
        orderedQty: item.quantity,
        receivedQty: item.quantity,
        acceptedQty: item.quantity,
        rejectedQty: "0",
      }));
      setItems(grnItems);
    }
  }, [fullPOs]);

  const updateItem = (index: number, field: keyof GRNItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Validation: received >= accepted + rejected
    const item = updated[index];
    const received = parseFloat(item.receivedQty || "0");
    const accepted = parseFloat(item.acceptedQty || "0");
    const rejected = parseFloat(item.rejectedQty || "0");
    if (accepted + rejected > received) {
      updated[index].rejectedQty = String(Math.max(0, received - accepted));
    }
    setItems(updated);
  };

  const addItem = () => { setItems([...items, { productId: "", orderedQty: "0", receivedQty: "0", acceptedQty: "0", rejectedQty: "0" }]); };
  const removeItem = (index: number) => { setItems(items.filter((_, i) => i !== index)); };

  const handleSave = async () => {
    if (!vendorId) { alert("Please select a vendor"); return; }
    if (items.length === 0) { alert("Please add at least one item"); return; }
    if (items.some(i => !i.productId || parseFloat(i.receivedQty) <= 0)) { alert("Please select products and enter valid quantities"); return; }

    setSubmitting(true);
    try {
      const data: GRNFormData = {
        purchaseOrderId: selectedPO || undefined,
        vendorId,
        receivingDate,
        reference: reference || undefined,
        items,
        notes: notes || undefined,
      };
      const res = await createGRN(data);
      if (res.success) { alert("GRN created and stock updated!"); router.push("/purchases/grn"); }
      else alert(res.error || "Failed to create GRN");
    } catch (error) { alert("Failed to create GRN"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/purchases/grn"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Package className="h-5 w-5 text-blue-600" />Good Receiving Note</h1></div>
          <Badge variant="outline" className="text-sm font-mono bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">{grnNumber}</Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Vendor*</Label><Select value={vendorId} onValueChange={setVendorId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Linked PO</Label><Select value={selectedPO} onValueChange={handlePOSelect}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select PO (optional)" /></SelectTrigger><SelectContent>{purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.orderNumber}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Receiving Date*</Label><Input type="date" value={receivingDate} onChange={e => setReceivingDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs" /></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3 flex items-center">Product</div>
              <div className="col-span-2 flex items-center">Ordered Qty</div>
              <div className="col-span-2 flex items-center">Received Qty*</div>
              <div className="col-span-2 flex items-center">Accepted Qty*</div>
              <div className="col-span-1 flex items-center">Rejected</div>
              <div className="col-span-2 text-center">Action</div>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {items.map((item, i) => {
                const product = products.find(p => p.id === item.productId);
                const received = parseFloat(item.receivedQty || "0");
                const accepted = parseFloat(item.acceptedQty || "0");
                const rejected = parseFloat(item.rejectedQty || "0");
                const isValid = accepted + rejected <= received;
                return (
                  <div key={i} className={`grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 transition-colors group ${!isValid ? 'bg-red-50' : ''}`}>
                    <div className="col-span-3">
                      <Select value={item.productId} onValueChange={(v) => updateItem(i, "productId", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id} className="text-xs"><div>{p.name} <span className="text-gray-500">({p.sku})</span></div></SelectItem>)}</SelectContent>
                      </Select>
                      {product && <p className="text-xs text-gray-500 mt-1">Stock: {product.currentStock || 0}</p>}
                    </div>
                    <div className="col-span-2 flex items-center"><Input type="number" min="0" value={item.orderedQty} readOnly className="h-8 text-xs bg-gray-50" /></div>
                    <div className="col-span-2 flex items-center"><Input type="number" min="0" step="1" value={item.receivedQty} onChange={e => updateItem(i, "receivedQty", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2 flex items-center"><Input type="number" min="0" max={item.receivedQty} step="1" value={item.acceptedQty} onChange={e => updateItem(i, "acceptedQty", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-1 flex items-center"><Input type="number" min="0" max={item.receivedQty} step="1" value={item.rejectedQty} onChange={e => updateItem(i, "rejectedQty", e.target.value)} className="h-8 text-xs" /></div>
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      {items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-gray-200">
              <Button onClick={addItem} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600"><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
            </div>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">GRN Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Items</span><span className="text-sm font-semibold">{items.length}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Received</span><span className="text-sm font-semibold">{items.reduce((s, i) => s + parseFloat(i.receivedQty || "0"), 0)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Accepted</span><span className="text-sm font-semibold text-green-600">{items.reduce((s, i) => s + parseFloat(i.acceptedQty || "0"), 0)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Total Rejected</span><span className="text-sm font-semibold text-red-600">{items.reduce((s, i) => s + parseFloat(i.rejectedQty || "0"), 0)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Stock to Add</span><span className="text-sm font-bold text-blue-600">{items.reduce((s, i) => s + parseFloat(i.acceptedQty || "0"), 0)} units</span></div>
            </div>
          </CardContent></Card>

          <Card className={`border-gray-200 shadow-sm ${items.some(i => { const r = parseFloat(i.receivedQty||"0"); const a = parseFloat(i.acceptedQty||"0"); const j = parseFloat(i.rejectedQty||"0"); return a + j > r; }) ? "border-red-300" : ""}`}>
            <CardContent className="p-4">
              {items.some(i => { const r = parseFloat(i.receivedQty||"0"); const a = parseFloat(i.acceptedQty||"0"); const j = parseFloat(i.rejectedQty||"0"); return a + j > r; }) ? (
                <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-medium">Accepted + Rejected exceeds Received</span></div>
              ) : (
                <div className="flex items-center gap-2 text-green-600"><span className="text-xs font-medium">All quantities valid</span></div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-10" disabled={submitting} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><Save className="mr-2 h-4 w-4" />Save & Update Stock</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/purchases/grn")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}