"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Printer, Calculator, ArrowDownRight, ArrowUpRight, Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { getTaxSummary, MonthlyTaxBreakdown } from "@/lib/actions/accounts";
import { formatPKR } from "@/lib/utils/number-format";
import ReportExportButtons from "@/components/reports/ReportExportButtons";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function fmt(n: string): string {
  return formatPKR(parseFloat(n), 'south-asian');
}

const DEFAULT_TAX_RATES = [
  { name: "Standard GST Rate", rate: "18", appliedTo: "Most goods and services" },
  { name: "Reduced Rate", rate: "5", appliedTo: "Essential items and basic goods" },
  { name: "Zero Rated", rate: "0", appliedTo: "Exports and exempt supplies" },
  { name: "Exempt", rate: "—", appliedTo: "Supplies outside tax net" },
];

export default function TaxPage() {
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "custom">("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Awaited<ReturnType<typeof getTaxSummary>> | null>(null);

  // Compute date range from period preset
  function getRange() {
    if (period === "custom") return { from: dateFrom, to: dateTo };
    const now = new Date();
    let from: Date;
    if (period === "monthly") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Current quarter start
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
    }
    return {
      from: from.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    };
  }

  const handleGenerate = async () => {
    const { from, to } = getRange();
    if (period === "custom" && (!from || !to)) return;
    setLoading(true);
    setReport(null);
    const res = await getTaxSummary(from, to);
    setReport(res);
    setLoading(false);
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Tax Management</h1>
            <p className="text-nexabook-600 mt-1">Sales tax, input tax, and tax reporting</p>
          </div>
          {report?.data && (
            <div className="flex items-center gap-2">
              <ReportExportButtons reportTitle="Tax Summary Report" reportData={report.data} />
              <Button variant="outline" onClick={handlePrint} className="print-hidden">
                <Printer className="h-4 w-4 mr-2" />Print Report
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Period Selector - Hidden on print */}
      <Card className="print-hidden">
        <CardHeader><CardTitle>Period Selection</CardTitle><CardDescription>Choose the reporting period for tax summary</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Current Month</SelectItem>
                  <SelectItem value="quarterly">Current Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            )}
            <Button onClick={handleGenerate} disabled={loading} className="bg-nexabook-900 hover:bg-nexabook-800">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
              {loading ? "Generating…" : "Generate Tax Report"}
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

      {/* KPI Cards */}
      {!loading && report?.data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Output Tax */}
            <Card className="enterprise-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Output Tax (Sales)</p>
                    <p className="text-xl font-bold text-green-700">{fmt(report.data.outputTax)}</p>
                    <p className="text-xs text-nexabook-500 mt-1">Sales tax collected from customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Input Tax */}
            <Card className="enterprise-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Input Tax (Purchases)</p>
                    <p className="text-xl font-bold text-blue-700">{fmt(report.data.inputTax)}</p>
                    <p className="text-xs text-nexabook-500 mt-1">Input tax recoverable from suppliers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Tax Payable */}
            <Card className="enterprise-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${parseFloat(report.data.netTaxPayable) >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <DollarSign className={`h-5 w-5 ${parseFloat(report.data.netTaxPayable) >= 0 ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Net Tax Payable</p>
                    <p className={`text-xl font-bold ${parseFloat(report.data.netTaxPayable) >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {fmt(report.data.netTaxPayable)}
                    </p>
                    <p className="text-xs text-nexabook-500 mt-1">
                      {parseFloat(report.data.netTaxPayable) > 0 ? 'Tax payable to FBR' : parseFloat(report.data.netTaxPayable) < 0 ? 'Tax refund due' : 'Balanced'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown Table */}
          {report.data.monthlyBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Monthly Breakdown</CardTitle><CardDescription>Month-by-month tax summary</CardDescription></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Output Tax</TableHead>
                    <TableHead className="text-right">Input Tax</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.monthlyBreakdown.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{formatMonth(m.month)}</TableCell>
                      <TableCell className="text-right text-green-700 font-mono text-sm">{fmt(m.outputTax)}</TableCell>
                      <TableCell className="text-right text-blue-700 font-mono text-sm">{fmt(m.input_tax)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${parseFloat(m.net_tax) >= 0 ? "text-red-700" : "text-green-700"}`}>
                        {fmt(m.net_tax)}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(m.net_tax) > 0 ? (
                          <Badge className="bg-red-100 text-red-800 text-xs">Payable</Badge>
                        ) : parseFloat(m.net_tax) < 0 ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Refund</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Nil</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </motion.div>
      )}

      {/* No data state */}
      {!loading && report?.data && report.data.monthlyBreakdown.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No tax transactions found</h3>
            <p className="text-sm text-nexabook-500 mt-1">No approved sales or purchase invoices with tax in this period</p>
          </CardContent>
        </Card>
      )}

      {!loading && !report && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-16 w-16 mx-auto mb-4 text-nexabook-200" />
            <h3 className="text-lg font-medium text-nexabook-700">No report generated</h3>
            <p className="text-sm text-nexabook-500 mt-1">Select a period and click "Generate Tax Report"</p>
          </CardContent>
        </Card>
      )}

      {/* Tax Rates Reference Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Tax Rates</CardTitle><CardDescription>Default tax rates applied in the system</CardDescription></div>
          <Button variant="outline" size="sm" className="print:hidden">
            <Plus className="h-4 w-4 mr-2" />Add Tax Rate
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Name</TableHead>
                <TableHead className="text-right">Rate (%)</TableHead>
                <TableHead>Applied To</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEFAULT_TAX_RATES.map((rate, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {rate.rate !== "—" ? `${rate.rate}%` : rate.rate}
                  </TableCell>
                  <TableCell className="text-sm text-nexabook-600">{rate.appliedTo}</TableCell>
                  <TableCell className="text-right"><Badge variant="outline" className="text-xs">Active</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="mt-4 mb-2" />
          <p className="text-xs text-nexabook-400">
            Note: Tax rates are for display purposes. Actual tax amounts are calculated per invoice line item.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
