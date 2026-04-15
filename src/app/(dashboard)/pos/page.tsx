"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Printer,
  Wallet,
  CreditCard,
  Clock,
  X,
  Check,
  Loader2,
  Package,
  Calculator,
  Receipt,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPosProducts,
  getPosCategories,
  getCurrentPosShift,
  startShift,
  endShift,
  processPosSale,
  generatePOSReport,
  getCurrentShiftDetails,
  type PosSaleItem,
  type PosReportType,
  type PosReportData,
} from "@/lib/actions/pos";

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: string | null;
  currentStock: number | null;
  taxRate: string | null;
  unit: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem extends PosSaleItem {
  name: string;
  sku: string;
  maxStock: number;
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftType, setShiftType] = useState<'open' | 'close'>('open');
  const [openingAmount, setOpeningAmount] = useState("0");
  const [closingAmount, setClosingAmount] = useState("0");
  const [expectedAmount, setExpectedAmount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [reportData, setReportData] = useState<PosReportData | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Load products and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, categoriesRes, shiftRes] = await Promise.all([
          getPosProducts(),
          getPosCategories(),
          getCurrentShiftDetails(),
        ]);

        if (productsRes.success && productsRes.data) {
          setProducts(productsRes.data.filter((p: any) => (p.currentStock || 0) > 0) as Product[]);
        }
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data as Category[]);
        }
        if (shiftRes.success && shiftRes.data) {
          setShiftOpen(true);
          setCurrentShiftId(shiftRes.data.shift.id);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || true; // Simplified for now
    return matchesSearch && matchesCategory;
  });

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * 0.17; // 17% GST default
  const grandTotal = Math.round(subtotal + tax);

  // Add to cart
  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) return prev;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: 1,
          unitPrice: parseFloat(product.salePrice || "0"),
          discountPercentage: 0,
          name: product.name,
          sku: product.sku,
          maxStock: product.currentStock || 0,
        },
      ];
    });
  }, []);

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, Math.min(item.maxStock, item.quantity + delta)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => setCart([]);

  // Handle shift management
  const handleShiftSubmit = async () => {
    setSubmitting(true);
    try {
      if (shiftType === 'open') {
        const result = await startShift(parseFloat(openingAmount));
        if (result.success) {
          setShiftOpen(true);
          setShiftDialogOpen(false);
        } else {
          alert(result.error || "Failed to start shift");
        }
      } else {
        const result = await endShift(parseFloat(closingAmount), parseFloat(expectedAmount));
        if (result.success) {
          setShiftOpen(false);
          setShiftDialogOpen(false);
        } else {
          alert(result.error || "Failed to close shift");
        }
      }
    } catch (error) {
      alert("Failed to process shift");
    } finally {
      setSubmitting(false);
    }
  };

  // Process sale
  const handleProcessSale = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    if (!shiftOpen) {
      alert("Please start a shift first");
      setShiftType('open');
      setShiftDialogOpen(true);
      return;
    }

    setSubmitting(true);
    setShowPaymentDialog(false);
    try {
      const result = await processPosSale({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
        })),
        paymentMethod,
        taxPercentage: 17,
      });

      if (result.success) {
        alert(`Sale completed! Invoice: ${result.invoiceNumber}`);
        clearCart();
      } else {
        alert(result.error || "Failed to process sale");
      }
    } catch (error) {
      alert("Failed to process sale");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle X-Report (Mid-day)
  const handleXReport = async () => {
    if (!shiftOpen || !currentShiftId) {
      alert("No open shift found");
      return;
    }

    setSubmitting(true);
    try {
      const result = await generatePOSReport(currentShiftId, 'X');

      if (result.success && result.data) {
        setReportData(result.data);
        setShowReportDialog(true);
        // Auto-print after a short delay
        setTimeout(() => {
          window.print();
        }, 500);
      } else {
        alert(result.error || "Failed to generate X-Report");
      }
    } catch (error) {
      alert("Failed to generate X-Report");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Z-Report (End-of-day)
  const handleZReport = async () => {
    if (!shiftOpen || !currentShiftId) {
      alert("No open shift found");
      return;
    }

    if (!confirm("Are you sure you want to close your counter? This will generate the Z-Report and close the shift. This action cannot be undone.")) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await generatePOSReport(currentShiftId, 'Z');

      if (result.success && result.data) {
        setReportData(result.data);
        setShowReportDialog(true);
        // Auto-print after a short delay
        setTimeout(() => {
          window.print();
        }, 500);

        // Reset shift state after Z-Report
        setShiftOpen(false);
        setCurrentShiftId(null);
      } else {
        alert(result.error || "Failed to generate Z-Report");
      }
    } catch (error) {
      alert("Failed to generate Z-Report");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading POS...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Main 2-Column Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left: Product Gallery (7 cols) */}
        <div className="col-span-7 flex flex-col gap-4 overflow-hidden">
          {/* Search & Filters */}
          <Card className="border-slate-200 shadow-sm flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search products by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 h-10"
                  />
                </div>
                {shiftOpen && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleXReport}
                      disabled={submitting}
                      className="h-10 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Print X-Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZReport}
                      disabled={submitting}
                      className="h-10 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Close Shift (Z)
                    </Button>
                  </>
                )}
                <Button
                  variant={shiftOpen ? "default" : "outline"}
                  className={shiftOpen ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => {
                    setShiftType(shiftOpen ? 'close' : 'open');
                    setShiftDialogOpen(true);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {shiftOpen ? "Close Shift" : "Start Shift"}
                </Button>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 mt-3 overflow-x-auto">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  className={selectedCategory === "all" ? "bg-slate-900 hover:bg-slate-800" : ""}
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    className={selectedCategory === cat.id ? "bg-slate-900 hover:bg-slate-800" : ""}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => addToCart(product)}
                  className="bg-white border-2 border-slate-200 rounded-lg p-4 cursor-pointer hover:border-blue-600 hover:shadow-md transition-all group"
                >
                  <div className="aspect-square bg-slate-100 rounded-lg mb-3 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Package className="h-12 w-12 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(parseFloat(product.salePrice || "0"))}
                    </span>
                    <Badge variant="outline" className="text-xs bg-slate-100">
                      Stock: {product.currentStock}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-600">Try adjusting your search</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Billing Terminal (5 cols) */}
        <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
          <Card className="border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3 px-4 flex-shrink-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Current Sale
                {cart.length > 0 && (
                  <Badge className="ml-auto bg-blue-600 text-white">
                    {cart.length} items
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Cart is empty</p>
                    <p className="text-sm text-slate-500 mt-1">Click products to add</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.productId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-slate-500">{formatCurrency(item.unitPrice)} each</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 border-blue-600 text-blue-600 hover:bg-blue-50"
                          onClick={() => updateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-10 text-center font-semibold text-slate-900">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 border-blue-600 text-blue-600 hover:bg-blue-50"
                          onClick={() => updateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right min-w-[80px]">
                        <p className="font-semibold text-slate-900 text-sm">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </p>
                      </div>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Totals Section */}
              <div className="border-t border-slate-200 p-4 space-y-2 bg-white flex-shrink-0">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax (17% GST)</span>
                  <span className="font-medium text-slate-900">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-slate-900 rounded-lg mt-3">
                  <span className="text-base font-bold text-white">Grand Total</span>
                  <span className="text-2xl font-bold text-blue-400">{formatCurrency(grandTotal)}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
                    onClick={() => setShowPaymentDialog(true)}
                    disabled={cart.length === 0 || submitting}
                  >
                    <Wallet className="h-5 w-5 mr-2" />
                    PAY NOW
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                    onClick={() => {
                      if (cart.length > 0) handleProcessSale();
                    }}
                    disabled={cart.length === 0 || submitting}
                  >
                    <Printer className="h-5 w-5 mr-2" />
                    PRINT
                  </Button>
                </div>

                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-600 hover:bg-red-50"
                    onClick={clearCart}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Shift Management Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {shiftType === 'open' ? 'Start POS Shift' : 'Close POS Shift'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {shiftType === 'open'
                ? 'Enter the opening cash amount for this shift'
                : 'Enter the actual cash amount counted'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {shiftType === 'open' ? (
              <div>
                <Label className="text-slate-700 mb-1 block">Opening Cash Amount (PKR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-slate-700 mb-1 block">Expected Cash (PKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="border-slate-300 bg-slate-50"
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-slate-700 mb-1 block">Actual Cash Counted (PKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    className="border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleShiftSubmit}
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {shiftType === 'open' ? 'Start Shift' : 'Close Shift'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Process Payment
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Select payment method and complete the sale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-900 rounded-lg text-center">
              <p className="text-sm text-slate-400 mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-blue-400">{formatCurrency(grandTotal)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={paymentMethod === 'cash' ? "default" : "outline"}
                className={paymentMethod === 'cash' ? "bg-blue-600 hover:bg-blue-700 h-16" : "h-16"}
                onClick={() => setPaymentMethod('cash')}
              >
                <div className="text-center">
                  <Wallet className="h-6 w-6 mx-auto mb-1" />
                  <p className="font-semibold">Cash</p>
                </div>
              </Button>
              <Button
                variant={paymentMethod === 'card' ? "default" : "outline"}
                className={paymentMethod === 'card' ? "bg-blue-600 hover:bg-blue-700 h-16" : "h-16"}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="text-center">
                  <CreditCard className="h-6 w-6 mx-auto mb-1" />
                  <p className="font-semibold">Card</p>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessSale}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POS X/Z Report Dialog with Thermal Print Layout */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {reportData?.reportType === 'X' ? 'X-Report (Mid-day)' : 'Z-Report (End-of-day)'}
            </DialogTitle>
            <DialogDescription>
              {reportData?.reportType === 'Z'
                ? 'This report has closed the shift. Print for your records.'
                : 'Mid-day summary. The shift remains open.'}
            </DialogDescription>
          </DialogHeader>

          {reportData && (
            <div className="space-y-4">
              {/* Thermal Print Layout Container */}
              <div id="pos-thermal-report" className="bg-white border rounded-lg p-6 font-mono text-sm">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-slate-300 pb-3 mb-3">
                  <h2 className="text-xl font-bold text-slate-900">NexaBook POS</h2>
                  <h3 className="text-lg font-bold text-slate-800 mt-1">
                    {reportData.reportType === 'X' ? 'X-REPORT' : 'Z-REPORT'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {reportData.reportNumber}
                  </p>
                </div>

                {/* Cashier & Date Info */}
                <div className="text-xs text-slate-700 space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span className="font-semibold">{reportData.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-semibold">
                      {new Date(reportData.openingTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opening Time:</span>
                    <span className="font-semibold">
                      {new Date(reportData.openingTime).toLocaleTimeString()}
                    </span>
                  </div>
                  {reportData.closingTime && (
                    <div className="flex justify-between">
                      <span>Closing Time:</span>
                      <span className="font-semibold">
                        {new Date(reportData.closingTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sales Summary Table */}
                <div className="border-t-2 border-dashed border-slate-300 pt-3 mb-3">
                  <h4 className="font-bold text-slate-900 mb-2 text-center">SALES SUMMARY</h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">Total Sales</td>
                        <td className="py-1 text-right font-semibold">
                          {formatCurrency(reportData.totalSales)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">(-) Returns</td>
                        <td className="py-1 text-right text-red-600">
                          {formatCurrency(reportData.totalReturns)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">(-) Discounts</td>
                        <td className="py-1 text-right text-red-600">
                          {formatCurrency(reportData.totalDiscounts)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1 text-slate-600">(+) Tax Collected</td>
                        <td className="py-1 text-right text-green-600">
                          {formatCurrency(reportData.totalTaxCollected)}
                        </td>
                      </tr>
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-2 px-2">(=) Net Sales</td>
                        <td className="py-2 px-2 text-right">
                          {formatCurrency(reportData.netSales)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment Summary */}
                <div className="border-t-2 border-dashed border-slate-300 pt-3 mb-3">
                  <h4 className="font-bold text-slate-900 mb-2 text-center">PAYMENT BREAKDOWN</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left py-1">Method</th>
                        <th className="text-right py-1">Txns</th>
                        <th className="text-right py-1">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1">Cash</td>
                        <td className="py-1 text-right">{reportData.cashTransactions}</td>
                        <td className="py-1 text-right font-semibold">
                          {formatCurrency(reportData.cashSales)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1">Card</td>
                        <td className="py-1 text-right">{reportData.cardTransactions}</td>
                        <td className="py-1 text-right font-semibold">
                          {formatCurrency(reportData.cardSales)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Shift Financials (Z-Report only) */}
                {reportData.reportType === 'Z' && (
                  <div className="border-t-2 border-dashed border-slate-300 pt-3 mb-3">
                    <h4 className="font-bold text-slate-900 mb-2 text-center">SHIFT FINANCIALS</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="py-1">Opening Cash</td>
                          <td className="py-1 text-right font-semibold">
                            {formatCurrency(reportData.openingCash)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="py-1">(+ )Cash Sales</td>
                          <td className="py-1 text-right text-green-600">
                            {formatCurrency(reportData.cashSales)}
                          </td>
                        </tr>
                        <tr className="bg-blue-50 font-bold">
                          <td className="py-2 px-2">(=) Expected Cash</td>
                          <td className="py-2 px-2 text-right text-blue-700">
                            {formatCurrency(reportData.expectedCash)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Top 5 Products */}
                <div className="border-t-2 border-dashed border-slate-300 pt-3 mb-3">
                  <h4 className="font-bold text-slate-900 mb-2 text-center">TOP 5 PRODUCTS</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left py-1">#</th>
                        <th className="text-left py-1">Product</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-2 text-center text-slate-500">
                            No products sold this shift
                          </td>
                        </tr>
                      ) : (
                        reportData.topProducts.map((product, index) => (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="py-1">{index + 1}</td>
                            <td className="py-1">
                              <div className="truncate max-w-[120px]" title={product.name}>
                                {product.name}
                              </div>
                              <div className="text-[10px] text-slate-500">{product.sku}</div>
                            </td>
                            <td className="py-1 text-right">{product.quantity}</td>
                            <td className="py-1 text-right font-semibold">
                              {formatCurrency(product.revenue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="text-center border-t-2 border-dashed border-slate-300 pt-3 mt-3">
                  <p className="text-sm font-bold text-slate-900">*** THANK YOU ***</p>
                  <p className="text-xs text-slate-600 mt-2">
                    Generated: {new Date(reportData.generatedAt).toLocaleString()}
                  </p>
                  {reportData.reportType === 'Z' && (
                    <div className="mt-4 pt-3 border-t border-slate-300">
                      <p className="text-xs text-slate-600 mb-8">
                        Cashier Signature: ________________________
                      </p>
                      <p className="text-xs text-slate-600">
                        Manager Signature: ________________________
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Print Button */}
              <div className="flex justify-center gap-2 print:hidden">
                <Button
                  onClick={() => window.print()}
                  disabled={printing}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
