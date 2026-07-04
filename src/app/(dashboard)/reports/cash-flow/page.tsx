"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportFilterBar, { ReportFilters } from "@/components/reports/ReportFilterBar";
import { getCashFlowStatement } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function CashFlowStatementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const loadReport = async (filters: ReportFilters) => {
    setLoading(true);
    const dateFrom = filters.dateFrom || monthStart;
    const dateTo = filters.dateTo || today;
    try {
      const result = await getCashFlowStatement(dateFrom, dateTo);
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport({ dateFrom: monthStart, dateTo: today });
  }, []);

  const fmt = (v: number) => formatPKR(v, 'south-asian');

  const SectionTable = ({ title, items, total, icon: Icon, color }: any) => (
    <Card className="enterprise-card">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Icon className={`h-5 w-5 text-${color}-600`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-nexabook-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-nexabook-700">Item</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-nexabook-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-nexabook-100"
                  >
                    <td className="py-2 px-4 text-sm text-nexabook-900">{item.accountName}</td>
                    <td className={`py-2 px-4 text-sm text-right font-medium ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                    </td>
                  </motion.tr>
                ))}
                <tr className="border-t-2 border-nexabook-300 bg-gray-50">
                  <td className="py-3 px-4 text-sm font-bold text-nexabook-900">Net {title}</td>
                  <td className={`py-3 px-4 text-sm text-right font-bold ${total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {total >= 0 ? '+' : ''}{fmt(total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-nexabook-500 py-4 text-center">No items</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ReportLayout
      title="Cash Flow Statement"
      breadcrumb="Cash Flow Statement"
      category="Financial Reports"
      categoryHref="/reports"
    >
      <div className="print-hidden">
        <ReportFilterBar onFilterChange={loadReport} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg"><ArrowUpRight className="h-5 w-5 text-green-600" /></div>
                  <div>
                    <p className="text-xs text-nexabook-600">Operating</p>
                    <p className={`text-xl font-bold ${data.operating?.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmt(data.operating?.total || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-nexabook-600">Investing</p>
                    <p className={`text-xl font-bold ${data.investing?.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmt(data.investing?.total || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg"><DollarSign className="h-5 w-5 text-amber-600" /></div>
                  <div>
                    <p className="text-xs text-nexabook-600">Financing</p>
                    <p className={`text-xl font-bold ${data.financing?.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmt(data.financing?.total || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="enterprise-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg"><TrendingDown className="h-5 w-5 text-purple-600" /></div>
                  <div>
                    <p className="text-xs text-nexabook-600">Net Cash Change</p>
                    <p className={`text-xl font-bold ${data.netCashChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmt(data.netCashChange)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operating Activities */}
          <SectionTable
            title="Operating Activities"
            items={[
              { accountName: `Net Income (${data.dateFrom} to ${data.dateTo})`, amount: data.netIncome },
              ...(data.operating?.adjustments || [])
            ]}
            total={data.operating?.total || 0}
            icon={ArrowUpRight}
            color="green"
          />

          {/* Investing Activities */}
          <SectionTable
            title="Investing Activities"
            items={data.investing?.items || []}
            total={data.investing?.total || 0}
            icon={TrendingUp}
            color="blue"
          />

          {/* Financing Activities */}
          <SectionTable
            title="Financing Activities"
            items={data.financing?.items || []}
            total={data.financing?.total || 0}
            icon={DollarSign}
            color="amber"
          />

          {/* Summary */}
          <Card className="enterprise-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-nexabook-900">Net Cash Flow</p>
                  <p className="text-xs text-nexabook-500">
                    Operating + Investing + Financing
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${data.netCashChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {data.netCashChange >= 0 ? '+' : ''}{fmt(data.netCashChange)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="enterprise-card">
          <CardContent className="py-12 text-center">
            <p className="text-nexabook-600">No data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
