"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ArrowDownUp,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getProducts,
  disassembleFinishedGood,
} from "@/lib/actions/manufacturing";

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number | null;
  unit: string | null;
  type: string;
}

interface BomWithComponents {
  id: string;
  name: string;
  code: string;
  quantity: number;
  finishedGood: {
    id: string;
    name: string;
    sku: string;
    currentStock: number | null;
  } | null;
  bomItems: Array<{
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

interface DisassemblyComponent {
  componentId: string;
  componentName: string;
  sku: string;
  qtyToAdd: number;
  currentStock: number;
  unit: string;
}

export default function DisassemblePage() {
  const [boms, setBoms] = useState<BomWithComponents[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedBomId, setSelectedBomId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [componentGrid, setComponentGrid] = useState<DisassemblyComponent[]>([]);
  const [selectedFinishedGood, setSelectedFinishedGood] = useState<Product | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [bomsRes, productsRes] = await Promise.all([
        getBoms("active"),
        getProducts(),
      ]);

      if (bomsRes.success && bomsRes.data) {
        setBoms(bomsRes.data as unknown as BomWithComponents[]);
      }

      if (productsRes.success && productsRes.data) {
        const productData = productsRes.data as Product[];
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
  }, []);

  // Update component grid when BOM or quantity changes
  useEffect(() => {
    if (!selectedBomId) {
      setComponentGrid([]);
      setSelectedFinishedGood(null);
      return;
    }

    const selectedBom = boms.find((b) => b.id === selectedBomId);
    if (!selectedBom) return;

    // Set finished good
    if (selectedBom.finishedGood) {
      const fg = products.find((p) => p.id === selectedBom.finishedGood!.id);
      setSelectedFinishedGood(fg || null);
    }

    const multiplier = quantity / selectedBom.quantity;
    const gridItems: DisassemblyComponent[] = selectedBom.bomItems.map((item) => {
      const qtyToAdd = parseFloat(item.quantityRequired) * multiplier;
      const currentStock = item.component?.currentStock || 0;

      return {
        componentId: item.componentId,
        componentName: item.component?.name || "Unknown",
        sku: item.component?.sku || "N/A",
        qtyToAdd: Math.round(qtyToAdd * 100) / 100,
        currentStock,
        unit: item.unit || item.component?.unit || "Pcs",
      };
    });

    setComponentGrid(gridItems);
  }, [selectedBomId, quantity, boms, products]);

  // Handle disassembly
  const handleDisassemble = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBomId) {
      alert("Please select a product to disassemble");
      return;
    }

    if (!selectedFinishedGood) {
      alert("Finished good not found");
      return;
    }

    const currentStock = selectedFinishedGood.currentStock || 0;
    if (currentStock < quantity) {
      alert(
        `Insufficient stock. Available: ${currentStock}, Required: ${quantity}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await disassembleFinishedGood({
        finishedGoodId: selectedFinishedGood.id,
        quantity,
        instructions: instructions || undefined,
      });

      if (result.success) {
        setQuantity(1);
        setInstructions("");
        setSelectedBomId("");
        setComponentGrid([]);
        await loadData();
        alert(result.message || "Disassembly completed successfully");
      } else {
        alert(result.error || "Failed to disassemble");
      }
    } catch (error) {
      console.error("Error during disassembly:", error);
      alert("An error occurred during disassembly");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading && !boms.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading disassembly data...</p>
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
      >
        <h1 className="text-2xl font-bold text-nexabook-900">Disassemble Finished Goods</h1>
        <p className="text-nexabook-600 mt-1">
          Break down finished goods back into raw materials
        </p>
      </motion.div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
      >
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Important</h3>
          <p className="text-sm text-amber-800 mt-1">
            Disassembling will reduce finished good stock and add raw materials back to inventory.
            This action cannot be undone.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disassembly Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">Disassembly Details</CardTitle>
            <CardDescription>
              Select the finished good and quantity to disassemble
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDisassemble} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-nexabook-900">
                  Select Product <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedBomId}
                  onValueChange={setSelectedBomId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product to disassemble" />
                  </SelectTrigger>
                  <SelectContent>
                    {boms.map((bom) => (
                      <SelectItem key={bom.id} value={bom.id}>
                        {bom.finishedGood?.name || "Unknown"} ({bom.finishedGood?.sku || "N/A"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFinishedGood && (
                <div className="p-3 bg-nexabook-50 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-nexabook-700">Current Stock:</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedFinishedGood.currentStock || 0} {selectedFinishedGood.unit || "Pcs"}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-nexabook-900">
                  Quantity to Disassemble <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-nexabook-900">
                  Instructions
                </Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Reason for disassembly, notes, etc."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !selectedBomId}
                className="w-full bg-nexabook-900 hover:bg-nexabook-800"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowDownUp className="mr-2 h-4 w-4" />
                    Disassemble Now
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Components Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">
              Raw Materials to Recover
            </CardTitle>
            <CardDescription>
              Components that will be added back to stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {componentGrid.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                <p className="text-nexabook-600">
                  Select a product to see the components that will be recovered
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Disassembling {quantity} unit(s) will recover:
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {componentGrid.length} component type(s)
                    </p>
                  </div>
                </div>

                {/* Components Table */}
                <div className="border border-nexabook-200 rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-nexabook-50">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                          Component
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                          Qty to Add
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                          Current Stock
                        </th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-nexabook-700">
                          New Stock
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nexabook-100">
                      {componentGrid.map((item, index) => {
                        const newStock = item.currentStock + item.qtyToAdd;
                        return (
                          <tr key={index} className="hover:bg-nexabook-50">
                            <td className="py-3 px-3">
                              <div className="text-sm font-medium text-nexabook-900">
                                {item.componentName}
                              </div>
                              <div className="text-xs text-nexabook-600">{item.sku}</div>
                            </td>
                            <td className="py-3 px-3 text-sm text-center font-medium text-green-700">
                              +{item.qtyToAdd} {item.unit}
                            </td>
                            <td className="py-3 px-3 text-sm text-center text-nexabook-700">
                              {item.currentStock} {item.unit}
                            </td>
                            <td className="py-3 px-3 text-sm text-center font-semibold text-nexabook-900">
                              {newStock} {item.unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Disassembly History Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nexabook-100 flex items-center justify-center text-nexabook-900 font-semibold text-sm">
                1
              </div>
              <div>
                <h4 className="text-sm font-semibold text-nexabook-900">Select Product</h4>
                <p className="text-sm text-nexabook-600 mt-1">
                  Choose a finished good that has an active BOM (Bill of Materials)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nexabook-100 flex items-center justify-center text-nexabook-900 font-semibold text-sm">
                2
              </div>
              <div>
                <h4 className="text-sm font-semibold text-nexabook-900">Enter Quantity</h4>
                <p className="text-sm text-nexabook-600 mt-1">
                  Specify how many units you want to break down into raw materials
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nexabook-100 flex items-center justify-center text-nexabook-900 font-semibold text-sm">
                3
              </div>
              <div>
                <h4 className="text-sm font-semibold text-nexabook-900">Review & Confirm</h4>
                <p className="text-sm text-nexabook-600 mt-1">
                  Check the components that will be recovered and their impact on stock levels
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-semibold text-sm">
                <ArrowDownUp className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-nexabook-900">Automatic Updates</h4>
                <p className="text-sm text-nexabook-600 mt-1">
                  Stock levels are updated automatically, and a journal entry is created for accounting
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
