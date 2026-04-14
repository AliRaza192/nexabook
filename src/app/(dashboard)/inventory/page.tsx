"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  Filter,
  Loader2,
  PackageOpen,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPKR } from "@/lib/utils/number-format";
import {
  getProducts,
  getCategories,
  getInventoryStats,
  addProduct,
  addCategory,
  type ProductWithCategory,
  type ProductFormData,
  type CategoryFormData,
  type InventoryStats,
} from "@/lib/actions/inventory";

// Product interface for table
interface ProductTableRow extends ProductWithCategory {}

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

// Add Product Form Component
function AddProductForm({
  categories,
  onSubmit,
  loading,
}: {
  categories: { id: string; name: string }[];
  onSubmit: (data: ProductFormData) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    type: "product",
    unit: "Pcs",
    description: "",
    salePrice: "0",
    costPrice: "0",
    openingStock: 0,
    minStockLevel: 0,
  });

  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    const result = await addCategory({
      name: newCategory,
      description: "",
    } as CategoryFormData);

    if (result.success && result.data) {
      setFormData({ ...formData, categoryId: result.data.id });
      setNewCategory("");
      setShowNewCategory(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Product Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">
            Product Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
            required
          />
        </div>

        {/* SKU */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">
            SKU <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="e.g., PRD-001"
            required
          />
        </div>

        {/* Barcode */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Barcode</label>
          <Input
            value={formData.barcode || ""}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="Optional"
          />
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Unit</label>
          <Select
            value={formData.unit}
            onValueChange={(value) => setFormData({ ...formData, unit: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pcs">Pieces (Pcs)</SelectItem>
              <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
              <SelectItem value="Ltr">Liter (Ltr)</SelectItem>
              <SelectItem value="Mtr">Meter (Mtr)</SelectItem>
              <SelectItem value="Box">Box</SelectItem>
              <SelectItem value="Dozen">Dozen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Category</label>
          {!showNewCategory ? (
            <div className="flex gap-2">
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCategory(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
              />
              <Button type="button" size="sm" onClick={handleAddCategory}>
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCategory(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Sale Price */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">
            Sale Price <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.salePrice}
            onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        {/* Cost Price */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">
            Cost Price <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.costPrice}
            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        {/* Opening Stock */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Opening Stock</label>
          <Input
            type="number"
            value={formData.openingStock}
            onChange={(e) =>
              setFormData({ ...formData, openingStock: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>

        {/* Min Stock Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Min Stock Level</label>
          <Input
            type="number"
            value={formData.minStockLevel}
            onChange={(e) =>
              setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-nexabook-900">Description</label>
        <textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Product description (optional)"
          className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-nexabook-500"
        />
      </div>

      {/* Accounting Note */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> This product will be linked to the &apos;Inventory Asset&apos; account
          in your Chart of Accounts for proper accounting integration.
        </p>
      </div>

      {/* Submit Button */}
      <DialogFooter>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Product...
            </>
          ) : (
            "Add Product"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Main Inventory Page Component
export default function InventoryPage() {
  const [products, setProducts] = useState<ProductTableRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);

    try {
      const [productsRes, categoriesRes, statsRes] = await Promise.all([
        getProducts(searchQuery, selectedCategory === "all" ? undefined : selectedCategory),
        getCategories(),
        getInventoryStats(),
      ]);

      if (productsRes.success && productsRes.data) {
        setProducts(productsRes.data as ProductTableRow[]);
      }

      if (categoriesRes.success && categoriesRes.data) {
        setCategories(
          categoriesRes.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
          }))
        );
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedCategory]);

  // Handle add product
  const handleAddProduct = async (data: ProductFormData) => {
    setSubmitting(true);

    try {
      const result = await addProduct(data);

      if (result.success) {
        setAddDialogOpen(false);
        await loadData();
      } else {
        alert(result.error || "Failed to add product");
      }
    } catch (error) {
      alert("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  // Get stock status
  const getStockStatus = (product: ProductTableRow) => {
    const stock = product.currentStock || 0;
    const minLevel = product.minStockLevel || 0;

    if (stock === 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    }

    if (stock <= minLevel) {
      return { label: "Low Stock", variant: "warning" as const };
    }

    return { label: "In Stock", variant: "success" as const };
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  if (loading && !products.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading inventory...</p>
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
          <h1 className="text-3xl font-bold text-nexabook-900">Inventory Management</h1>
          <p className="text-nexabook-600 mt-1">
            Manage your products, track stock levels, and monitor inventory health.
          </p>
        </div>

        {/* Add Product Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-nexabook-900 hover:bg-nexabook-800">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Fill in the product details below. This product will be automatically linked to
                your inventory system.
              </DialogDescription>
            </DialogHeader>
            <AddProductForm
              categories={categories}
              onSubmit={handleAddProduct}
              loading={submitting}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Items"
            value={stats.totalItems}
            icon={Package}
            description="Products in inventory"
            color="blue"
          />
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={AlertTriangle}
            description="Items below minimum level"
            color="orange"
          />
          <StatCard
            title="Total Stock Value"
            value={formatCurrency(stats.totalStockValue)}
            icon={DollarSign}
            description="Based on cost price"
            color="green"
          />
        </div>
      )}

      {/* Low Stock Alert Banner */}
      {stats && stats.lowStockItems > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-orange-900">Low Stock Alert</h3>
            <p className="text-sm text-orange-800 mt-1">
              {stats.lowStockItems} {stats.lowStockItems === 1 ? "product is" : "products are"}{" "}
              at or below the minimum stock level. Consider restocking soon.
            </p>
          </div>
        </motion.div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search by product name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-nexabook-600" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <PackageOpen className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No products found
              </h3>
              <p className="text-nexabook-600 mb-4">
                {searchQuery || selectedCategory !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first product"}
              </p>
              {!searchQuery && selectedCategory === "all" && (
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Product
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      SKU
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Stock
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => {
                    const status = getStockStatus(product);
                    const stock = product.currentStock || 0;
                    const isLowStock =
                      stock > 0 &&
                      product.minStockLevel !== null &&
                      stock <= (product.minStockLevel || 0);

                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors ${
                          isLowStock ? "bg-orange-50/50" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Placeholder Image */}
                            <div className="h-10 w-10 rounded-lg bg-nexabook-100 flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-nexabook-600" />
                            </div>
                            <div>
                              <p className="font-medium text-nexabook-900 text-sm">
                                {product.name}
                              </p>
                              {product.unit && (
                                <p className="text-xs text-nexabook-500">Unit: {product.unit}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-nexabook-100 px-2 py-1 rounded">
                            {product.sku}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          {product.category ? (
                            <Badge variant="outline" className="text-xs">
                              {product.category.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-nexabook-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p className="font-medium text-nexabook-900">
                              {formatCurrency(parseFloat(product.salePrice || "0"))}
                            </p>
                            {product.costPrice && (
                              <p className="text-xs text-nexabook-500">
                                Cost: {formatCurrency(parseFloat(product.costPrice))}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p
                              className={`font-semibold ${
                                stock === 0
                                  ? "text-red-600"
                                  : isLowStock
                                  ? "text-orange-600"
                                  : "text-nexabook-900"
                              }`}
                            >
                              {stock}
                            </p>
                            {product.minStockLevel !== null &&
                              product.minStockLevel !== undefined && (
                                <p className="text-xs text-nexabook-500">
                                  Min: {product.minStockLevel}
                                </p>
                              )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
