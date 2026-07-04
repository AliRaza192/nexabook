"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getPriceLists, createPriceList, getPriceListItems, setPriceListItem } from "@/lib/actions/price-lists";
import { getProducts } from "@/lib/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Tags, Save, Loader2, X } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  retail: "bg-blue-100 text-blue-800",
  wholesale: "bg-purple-100 text-purple-800",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-gray-100 text-gray-800",
  custom: "bg-green-100 text-green-800",
};

export default function PriceListsPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("custom");
  const [saving, setSaving] = useState(false);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [listItems, setListItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editProduct, setEditProduct] = useState<string>("");
  const [editPrice, setEditPrice] = useState("");
  const [editMinQty, setEditMinQty] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [listRes, prodRes] = await Promise.all([
      getPriceLists(),
      getProducts(),
    ]);
    if (listRes.success) setLists(listRes.data || []);
    if (prodRes.success) setProducts(prodRes.data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await createPriceList({ name: newName, type: newType });
    setSaving(false);
    setShowNew(false);
    setNewName("");
    setNewType("custom");
    loadAll();
  };

  const selectList = async (id: string) => {
    setSelectedList(id);
    const res = await getPriceListItems(id);
    if (res.success) setListItems(res.data || []);
  };

  const handleSetPrice = async () => {
    if (!selectedList || !editProduct || !editPrice) return;
    setSaving(true);
    await setPriceListItem({
      priceListId: selectedList,
      productId: editProduct,
      unitPrice: editPrice,
      minQuantity: editMinQty || undefined,
    });
    setSaving(false);
    setEditProduct("");
    setEditPrice("");
    setEditMinQty("");
    selectList(selectedList);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <Tags className="h-6 w-6 text-nexabook-600" />
            Price Lists
          </h1>
          <p className="text-nexabook-500 text-sm mt-1">Manage customer-specific pricing tiers</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> New Price List
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-nexabook-400" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: List of price lists */}
          <Card className="enterprise-card lg:col-span-1">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900">All Price Lists</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {lists.length === 0 ? (
                <div className="text-center py-10 text-nexabook-400 text-sm">No price lists created yet</div>
              ) : (
                <div className="divide-y divide-nexabook-100">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => selectList(list.id)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-nexabook-50 transition-colors ${
                        selectedList === list.id ? "bg-nexabook-50 border-l-2 border-nexabook-600" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-nexabook-900">{list.name}</p>
                        <Badge className={`text-xs ${TYPE_COLORS[list.type] || "bg-gray-100 text-gray-700"}`}>
                          {list.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-nexabook-400 mt-0.5">{list.itemCount} products</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Price list items */}
          <Card className="enterprise-card lg:col-span-2">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900">
                {selectedList
                  ? `Products — ${lists.find((l) => l.id === selectedList)?.name || ""}`
                  : "Select a price list"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {!selectedList ? (
                <div className="text-center py-10 text-nexabook-400 text-sm">
                  Select a price list from the left to manage its prices
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Add product price */}
                  <div className="flex items-end gap-3 p-3 bg-nexabook-50 rounded-lg border border-nexabook-100">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Select value={editProduct} onValueChange={setEditProduct}>
                        <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" step="0.01" value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Min Qty</Label>
                      <Input type="number" step="1" value={editMinQty}
                        onChange={(e) => setEditMinQty(e.target.value)} placeholder="1" />
                    </div>
                    <Button size="sm" onClick={handleSetPrice} disabled={saving || !editProduct || !editPrice}
                      className="bg-nexabook-600 hover:bg-nexabook-700 text-white h-9">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Items table */}
                  {listItems.length === 0 ? (
                    <div className="text-center py-8 text-nexabook-400 text-sm">No products in this price list</div>
                  ) : (
                    <div className="border rounded-lg divide-y divide-nexabook-100">
                      {listItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-nexabook-50">
                          <div>
                            <p className="text-sm font-medium text-nexabook-900">{item.productName}</p>
                            <p className="text-xs text-nexabook-400">SKU: {item.productSku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-nexabook-900">
                              Rs. {parseFloat(item.unitPrice).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                            </p>
                            {item.minQuantity && (
                              <p className="text-xs text-nexabook-400">Min: {item.minQuantity}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Price List Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-nexabook-600" />
              New Price List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Wholesale 2026" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}
              className="bg-nexabook-600 hover:bg-nexabook-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
