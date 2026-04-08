"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getAccounts,
  createJournalEntry,
  type JournalEntryData,
} from "@/lib/actions/accounts";
import type { ChartOfAccount } from "@/db/schema";

interface JournalLine {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

export default function JournalEntriesPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: "", description: "", debit: "", credit: "" },
    { accountId: "", description: "", debit: "", credit: "" },
  ]);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      const result = await getAccounts();

      if (result.success && result.data) {
        setAccounts(result.data as ChartOfAccount[]);
      }

      setLoading(false);
    };

    fetchAccounts();
  }, []);

  const addLine = () => {
    setLines([...lines, { accountId: "", description: "", debit: "", credit: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof JournalLine, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // If debit is filled, clear credit and vice versa
    if (field === "debit" && value) {
      newLines[index].credit = "";
    } else if (field === "credit" && value) {
      newLines[index].debit = "";
    }

    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
  const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split("T")[0]);
    setReference("");
    setEntryDescription("");
    setLines([
      { accountId: "", description: "", debit: "", credit: "" },
      { accountId: "", description: "", debit: "", credit: "" },
    ]);
  };

  const handleSubmit = async () => {
    if (!isBalanced) {
      setMessage({ type: "error", text: "Journal entry must be balanced (Debit = Credit)" });
      return;
    }

    if (lines.some((line) => !line.accountId)) {
      setMessage({ type: "error", text: "All lines must have an account selected" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const entryData: JournalEntryData = {
      date: entryDate,
      reference,
      description: entryDescription,
      lines,
    };

    const result = await createJournalEntry(entryData);

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Journal entry created successfully" });
      resetForm();
      setSheetOpen(false);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to create journal entry" });
    }

    setSubmitting(false);

    // Auto-hide message after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Accounts", href: "/accounts" },
          { label: "Journal Entries" },
        ]}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-nexabook-600" />
              Journal Entries
            </h1>
            <p className="text-nexabook-600 mt-1">
              Record and manage manual journal entries
            </p>
          </div>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button className="bg-nexabook-900 hover:bg-nexabook-800">
                <Plus className="mr-2 h-4 w-4" />
                New Journal Entry
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[800px] sm:max-w-none">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="text-2xl text-nexabook-900">
                  New Journal Entry
                </SheetTitle>
                <SheetDescription>
                  Create a balanced journal entry with debit and credit lines
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                {/* Entry Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-nexabook-900 uppercase tracking-wide">
                    Entry Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className="border-nexabook-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reference">Reference</Label>
                      <Input
                        id="reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g., JE-001"
                        className="border-nexabook-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={entryDescription}
                      onChange={(e) => setEntryDescription(e.target.value)}
                      placeholder="Brief description of the journal entry"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>

                {/* Journal Lines */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-nexabook-900 uppercase tracking-wide">
                      Journal Lines
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLine}
                      className="border-nexabook-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Line
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        className="p-4 bg-nexabook-50 rounded-lg border border-nexabook-200 space-y-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-nexabook-600">
                            Line {index + 1}
                          </span>
                          {lines.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLine(index)}
                              className="h-6 w-6 p-0 text-nexabook-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs">Account *</Label>
                            <select
                              value={line.accountId}
                              onChange={(e) => updateLine(index, "accountId", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-nexabook-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-nexabook-900"
                            >
                              <option value="">Select Account</option>
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(index, "description", e.target.value)}
                              placeholder="Line description"
                              className="border-nexabook-200 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Debit</Label>
                            <Input
                              type="number"
                              value={line.debit}
                              onChange={(e) => updateLine(index, "debit", e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              disabled={!!line.credit}
                              className="border-nexabook-200 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Credit</Label>
                            <Input
                              type="number"
                              value={line.credit}
                              onChange={(e) => updateLine(index, "credit", e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              disabled={!!line.debit}
                              className="border-nexabook-200 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="p-4 bg-nexabook-100 rounded-lg border border-nexabook-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-nexabook-600 mb-1">Total Debit</p>
                      <p className="text-xl font-bold text-nexabook-900 font-mono">
                        {totalDebit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-600 mb-1">Total Credit</p>
                      <p className="text-xl font-bold text-nexabook-900 font-mono">
                        {totalCredit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-nexabook-300">
                    <div className="flex items-center gap-2">
                      {isBalanced ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            Entry is balanced
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">
                            Entry is not balanced (Difference: {(totalDebit - totalCredit).toFixed(2)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setSheetOpen(false);
                  }}
                  className="border-nexabook-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !isBalanced}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Journal Entry"
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </motion.div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </motion.div>
      )}

      {/* Journal Entries List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">
              Recent Journal Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                  No Journal Entries Yet
                </h3>
                <p className="text-nexabook-600 max-w-md mx-auto mb-6">
                  Create your first journal entry to get started
                </p>
                <Button
                  onClick={() => setSheetOpen(true)}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Journal Entry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
