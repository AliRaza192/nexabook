"use client";

import { useState } from "react";
import { getConsolidatedBalanceSheet } from "@/lib/actions/consolidation";
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

export default function ConsolidatedBalanceSheetPage() {
  const today = new Date().toISOString().split("T")[0];
  const [asOfDate, setAsOfDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  async function generateReport() {
    setLoading(true);
    const res = await getConsolidatedBalanceSheet(asOfDate);
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
        <h1 className="text-2xl font-bold">Consolidated Balance Sheet</h1>
        <p className="text-muted-foreground">
          Aggregated assets, liabilities, and equity across all companies
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div>
              <Label>As of Date</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
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
                  Total Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{report.parentCurrency} {formatInternationalNumber(report.totalAssets)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Liabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{report.parentCurrency} {formatInternationalNumber(report.totalLiabilities)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Equity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{report.parentCurrency} {formatInternationalNumber(report.totalEquity)}</p>
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
                  <p className="text-lg font-semibold">
                    {org.currency} {formatInternationalNumber(org.totalAssets + org.totalLiabilities + org.totalEquity)}
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
                    {org.assets.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold">Assets</TableCell>
                          <TableCell className="text-right font-semibold">
                            {org.currency} {formatInternationalNumber(org.totalAssets)}
                          </TableCell>
                        </TableRow>
                        {org.assets.map((acct: any) => (
                          <TableRow key={acct.accountId}>
                            <TableCell className="pl-8">{acct.name}</TableCell>
                            <TableCell className="text-right">
                              {org.currency} {formatInternationalNumber(acct.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    {org.liabilities.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold">Liabilities</TableCell>
                          <TableCell className="text-right font-semibold">
                            {org.currency} {formatInternationalNumber(org.totalLiabilities)}
                          </TableCell>
                        </TableRow>
                        {org.liabilities.map((acct: any) => (
                          <TableRow key={acct.accountId}>
                            <TableCell className="pl-8">{acct.name}</TableCell>
                            <TableCell className="text-right">
                              {org.currency} {formatInternationalNumber(acct.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                    {org.equity.length > 0 && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold">Equity</TableCell>
                          <TableCell className="text-right font-semibold">
                            {org.currency} {formatInternationalNumber(org.totalEquity)}
                          </TableCell>
                        </TableRow>
                        {org.equity.map((acct: any) => (
                          <TableRow key={acct.accountId}>
                            <TableCell className="pl-8">{acct.name}</TableCell>
                            <TableCell className="text-right">
                              {org.currency} {formatInternationalNumber(acct.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
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
