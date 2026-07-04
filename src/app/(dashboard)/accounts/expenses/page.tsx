"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Receipt,
  Calculator,
  Loader2,
  Save,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recordExpense,
  getExpenseAccounts,
  getCashBankAccounts,
  getExpenses,
  type ExpenseFormData,
} from "@/lib/actions/purchases";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface ExpenseRecord {
  id: string;
  amount: string;
  date: Date;
  reference: string | null;
  description: string | null;
  createdAt: Date;
  account: {
    id: string;
    code: string;
    name: string;
  } | null;
  paidFromAccount: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  thisMonth: number;
}

// Stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  color: "blue" | "green" | "orange";
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${colors.border} hover:shadow-md transition-shadow`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-nexabook-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-nexabook-900">{value}</p>
              <p className="text-xs text-nexabook-500 mt-2">{description}</p>
            </div>
            <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${colors.icon}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Expenses Page
export default function ExpensesPage() {
  const router = useRouter();
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<Account[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseRecord[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ExpenseFormData>({
    accountId: "",
    amount: "",
    date: new Date(),
    reference: "",
    description: "",
    paidFromAccountId: "",
  });

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsRes, cashBankRes, expensesRes] = await Promise.all([
        getExpenseAccounts(),
        getCashBankAccounts(),
        getExpenses(50),
      ]);

      if (accountsRes.success && accountsRes.data) {
        setExpenseAccounts(accountsRes.data as Account[]);
      }
      if (cashBankRes.success && cashBankRes.data) {
        setCashBankAccounts(cashBankRes.data as Account[]);
      }
      if (expensesRes.success && expensesRes.data) {
        const expenseData = expensesRes.data as ExpenseRecord[];
        setRecentExpenses(expenseData);

        // Calculate stats
        const totalExpenses = expenseData.length;
        const totalAmount = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount || '0'), 0);
        const thisMonth = expenseData.filter(exp => {
          const expDate = new Date(exp.date);
          const now = new Date();
          return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        }).length;

        setStats({ totalExpenses, totalAmount, thisMonth });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountId) {
      alert("Please select an expense account");
      return;
    }
    if (!formData.paidFromAccountId) {
      alert("Please select a cash/bank account");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const result = await recordExpense(formData);

      if (result.success) {
        alert(`Expense recorded successfully! Journal Entry: ${result.entryNumber}`);
        // Reset form
        setFormData({
          accountId: "",
          amount: "",
          date: new Date(),
          reference: "",
          description: "",
          paidFromAccountId: "",
        });
        // Reload data
        loadData();
      } else {
        alert(result.error || "Failed to record expense");
      }
    } catch (error) {
      alert("Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return formatPKR(0, 'south-asian');
    return formatPKR(parseFloat(value), 'south-asian');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && !recentExpenses.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-nexabook-900">Expense Recording</h1>
        <p className="text-nexabook-600 mt-1">
          Record and track business expenses with automatic journal entries.
        </p>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Expenses"
            value={stats.totalExpenses}
            icon={Receipt}
            description="All records"
            color="blue"
          />
          <StatCard
            title="Total Amount"
            value={formatCurrency(stats.totalAmount.toString())}
            icon={DollarSign}
            description="All time"
            color="green"
          />
          <StatCard
            title="This Month"
            value={stats.thisMonth}
            icon={Clock}
            description="Current month"
            color="orange"
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left - Expense Form - 7 cols */}
        <div className="col-span-7">
          <Card className="border-nexabook-200 shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-nexabook-900 mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-nexabook-600" />
                Record New Expense
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Expense Account */}
                <div>
                  <Label className="text-sm font-medium text-nexabook-700 mb-1 block">
                    Expense Account *
                  </Label>
                  <Select
                    value={formData.accountId}
                    onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                  >
                    <SelectTrigger className="h-10 border-nexabook-200">
                      <SelectValue placeholder="Select expense account" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-xs text-gray-500">{account.code}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-nexabook-700 mb-1 block">
                      Amount (PKR) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="h-10 border-nexabook-200"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-nexabook-700 mb-1 block">
                      Date *
                    </Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : formData.date}
                        onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                        className="h-10 border-nexabook-200"
                        required
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Paid From Account */}
                <div>
                  <Label className="text-sm font-medium text-nexabook-700 mb-1 block">
                    Paid From (Cash/Bank Account) *
                  </Label>
                  <Select
                    value={formData.paidFromAccountId}
                    onValueChange={(value) => setFormData({ ...formData, paidFromAccountId: value })}
                  >
                    <SelectTrigger className="h-10 border-nexabook-200">
                      <SelectValue placeholder="Select cash/bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashBankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-xs text-gray-500">{account.code}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reference */}
                <div>
                  <Label className="text-sm font-medium text-nexabook-700 mb-1 block">
                    Reference
                  </Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Receipt number, bill reference, etc."
                    className="h-10 border-nexabook-200"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-nexabook-700 mb-1 block">
                    Description
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Expense details..."
                    className="min-h-[100px] border-nexabook-200"
                  />
                </div>

                {/* Accounting Entry Preview */}
                {formData.accountId && formData.paidFromAccountId && formData.amount && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Accounting Entry
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="text-blue-800 font-medium">Debit:</span>
                          <span className="text-blue-900 font-semibold">
                            {formatCurrency(formData.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="text-blue-800 font-medium">Credit:</span>
                          <span className="text-blue-900 font-semibold">
                            {formatCurrency(formData.amount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-nexabook-900 hover:bg-nexabook-800 h-10"
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recording...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" />Record Expense</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/accounts")}
                    className="h-10 border-nexabook-300 text-nexabook-700 hover:bg-nexabook-50"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right - Recent Expenses - 5 cols */}
        <div className="col-span-5 space-y-4">
          {/* Quick Info */}
          <Card className="border-nexabook-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-nexabook-900 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-nexabook-600" />
                How It Works
              </h3>
              <div className="space-y-3 text-sm text-nexabook-600">
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>Select an expense account from your Chart of Accounts</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <span>Enter amount and select payment source (Cash/Bank)</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <span>System automatically creates journal entry</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <span>Debit: Expense Account, Credit: Cash/Bank Account</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="border-nexabook-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-nexabook-900 mb-3">
                Recent Expenses ({recentExpenses.length})
              </h3>

              {recentExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-nexabook-300 mx-auto mb-3" />
                  <p className="text-sm text-nexabook-600">No expenses recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {recentExpenses.slice(0, 10).map((expense, index) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 border border-nexabook-200 rounded-lg hover:bg-nexabook-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-nexabook-900">
                            {expense.account?.name || "Unknown Account"}
                          </p>
                          {expense.description && (
                            <p className="text-xs text-nexabook-500 mt-1 line-clamp-2">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold">
                          {formatCurrency(expense.amount)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-nexabook-500">
                        <span>{formatDate(expense.date)}</span>
                        {expense.reference && (
                          <span className="font-mono">Ref: {expense.reference}</span>
                        )}
                      </div>
                      {expense.paidFromAccount && (
                        <p className="text-xs text-nexabook-500 mt-1">
                          Paid from: {expense.paidFromAccount.name}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
