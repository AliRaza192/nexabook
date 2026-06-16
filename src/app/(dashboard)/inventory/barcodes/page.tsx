"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Printer, QrCode, Package, Loader2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getProducts, type ProductWithCategory } from "@/lib/actions/inventory";
import { getBarcodePrintData } from "@/lib/actions/barcodes";
import { LabelPreview } from "@/components/barcode/LabelPreview";
import { DEFAULT_LABEL_CONFIG, type BarcodeLabelConfig, type BarcodeFormat, type LabelItem } from "@/lib/utils/barcode";

export default function BarcodesPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [includeSerials, setIncludeSerials] = useState(false);
  const [config, setConfig] = useState<BarcodeLabelConfig>({ ...DEFAULT_LABEL_CONFIG });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts(query?: string) {
    setLoading(true);
    const res = await getProducts(query || undefined);
    if (res.success && res.data) setProducts(res.data);
    setLoading(false);
  }

  function handleSearch(val: string) {
    setSearch(val);
    const timer = setTimeout(() => loadProducts(val || undefined), 300);
    return () => clearTimeout(timer);
  }

  function toggleProduct(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function generateLabels() {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    const res = await getBarcodePrintData(Array.from(selectedIds), includeSerials);
    if (res.success && res.data) {
      setLabelItems(res.data as LabelItem[]);
    }
    setGenerating(false);
  }

  function printLabels() {
    window.print();
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setLabelItems([]);
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-nexabook-900">Barcode Labels</h1>
            <p className="text-nexabook-500 text-sm">Design and print barcode labels for products</p>
          </div>
          <div className="flex gap-2">
            {labelItems.length > 0 && (
              <>
                <Button variant="outline" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
                <Button onClick={printLabels}>
                  <Printer className="h-4 w-4 mr-1" /> Print ({labelItems.length})
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Select Products
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-nexabook-400" />
                <Input
                  placeholder="Search products..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Switch checked={includeSerials} onCheckedChange={setIncludeSerials} id="include-serials" />
                <Label htmlFor="include-serials" className="text-xs">Include individual serial numbers</Label>
              </div>

              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-nexabook-400" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-sm text-nexabook-400 text-center py-8">No products found</p>
                ) : (
                  filteredProducts.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-nexabook-50 text-sm ${
                        selectedIds.has(p.id) ? "bg-nexabook-50 border border-nexabook-200" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-nexabook-400">SKU: {p.sku}</div>
                      </div>
                      {p.isSerialTracked && <Badge variant="outline" className="text-[10px]">S/N</Badge>}
                    </label>
                  ))
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-nexabook-500">{selectedIds.size} selected</span>
                <Button size="sm" onClick={generateLabels} disabled={selectedIds.size === 0 || generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <QrCode className="h-4 w-4 mr-1" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Label Designer */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="h-4 w-4" /> Label Designer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Config toolbar */}
              <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b">
                <div>
                  <Label className="text-xs">Size</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      className="w-16 h-8 text-xs"
                      value={config.width}
                      onChange={(e) => setConfig({ ...config, width: Number(e.target.value) })}
                      placeholder="W"
                    />
                    <span className="text-xs self-center">×</span>
                    <Input
                      type="number"
                      className="w-16 h-8 text-xs"
                      value={config.height}
                      onChange={(e) => setConfig({ ...config, height: Number(e.target.value) })}
                      placeholder="H"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Format</Label>
                  <Select
                    value={config.format}
                    onValueChange={(v) => setConfig({ ...config, format: v as BarcodeFormat })}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">CODE128</SelectItem>
                      <SelectItem value="CODE39">CODE39</SelectItem>
                      <SelectItem value="EAN13">EAN13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Copies</Label>
                  <Input
                    type="number"
                    className="w-16 h-8 text-xs"
                    min={1}
                    max={100}
                    value={config.copies}
                    onChange={(e) => setConfig({ ...config, copies: Number(e.target.value) })}
                  />
                </div>

                <div className="flex gap-3 text-xs">
                  {(["productName", "sku", "barcode", "price", "serialNumber"] as const).map((f) => (
                    <label key={f} className="flex items-center gap-1 cursor-pointer">
                      <Switch
                        checked={config.fields[f]}
                        onCheckedChange={(v) =>
                          setConfig({ ...config, fields: { ...config.fields, [f]: v } })
                        }
                      />
                      {f === "serialNumber" ? "S/N" : f === "productName" ? "Name" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div ref={printRef} className="print-content">
                <LabelPreview items={labelItems} config={config} />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 5mm; }
        }
      `}</style>
    </div>
  );
}
