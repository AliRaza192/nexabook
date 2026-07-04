"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Package, TrendingUp, BarChart3, Calendar } from "lucide-react";
import {
  runStockValuation, getStockValuations, getCurrentInventoryValue,
} from "@/lib/actions/inventory-depth";

export default function StockValuationPage() {
  const [currentValue, setCurrentValue] = useState<any>(null);
  const [valuations, setValuations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [valRes, currRes] = await Promise.all([
      getStockValuations(),
      getCurrentInventoryValue(),
    ]);
    if (valRes.success) setValuations(valRes.data || []);
    if (currRes.success) setCurrentValue(currRes.data || {});
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRunValuation = async (method: "fifo" | "weighted_average") => {
    setRunning(true);
    const res = await runStockValuation(method);
    if (res.success) loadData();
    setRunning(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Stock Valuation</h1>
            <p className="text-nexabook-600 mt-1">Calculate inventory value using FIFO or Weighted Average method</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => handleRunValuation("fifo")} disabled={running} variant="outline">
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Run FIFO Valuation
            </Button>
            <Button onClick={() => handleRunValuation("weighted_average")} disabled={running} className="bg-nexabook-900 hover:bg-nexabook-800">
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Run Weighted Average
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Current Inventory Value */}
      {currentValue && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-nexabook-600">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-nexabook-900">Rs. {currentValue.totalValue?.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-nexabook-100 flex items-center justify-center"><DollarSign className="h-6 w-6 text-nexabook-700" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-nexabook-600">Items in Stock</p>
                  <p className="text-2xl font-bold">{currentValue.totalItems || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center"><Package className="h-6 w-6 text-green-700" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-nexabook-600">Total Products</p>
                  <p className="text-2xl font-bold">{currentValue.totalProducts || 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-blue-700" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-nexabook-600">Valuation Logs</p>
                  <p className="text-2xl font-bold">{valuations.length}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center"><Calendar className="h-6 w-6 text-purple-700" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Inventory Details */}
      {currentValue?.products && currentValue.products.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Current Inventory Details</CardTitle><CardDescription>Real-time inventory valuation</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Cost Price</TableHead><TableHead className="text-right">Total Value</TableHead></TableRow></TableHeader>
              <TableBody>
                {currentValue.products.filter((p: any) => p.currentStock > 0).map((product: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell><Badge variant="outline">{product.sku}</Badge></TableCell>
                    <TableCell className="text-right">{product.currentStock.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">Rs. {product.costPrice?.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">Rs. {product.totalValue?.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Valuation History */}
      <Card>
        <CardHeader><CardTitle>Valuation History</CardTitle><CardDescription>Previous valuation runs</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total Value</TableHead><TableHead>Run By</TableHead></TableRow></TableHeader>
            <TableBody>
              {valuations.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-nexabook-500">No valuations run yet. Click a button above to run your first valuation.</TableCell></TableRow> :
                valuations.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{new Date(v.valuationDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={v.method === "fifo" ? "default" : "secondary"}>{v.method === "fifo" ? "FIFO" : "Weighted Average"}</Badge></TableCell>
                    <TableCell>{v.totalItems || 0}</TableCell>
                    <TableCell className="text-right font-semibold">Rs. {parseFloat(v.totalValue || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{v.runBy || "System"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
