"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Calculator,
  Save,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCustomers,
  createInvoice,
  type InvoiceFormData,
  type InvoiceLineItem,
} from "@/lib/actions/sales";
import { getProducts } from "@/lib/actions/inventory";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: string | null;
  taxRate: string | null;
}

// Line Item Row Component
function LineItemRow({
  index,
  item,
  products,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number;
  item: InvoiceLineItem;
  products: Product[];
  onUpdate: (index: number, field: keyof InvoiceLineItem, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      onUpdate(index, "productId", productId);
      onUpdate(index, "description", product.name);
      onUpdate(index, "unitPrice", product.salePrice || "0");
      if (product.taxRate) {
        onUpdate(index, "taxRate", product.taxRate);
      }
    }
  };

  // Calculate line total
  const lineTotal = (
    parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0")
  ).toFixed(2);

  // Update amount when quantity or price changes
  useEffect(() => {
    onUpdate(index, "amount", lineTotal);
  }, [item.quantity, item.unitPrice]);

  return (
    <div className="grid grid-cols-12 gap-3 p-4 border-b border-nexabook-200 items-center">
      {/* Product Selection */}
      <div className="col-span-3">
        <Select
          value={item.productId || ""}
          onValueChange={handleProductSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="col-span-3">
        <Input
          value={item.description}
          onChange={(e) => onUpdate(index, "description", e.target.value)}
          placeholder="Item description"
        />
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onUpdate(index, "quantity", e.target.value)}
          placeholder="Qty"
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onUpdate(index, "unitPrice", e.target.value)}
          placeholder="Price"
        />
      </div>

      {/* Line Total */}
      <div className="col-span-1">
        <p className="text-sm font-semibold text-nexabook-900">
          Rs. {lineTotal}
        </p>
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-end">
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Main New Invoice Page
export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      productId: "",
      description: "",
      quantity: "1",
      unitPrice: "0",
      taxRate: "0",
      amount: "0",
    },
  ]);

  // Load customers and products
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersRes, productsRes] = await Promise.all([
          getCustomers(),
          getProducts(),
        ]);

        if (customersRes.success && customersRes.data) {
          setCustomers(customersRes.data as Customer[]);
        }

        if (productsRes.success && productsRes.data) {
          setProducts(productsRes.data as Product[]);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update line item
  const updateLineItem = (
    index: number,
    field: keyof InvoiceLineItem,
    value: string
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setLineItems(updatedItems);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Add new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
        taxRate: "0",
        amount: "0",
      },
    ]);
  };

  // Calculate totals
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      return sum + parseFloat(item.amount || "0");
    }, 0);
  };

  const calculateTaxTotal = () => {
    return lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount || "0");
      const taxRate = parseFloat(item.taxRate || "0");
      return sum + (amount * taxRate) / 100;
    }, 0);
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTaxTotal();
    return subtotal + tax;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!customerId) {
      alert("Please select a customer");
      return;
    }

    if (lineItems.some((item) => !item.description || parseFloat(item.unitPrice) <= 0)) {
      alert("Please fill in all item descriptions and prices");
      return;
    }

    setSubmitting(true);

    try {
      const invoiceData: InvoiceFormData = {
        customerId,
        invoiceNumber: "", // Will be auto-generated
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subTotal: calculateSubtotal().toFixed(2),
        taxTotal: calculateTaxTotal().toFixed(2),
        discountTotal: "0",
        grandTotal: calculateGrandTotal().toFixed(2),
        notes: notes || undefined,
        terms: terms || undefined,
        items: lineItems,
      };

      const result = await createInvoice(invoiceData);

      if (result.success) {
        alert(`Invoice ${result.invoiceNumber} created successfully!`);
        router.push("/sales/invoices");
      } else {
        alert(result.error || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading invoice form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/sales/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Create New Invoice</h1>
            <p className="text-nexabook-600 mt-1">
              Fill in the invoice details and add line items below.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Invoice Header Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-nexabook-900">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-nexabook-900">
                Customer <span className="text-red-500">*</span>
              </label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issue Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-nexabook-900">
                Issue Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-nexabook-900">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-nexabook-900">Line Items</CardTitle>
          <Button onClick={addLineItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 p-4 bg-nexabook-50 border-b border-nexabook-200 text-sm font-semibold text-nexabook-700">
            <div className="col-span-3">Product</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Line Items */}
          {lineItems.map((item, index) => (
            <LineItemRow
              key={index}
              index={index}
              item={item}
              products={products}
              onUpdate={updateLineItem}
              onRemove={removeLineItem}
              canRemove={lineItems.length > 1}
            />
          ))}
        </CardContent>
      </Card>

      {/* Footer: Totals & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes & Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-nexabook-900">Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-nexabook-900">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice notes (optional)"
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-nexabook-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-nexabook-900">Terms & Conditions</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms (optional)"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-nexabook-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-nexabook-900 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-nexabook-200">
                <span className="text-nexabook-600">Subtotal</span>
                <span className="font-semibold text-nexabook-900">
                  {formatCurrency(calculateSubtotal())}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-nexabook-200">
                <span className="text-nexabook-600">Tax (GST)</span>
                <span className="font-semibold text-nexabook-900">
                  {formatCurrency(calculateTaxTotal())}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-nexabook-200">
                <span className="text-nexabook-600">Discount</span>
                <span className="font-semibold text-nexabook-900">
                  {formatCurrency(0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-nexabook-50 px-4 rounded-lg">
                <span className="text-lg font-bold text-nexabook-900">Grand Total</span>
                <span className="text-2xl font-bold text-nexabook-900">
                  {formatCurrency(calculateGrandTotal())}
                </span>
              </div>

              {/* Accounting Info */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Accounting Entry:</strong> Upon saving, this invoice will automatically create:
                  <br />
                  • Debit: Accounts Receivable
                  <br />
                  • Credit: Sales Revenue
                  <br />
                  • Credit: Sales Tax Payable
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 bg-nexabook-900 hover:bg-nexabook-800"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Post Invoice
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
