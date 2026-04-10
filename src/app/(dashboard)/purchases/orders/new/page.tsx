"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Loader2, ArrowLeft, Calculator, Save, Check, X, ChevronDown, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getVendors, createPurchaseOrder, approvePurchaseOrder, getNextPurchaseOrderNumber, type PurchaseOrderFormData } from "@/lib/actions/purchases";
import { getProducts } from "@/lib/actions/inventory";

interface Vendor { id: string; name: string; }
interface Product { id: string; name: string; sku: string; costPrice: string | null; salePrice: string | null; currentStock: number | null; taxRate: string | null; unit: string | null; description: string | null; }
interface LineItem { productId?: string; description: string; quantity: string; unitPrice: string; discountPercentage?: string; taxRate?: string; }

function LineItemRow({ index, item, products, onUpdate, onRemove, canRemove, lineAmount }: { index: number; item: LineItem; products: Product[]; onUpdate: (index: number, field: keyof LineItem, value: string) => void; onRemove: (index: number) => void; canRemove: boolean; lineAmount: number; }) {
  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      onUpdate(index, "productId", productId);
      onUpdate(index, "description", product.description || product.name);
      onUpdate(index, "unitPrice", product.costPrice || "0");
      onUpdate(index, "quantity", "1");
      if (product.taxRate) onUpdate(index, "taxRate", product.taxRate);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 transition-colors group">
      <div className="col-span-3">
        <Select value={item.productId || ""} onValueChange={handleProductSelect}>
          <SelectTrigger className="h-8 text-xs border-gray-300"><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id} className="text-xs">
                <div><div className="font-medium">{product.name}</div><div className="text-xs text-gray-500">{product.sku} - Stock: {product.currentStock}</div></div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.productId && (
          <Textarea value={item.description} onChange={(e) => onUpdate(index, "description", e.target.value)} placeholder="Item description..." className="h-12 mt-1 text-xs resize-none border-gray-300" />
        )}
      </div>
      <div className="col-span-1 flex items-center">
        <Input type="number" min="0" step="1" value={item.quantity} onChange={(e) => onUpdate(index, "quantity", e.target.value)} className="h-8 text-xs" placeholder="0" />
      </div>
      <div className="col-span-1 flex items-center">
        <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => onUpdate(index, "unitPrice", e.target.value)} className="h-8 text-xs" placeholder="0" />
      </div>
      <div className="col-span-2 flex items-center gap-1">
        <Input type="number" min="0" max="100" step="0.1" value={item.discountPercentage || "0"} onChange={(e) => onUpdate(index, "discountPercentage", e.target.value)} className="h-8 text-xs flex-1" placeholder="%" />
      </div>
      <div className="col-span-2 flex items-center">
        <Input type="number" min="0" max="100" step="0.1" value={item.taxRate || "0"} onChange={(e) => onUpdate(index, "taxRate", e.target.value)} className="h-8 text-xs flex-1" placeholder="%" />
      </div>
      <div className="col-span-1 flex items-center">
        <div className="h-8 px-2 flex items-center bg-gray-50 rounded border border-gray-200 w-full">
          <span className="text-xs font-semibold text-gray-900">Rs. {lineAmount.toFixed(2)}</span>
        </div>
      </div>
      <div className="col-span-1 flex items-center justify-center gap-1">
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orderNumber, setOrderNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: "", description: "", quantity: "0", unitPrice: "0", discountPercentage: "0", taxRate: "0" },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, productsRes, orderNumRes] = await Promise.all([getVendors(), getProducts(), getNextPurchaseOrderNumber()]);
        if (vendorsRes.success && vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
        if (productsRes.success && productsRes.data) setProducts(productsRes.data as Product[]);
        if (orderNumRes.success && orderNumRes.data) setOrderNumber(orderNumRes.data as string);
      } catch (error) {} finally { setLoading(false); }
    };
    loadData();
  }, []);

  const updateLineItem = useCallback((index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }, [lineItems]);

  const removeLineItem = (index: number) => { setLineItems(lineItems.filter((_, i) => i !== index)); };
  const addLineItem = () => { setLineItems([...lineItems, { productId: "", description: "", quantity: "0", unitPrice: "0", discountPercentage: "0", taxRate: "0" }]); };

  const lineAmounts = lineItems.map((item) => {
    const qty = parseFloat(item.quantity || "0");
    const price = parseFloat(item.unitPrice || "0");
    const discPct = parseFloat(item.discountPercentage || "0");
    const subtotal = qty * price;
    return subtotal - (subtotal * discPct / 100);
  });

  const grossAmount = lineAmounts.reduce((sum, amt) => sum + amt, 0);
  const taxAmounts = lineItems.map((item, idx) => {
    const afterDisc = lineAmounts[idx];
    const taxRate = parseFloat(item.taxRate || "0");
    return afterDisc * (taxRate / 100);
  });
  const totalTax = taxAmounts.reduce((sum, amt) => sum + amt, 0);
  const netBeforeRound = grossAmount + totalTax;
  const netAmount = Math.round(netBeforeRound);

  const formatCurrency = (value: number) => new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const handleSave = async (action: "close" | "approve") => {
    if (!vendorId) { alert("Please select a vendor"); return; }
    if (lineItems.some((item) => (!item.productId || !item.description) && parseFloat(item.unitPrice) <= 0)) { alert("Please fill in product details and valid prices"); return; }

    setSubmitting(true);
    try {
      const data: PurchaseOrderFormData = {
        vendorId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        reference: reference || undefined,
        subject: subject || undefined,
        items: lineItems,
        taxAmount: totalTax.toFixed(2),
        notes: notes || undefined,
        terms: terms || undefined,
      };

      const result = await createPurchaseOrder(data);
      if (result.success && result.data) {
        const id = (result.data as any).id;
        if (action === "approve") {
          const ar = await approvePurchaseOrder(id);
          if (!ar.success) { alert(`Created but approval failed: ${(ar as any).error}`); router.push("/purchases/orders"); return; }
        }
        if (action === "close" || action === "approve") { router.push("/purchases/orders"); }
        else { alert(`Purchase order ${result.orderNumber} saved!`); router.refresh(); }
      } else { alert(result.error || "Failed to create purchase order"); }
    } catch (error) { alert("Failed to create purchase order"); } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" /><p className="text-gray-600">Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/purchases/orders"><Button variant="outline" size="sm" className="h-8"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" />Purchase Orders</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm font-mono bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">{orderNumber || "Loading..."}</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">DRAFT</Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 space-y-3">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Vendor*</Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className="h-9 text-xs border-gray-300"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>{vendors.map((v) => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Order Number</Label>
                  <Input value={orderNumber} readOnly className="h-9 text-xs font-mono bg-green-50 border-green-300 text-green-700" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Order Date*</Label>
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="h-9 text-xs border-gray-300" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Expected Delivery</Label>
                  <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} className="h-9 text-xs border-gray-300" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ref #" className="h-9 text-xs border-gray-300" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Purchase order subject" className="h-9 text-xs border-gray-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3 flex items-center gap-1"><Search className="h-3 w-3" />Product</div>
              <div className="col-span-1 flex items-center"><ArrowUpDown className="h-3 w-3 mr-1" />Qty</div>
              <div className="col-span-1 flex items-center"><ArrowUpDown className="h-3 w-3 mr-1" />Price</div>
              <div className="col-span-2 flex items-center">Disc. %</div>
              <div className="col-span-2 flex items-center">Tax %</div>
              <div className="col-span-1 flex items-center">Amount</div>
              <div className="col-span-1 text-center">Action</div>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {lineItems.map((item, i) => (
                <LineItemRow key={i} index={i} item={item} products={products} onUpdate={updateLineItem} onRemove={removeLineItem} canRemove={lineItems.length > 1} lineAmount={lineAmounts[i]} />
              ))}
            </div>
            <div className="p-2 border-t border-gray-200">
              <Button onClick={addLineItem} variant="outline" size="sm" className="h-8 text-xs w-full border-dashed border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Line
              </Button>
            </div>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." className="min-h-[60px] text-xs border-gray-300" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Terms</Label>
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms and conditions..." className="min-h-[60px] text-xs border-gray-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4 space-y-3">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Financial Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Subtotal</span><span className="text-sm font-semibold">{formatCurrency(grossAmount)}</span></div>
                <div className="flex justify-between py-1.5 border-b border-gray-200"><span className="text-xs text-gray-600">Tax</span><span className="text-sm font-semibold">{formatCurrency(totalTax)}</span></div>
                <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg border border-blue-200 mt-3">
                  <span className="text-sm font-bold text-blue-900">Grand Total</span>
                  <span className="text-xl font-bold text-blue-900">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" disabled={submitting}>
                    {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>) : (<><Save className="mr-2 h-4 w-4" />SAVE<ChevronDown className="ml-2 h-4 w-4" /></>)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleSave("close")}>Save & Close</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave("approve")}>Save & Approve</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.push("/purchases/orders")}>
                <X className="mr-2 h-4 w-4" />Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}