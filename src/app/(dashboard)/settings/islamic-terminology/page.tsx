"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Save,
  Loader2,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TerminologyMapping {
  conventional: string;
  islamic: string;
  category: string;
}

const DEFAULT_MAPPINGS: TerminologyMapping[] = [
  { conventional: "Interest Income", islamic: "Halal Income (Murabaha Profit)", category: "Income" },
  { conventional: "Interest Expense", islamic: "Service Fee (No Riba)", category: "Expense" },
  { conventional: "Late Fee", islamic: "Charity Donation (Sadaqah)", category: "Expense" },
  { conventional: "Penalty Charge", islamic: "Donation to Welfare Fund", category: "Expense" },
  { conventional: "Bank Charges - Interest", islamic: "Bank Service Charges", category: "Expense" },
  { conventional: "Loan Interest", islamic: "Facility Fee (Qard Hasan)", category: "Expense" },
  { conventional: "Investment Income - Dividends", islamic: "Shariah-Compliant Dividend", category: "Income" },
  { conventional: "Fixed Deposit Interest", islamic: "Mudarabah Return", category: "Income" },
  { conventional: "Savings Account Interest", islamic: "Wakalah Return", category: "Income" },
  { conventional: "Accounts Receivable", islamic: "Dain (Amount Due)", category: "Asset" },
  { conventional: "Accounts Payable", islamic: "Qarz (Amount Payable)", category: "Liability" },
  { conventional: "Retained Earnings", islamic: "Accumulated Halal Reserve", category: "Equity" },
  { conventional: "Drawings", islamic: "Partner Withdrawals (Istikhraj)", category: "Equity" },
  { conventional: "Bad Debts Expense", islamic: "Write-off Loss (Dafa' al-Daman)", category: "Expense" },
  { conventional: "Discount Allowed", islamic: "Rebate (Takhfeef)", category: "Income" },
  { conventional: "Discount Received", islamic: "Purchase Rebate", category: "Expense" },
];

export default function IslamicTerminologyPage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [mappings, setMappings] = useState<TerminologyMapping[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("islamicTerminologyMappings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_MAPPINGS;
  });

  const updateMapping = (index: number, field: keyof TerminologyMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const addMapping = () => {
    setMappings([...mappings, { conventional: "", islamic: "", category: "Income" }]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const resetToDefaults = () => {
    setMappings(DEFAULT_MAPPINGS);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      localStorage.setItem("islamicTerminologyMappings", JSON.stringify(mappings));
      setMessage({ type: "success", text: "Terminology mappings saved successfully!" });
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setMessage({ type: "error", text: "Failed to save mappings" });
    }
    setSaving(false);
  };

  const categories = ["Income", "Expense", "Asset", "Liability", "Equity"];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/settings" className="text-nexabook-500 hover:text-nexabook-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-nexabook-600" />
            Islamic Terminology Mapping
          </h1>
        </div>
        <p className="text-nexabook-500 text-sm ml-7">
          Map conventional accounting terms to Shariah-compliant alternatives
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-nexabook-500">
          {mappings.length} term{mappings.length !== 1 ? "s" : ""} mapped
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={addMapping}>
            + Add Mapping
          </Button>
        </div>
      </div>

      <Card className="enterprise-card">
        <CardHeader className="pb-3 border-b border-nexabook-50">
          <CardTitle className="text-base font-semibold text-nexabook-900">
            Term Mappings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b border-nexabook-200">
                  <th className="py-3 px-4 text-left font-semibold text-nexabook-700 w-[30%]">Conventional Term</th>
                  <th className="py-3 px-4 text-left font-semibold text-nexabook-700 w-[30%]">Islamic Term</th>
                  <th className="py-3 px-4 text-left font-semibold text-nexabook-700 w-[20%]">Category</th>
                  <th className="py-3 px-4 text-right font-semibold text-nexabook-700 w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-nexabook-100 last:border-0"
                  >
                    <td className="py-2 px-4">
                      <Input
                        value={mapping.conventional}
                        onChange={(e) => updateMapping(i, "conventional", e.target.value)}
                        placeholder="e.g. Interest Income"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Input
                        value={mapping.islamic}
                        onChange={(e) => updateMapping(i, "islamic", e.target.value)}
                        placeholder="e.g. Halal Income"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <select
                        value={mapping.category}
                        onChange={(e) => updateMapping(i, "category", e.target.value)}
                        className="w-full h-8 rounded-md border border-nexabook-200 bg-white px-2 text-xs text-nexabook-800 focus:outline-none focus:ring-2 focus:ring-nexabook-400"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(i)}
                        className="text-red-500 hover:text-red-700 h-7 text-xs"
                      >
                        Remove
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-nexabook-50 rounded-lg p-4 border border-nexabook-100">
        <h3 className="text-sm font-semibold text-nexabook-800 mb-2">How it works</h3>
        <ul className="text-xs text-nexabook-600 space-y-1">
          <li>• When Islamic Finance Mode is enabled, these terms replace conventional labels in reports and invoices.</li>
          <li>• The mapping applies to: Chart of Accounts names, invoice footers, report headers, and printed documents.</li>
          <li>• You can customize any term to match your business preferences.</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-nexabook-600 hover:bg-nexabook-700 text-white px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Terminology
        </Button>
      </div>
    </div>
  );
}
