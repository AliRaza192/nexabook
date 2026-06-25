"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, FileText, Building2, TrendingUp, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getWHTAnnualReturn } from "@/lib/actions/reports";
import { formatPKR } from "@/lib/utils/number-format";

export default function WHTAnnualReturnPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [year]);

  const load = async () => {
    setLoading(true);
    const res = await getWHTAnnualReturn(parseInt(year));
    if (res.success) setData(res.data);
    setLoading(false);
  };

  const quarterTotals = (q: string) =>
    data?.vendors?.reduce((s: number, v: any) => s + (v[q]?.wht || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">Annual WHT Return</h1>
          <p className="text-nexabook-500 mt-1">Yearly withholding tax summary by vendor</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && (
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" /> Print
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-nexabook-400" /></div>
      ) : data ? (
        <>
          {/* Year Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500 opacity-60" />
                  <div>
                    <p className="text-xs text-nexabook-400">Tax Year</p>
                    <p className="text-xl font-bold">{data.year}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-purple-500 opacity-60" />
                  <div>
                    <p className="text-xs text-nexabook-400">Vendors</p>
                    <p className="text-xl font-bold">{data.totalVendors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-amber-500 opacity-60" />
                  <div>
                    <p className="text-xs text-nexabook-400">Total WHT</p>
                    <p className="text-xl font-bold">{formatPKR(data.grandTotalWHT, 'south-asian')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-green-500 opacity-60" />
                  <div>
                    <p className="text-xs text-nexabook-400">Organization</p>
                    <p className="text-sm font-bold truncate">{data.org?.name || 'N/A'}</p>
                    <p className="text-xs text-nexabook-400">NTN: {data.org?.ntn || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Annual Table */}
          <Card>
            <CardHeader><CardTitle>Vendor-wise WHT Summary — {data.year}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-nexabook-400">
                      <th className="pb-3 text-left font-medium">Vendor</th>
                      <th className="pb-3 text-left font-medium">NTN</th>
                      <th className="pb-3 text-right font-medium">Q1 (Jan-Mar)</th>
                      <th className="pb-3 text-right font-medium">Q2 (Apr-Jun)</th>
                      <th className="pb-3 text-right font-medium">Q3 (Jul-Sep)</th>
                      <th className="pb-3 text-right font-medium">Q4 (Oct-Dec)</th>
                      <th className="pb-3 text-right font-medium">Total WHT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendors.map((v: any, i: number) => (
                      <motion.tr
                        key={v.vendorId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b last:border-0 hover:bg-nexabook-50"
                      >
                        <td className="py-3 font-medium text-nexabook-900">{v.vendorName}</td>
                        <td className="py-3 text-nexabook-500">{v.vendorNtn || '-'}</td>
                        <td className="py-3 text-right">{v.q1.wht > 0 ? formatPKR(v.q1.wht, 'south-asian') : '-'}</td>
                        <td className="py-3 text-right">{v.q2.wht > 0 ? formatPKR(v.q2.wht, 'south-asian') : '-'}</td>
                        <td className="py-3 text-right">{v.q3.wht > 0 ? formatPKR(v.q3.wht, 'south-asian') : '-'}</td>
                        <td className="py-3 text-right">{v.q4.wht > 0 ? formatPKR(v.q4.wht, 'south-asian') : '-'}</td>
                        <td className="py-3 text-right font-semibold text-amber-700">{formatPKR(v.totalWHT, 'south-asian')}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold text-nexabook-900">
                      <td className="pt-3">Total</td>
                      <td className="pt-3"></td>
                      <td className="pt-3 text-right">{formatPKR(quarterTotals('q1'), 'south-asian')}</td>
                      <td className="pt-3 text-right">{formatPKR(quarterTotals('q2'), 'south-asian')}</td>
                      <td className="pt-3 text-right">{formatPKR(quarterTotals('q3'), 'south-asian')}</td>
                      <td className="pt-3 text-right">{formatPKR(quarterTotals('q4'), 'south-asian')}</td>
                      <td className="pt-3 text-right text-amber-700">{formatPKR(data.grandTotalWHT, 'south-asian')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="py-12 text-center text-nexabook-400">No WHT data for {year}</CardContent></Card>
      )}
    </div>
  );
}
