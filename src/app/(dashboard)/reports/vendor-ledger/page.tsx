"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Building2, CreditCard, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getVendorLedgerReport } from "@/lib/actions/reports";
import { getVendors } from "@/lib/actions/purchases";

export default function VendorLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  const loadVendors = async () => {
    try {
      const result = await getVendors();
      if (result.success && result.data) {
        setVendors(result.data);
        if (result.data.length > 0) {
          setSelectedVendor(result.data[0].id);
        }
      }
    } catch (error) {
      // silently handle
    }
  };

  const loadReport = async (reportFilters: ReportFilters) => {
    if (!selectedVendor) return;
    setLoading(true);
    setFilters(reportFilters);
    try {
      const result = await getVendorLedgerReport(selectedVendor, reportFilters.dateFrom, reportFilters.dateTo);
      if (result.success && result.data) {
        setReportData(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      loadReport(filters);
    }
  }, [selectedVendor]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(value);
  };

  const handleApply = () => {
    loadReport(filters);
  };

  return (
    <ReportLayout
      title="Vendor Ledger"
      breadcrumb="Vendor Ledger"
      category="Purchase Reports"
      categoryHref="/reports"
    >
      <Card className="enterprise-card mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">From Date</Label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-nexabook-200 bg-transparent px-3 py-1 text-sm"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-nexabook-700">To Date</Label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-nexabook-200 bg-transparent px-3 py-1 text-sm"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
                <Button onClick={handleApply} className="bg-nexabook-900 hover:bg-nexabook-800 h-9">
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData && reportData.ledger && reportData.ledger.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Vendor</p>
                    <p className="text-lg font-bold text-nexabook-900">{reportData.vendor?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Transactions</p>
                    <p className="text-xl font-bold text-nexabook-900">{reportData.ledger.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-nexabook-600">Total Payable</p>
                    <p className="text-xl font-bold text-amber-700">
                      {formatCurrency(reportData.ledger.reduce((sum: number, e: any) => sum + (e.credit || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Vendor Transaction Ledger</CardTitle>
              <p className="text-sm text-nexabook-600">
                {reportData.dateFrom ? new Date(reportData.dateFrom).toLocaleDateString() : ""} - {reportData.dateTo ? new Date(reportData.dateTo).toLocaleDateString() : ""}
              </p>
            </CardHeader>
            <CardContent>
              <Table id="vendor-ledger-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.ledger.map((entry: any, index: number) => {
                    const date = entry.date ? new Date(entry.date).toLocaleDateString("en-PK") : "-";
                    return (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TableCell className="text-nexabook-600">{index + 1}</TableCell>
                        <TableCell className="text-nexabook-600">{date}</TableCell>
                        <TableCell className="font-medium text-nexabook-900">{entry.reference}</TableCell>
                        <TableCell className="text-nexabook-600">{entry.description}</TableCell>
                        <TableCell className="text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-nexabook-900">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No vendor ledger data available. Select a vendor and apply filters.</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
