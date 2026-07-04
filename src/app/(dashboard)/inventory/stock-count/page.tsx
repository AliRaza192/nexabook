"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Search,
  Loader2,
  Eye,
  Trash2,
  CheckCircle,
  FileText,
  Calendar,
  AlertCircle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import {
  getStockCounts,
  createStockCount,
  deleteStockCount,
  completeStockCount,
  getStockCountById,
  getProductsForStockCount,
  type StockCountWithItems,
} from "@/lib/actions/stock-count";

// Stock Count interface
interface StockCount {
  id: string;
  countNumber: string;
  countDate: Date;
  status: string;
  notes?: string;
  createdBy?: string;
  completedAt?: Date;
  completedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  currentStock: number | null;
  costPrice: string | null;
  unit: string | null;
}

interface StockCountItemRow {
  id: string;
  productId: string;
  productName: string | null;
  productSku: string | null;
  systemQty: string;
  countedQty: string | null;
  variance: string | null;
  unitCost: string | null;
  varianceValue: string | null;
  notes: string | null;
}

// Stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  color: "blue" | "orange" | "green";
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      border: "border-blue-200",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      border: "border-orange-200",
    },
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      border: "border-green-200",
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border ${colors.border} hover:shadow-md transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-nexabook-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-nexabook-900">{value}</p>
              <p className="text-xs text-nexabook-500 mt-2">{description}</p>
            </div>
            <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${colors.icon}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// New Stock Count Form Component
function NewStockCountForm({
  products,
  onSubmit,
  loading,
}: {
  products: ProductOption[];
  onSubmit: (data: { countDate: string; notes?: string; items: { productId: string }[] }) => void;
  loading: boolean;
}) {
  const [countDate, setCountDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const selectAll = () => {
    setSelectedProducts(filteredProducts.map((p) => p.id));
  };

  const deselectAll = () => {
    setSelectedProducts([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      countDate,
      notes: notes || undefined,
      items: selectedProducts.map((id) => ({ productId: id })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Count Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-nexabook-900">
          Stock Count Date <span className="text-red-500">*</span>
        </label>
        <Input
          type="date"
          value={countDate}
          onChange={(e) => setCountDate(e.target.value)}
          required
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-nexabook-900">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this stock count..."
          className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-nexabook-500"
        />
      </div>

      {/* Product Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-nexabook-900">
            Select Products <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
              Clear
            </Button>
          </div>
        </div>

        {/* Search Products */}
        <Input
          type="search"
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-2"
        />

        {/* Product List */}
        <div className="border rounded-md max-h-[300px] overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-sm text-nexabook-500">No products found</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-nexabook-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAll() : deselectAll()
                      }
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                    Product
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                    SKU
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-nexabook-700">
                    Current Stock
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors cursor-pointer ${
                      selectedProducts.includes(product.id) ? "bg-blue-50" : ""
                    }`}
                    onClick={() => toggleProduct(product.id)}
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-2 px-3 text-sm text-nexabook-900">{product.name}</td>
                    <td className="py-2 px-3">
                      <code className="text-xs bg-nexabook-100 px-2 py-1 rounded">
                        {product.sku}
                      </code>
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-medium">
                      {product.currentStock || 0} {product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-nexabook-500">
          {selectedProducts.length} product(s) selected
        </p>
      </div>

      {/* Submit Button */}
      <DialogFooter>
        <Button type="submit" disabled={loading || selectedProducts.length === 0} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Stock Count...
            </>
          ) : (
            <>
              <ClipboardList className="mr-2 h-4 w-4" />
              Create Stock Count
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Stock Count Detail View Component
function StockCountDetailView({
  stockCountId,
  onClose,
}: {
  stockCountId: string;
  onClose: () => void;
}) {
  const [stockCount, setStockCount] = useState<StockCountWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getStockCountById(stockCountId);
      if (result.success && result.data) {
        setStockCount(result.data);
      }
      setLoading(false);
    };
    fetchData();
  }, [stockCountId]);

  const handleComplete = async () => {
    if (!confirm("Are you sure you want to complete this stock count? This will update inventory levels.")) {
      return;
    }

    setCompleting(true);
    const result = await completeStockCount(stockCountId);
    setCompleting(false);

    if (result.success) {
      alert(result.message);
      // Refresh data
      const refreshResult = await getStockCountById(stockCountId);
      if (refreshResult.success && refreshResult.data) {
        setStockCount(refreshResult.data);
      }
    } else {
      alert(result.error || "Failed to complete stock count");
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  const handleExcelExport = () => {
    if (!stockCount) return;

    const dateStr = new Date(stockCount.countDate).toISOString().split("T")[0];
    const fileName = `StockCount-${stockCount.countNumber}-${dateStr}`;

    // Prepare data for Excel export
    const exportData = stockCount.items.map((item) => ({
      "Product": item.productName || "N/A",
      "SKU": item.productSku || "N/A",
      "System Qty": parseFloat(item.systemQty || "0"),
      "Counted Qty": item.countedQty ? parseFloat(item.countedQty) : "",
      "Variance": item.variance ? parseFloat(item.variance) : "",
      "Unit Cost": item.unitCost ? parseFloat(item.unitCost) : 0,
      "Variance Value": item.varianceValue ? parseFloat(item.varianceValue) : 0,
    }));

    // Use the exportToExcel utility
    import("@/lib/excel-export").then(({ exportToExcel }) => {
      exportToExcel({
        data: exportData,
        columns: [
          { header: "Product", key: "Product" },
          { header: "SKU", key: "SKU" },
          { header: "System Qty", key: "System Qty" },
          { header: "Counted Qty", key: "Counted Qty" },
          { header: "Variance", key: "Variance" },
          { header: "Unit Cost", key: "Unit Cost" },
          { header: "Variance Value", key: "Variance Value" },
        ],
        fileName,
        sheetName: "Stock Count",
        title: `Stock Count: ${stockCount.countNumber}`,
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
      </div>
    );
  }

  if (!stockCount) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-nexabook-600">Stock count not found</p>
      </div>
    );
  }

  const isCompleted = stockCount.status === "completed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-nexabook-900">{stockCount.countNumber}</h2>
          <p className="text-sm text-nexabook-600 mt-1">
            Count Date: {new Date(stockCount.countDate).toLocaleDateString()}
            {isCompleted && (
              <span className="ml-2">
                | Completed: {stockCount.completedAt?.toLocaleDateString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing}>
            <FileText className="mr-2 h-4 w-4" />
            Print Count Sheet
          </Button>
          <ReportExportButtons
            reportTitle={`Stock Count ${stockCount.countNumber}`}
            onExportExcel={handleExcelExport}
          />
          {!isCompleted && (
            <Button
              variant="default"
              size="sm"
              onClick={handleComplete}
              disabled={completing}
              className="bg-green-600 hover:bg-green-700"
            >
              {completing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Stock Count
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Notes */}
      {stockCount.notes && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Notes:</strong> {stockCount.notes}
          </p>
        </div>
      )}

      {/* Stock Count Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Stock Count Items ({stockCount.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockCount.items.length === 0 ? (
            <div className="text-center py-8 text-nexabook-500">
              No items found in this stock count
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table id="stock-count-items-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Counted Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Variance Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockCount.items.map((item) => {
                    const variance = item.variance ? parseFloat(item.variance) : null;
                    const varianceValue = item.varianceValue
                      ? parseFloat(item.varianceValue)
                      : null;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName || "N/A"}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-nexabook-100 px-2 py-1 rounded">
                            {item.productSku || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(item.systemQty || "0")}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.countedQty !== null && item.countedQty !== undefined
                            ? parseFloat(item.countedQty)
                            : isCompleted
                            ? "Not Counted"
                            : (
                                <Input
                                  type="number"
                                  defaultValue={parseFloat(item.systemQty || "0")}
                                  className="w-24 text-right"
                                  onBlur={(e) => {
                                    // This would need a server action to save
                                    // For now, just visual
                                  }}
                                />
                              )}
                        </TableCell>
                        <TableCell className="text-right">
                          {variance !== null ? (
                            <span
                              className={`font-semibold ${
                                variance < 0
                                  ? "text-red-600"
                                  : variance > 0
                                  ? "text-green-600"
                                  : "text-nexabook-900"
                              }`}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance}
                            </span>
                          ) : (
                            <span className="text-nexabook-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {varianceValue !== null ? (
                            <span
                              className={`font-semibold ${
                                varianceValue < 0
                                  ? "text-red-600"
                                  : varianceValue > 0
                                  ? "text-green-600"
                                  : "text-nexabook-900"
                              }`}
                            >
                              {new Intl.NumberFormat("en-PK", {
                                style: "currency",
                                currency: "PKR",
                              }).format(varianceValue)}
                            </span>
                          ) : (
                            <span className="text-nexabook-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {isCompleted && stockCount.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-900">{stockCount.items.length}</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">Items Counted</p>
                <p className="text-2xl font-bold text-green-900">
                  {stockCount.items.filter((i) => i.countedQty !== null).length}
                </p>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-600">Items with Variance</p>
                <p className="text-2xl font-bold text-orange-900">
                  {stockCount.items.filter((i) => {
                    const v = i.variance ? parseFloat(i.variance) : 0;
                    return v !== 0;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Print Count Sheet Component (for manual warehouse counting)
function PrintCountSheet({
  stockCountId,
}: {
  stockCountId: string;
}) {
  const [stockCount, setStockCount] = useState<StockCountWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getStockCountById(stockCountId);
      if (result.success && result.data) {
        setStockCount(result.data);
      }
      setLoading(false);
    };
    fetchData();
  }, [stockCountId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
      </div>
    );
  }

  if (!stockCount) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-nexabook-600">Stock count not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-nexabook-900">{stockCount.countNumber}</h2>
        <p className="text-sm text-nexabook-600">
          Count Date: {new Date(stockCount.countDate).toLocaleDateString()}
        </p>
        {stockCount.notes && (
          <p className="text-sm text-nexabook-500 mt-2">Notes: {stockCount.notes}</p>
        )}
      </div>

      <table className="w-full border" id="print-count-sheet-table">
        <thead>
          <tr className="bg-nexabook-900 text-white">
            <th className="text-left py-3 px-4 text-sm font-semibold">#</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">Product</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">SKU</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">System Qty</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">Counted Qty</th>
            <th className="text-left py-3 px-4 text-sm font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {stockCount.items.map((item, index) => (
            <tr key={item.id} className="border-b border-nexabook-200">
              <td className="py-3 px-4 text-sm">{index + 1}</td>
              <td className="py-3 px-4 text-sm font-medium">{item.productName || "N/A"}</td>
              <td className="py-3 px-4">
                <code className="text-xs bg-nexabook-100 px-2 py-1 rounded">
                  {item.productSku || "N/A"}
                </code>
              </td>
              <td className="py-3 px-4 text-sm text-right">
                {parseFloat(item.systemQty || "0")}
              </td>
              <td className="py-3 px-4 text-sm text-right">
                {/* Blank for manual counting */}
              </td>
              <td className="py-3 px-4 text-sm">
                {/* Blank for remarks */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 pt-4 border-t border-nexabook-200">
        <p className="text-sm text-nexabook-600">
          <strong>Counted By:</strong> ________________________ &nbsp;&nbsp;&nbsp;
          <strong>Date:</strong> ________________________
        </p>
        <p className="text-sm text-nexabook-600 mt-4">
          <strong>Verified By:</strong> ________________________ &nbsp;&nbsp;&nbsp;
          <strong>Date:</strong> ________________________
        </p>
      </div>
    </div>
  );
}

// Main Stock Count Page Component
export default function StockCountPage() {
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStockCount, setSelectedStockCount] = useState<string | null>(null);
  const [printSheetDialogOpen, setPrintSheetDialogOpen] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);

    try {
      const [countsRes, productsRes] = await Promise.all([
        getStockCounts(),
        getProductsForStockCount(),
      ]);

      if (countsRes.success && countsRes.data) {
        setStockCounts(countsRes.data as StockCount[]);
      }

      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data as ProductOption[]);
      }
    } catch (error) {
      console.error("Error loading stock counts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle create stock count
  const handleCreateStockCount = async (data: {
    countDate: string;
    notes?: string;
    items: { productId: string }[];
  }) => {
    setSubmitting(true);

    try {
      const result = await createStockCount(data);

      if (result.success) {
        setCreateDialogOpen(false);
        await loadData();
      } else {
        alert(result.error || "Failed to create stock count");
      }
    } catch (error) {
      alert("Failed to create stock count");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete stock count
  const handleDeleteStockCount = async (stockCountId: string) => {
    if (!confirm("Are you sure you want to delete this stock count? This action cannot be undone.")) {
      return;
    }

    const result = await deleteStockCount(stockCountId);

    if (result.success) {
      await loadData();
    } else {
      alert(result.error || "Failed to delete stock count");
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="text-xs">
            Draft
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="success" className="text-xs">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const totalCounts = stockCounts.length;
  const draftCounts = stockCounts.filter((c) => c.status === "draft").length;
  const completedCounts = stockCounts.filter((c) => c.status === "completed").length;

  if (loading && !stockCounts.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading stock counts...</p>
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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-nexabook-900">Physical Stock Count</h1>
          <p className="text-nexabook-600 mt-1">
            Conduct stock counts, compare system quantities with physical counts, and adjust
            inventory levels.
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={printSheetDialogOpen} onOpenChange={setPrintSheetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white">
                <FileText className="mr-2 h-4 w-4" />
                Print Count Sheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Stock Count to Print</DialogTitle>
                <DialogDescription>
                  Choose a stock count to print a blank count sheet for manual warehouse counting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {stockCounts.length === 0 ? (
                  <p className="text-center text-nexabook-500 py-4">
                    No stock counts available. Create one first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stockCounts.map((count) => (
                      <button
                        key={count.id}
                        className="w-full p-4 border rounded-lg hover:bg-nexabook-50 transition-colors text-left flex items-center justify-between"
                        onClick={() => {
                          setPrintSheetDialogOpen(false);
                          setSelectedStockCount(count.id);
                          // Open print view
                          setTimeout(() => {
                            window.print();
                          }, 300);
                        }}
                      >
                        <div>
                          <p className="font-semibold text-nexabook-900">{count.countNumber}</p>
                          <p className="text-sm text-nexabook-600">
                            {new Date(count.countDate).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(count.status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                <Plus className="mr-2 h-4 w-4" />
                New Stock Count
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Stock Count</DialogTitle>
                <DialogDescription>
                  Select a date and the products to include in this stock count. System quantities
                  will be automatically populated.
                </DialogDescription>
              </DialogHeader>
              <NewStockCountForm
                products={products}
                onSubmit={handleCreateStockCount}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Stock Counts"
          value={totalCounts}
          icon={ClipboardList}
          description="All stock counts"
          color="blue"
        />
        <StatCard
          title="Draft Counts"
          value={draftCounts}
          icon={FileText}
          description="Pending completion"
          color="orange"
        />
        <StatCard
          title="Completed Counts"
          value={completedCounts}
          icon={CheckCircle}
          description="Processed and finalized"
          color="green"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
            <Input
              type="search"
              placeholder="Search by count number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Counts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Stock Counts ({stockCounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockCounts.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No stock counts found
              </h3>
              <p className="text-nexabook-600 mb-4">
                Get started by creating your first stock count
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-nexabook-900 hover:bg-nexabook-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Stock Count
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table id="stock-counts-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Count Number</TableHead>
                    <TableHead>Count Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockCounts
                    .filter(
                      (count) =>
                        count.countNumber.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((count, index) => (
                      <TableRow key={count.id}>
                        <TableCell className="font-medium text-nexabook-900">
                          {count.countNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(count.countDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(count.status)}</TableCell>
                        <TableCell className="text-sm text-nexabook-600">
                          {count.createdBy || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-nexabook-600">
                          {count.completedAt
                            ? new Date(count.completedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStockCount(count.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {count.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStockCount(count.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Count Detail Dialog */}
      {selectedStockCount && (
        <Dialog open={!!selectedStockCount} onOpenChange={() => setSelectedStockCount(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Stock Count Details</DialogTitle>
            </DialogHeader>
            <StockCountDetailView
              stockCountId={selectedStockCount}
              onClose={() => setSelectedStockCount(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
