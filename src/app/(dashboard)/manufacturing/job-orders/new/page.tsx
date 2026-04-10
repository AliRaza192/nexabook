"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Loader2,
  FileText,
  CheckCircle,
  Play,
  Trash2,
  Package,
  AlertTriangle,
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
  getJobOrders,
  createJobOrder,
  deleteJobOrder,
  completeJobOrder,
  getNextJobOrderNumber,
  getBoms,
  type JobOrderFormData,
} from "@/lib/actions/manufacturing";

interface BomSelect {
  id: string;
  name: string;
  code: string;
  quantity: number;
  finishedGood: {
    id: string;
    name: string;
    sku: string;
  } | null;
  bomItems: Array<{
    id: string;
    componentId: string;
    quantityRequired: string;
    unit: string | null;
    component: {
      id: string;
      name: string;
      sku: string;
      currentStock: number | null;
      unit: string | null;
    } | null;
  }>;
}

interface JobOrderRow {
  id: string;
  orderNumber: string;
  quantityToProduce: number;
  status: string;
  completionDate: Date | null;
  createdAt: Date;
  bom: {
    id: string;
    name: string;
    code: string;
  } | null;
  finishedGood: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

interface ComponentGridItem {
  componentId: string;
  componentName: string;
  sku: string;
  requiredQty: number;
  availableStock: number;
  unit: string;
  isSufficient: boolean;
}

export default function JobOrdersPage() {
  const [jobOrders, setJobOrders] = useState<JobOrderRow[]>([]);
  const [boms, setBoms] = useState<BomSelect[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<JobOrderFormData>({
    bomId: "",
    quantityToProduce: 1,
    instructions: "",
  });

  const [orderNumber, setOrderNumber] = useState("");
  const [componentGrid, setComponentGrid] = useState<ComponentGridItem[]>([]);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, bomsRes] = await Promise.all([
        getJobOrders(statusFilter === "all" ? undefined : statusFilter),
        getBoms("active"),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setJobOrders(ordersRes.data as unknown as JobOrderRow[]);
      }

      if (bomsRes.success && bomsRes.data) {
        setBoms(bomsRes.data as unknown as BomSelect[]);
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

  // Load next order number when dialog opens
  useEffect(() => {
    if (addDialogOpen) {
      loadNextOrderNumber();
    }
  }, [addDialogOpen]);

  const loadNextOrderNumber = async () => {
    const result = await getNextJobOrderNumber();
    if (result.success && result.data) {
      setOrderNumber(result.data);
    }
  };

  // Update component grid when BOM or quantity changes
  useEffect(() => {
    if (!formData.bomId) {
      setComponentGrid([]);
      return;
    }

    const selectedBom = boms.find((b) => b.id === formData.bomId);
    if (!selectedBom) return;

    const multiplier = formData.quantityToProduce / selectedBom.quantity;
    const gridItems: ComponentGridItem[] = selectedBom.bomItems.map((item) => {
      const requiredQty = parseFloat(item.quantityRequired) * multiplier;
      const availableStock = item.component?.currentStock || 0;

      return {
        componentId: item.componentId,
        componentName: item.component?.name || "Unknown",
        sku: item.component?.sku || "N/A",
        requiredQty: Math.round(requiredQty * 100) / 100,
        availableStock,
        unit: item.unit || item.component?.unit || "Pcs",
        isSufficient: availableStock >= requiredQty,
      };
    });

    setComponentGrid(gridItems);
  }, [formData.bomId, formData.quantityToProduce, boms]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bomId) {
      alert("Please select a BOM");
      return;
    }

    // Check stock availability
    const insufficientItems = componentGrid.filter((item) => !item.isSufficient);
    if (insufficientItems.length > 0) {
      const confirm = window.confirm(
        `Warning: ${insufficientItems.length} component(s) have insufficient stock. Continue anyway?`
      );
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const result = await createJobOrder(formData);

      if (result.success) {
        setAddDialogOpen(false);
        setFormData({
          bomId: "",
          quantityToProduce: 1,
          instructions: "",
        });
        setComponentGrid([]);
        await loadData();
        alert(result.message || "Job order created successfully");
      } else {
        alert(result.error || "Failed to create job order");
      }
    } catch (error) {
      console.error("Error creating job order:", error);
      alert("An error occurred while creating the job order");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle complete job order
  const handleComplete = async (jobOrderId: string) => {
    if (!confirm("Complete this job order? This will deduct materials and add finished goods to stock.")) {
      return;
    }

    setCompletingOrderId(jobOrderId);
    try {
      const result = await completeJobOrder(jobOrderId);
      if (result.success) {
        await loadData();
        alert(result.message || "Job order completed successfully");
      } else {
        alert(result.error || "Failed to complete job order");
      }
    } catch (error) {
      console.error("Error completing job order:", error);
      alert("An error occurred while completing the job order");
    } finally {
      setCompletingOrderId(null);
    }
  };

  // Handle delete job order
  const handleDelete = async (jobOrderId: string) => {
    if (!confirm("Are you sure you want to delete this job order?")) return;

    try {
      const result = await deleteJobOrder(jobOrderId);
      if (result.success) {
        await loadData();
        alert(result.message || "Job order deleted successfully");
      } else {
        alert(result.error || "Failed to delete job order");
      }
    } catch (error) {
      console.error("Error deleting job order:", error);
      alert("An error occurred while deleting the job order");
    }
  };

  // Format currency
  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Status badge config
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any; icon: any }> = {
      draft: { label: "Draft", variant: "outline" as const, icon: FileText },
      "in-progress": { label: "In Progress", variant: "warning" as const, icon: Play },
      completed: { label: "Completed", variant: "success" as const, icon: CheckCircle },
      cancelled: { label: "Cancelled", variant: "destructive" as const, icon: Trash2 },
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
  if (loading && !jobOrders.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading job orders...</p>
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
          <h1 className="text-2xl font-bold text-nexabook-900">Job Orders</h1>
          <p className="text-nexabook-600 mt-1">
            Manage production orders and track manufacturing progress
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-nexabook-900 hover:bg-nexabook-800">
              <Plus className="mr-2 h-4 w-4" />
              New Job Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Job Order</DialogTitle>
              <DialogDescription>
                Create a new production order based on a BOM
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    Order Number
                  </Label>
                  <Input value={orderNumber} disabled className="bg-nexabook-50" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    Select BOM <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.bomId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bomId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select BOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {boms.map((bom) => (
                        <SelectItem key={bom.id} value={bom.id}>
                          {bom.code} - {bom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-nexabook-900">
                    Quantity to Produce <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.quantityToProduce}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantityToProduce: parseInt(e.target.value) || 1,
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
                  placeholder="Production notes, special instructions, etc."
                  rows={2}
                />
              </div>

              {/* Component Grid */}
              {componentGrid.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-nexabook-900">
                    Components Required
                  </Label>

                  <div className="border border-nexabook-200 rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-nexabook-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Component
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Required Qty
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Available Stock
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nexabook-100">
                        {componentGrid.map((item, index) => (
                          <tr
                            key={index}
                            className={`${
                              !item.isSufficient ? "bg-red-50" : "hover:bg-nexabook-50"
                            }`}
                          >
                            <td className="py-2 px-3">
                              <div className="text-sm font-medium text-nexabook-900">
                                {item.componentName}
                              </div>
                              <div className="text-xs text-nexabook-600">{item.sku}</div>
                            </td>
                            <td className="py-2 px-3 text-sm text-center font-medium text-nexabook-900">
                              {item.requiredQty} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-sm text-center text-nexabook-700">
                              {item.availableStock} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {item.isSufficient ? (
                                <Badge variant="success" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Insufficient
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                    "Create Job Order"
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
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Job Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">
            Job Orders ({jobOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobOrders.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No job orders found
              </h3>
              <p className="text-nexabook-600 mb-4">
                Get started by creating your first production order
              </p>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-nexabook-900 hover:bg-nexabook-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Job Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Order Number
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      BOM
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Finished Good
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Qty to Produce
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Created
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-nexabook-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-mono font-medium text-nexabook-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-sm text-nexabook-700">
                        {order.bom?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-nexabook-900">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-nexabook-400" />
                          {order.finishedGood?.name || "N/A"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-center font-medium text-nexabook-900">
                        {order.quantityToProduce}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-4 text-sm text-center text-nexabook-700">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {(order.status === "draft" || order.status === "in-progress") && (
                            <button
                              onClick={() => handleComplete(order.id)}
                              disabled={completingOrderId === order.id}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              title="Complete Order"
                            >
                              {completingOrderId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {order.status === "draft" && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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
