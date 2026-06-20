"use client";

import { useState, useEffect } from "react";
import { getCostCenters, getCostCenterPLReport } from "@/lib/actions/cost-centers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface CostCenter {
  id: string;
  name: string;
  code: string;
}

interface PLLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: unknown;
  totalCredit: unknown;
  netAmount: unknown;
}

export default function CostCenterPLReport() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<{
    lines: PLLine[];
    totals: { totalRevenue: number; totalExpenses: number; netProfit: number };
  } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getCostCenters();
      if (res.success && res.data) setCostCenters(res.data);
      setLoading(false);
    })();
  }, []);

  async function handleGenerate() {
    if (!selectedId) return;
    setReportLoading(true);
    const res = await getCostCenterPLReport(selectedId);
    if (res.success && res.data) setReport(res.data);
    else setReport(null);
    setReportLoading(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cost Center P&L</h1>
        <p className="text-muted-foreground">View profit and loss by cost center</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Cost Center</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cost center" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!selectedId || reportLoading}>
              {reportLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.lines.map(line => (
                    <TableRow key={line.accountId}>
                      <TableCell className="font-mono">{line.accountCode}</TableCell>
                      <TableCell>{line.accountName}</TableCell>
                      <TableCell className="capitalize">{line.accountType}</TableCell>
                      <TableCell className="text-right">{Number(line.totalDebit || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(line.totalCredit || 0).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(line.netAmount || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {Number(line.netAmount || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Total Revenue</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {report.totals.totalRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Total Expenses</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {report.totals.totalExpenses.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Net Profit / Loss</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${report.totals.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {report.totals.netProfit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
