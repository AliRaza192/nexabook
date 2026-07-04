"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Plus, Trash2, Loader2, ArrowLeft, Save, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomers, createDeliveryNote, getNextDeliveryNumber, getInvoices, getSaleOrders, type DeliveryNoteFormData } from "@/lib/actions/sales";
import { getProducts } from "@/lib/actions/inventory";

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; description: string | null; }
interface SimpleItem { id: string; label: string; }

export default function NewDeliveryPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<SimpleItem[]>([]);
  const [orders, setOrders] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [shippedVia, setShippedVia] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [lineItems, setLineItems] = useState<Array<{ productId: string; description: string; orderedQty: string; deliveredQty: string }>>([
    { productId: "", description: "", orderedQty: "1", deliveredQty: "1" }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, pRes, iRes, oRes] = await Promise.all([getCustomers(), getProducts(), getInvoices(), getSaleOrders()]);
        if (cRes.success && cRes.data) setCustomers(cRes.data as Customer[]);
        if (pRes.success && pRes.data) setProducts(pRes.data as Product[]);
        if (iRes.success && iRes.data) setInvoices((iRes.data as any[]).map((x: any) => ({ id: x.id, label: `${x.invoiceNumber} - ${x.customer?.name || ''}` })));
        if (oRes.success && oRes.data) setOrders((oRes.data as any[]).map((x: any) => ({ id: x.id, label: `${x.orderNumber} - ${x.customer?.name || ''}` })));
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const updateLineItem = useCallback((index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "productId") { const p = products.find(pr => pr.id === value); if (p) updated[index].description = p.description || p.name; }
    setLineItems(updated);
  }, [lineItems, products]);

  const addLine = () => setLineItems([...lineItems, { productId: "", description: "", orderedQty: "1", deliveredQty: "1" }]);
  const removeLine = (i: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, idx) => idx !== i)); };

  const handleSave = async () => {
    if (!customerId) { alert("Please select a customer"); return; }
    setSubmitting(true);
    try {
      const data: DeliveryNoteFormData = {
        customerId, invoiceId: invoiceId || undefined, orderId: orderId || undefined,
        deliveryDate, shippedVia: shippedVia || undefined, trackingNumber: trackingNumber || undefined,
        deliveryAddress: deliveryAddress || undefined, notes: notes || undefined,
        items: lineItems.map(it => ({ productId: it.productId, description: it.description, orderedQty: it.orderedQty, deliveredQty: it.deliveredQty }))
      };
      const res = await createDeliveryNote(data);
      if (res.success) { alert("Delivery note created"); router.push("/sales/delivery"); }
      else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/sales/delivery"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Package className="h-5 w-5 text-blue-600" />New Delivery Note</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Customer*</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Linked Invoice</Label><Select value={invoiceId} onValueChange={setInvoiceId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Linked Order</Label><Select value={orderId} onValueChange={setOrderId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Delivery Date*</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="h-9 text-xs" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Shipped Via</Label><Input value={shippedVia} onChange={e => setShippedVia(e.target.value)} placeholder="Courier/Method" className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Tracking Number</Label><Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Tracking #" className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Delivery Address</Label><Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Address" className="h-9 text-xs" /></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3">Product</div><div className="col-span-3">Description</div><div className="col-span-2">Ordered Qty</div><div className="col-span-2">Delivered Qty</div><div className="col-span-2 text-center">Action</div>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 group">
                  <div className="col-span-3"><Select value={item.productId} onValueChange={v => updateLineItem(i, "productId", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-3"><Input value={item.description} onChange={e => updateLineItem(i, "description", e.target.value)} placeholder="Description" className="h-8 text-xs" /></div>
                  <div className="col-span-2"><Input type="number" min="0" value={item.orderedQty} onChange={e => updateLineItem(i, "orderedQty", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2"><Input type="number" min="0" value={item.deliveredQty} onChange={e => updateLineItem(i, "deliveredQty", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2 flex items-center justify-center"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 opacity-0 group-hover:opacity-100" onClick={() => removeLine(i)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-gray-200"><Button onClick={addLine} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2"><Plus className="h-3.5 w-3.5 mr-1" />Add Line</Button></div>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4"><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." className="min-h-[60px] text-xs" /></CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" disabled={submitting} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Delivery Note</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/sales/delivery")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
