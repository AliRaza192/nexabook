"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, TrendingDown, ArrowDownLeft, CheckCircle2, AlertCircle 
} from "lucide-react";
import {
  getFixedAssets,
  getDepreciationSchedule,
  postDepreciation,
} from "@/lib/actions/fixed-assets";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import { formatPKR } from "@/lib/utils/number-format";

// Pakistani currency formatting
const formatCurrency = (value: number) => formatPKR(value, 'south-asian');

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DepreciationPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<any | null>(null);
  const [postedMonths, setPostedMonths] = useState<Set<string>>(new Set());

  // Load assets from database
  useEffect(() => {
    async function loadAssets() {
      const res = await getFixedAssets();
      if (res.success && res.data) {
        const activeAssets = (res.data as any[]).filter((a: any) => a.status === "active");
        setAssets(activeAssets);
        if (activeAssets.length > 0) {
          setSelectedAsset(activeAssets[0].id);
        }
      }
    }
    loadAssets();
  }, []);

  const handleCalculate = async () => {
    if (!selectedAsset) return;
    
    setLoading(true);
    setSchedule(null);
    
    const res = await getDepreciationSchedule(selectedAsset, parseInt(year));
    if (res.success && res.data) {
      setSchedule(res.data);
      // Initialize posted months (in real app, fetch from depreciation_logs)
      setPostedMonths(new Set());
    }
    
    setLoading(false);
  };

  const handlePostDepreciation = async (month: number) => {
    if (!selectedAsset) return;
    
    const key = `${year}-${month}`;
    if (postedMonths.has(key)) {
      alert("Depreciation already posted for this month");
      return;
    }

    if (!confirm(`Post depreciation for ${MONTH_NAMES[month - 1]} ${year}?`)) {
      return;
    }

    setPosting(key);
    const res = await postDepreciation(selectedAsset, parseInt(year), month);
    
    if (res.success) {
      setPostedMonths(prev => new Set([...prev, key]));
      alert(`Depreciation posted successfully! Journal Entry: ${res.data?.journalEntryNumber}`);
    } else {
      alert(res.error || "Failed to post depreciation");
    }
    
    setPosting(null);
  };

  // Calculate totals
  const totalDep = schedule ? schedule.totalDepreciation : 0;
  const openingBV = schedule ? schedule.openingBookValue : 0;
  const closingBV = schedule ? schedule.closingBookValue : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Asset Depreciation</h1>
            <p className="text-nexabook-600 mt-1">Calculate and post asset depreciation to general ledger</p>
          </div>
          {schedule && schedule.schedule.length > 0 && (
            <ReportExportButtons 
              reportTitle="Depreciation Schedule" 
              tableId="depreciation-schedule-table"
            />
          )}
        </div>
      </motion.div>

      {/* Selector Card */}
      <Card className="print-hidden enterprise-card">
        <CardHeader>
          <CardTitle className="text-nexabook-900">Depreciation Calculator</CardTitle>
          <CardDescription>Select an asset and year to generate the depreciation schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label className="text-nexabook-700">Asset</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Select asset…" />
                </SelectTrigger>
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
              <Label className="text-nexabook-700">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleCalculate} 
              disabled={!selectedAsset || loading} 
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2" />
              )}
              {loading ? "Calculating…" : "Calculate Depreciation"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        </div>
      )}

      {/* Schedule */}
      {!loading && schedule && schedule.schedule.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Asset</p>
                <p className="text-sm font-bold text-nexabook-900 mt-1">
                  {schedule.asset.name}
                </p>
                <p className="text-xs text-nexabook-500 mt-1">{schedule.asset.category}</p>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Opening Book Value</p>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {formatCurrency(openingBV)}
                </p>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Depreciation</p>
                <p className="text-xl font-bold text-red-700 mt-1">
                  {formatCurrency(totalDep)}
                </p>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Closing Book Value</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(closingBV)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Depreciation Schedule Table */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-nexabook-900">Depreciation Schedule — {year}</CardTitle>
              <CardDescription>
                Monthly breakdown of depreciation for {schedule.asset.name}
              </CardDescription>
            </CardHeader>
            <Table id="depreciation-schedule-table">
              <TableHeader>
                <TableRow className="bg-nexabook-50">
                  <TableHead className="text-nexabook-900">Month</TableHead>
                  <TableHead className="text-right text-nexabook-900">Opening Book Value</TableHead>
                  <TableHead className="text-right text-nexabook-900">Depreciation</TableHead>
                  <TableHead className="text-right text-nexabook-900">Closing Book Value</TableHead>
                  <TableHead className="text-center text-nexabook-900 print:hidden">Status</TableHead>
                  <TableHead className="text-center text-nexabook-900 print:hidden">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.schedule.map((row: any, i: number) => {
                  const key = `${year}-${row.month}`;
                  const isPosted = postedMonths.has(key);
                  
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-nexabook-900">
                        {row.monthName} {row.year}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-nexabook-700">
                        {formatCurrency(row.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 text-red-700 font-mono text-sm font-medium">
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          {formatCurrency(row.depreciation)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-green-700">
                        {formatCurrency(row.closingBalance)}
                      </TableCell>
                      <TableCell className="text-center print:hidden">
                        {isPosted ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Posted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center print:hidden">
                        <Button
                          size="sm"
                          variant={isPosted ? "outline" : "default"}
                          disabled={isPosted || posting === key}
                          onClick={() => handlePostDepreciation(row.month)}
                          className={isPosted 
                            ? "text-green-700 border-green-300" 
                            : "bg-nexabook-900 hover:bg-nexabook-800"
                          }
                        >
                          {posting === key ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Posting...
                            </>
                          ) : isPosted ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Posted
                            </>
                          ) : (
                            "Post"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot>
                <TableRow className="bg-nexabook-100 font-semibold">
                  <TableCell className="text-nexabook-900">Total</TableCell>
                  <TableCell className="text-right font-mono text-sm text-nexabook-900">
                    {formatCurrency(openingBV)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-700">
                    {formatCurrency(totalDep)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-700">
                    {formatCurrency(closingBV)}
                  </TableCell>
                  <TableCell colSpan={2} className="print:hidden"></TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </Card>

          {/* Accumulated Depreciation Summary */}
          <Card className="enterprise-card">
            <CardContent className="p-5">
              <h3 className="font-semibold text-nexabook-900 mb-2">Accumulated Depreciation Summary</h3>
              <Separator className="mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-nexabook-500 uppercase tracking-wide">Original Cost</p>
                  <p className="text-lg font-bold text-nexabook-900 mt-1">
                    {formatCurrency(parseFloat(schedule.asset.purchaseCost))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-nexabook-500 uppercase tracking-wide">Accumulated Depreciation</p>
                  <p className="text-lg font-bold text-red-700 mt-1">
                    {formatCurrency(parseFloat(schedule.asset.accumulatedDepreciation || "0"))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-nexabook-500 uppercase tracking-wide">Current Book Value</p>
                  <p className="text-lg font-bold text-green-700 mt-1">
                    {formatCurrency(
                      parseFloat(schedule.asset.purchaseCost) - 
                      parseFloat(schedule.asset.accumulatedDepreciation || "0")
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="border-blue-200 bg-blue-50 enterprise-card">
            <CardContent className="p-5">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Straight Line Method</h4>
                  <p className="text-sm text-blue-800">
                    Depreciation is calculated using the Straight Line Method (SLM). Each month's depreciation 
                    is posted as a journal entry: <strong>Debit: Depreciation Expense</strong>, <strong>Credit: Accumulated Depreciation</strong>.
                    Click "Post" to create the journal entry for each month.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty States */}
      {!loading && schedule && schedule.schedule.length === 0 && (
        <Card className="enterprise-card">
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No depreciation for this year</h3>
            <p className="text-sm text-nexabook-500 mt-1">
              This asset may be fully depreciated or not yet in service for {year}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && !schedule && (
        <Card className="enterprise-card">
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No schedule generated</h3>
            <p className="text-sm text-nexabook-500 mt-1">
              Select an asset and click "Calculate Depreciation"
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && assets.length === 0 && (
        <Card className="enterprise-card">
          <CardContent className="p-12 text-center">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No active assets</h3>
            <p className="text-sm text-nexabook-500 mt-1">
              Register assets in the Asset Register first
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
