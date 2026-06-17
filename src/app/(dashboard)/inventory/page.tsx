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
  Upload,
  Download,
  FileSpreadsheet,
  FileDown,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  getUoms,
  addUom,
  addProduct,
  addCategory,
  type ProductWithCategory,
  type ProductFormData,
  type CategoryFormData,
  type InventoryStats,
  type UomFormData,
} from "@/lib/actions/inventory";
import {
  exportProductsToExcel,
  exportProductsToCSV,
  importProductsFromCSV,
  getImportTemplate,
  type ImportRow,
} from "@/lib/actions/inventory-export";
import {
  saveProductAttributes,
  getAllAttributeNames,
  searchByAttribute,
  type ProductAttributeData,
} from "@/lib/actions/product-attributes";

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
  uoms,
  onSubmit,
  loading,
}: {
  categories: { id: string; name: string }[];
  uoms: { id: string; name: string }[];
  onSubmit: (data: ProductFormData, attributes?: ProductAttributeData[]) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    type: "product",
    unit: "Pcs",
    baseUomId: "",
    saleUomId: "",
    description: "",
    isBatchTracked: false,
    salePrice: "0",
    costPrice: "0",
    openingStock: "0",
    minStockLevel: "0",
    conversions: [],
  });

  const [altUnitId, setAltUnitId] = useState("");
  const [convFactor, setConvFactor] = useState("1");
  const [showAltUnit, setShowAltUnit] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [newUom, setNewUom] = useState("");
  const [showNewUom, setShowNewUom] = useState(false);

  // Product attributes (custom fields)
  const [attributes, setAttributes] = useState<ProductAttributeData[]>([]);

  const addAttribute = () => {
    setAttributes([...attributes, { name: "", value: "" }]);
  };

  const updateAttribute = (index: number, field: keyof ProductAttributeData, value: string) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], [field]: value };
    setAttributes(updated);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare conversions if alt unit is selected
    const finalData = { ...formData };
    if (showAltUnit && altUnitId && convFactor && formData.baseUomId) {
      finalData.conversions = [
        {
          fromUomId: altUnitId,
          toUomId: formData.baseUomId,
          conversionFactor: convFactor,
        }
      ];
      // Default sale UOM to alt unit if provided
      if (!finalData.saleUomId) {
        finalData.saleUomId = altUnitId;
      }
    } else if (formData.baseUomId && !formData.saleUomId) {
      finalData.saleUomId = formData.baseUomId;
    }

    onSubmit(finalData, attributes.filter((a) => a.name && a.value));
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

  const handleAddUom = async () => {
    if (!newUom.trim()) return;

    const result = await addUom({
      name: newUom,
      description: "",
    } as UomFormData);

    if (result.success && result.data) {
      setFormData({ ...formData, baseUomId: result.data.id });
      setNewUom("");
      setShowNewUom(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="New category"
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

        {/* Barcode */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Barcode</label>
          <Input
            value={formData.barcode || ""}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="Optional"
          />
        </div>

        {/* Batch Tracking Toggle */}
        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="batch-tracking"
            checked={formData.isBatchTracked}
            onCheckedChange={(checked) => setFormData({ ...formData, isBatchTracked: checked })}
          />
          <div className="space-y-0.5">
            <Label htmlFor="batch-tracking" className="text-sm font-medium text-nexabook-900">
              Batch Tracking
            </Label>
            <p className="text-xs text-nexabook-500">
              Enable expiry management for this product
            </p>
          </div>
        </div>
      </div>

      {/* Units & Conversions Section */}
      <div className="border-t border-b border-nexabook-100 py-4 space-y-4">
        <h3 className="text-sm font-semibold text-nexabook-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-nexabook-600" />
          Units & Conversions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexabook-900">
              Base Unit <span className="text-red-500">*</span>
              <span className="text-xs text-nexabook-500 ml-1 font-normal">(for stock tracking)</span>
            </label>
            {!showNewUom ? (
              <div className="flex gap-2">
                <Select
                  value={formData.baseUomId}
                  onValueChange={(value) => setFormData({ ...formData, baseUomId: value })}
                  required
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select base unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {uoms.map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewUom(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newUom}
                  onChange={(e) => setNewUom(e.target.value)}
                  placeholder="New unit (e.g., Kg)"
                />
                <Button type="button" size="sm" onClick={handleAddUom}>
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewUom(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Sale Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-nexabook-900">
              Default Sale Unit
            </label>
            <Select
              value={formData.saleUomId}
              onValueChange={(value) => setFormData({ ...formData, saleUomId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Same as base unit" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alternative Unit Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-nexabook-600 hover:text-nexabook-900 p-0 h-auto font-medium"
            onClick={() => setShowAltUnit(!showAltUnit)}
          >
            {showAltUnit ? "- Remove Alternative Unit" : "+ Add Alternative Unit/Conversion"}
          </Button>
        </div>

        {showAltUnit && (
          <div className="bg-nexabook-50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-nexabook-900">Alternative Unit</label>
                <Select value={altUnitId} onValueChange={setAltUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {uoms.map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-nexabook-900">Conversion Factor</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-nexabook-600 font-medium">1 {uoms.find(u => u.id === altUnitId)?.name || 'Alt Unit'} =</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={convFactor}
                    onChange={(e) => setConvFactor(e.target.value)}
                    className="w-24 h-9"
                  />
                  <span className="text-sm text-nexabook-600 font-medium">
                    {uoms.find(u => u.id === formData.baseUomId)?.name || 'Base Units'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-nexabook-500 italic">
              Example: 1 Box = 12 Pieces. Unit tracking will be in Pieces.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className="text-sm font-medium text-nexabook-900">Opening Stock (Base Unit)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.openingStock}
            onChange={(e) =>
              setFormData({ ...formData, openingStock: e.target.value })
            }
            placeholder="0"
          />
        </div>

        {/* Min Stock Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-nexabook-900">Min Stock Level (Base Unit)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.minStockLevel}
            onChange={(e) =>
              setFormData({ ...formData, minStockLevel: e.target.value })
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

      {/* Custom Attributes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-nexabook-900">Custom Attributes</label>
          <Button type="button" variant="outline" size="sm" onClick={addAttribute} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Attribute
          </Button>
        </div>
        {attributes.length === 0 ? (
          <p className="text-xs text-nexabook-500 italic">No custom attributes. Add size, color, weight, etc.</p>
        ) : (
          <div className="space-y-2">
            {attributes.map((attr, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Name (e.g. Size)"
                  value={attr.name}
                  onChange={(e) => updateAttribute(i, "name", e.target.value)}
                  className="h-8 text-xs flex-1"
                  list="attribute-names"
                />
                <Input
                  placeholder="Value (e.g. XL)"
                  value={attr.value}
                  onChange={(e) => updateAttribute(i, "value", e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeAttribute(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <datalist id="attribute-names">
              {["Size", "Color", "Weight", "Material", "Brand", "Dimensions", "Warranty"].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        )}
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
        <Button type="submit" disabled={loading} className="w-full bg-nexabook-900">
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
  const [uoms, setUoms] = useState<{ id: string; name: string }[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Attribute state
  const [attributeNames, setAttributeNames] = useState<string[]>([]);
  const [filterAttrName, setFilterAttrName] = useState("");
  const [filterAttrValue, setFilterAttrValue] = useState("");

  // Import/Export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: ImportRow[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);

    try {
      const [productsRes, categoriesRes, statsRes, uomsRes, attrNamesRes] = await Promise.all([
        getProducts(searchQuery, selectedCategory === "all" ? undefined : selectedCategory),
        getCategories(),
        getInventoryStats(),
        getUoms(),
        getAllAttributeNames(),
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

      if (uomsRes.success && uomsRes.data) {
        setUoms(uomsRes.data as { id: string; name: string }[]);
      }

      if (attrNamesRes.success && attrNamesRes.data) {
        setAttributeNames(attrNamesRes.data);
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
  const handleAddProduct = async (data: ProductFormData, attributes?: ProductAttributeData[]) => {
    setSubmitting(true);

    try {
      const result = await addProduct(data);

      if (result.success && result.data) {
        // Save attributes if provided
        if (attributes && attributes.length > 0) {
          await saveProductAttributes(result.data.id, attributes);
        }
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
    const stock = parseFloat(product.currentStock || "0");
    const minLevel = parseFloat(product.minStockLevel || "0");

    if (stock === 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    }

    if (stock <= minLevel) {
      return { label: "Low Stock", variant: "warning" as const };
    }

    return { label: "In Stock", variant: "success" as const };
  };

  // Export handlers
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const result = await exportProductsToExcel();
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = result.fileName;
        link.click();
      } else {
        alert(result.error || "Export failed");
      }
    } catch (error) {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const result = await exportProductsToCSV();
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = result.fileName;
        link.click();
      } else {
        alert(result.error || "Export failed");
      }
    } catch (error) {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Import handlers
  const handleImportFile = async (file: File) => {
    setImportFile(file);
    setImportResult(null);
    setImportPreview(null);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      alert("CSV must have a header row and data rows");
      return;
    }

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace("*", ""));

    const preview: ImportRow[] = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: ImportRow & Record<string, any> = { _rowNumber: i + 1 };
      headers.forEach((header, idx) => {
        const val = values[idx] || "";
        switch (header) {
          case "name": row.name = val; break;
          case "sku": row.sku = val; break;
          case "barcode": row.barcode = val; break;
          case "category": row.category = val; break;
          case "type": row.type = val; break;
          case "unit": row.unit = val; break;
          case "sale price": row.salePrice = val; break;
          case "cost price": row.costPrice = val; break;
          case "current stock": row.currentStock = val; break;
          case "min stock level": row.minStockLevel = val; break;
          case "tax rate (%)": row.taxRate = val; break;
          case "description": row.description = val; break;
          case "batch tracked": row.isBatchTracked = val; break;
          case "serial tracked": row.isSerialTracked = val; break;
        }
      });
      preview.push(row as ImportRow);
    }

    setImportPreview(preview);
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const result = await importProductsFromCSV(text);
      if (result.success && result.data) {
        setImportResult(result.data);
        if (result.data.imported > 0) {
          await loadData();
        }
      } else {
        alert(result.error || "Import failed");
      }
    } catch (error) {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const result = await getImportTemplate();
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "product_import_template.csv";
      link.click();
    } else {
      alert("Failed to generate template");
    }
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

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              className="border-nexabook-300"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-nexabook-200 rounded-lg shadow-lg z-50 hidden group-hover:block min-w-[160px]">
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-2 text-sm text-nexabook-700 hover:bg-nexabook-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Export as Excel
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2 text-sm text-nexabook-700 hover:bg-nexabook-50 flex items-center gap-2"
              >
                <FileDown className="h-4 w-4 text-blue-600" />
                Export as CSV
              </button>
            </div>
          </div>

          {/* Import Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setImportDialogOpen(true); setImportFile(null); setImportPreview(null); setImportResult(null); }}
            className="border-nexabook-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>

          {/* Add Product Button */}
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
                uoms={uoms}
                onSubmit={handleAddProduct}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>
        </div>
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

            {/* Attribute Filter */}
            {attributeNames.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={filterAttrName} onValueChange={(v) => { setFilterAttrName(v); setFilterAttrValue(""); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Attributes</SelectItem>
                    {attributeNames.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterAttrName && (
                  <Input
                    placeholder="Filter value..."
                    value={filterAttrValue}
                    onChange={(e) => setFilterAttrValue(e.target.value)}
                    className="w-[140px] h-9 text-xs"
                  />
                )}
              </div>
            )}
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
                    const stock = parseFloat(product.currentStock || "0");
                    const minLevel = parseFloat(product.minStockLevel || "0");
                    const isLowStock =
                      stock > 0 &&
                      stock <= minLevel;

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
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-nexabook-600" />
              Import Products
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import products.{" "}
              <button onClick={handleDownloadTemplate} className="text-blue-600 underline hover:text-blue-800">
                Download template
              </button>
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-4 py-4">
              {/* File Upload */}
              <div
                className="border-2 border-dashed border-nexabook-300 rounded-lg p-8 text-center hover:border-nexabook-500 transition-colors cursor-pointer"
                onClick={() => document.getElementById("csv-file-input")?.click()}
              >
                <Upload className="h-10 w-10 text-nexabook-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-nexabook-700 mb-1">
                  {importFile ? importFile.name : "Click to upload CSV file"}
                </p>
                <p className="text-xs text-nexabook-500">Supports .csv files</p>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                />
              </div>

              {/* Preview */}
              {importPreview && importPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-nexabook-900 mb-2">
                    Preview ({importPreview.length} rows)
                  </h4>
                  <div className="overflow-x-auto border border-nexabook-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-nexabook-50">
                        <tr>
                          <th className="px-2 py-1 text-left">#</th>
                          <th className="px-2 py-1 text-left">Name</th>
                          <th className="px-2 py-1 text-left">SKU</th>
                          <th className="px-2 py-1 text-left">Category</th>
                          <th className="px-2 py-1 text-right">Price</th>
                          <th className="px-2 py-1 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr key={i} className="border-t border-nexabook-100">
                            <td className="px-2 py-1 text-nexabook-500">{row._rowNumber}</td>
                            <td className="px-2 py-1 font-medium">{row.name}</td>
                            <td className="px-2 py-1 font-mono">{row.sku}</td>
                            <td className="px-2 py-1">{row.category || "-"}</td>
                            <td className="px-2 py-1 text-right">{row.salePrice || "0"}</td>
                            <td className="px-2 py-1 text-right">{row.currentStock || "0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImportConfirm}
                  disabled={!importFile || importing}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Products
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Import Results */
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Import Complete</p>
                  <p className="text-sm text-green-700">
                    {importResult.imported} product{importResult.imported !== 1 ? "s" : ""} imported successfully
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}
                  </h4>
                  <div className="border border-red-200 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-2 py-1 text-left">Row</th>
                          <th className="px-2 py-1 text-left">Name</th>
                          <th className="px-2 py-1 text-left">SKU</th>
                          <th className="px-2 py-1 text-left">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((row, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="px-2 py-1 text-red-500">{row._rowNumber}</td>
                            <td className="px-2 py-1">{row.name || "-"}</td>
                            <td className="px-2 py-1 font-mono">{row.sku || "-"}</td>
                            <td className="px-2 py-1">
                              <ul className="list-disc list-inside text-red-600">
                                {row._errors?.map((err, j) => (
                                  <li key={j}>{err}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button onClick={() => setImportDialogOpen(false)} className="bg-nexabook-900 hover:bg-nexabook-800">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
