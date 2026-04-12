"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingDown, Printer, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const STORAGE_KEY = "nexabook_fixed_assets";

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

interface DepreciationRow {
  month: string;
  openingBV: number;
  depreciation: number;
  closingBV: number;
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

function calcDepreciationSchedule(asset: FixedAsset, year: number): DepreciationRow[] {
  const totalMonths = asset.usefulLife * 12;
  if (totalMonths <= 0) return [];

  const depreciable = asset.purchaseCost - asset.salvageValue;
  const purchaseDate = new Date(asset.purchaseDate);

  // Calculate accumulated depreciation up to start of the target year
  const startOfYear = new Date(year, 0, 1);
  const monthsBeforeYear = (startOfYear.getFullYear() - purchaseDate.getFullYear()) * 12 + (startOfYear.getMonth() - purchaseDate.getMonth());
  const monthsBefore = Math.max(0, monthsBeforeYear);

  let bv = asset.purchaseCost;

  // Simulate depreciation from purchase date to start of target year
  for (let m = 0; m < Math.min(monthsBefore, totalMonths); m++) {
    if (asset.depreciationMethod === "Straight Line") {
      const monthlyDep = depreciable / totalMonths;
      bv -= monthlyDep;
    } else {
      const rate = 2 / asset.usefulLife;
      const annualDep = bv * rate;
      const monthlyDep = annualDep / 12;
      if (bv - monthlyDep < asset.salvageValue) break;
      bv -= monthlyDep;
    }
    bv = Math.max(asset.salvageValue, bv);
  }

  const schedule: DepreciationRow[] = [];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let month = 0; month < 12; month++) {
    const totalMonthsElapsed = monthsBefore + month;
    if (totalMonthsElapsed >= totalMonths) break;

    const openingBV = Math.max(asset.salvageValue, bv);
    let depreciation = 0;

    if (asset.depreciationMethod === "Straight Line") {
      depreciation = depreciable / totalMonths;
    } else {
      const rate = 2 / asset.usefulLife;
      const annualDep = bv * rate;
      depreciation = annualDep / 12;
    }

    const closingBV = Math.max(asset.salvageValue, bv - depreciation);
    depreciation = openingBV - closingBV; // adjust for precision

    schedule.push({
      month: `${MONTH_NAMES[month]} ${year}`,
      openingBV: Math.round(openingBV * 100) / 100,
      depreciation: Math.round(depreciation * 100) / 100,
      closingBV: Math.round(closingBV * 100) / 100,
    });

    bv = closingBV;
  }

  return schedule;
}

function fmt(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DepreciationPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<DepreciationRow[] | null>(null);
  const [assetName, setAssetName] = useState("");

  useEffect(() => {
    const loaded = loadAssets();
    setAssets(loaded);
    if (loaded.length > 0) setSelectedAsset(loaded[0].id);
  }, []);

  const handleCalculate = () => {
    if (!selectedAsset) return;
    setLoading(true);
    // Simulate async
    setTimeout(() => {
      const asset = assets.find(a => a.id === selectedAsset);
      if (asset) {
        setAssetName(asset.name);
        const sch = calcDepreciationSchedule(asset, parseInt(year));
        setSchedule(sch);
      }
      setLoading(false);
    }, 300);
  };

  const handlePrint = () => window.print();

  const totalDep = schedule ? schedule.reduce((s, r) => s + r.depreciation, 0) : 0;
  const openingBV = schedule?.[0]?.openingBV ?? 0;
  const closingBV = schedule?.[schedule.length - 1]?.closingBV ?? 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Asset Depreciation</h1>
            <p className="text-nexabook-600 mt-1">Calculate and track asset depreciation over time</p>
          </div>
          {schedule && schedule.length > 0 && (
            <Button variant="outline" onClick={handlePrint} className="print:hidden">
              <Printer className="h-4 w-4 mr-2" />Print Schedule
            </Button>
          )}
        </div>
      </motion.div>

      {/* Selector */}
      <Card className="print:hidden">
        <CardHeader><CardTitle>Depreciation Calculator</CardTitle><CardDescription>Select an asset and year to generate the depreciation schedule</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Asset</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger><SelectValue placeholder="Select asset…" /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {a.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-40">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCalculate} disabled={!selectedAsset || loading} className="bg-nexabook-900 hover:bg-nexabook-800">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingDown className="h-4 w-4 mr-2" />}
              {loading ? "Calculating…" : "Calculate Depreciation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        </div>
      )}

      {/* Schedule */}
      {!loading && schedule && schedule.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Asset</p>
                <p className="text-sm font-bold text-nexabook-900 mt-1">{assetName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Opening Book Value</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{fmt(openingBV)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Depreciation</p>
                <p className="text-xl font-bold text-red-700 mt-1">{fmt(totalDep)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Closing Book Value</p>
                <p className="text-xl font-bold text-green-700 mt-1">{fmt(closingBV)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Table */}
          <Card>
            <CardHeader><CardTitle>Depreciation Schedule — {year}</CardTitle><CardDescription>Monthly breakdown of depreciation for the selected asset</CardDescription></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Opening Book Value</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Closing Book Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(row.openingBV)}</TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-red-700 font-mono text-sm">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        {fmt(row.depreciation)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-green-700">{fmt(row.closingBV)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-nexabook-50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(openingBV)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-700">{fmt(totalDep)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-700">{fmt(closingBV)}</TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </Card>

          {/* Accumulated Depreciation Summary */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-nexabook-900 mb-2">Accumulated Depreciation Summary</h3>
              <Separator className="mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-nexabook-500 uppercase tracking-wide">Original Cost</p>
                  <p className="text-lg font-bold text-nexabook-900 mt-1">
                    {fmt(openingBV + totalDep)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Depreciation (This Year)</p>
                  <p className="text-lg font-bold text-red-700 mt-1">{fmt(totalDep)}</p>
                </div>
                <div>
                  <p className="text-xs text-nexabook-500 uppercase tracking-wide">Remaining Book Value</p>
                  <p className="text-lg font-bold text-green-700 mt-1">{fmt(closingBV)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && schedule && schedule.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No depreciation for this year</h3>
            <p className="text-sm text-nexabook-500 mt-1">This asset may be fully depreciated or not yet in service for {year}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !schedule && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No schedule generated</h3>
            <p className="text-sm text-nexabook-500 mt-1">Select an asset and click "Calculate Depreciation"</p>
          </CardContent>
        </Card>
      )}

      {/* No assets */}
      {!loading && assets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No assets registered</h3>
            <p className="text-sm text-nexabook-500 mt-1">Register assets in the Asset Register first</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
