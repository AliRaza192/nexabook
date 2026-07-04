"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Loader2,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getGeographySalesReport } from "@/lib/actions/sales";

interface GeographyGroup {
  customers: Array<{
    customerId: string;
    customerName: string;
    region: string | null;
    area: string | null;
    invoiceCount: number | string;
    totalAmount: number | string;
  }>;
  totalSales: number;
  invoiceCount: number;
}

export default function SalesByGeographyPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<Record<string, GeographyGroup> | null>(null);
  const [groupBy, setGroupBy] = useState<"region" | "area">("region");
  const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string }>({});

  const loadReport = useCallback(async (f: typeof filters, gb: typeof groupBy) => {
    setLoading(true);
    const res = await getGeographySalesReport({ ...f, groupBy: gb });
    if (res.success && res.data) {
      setReportData(res.data as Record<string, GeographyGroup>);
    } else {
      setReportData(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReport(filters, groupBy);
  }, [filters, groupBy, loadReport]);

  const handleFilterChange = (newFilters: { dateFrom?: string; dateTo?: string }) => {
    setFilters(newFilters);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const totalSales = reportData
    ? Object.values(reportData).reduce((sum, g) => sum + g.totalSales, 0)
    : 0;
  const totalInvoices = reportData
    ? Object.values(reportData).reduce((sum, g) => sum + g.invoiceCount, 0)
    : 0;
  const totalRegions = reportData ? Object.keys(reportData).length : 0;

  return (
    <ReportLayout
      title="Sales by Geography"
      breadcrumb="Sales by Geography"
      category="Sales Reports"
      categoryHref="/reports"
    >
      <div className="space-y-6">
        {/* Filters */}
        <ReportFilterBar
          onFilterChange={handleFilterChange}
          showCustomerFilter={false}
          showVendorFilter={false}
        />

        {/* Group By Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-nexabook-700">Group by:</span>
              <div className="flex gap-2">
                <Button
                  variant={groupBy === "region" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupBy("region")}
                  className="flex items-center gap-1.5"
                >
                  <Globe className="h-4 w-4" />
                  Region
                </Button>
                <Button
                  variant={groupBy === "area" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGroupBy("area")}
                  className="flex items-center gap-1.5"
                >
                  <MapPin className="h-4 w-4" />
                  Area
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-nexabook-600">
                    {groupBy === "region" ? "Regions" : "Areas"}
                  </p>
                  <p className="text-2xl font-bold text-nexabook-900">{totalRegions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-nexabook-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-nexabook-900">{totalInvoices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-nexabook-600">Total Sales</p>
                  <p className="text-2xl font-bold text-nexabook-900">
                    {formatCurrency(totalSales)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geography Data */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
          </div>
        ) : !reportData || Object.keys(reportData).length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Globe className="h-16 w-16 text-nexabook-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
                No geography data found
              </h3>
              <p className="text-nexabook-600">
                {filters.dateFrom || filters.dateTo
                  ? "No sales in this date range with geography information"
                  : "Assign regions and areas to customers to see geography-based sales"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(reportData).map(([key, group], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {groupBy === "region" ? (
                          <Globe className="h-5 w-5 text-nexabook-600" />
                        ) : (
                          <MapPin className="h-5 w-5 text-nexabook-600" />
                        )}
                        <CardTitle className="text-lg">{key}</CardTitle>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">
                          {group.invoiceCount} invoices
                        </Badge>
                        <span className="text-lg font-bold text-nexabook-900">
                          {formatCurrency(group.totalSales)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-nexabook-200">
                            <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                              Customer
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-nexabook-700">
                              Invoices
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-nexabook-700">
                              Total Sales
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.customers.map((row) => (
                            <tr
                              key={row.customerId}
                              className="border-b border-nexabook-100 hover:bg-nexabook-50 transition-colors"
                            >
                              <td className="py-2 px-3 text-sm text-nexabook-900">
                                {row.customerName}
                              </td>
                              <td className="py-2 px-3 text-sm text-nexabook-600">
                                {Number(row.invoiceCount)}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-medium">
                                {formatCurrency(Number(row.totalAmount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
