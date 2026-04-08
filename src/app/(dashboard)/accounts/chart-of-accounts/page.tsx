"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  seedInitialCOA,
  getAccounts,
} from "@/lib/actions/accounts";
import type { ChartOfAccount } from "@/db/schema";

const typeColors: Record<string, { bg: string; text: string; badge: string }> = {
  asset: {
    bg: "bg-green-50",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800",
  },
  liability: {
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
  },
  equity: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
  },
  income: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-800",
  },
  expense: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800",
  },
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    const result = await getAccounts();

    if (result.success && result.data) {
      setAccounts(result.data as ChartOfAccount[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSeedCOA = async () => {
    setSeeding(true);
    setMessage(null);

    const result = await seedInitialCOA();

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Chart of Accounts seeded successfully" });
      await fetchAccounts();
    } else {
      setMessage({ type: "error", text: result.error || "Failed to seed chart of accounts" });
    }

    setSeeding(false);

    // Auto-hide message after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  const getBalance = (account: ChartOfAccount) => {
    // In a full implementation, you would calculate this from journal entries
    // For now, return a placeholder
    return "0.00";
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Accounts", href: "/accounts" },
          { label: "Chart of Accounts" },
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
              <BookOpen className="h-8 w-8 text-nexabook-600" />
              Chart of Accounts
            </h1>
            <p className="text-nexabook-600 mt-1">
              Manage your organization&apos;s chart of accounts
            </p>
          </div>
          <Button
            onClick={handleSeedCOA}
            disabled={seeding || accounts.length > 0}
            className="bg-nexabook-900 hover:bg-nexabook-800"
          >
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {accounts.length > 0 ? "Accounts Already Seeded" : "Seed Default Accounts"}
              </>
            )}
          </Button>
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

      {/* Accounts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">
              Accounts ({accounts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                  No Accounts Yet
                </h3>
                <p className="text-nexabook-600 max-w-md mx-auto mb-6">
                  Get started by seeding your chart of accounts with standard account types
                </p>
                <Button
                  onClick={handleSeedCOA}
                  disabled={seeding}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Seed Default Accounts
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-nexabook-50">
                    <TableHead className="font-semibold text-nexabook-900">Code</TableHead>
                    <TableHead className="font-semibold text-nexabook-900">Account Name</TableHead>
                    <TableHead className="font-semibold text-nexabook-900">Type</TableHead>
                    <TableHead className="font-semibold text-nexabook-900">Description</TableHead>
                    <TableHead className="font-semibold text-nexabook-900 text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account, index) => {
                    const colors = typeColors[account.type] || typeColors.asset;
                    return (
                      <TableRow
                        key={account.id}
                        className="hover:bg-nexabook-50 transition-colors"
                      >
                        <TableCell className="font-mono text-sm font-medium text-nexabook-900">
                          {account.code}
                        </TableCell>
                        <TableCell className="font-medium text-nexabook-900">
                          {account.name}
                          {!account.isActive && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}
                          >
                            {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-nexabook-600 max-w-xs truncate">
                          {account.description || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-nexabook-900">
                          {getBalance(account)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
