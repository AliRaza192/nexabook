"use client";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, Building2 } from "lucide-react";

const STORAGE_KEY = "nexabook_fixed_assets";

const CATEGORIES = ["Machinery", "Furniture", "Vehicle", "Computer", "Building", "Other"] as const;
const METHODS = ["Straight Line", "Declining Balance"] as const;

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  usefulLife: number;
  depreciationMethod: string;
  salvageValue: number;
}

function loadAssets(): FixedAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAssets(assets: FixedAsset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

function calcBookValue(asset: FixedAsset): { accumulatedDep: number; bookValue: number } {
  const depreciable = asset.purchaseCost - asset.salvageValue;
  if (depreciable <= 0 || asset.usefulLife <= 0) return { accumulatedDep: 0, bookValue: asset.purchaseCost };

  const purchaseDate = new Date(asset.purchaseDate);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
  const totalMonths = asset.usefulLife * 12;
  const monthsToDepreciate = Math.min(Math.max(monthsElapsed, 0), totalMonths);

  let accumulatedDep = 0;
  if (asset.depreciationMethod === "Straight Line") {
    const monthlyDep = depreciable / totalMonths;
    accumulatedDep = monthlyDep * monthsToDepreciate;
  } else {
    // Declining Balance — 2x straight-line rate
    const rate = (2 / asset.usefulLife);
    let bv = asset.purchaseCost;
    for (let m = 0; m < monthsToDepreciate; m++) {
      const annualDep = bv * rate;
      const monthlyDep = annualDep / 12;
      if (bv - monthlyDep < asset.salvageValue) break;
      bv -= monthlyDep;
      accumulatedDep = asset.purchaseCost - bv;
    }
  }

  const bookValue = Math.max(asset.salvageValue, asset.purchaseCost - accumulatedDep);
  return { accumulatedDep: Math.round(accumulatedDep * 100) / 100, bookValue: Math.round(bookValue * 100) / 100 };
}

function fmt(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const categoryColor = (cat: string) => {
  const map: Record<string, string> = {
    Machinery: "bg-blue-100 text-blue-800",
    Furniture: "bg-amber-100 text-amber-800",
    Vehicle: "bg-green-100 text-green-800",
    Computer: "bg-purple-100 text-purple-800",
    Building: "bg-red-100 text-red-800",
    Other: "bg-gray-100 text-gray-800",
  };
  return map[cat] || "bg-gray-100 text-gray-800";
};

export default function AssetRegisterPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Machinery");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [usefulLife, setUsefulLife] = useState("");
  const [depreciationMethod, setDepreciationMethod] = useState("Straight Line");
  const [salvageValue, setSalvageValue] = useState("0");

  useEffect(() => { setAssets(loadAssets()); }, []);

  const resetForm = () => {
    setName(""); setCategory("Machinery"); setPurchaseDate("");
    setPurchaseCost(""); setUsefulLife(""); setDepreciationMethod("Straight Line");
    setSalvageValue("0");
  };

  const handleAdd = () => {
    if (!name || !purchaseCost || !purchaseDate || !usefulLife) return;
    const cost = parseFloat(purchaseCost);
    const life = parseInt(usefulLife);
    if (isNaN(cost) || cost <= 0 || isNaN(life) || life <= 0) return;

    const asset: FixedAsset = {
      id: crypto.randomUUID(),
      name,
      category,
      purchaseDate,
      purchaseCost: cost,
      usefulLife: life,
      depreciationMethod,
      salvageValue: parseFloat(salvageValue) || 0,
    };

    const updated = [...assets, asset];
    setAssets(updated);
    saveAssets(updated);
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    saveAssets(updated);
  };

  const totalCost = assets.reduce((s, a) => s + a.purchaseCost, 0);
  const totalBV = assets.reduce((s, a) => s + calcBookValue(a).bookValue, 0);
  const totalDep = assets.reduce((s, a) => s + calcBookValue(a).accumulatedDep, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Asset Register</h1>
            <p className="text-nexabook-600 mt-1">Track and manage company fixed assets</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-nexabook-900 hover:bg-nexabook-800">
            <Plus className="h-4 w-4 mr-2" />Add Asset
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      {assets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Cost</p>
              <p className="text-xl font-bold text-nexabook-900 mt-1">{fmt(totalCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-nexabook-500 uppercase tracking-wide">Accumulated Depreciation</p>
              <p className="text-xl font-bold text-red-700 mt-1">{fmt(totalDep)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Book Value</p>
              <p className="text-xl font-bold text-green-700 mt-1">{fmt(totalBV)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assets Table */}
      <Card>
        <CardHeader><CardTitle>Registered Assets</CardTitle><CardDescription>{assets.length} asset{assets.length !== 1 ? "s" : ""} registered</CardDescription></CardHeader>
        {assets.length === 0 ? (
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No assets registered</h3>
            <p className="text-sm text-nexabook-500 mt-1">Click "Add Asset" to register your first fixed asset</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Purchase Cost</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Life (Yrs)</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => {
                const bv = calcBookValue(asset);
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell><Badge className={categoryColor(asset.category)}>{asset.category}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(asset.purchaseCost)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(asset.purchaseDate).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right text-sm">{asset.usefulLife}</TableCell>
                    <TableCell className="text-sm">{asset.depreciationMethod}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-green-700">{fmt(bv.bookValue)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDelete(asset.id)}>
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

      {/* Add Asset Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Asset Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CNC Machine #1" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purchase Date *</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Cost (PKR) *</Label>
              <Input type="number" step="0.01" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Useful Life (Years) *</Label>
              <Input type="number" value={usefulLife} onChange={e => setUsefulLife(e.target.value)} placeholder="e.g. 10" />
            </div>
            <div className="space-y-2">
              <Label>Depreciation Method</Label>
              <Select value={depreciationMethod} onValueChange={setDepreciationMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Salvage Value (PKR)</Label>
              <Input type="number" step="0.01" value={salvageValue} onChange={e => setSalvageValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAdd} className="bg-nexabook-900 hover:bg-nexabook-800">Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
