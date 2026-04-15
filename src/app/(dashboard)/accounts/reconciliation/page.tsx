"use client";

import { useState, useEffect, useCallback } from "react";
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
import { 
  Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle 
} from "lucide-react";
import { getBankCOAAccounts, getBankReconciliation, ReconciliationTransaction } from "@/lib/actions/banking";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import { formatPKR } from "@/lib/utils/number-format";

// Pakistani currency formatting
const formatCurrency = (value: number) => formatPKR(value, 'south-asian');

export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [reconciled, setReconciled] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<Awaited<ReturnType<typeof getBankReconciliation>> | null>(null);

  // Load bank accounts from Chart of Accounts
  useEffect(() => {
    async function loadBanks() {
      const res = await getBankCOAAccounts();
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
    const res = await getBankReconciliation(selectedBank, statementDate, "", statementDate);
    if (res.success && res.data) {
      const initial: Record<string, boolean> = {};
      res.data.transactions.forEach(t => { initial[t.id] = false; });
      setReconciled(initial);
    }
    setReport(res);
    setLoading(false);
  };

  const toggleReconciled = useCallback((id: string) => {
    setReconciled(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Calculate reconciled/unreconciled items
  const allTx = report?.data?.transactions || [];
  const reconciledTx = allTx.filter(t => reconciled[t.id]);
  const unreconciledTx = allTx.filter(t => !reconciled[t.id]);
  
  const unreconciledDebits = unreconciledTx.reduce((s, t) => s + parseFloat(t.debit), 0);
  const unreconciledCredits = unreconciledTx.reduce((s, t) => s + parseFloat(t.credit), 0);
  const outstandingItems = unreconciledDebits - unreconciledCredits;

  const statementBal = parseFloat(statementBalance || '0');
  const systemBal = report?.data ? parseFloat(report.data.systemBookBalance) : 0;
  const difference = statementBal - systemBal;
  const isBalanced = Math.abs(difference) < 0.01;

  // Excel export handler
  const handleExcelExport = useCallback(() => {
    const tableElement = document.getElementById("reconciliation-table") as HTMLTableElement;
    if (tableElement) {
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Bank-Reconciliation-${dateStr}`;
      
      // Dynamically import to avoid SSR issues
      import("@/lib/excel-export").then(({ exportTableToExcel }) => {
        exportTableToExcel(tableElement, fileName, "Bank Reconciliation");
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Bank Reconciliation</h1>
            <p className="text-nexabook-600 mt-1">Match bank statement with system transactions</p>
          </div>
          {report?.data && (
            <ReportExportButtons 
              reportTitle="Bank Reconciliation" 
              tableId="reconciliation-table"
              onExportExcel={handleExcelExport}
            />
          )}
        </div>
      </motion.div>

      {/* Filters Card */}
      <Card className="print-hidden enterprise-card">
        <CardHeader>
          <CardTitle className="text-nexabook-900">Reconciliation Setup</CardTitle>
          <CardDescription>Select bank account and enter statement details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Bank Account Selector */}
            <div className="space-y-2">
              <Label className="text-nexabook-700">Bank Account</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Select bank account…" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Statement Date (Date To) */}
            <div className="space-y-2">
              <Label className="text-nexabook-700">Statement Date</Label>
              <Input 
                type="date" 
                value={statementDate} 
                onChange={e => setStatementDate(e.target.value)}
                className="border-slate-200"
              />
            </div>

            {/* Statement Ending Balance (Manual Input) */}
            <div className="space-y-2">
              <Label className="text-nexabook-700">Statement Ending Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalance}
                onChange={e => setStatementBalance(e.target.value)}
                className="border-slate-200"
              />
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={!selectedBank || !statementDate || loading} 
              className="bg-nexabook-900 hover:bg-nexabook-800"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loading ? "Loading…" : "Load Transactions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        </div>
      )}

      {/* Report Content */}
      {!loading && report?.data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Reconciliation Summary - 4 Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Statement Balance */}
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Statement Balance</p>
                <p className="text-xl font-bold text-nexabook-900 mt-1">
                  {formatCurrency(statementBal)}
                </p>
              </CardContent>
            </Card>

            {/* Card 2: System Book Balance */}
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">System Book Balance</p>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {formatCurrency(systemBal)}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Difference */}
            <Card className="enterprise-card">
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Difference</p>
                <p className={`text-xl font-bold mt-1 ${isBalanced ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(difference)}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Status */}
            <Card className={`enterprise-card ${isBalanced ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <CardContent className="p-5">
                <p className="text-xs text-nexabook-500 uppercase tracking-wide">Status</p>
                <div className="flex items-center gap-2 mt-2">
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-700" />
                      <p className="text-lg font-bold text-green-700">Balanced ✓</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-700" />
                      <p className="text-lg font-bold text-red-700">Unbalanced</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-nexabook-900">System Transactions</CardTitle>
              <CardDescription>Check items that appear on your bank statement</CardDescription>
            </CardHeader>
            {allTx.length === 0 ? (
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-12 w-12 mx-auto mb-3 text-nexabook-200" />
                <p className="text-nexabook-500">No transactions found for this account and period</p>
              </CardContent>
            ) : (
              <>
                <Table id="reconciliation-table">
                  <TableHeader>
                    <TableRow className="bg-nexabook-50">
                      <TableHead className="w-16 text-center">Match</TableHead>
                      <TableHead className="text-nexabook-900">Date</TableHead>
                      <TableHead className="text-nexabook-900">Entry #</TableHead>
                      <TableHead className="text-nexabook-900">Description</TableHead>
                      <TableHead className="text-right text-nexabook-900">Debit</TableHead>
                      <TableHead className="text-right text-nexabook-900">Credit</TableHead>
                      <TableHead className="text-right text-nexabook-900">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTx.map(tx => (
                      <TableRow 
                        key={tx.id} 
                        className={`transition-colors ${reconciled[tx.id] ? "bg-green-50/50" : "hover:bg-slate-50"}`}
                      >
                        <TableCell className="text-center">
                          <Switch
                            checked={reconciled[tx.id] || false}
                            onCheckedChange={() => toggleReconciled(tx.id)}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </TableCell>
                        <TableCell className="text-sm text-nexabook-700">
                          {new Date(tx.date).toLocaleDateString("en-PK", { 
                            year: "numeric", 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-nexabook-900">
                          {tx.entryNumber}
                        </TableCell>
                        <TableCell className="text-sm text-nexabook-600 max-w-xs truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(tx.debit) > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-green-700 font-medium">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              {formatCurrency(parseFloat(tx.debit))}
                            </span>
                          ) : (
                            <span className="text-nexabook-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(tx.credit) > 0 ? (
                            <span className="flex items-center justify-end gap-1 text-red-700 font-medium">
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              {formatCurrency(parseFloat(tx.credit))}
                            </span>
                          ) : (
                            <span className="text-nexabook-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {reconciled[tx.id]
                            ? <Badge className="bg-green-100 text-green-800 text-xs font-medium">Matched</Badge>
                            : <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals Footer */}
                <CardContent className="p-4">
                  <Separator className="mb-4" />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Debits</p>
                      <p className="text-lg font-bold text-green-700 mt-1">
                        {formatCurrency(parseFloat(report.data.totalDebits))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Credits</p>
                      <p className="text-lg font-bold text-red-700 mt-1">
                        {formatCurrency(parseFloat(report.data.totalCredits))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-nexabook-500 uppercase tracking-wide">Net (System)</p>
                      <p className="text-lg font-bold text-nexabook-900 mt-1">
                        {formatCurrency(systemBal)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !report && (
        <Card className="enterprise-card">
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No reconciliation started</h3>
            <p className="text-sm text-nexabook-500 mt-1">
              Select a bank account and enter your statement balance to begin
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
