"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getAccounts, postOpeningBalance, bulkImportOpeningBalances } from "@/lib/actions/accounts";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface LineInput {
  accountId: string;
  debit: string;
  credit: string;
}

export default function OpeningBalancePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("Opening Balance Entry");
  const [lines, setLines] = useState<LineInput[]>([
    { accountId: "", debit: "", credit: "" },
  ]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const res = await getAccounts();
    if (res.success && res.data) {
      setAccounts(res.data as Account[]);
    }
    setLoading(false);
  };

  const addLine = () => {
    setLines([...lines, { accountId: "", debit: "", credit: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineInput, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-clear opposite field
    if (field === "debit" && value) updated[index].credit = "";
    if (field === "credit" && value) updated[index].debit = "";
    setLines(updated);
  };

  const totalDebit = lines.reduce(
    (s, l) => s + (parseFloat(l.debit) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (s, l) => s + (parseFloat(l.credit) || 0),
    0
  );
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleSubmit = async () => {
    if (!isBalanced) {
      setMessage({ type: "error", text: "Debits and credits must balance before posting" });
      return;
    }
    const validLines = lines.filter((l) => l.accountId && (parseFloat(l.debit) || parseFloat(l.credit)));
    if (validLines.length === 0) {
      setMessage({ type: "error", text: "Add at least one account line" });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const res = await postOpeningBalance({ date, description, lines: validLines });
    if (res.success) {
      setMessage({ type: "success", text: `Opening balance posted: ${res.entryNumber}` });
      setLines([{ accountId: "", debit: "", credit: "" }]);
      setDescription("Opening Balance Entry");
    } else {
      setMessage({ type: "error", text: res.error || "Failed to post" });
    }
    setSubmitting(false);
  };

  const handleImport = async () => {
    setImportErrors([]);
    const rows = importText
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",");
        return {
          accountCode: parts[0]?.trim() || "",
          debit: parts[1]?.trim() || "0",
          credit: parts[2]?.trim() || "0",
        };
      });

    if (rows.length === 0) {
      setImportErrors(["No data found in import text"]);
      return;
    }

    setImporting(true);
    const res = await bulkImportOpeningBalances(rows);
    if (res.success) {
      setImportDialogOpen(false);
      setImportText("");
      setMessage({ type: "success", text: res.message || "Bulk import successful" });
      loadAccounts();
    } else if ((res as any).errors) {
      setImportErrors((res as any).errors.map((e: any) => `Row ${e.row}: ${e.error}`));
    } else {
      setImportErrors([res.error || "Import failed"]);
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const csv = "accountCode,debit,credit\n1010,100000,0\n2000,0,50000\n1100,150000,0";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opening-balance-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const accountOptions = accounts.filter(
    (a) =>
      a.type === "asset" ||
      a.type === "liability" ||
      a.type === "equity"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-nexabook-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexabook-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-nexabook-900">
              Opening Balance Entry
            </h1>
            <p className="text-nexabook-600 mt-1">
              Set opening balances for accounts to migrate legacy data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
          </div>
        </div>

        {/* Notification */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Manual Entry</CardTitle>
            <CardDescription>
              Enter account-wise opening balances. Debits (assets) and credits
              (liabilities/equity) are auto-balanced with "Opening Balance
              Equity" account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-nexabook-900">
                  Entry Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-nexabook-900">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opening Balance Entry"
                />
              </div>
            </div>

            {/* Lines Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-nexabook-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700 w-1/2">
                      Account
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-nexabook-700">
                      Debit
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-nexabook-700">
                      Credit
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr
                      key={index}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50"
                    >
                      <td className="py-2 px-3">
                        <Select
                          value={line.accountId}
                          onValueChange={(v) => updateLine(index, "accountId", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountOptions.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} — {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit}
                          onChange={(e) =>
                            updateLine(index, "debit", e.target.value)
                          }
                          placeholder="0.00"
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit}
                          onChange={(e) =>
                            updateLine(index, "credit", e.target.value)
                          }
                          placeholder="0.00"
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-nexabook-300">
                    <td className="py-2 px-3 text-sm font-semibold text-nexabook-900">
                      <div className="flex items-center gap-2">
                        <span>Opening Balance Equity (contra)</span>
                        <Badge
                          variant={
                            isBalanced ? "success" : "destructive"
                          }
                        >
                          {isBalanced ? "Balanced" : "Unbalanced"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-red-600">
                      {difference < 0
                        ? Math.abs(difference).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-green-600">
                      {difference > 0
                        ? difference.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t border-nexabook-200">
                    <td className="py-2 px-3 text-sm font-bold text-nexabook-900">
                      Totals
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-nexabook-900">
                      {totalDebit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-bold text-nexabook-900">
                      {totalCredit.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Add Line + Submit */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !isBalanced}
                className="bg-nexabook-900 hover:bg-nexabook-800"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Post Opening Balance
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-nexabook-500 mt-0.5" />
              <div className="text-sm text-nexabook-600 space-y-1">
                <p>
                  <strong>How it works:</strong> Enter debit balances for assets
                  (Cash, Bank, AR, Inventory, etc.) and credit balances for
                  liabilities/equity (AP, Loans, etc.). The system automatically
                  adds the balancing line to "Opening Balance Equity" account.
                </p>
                <p>
                  For customer/vendor opening balances, set them directly in
                  Customer or Vendor profiles — those will appear in their
                  respective ledgers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk Import Opening Balances</DialogTitle>
              <DialogDescription>
                Paste CSV data with columns: accountCode, debit, credit. One
                account per line.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`1010,100000,0\n1100,50000,0\n2000,0,75000\n3000,0,75000`}
                className="w-full h-40 px-3 py-2 border rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-nexabook-500"
              />

              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || !importText.trim()}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
