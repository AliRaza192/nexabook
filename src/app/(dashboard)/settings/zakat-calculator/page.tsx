"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  Save,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  HandHeart,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ZakatAssets {
  cashInHand: number;
  cashAtBank: number;
  accountsReceivable: number;
  inventory: number;
  investments: number;
  goldSilver: number;
  propertyForSale: number;
  otherAssets: number;
}

interface ZakatLiabilities {
  accountsPayable: number;
  shortTermLoans: number;
  outstandingBills: number;
  otherLiabilities: number;
}

const NISAB_GOLD_GRAM = 87.48;
const NISAB_SILVER_GRAM = 612.36;
const ZAKAT_RATE = 0.025;

export default function ZakatCalculatorPage() {
  const [assets, setAssets] = useState<ZakatAssets>({
    cashInHand: 0,
    cashAtBank: 0,
    accountsReceivable: 0,
    inventory: 0,
    investments: 0,
    goldSilver: 0,
    propertyForSale: 0,
    otherAssets: 0,
  });

  const [liabilities, setLiabilities] = useState<ZakatLiabilities>({
    accountsPayable: 0,
    shortTermLoans: 0,
    outstandingBills: 0,
    otherLiabilities: 0,
  });

  const [goldPricePerGram, setGoldPricePerGram] = useState(22000);
  const [silverPricePerGram, setSilverPricePerGram] = useState(280);
  const [method, setMethod] = useState<"standard" | "hawal">("standard");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalAssets = Object.values(assets).reduce((sum, v) => sum + v, 0);
  const totalLiabilities = Object.values(liabilities).reduce((sum, v) => sum + v, 0);
  const netZakatable = totalAssets - totalLiabilities;
  const zakatAmount = netZakatable > 0 ? netZakatable * ZAKAT_RATE : 0;

  const nisabGold = NISAB_GOLD_GRAM * goldPricePerGram;
  const nisabSilver = NISAB_SILVER_GRAM * silverPricePerGram;
  const nisab = Math.min(nisabGold, nisabSilver);
  const isEligible = netZakatable >= nisab;

  const hawalAssets = assets.cashInHand + assets.cashAtBank + assets.goldSilver;
  const hawalZakat = hawalAssets * ZAKAT_RATE;

  const updateAsset = (key: keyof ZakatAssets, value: string) => {
    setAssets({ ...assets, [key]: parseFloat(value) || 0 });
  };

  const updateLiability = (key: keyof ZakatLiabilities, value: string) => {
    setLiabilities({ ...liabilities, [key]: parseFloat(value) || 0 });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data = { assets, liabilities, method, goldPricePerGram, silverPricePerGram };
      localStorage.setItem("zakatCalculatorData", JSON.stringify(data));
      setMessage({ type: "success", text: "Zakat calculation saved!" });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    }
    setSaving(false);
  };

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/settings" className="text-nexabook-500 hover:text-nexabook-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-nexabook-600" />
            Zakat Calculator
          </h1>
        </div>
        <p className="text-nexabook-500 text-sm ml-7">
          Calculate your annual Zakat obligation based on zakatable assets
        </p>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="enterprise-card">
          <CardContent className="p-4">
            <p className="text-xs text-nexabook-500 mb-1">Total Zakatable Assets</p>
            <p className="text-lg font-bold text-nexabook-900">{fmt(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-4">
            <p className="text-xs text-nexabook-500 mb-1">Total Liabilities</p>
            <p className="text-lg font-bold text-red-600">{fmt(totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card className="enterprise-card">
          <CardContent className="p-4">
            <p className="text-xs text-nexabook-500 mb-1">Net Zakatable Wealth</p>
            <p className="text-lg font-bold text-nexabook-900">{fmt(netZakatable)}</p>
          </CardContent>
        </Card>
        <Card className={`enterprise-card ${isEligible ? "border-green-300 bg-green-50" : ""}`}>
          <CardContent className="p-4">
            <p className="text-xs text-nexabook-500 mb-1 flex items-center gap-1">
              <HandHeart className="h-3 w-3" /> Zakat Due (2.5%)
            </p>
            <p className={`text-lg font-bold ${isEligible ? "text-green-700" : "text-nexabook-400"}`}>
              {method === "hawal" ? fmt(hawalZakat) : fmt(zakatAmount)}
            </p>
            <p className="text-[10px] text-nexabook-400 mt-1">
              Nisab: {fmt(nisab)} | {isEligible ? "Zakat Wajib" : "Below Nisab"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Method Selection */}
      <Card className="enterprise-card max-w-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Calculation Method:</Label>
            <div className="flex gap-2">
              <Button
                variant={method === "standard" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("standard")}
                className={method === "standard" ? "bg-nexabook-600 text-white" : ""}
              >
                Standard (All Assets)
              </Button>
              <Button
                variant={method === "hawal" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("hawal")}
                className={method === "hawal" ? "bg-nexabook-600 text-white" : ""}
              >
                Hawal (Cash + Gold Only)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card className="enterprise-card">
          <CardHeader className="pb-3 border-b border-nexabook-50">
            <CardTitle className="text-base font-semibold text-nexabook-900">
              Zakatable Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {([
              ["cashInHand", "Cash in Hand"],
              ["cashAtBank", "Cash at Bank"],
              ["accountsReceivable", "Accounts Receivable"],
              ["inventory", "Inventory / Stock"],
              ["investments", "Investments (Shariah-compliant)"],
              ["goldSilver", "Gold & Silver"],
              ["propertyForSale", "Property Held for Sale"],
              ["otherAssets", "Other Zakatable Assets"],
            ] as [keyof ZakatAssets, string][]).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={assets[key] || ""}
                  onChange={(e) => updateAsset(key, e.target.value)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
            ))}
            <div className="border-t border-nexabook-100 pt-3 flex justify-between text-sm font-semibold">
              <span>Total Assets</span>
              <span>{fmt(totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities + Nisab */}
        <div className="space-y-6">
          <Card className="enterprise-card">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900">
                Deductible Liabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {([
                ["accountsPayable", "Accounts Payable"],
                ["shortTermLoans", "Short-term Loans"],
                ["outstandingBills", "Outstanding Bills"],
                ["otherLiabilities", "Other Liabilities"],
              ] as [keyof ZakatLiabilities, string][]).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={liabilities[key] || ""}
                    onChange={(e) => updateLiability(key, e.target.value)}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              <div className="border-t border-nexabook-100 pt-3 flex justify-between text-sm font-semibold">
                <span>Total Liabilities</span>
                <span className="text-red-600">{fmt(totalLiabilities)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="enterprise-card">
            <CardHeader className="pb-3 border-b border-nexabook-50">
              <CardTitle className="text-base font-semibold text-nexabook-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-nexabook-600" />
                Nisab Threshold
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Gold Price (per gram)</Label>
                  <Input
                    type="number"
                    value={goldPricePerGram}
                    onChange={(e) => setGoldPricePerGram(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-nexabook-400">Nisab: {NISAB_GOLD_GRAM}g = {fmt(nisabGold)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Silver Price (per gram)</Label>
                  <Input
                    type="number"
                    value={silverPricePerGram}
                    onChange={(e) => setSilverPricePerGram(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-nexabook-400">Nisab: {NISAB_SILVER_GRAM}g = {fmt(nisabSilver)}</p>
                </div>
              </div>
              <div className="bg-nexabook-50 rounded-lg p-3 text-xs text-nexabook-600">
                <strong>Current Nisab:</strong> {fmt(nisab)} (lower of gold/silver)
                <br />
                <strong>2.5% Zakat Rate:</strong> On net wealth above Nisab
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Calculation
        </Button>
      </div>
    </div>
  );
}
