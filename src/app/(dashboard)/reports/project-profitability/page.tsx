"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, Clock, BarChart3,
  Loader2, FolderKanban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjectProfitability } from "@/lib/actions/projects";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function ProjectProfitabilityPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await getProjectProfitability();
    if (res.success) setData(res.data);
    setLoading(false);
  };

  const totals = data.reduce(
    (acc, p) => ({
      budget: acc.budget + parseFloat(p.budgetAmount || "0"),
      hours: acc.hours + p.totalHours,
      revenue: acc.revenue + p.revenue,
      profit: acc.profit + p.profit,
    }),
    { budget: 0, hours: 0, revenue: 0, profit: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexabook-900">Project Profitability</h1>
        <p className="text-nexabook-500 mt-1">Revenue, costs, and profit analysis by project</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Budget", value: totals.budget, icon: DollarSign, color: "text-blue-600" },
          { label: "Total Hours", value: totals.hours, icon: Clock, color: "text-purple-600" },
          { label: "Total Revenue", value: totals.revenue, icon: TrendingUp, color: "text-green-600" },
          { label: "Net Profit", value: totals.profit, icon: BarChart3, color: totals.profit >= 0 ? "text-green-600" : "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
                <div>
                  <p className="text-xs text-nexabook-400">{s.label}</p>
                  <p className="text-xl font-bold text-nexabook-900">
                    {s.label === "Total Hours" ? s.value.toFixed(1) : `Rs. ${(s.value || 0).toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Breakdown */}
      <Card>
        <CardHeader><CardTitle>Project Breakdown</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-nexabook-400" /></div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-nexabook-400">
              <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No projects found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-nexabook-400">
                    <th className="pb-3 text-left font-medium">Project</th>
                    <th className="pb-3 text-right font-medium">Budget</th>
                    <th className="pb-3 text-right font-medium">Hours</th>
                    <th className="pb-3 text-right font-medium">Revenue</th>
                    <th className="pb-3 text-right font-medium">Profit</th>
                    <th className="pb-3 text-right font-medium">Margin</th>
                    <th className="pb-3 text-right font-medium">Budget Util.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b last:border-0 hover:bg-nexabook-50"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-nexabook-900">{p.name}</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>
                            {p.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {p.code && <p className="text-xs text-nexabook-400">{p.code}</p>}
                      </td>
                      <td className="py-3 text-right">Rs. {parseFloat(p.budgetAmount || "0").toLocaleString()}</td>
                      <td className="py-3 text-right">{p.totalHours.toFixed(1)}</td>
                      <td className="py-3 text-right font-medium">Rs. {p.revenue.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className={`flex items-center justify-end gap-1 ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {p.profit >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          Rs. {Math.abs(p.profit).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={p.margin >= 0 ? "text-green-600" : "text-red-600"}>
                          {p.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${p.budgetUtilization > 100 ? "bg-red-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(p.budgetUtilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-nexabook-500">{p.budgetUtilization.toFixed(0)}%</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
