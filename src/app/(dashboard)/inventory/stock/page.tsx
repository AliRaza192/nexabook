"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Package, TrendingUp, TrendingDown, ClipboardList } from "lucide-react";
import {
  getStockMovements, addStockMovement, getStockAdjustments, getProductsForStockAdjustment,
  type StockMovementFormData,
} from "@/lib/actions/inventory-depth";
import { getProducts } from "@/lib/actions/inventory";

export default function StockMovementPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [movRes, prodRes, adjRes] = await Promise.all([
      getStockMovements(selectedProduct || undefined),
      getProducts(),
      getStockAdjustments(),
    ]);
    if (movRes.success) setMovements(movRes.data || []);
    if (prodRes.success) setProducts(prodRes.data || []);
    if (adjRes.success) setAdjustments(adjRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [searchQuery, selectedProduct]);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    const data: StockMovementFormData = {
      productId: formData.get("productId") as string,
      movementType: formData.get("movementType") as "in" | "out",
      reason: formData.get("reason") as any,
      quantity: formData.get("quantity") as string,
      unitCost: formData.get("unitCost") as string,
      referenceNumber: formData.get("referenceNumber") as string,
      notes: formData.get("notes") as string,
    };
    const res = await addStockMovement(data);
    if (res.success) { setDialogOpen(false); loadData(); }
    setSubmitting(false);
  };

  const totalIn = movements.filter(m => m.movementType === "in").reduce((sum, m) => sum + parseFloat(m.quantity || "0"), 0);
  const totalOut = movements.filter(m => m.movementType === "out").reduce((sum, m) => sum + parseFloat(m.quantity || "0"), 0);

  if (loading && !movements.length) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-nexabook-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Stock Movement & Adjustments</h1>
            <p className="text-nexabook-600 mt-1">Track inventory movements and manage stock adjustments</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
                <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-64" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Filter by Product</Label>
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full rounded-md border border-nexabook-200 px-3 py-2">
                <option value="">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-nexabook-900 hover:bg-nexabook-800 ml-auto"><Plus className="h-4 w-4 mr-2" />Record Movement</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle><DialogDescription>Manual stock movement entry</DialogDescription></DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label>Product*</Label>
                    <select name="productId" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Stock: {p.currentStock || 0}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Movement Type*</Label>
                      <select name="movementType" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                        <option value="in">Stock In</option><option value="out">Stock Out</option>
                      </select>
                    </div>
                    <div className="space-y-2"><Label>Reason*</Label>
                      <select name="reason" className="w-full rounded-md border border-nexabook-200 px-3 py-2" required>
                        <option value="purchase">Purchase</option><option value="sale">Sale</option><option value="return">Return</option>
                        <option value="transfer">Transfer</option><option value="grn">GRN</option><option value="delivery">Delivery</option>
                        <option value="adjustment">Adjustment</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity*</Label><Input name="quantity" type="number" step="0.01" required /></div>
                    <div className="space-y-2"><Label>Unit Cost</Label><Input name="unitCost" type="number" step="0.01" defaultValue="0" /></div>
                  </div>
                  <div className="space-y-2"><Label>Reference #</Label><Input name="referenceNumber" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" rows={2} /></div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting} className="bg-nexabook-900 hover:bg-nexabook-800">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6 flex items-center justify-between">
          <div><p className="text-sm text-nexabook-600">Total Stock In</p><p className="text-2xl font-bold text-green-600">{totalIn.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p></div>
          <ArrowUpCircle className="h-10 w-10 text-green-200" />
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center justify-between">
          <div><p className="text-sm text-nexabook-600">Total Stock Out</p><p className="text-2xl font-bold text-red-600">{totalOut.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p></div>
          <ArrowDownCircle className="h-10 w-10 text-red-200" />
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-center justify-between">
          <div><p className="text-sm text-nexabook-600">Net Movement</p><p className={`text-2xl font-bold ${(totalIn - totalOut) >= 0 ? "text-green-600" : "text-red-600"}`}>{(totalIn - totalOut).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</p></div>
          <Package className="h-10 w-10 text-nexabook-200" />
        </CardContent></Card>
      </div>

      <Tabs defaultValue="movements">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="adjustments">Stock Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Ref #</TableHead></TableRow></TableHeader>
              <TableBody>
                {movements.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-nexabook-500">No movements found</TableCell></TableRow> :
                  movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><div className="font-medium">{m.productName}</div><p className="text-xs text-nexabook-500">{m.productSku}</p></TableCell>
                      <TableCell>
                        <Badge variant={m.movementType === "in" ? "default" : "destructive"} className={m.movementType === "in" ? "bg-green-600" : ""}>
                          {m.movementType === "in" ? <ArrowUpCircle className="h-3 w-3 mr-1" /> : <ArrowDownCircle className="h-3 w-3 mr-1" />}
                          {m.movementType === "in" ? "IN" : "OUT"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{m.reason}</Badge></TableCell>
                      <TableCell className="font-semibold">{parseFloat(m.quantity || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-semibold">{parseFloat(m.runningBalance || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-sm text-nexabook-500">{m.referenceNumber || "-"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="adjustments">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Adjustment #</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {adjustments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-nexabook-500">No adjustments found</TableCell></TableRow> :
                  adjustments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.adjustmentNumber}</TableCell>
                      <TableCell>{new Date(a.adjustmentDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline">{a.reason}</Badge></TableCell>
                      <TableCell><Badge variant={a.approvalStatus === "approved" ? "default" : "outline"}>{a.approvalStatus}</Badge></TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-nexabook-500">{a.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
