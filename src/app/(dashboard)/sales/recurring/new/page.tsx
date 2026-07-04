"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Repeat, Plus, Trash2, Loader2, ArrowLeft, Calculator, Save, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomers, createRecurringInvoice, type RecurringInvoiceFormData } from "@/lib/actions/sales";
import { getProducts } from "@/lib/actions/inventory";
import { formatPKR } from "@/lib/utils/number-format";

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; salePrice: string | null; taxRate: string | null; description: string | null; }

export default function NewRecurringPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [interval, setInterval] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [globalDiscountPct, setGlobalDiscountPct] = useState("0");
  const [shippingCharges, setShippingCharges] = useState("0");

  const [lineItems, setLineItems] = useState<Array<{ productId: string; description: string; quantity: string; unitPrice: string; taxRate: string }>>([
    { productId: "", description: "", quantity: "1", unitPrice: "0", taxRate: "0" }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([getCustomers(), getProducts()]);
        if (cRes.success && cRes.data) setCustomers(cRes.data as Customer[]);
        if (pRes.success && pRes.data) setProducts(pRes.data as Product[]);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const updateLineItem = useCallback((index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "productId") { const p = products.find(pr => pr.id === value); if (p) { updated[index].description = p.description || p.name; updated[index].unitPrice = p.salePrice || "0"; if (p.taxRate) updated[index].taxRate = p.taxRate; } }
    setLineItems(updated);
  }, [lineItems, products]);

  const addLine = () => setLineItems([...lineItems, { productId: "", description: "", quantity: "1", unitPrice: "0", taxRate: "0" }]);
  const removeLine = (i: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, idx) => idx !== i)); };

  const lineAmounts = lineItems.map(item => {
    const qty = parseFloat(item.quantity || "0"), price = parseFloat(item.unitPrice || "0"), tax = parseFloat(item.taxRate || "0");
    const sub = qty * price; return sub + (sub * tax / 100);
  });
  const simpleGross = lineItems.reduce((s, item) => s + (parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0")), 0);
  const totalTax = lineItems.reduce((sum, item) => { const sub = parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0"); return sum + sub * (parseFloat(item.taxRate || "0") / 100); }, 0);
  const globalDisc = simpleGross * parseFloat(globalDiscountPct || "0") / 100;
  const shipping = parseFloat(shippingCharges || "0");
  const netAmount = Math.round(simpleGross - globalDisc + totalTax + shipping);
  const formatCurrency = (v: number) => formatPKR(v, 'south-asian');

  const handleSave = async () => {
    if (!customerId || !templateName) { alert("Customer and template name are required"); return; }
    setSubmitting(true);
    try {
      const data: RecurringInvoiceFormData = {
        customerId, templateName, interval, startDate, endDate: endDate || undefined,
        subject: subject || undefined, notes: notes || undefined, terms: terms || undefined,
        items: lineItems.map(it => ({ productId: it.productId, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, taxRate: it.taxRate })),
        discountPercentage: globalDiscountPct, taxAmount: totalTax.toFixed(2), shippingCharges: shipping.toFixed(2)
      };
      const res = await createRecurringInvoice(data);
      if (res.success) { alert("Recurring invoice created"); router.push("/sales/recurring"); }
      else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/sales/recurring"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Repeat className="h-5 w-5 text-blue-600" />New Recurring Invoice</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-5 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Template Name*</Label><Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g., Monthly Retainer" className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Customer*</Label><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Interval*</Label><Select value={interval} onValueChange={v => setInterval(v as any)}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Start Date*</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-xs" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Invoice subject" className="h-9 text-xs" /></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3">Product</div><div className="col-span-3">Description</div><div className="col-span-1">Qty</div><div className="col-span-2">Price</div><div className="col-span-2">Tax %</div><div className="col-span-1 text-center">Action</div>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 group">
                  <div className="col-span-3"><Select value={item.productId} onValueChange={v => updateLineItem(i, "productId", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-3"><Input value={item.description} onChange={e => updateLineItem(i, "description", e.target.value)} placeholder="Description" className="h-8 text-xs" /></div>
                  <div className="col-span-1"><Input type="number" min="0" value={item.quantity} onChange={e => updateLineItem(i, "quantity", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(i, "unitPrice", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2"><Input type="number" min="0" max="100" value={item.taxRate} onChange={e => updateLineItem(i, "taxRate", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-1 flex items-center justify-center"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 opacity-0 group-hover:opacity-100" onClick={() => removeLine(i)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-gray-200"><Button onClick={addLine} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2"><Plus className="h-3.5 w-3.5 mr-1" />Add Line</Button></div>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px] text-xs" /></div>
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Terms</Label><Textarea value={terms} onChange={e => setTerms(e.target.value)} className="min-h-[60px] text-xs" /></div>
          </CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Subtotal</span><span className="text-sm font-semibold">{formatCurrency(simpleGross)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Discount ({globalDiscountPct}%)</span><span className="text-sm font-semibold text-red-600">- {formatCurrency(globalDisc)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Tax</span><span className="text-sm font-semibold">{formatCurrency(totalTax)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Shipping</span><Input type="number" min="0" step="0.01" value={shippingCharges} onChange={e => setShippingCharges(e.target.value)} className="h-7 w-24 text-xs text-right" /></div>
              <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg border border-blue-200 mt-3"><span className="text-sm font-bold text-blue-900">Per Invoice</span><span className="text-xl font-bold text-blue-900">{formatCurrency(netAmount)}</span></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" disabled={submitting} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Recurring</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/sales/recurring")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
