"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  TrendingDown,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFixedAssets,
  createFixedAsset,
  updateFixedAsset,
  deleteFixedAsset,
  type FixedAssetFormData,
} from "@/lib/actions/fixed-assets";
import { formatPKR } from "@/lib/utils/number-format";

interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseDate: Date;
  purchaseCost: string;
  salvageValue: string;
  usefulLifeYears: number;
  depreciationMethod: string;
  accumulatedDepreciation: string;
  status: string;
  notes: string | null;
  createdAt: Date;
}

const CATEGORIES = [
  "Machinery & Equipment",
  "Vehicles",
  "Furniture & Fixtures",
  "Computer & IT Equipment",
  "Land & Building",
  "Office Equipment",
  "Other",
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  fully_depreciated: "bg-gray-100 text-gray-700 border-gray-200",
  disposed: "bg-red-100 text-red-800 border-red-200",
  sold: "bg-blue-100 text-blue-800 border-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  fully_depreciated: "Fully Depreciated",
  disposed: "Disposed",
  sold: "Sold",
};

const EMPTY_FORM: FixedAssetFormData = {
  name: "",
  category: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  purchaseCost: "",
  usefulLifeYears: "",
  salvageValue: "0",
  depreciationMethod: "straight_line",
  notes: "",
};

function getBookValue(asset: FixedAsset): number {
  return (
    parseFloat(asset.purchaseCost) - parseFloat(asset.accumulatedDepreciation)
  );
}

function getDepreciationPercent(asset: FixedAsset): number {
  const cost = parseFloat(asset.purchaseCost);
  if (cost === 0) return 0;
  return Math.min(
    100,
    (parseFloat(asset.accumulatedDepreciation) / cost) * 100
  );
}

// ─── Asset Form ────────────────────────────────────────────────────────────────
function AssetForm({
  initial,
  onSubmit,
  loading,
  onCancel,
}: {
  initial: FixedAssetFormData;
  onSubmit: (d: FixedAssetFormData) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FixedAssetFormData>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const set = (key: keyof FixedAssetFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-nexabook-900">
          Asset Name <span className="text-red-500">*</span>
        </label>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Honda Generator 5KW"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-nexabook-900">
            Category <span className="text-red-500">*</span>
          </label>
          <Select
            value={form.category}
            onValueChange={(v) => set("category", v)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Purchase Date */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-nexabook-900">
            Purchase Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Purchase Cost */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-nexabook-900">
            Purchase Cost (PKR) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.purchaseCost}
            onChange={(e) => set("purchaseCost", e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Salvage Value */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-nexabook-900">
            Salvage / Residual Value (PKR)
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.salvageValue}
            onChange={(e) => set("salvageValue", e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Useful Life */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-nexabook-900">
            Useful Life (Years) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="1"
            max="50"
            value={form.usefulLifeYears}
            onChange={(e) => set("usefulLifeYears", e.target.value)}
            placeholder="e.g. 5"
            required
          />
        </div>

        {/* Depreciation Method */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-nexabook-900">
            Depreciation Method
          </label>
          <Select
            value={form.depreciationMethod}
            onValueChange={(v) => set("depreciationMethod", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight_line">Straight Line (SLM)</SelectItem>
              <SelectItem value="declining_balance">
                Declining Balance (DBM)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-nexabook-900">Notes</label>
        <Input
          value={form.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes..."
        />
      </div>

      {/* Preview */}
      {form.purchaseCost && form.usefulLifeYears && (
        <div className="bg-nexabook-50 border border-nexabook-200 rounded-lg p-3 text-sm text-nexabook-700">
          <span className="font-medium">Monthly Depreciation (SLM): </span>
          PKR{" "}
          {formatPKR(
            (parseFloat(form.purchaseCost || "0") -
              parseFloat(form.salvageValue || "0")) /
              (parseInt(form.usefulLifeYears || "1") * 12)
          )}
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-nexabook-600 hover:bg-nexabook-700 text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Save Asset
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FixedAssetsRegisterPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [editAsset, setEditAsset] = useState<FixedAsset | null>(null);
  const [viewAsset, setViewAsset] = useState<FixedAsset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<FixedAsset | null>(null);

  const loadAssets = async () => {
    setLoading(true);
    const result = await getFixedAssets(searchQuery || undefined);
    if (result.success && result.data) {
      setAssets(result.data as FixedAsset[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadAssets(), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreate = async (data: FixedAssetFormData) => {
    setFormLoading(true);
    const result = await createFixedAsset(data);
    setFormLoading(false);
    if (result.success) {
      showMsg("success", "Asset created successfully");
      setShowCreate(false);
      loadAssets();
    } else {
      showMsg("error", result.error || "Failed to create asset");
    }
  };

  const handleUpdate = async (data: FixedAssetFormData) => {
    if (!editAsset) return;
    setFormLoading(true);
    const result = await updateFixedAsset(editAsset.id, data);
    setFormLoading(false);
    if (result.success) {
      showMsg("success", "Asset updated successfully");
      setEditAsset(null);
      loadAssets();
    } else {
      showMsg("error", result.error || "Failed to update asset");
    }
  };

  const handleDelete = async () => {
    if (!deleteAsset) return;
    setFormLoading(true);
    const result = await deleteFixedAsset(deleteAsset.id);
    setFormLoading(false);
    if (result.success) {
      showMsg("success", "Asset deleted successfully");
      setDeleteAsset(null);
      loadAssets();
    } else {
      showMsg("error", result.error || "Failed to delete asset");
    }
  };

  // Stats
  const totalCost = assets.reduce((s, a) => s + parseFloat(a.purchaseCost), 0);
  const totalAccumDep = assets.reduce(
    (s, a) => s + parseFloat(a.accumulatedDepreciation),
    0
  );
  const totalBookValue = totalCost - totalAccumDep;
  const activeCount = assets.filter((a) => a.status === "active").length;

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
            <span className="text-nexabook-700 font-medium">Asset Register</span>
          </div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-nexabook-600" />
            Asset Register
          </h1>
          <p className="text-nexabook-500 text-sm mt-1">
            Manage all fixed assets and their depreciation details
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-nexabook-600 hover:bg-nexabook-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </motion.div>

      {/* Notification */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
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
          <button
            onClick={() => setMessage(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Assets",
            value: assets.length.toString(),
            sub: `${activeCount} active`,
            icon: <Package className="h-5 w-5 text-nexabook-600" />,
            color: "text-nexabook-900",
          },
          {
            label: "Total Cost",
            value: `PKR ${formatPKR(totalCost)}`,
            sub: "Purchase value",
            icon: <DollarSign className="h-5 w-5 text-blue-600" />,
            color: "text-blue-700",
          },
          {
            label: "Accumulated Dep.",
            value: `PKR ${formatPKR(totalAccumDep)}`,
            sub: "Total depreciated",
            icon: <TrendingDown className="h-5 w-5 text-orange-500" />,
            color: "text-orange-700",
          },
          {
            label: "Net Book Value",
            value: `PKR ${formatPKR(totalBookValue)}`,
            sub: "Current value",
            icon: <Building2 className="h-5 w-5 text-green-600" />,
            color: "text-green-700",
          },
        ].map((s) => (
          <Card key={s.label} className="border border-nexabook-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-nexabook-500 font-medium">{s.label}</p>
                {s.icon}
              </div>
              <p className={`text-lg font-bold ${s.color} truncate`}>{s.value}</p>
              <p className="text-xs text-nexabook-400 mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assets..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="border border-nexabook-100">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-nexabook-400" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-16 text-nexabook-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No assets found</p>
              <p className="text-sm mt-1">Add your first fixed asset to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-nexabook-50">
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Cost (PKR)</TableHead>
                  <TableHead className="text-right">Accum. Dep.</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-center">Dep. %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset, idx) => {
                  const bookValue = getBookValue(asset);
                  const depPct = getDepreciationPercent(asset);
                  return (
                    <motion.tr
                      key={asset.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-nexabook-50 hover:bg-nexabook-50/50"
                    >
                      <TableCell>
                        <div className="font-medium text-nexabook-900">{asset.name}</div>
                        <div className="text-xs text-nexabook-400 capitalize">
                          {asset.depreciationMethod === "straight_line" ? "SLM" : "DBM"} ·{" "}
                          {asset.usefulLifeYears} yrs
                        </div>
                      </TableCell>
                      <TableCell className="text-nexabook-600 text-sm">{asset.category}</TableCell>
                      <TableCell className="text-nexabook-600 text-sm">
                        {new Date(asset.purchaseDate).toLocaleDateString("en-PK", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPKR(parseFloat(asset.purchaseCost))}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatPKR(parseFloat(asset.accumulatedDepreciation))}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-700">
                        {formatPKR(bookValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 h-1.5 bg-nexabook-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-400 rounded-full"
                              style={{ width: `${depPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-nexabook-500">{depPct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_COLORS[asset.status] || "bg-gray-100 text-gray-700"}`}
                        >
                          {STATUS_LABELS[asset.status] || asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-nexabook-500 hover:text-nexabook-700"
                            onClick={() => setViewAsset(asset)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-nexabook-500 hover:text-blue-700"
                            onClick={() => setEditAsset(asset)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-nexabook-500 hover:text-red-600"
                            onClick={() => setDeleteAsset(asset)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-nexabook-600" />
              Add New Asset
            </DialogTitle>
            <DialogDescription>
              Enter the details of the fixed asset to add to your register.
            </DialogDescription>
          </DialogHeader>
          <AssetForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            loading={formLoading}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editAsset} onOpenChange={(o) => !o && setEditAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Asset
            </DialogTitle>
          </DialogHeader>
          {editAsset && (
            <AssetForm
              initial={{
                name: editAsset.name,
                category: editAsset.category,
                purchaseDate: new Date(editAsset.purchaseDate)
                  .toISOString()
                  .split("T")[0],
                purchaseCost: editAsset.purchaseCost,
                usefulLifeYears: editAsset.usefulLifeYears.toString(),
                salvageValue: editAsset.salvageValue,
                depreciationMethod: editAsset.depreciationMethod,
                notes: editAsset.notes || "",
              }}
              onSubmit={handleUpdate}
              loading={formLoading}
              onCancel={() => setEditAsset(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewAsset} onOpenChange={(o) => !o && setViewAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-nexabook-600" />
              Asset Details
            </DialogTitle>
          </DialogHeader>
          {viewAsset && (
            <div className="space-y-3 text-sm">
              {[
                ["Asset Name", viewAsset.name],
                ["Category", viewAsset.category],
                [
                  "Purchase Date",
                  new Date(viewAsset.purchaseDate).toLocaleDateString("en-PK"),
                ],
                ["Purchase Cost", `PKR ${formatPKR(parseFloat(viewAsset.purchaseCost))}`],
                ["Salvage Value", `PKR ${formatPKR(parseFloat(viewAsset.salvageValue))}`],
                ["Useful Life", `${viewAsset.usefulLifeYears} years`],
                [
                  "Method",
                  viewAsset.depreciationMethod === "straight_line"
                    ? "Straight Line (SLM)"
                    : "Declining Balance (DBM)",
                ],
                [
                  "Accumulated Depreciation",
                  `PKR ${formatPKR(parseFloat(viewAsset.accumulatedDepreciation))}`,
                ],
                [
                  "Net Book Value",
                  `PKR ${formatPKR(getBookValue(viewAsset))}`,
                ],
                ["Status", STATUS_LABELS[viewAsset.status] || viewAsset.status],
                ...(viewAsset.notes ? [["Notes", viewAsset.notes]] : []),
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b border-nexabook-50 pb-2">
                  <span className="text-nexabook-500">{label}</span>
                  <span className="font-medium text-nexabook-900 text-right max-w-[55%]">{val}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewAsset(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteAsset} onOpenChange={(o) => !o && setDeleteAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Asset
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-nexabook-900">
                {deleteAsset?.name}
              </span>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAsset(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={formLoading}
            >
              {formLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}