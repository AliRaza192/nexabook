"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Printer, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getBankAccounts, getBankReconciliation, ReconciliationTransaction } from "@/lib/actions/banking";

function fmt(n: string): string {
  return parseFloat(n).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState<{ id: string; accountName: string; accountNumber: string }[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [reconciled, setReconciled] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<Awaited<ReturnType<typeof getBankReconciliation>> | null>(null);

  useEffect(() => {
    async function loadBanks() {
      const res = await getBankAccounts();
      if (res.success && res.data) {
        setBankAccounts(res.data as any);
      }
    }
    loadBanks();
  }, []);

  const handleGenerate = async () => {
    if (!selectedBank || !statementDate) return;
    setLoading(true);
    setReconciled({});
    setReport(null);
    const res = await getBankReconciliation(selectedBank, statementDate, dateFrom, dateTo);
    if (res.success && res.data) {
      const initial: Record<string, boolean> = {};
      res.data.transactions.forEach(t => { initial[t.id] = false; });
      setReconciled(initial);
    }
    setReport(res);
    setLoading(false);
  };

  const toggleReconciled = (id: string) => {
    setReconciled(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => window.print();

  // Calculate unreconciled items
  const unreconciledTx = report?.data?.transactions.filter(t => !reconciled[t.id]) || [];
  const unreconciledDebits = unreconciledTx.reduce((s, t) => s + parseFloat(t.debit), 0);
  const unreconciledCredits = unreconciledTx.reduce((s, t) => s + parseFloat(t.credit), 0);

  const statementBal = parseFloat(statementBalance || '0');
  const systemBal = report?.data ? parseFloat(report.data.systemBookBalance) : 0;
  const difference = statementBal - systemBal;
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Bank Reconciliation</h1>
            <p className="text-nexabook-600 mt-1">Match bank statement with system transactions</p>
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
        <CardHeader><CardTitle>Reconciliation Setup</CardTitle><CardDescription>Select bank account and enter statement details</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger><SelectValue placeholder="Select bank…" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.accountName} ({b.accountNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statement Date</Label>
              <Input type="date" value={statementDate} onChange={e => setStatementDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Statement Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalance}
                onChange={e => setStatementBalance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date From (optional)</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <Button onClick={handleGenerate} disabled={!selectedBank || !statementDate || loading} className="bg-nexabook-900 hover:bg-nexabook-800">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {loading ? "Loading…" : "Load Transactions"}
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Bank Statement Balance</p>
                <p className="text-xl font-bold text-nexabook-900 mt-1">{fmt(statementBalance || '0')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">System Book Balance</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{fmt(report.data.systemBookBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Outstanding Items</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  {(unreconciledDebits > 0 || unreconciledCredits > 0)
                    ? fmt((unreconciledDebits - unreconciledCredits).toFixed(2))
                    : "0.00"}
                </p>
              </CardContent>
            </Card>
            <Card className={isBalanced ? "border-green-300 bg-green-50" : difference > 0 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Difference</p>
                <p className={`text-xl font-bold mt-1 ${isBalanced ? "text-green-700" : "text-red-700"}`}>
                  {fmt(difference.toFixed(2))}
                </p>
                {isBalanced && <Badge className="bg-green-100 text-green-800 text-xs mt-1">Reconciled ✓</Badge>}
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader><CardTitle>System Transactions</CardTitle><CardDescription>Check items that appear on your bank statement</CardDescription></CardHeader>
            {report.data.transactions.length === 0 ? (
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-12 w-12 mx-auto mb-3 text-nexabook-200" />
                <p className="text-nexabook-500">No transactions found for this account and period</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">✓</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.transactions.map(tx => (
                    <TableRow key={tx.id} className={reconciled[tx.id] ? "bg-green-50/50" : ""}>
                      <TableCell>
                        <Switch
                          checked={reconciled[tx.id] || false}
                          onCheckedChange={() => toggleReconciled(tx.id)}
                        />
                      </TableCell>
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
                      <TableCell className="text-right">
                        {reconciled[tx.id]
                          ? <Badge className="bg-green-100 text-green-800 text-xs">Matched</Badge>
                          : <Badge variant="outline" className="text-xs text-amber-600">Unmatched</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Totals */}
          {report.data.transactions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <Separator className="mb-4" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Debits</p>
                    <p className="text-lg font-bold text-green-700 mt-1">{fmt(report.data.totalDebits)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Credits</p>
                    <p className="text-lg font-bold text-red-700 mt-1">{fmt(report.data.totalCredits)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">Net (System)</p>
                    <p className="text-lg font-bold text-nexabook-900 mt-1">{fmt(report.data.systemBookBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !report && (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No reconciliation started</h3>
            <p className="text-sm text-nexabook-500 mt-1">Select a bank account and enter your statement balance to begin</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
