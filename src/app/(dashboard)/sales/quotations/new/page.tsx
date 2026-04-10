"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Loader2, ArrowLeft, Calculator, Save, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCustomers, createQuotation, getNextQuotationNumber, type QuotationFormData } from "@/lib/actions/sales";
import { getProducts } from "@/lib/actions/inventory";

interface Customer { id: string; name: string; }
interface Product { id: string; name: string; sku: string; salePrice: string | null; currentStock: number | null; taxRate: string | null; description: string | null; }

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [subject, setSubject] = useState("");
  const [reference, setReference] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [globalDiscountPct, setGlobalDiscountPct] = useState("0");
  const [shippingCharges, setShippingCharges] = useState("0");

  const [lineItems, setLineItems] = useState<Array<{ productId: string; description: string; quantity: string; unitPrice: string; discountPercentage: string; taxRate: string }>>([
    { productId: "", description: "", quantity: "1", unitPrice: "0", discountPercentage: "0", taxRate: "0" }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, pRes, nRes] = await Promise.all([getCustomers(), getProducts(), getNextQuotationNumber()]);
        if (cRes.success && cRes.data) setCustomers(cRes.data as Customer[]);
        if (pRes.success && pRes.data) setProducts(pRes.data as Product[]);
      } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const updateLineItem = useCallback((index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "productId") {
      const p = products.find(pr => pr.id === value);
      if (p) {
        updated[index].description = p.description || p.name;
        updated[index].unitPrice = p.salePrice || "0";
        if (p.taxRate) updated[index].taxRate = p.taxRate;
      }
    }
    setLineItems(updated);
  }, [lineItems, products]);

  const addLineItem = () => setLineItems([...lineItems, { productId: "", description: "", quantity: "1", unitPrice: "0", discountPercentage: "0", taxRate: "0" }]);
  const removeLineItem = (i: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, idx) => idx !== i)); };

  const lineAmounts = lineItems.map(item => {
    const qty = parseFloat(item.quantity || "0"), price = parseFloat(item.unitPrice || "0"), disc = parseFloat(item.discountPercentage || "0");
    const sub = qty * price; return sub - (sub * disc / 100);
  });
  const grossAmount = lineAmounts.reduce((s, a) => s + a, 0);
  const totalTax = lineItems.reduce((sum, item, i) => sum + lineAmounts[i] * (parseFloat(item.taxRate || "0") / 100), 0);
  const globalDisc = grossAmount * parseFloat(globalDiscountPct || "0") / 100;
  const shipping = parseFloat(shippingCharges || "0");
  const netAmount = Math.round(grossAmount - globalDisc + totalTax + shipping);

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2 }).format(v);

  const handleSave = async () => {
    if (!customerId) { alert("Please select a customer"); return; }
    if (lineItems.some(it => !it.productId || parseFloat(it.unitPrice) <= 0)) { alert("Please select products with valid prices"); return; }
    setSubmitting(true);
    try {
      const data: QuotationFormData = {
        customerId, subject, reference, issueDate, expiryDate: expiryDate || undefined,
        items: lineItems.map(it => ({ productId: it.productId, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, discountPercentage: it.discountPercentage, taxRate: it.taxRate })),
        discountPercentage: globalDiscountPct, taxAmount: totalTax.toFixed(2), shippingCharges: shipping.toFixed(2), notes, terms
      };
      const res = await createQuotation(data);
      if (res.success) { alert("Quotation created: " + res.quotationNumber); router.push("/sales/quotations"); }
      else alert(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" /><p className="text-gray-600 ml-3">Loading...</p></div>;

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/sales/quotations"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link><h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" />New Quotation</h1></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-5 gap-3">
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Customer*</Label>
                <Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="h-9 text-xs border-gray-300"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Issue Date*</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-9 text-xs border-gray-300" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Expiry Date</Label><Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 text-xs border-gray-300" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="h-9 text-xs border-gray-300" /></div>
              <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs border-gray-300" /></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3">Product</div><div className="col-span-1">Qty</div><div className="col-span-1">Price</div><div className="col-span-2">Disc %</div><div className="col-span-2">Tax %</div><div className="col-span-2">Amount</div><div className="col-span-1 text-center">Action</div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 transition-colors group">
                  <div className="col-span-3"><Select value={item.productId} onValueChange={v => updateLineItem(i, "productId", v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                    <Input value={item.description} onChange={e => updateLineItem(i, "description", e.target.value)} placeholder="Description" className="h-7 text-xs mt-1" /></div>
                  <div className="col-span-1"><Input type="number" min="0" value={item.quantity} onChange={e => updateLineItem(i, "quantity", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-1"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(i, "unitPrice", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2"><Input type="number" min="0" max="100" value={item.discountPercentage} onChange={e => updateLineItem(i, "discountPercentage", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2"><Input type="number" min="0" max="100" value={item.taxRate} onChange={e => updateLineItem(i, "taxRate", e.target.value)} className="h-8 text-xs" /></div>
                  <div className="col-span-2 flex items-center"><span className="text-xs font-semibold">{formatCurrency(lineAmounts[i])}</span></div>
                  <div className="col-span-1 flex items-center justify-center"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 opacity-0 group-hover:opacity-100" onClick={() => removeLineItem(i)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-gray-200"><Button onClick={addLineItem} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2"><Plus className="h-3.5 w-3.5 mr-1" />Add Line</Button></div>
          </Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-3">
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="min-h-[60px] text-xs" /></div>
            <div><Label className="text-xs font-medium text-gray-700 mb-1 block">Terms</Label><Textarea value={terms} onChange={e => setTerms(e.target.value)} placeholder="Terms & conditions..." className="min-h-[60px] text-xs" /></div>
          </CardContent></Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Subtotal</span><span className="text-sm font-semibold">{formatCurrency(grossAmount)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Discount ({globalDiscountPct}%)</span><span className="text-sm font-semibold text-red-600">- {formatCurrency(globalDisc)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Tax</span><span className="text-sm font-semibold">{formatCurrency(totalTax)}</span></div>
              <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Shipping</span><Input type="number" min="0" step="0.01" value={shippingCharges} onChange={e => setShippingCharges(e.target.value)} className="h-7 w-24 text-xs text-right" /></div>
              <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg border border-blue-200 mt-3"><span className="text-sm font-bold text-blue-900">Grand Total</span><span className="text-xl font-bold text-blue-900">{formatCurrency(netAmount)}</span></div>
            </div>
          </CardContent></Card>

          <Card className="border-gray-200 shadow-sm"><CardContent className="p-4 space-y-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" disabled={submitting} onClick={handleSave}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Quotation</>}</Button>
            <Button variant="outline" className="w-full h-10" onClick={() => router.push("/sales/quotations")}><X className="mr-2 h-4 w-4" />Cancel</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
