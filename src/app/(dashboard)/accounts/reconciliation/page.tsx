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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle,
  Upload, History, Undo2, Save,
} from "lucide-react";
import {
  parseBankStatementCSV,
  autoMatchTransactions,
  saveMatchResult,
  createBankStatement,
  finalizeReconciliation,
  undoReconciliation,
  getReconciliationHistory,
  StatementLine,
} from "@/lib/actions/bank-reconciliation";
import { getBankCOAAccounts, getBankReconciliation } from "@/lib/actions/banking";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import { formatPKR } from "@/lib/utils/number-format";
import CsvUpload from "@/components/bank-reconciliation/csv-upload";
import ReconciliationHistory from "@/components/bank-reconciliation/reconciliation-history";

const formatCurrency = (value: number) => formatPKR(value, "south-asian");

export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [reconciled, setReconciled] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<Awaited<ReturnType<typeof getBankReconciliation>> | null>(null);
  const [activeTab, setActiveTab] = useState("reconcile");

  // CSV import state
  const [csvStatement, setCsvStatement] = useState<StatementLine[] | null>(null);
  const [csvStatementId, setCsvStatementId] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [statementBalanceFromCsv, setStatementBalanceFromCsv] = useState<string>("");

  // Auto-match state
  const [autoMatching, setAutoMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<StatementLine[] | null>(null);

  // Finalize state
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState<string | null>(null);

  // Undo state
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [undoStatementId, setUndoStatementId] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState("");
  const [undoLoading, setUndoLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const loadBanks = async () => {
      const res = await getBankCOAAccounts();
      if (res.success && res.data) {
        setBankAccounts(res.data as any);
      }
    };
    loadBanks();
  }, []);

  // Load history when bank changes
  useEffect(() => {
    if (!selectedBank) return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      const res = await getReconciliationHistory(selectedBank);
      if (res.success && res.data) setHistory(res.data);
      setHistoryLoading(false);
    };
    loadHistory();
  }, [selectedBank]);

  const handleGenerate = async () => {
    if (!selectedBank || !statementDate) return;
    setLoading(true);
    setReconciled({});
    setReport(null);
    setCsvStatement(null);
    setCsvStatementId(null);
    setMatchResults(null);
    setFinalizeSuccess(null);
    const res = await getBankReconciliation(selectedBank, statementDate, "", statementDate);
    if (res.success && res.data) {
      const initial: Record<string, boolean> = {};
      res.data.transactions.forEach((t: any) => { initial[t.id] = false; });
      setReconciled(initial);
    }
    setReport(res);
    setLoading(false);
  };

  // CSV Upload handler
  const handleCsvUpload = useCallback(
    async (csvContent: string) => {
      if (!selectedBank) {
        alert("Please select a bank account first");
        return;
      }
      setCsvLoading(true);
      setFinalizeSuccess(null);

      const parseRes = await parseBankStatementCSV(csvContent, selectedBank);
      if (!parseRes.success || !parseRes.data) {
        alert(parseRes.error || "Failed to parse CSV");
        setCsvLoading(false);
        return;
      }

      const lines = parseRes.data;
      const closingBalance = lines.length > 0 ? lines[lines.length - 1].balance : 0;
      setStatementBalanceFromCsv(String(closingBalance));
      setStatementBalance(String(closingBalance));

      const dateFrom = lines.length > 0 ? lines[0].date : "";
      const dateTo = lines.length > 0 ? lines[lines.length - 1].date : "";
      if (dateFrom && dateTo) {
        setStatementDate(dateTo);
      }

      const stmtRes = await createBankStatement({
        bankAccountId: selectedBank,
        statementDate: dateTo || new Date().toISOString().split("T")[0],
        openingBalance: lines.length > 0 ? String(lines[0].balance - lines[0].credit + lines[0].debit) : "0",
        closingBalance: String(closingBalance),
        lines: lines.map((l) => ({
          date: l.date,
          description: l.description,
          reference: l.reference,
          debit: l.debit,
          credit: l.credit,
          balance: l.balance,
        })),
      });

      if (stmtRes.success && stmtRes.data) {
        setCsvStatementId(stmtRes.data.id);
        setCsvStatement(lines.map((l, i) => ({
          ...l,
          id: `csv-${i}`,
          matched: false,
        })));
      }

      // Also load system transactions
      if (dateFrom && dateTo) {
        const reconRes = await getBankReconciliation(selectedBank, dateTo, dateFrom, dateTo);
        if (reconRes.success && reconRes.data) {
          const initial: Record<string, boolean> = {};
          reconRes.data.transactions.forEach((t: any) => { initial[t.id] = false; });
          setReconciled(initial);
          setReport(reconRes);
        }
      }

      setCsvLoading(false);
    },
    [selectedBank]
  );

  // Auto-match handler
  const handleAutoMatch = useCallback(async () => {
    if (!selectedBank || !csvStatement || !statementDate) return;
    setAutoMatching(true);

    const lines = csvStatement.map((l) => ({ ...l, matched: false, matchedTransactionId: undefined, matchedType: undefined }));
    const dateFrom = lines.length > 0 ? lines[0].date : "";
    const dateTo = statementDate;

    const matchRes = await autoMatchTransactions(selectedBank, lines, dateFrom, dateTo);
    if (matchRes.success && matchRes.data) {
      setMatchResults(matchRes.data);
      setCsvStatement(matchRes.data);

      const newReconciled: Record<string, boolean> = {};
      matchRes.data.forEach((l: StatementLine) => {
        if (l.matched && l.matchedTransactionId) {
          newReconciled[l.matchedTransactionId] = true;
        }
      });
      setReconciled((prev) => ({ ...prev, ...newReconciled }));
    }

    setAutoMatching(false);
  }, [selectedBank, csvStatement, statementDate]);

  const toggleReconciled = useCallback((id: string) => {
    setReconciled((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Save matches
  const handleSaveMatches = useCallback(async () => {
    if (!csvStatementId || !csvStatement) return;
    const res = await saveMatchResult(csvStatementId, csvStatement, "matched");
    if (res.success) {
      alert("Matches saved successfully");
    }
  }, [csvStatementId, csvStatement]);

  // Finalize
  const handleFinalize = useCallback(async () => {
    if (!csvStatementId) return;
    setFinalizing(true);
    setFinalizeSuccess(null);

    const statementBal = parseFloat(statementBalance || "0");
    const systemBal = report?.data ? parseFloat(report.data.systemBookBalance) : 0;

    const res = await finalizeReconciliation(csvStatementId, statementBal, systemBal);
    if (res.success) {
      setFinalizeSuccess(res.message || "Reconciliation finalized");
      setHistory((prev) => [
        { id: csvStatementId, statementDate, closingBalance: statementBalance, status: "reconciled", ...res.data },
        ...prev,
      ]);
    } else {
      alert(res.error || "Failed to finalize");
    }

    setFinalizing(false);
  }, [csvStatementId, statementBalance, report, statementDate]);

  // Undo
  const handleUndoClick = (statementId: string) => {
    setUndoStatementId(statementId);
    setUndoReason("");
    setUndoDialogOpen(true);
  };

  const handleUndoConfirm = useCallback(async () => {
    if (!undoStatementId || !undoReason) return;
    setUndoLoading(true);
    const res = await undoReconciliation(undoStatementId, undoReason);
    if (res.success) {
      setHistory((prev) =>
        prev.map((h) => (h.id === undoStatementId ? { ...h, status: "matched" } : h))
      );
      setUndoDialogOpen(false);
    } else {
      alert(res.error || "Failed to undo");
    }
    setUndoLoading(false);
  }, [undoStatementId, undoReason]);

  const allTx = report?.data?.transactions || [];
  const reconciledTx = allTx.filter((t: any) => reconciled[t.id]);
  const unreconciledTx = allTx.filter((t: any) => !reconciled[t.id]);
  const reconciledCount = reconciledTx.length;
  const unreconciledCount = unreconciledTx.length;

  const statementBal = parseFloat(statementBalance || "0");
  const systemBal = report?.data ? parseFloat(report.data.systemBookBalance) : 0;
  const difference = statementBal - systemBal;
  const isBalanced = Math.abs(difference) < 0.01;

  const matchedCsvLines = csvStatement?.filter((l) => l.matched) || [];
  const unmatchedCsvLines = csvStatement?.filter((l) => !l.matched) || [];

  const handleExcelExport = useCallback(() => {
    const tableElement = document.getElementById("reconciliation-table") as HTMLTableElement;
    if (tableElement) {
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `Bank-Reconciliation-${dateStr}`;
      import("@/lib/excel-export").then(({ exportTableToExcel }) => {
        exportTableToExcel(tableElement, fileName, "Bank Reconciliation");
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Bank Reconciliation</h1>
            <p className="text-nexabook-600 mt-1">Import bank statement, auto-match, and reconcile</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reconcile">Reconcile</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="reconcile" className="space-y-6">
          {/* Setup Card */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-nexabook-900">Reconciliation Setup</CardTitle>
              <CardDescription>Select bank account and enter statement details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-nexabook-700">Bank Account</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Select bank account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-nexabook-700">Statement Date</Label>
                  <Input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-nexabook-700">Statement Ending Balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={statementBalance}
                    onChange={(e) => setStatementBalance(e.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedBank || !statementDate || loading}
                  className="bg-nexabook-900 hover:bg-nexabook-800"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Load System Transactions
                </Button>
                {report?.data && (
                  <Button
                    onClick={handleAutoMatch}
                    disabled={!csvStatement || autoMatching}
                    variant="outline"
                  >
                    {autoMatching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Auto-Match CSV
                  </Button>
                )}
                {report?.data && csvStatementId && (
                  <Button onClick={handleSaveMatches} variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save Matches
                  </Button>
                )}
                {report?.data && isBalanced && csvStatementId && (
                  <Button
                    onClick={handleFinalize}
                    disabled={finalizing}
                    className="bg-green-700 hover:bg-green-800"
                  >
                    {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Finalize Reconciliation
                  </Button>
                )}
              </div>

              {finalizeSuccess && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {finalizeSuccess}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Upload */}
          {selectedBank && !csvStatement && (
            <CsvUpload onUpload={handleCsvUpload} isProcessing={csvLoading} />
          )}

          {/* Summary Cards */}
          {report?.data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="enterprise-card">
                  <CardContent className="p-5">
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">Statement Balance</p>
                    <p className="text-xl font-bold text-nexabook-900 mt-1">{formatCurrency(statementBal)}</p>
                  </CardContent>
                </Card>
                <Card className="enterprise-card">
                  <CardContent className="p-5">
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">System Book Balance</p>
                    <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(systemBal)}</p>
                  </CardContent>
                </Card>
                <Card className="enterprise-card">
                  <CardContent className="p-5">
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">Difference</p>
                    <p className={`text-xl font-bold mt-1 ${isBalanced ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(difference)}
                    </p>
                  </CardContent>
                </Card>
                <Card className={`enterprise-card ${isBalanced ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                  <CardContent className="p-5">
                    <p className="text-xs text-nexabook-500 uppercase tracking-wide">Status</p>
                    <div className="flex items-center gap-2 mt-2">
                      {isBalanced ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-700" />
                          <p className="text-lg font-bold text-green-700">Balanced</p>
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

              {/* Match counts */}
              {csvStatement && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <Card className="enterprise-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-nexabook-500">CSV Statement Lines</p>
                      <p className="text-lg font-bold text-nexabook-900">{csvStatement.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="enterprise-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-nexabook-500">Matched</p>
                      <p className="text-lg font-bold text-green-700">{matchedCsvLines.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="enterprise-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-nexabook-500">Unmatched (Outstanding)</p>
                      <p className="text-lg font-bold text-amber-600">{unmatchedCsvLines.length}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}

          {/* Transactions Table */}
          {!loading && report?.data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                        {allTx.map((tx: any) => (
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
                              {new Date(tx.date).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-nexabook-900">{tx.entryNumber}</TableCell>
                            <TableCell className="text-sm text-nexabook-600 max-w-xs truncate">{tx.description}</TableCell>
                            <TableCell className="text-right">
                              {parseFloat(tx.debit) > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-green-700 font-medium">
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                  {formatCurrency(parseFloat(tx.debit))}
                                </span>
                              ) : (
                                <span className="text-nexabook-300">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseFloat(tx.credit) > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-red-700 font-medium">
                                  <ArrowDownLeft className="h-3.5 w-3.5" />
                                  {formatCurrency(parseFloat(tx.credit))}
                                </span>
                              ) : (
                                <span className="text-nexabook-300">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {reconciled[tx.id] ? (
                                <Badge className="bg-green-100 text-green-800 text-xs font-medium">Matched</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pending</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <CardContent className="p-4">
                      <Separator className="mb-4" />
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Debits</p>
                          <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(parseFloat(report.data.totalDebits))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-nexabook-500 uppercase tracking-wide">Total Credits</p>
                          <p className="text-lg font-bold text-red-700 mt-1">{formatCurrency(parseFloat(report.data.totalCredits))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-nexabook-500 uppercase tracking-wide">Net (System)</p>
                          <p className="text-lg font-bold text-nexabook-900 mt-1">{formatCurrency(systemBal)}</p>
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
                <Upload className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
                <h3 className="text-lg font-medium text-nexabook-700">No reconciliation started</h3>
                <p className="text-sm text-nexabook-500 mt-1">
                  Select a bank account and enter your statement balance to begin
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-nexabook-500" />
            </div>
          ) : (
            <ReconciliationHistory history={history} onUndo={handleUndoClick} />
          )}
        </TabsContent>
      </Tabs>

      {/* Undo Dialog */}
      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo Reconciliation</DialogTitle>
            <DialogDescription>
              This will reopen the reconciliation period. Provide a reason for the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Why are you undoing this reconciliation?"
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleUndoConfirm}
              disabled={!undoReason || undoReason.length < 3 || undoLoading}
            >
              {undoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Undo Reconciliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
