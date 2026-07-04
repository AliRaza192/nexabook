"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getCustomerLedgerReport, getCustomers } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function CustomerLedgerReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
    customerId: undefined,
  });

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const result = await getCustomers();
        if (result.success && result.data) {
          setCustomers(result.data as Array<{ id: string; name: string }>);
        }
      } catch (error) {
      }
    };

    loadCustomers();
  }, []);

  const loadReport = async (reportFilters: ReportFilters) => {
    setLoading(true);
    setFilters(reportFilters);
    if (!reportFilters.customerId) {
      setLoading(false);
      return;
    }

    try {
      const result = await getCustomerLedgerReport(
        reportFilters.customerId,
        reportFilters.dateFrom,
        reportFilters.dateTo
      );
      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        // Error handled silently
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load with default filters if customer selected
    if (filters.customerId) {
      loadReport(filters);
    }
  }, []);

  const formatCurrency = (value: number) => {
    return formatPKR(value, 'south-asian');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <ReportLayout
      title="Customer Ledger"
      breadcrumb="Customer Ledger"
      category="Sales Reports"
      categoryHref="/reports"
    >
      {/* Filter Bar - Hidden on print */}
      <div className="print-hidden">
        <ReportFilterBar
          onFilterChange={loadReport}
          showCustomerFilter
          customers={customers}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="enterprise-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-nexabook-900">
                    {reportData.customer.name}
                  </h3>
                  <p className="text-sm text-nexabook-600">
                    {reportData.customer.phone || reportData.customer.email || "No contact info"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDate(reportData.dateFrom)} - {formatDate(reportData.dateTo)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-nexabook-600">Total Debits</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(reportData.totalDebit)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-nexabook-600">Total Credits</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(reportData.totalCredit)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-nexabook-600">Closing Balance</p>
                  <p className={`text-xl font-bold ${reportData.closingBalance >= 0 ? "text-amber-700" : "text-green-700"}`}>
                    {formatCurrency(Math.abs(reportData.closingBalance))}
                    {reportData.closingBalance > 0 && (
                      <span className="text-xs ml-2">(Dr)</span>
                    )}
                    {reportData.closingBalance < 0 && (
                      <span className="text-xs ml-2">(Cr)</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table id="customer-ledger-table" className="w-full">
                  <thead>
                    <tr className="border-b-2 border-nexabook-200 bg-nexabook-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Reference
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Debit
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Credit
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.ledger.map((entry: any, index: number) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`border-b border-nexabook-100 ${
                          entry.reference === "OPENING"
                            ? "bg-nexabook-50 font-semibold"
                            : "hover:bg-nexabook-50"
                        }`}
                      >
                        <td className="py-2 px-4 text-sm text-nexabook-900">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2 px-4 text-sm font-mono text-nexabook-700">
                          {entry.reference}
                        </td>
                        <td className="py-2 px-4 text-sm text-nexabook-900">
                          {entry.description}
                        </td>
                        <td className="py-2 px-4 text-sm text-right text-nexabook-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                        </td>
                        <td className="py-2 px-4 text-sm text-right text-nexabook-900">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                        </td>
                        <td className={`py-2 px-4 text-sm text-right font-bold ${
                          entry.balance >= 0 ? "text-amber-700" : "text-green-700"
                        }`}>
                          {formatCurrency(Math.abs(entry.balance))}
                          {entry.balance > 0 && <span className="text-xs ml-1">Dr</span>}
                          {entry.balance < 0 && <span className="text-xs ml-1">Cr</span>}
                        </td>
                      </motion.tr>
                    ))}

                    {/* Totals Row */}
                    <tr className="border-t-2 border-nexabook-300 bg-nexabook-50">
                      <td colSpan={3} className="py-3 px-4 text-sm font-bold text-nexabook-900">
                        Totals
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-blue-700">
                        {formatCurrency(reportData.totalDebit)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-green-700">
                        {formatCurrency(reportData.totalCredit)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-nexabook-900">
                        {formatCurrency(Math.abs(reportData.closingBalance))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <User className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
              Select a Customer
            </h3>
            <p className="text-nexabook-600">
              Choose a customer from the filter to view their ledger
            </p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
