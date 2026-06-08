"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getAccountStatementReport } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function AccountStatementReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [accountType, setAccountType] = useState("all");

  useEffect(() => {
    loadReport({ dateFrom: defaultFrom, dateTo: defaultTo });
  }, []);

  const loadReport = async (f: ReportFilters, type?: string) => {
    setLoading(true);
    const t = type ?? accountType;
    const r = await getAccountStatementReport(f.dateFrom, f.dateTo, t === "all" ? undefined : t);
    if (r.success) setData(r.data);
    setLoading(false);
  };

  const handleTypeChange = (t: string) => {
    setAccountType(t);
    if (data) loadReport({ dateFrom: data.dateFrom, dateTo: data.dateTo }, t);
  };

  // Group by type for subtotals
  const grouped = data
    ? data.rows.reduce((acc: Record<string, any[]>, row: any) => {
        if (!acc[row.type]) acc[row.type] = [];
        acc[row.type].push(row);
        return acc;
      }, {} as Record<string, any[]>)
    : {};

  return (
    <ReportLayout
      title="Account Statement"
      breadcrumb="Account Statement"
      category="Account Reports"
      categoryHref="/reports"
      tableId="account-statement-table"
      reportData={data}
    >
      <div className="print-hidden flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <ReportFilterBar
            onFilterChange={(f) => loadReport(f)}
          />
        </div>
        <div className="w-44 mb-1">
          <Select value={accountType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Account Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {["asset", "liability", "equity", "income", "expense"].map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="h-10 w-10 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table id="account-statement-table" className="w-full text-sm">
              <thead>
                <tr className="bg-nexabook-50 border-b-2 border-nexabook-200">
                  {["Code", "Account Name", "Type", "Opening Balance", "Period Debit", "Period Credit", "Closing Balance"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left font-semibold text-nexabook-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(grouped).length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-nexabook-400">No account activity found for this period</td></tr>
                ) : (
                  Object.entries(grouped).map(([type, rows]: [string, any]) => (
                    <>
                      {/* Type group header */}
                      <tr key={`hdr-${type}`} className="bg-nexabook-100 border-b border-nexabook-200">
                        <td colSpan={7} className="py-2 px-3">
                          <Badge className={`capitalize text-xs ${TYPE_COLORS[type] || ""}`}>{type}</Badge>
                        </td>
                      </tr>
                      {rows.map((row: any, i: number) => (
                        <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                          className="border-b border-nexabook-100 hover:bg-nexabook-50">
                          <td className="py-2 px-3 font-mono text-xs text-nexabook-500">{row.code}</td>
                          <td className="py-2 px-3 font-medium text-nexabook-900">{row.name}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs capitalize">{row.subType?.replace("_", " ")}</Badge>
                          </td>
                          <td className={`py-2 px-3 text-right ${row.openingBalance >= 0 ? "text-nexabook-700" : "text-red-600"}`}>
                            {formatPKR(Math.abs(row.openingBalance))}
                            <span className="text-xs ml-1">{row.openingBalance >= 0 ? "Dr" : "Cr"}</span>
                          </td>
                          <td className="py-2 px-3 text-right text-blue-600">
                            {row.periodDebit > 0 ? formatPKR(row.periodDebit) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-green-600">
                            {row.periodCredit > 0 ? formatPKR(row.periodCredit) : "—"}
                          </td>
                          <td className={`py-2 px-3 text-right font-semibold ${row.closingBalance >= 0 ? "text-blue-700" : "text-red-600"}`}>
                            {formatPKR(Math.abs(row.closingBalance))}
                            <span className="text-xs ml-1">{row.closingBalance >= 0 ? "Dr" : "Cr"}</span>
                          </td>
                        </motion.tr>
                      ))}
                      {/* Subtotal row */}
                      <tr key={`sub-${type}`} className="bg-nexabook-50 border-b border-nexabook-200 font-semibold text-xs">
                        <td colSpan={3} className="py-2 px-3 capitalize text-nexabook-600">{type} Subtotal</td>
                        <td className="py-2 px-3 text-right text-nexabook-700">
                          {formatPKR(Math.abs(rows.reduce((s: number, r: any) => s + r.openingBalance, 0)))}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-600">
                          {formatPKR(rows.reduce((s: number, r: any) => s + r.periodDebit, 0))}
                        </td>
                        <td className="py-2 px-3 text-right text-green-600">
                          {formatPKR(rows.reduce((s: number, r: any) => s + r.periodCredit, 0))}
                        </td>
                        <td className="py-2 px-3 text-right text-nexabook-700">
                          {formatPKR(Math.abs(rows.reduce((s: number, r: any) => s + r.closingBalance, 0)))}
                        </td>
                      </tr>
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ReportLayout>
  );
}