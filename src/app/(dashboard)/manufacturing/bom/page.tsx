"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  Loader2,
  FileText,
  Trash2,
  CheckCircle,
  Archive,
  ChevronDown,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  getBoms,
  createBom,
  deleteBom,
  updateBomStatus,
  getProducts,
  type BomFormData,
  type BomItemInput,
} from "@/lib/actions/manufacturing";

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: string | null;
  currentStock: number | null;
  unit: string | null;
  type: string;
}

interface BomRow {
  id: string;
  name: string;
  code: string;
  finishedGood: {
    id: string;
    name: string;
    sku: string;
    costPrice: string | null;
  } | null;
  quantity: number;
  totalEstimatedCost: string;
  status: string;
  createdAt: Date;
}

export default function BOMPage() {
  const [boms, setBoms] = useState<BomRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [formData, setFormData] = useState<BomFormData>({
    name: "",
    code: "",
    finishedGoodId: "",
    quantity: 1,
    instructions: "",
    items: [],
  });

  const [newComponentRow, setNewComponentRow] = useState<{
    componentId: string;
    quantityRequired: string;
    unit: string;
  }>({
    componentId: "",
    quantityRequired: "1",
    unit: "Pcs",
  });

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [bomsRes, productsRes] = await Promise.all([
        getBoms(statusFilter === "all" ? undefined : statusFilter),
        getProducts(),
      ]);

      if (bomsRes.success && bomsRes.data) {
        setBoms(bomsRes.data as unknown as BomRow[]);
      }

      if (productsRes.success && productsRes.data) {
        const productData = productsRes.data as Product[];
        // Filter only products (not services)
        setProducts(productData.filter((p) => p.type === "product"));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Calculate total estimated cost
  const calculateTotalCost = () => {
    let total = 0;
    formData.items.forEach((item) => {
      const product = products.find((p) => p.id === item.componentId);
      if (product && product.costPrice) {
        total += parseFloat(product.costPrice) * parseFloat(item.quantityRequired);
      }
    });
    return total;
  };

  // Add component row
  const addComponentRow = () => {
    if (!newComponentRow.componentId) {
      alert("Please select a component");
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          componentId: newComponentRow.componentId,
          quantityRequired: newComponentRow.quantityRequired,
          unit: newComponentRow.unit,
        },
      ],
    });

    // Reset new component row
    setNewComponentRow({
      componentId: "",
      quantityRequired: "1",
      unit: "Pcs",
    });
  };

  // Remove component row
  const removeComponentRow = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code || !formData.finishedGoodId) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.items.length === 0) {
      alert("Please add at least one component");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBom(formData);

      if (result.success) {
        setAddDialogOpen(false);
        setFormData({
          name: "",
          code: "",
          finishedGoodId: "",
          quantity: 1,
          instructions: "",
          items: [],
        });
        await loadData();
        alert(result.message || "BOM created successfully");
      } else {
        alert(result.error || "Failed to create BOM");
      }
    } catch (error) {
      console.error("Error creating BOM:", error);
      alert("An error occurred while creating the BOM");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete BOM
  const handleDelete = async (bomId: string) => {
    if (!confirm("Are you sure you want to delete this BOM?")) return;

    try {
      const result = await deleteBom(bomId);
      if (result.success) {
        await loadData();
        alert(result.message || "BOM deleted successfully");
      } else {
        alert(result.error || "Failed to delete BOM");
      }
    } catch (error) {
      console.error("Error deleting BOM:", error);
      alert("An error occurred while deleting the BOM");
    }
  };

  // Handle status update
  const handleStatusUpdate = async (bomId: string, status: "draft" | "active" | "archived") => {
    try {
      const result = await updateBomStatus(bomId, status);
      if (result.success) {
        await loadData();
        alert(result.message || "Status updated successfully");
      } else {
        alert(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("An error occurred while updating the status");
    }
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

  // Status badge config
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any; icon: any }> = {
      draft: { label: "Draft", variant: "outline" as const, icon: FileText },
      active: { label: "Active", variant: "success" as const, icon: CheckCircle },
      archived: { label: "Archived", variant: "secondary" as const, icon: Archive },
    };

    const { label, variant, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant={variant} className="text-xs gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  // Loading state
  if (loading && !boms.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading BOMs...</p>
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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">Bill of Materials</h1>
          <p className="text-nexabook-600 mt-1">
            Manage production recipes and component lists
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-nexabook-900 hover:bg-nexabook-800">
              <Plus className="mr-2 h-4 w-4" />
              Create BOM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New BOM</DialogTitle>
              <DialogDescription>
                Define a production recipe with finished good and required components
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    BOM Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard Widget Assembly"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    BOM Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., BOM-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    Finished Good <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.finishedGoodId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, finishedGoodId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select finished good" />
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    Base Quantity
                  </Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    min="1"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-nexabook-900">
                  Instructions
                </Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  placeholder="Assembly instructions, notes, etc."
                  rows={2}
                />
              </div>

              {/* Components Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-nexabook-900">
                    Components (Raw Materials)
                  </Label>
                  {formData.items.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {formData.items.length} component(s)
                    </Badge>
                  )}
                </div>

                {/* Add Component Row */}
                <div className="flex gap-2 items-end p-3 bg-nexabook-50 rounded-md">
                  <div className="flex-1">
                    <Label className="text-xs text-nexabook-700">Component</Label>
                    <Select
                      value={newComponentRow.componentId}
                      onValueChange={(value) =>
                        setNewComponentRow({ ...newComponentRow, componentId: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select component" />
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

                  <div className="w-28">
                    <Label className="text-xs text-nexabook-700">Qty</Label>
                    <Input
                      type="number"
                      value={newComponentRow.quantityRequired}
                      onChange={(e) =>
                        setNewComponentRow({
                          ...newComponentRow,
                          quantityRequired: e.target.value,
                        })
                      }
                      min="0.01"
                      step="0.01"
                      className="h-9"
                    />
                  </div>

                  <div className="w-20">
                    <Label className="text-xs text-nexabook-700">Unit</Label>
                    <Input
                      value={newComponentRow.unit}
                      onChange={(e) =>
                        setNewComponentRow({ ...newComponentRow, unit: e.target.value })
                      }
                      className="h-9"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addComponentRow}
                    className="h-9"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Components Table */}
                {formData.items.length > 0 && (
                  <div className="border border-nexabook-200 rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-nexabook-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Component
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Qty Required
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Unit Cost
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Total
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700 w-12">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nexabook-100">
                        {formData.items.map((item, index) => {
                          const product = products.find((p) => p.id === item.componentId);
                          const unitCost = product?.costPrice
                            ? parseFloat(product.costPrice)
                            : 0;
                          const total = unitCost * parseFloat(item.quantityRequired);

                          return (
                            <tr key={index} className="hover:bg-nexabook-50">
                              <td className="py-2 px-3 text-sm text-nexabook-900">
                                {product?.name || "Unknown"}
                              </td>
                              <td className="py-2 px-3 text-sm text-center text-nexabook-700">
                                {item.quantityRequired}
                              </td>
                              <td className="py-2 px-3 text-sm text-center text-nexabook-700">
                                {formatCurrency(unitCost)}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-medium text-nexabook-900">
                                {formatCurrency(total)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeComponentRow(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-nexabook-50">
                        <tr>
                          <td
                            colSpan={3}
                            className="py-2 px-3 text-sm font-semibold text-nexabook-900 text-right"
                          >
                            Total Estimated Cost:
                          </td>
                          <td className="py-2 px-3 text-sm font-bold text-nexabook-900 text-right">
                            {formatCurrency(calculateTotalCost())}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create BOM"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-nexabook-700">Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BOMs</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* BOM List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            BOMs ({boms.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {boms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No BOMs found
              </h3>
              <p className="text-nexabook-600 mb-4">
                Get started by creating your first Bill of Materials
              </p>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-nexabook-900 hover:bg-nexabook-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create BOM
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Code
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Finished Good
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Base Qty
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Est. Cost
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map((bom, index) => (
                    <motion.tr
                      key={bom.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-mono text-nexabook-900">
                        {bom.code}
                      </td>
                      <td className="py-3 px-4 text-sm text-nexabook-900">
                        {bom.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-nexabook-700">
                        {bom.finishedGood?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-nexabook-700">
                        {bom.quantity}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-nexabook-900">
                        {formatCurrency(parseFloat(bom.totalEstimatedCost))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(bom.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {bom.status === "draft" && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(bom.id, "active")
                              }
                              className="text-blue-600 hover:text-blue-800"
                              title="Activate"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {bom.status === "active" && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(bom.id, "archived")
                              }
                              className="text-amber-600 hover:text-amber-800"
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(bom.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
