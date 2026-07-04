"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import ReportLayout from "@/components/reports/ReportLayout";
import { getGeneralLedgerReport, getChartOfAccountsList } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const defaultTo = today.toISOString().split("T")[0];

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700",
  income: "bg-green-100 text-green-700",
  expense: "bg-orange-100 text-orange-700",
};

export default function GeneralLedgerReportPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string; code: string; type: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async (type?: string) => {
    const r = await getChartOfAccountsList(type === "all" ? undefined : type);
    if (r.success) {
      setAccounts(r.data as any);
      if ((r.data as any).length > 0) setSelectedAccountId((r.data as any)[0].id);
    }
  };

  const handleTypeChange = async (t: string) => {
    setTypeFilter(t);
    setData(null);
    await loadAccounts(t === "all" ? undefined : t);
  };

  const loadReport = async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    const r = await getGeneralLedgerReport(selectedAccountId, dateFrom, dateTo);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  return (
    <ReportLayout
      title="General Ledger"
      breadcrumb="General Ledger"
      category="Account Reports"
      categoryHref="/reports"
      tableId="general-ledger-table"
      reportData={data}
    >
      {/* Custom Filter */}
      <Card className="enterprise-card print-hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-nexabook-700">Account Type</Label>
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {["asset", "liability", "equity", "income", "expense"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-medium text-nexabook-700">Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono text-xs text-nexabook-500 mr-2">{a.code}</span>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-nexabook-700">From</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-nexabook-400" />
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="pl-7 h-9 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-nexabook-700">To</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-nexabook-400" />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="pl-7 h-9 text-xs" />
                </div>
              </div>
            </div>
            <Button onClick={loadReport} className="bg-nexabook-900 hover:bg-nexabook-800 h-9">
              <Search className="h-4 w-4 mr-2" /> Show Ledger
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Account Header */}
          <Card className="enterprise-card">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-nexabook-500">Account</p>
                <p className="font-bold text-nexabook-900 text-lg">{data.account.name}</p>
              </div>
              <div>
                <p className="text-xs text-nexabook-500">Code</p>
                <p className="font-mono font-semibold text-nexabook-700">{data.account.code}</p>
              </div>
              <div>
                <Badge className={`capitalize ${TYPE_COLORS[data.account.type] || ""}`}>{data.account.type}</Badge>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-nexabook-500">Period</p>
                <p className="text-sm font-medium text-nexabook-700">
                  {new Date(data.dateFrom).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })} –{" "}
                  {new Date(data.dateTo).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table id="general-ledger-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Date", "JV #", "Description", "Debit", "Credit", "Balance"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance row */}
                <tr className="bg-nexabook-50 border-b border-nexabook-200 font-semibold">
                  <td className="py-2 px-3 text-nexabook-600">—</td>
                  <td className="py-2 px-3 font-mono text-nexabook-500">OPENING</td>
                  <td className="py-2 px-3 text-nexabook-700">Opening Balance</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className="py-2 px-3 text-right">—</td>
                  <td className={`py-2 px-3 text-right font-bold ${data.openingBalance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                    {formatPKR(Math.abs(data.openingBalance))}
                    <span className="text-xs ml-1">{data.openingBalance >= 0 ? "Dr" : "Cr"}</span>
                  </td>
                </tr>

                {data.lines.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-nexabook-400">No transactions in this period</td></tr>
                ) : (
                  data.lines.map((line: any, i: number) => (
                    <motion.tr key={line.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                      className="border-b border-nexabook-100 hover:bg-nexabook-50">
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(line.entryDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 px-3 font-mono text-nexabook-600 text-xs">{line.entryNumber}</td>
                      <td className="py-2 px-3 text-nexabook-800">{line.description}</td>
                      <td className="py-2 px-3 text-right text-blue-700">
                        {parseFloat(line.debitAmount || "0") > 0 ? formatPKR(parseFloat(line.debitAmount)) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-green-700">
                        {parseFloat(line.creditAmount || "0") > 0 ? formatPKR(parseFloat(line.creditAmount)) : "—"}
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${line.runningBalance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                        {formatPKR(Math.abs(line.runningBalance))}
                        <span className="text-xs ml-1">{line.runningBalance >= 0 ? "Dr" : "Cr"}</span>
                      </td>
                    </motion.tr>
                  ))
                )}

                {/* Totals */}
                <tr className="bg-nexabook-100 border-t-2 border-nexabook-300 font-bold">
                  <td colSpan={3} className="py-3 px-3">Period Total</td>
                  <td className="py-3 px-3 text-right text-blue-700">{formatPKR(data.totalDebit)}</td>
                  <td className="py-3 px-3 text-right text-green-700">{formatPKR(data.totalCredit)}</td>
                  <td className={`py-3 px-3 text-right ${data.closingBalance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                    {formatPKR(Math.abs(data.closingBalance))}
                    <span className="text-xs ml-1">{data.closingBalance >= 0 ? "Dr" : "Cr"}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-14 w-14 text-nexabook-300 mx-auto mb-4" />
            <p className="text-nexabook-600">Select an account and click "Show Ledger"</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}