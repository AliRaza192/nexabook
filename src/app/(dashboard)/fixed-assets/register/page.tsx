"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Building2, Loader2 } from "lucide-react";
import {
  getFixedAssets,
  createFixedAsset,
  deleteFixedAsset,
} from "@/lib/actions/fixed-assets";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import { formatPKR } from "@/lib/utils/number-format";

// Pakistani currency formatting
const formatCurrency = (value: number) => formatPKR(value, 'south-asian');

const CATEGORIES = ["Machinery", "Furniture", "Vehicle", "Computer", "Building", "Equipment", "Other"] as const;
const METHODS = ["straight_line", "declining_balance"] as const;

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    Machinery: "bg-blue-100 text-blue-800",
    Furniture: "bg-amber-100 text-amber-800",
    Vehicle: "bg-green-100 text-green-800",
    Computer: "bg-purple-100 text-purple-800",
    Building: "bg-red-100 text-red-800",
    Equipment: "bg-cyan-100 text-cyan-800",
    Other: "bg-gray-100 text-gray-800",
  };
  return map[cat] || "bg-gray-100 text-gray-800";
};

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    fully_depreciated: "bg-yellow-100 text-yellow-800",
    disposed: "bg-red-100 text-red-800",
    sold: "bg-blue-100 text-blue-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: "Active",
    fully_depreciated: "Fully Depreciated",
    disposed: "Disposed",
    sold: "Sold",
  };
  return map[status] || status;
};

const methodLabel = (method: string) => {
  return method === "straight_line" ? "Straight Line" : "Declining Balance";
};

export default function AssetRegisterPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Machinery");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [usefulLife, setUsefulLife] = useState("");
  const [depreciationMethod, setDepreciationMethod] = useState("straight_line");
  const [salvageValue, setSalvageValue] = useState("0");
  const [notes, setNotes] = useState("");

  // Load assets from database
  const loadAssets = useCallback(async () => {
    setLoading(true);
    const res = await getFixedAssets();
    if (res.success && res.data) {
      setAssets(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const resetForm = () => {
    setName("");
    setCategory("Machinery");
    setPurchaseDate("");
    setPurchaseCost("");
    setUsefulLife("");
    setDepreciationMethod("straight_line");
    setSalvageValue("0");
    setNotes("");
  };

  const handleAdd = async () => {
    if (!name || !purchaseCost || !purchaseDate || !usefulLife) return;
    
    const cost = parseFloat(purchaseCost);
    const life = parseInt(usefulLife);
    const salvage = parseFloat(salvageValue) || 0;
    
    if (isNaN(cost) || cost <= 0 || isNaN(life) || life <= 0) return;
    if (salvage >= cost) {
      alert("Salvage value must be less than purchase cost");
      return;
    }

    setSubmitting(true);
    const res = await createFixedAsset({
      name,
      category,
      purchaseDate,
      purchaseCost: cost.toString(),
      usefulLifeYears: life.toString(),
      salvageValue: salvage.toString(),
      depreciationMethod,
      notes,
    });

    if (res.success) {
      await loadAssets();
      resetForm();
      setDialogOpen(false);
    } else {
      alert(res.error || "Failed to create asset");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    
    const res = await deleteFixedAsset(id);
    if (res.success) {
      await loadAssets();
    } else {
      alert(res.error || "Failed to delete asset");
    }
  };

  // Calculate totals
  const totalCost = assets.reduce((s, a) => s + parseFloat(a.purchaseCost || "0"), 0);
  const totalAccumulatedDep = assets.reduce((s, a) => s + parseFloat(a.accumulatedDepreciation || "0"), 0);
  const totalBookValue = assets.reduce((s, a) => {
    const cost = parseFloat(a.purchaseCost || "0");
    const accDep = parseFloat(a.accumulatedDepreciation || "0");
    return s + (cost - accDep);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Asset Register</h1>
            <p className="text-nexabook-600 mt-1">Track and manage company fixed assets</p>
          </div>
          <div className="flex gap-2">
            {assets.length > 0 && (
              <ReportExportButtons reportTitle="Asset Register" tableId="asset-register-table" />
            )}
            <Button 
              onClick={() => { resetForm(); setDialogOpen(true); }} 
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              <Plus className="h-4 w-4 mr-2" />Add Asset
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {assets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="enterprise-card">
            <CardContent className="p-5">
              <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Cost</p>
              <p className="text-xl font-bold text-nexabook-900 mt-1">
                {formatCurrency(totalCost)}
              </p>
            </CardContent>
          </Card>
          <Card className="enterprise-card">
            <CardContent className="p-5">
              <p className="text-xs text-nexabook-500 uppercase tracking-wide">Accumulated Depreciation</p>
              <p className="text-xl font-bold text-red-700 mt-1">
                {formatCurrency(totalAccumulatedDep)}
              </p>
            </CardContent>
          </Card>
          <Card className="enterprise-card">
            <CardContent className="p-5">
              <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Book Value</p>
              <p className="text-xl font-bold text-green-700 mt-1">
                {formatCurrency(totalBookValue)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        </div>
      )}

      {/* Assets Table */}
      {!loading && (
        <Card className="enterprise-card">
          <CardHeader>
            <CardTitle className="text-nexabook-900">Registered Assets</CardTitle>
            <CardDescription>{assets.length} asset{assets.length !== 1 ? "s" : ""} registered</CardDescription>
          </CardHeader>
          {assets.length === 0 ? (
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
              <h3 className="text-lg font-medium text-nexabook-700">No assets registered</h3>
              <p className="text-sm text-nexabook-500 mt-1">Click "Add Asset" to register your first fixed asset</p>
            </CardContent>
          ) : (
            <Table id="asset-register-table">
              <TableHeader>
                <TableRow className="bg-nexabook-50">
                  <TableHead className="text-nexabook-900">Asset Name</TableHead>
                  <TableHead className="text-nexabook-900">Category</TableHead>
                  <TableHead className="text-right text-nexabook-900">Purchase Cost</TableHead>
                  <TableHead className="text-nexabook-900">Purchase Date</TableHead>
                  <TableHead className="text-right text-nexabook-900">Life (Yrs)</TableHead>
                  <TableHead className="text-nexabook-900">Method</TableHead>
                  <TableHead className="text-right text-nexabook-900">Book Value</TableHead>
                  <TableHead className="text-nexabook-900">Status</TableHead>
                  <TableHead className="w-10 print:hidden"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => {
                  const cost = parseFloat(asset.purchaseCost || "0");
                  const accDep = parseFloat(asset.accumulatedDepreciation || "0");
                  const bookValue = cost - accDep;
                  
                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium text-nexabook-900">{asset.name}</TableCell>
                      <TableCell>
                        <Badge className={categoryColor(asset.category)}>
                          {asset.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(cost)}
                      </TableCell>
                      <TableCell className="text-sm text-nexabook-600">
                        {new Date(asset.purchaseDate).toLocaleDateString("en-PK", { 
                          year: "numeric", 
                          month: "short", 
                          day: "numeric" 
                        })}
                      </TableCell>
                      <TableCell className="text-right text-sm text-nexabook-700">
                        {asset.usefulLifeYears}
                      </TableCell>
                      <TableCell className="text-sm text-nexabook-600">
                        {methodLabel(asset.depreciationMethod)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-green-700">
                        {formatCurrency(Math.max(parseFloat(asset.salvageValue || "0"), bookValue))}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(asset.status)}>
                          {statusLabel(asset.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="print:hidden">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700" 
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Add Asset Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-nexabook-900">Add New Asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label className="text-nexabook-700">Asset Name *</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. CNC Machine #1"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Purchase Date *</Label>
              <Input 
                type="date" 
                value={purchaseDate} 
                onChange={e => setPurchaseDate(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Purchase Cost (PKR) *</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={purchaseCost} 
                onChange={e => setPurchaseCost(e.target.value)} 
                placeholder="0.00"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Useful Life (Years) *</Label>
              <Input 
                type="number" 
                value={usefulLife} 
                onChange={e => setUsefulLife(e.target.value)} 
                placeholder="e.g. 10"
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Depreciation Method</Label>
              <Select value={depreciationMethod} onValueChange={setDepreciationMethod}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m} value={m}>
                      {methodLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-nexabook-700">Salvage Value (PKR)</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={salvageValue} 
                onChange={e => setSalvageValue(e.target.value)} 
                placeholder="0.00"
                className="border-slate-200"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-nexabook-700">Notes (Optional)</Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Additional details..."
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleAdd} 
              disabled={submitting || !name || !purchaseCost || !purchaseDate || !usefulLife}
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
