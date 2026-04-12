"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Printer, BookOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getAllAccounts, getLedgerReport } from "@/lib/actions/accounts";

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string; type: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<null | Awaited<ReturnType<typeof getLedgerReport>>>(null);

  useEffect(() => {
    async function loadAccounts() {
      const res = await getAllAccounts();
      if (res.success && res.data) {
        setAccounts(res.data as any);
      }
    }
    loadAccounts();
  }, []);

  const handleGenerate = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setReport(null);
    const res = await getLedgerReport(selectedAccount, dateFrom, dateTo);
    setReport(res);
    setLoading(false);
  };

  const handlePrint = () => window.print();

  const typeColor = (type: string) => {
    switch (type) {
      case "asset": return "bg-blue-100 text-blue-800";
      case "liability": return "bg-amber-100 text-amber-800";
      case "equity": return "bg-purple-100 text-purple-800";
      case "income": return "bg-green-100 text-green-800";
      case "expense": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">General Ledger</h1>
            <p className="text-nexabook-600 mt-1">Detailed transaction history for any account</p>
          </div>
          {report?.data && (
            <Button variant="outline" onClick={handlePrint} className="print:hidden">
              <Printer className="h-4 w-4 mr-2" />Print
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader><CardTitle>Filters</CardTitle><CardDescription>Select an account and date range to view the ledger</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!selectedAccount || loading}
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {loading ? "Generating…" : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        </div>
      )}

      {/* Report */}
      {!loading && report?.data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Account Header */}
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-6 w-6 text-nexabook-900" />
                <h2 className="text-xl font-bold text-nexabook-900">
                  {report.data.account.code} — {report.data.account.name}
                </h2>
                <Badge className={typeColor(report.data.account.type)}>
                  {report.data.account.type}
                </Badge>
              </div>
              {report.data.transactions.length === 0 && (
                <p className="text-sm text-nexabook-500">No transactions found for this period.</p>
              )}
            </CardContent>
          </Card>

          {report.data.transactions.length > 0 && (
            <>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.data.transactions.map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {new Date(tx.date).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{tx.entryNumber}</TableCell>
                        <TableCell className="text-sm text-nexabook-600 max-w-xs truncate">{tx.description}</TableCell>
                        <TableCell className="text-right">
                          {parseFloat(tx.debit) > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-green-700">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              {parseFloat(tx.debit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-nexabook-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(tx.credit) > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-red-700">
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              {parseFloat(tx.credit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-nexabook-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          <span className={parseFloat(tx.balance) >= 0 ? "text-nexabook-900" : "text-red-700"}>
                            {parseFloat(tx.balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Footer Totals */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <Separator className="mb-4" />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Debit</p>
                      <p className="text-lg font-bold text-green-700 mt-1">
                        {parseFloat(report.data.totalDebit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Credit</p>
                      <p className="text-lg font-bold text-red-700 mt-1">
                        {parseFloat(report.data.totalCredit).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Closing Balance</p>
                      <p className={`text-lg font-bold mt-1 ${parseFloat(report.data.closingBalance) >= 0 ? "text-nexabook-900" : "text-red-700"}`}>
                        {parseFloat(report.data.closingBalance).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      )}

      {/* Empty state — no report generated yet */}
      {!loading && !report && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No report generated</h3>
            <p className="text-sm text-nexabook-500 mt-1">Select an account and click "Generate Report" to view the ledger</p>
          </CardContent>
        </Card>
      )}

      {/* No transactions for selected account */}
      {!loading && report?.data && report.data.transactions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No transactions found</h3>
            <p className="text-sm text-nexabook-500 mt-1">No journal entries exist for this account in the selected date range</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
