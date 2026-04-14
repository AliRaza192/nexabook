"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Truck,
  Package,
  Users,
  Factory,
  Percent,
  ArrowRight,
  FileText,
  Search,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ReportCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  description: string;
  reports: Report[];
}

interface Report {
  name: string;
  href: string;
  description: string;
}

const reportCategories: ReportCategory[] = [
  {
    id: "financials",
    name: "Financial Reports",
    icon: DollarSign,
    color: "blue",
    description: "Balance Sheet, P&L, Trial Balance, Cash Flow, and more",
    reports: [
      { name: "Profit & Loss", href: "/reports/profit-and-loss", description: "Revenue, expenses, and net profit analysis" },
      { name: "Balance Sheet", href: "/reports/balance-sheet", description: "Assets, liabilities, and equity snapshot" },
      { name: "Trial Balance", href: "/reports/trial-balance", description: "Debit and credit balance verification" },
      { name: "Cash Book", href: "/reports/cash-book", description: "Cash transactions with running balance" },
      { name: "Cash Flow Statement", href: "/reports/cash-flow", description: "Cash inflows and outflows" },
      { name: "Audit Log", href: "/reports/audit-log", description: "Complete system activity trail" },
    ],
  },
  {
    id: "sales",
    name: "Sales Reports",
    icon: ShoppingCart,
    color: "green",
    description: "Customer Ledger, Aged Receivables, Sales Analysis",
    reports: [
      { name: "Customer Ledger", href: "/reports/customer-ledger", description: "Complete customer transaction history" },
      { name: "Aged Receivables", href: "/reports/aged-receivables", description: "Outstanding customer balances by age" },
      { name: "Sales by Month", href: "/reports/sales-by-month", description: "Monthly sales trends" },
      { name: "Product-wise Profit", href: "/reports/product-profit", description: "Profitability by product" },
    ],
  },
  {
    id: "purchases",
    name: "Purchase Reports",
    icon: Truck,
    color: "purple",
    description: "Vendor Ledger, Aged Payables, Purchase Analysis",
    reports: [
      { name: "Vendor Ledger", href: "/reports/vendor-ledger", description: "Complete vendor transaction history" },
      { name: "Aged Payables", href: "/reports/aged-payables", description: "Outstanding vendor balances by age" },
      { name: "Purchase Invoice Details", href: "/reports/purchase-details", description: "Purchase transaction analysis" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory Reports",
    icon: Package,
    color: "amber",
    description: "Stock on Hand, Low Inventory, Stock Movement",
    reports: [
      { name: "Stock on Hand", href: "/reports/stock-on-hand", description: "Current inventory with valuation" },
      { name: "Low Inventory", href: "/reports/low-inventory", description: "Items below minimum stock levels" },
      { name: "Stock Movement", href: "/reports/stock-movement", description: "Inventory inflows and outflows" },
      { name: "Product Aging", href: "/reports/product-aging", description: "Inventory age analysis" },
    ],
  },
  {
    id: "hr-payroll",
    name: "HR & Payroll Reports",
    icon: Users,
    color: "rose",
    description: "Payroll Summary, Employee Ledger, Attendance",
    reports: [
      { name: "Payroll Summary", href: "/reports/payroll-summary", description: "Payroll cost analysis" },
      { name: "Employee Ledger", href: "/reports/employee-ledger", description: "Employee transaction history" },
      { name: "Attendance Report", href: "/reports/attendance", description: "Attendance and hours analysis" },
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing Reports",
    icon: Factory,
    color: "slate",
    description: "BOM Cost Analysis, Job Order Production",
    reports: [
      { name: "BOM Cost Analysis", href: "/reports/bom-cost", description: "Bill of materials cost breakdown" },
      { name: "Job Order Production", href: "/reports/job-order-production", description: "Production order analysis" },
    ],
  },
  {
    id: "tax",
    name: "Tax Reports",
    icon: Percent,
    color: "teal",
    description: "Sales Tax, Tax Paid, Withholding Tax",
    reports: [
      { name: "Sales Tax Collected", href: "/reports/sales-tax", description: "Output tax analysis" },
      { name: "Tax Paid on Purchases", href: "/reports/purchase-tax", description: "Input tax analysis" },
      { name: "WHT Report", href: "/reports/wht", description: "Withholding tax report" },
    ],
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string; hover: string; badge: string }> = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-200",
    hover: "hover:border-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-200",
    hover: "hover:border-green-400",
    badge: "bg-green-100 text-green-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-purple-200",
    hover: "hover:border-purple-400",
    badge: "bg-purple-100 text-purple-700",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    border: "border-amber-200",
    hover: "hover:border-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
  rose: {
    bg: "bg-rose-50",
    icon: "text-rose-600",
    border: "border-rose-200",
    hover: "hover:border-rose-400",
    badge: "bg-rose-100 text-rose-700",
  },
  slate: {
    bg: "bg-slate-50",
    icon: "text-slate-600",
    border: "border-slate-200",
    hover: "hover:border-slate-400",
    badge: "bg-slate-100 text-slate-700",
  },
  teal: {
    bg: "bg-teal-50",
    icon: "text-teal-600",
    border: "border-teal-200",
    hover: "hover:border-teal-400",
    badge: "bg-teal-100 text-teal-700",
  },
};

export default function ReportsHubPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter categories and reports based on search
  const filteredCategories = reportCategories
    .map((category) => ({
      ...category,
      reports: category.reports.filter(
        (report) =>
          report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.reports.length > 0);

  const totalReports = reportCategories.reduce((sum, cat) => sum + cat.reports.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-nexabook-900 rounded-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-nexabook-900">Reports Hub</h1>
            <p className="text-nexabook-600">
              {totalReports}+ comprehensive reports across 7 categories
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="enterprise-card">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-nexabook-400" />
              <Input
                type="search"
                placeholder="Search reports by name, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Report Categories */}
      <div className="space-y-8">
        {filteredCategories.map((category, index) => {
          const Icon = category.icon;
          const colors = colorClasses[category.color];

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 ${colors.bg} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-nexabook-900">{category.name}</h2>
                  <p className="text-sm text-nexabook-600">{category.description}</p>
                </div>
                <Badge className={colors.badge}>
                  {category.reports.length} reports
                </Badge>
              </div>

              {/* Reports Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report, reportIndex) => (
                  <Link key={report.href} href={report.href}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * reportIndex }}
                    >
                      <Card
                        className={`enterprise-card border-2 ${colors.border} ${colors.hover} transition-all cursor-pointer group`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base text-nexabook-900 group-hover:text-blue-700 transition-colors">
                              {report.name}
                            </CardTitle>
                            <ArrowRight className="h-4 w-4 text-nexabook-400 group-hover:text-nexabook-600 transition-colors" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-nexabook-600">
                            {report.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Financial Reports", value: "5", icon: DollarSign, color: "blue" },
          { label: "Sales Reports", value: "4", icon: ShoppingCart, color: "green" },
          { label: "Inventory Reports", value: "4", icon: Package, color: "amber" },
          { label: "Tax Reports", value: "3", icon: Percent, color: "teal" },
        ].map((stat, index) => (
          <Card key={index} className="enterprise-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${stat.color}-50 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-nexabook-900">{stat.value}</p>
                  <p className="text-xs text-nexabook-600">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
