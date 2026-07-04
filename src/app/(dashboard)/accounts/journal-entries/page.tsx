"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Printer,
  Eye,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAccounts,
  createVoucher,
  getVouchersByType,
  type VoucherType,
  type VoucherData,
} from "@/lib/actions/accounts";
import type { ChartOfAccount } from "@/db/schema";

interface JournalLine {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

interface VoucherRecord {
  id: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
}

interface VoucherDetail {
  entry: VoucherRecord;
  lines: {
    id: string;
    accountId: string;
    accountCode: string | null;
    accountName: string | null;
    description: string | null;
    debitAmount: string;
    creditAmount: string;
  }[];
}

const VOUCHER_TABS: { value: VoucherType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "JV", label: "Journal Voucher", icon: <FileText className="h-4 w-4" />, color: "bg-blue-600" },
  { value: "CPV", label: "Cash Payment", icon: <ArrowUpRight className="h-4 w-4" />, color: "bg-red-500" },
  { value: "CRV", label: "Cash Receipt", icon: <ArrowDownLeft className="h-4 w-4" />, color: "bg-green-500" },
  { value: "BPV", label: "Bank Payment", icon: <Landmark className="h-4 w-4" />, color: "bg-orange-500" },
  { value: "BRV", label: "Bank Receipt", icon: <Wallet className="h-4 w-4" />, color: "bg-teal-500" },
  { value: "CONTRA", label: "Contra", icon: <ArrowLeftRight className="h-4 w-4" />, color: "bg-purple-500" },
];

function getVoucherTypeBadgeColor(voucherNumber: string): string {
  if (voucherNumber.startsWith("JV-")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (voucherNumber.startsWith("CPV-")) return "bg-red-100 text-red-800 border-red-200";
  if (voucherNumber.startsWith("CRV-")) return "bg-green-100 text-green-800 border-green-200";
  if (voucherNumber.startsWith("BPV-")) return "bg-orange-100 text-orange-800 border-orange-200";
  if (voucherNumber.startsWith("BRV-")) return "bg-teal-100 text-teal-800 border-teal-200";
  if (voucherNumber.startsWith("CONTRA-")) return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function getVoucherLabel(voucherNumber: string): string {
  const prefix = voucherNumber.split("-")[0];
  const map: Record<string, string> = {
    JV: "Journal Voucher",
    CPV: "Cash Payment",
    CRV: "Cash Receipt",
    BPV: "Bank Payment",
    BRV: "Bank Receipt",
    CONTRA: "Contra",
  };
  return map[prefix] || prefix;
}

function filterAccountsByCode(accounts: ChartOfAccount[], prefixes: string[]): ChartOfAccount[] {
  return accounts.filter((acc) =>
    prefixes.some((prefix) => acc.code.startsWith(prefix))
  );
}

function filterAccountsByType(accounts: ChartOfAccount[], type: string): ChartOfAccount[] {
  return accounts.filter((acc) => acc.type === type);
}

export default function JournalEntriesPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [createdVoucherNumber, setCreatedVoucherNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VoucherType>("JV");

  // Voucher list
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [voucherListLoading, setVoucherListLoading] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
  const [voucherDetailOpen, setVoucherDetailOpen] = useState(false);
  const [voucherDetailLoading, setVoucherDetailLoading] = useState(false);

  // Shared form fields
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [voucherDescription, setVoucherDescription] = useState("");
  const [payeeName, setPayeeName] = useState("");

  // JV lines
  const [jvLines, setJvLines] = useState<JournalLine[]>([
    { accountId: "", description: "", debit: "", credit: "" },
    { accountId: "", description: "", debit: "", credit: "" },
  ]);

  // CPV/CRV/BPV/BRV/Contra specific fields
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [receiptAccountId, setReceiptAccountId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");

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
    fetchAllVouchers();
  }, []);

  const fetchAllVouchers = async () => {
    setVoucherListLoading(true);
    const allVouchers: VoucherRecord[] = [];
    const voucherTypes: VoucherType[] = ["JV", "CPV", "CRV", "BPV", "BRV", "CONTRA"];

    for (const vType of voucherTypes) {
      const result = await getVouchersByType(vType, 20);
      if (result.success && result.data) {
        allVouchers.push(...(result.data as VoucherRecord[]));
      }
    }

    // Sort by date descending
    allVouchers.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    setVouchers(allVouchers.slice(0, 50));
    setVoucherListLoading(false);
  };

  const resetAllForms = () => {
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setVoucherDescription("");
    setPayeeName("");
    setExpenseAccountId("");
    setReceiptAccountId("");
    setBankAccountId("");
    setFromAccountId("");
    setToAccountId("");
    setAmount("");
    setJvLines([
      { accountId: "", description: "", debit: "", credit: "" },
      { accountId: "", description: "", debit: "", credit: "" },
    ]);
    setCreatedVoucherNumber(null);
  };

  // JV line management
  const addJvLine = () => {
    setJvLines([...jvLines, { accountId: "", description: "", debit: "", credit: "" }]);
  };

  const removeJvLine = (index: number) => {
    if (jvLines.length <= 2) return;
    setJvLines(jvLines.filter((_, i) => i !== index));
  };

  const updateJvLine = (index: number, field: keyof JournalLine, value: string) => {
    const newLines = [...jvLines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === "debit" && value) {
      newLines[index].credit = "";
    } else if (field === "credit" && value) {
      newLines[index].debit = "";
    }
    setJvLines(newLines);
  };

  const totalJvDebit = jvLines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
  const totalJvCredit = jvLines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);
  const isJvBalanced = Math.abs(totalJvDebit - totalJvCredit) < 0.01;

  // Account filters
  const cashAccounts = filterAccountsByCode(accounts, ["1000", "1030"]);
  const bankAccounts = filterAccountsByCode(accounts, ["1010", "1020"]);
  const cashAndBankAccounts = [...cashAccounts, ...bankAccounts];
  const expenseAccounts = filterAccountsByType(accounts, "expense");
  const incomeAccounts = filterAccountsByType(accounts, "income");

  const handleSubmit = async () => {
    setMessage(null);
    setCreatedVoucherNumber(null);

    // Common validation
    if (!voucherDate) {
      setMessage({ type: "error", text: "Date is required" });
      return;
    }

    let voucherData: VoucherData | null = null;

    switch (activeTab) {
      case "JV": {
        if (!isJvBalanced) {
          setMessage({ type: "error", text: "Journal entry must be balanced (Debit = Credit)" });
          return;
        }
        if (jvLines.some((line) => !line.accountId)) {
          setMessage({ type: "error", text: "All lines must have an account selected" });
          return;
        }
        if (totalJvDebit === 0) {
          setMessage({ type: "error", text: "Amount cannot be zero" });
          return;
        }
        voucherData = {
          voucherType: "JV",
          date: voucherDate,
          description: voucherDescription,
          amount: totalJvDebit.toFixed(2),
          lines: jvLines,
        };
        break;
      }
      case "CPV": {
        if (!expenseAccountId) {
          setMessage({ type: "error", text: "Please select an expense account" });
          return;
        }
        if (!amount || parseFloat(amount) <= 0) {
          setMessage({ type: "error", text: "Please enter a valid amount" });
          return;
        }
        voucherData = {
          voucherType: "CPV",
          date: voucherDate,
          description: voucherDescription,
          amount,
          expenseAccountId,
          payeeName,
        };
        break;
      }
      case "CRV": {
        if (!receiptAccountId) {
          setMessage({ type: "error", text: "Please select a receipt account" });
          return;
        }
        if (!amount || parseFloat(amount) <= 0) {
          setMessage({ type: "error", text: "Please enter a valid amount" });
          return;
        }
        voucherData = {
          voucherType: "CRV",
          date: voucherDate,
          description: voucherDescription,
          amount,
          receiptAccountId,
          payeeName,
        };
        break;
      }
      case "BPV": {
        if (!expenseAccountId || !bankAccountId) {
          setMessage({ type: "error", text: "Please select both expense and bank accounts" });
          return;
        }
        if (!amount || parseFloat(amount) <= 0) {
          setMessage({ type: "error", text: "Please enter a valid amount" });
          return;
        }
        voucherData = {
          voucherType: "BPV",
          date: voucherDate,
          description: voucherDescription,
          amount,
          expenseAccountId,
          bankAccountId,
          payeeName,
        };
        break;
      }
      case "BRV": {
        if (!receiptAccountId || !bankAccountId) {
          setMessage({ type: "error", text: "Please select both receipt and bank accounts" });
          return;
        }
        if (!amount || parseFloat(amount) <= 0) {
          setMessage({ type: "error", text: "Please enter a valid amount" });
          return;
        }
        voucherData = {
          voucherType: "BRV",
          date: voucherDate,
          description: voucherDescription,
          amount,
          receiptAccountId,
          bankAccountId,
          payeeName,
        };
        break;
      }
      case "CONTRA": {
        if (!fromAccountId || !toAccountId) {
          setMessage({ type: "error", text: "Please select both from and to accounts" });
          return;
        }
        if (fromAccountId === toAccountId) {
          setMessage({ type: "error", text: "From and To accounts must be different" });
          return;
        }
        if (!amount || parseFloat(amount) <= 0) {
          setMessage({ type: "error", text: "Please enter a valid amount" });
          return;
        }
        voucherData = {
          voucherType: "CONTRA",
          date: voucherDate,
          description: voucherDescription,
          amount,
          fromAccountId,
          toAccountId,
          payeeName,
        };
        break;
      }
    }

    if (!voucherData) return;

    setSubmitting(true);
    const result = await createVoucher(voucherData);

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Voucher created successfully" });
      setCreatedVoucherNumber(result.voucherNumber || null);
      resetAllForms();
      fetchAllVouchers();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to create voucher" });
    }

    setSubmitting(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleViewVoucher = async (voucherId: string) => {
    setVoucherDetailLoading(true);
    setVoucherDetailOpen(true);

    // Import getVoucherWithLines dynamically to avoid circular deps
    const { getVoucherWithLines } = await import("@/lib/actions/accounts");
    const result = await getVoucherWithLines(voucherId);

    if (result.success && result.data) {
      setSelectedVoucher(result.data as VoucherDetail);
    } else {
      setMessage({ type: "error", text: "Failed to load voucher details" });
    }
    setVoucherDetailLoading(false);
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  const AccountSelect = ({
    value,
    onChange,
    accountsList,
    placeholder = "Select Account",
  }: {
    value: string;
    onChange: (val: string) => void;
    accountsList: ChartOfAccount[];
    placeholder?: string;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-nexabook-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
    >
      <option value="">{placeholder}</option>
      {accountsList.map((acc) => (
        <option key={acc.id} value={acc.id}>
          {acc.code} - {acc.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Accounts", href: "/accounts" },
          { label: "Accounting Vouchers" },
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
              <FileText className="h-8 w-8 text-blue-600" />
              Accounting Vouchers
            </h1>
            <p className="text-nexabook-600 mt-1">
              Create and manage accounting vouchers
            </p>
          </div>
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

      {/* Created Voucher Number Display */}
      {createdVoucherNumber && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg text-center"
        >
          <p className="text-sm text-blue-600 mb-1">Voucher Created Successfully</p>
          <p className="text-3xl font-bold text-nexabook-900 font-mono tracking-wider">
            {createdVoucherNumber}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintVoucher}
            className="mt-3 border-blue-200 text-blue-600 hover:bg-blue-100"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print Voucher
          </Button>
        </motion.div>
      )}

      {/* Voucher Creation Form */}
      <Card className="border-nexabook-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-nexabook-900">New Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VoucherType)}>
            <TabsList className="w-full justify-start overflow-x-auto bg-nexabook-50 border border-nexabook-200 p-1">
              {VOUCHER_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-nexabook-900 data-[state=active]:shadow-sm"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.value}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Journal Voucher Tab */}
            <TabsContent value="JV" className="mt-4">
              <div className="space-y-4">
                {/* Common fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jv-date">Date *</Label>
                    <Input
                      id="jv-date"
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jv-ref">Reference</Label>
                    <Input
                      id="jv-ref"
                      value={voucherDescription}
                      onChange={(e) => setVoucherDescription(e.target.value)}
                      placeholder="Description or reference"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>

                {/* JV Lines */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-nexabook-900">Journal Lines</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addJvLine}
                      className="border-nexabook-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Line
                    </Button>
                  </div>

                  {jvLines.map((line, index) => (
                    <div
                      key={index}
                      className="p-3 bg-nexabook-50 rounded-lg border border-nexabook-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-nexabook-600">
                          Line {index + 1}
                        </span>
                        {jvLines.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeJvLine(index)}
                            className="h-6 w-6 p-0 text-nexabook-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Account *</Label>
                          <AccountSelect
                            value={line.accountId}
                            onChange={(val) => updateJvLine(index, "accountId", val)}
                            accountsList={accounts}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Debit</Label>
                          <Input
                            type="number"
                            value={line.debit}
                            onChange={(e) => updateJvLine(index, "debit", e.target.value)}
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
                            onChange={(e) => updateJvLine(index, "credit", e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            disabled={!!line.debit}
                            className="border-nexabook-200 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Input
                          value={line.description}
                          onChange={(e) => updateJvLine(index, "description", e.target.value)}
                          placeholder="Line description (optional)"
                          className="border-nexabook-200 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Balance indicator */}
                <div className="p-4 bg-nexabook-100 rounded-lg border border-nexabook-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-nexabook-600 mb-1">Total Debit</p>
                      <p className="text-xl font-bold text-nexabook-900 font-mono">
                        {totalJvDebit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-600 mb-1">Total Credit</p>
                      <p className="text-xl font-bold text-nexabook-900 font-mono">
                        {totalJvCredit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-nexabook-300">
                    <div className="flex items-center gap-2">
                      {isJvBalanced ? (
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
                            Not balanced (Diff: {(totalJvDebit - totalJvCredit).toFixed(2)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Cash Payment Voucher Tab */}
            <TabsContent value="CPV" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpv-date">Date *</Label>
                    <Input
                      id="cpv-date"
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpv-amount">Amount *</Label>
                    <Input
                      id="cpv-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expense Account (Dr) *</Label>
                  <AccountSelect
                    value={expenseAccountId}
                    onChange={setExpenseAccountId}
                    accountsList={expenseAccounts}
                    placeholder="Select expense account"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpv-payee">Payee Name</Label>
                    <Input
                      id="cpv-payee"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="Who is receiving payment"
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpv-desc">Description</Label>
                    <Input
                      id="cpv-desc"
                      value={voucherDescription}
                      onChange={(e) => setVoucherDescription(e.target.value)}
                      placeholder="Payment description"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="p-3 bg-nexabook-50 rounded border border-nexabook-200 text-sm text-nexabook-600">
                  <p className="font-medium">Auto-posting:</p>
                  <p>Dr: Selected Expense Account | Cr: Cash (1000)</p>
                </div>
              </div>
            </TabsContent>

            {/* Cash Receipt Voucher Tab */}
            <TabsContent value="CRV" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="crv-date">Date *</Label>
                    <Input
                      id="crv-date"
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crv-amount">Amount *</Label>
                    <Input
                      id="crv-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Receipt/Income Account (Cr) *</Label>
                  <AccountSelect
                    value={receiptAccountId}
                    onChange={setReceiptAccountId}
                    accountsList={incomeAccounts}
                    placeholder="Select receipt/income account"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="crv-payer">Payer Name</Label>
                    <Input
                      id="crv-payer"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="Who is making payment"
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crv-desc">Description</Label>
                    <Input
                      id="crv-desc"
                      value={voucherDescription}
                      onChange={(e) => setVoucherDescription(e.target.value)}
                      placeholder="Receipt description"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="p-3 bg-nexabook-50 rounded border border-nexabook-200 text-sm text-nexabook-600">
                  <p className="font-medium">Auto-posting:</p>
                  <p>Dr: Cash (1000) | Cr: Selected Receipt/Income Account</p>
                </div>
              </div>
            </TabsContent>

            {/* Bank Payment Voucher Tab */}
            <TabsContent value="BPV" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bpv-date">Date *</Label>
                    <Input
                      id="bpv-date"
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpv-amount">Amount *</Label>
                    <Input
                      id="bpv-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expense Account (Dr) *</Label>
                    <AccountSelect
                      value={expenseAccountId}
                      onChange={setExpenseAccountId}
                      accountsList={expenseAccounts}
                      placeholder="Select expense account"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Account (Cr) *</Label>
                    <AccountSelect
                      value={bankAccountId}
                      onChange={setBankAccountId}
                      accountsList={bankAccounts}
                      placeholder="Select bank account"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bpv-payee">Payee Name</Label>
                    <Input
                      id="bpv-payee"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="Who is receiving payment"
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpv-desc">Description</Label>
                    <Input
                      id="bpv-desc"
                      value={voucherDescription}
                      onChange={(e) => setVoucherDescription(e.target.value)}
                      placeholder="Payment description"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="p-3 bg-nexabook-50 rounded border border-nexabook-200 text-sm text-nexabook-600">
                  <p className="font-medium">Auto-posting:</p>
                  <p>Dr: Selected Expense Account | Cr: Selected Bank Account</p>
                </div>
              </div>
            </TabsContent>

            {/* Bank Receipt Voucher Tab */}
            <TabsContent value="BRV" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brv-date">Date *</Label>
                    <Input
                      id="brv-date"
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brv-amount">Amount *</Label>
                    <Input
                      id="brv-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Account (Dr) *</Label>
                    <AccountSelect
                      value={bankAccountId}
                      onChange={setBankAccountId}
                      accountsList={bankAccounts}
                      placeholder="Select bank account"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt/Income Account (Cr) *</Label>
                    <AccountSelect
                      value={receiptAccountId}
                      onChange={setReceiptAccountId}
                      accountsList={incomeAccounts}
                      placeholder="Select receipt/income account"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brv-payer">Payer Name</Label>
                    <Input
                      id="brv-payer"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="Who is making payment"
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brv-desc">Description</Label>
                    <Input
                      id="brv-desc"
                      value={voucherDescription}
                      onChange={(e) => setVoucherDescription(e.target.value)}
                      placeholder="Receipt description"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="p-3 bg-nexabook-50 rounded border border-nexabook-200 text-sm text-nexabook-600">
                  <p className="font-medium">Auto-posting:</p>
                  <p>Dr: Selected Bank Account | Cr: Selected Receipt/Income Account</p>
                </div>
              </div>
            </TabsContent>

            {/* Contra Voucher Tab */}
            <TabsContent value="CONTRA" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contra-date">Date *</Label>
                    <Input
                      id="contra-date"
                      type="date"
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="border-nexabook-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contra-amount">Amount *</Label>
                    <Input
                      id="contra-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="border-nexabook-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Account (Cr) *</Label>
                    <AccountSelect
                      value={fromAccountId}
                      onChange={setFromAccountId}
                      accountsList={cashAndBankAccounts}
                      placeholder="Select from account (Cash/Bank)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Account (Dr) *</Label>
                    <AccountSelect
                      value={toAccountId}
                      onChange={setToAccountId}
                      accountsList={cashAndBankAccounts}
                      placeholder="Select to account (Cash/Bank)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contra-desc">Description</Label>
                  <Input
                    id="contra-desc"
                    value={voucherDescription}
                    onChange={(e) => setVoucherDescription(e.target.value)}
                    placeholder="Transfer description"
                    className="border-nexabook-200"
                  />
                </div>
                <div className="p-3 bg-nexabook-50 rounded border border-nexabook-200 text-sm text-nexabook-600">
                  <p className="font-medium">Auto-posting:</p>
                  <p>Dr: To Account | Cr: From Account</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit button outside Tabs but within form */}
          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              variant="outline"
              onClick={resetAllForms}
              className="border-nexabook-200"
            >
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-nexabook-900 hover:bg-nexabook-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Voucher
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voucher List */}
      <Card className="border-nexabook-200">
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900 flex items-center justify-between">
            <span>Recent Vouchers</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllVouchers}
              className="border-nexabook-200"
            >
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {voucherListLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No Vouchers Yet
              </h3>
              <p className="text-nexabook-600 max-w-md mx-auto">
                Create your first voucher using the form above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-nexabook-200">
                    <TableHead className="text-nexabook-700">Voucher #</TableHead>
                    <TableHead className="text-nexabook-700">Type</TableHead>
                    <TableHead className="text-nexabook-700">Date</TableHead>
                    <TableHead className="text-nexabook-700">Description</TableHead>
                    <TableHead className="text-nexabook-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((voucher) => (
                    <TableRow key={voucher.id} className="border-nexabook-100">
                      <TableCell className="font-mono text-sm font-medium text-nexabook-900">
                        {voucher.entryNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getVoucherTypeBadgeColor(voucher.entryNumber)}
                        >
                          {getVoucherLabel(voucher.entryNumber)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-nexabook-600">
                        {new Date(voucher.entryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-nexabook-600 max-w-xs truncate">
                        {voucher.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVoucher(voucher.id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePrintVoucher}
                            className="text-nexabook-600 hover:text-nexabook-700 hover:bg-nexabook-50"
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voucher Detail Sheet */}
      <Sheet open={voucherDetailOpen} onOpenChange={setVoucherDetailOpen}>
        <SheetContent side="right" className="w-[700px] sm:max-w-none">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-2xl text-nexabook-900">
              Voucher Details
            </SheetTitle>
            <SheetDescription>
              {selectedVoucher ? selectedVoucher.entry.entryNumber : "Loading..."}
            </SheetDescription>
          </SheetHeader>

          {voucherDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
            </div>
          ) : selectedVoucher ? (
            <div className="space-y-6 py-6">
              {/* Voucher info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-nexabook-600">Voucher Number</p>
                  <p className="text-lg font-bold text-nexabook-900 font-mono">
                    {selectedVoucher.entry.entryNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-nexabook-600">Date</p>
                  <p className="text-lg font-medium text-nexabook-900">
                    {new Date(selectedVoucher.entry.entryDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-nexabook-600">Description</p>
                  <p className="text-sm text-nexabook-900">
                    {selectedVoucher.entry.description || "-"}
                  </p>
                </div>
              </div>

              {/* Lines */}
              <div>
                <h4 className="text-sm font-semibold text-nexabook-900 mb-3">Account Lines</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="border-nexabook-200">
                      <TableHead className="text-nexabook-700">Account</TableHead>
                      <TableHead className="text-nexabook-700">Description</TableHead>
                      <TableHead className="text-nexabook-700 text-right">Debit</TableHead>
                      <TableHead className="text-nexabook-700 text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVoucher.lines.map((line) => (
                      <TableRow key={line.id} className="border-nexabook-100">
                        <TableCell className="text-sm font-medium text-nexabook-900">
                          {line.accountCode} - {line.accountName}
                        </TableCell>
                        <TableCell className="text-sm text-nexabook-600">
                          {line.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono text-nexabook-900">
                          {parseFloat(line.debitAmount) > 0
                            ? parseFloat(line.debitAmount).toFixed(2)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono text-nexabook-900">
                          {parseFloat(line.creditAmount) > 0
                            ? parseFloat(line.creditAmount).toFixed(2)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="p-4 bg-nexabook-100 rounded-lg border border-nexabook-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-nexabook-600">Total Debit</p>
                    <p className="text-xl font-bold text-nexabook-900 font-mono">
                      {selectedVoucher.lines
                        .reduce((s, l) => s + parseFloat(l.debitAmount || "0"), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Credit</p>
                    <p className="text-xl font-bold text-nexabook-900 font-mono">
                      {selectedVoucher.lines
                        .reduce((s, l) => s + parseFloat(l.creditAmount || "0"), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Print button */}
              <div className="flex justify-end">
                <Button
                  onClick={handlePrintVoucher}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Voucher
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
