"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getSalesTaxReport } from "@/lib/actions/reports";

export default function SalesTaxReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  const loadReport = async (reportFilters: ReportFilters) => {
    setLoading(true);
    setFilters(reportFilters);
    try {
      const result = await getSalesTaxReport(reportFilters.dateFrom, reportFilters.dateTo);
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
    loadReport(filters);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ReportLayout
      title="Sales Tax Report"
      breadcrumb="Sales Tax Collected"
      category="Tax Reports"
      categoryHref="/reports"
    >
      <ReportFilterBar onFilterChange={loadReport} />

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-nexabook-600">Tax Collected (Output Tax)</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(reportData.taxCollected)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-nexabook-600">Tax Paid (Input Tax)</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {formatCurrency(reportData.taxPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs text-nexabook-600">Net Tax Payable</p>
                  <p className="text-2xl font-bold text-nexabook-900">
                    {formatCurrency(reportData.taxCollected - reportData.taxPaid)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Tax Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-nexabook-200">
                  <span className="text-sm font-medium text-nexabook-900">Output Tax (Sales)</span>
                  <span className="text-sm font-bold text-blue-700">
                    {formatCurrency(reportData.taxCollected)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-nexabook-200">
                  <span className="text-sm font-medium text-nexabook-900">Input Tax (Purchases)</span>
                  <span className="text-sm font-bold text-amber-700">
                    ({formatCurrency(reportData.taxPaid)})
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 bg-nexabook-50 p-4 rounded-lg">
                  <span className="text-base font-bold text-nexabook-900">Net Tax Liability</span>
                  <span className="text-lg font-bold text-nexabook-900">
                    {formatCurrency(reportData.taxCollected - reportData.taxPaid)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
            <p className="text-nexabook-600">No tax data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
