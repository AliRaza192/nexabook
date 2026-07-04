"use client";

import { useState } from "react";
import { getConsolidatedPandL } from "@/lib/actions/consolidation";
import { Loader2, Building2, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInternationalNumber } from "@/lib/utils/number-format";

export default function ConsolidatedPandLPage() {
  const today = new Date().toISOString().split("T")[0];
  const fiscalStart = `${today.slice(0, 4)}-07-01`;
  const [dateFrom, setDateFrom] = useState(fiscalStart);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  async function generateReport() {
    setLoading(true);
    const res = await getConsolidatedPandL(dateFrom, dateTo);
    if (res.success) {
      setReport(res.data);
    } else {
      setReport({ error: res.error });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Consolidated Profit & Loss</h1>
        <p className="text-muted-foreground">
          Aggregated income and expense across all companies in your hierarchy
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={generateReport} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && !report.error && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {report.parentCurrency} {formatInternationalNumber(report.totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {report.parentCurrency} {formatInternationalNumber(report.totalExpense)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    report.netProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {report.parentCurrency} {formatInternationalNumber(report.netProfit)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Per-org breakdown */}
          {report.orgs.map((org: any, idx: number) => (
            <Card key={org.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <Badge variant="secondary">{org.currency}</Badge>
                    {idx === 0 && <Badge>Parent</Badge>}
                  </div>
                  <p
                    className={`text-lg font-semibold ${
                      org.netProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {org.currency} {formatInternationalNumber(org.netProfit)}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.income.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold">Income</TableCell>
                          <TableCell className="text-right font-semibold">
                            {org.currency} {formatInternationalNumber(org.totalIncome)}
                          </TableCell>
                        </TableRow>
                        {org.income.map((acct: any) => (
                          <TableRow key={acct.accountId}>
                            <TableCell className="pl-8">{acct.name}</TableCell>
                            <TableCell className="text-right">
                              {org.currency} {formatInternationalNumber(acct.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    {org.expense.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold">Expenses</TableCell>
                          <TableCell className="text-right font-semibold">
                            {org.currency} {formatInternationalNumber(org.totalExpense)}
                          </TableCell>
                        </TableRow>
                        {org.expense.map((acct: any) => (
                          <TableRow key={acct.accountId}>
                            <TableCell className="pl-8">{acct.name}</TableCell>
                            <TableCell className="text-right">
                              {org.currency} {formatInternationalNumber(acct.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    <TableRow className="font-bold">
                      <TableCell>Net Profit / (Loss)</TableCell>
                      <TableCell
                        className={`text-right ${
                          org.netProfit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {org.currency} {formatInternationalNumber(org.netProfit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {report?.error && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2" />
            <p>{report.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
