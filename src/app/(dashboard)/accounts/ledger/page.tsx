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
import { Loader2, Printer, BookOpen, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { getAllAccounts, getLedgerReport } from "@/lib/actions/accounts";
import { formatPKR } from "@/lib/utils/number-format";
import ReportExportButtons from "@/components/reports/ReportExportButtons";

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

  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
            <div className="flex items-center gap-2">
              <ReportExportButtons reportTitle="General Ledger Report" reportData={report.data} />
              <Button variant="outline" onClick={handlePrint} className="print-hidden">
                <Printer className="h-4 w-4 mr-2" />Print
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Filters - Hidden on print */}
      <Card className="print-hidden">
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
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Card className="enterprise-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-nexabook-600">Opening Balance</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency(parseFloat(report.data.closingBalance) - (parseFloat(report.data.totalDebit) - parseFloat(report.data.totalCredit)))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="enterprise-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-nexabook-600">Total Debit</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(parseFloat(report.data.totalDebit))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="enterprise-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-nexabook-600">Total Credit</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(parseFloat(report.data.totalCredit))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="enterprise-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-nexabook-50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-nexabook-600" />
                      </div>
                      <div>
                        <p className="text-xs text-nexabook-600">Closing Balance</p>
                        <p className={`text-lg font-bold ${parseFloat(report.data.closingBalance) >= 0 ? 'text-nexabook-900' : 'text-red-700'}`}>
                          {formatCurrency(parseFloat(report.data.closingBalance))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <Card>
                <Table id="report-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit (Dr)</TableHead>
                      <TableHead className="text-right">Credit (Cr)</TableHead>
                      <TableHead className="text-right">Running Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.data.transactions.map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-nexabook-900">{tx.entryNumber}</TableCell>
                        <TableCell className="text-sm text-nexabook-600 max-w-xs truncate">{tx.description}</TableCell>
                        <TableCell className="text-right">
                          {parseFloat(tx.debit) > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-green-700 font-semibold">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              {formatCurrency(parseFloat(tx.debit))}
                            </span>
                          ) : (
                            <span className="text-nexabook-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(tx.credit) > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-red-700 font-semibold">
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              {formatCurrency(parseFloat(tx.credit))}
                            </span>
                          ) : (
                            <span className="text-nexabook-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={parseFloat(tx.balance) >= 0 ? "text-nexabook-900" : "text-red-700"}>
                            {formatCurrency(parseFloat(tx.balance))}
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
                        {formatCurrency(parseFloat(report.data.totalDebit))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Credit</p>
                      <p className="text-lg font-bold text-red-700 mt-1">
                        {formatCurrency(parseFloat(report.data.totalCredit))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Closing Balance</p>
                      <p className={`text-lg font-bold mt-1 ${parseFloat(report.data.closingBalance) >= 0 ? "text-nexabook-900" : "text-red-700"}`}>
                        {formatCurrency(parseFloat(report.data.closingBalance))}
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
