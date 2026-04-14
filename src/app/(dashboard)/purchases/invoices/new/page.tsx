"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Calculator,
  Save,
  Check,
  X,
  ChevronDown,
  Calendar,
  Search,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPKR } from "@/lib/utils/number-format";
import {
  getVendors,
  createPurchaseInvoice,
  approvePurchaseInvoice,
  getNextBillNumber,
  type PurchaseInvoiceFormData,
  type PurchaseInvoiceLineItem,
} from "@/lib/actions/purchases";
import { getProducts } from "@/lib/actions/inventory";

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: string | null;
  salePrice: string | null;
  currentStock: number | null;
  taxRate: string | null;
  unit: string | null;
  description: string | null;
}

// Line Item Row
function LineItemRow({
  index,
  item,
  products,
  onUpdate,
  onRemove,
  onCheck,
  isChecked,
  canRemove,
  onKeyDown,
  lineAmount,
}: {
  index: number;
  item: PurchaseInvoiceLineItem;
  products: Product[];
  onUpdate: (index: number, field: keyof PurchaseInvoiceLineItem, value: string) => void;
  onRemove: (index: number) => void;
  onCheck: (index: number) => void;
  isChecked: boolean;
  canRemove: boolean;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  lineAmount: number;
}) {
  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      onUpdate(index, "productId", productId);
      onUpdate(index, "description", product.description || product.name);
      onUpdate(index, "unitPrice", product.costPrice || "0");
      onUpdate(index, "quantity", "1");
      if (product.taxRate) {
        onUpdate(index, "taxRate", product.taxRate);
      }
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 py-2 px-2 border-b border-gray-200 hover:bg-blue-50/30 transition-colors group">
      {/* Product - 3 cols */}
      <div className="col-span-3">
        <Select value={item.productId || ""} onValueChange={handleProductSelect} disabled={isChecked}>
          <SelectTrigger className="h-8 text-xs border-gray-300">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id} className="text-xs">
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.sku} • Stock: {product.currentStock}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.productId && (
          <Textarea
            value={item.description}
            onChange={(e) => onUpdate(index, "description", e.target.value)}
            placeholder="Item description..."
            disabled={isChecked}
            className="h-12 mt-1 text-xs resize-none border-gray-300"
            onKeyDown={(e) => onKeyDown(e, index)}
          />
        )}
      </div>

      {/* Quantity - 1.5 cols */}
      <div className="col-span-1 flex items-center">
        <Input
          type="number"
          min="0"
          step="1"
          value={item.quantity}
          onChange={(e) => onUpdate(index, "quantity", e.target.value)}
          onKeyDown={(ev) => onKeyDown(ev, index)}
          disabled={isChecked}
          className="h-8 text-xs"
          placeholder="0"
        />
      </div>

      {/* Price - 1.5 cols */}
      <div className="col-span-1 flex items-center">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onUpdate(index, "unitPrice", e.target.value)}
          onKeyDown={(ev) => onKeyDown(ev, index)}
          disabled={isChecked}
          className="h-8 text-xs"
          placeholder="0"
        />
      </div>

      {/* Discount - 2 cols */}
      <div className="col-span-2 flex items-center gap-1">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={item.discountPercentage || "0"}
          onChange={(e) => onUpdate(index, "discountPercentage", e.target.value)}
          onKeyDown={(ev) => onKeyDown(ev, index)}
          disabled={isChecked}
          className="h-8 text-xs flex-1"
          placeholder="%"
        />
      </div>

      {/* Amount - 2 cols */}
      <div className="col-span-2 flex items-center">
        <div className="h-8 px-2 flex items-center bg-gray-50 rounded border border-gray-200 w-full">
          <span className="text-xs font-semibold text-gray-900">Rs. {lineAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions - 2 cols */}
      <div className="col-span-2 flex items-center justify-center gap-1">
        {!isChecked ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheck(index)}
            className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Lock"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Badge className="h-7 text-xs bg-green-100 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />Locked
          </Badge>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Main Purchase Invoice Page
export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [billNumber, setBillNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [comments, setComments] = useState("");
  const [globalDiscountPct, setGlobalDiscountPct] = useState("0");
  const [globalDiscountAmt, setGlobalDiscountAmt] = useState("0");

  // Line items
  const [lineItems, setLineItems] = useState<PurchaseInvoiceLineItem[]>([
    { productId: "", description: "", quantity: "0", unitPrice: "0", discountPercentage: "0", taxRate: "0", lineTotal: "0" },
  ]);
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, productsRes, billNumRes] = await Promise.all([
          getVendors(),
          getProducts(),
          getNextBillNumber(),
        ]);
        if (vendorsRes.success && vendorsRes.data) setVendors(vendorsRes.data as Vendor[]);
        if (productsRes.success && productsRes.data) setProducts(productsRes.data as Product[]);
        if (billNumRes.success && billNumRes.data) setBillNumber(billNumRes.data as string);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const updateLineItem = useCallback((index: number, field: keyof PurchaseInvoiceLineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }, [lineItems]);

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
    const nc = new Set(checkedRows);
    nc.delete(index);
    setCheckedRows(nc);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: "", description: "", quantity: "0", unitPrice: "0", discountPercentage: "0", taxRate: "0", lineTotal: "0" }]);
  };

  const checkRow = (index: number) => {
    const nc = new Set(checkedRows);
    nc.add(index);
    setCheckedRows(nc);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (index === lineItems.length - 1) addLineItem();
    }
  };

  // Line calculations
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

  // Global discount
  const globalDiscPct = parseFloat(globalDiscountPct || "0");
  const globalDiscAmt = parseFloat(globalDiscountAmt || "0");
  const effectiveGlobalDisc = globalDiscAmt > 0 ? globalDiscAmt : (grossAmount * globalDiscPct / 100);

  const netBeforeRound = grossAmount - effectiveGlobalDisc + totalTax;
  const netAmount = Math.round(netBeforeRound);

  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  const handleSave = async (action: "continue" | "close" | "approve") => {
    if (!vendorId) {
      alert("Please select a vendor");
      return;
    }
    if (lineItems.some((item) => !item.productId || parseFloat(item.unitPrice) <= 0)) {
      alert("Please select products and enter valid prices");
      return;
    }

    setSubmitting(true);
    try {
      const data: PurchaseInvoiceFormData = {
        vendorId,
        billNumber,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        reference: reference || undefined,
        subject: subject || undefined,
        grossAmount: grossAmount.toFixed(2),
        discountTotal: effectiveGlobalDisc.toFixed(2),
        taxTotal: totalTax.toFixed(2),
        netAmount: netAmount.toFixed(2),
        notes: comments || undefined,
        items: lineItems,
      };

      const result = await createPurchaseInvoice(data);

      if (result.success && result.data) {
        const id = (result.data as any).id;

        if (action === "approve") {
          const ar = await approvePurchaseInvoice(id);
          if (!ar.success) {
            alert(`Created but approval failed: ${(ar as any).error}`);
            router.push("/purchases/invoices");
            return;
          }
        }

        if (action === "close" || action === "approve") {
          router.push("/purchases/invoices");
        } else {
          alert(`Purchase invoice ${result.billNumber} saved!`);
          router.refresh();
        }
      } else {
        alert(result.error || "Failed to create invoice");
      }
    } catch (error) {
      alert("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-gray-50 min-h-screen pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/purchases/invoices">
              <Button variant="outline" size="sm" className="h-8">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Purchase Invoices
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm font-mono bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
              {billNumber || "Loading..."}
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">
              DRAFT
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-3">
        {/* Left - 8 cols */}
        <div className="col-span-8 space-y-3">
          {/* Top Form */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              {/* 5-col grid */}
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Vendor</Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className="h-9 text-xs border-gray-300">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Number</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={billNumber}
                      readOnly
                      className="h-9 text-xs font-mono bg-green-50 border-green-300 text-green-700"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 text-xs border-gray-300"
                    />
                    <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Due Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 text-xs border-gray-300"
                    />
                    <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1 block">Reference</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ref #"
                    className="h-9 text-xs border-gray-300"
                  />
                </div>
              </div>
              {/* Secondary row */}
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Purchase invoice subject"
                  className="h-9 text-xs border-gray-300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Button */}
          <div className="flex justify-end">
            <Button className="h-9 bg-green-600 hover:bg-green-700 text-white text-xs">
              <Search className="h-3.5 w-3.5 mr-2" />
              QUICKLY ADD PRODUCTS / SCAN
            </Button>
          </div>

          {/* Product Grid */}
          <Card className="border-gray-200 shadow-sm">
            <div className="grid grid-cols-12 gap-2 py-2 px-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-3 flex items-center gap-1">
                <Search className="h-3 w-3" />
                Product
              </div>
              <div className="col-span-1 flex items-center">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Qty
              </div>
              <div className="col-span-1 flex items-center">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                Price
              </div>
              <div className="col-span-2 flex items-center">Disc.</div>
              <div className="col-span-2 flex items-center">Amount</div>
              <div className="col-span-2 text-center">Action</div>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {lineItems.map((item, i) => (
                <LineItemRow
                  key={i}
                  index={i}
                  item={item}
                  products={products}
                  onUpdate={updateLineItem}
                  onRemove={removeLineItem}
                  onCheck={checkRow}
                  isChecked={checkedRows.has(i)}
                  canRemove={lineItems.length > 1}
                  onKeyDown={handleKeyDown}
                  lineAmount={lineAmounts[i]}
                />
              ))}
            </div>
            <div className="p-2 border-t border-gray-200">
              <Button
                onClick={addLineItem}
                variant="outline"
                size="sm"
                className="h-8 text-xs w-full border-dashed border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Line (Enter)
              </Button>
            </div>
          </Card>

          {/* Comments */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-gray-700 mb-1 block">Comments</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Additional comments..."
                className="min-h-[80px] text-xs border-gray-300"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right - 4 cols */}
        <div className="col-span-4 space-y-3">
          {/* Summary */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Financial Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-xs text-gray-600">Gross</span>
                  <span className="text-sm font-semibold">{formatCurrency(grossAmount)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-xs text-gray-600">Discount</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={globalDiscountPct}
                      onChange={(e) => {
                        setGlobalDiscountPct(e.target.value);
                        setGlobalDiscountAmt("0");
                      }}
                      className="h-7 w-16 text-xs text-right"
                      placeholder="%"
                    />
                    <span className="text-sm font-semibold text-red-600 min-w-[80px] text-right">
                      - {formatCurrency(effectiveGlobalDisc)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-xs text-gray-600">Tax (GST)</span>
                  <span className="text-sm font-semibold">{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between py-3 bg-blue-50 px-3 rounded-lg border border-blue-200 mt-3">
                  <span className="text-sm font-bold text-blue-900">Net (PKR)</span>
                  <span className="text-xl font-bold text-blue-900">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" />SAVE AND NEW<ChevronDown className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleSave("continue")}>
                    Save & Continue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave("close")}>
                    Save & Close
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave("approve")}>
                    Save & Approve
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 font-semibold"
                onClick={() => router.push("/purchases/invoices")}
              >
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Quick Info</h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Select vendor before adding items</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                  <span>Cost price auto-fills from product</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                  <span>Approve to add stock & create journal entry</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
