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
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";
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
import { Switch } from "@/components/ui/switch";
import {
  getBoms,
  createBom,
  deleteBom,
  updateBomStatus,
  getProducts,
  getBOMHierarchy,
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
  hasBom?: boolean;
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
  isSubAssembly: boolean;
  createdAt: Date;
}

// Tree Node Component
function TreeNode({ node, level = 0 }: { node: any; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 1);

  return (
    <div className="ml-4 border-l border-nexabook-200 pl-4 py-1">
      <div className="flex items-center gap-2 group">
        {node.children && node.children.length > 0 ? (
          <button onClick={() => setIsOpen(!isOpen)} className="text-nexabook-400 hover:text-nexabook-600 transition-colors">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <div className="flex items-center gap-2 flex-1">
          {node.isSubAssembly ? (
            <Layers className="h-4 w-4 text-blue-500" />
          ) : (
            <Package className="h-4 w-4 text-nexabook-400" />
          )}
          <span className="text-sm font-medium text-nexabook-900">{node.name}</span>
          <span className="text-xs text-nexabook-500 font-mono">({node.sku})</span>
          <Badge variant="outline" className="text-[10px] h-5 bg-nexabook-50">
            {node.quantity} {node.unit}
          </Badge>
          {node.isSubAssembly && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-5">
              Sub-Assembly
            </Badge>
          )}
        </div>
      </div>
      {isOpen && node.children && (
        <div className="mt-1">
          {node.children.map((child: any, idx: number) => (
            <TreeNode key={idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BOMPage() {
  const [boms, setBoms] = useState<BomRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingHierarchy, setViewingHierarchy] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState<BomFormData & { isSubAssembly: boolean }>({
    name: "",
    code: "",
    finishedGoodId: "",
    quantity: 1,
    instructions: "",
    isSubAssembly: false,
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
        setProducts(productsRes.data as Product[]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Handle viewing hierarchy
  const handleViewHierarchy = async (bomId: string) => {
    const hierarchy = await getBOMHierarchy(bomId);
    if (hierarchy) {
      setViewingHierarchy(hierarchy);
    } else {
      alert("Failed to load BOM hierarchy");
    }
  };

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
          isSubAssembly: false,
          items: [],
        });
        await loadData();
        alert(result.message || "BOM created successfully");
      } else {
        alert(result.error || "Failed to create BOM");
      }
    } catch (error) {
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
      alert("An error occurred while updating the status");
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
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
            Manage production recipes and multi-level assemblies
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
                Define a production recipe. Supports sub-assemblies and raw materials.
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
                    Finished Good / Sub-Assembly <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.finishedGoodId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, finishedGoodId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            {product.name} ({product.sku})
                            {product.hasBom && (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-4">Sub-Assembly</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex flex-col justify-end pb-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isSubAssembly"
                      checked={formData.isSubAssembly}
                      onCheckedChange={(checked) => setFormData({ ...formData, isSubAssembly: checked })}
                    />
                    <Label htmlFor="isSubAssembly">Mark as Sub-Assembly</Label>
                  </div>
                  <p className="text-[10px] text-nexabook-500 italic mt-1 pl-1">Enable if this BOM is used as a component in other BOMs</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    Output Quantity
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
                  <Label className="text-sm font-semibold text-nexabook-900 flex items-center gap-2">
                    Components List
                    <Badge variant="outline" className="text-[10px] font-normal">Raw Materials & Sub-Assemblies</Badge>
                  </Label>
                  {formData.items.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {formData.items.length} component(s)
                    </Badge>
                  )}
                </div>

                {/* Add Component Row */}
                <div className="flex gap-2 items-end p-3 bg-nexabook-50 rounded-md border border-nexabook-100">
                  <div className="flex-1">
                    <Label className="text-xs text-nexabook-700">Select Component</Label>
                    <Select
                      value={newComponentRow.componentId}
                      onValueChange={(value) =>
                        setNewComponentRow({ ...newComponentRow, componentId: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center gap-2">
                              {product.name}
                              {product.hasBom && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-4">Sub-Assembly</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-28">
                    <Label className="text-xs text-nexabook-700">Qty Required</Label>
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
                  <div className="border border-nexabook-200 rounded-md overflow-hidden shadow-sm">
                    <table className="w-full">
                      <thead className="bg-nexabook-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Component
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Type
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Qty Required
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Total Est. Cost
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700 w-12">
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nexabook-100 bg-white">
                        {formData.items.map((item, index) => {
                          const product = products.find((p) => p.id === item.componentId);
                          const unitCost = product?.costPrice
                            ? parseFloat(product.costPrice)
                            : 0;
                          const total = unitCost * parseFloat(item.quantityRequired);

                          return (
                            <tr key={index} className="hover:bg-nexabook-50/50">
                              <td className="py-2 px-3">
                                <div className="text-sm font-medium text-nexabook-900">{product?.name || "Unknown"}</div>
                                <div className="text-[10px] text-nexabook-500">{product?.sku}</div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {product?.hasBom ? (
                                  <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] h-5">Sub-Assembly</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] h-5">Raw Material</Badge>
                                )}
                              </td>
                              <td className="py-2 px-3 text-sm text-center text-nexabook-700">
                                {item.quantityRequired} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-medium text-nexabook-900">
                                {formatCurrency(total)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeComponentRow(index)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-nexabook-50/80">
                        <tr>
                          <td
                            colSpan={3}
                            className="py-2 px-3 text-xs font-semibold text-nexabook-900 text-right uppercase tracking-wider"
                          >
                            Total Recipe Cost:
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
                      Saving...
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

      {/* Hierarchy View Dialog */}
      <Dialog open={!!viewingHierarchy} onOpenChange={(open) => !open && setViewingHierarchy(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              BOM Visual Hierarchy
            </DialogTitle>
            <DialogDescription>
              Exploded view of components and sub-assemblies for <span className="font-semibold text-nexabook-900">{viewingHierarchy?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 px-2 bg-slate-50 rounded-lg border border-slate-200">
            {viewingHierarchy && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-nexabook-900 mb-4 px-2">
                  <Package className="h-5 w-5" />
                  {viewingHierarchy.finishedGoodName} 
                  <Badge variant="secondary">Output: {viewingHierarchy.quantity} Units</Badge>
                </div>
                <div className="space-y-1">
                  {viewingHierarchy.children.map((child: any, idx: number) => (
                    <TreeNode key={idx} node={child} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingHierarchy(null)}>Close View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter */}
      <Card className="border-nexabook-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium text-nexabook-700">Status Filter:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-9">
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
          </div>
        </CardContent>
      </Card>

      {/* BOM List */}
      <Card className="border-nexabook-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-nexabook-50">
          <CardTitle className="text-xl text-nexabook-900">
            Bill of Materials ({boms.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {boms.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-nexabook-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No BOMs found
              </h3>
              <p className="text-nexabook-600 mb-6 max-w-xs mx-auto text-sm">
                You haven't created any recipes yet. Define your production process to start manufacturing.
              </p>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-nexabook-900 hover:bg-nexabook-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First BOM
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-nexabook-50/50 border-b border-nexabook-100">
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider">
                      Product / Recipe Name
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider text-center">
                      Type
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider text-center">
                      Base Qty
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider text-right">
                      Est. Unit Cost
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-nexabook-700 uppercase tracking-wider text-center w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexabook-50">
                  {boms.map((bom, index) => (
                    <motion.tr
                      key={bom.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="group hover:bg-nexabook-50/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-mono font-semibold text-nexabook-600">
                        {bom.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-nexabook-900">
                          {bom.name}
                        </div>
                        <div className="text-[11px] text-nexabook-500 font-medium">
                          FG: {bom.finishedGood?.name || "N/A"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {bom.isSubAssembly ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-semibold">Sub-Assembly</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 text-slate-500">End Product</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-nexabook-700 font-medium">
                        {bom.quantity}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-nexabook-900">
                        {formatCurrency(parseFloat(bom.totalEstimatedCost) / bom.quantity)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(bom.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewHierarchy(bom.id)}
                            className="p-1.5 rounded-md text-nexabook-600 hover:bg-nexabook-100 transition-colors"
                            title="View Hierarchy"
                          >
                            <Layers className="h-4 w-4" />
                          </button>
                          {bom.status === "draft" && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(bom.id, "active")
                              }
                              className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                              title="Activate BOM"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {bom.status === "active" && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(bom.id, "archived")
                              }
                              className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Archive BOM"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(bom.id)}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete BOM"
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
