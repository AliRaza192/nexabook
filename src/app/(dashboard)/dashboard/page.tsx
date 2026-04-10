"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Wallet,
  Package,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { getDashboardData, type DashboardData } from "@/lib/actions/dashboard";

// Chart colors
const COLORS = ["#0F172A", "#2563EB", "#64748B", "#94A3B8", "#CBD5E1"];
const NEXA_BLUE = "#0F172A";
const NEXA_ACCENT = "#2563EB";
const SLATE_GRAY = "#94A3B8";

// Date range presets
const dateRanges = [
  { label: "Today", key: "today" },
  { label: "Last 7 Days", key: "7d" },
  { label: "This Month", key: "month" },
  { label: "Last 3 Months", key: "3m" },
];

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
};

// ============= KPI Card Component =============

function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: any;
  trend: number;
  color: string;
  loading: boolean;
}) {
  const bgColors: Record<string, string> = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    amber: "bg-amber-50",
    purple: "bg-purple-50",
  };

  const iconColors: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    purple: "text-purple-600",
  };

  if (loading) {
    return (
      <Card className="enterprise-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="enterprise-card hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-nexabook-600">{title}</p>
              <p className="text-2xl font-bold text-nexabook-900">{formatCurrency(value)}</p>
              <div className="flex items-center gap-1">
                {trend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    trend >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {Math.abs(trend).toFixed(1)}%
                </span>
                <span className="text-xs text-nexabook-500">vs prev period</span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${bgColors[color]}`}>
              <Icon className={`h-6 w-6 ${iconColors[color]}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============= Main Dashboard Component =============

export default function BIDashboard() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedRange, setSelectedRange] = useState("month");

  // Load dashboard data
  const loadData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selection
      const now = new Date();
      let from: Date;
      let to: Date = now;

      switch (selectedRange) {
        case "today":
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7d":
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "3m":
          from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        default:
          from = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const result = await getDashboardData({ from, to });
      if (result.success && result.data) {
        setDashboardData(result.data);
      } else {
        console.error(result.error);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRange]);

  // Dynamic greeting
  const firstName = user?.firstName || user?.username || "there";
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";
  else if (currentHour >= 17) greeting = "Good evening";

  if (!isLoaded || (loading && !dashboardData)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nexabook-600 mx-auto mb-4" />
          <p className="text-nexabook-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Greeting and Date Range */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-nexabook-600 mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        {/* Date Range Picker */}
        <Tabs value={selectedRange} onValueChange={setSelectedRange}>
          <TabsList className="bg-white border border-nexabook-200">
            {dateRanges.map((range) => (
              <TabsTrigger key={range.key} value={range.key} className="text-xs">
                {range.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Top Row - KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={dashboardData?.kpis.totalRevenue || 0}
          icon={DollarSign}
          trend={dashboardData?.kpis.revenueTrend || 0}
          color="blue"
          loading={loading}
        />
        <KPICard
          title="Net Profit"
          value={dashboardData?.kpis.netProfit || 0}
          icon={TrendingUp}
          trend={dashboardData?.kpis.profitTrend || 0}
          color="green"
          loading={loading}
        />
        <KPICard
          title="Accounts Receivable"
          value={dashboardData?.kpis.accountsReceivable || 0}
          icon={ShoppingCart}
          trend={dashboardData?.kpis.arTrend || 0}
          color="amber"
          loading={loading}
        />
        <KPICard
          title="Inventory Value"
          value={dashboardData?.kpis.inventoryValue || 0}
          icon={Package}
          trend={dashboardData?.kpis.inventoryTrend || 0}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Middle Row - Big Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expense Area Chart (70%) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-lg text-nexabook-900">Revenue vs Expenses</CardTitle>
              <CardDescription>Last 6 months trend</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dashboardData?.monthlyTrends || []}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={NEXA_BLUE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={NEXA_BLUE} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SLATE_GRAY} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SLATE_GRAY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke={NEXA_BLUE}
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke={SLATE_GRAY}
                      strokeWidth={2}
                      fill="url(#expenseGradient)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Products Donut Chart (30%) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-lg text-nexabook-900">Top Products</CardTitle>
              <CardDescription>Revenue share</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={dashboardData?.topProducts || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="totalRevenue"
                        animationDuration={1000}
                      >
                        {(dashboardData?.topProducts || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="space-y-2">
                    {(dashboardData?.topProducts || []).map((product, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-nexabook-700 truncate max-w-[120px]">
                            {product.name}
                          </span>
                        </div>
                        <span className="font-semibold text-nexabook-900">
                          {product.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row - Operational Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-lg text-nexabook-900">Accounts Receivable Aging</CardTitle>
              <CardDescription>Outstanding balances by age</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboardData?.arAging || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="category" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                    <Bar
                      dataKey="amount"
                      name="Outstanding"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    >
                      {(dashboardData?.arAging || []).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 3 ? "#EF4444" : index === 2 ? "#F59E0B" : NEXA_BLUE}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Bank & Cash Position */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="enterprise-card">
            <CardHeader>
              <CardTitle className="text-lg text-nexabook-900">Bank & Cash Position</CardTitle>
              <CardDescription>Current liquidity overview</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cash Accounts List */}
                  <div className="space-y-3">
                    {(dashboardData?.cashPositions || []).map((account, index) => (
                      <motion.div
                        key={account.accountId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-center justify-between p-3 bg-nexabook-50 rounded-lg hover:bg-nexabook-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg">
                            <Wallet className="h-4 w-4 text-nexabook-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-nexabook-900">
                              {account.accountName}
                            </p>
                            <p className="text-xs text-nexabook-600">{account.accountCode}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-nexabook-900">
                          {formatCurrency(account.balance)}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Total Cash Gauge */}
                  <div className="p-4 bg-nexabook-900 text-white rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-nexabook-300">Total Cash & Bank</p>
                      <Wallet className="h-5 w-5 text-nexabook-300" />
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(dashboardData?.totalCash || 0)}
                    </p>
                    <div className="mt-3 bg-nexabook-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
