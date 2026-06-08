"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingDown,
  Building2,
  Loader2,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  X,
  Calendar,
  Play,
  BarChart3,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getFixedAssets,
  getDepreciationSchedule,
  postDepreciation,
  getDepreciationHistory,
  type DepreciationScheduleRow,
} from "@/lib/actions/fixed-assets";
import { formatPKR } from "@/lib/utils/number-format";

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseCost: string;
  salvageValue: string;
  usefulLifeYears: number;
  depreciationMethod: string;
  accumulatedDepreciation: string;
  status: string;
}

interface DepreciationLog {
  id: string;
  depreciationDate: Date;
  amount: string;
  bookValueAfter: string;
  notes: string | null;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

export default function DepreciationPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [schedule, setSchedule] = useState<{
    asset: FixedAsset;
    schedule: DepreciationScheduleRow[];
    totalDepreciation: number;
    openingBookValue: number;
    closingBookValue: number;
  } | null>(null);
  const [history, setHistory] = useState<DepreciationLog[]>([]);

  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [postingMonth, setPostingMonth] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmPost, setConfirmPost] = useState<{ month: number; amount: number } | null>(null);

  // Load active assets
  useEffect(() => {
    const load = async () => {
      setLoadingAssets(true);
      const res = await getFixedAssets();
      if (res.success && res.data) {
        const active = (res.data as FixedAsset[]).filter(
          (a) => a.status === "active"
        );
        setAssets(active);
        if (active.length > 0) setSelectedAssetId(active[0].id);
      }
      setLoadingAssets(false);
    };
    load();
  }, []);

  // Load schedule + history when asset/year changes
  useEffect(() => {
    if (!selectedAssetId) return;
    const load = async () => {
      setLoadingSchedule(true);
      setSchedule(null);
      const [schedRes, histRes] = await Promise.all([
        getDepreciationSchedule(selectedAssetId, selectedYear),
        getDepreciationHistory(selectedAssetId),
      ]);
      if (schedRes.success && schedRes.data) {
        setSchedule(schedRes.data as any);
      }
      if (histRes.success && histRes.data) {
        setHistory(histRes.data as DepreciationLog[]);
      }
      setLoadingSchedule(false);
    };
    load();
  }, [selectedAssetId, selectedYear]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Check if a month is already posted
  const isPosted = (month: number): boolean => {
    return history.some((h) => {
      const d = new Date(h.depreciationDate);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === month;
    });
  };

  const handlePostConfirm = async () => {
    if (!confirmPost || !selectedAssetId) return;
    setPostingMonth(confirmPost.month);
    setConfirmPost(null);
    const res = await postDepreciation(selectedAssetId, selectedYear, confirmPost.month);
    setPostingMonth(null);
    if (res.success && res.data) {
      showMsg(
        "success",
        `Depreciation posted — JV: ${res.data.journalEntryNumber} · PKR ${formatPKR(res.data.depreciationAmount)}`
      );
      // Reload schedule + history
      const [schedRes, histRes] = await Promise.all([
        getDepreciationSchedule(selectedAssetId, selectedYear),
        getDepreciationHistory(selectedAssetId),
      ]);
      if (schedRes.success && schedRes.data) setSchedule(schedRes.data as any);
      if (histRes.success && histRes.data) setHistory(histRes.data as DepreciationLog[]);
    } else {
      showMsg("error", res.error || "Failed to post depreciation");
    }
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-sm text-nexabook-500 mb-1">
            <span>Fixed Assets</span>
            <span>/</span>
            <span className="text-nexabook-700 font-medium">Depreciation</span>
          </div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-nexabook-600" />
            Depreciation Schedule
          </h1>
          <p className="text-nexabook-500 text-sm mt-1">
            View schedule and post monthly depreciation entries
          </p>
        </div>
      </motion.div>

      {/* Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <Card className="border border-nexabook-100">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-nexabook-500 uppercase tracking-wide">
                Select Asset
              </label>
              {loadingAssets ? (
                <div className="flex items-center gap-2 text-nexabook-400 text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading assets...
                </div>
              ) : assets.length === 0 ? (
                <p className="text-sm text-nexabook-400 py-2">
                  No active assets found. Add assets in the Asset Register first.
                </p>
              ) : (
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-medium">{a.name}</span>
                        <span className="text-nexabook-400 ml-2 text-xs">
                          · {a.category}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="sm:w-36 space-y-1">
              <label className="text-xs font-medium text-nexabook-500 uppercase tracking-wide">
                Year
              </label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Summary */}
      {selectedAsset && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Purchase Cost",
              value: `PKR ${formatPKR(parseFloat(selectedAsset.purchaseCost))}`,
              color: "text-nexabook-900",
            },
            {
              label: "Salvage Value",
              value: `PKR ${formatPKR(parseFloat(selectedAsset.salvageValue))}`,
              color: "text-nexabook-700",
            },
            {
              label: "Accumulated Dep.",
              value: `PKR ${formatPKR(parseFloat(selectedAsset.accumulatedDepreciation))}`,
              color: "text-orange-700",
            },
            {
              label: "Net Book Value",
              value: `PKR ${formatPKR(
                parseFloat(selectedAsset.purchaseCost) -
                  parseFloat(selectedAsset.accumulatedDepreciation)
              )}`,
              color: "text-green-700",
            },
          ].map((s) => (
            <Card key={s.label} className="border border-nexabook-100">
              <CardContent className="p-3">
                <p className="text-xs text-nexabook-500 mb-1">{s.label}</p>
                <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Table */}
      {loadingSchedule ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-nexabook-400" />
        </div>
      ) : schedule ? (
        <Card className="border border-nexabook-100">
          <CardHeader className="pb-3 border-b border-nexabook-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-nexabook-600" />
                {selectedYear} Depreciation Schedule
                <Badge variant="outline" className="text-xs ml-2 border-nexabook-200 text-nexabook-600">
                  {selectedAsset?.depreciationMethod === "straight_line" ? "SLM" : "DBM"}
                  {" · "}{selectedAsset?.usefulLifeYears} yrs
                </Badge>
              </CardTitle>
              <div className="text-sm text-nexabook-500">
                Annual total:{" "}
                <span className="font-semibold text-orange-600">
                  PKR {formatPKR(schedule.totalDepreciation)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-nexabook-50">
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Opening BV</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Closing BV</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.schedule.map((row, idx) => {
                  const posted = isPosted(row.month);
                  const isPosting = postingMonth === row.month;
                  return (
                    <motion.tr
                      key={row.month}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-nexabook-50 ${
                        posted ? "bg-green-50/40" : "hover:bg-nexabook-50/40"
                      }`}
                    >
                      <TableCell className="font-medium text-nexabook-900">
                        {row.monthName} {row.year}
                      </TableCell>
                      <TableCell className="text-right text-nexabook-600">
                        {formatPKR(row.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatPKR(row.depreciation)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-700">
                        {formatPKR(row.closingBalance)}
                      </TableCell>
                      <TableCell className="text-center">
                        {posted ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Posted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-nexabook-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {posted ? (
                          <span className="text-xs text-nexabook-300">—</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPosting}
                            className="h-7 text-xs border-nexabook-300 text-nexabook-700 hover:bg-nexabook-600 hover:text-white hover:border-nexabook-600"
                            onClick={() =>
                              setConfirmPost({ month: row.month, amount: row.depreciation })
                            }
                          >
                            {isPosting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Post
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>

            {/* Year Summary */}
            <div className="p-4 bg-nexabook-50 border-t border-nexabook-100 flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
              <div className="flex gap-6">
                <div>
                  <span className="text-nexabook-500">Opening Book Value: </span>
                  <span className="font-semibold text-nexabook-800">
                    PKR {formatPKR(schedule.openingBookValue)}
                  </span>
                </div>
                <div>
                  <span className="text-nexabook-500">Total Depreciation: </span>
                  <span className="font-semibold text-orange-600">
                    PKR {formatPKR(schedule.totalDepreciation)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-nexabook-500">Closing Book Value: </span>
                <span className="font-bold text-green-700">
                  PKR {formatPKR(schedule.closingBookValue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : selectedAssetId ? (
        <Card className="border border-nexabook-100">
          <CardContent className="text-center py-12 text-nexabook-400">
            <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No depreciation schedule available for this period.</p>
            <p className="text-sm mt-1">
              The asset may have been purchased after {selectedYear} or is fully depreciated.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* History */}
      {history.length > 0 && (
        <Card className="border border-nexabook-100">
          <CardHeader className="pb-3 border-b border-nexabook-50">
            <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-nexabook-600" />
              Posting History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-nexabook-50">
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount (PKR)</TableHead>
                  <TableHead className="text-right">Book Value After</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-nexabook-50 hover:bg-nexabook-50/40"
                  >
                    <TableCell className="text-nexabook-700">
                      {new Date(log.depreciationDate).toLocaleDateString("en-PK", {
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      {formatPKR(parseFloat(log.amount))}
                    </TableCell>
                    <TableCell className="text-right text-green-700">
                      {formatPKR(parseFloat(log.bookValueAfter))}
                    </TableCell>
                    <TableCell className="text-xs text-nexabook-400">
                      {log.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Confirm Post Dialog ── */}
      <Dialog open={!!confirmPost} onOpenChange={(o) => !o && setConfirmPost(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-nexabook-600" />
              Post Depreciation
            </DialogTitle>
            <DialogDescription>
              This will create a journal entry for:
            </DialogDescription>
          </DialogHeader>
          {confirmPost && (
            <div className="bg-nexabook-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-nexabook-500">Asset</span>
                <span className="font-medium text-nexabook-900">{selectedAsset?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nexabook-500">Period</span>
                <span className="font-medium text-nexabook-900">
                  {MONTH_NAMES[confirmPost.month - 1]} {selectedYear}
                </span>
              </div>
              <div className="flex justify-between border-t border-nexabook-200 pt-2 mt-2">
                <span className="text-nexabook-700 font-medium">Amount</span>
                <span className="font-bold text-orange-600">
                  PKR {formatPKR(confirmPost.amount)}
                </span>
              </div>
              <div className="text-xs text-nexabook-400 mt-2 border-t border-nexabook-100 pt-2">
                DR: Depreciation Expense<br />
                CR: Accumulated Depreciation
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPost(null)}>
              Cancel
            </Button>
            <Button
              className="bg-nexabook-600 hover:bg-nexabook-700 text-white"
              onClick={handlePostConfirm}
            >
              <Play className="h-4 w-4 mr-2" />
              Post Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}