"use client";

import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import {
  FileText,
  Package,
  Users,
  Receipt,
  ArrowRight,
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    name: "Create Invoice",
    description: "Generate a professional invoice in seconds",
    icon: FileText,
    href: "/dashboard/sales/invoices/new",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    name: "Add Product",
    description: "Add a new product to your inventory",
    icon: Package,
    href: "/dashboard/inventory/products/new",
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
  },
  {
    name: "Add Employee",
    description: "Register a new employee in the system",
    icon: Users,
    href: "/dashboard/hr-payroll/employees/new",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    name: "Record Expense",
    description: "Log a business expense for tracking",
    icon: Receipt,
    href: "/dashboard/accounts/expenses/new",
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
  },
];

const recentActivity = [
  {
    id: 1,
    type: "Invoice Created",
    description: "Invoice #INV-2026-001 sent to ABC Corp",
    time: "10 minutes ago",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: 2,
    type: "Payment Received",
    description: "Rs. 45,000 received from XYZ Enterprises",
    time: "2 hours ago",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: 3,
    type: "New Employee Added",
    description: "John Doe joined the Engineering department",
    time: "5 hours ago",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    id: 4,
    type: "Low Stock Alert",
    description: "Product 'Widget A' is below reorder level",
    time: "1 day ago",
    icon: Package,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

const upcomingTasks = [
  { task: "Submit monthly tax return", due: "Tomorrow", priority: "high" },
  { task: "Process payroll for March", due: "In 3 days", priority: "medium" },
  { task: "Renew vendor contract", due: "Next week", priority: "low" },
];

export default function DashboardHome() {
  const { user } = useUser();
  const firstName = user?.firstName || "there";
  const currentHour = new Date().getHours();

  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good evening";
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gradient-to-r from-nexabook-900 to-nexabook-800 rounded-2xl p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                {greeting}, {firstName}! 👋
              </h1>
              <p className="text-nexabook-200 text-lg">
                Welcome to your NexaBook dashboard. Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-nexabook-300">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                >
                  <Link href={action.href}>
                    <div className="group p-5 rounded-xl border border-nexabook-200 hover:border-nexabook-300 hover:shadow-lg transition-all duration-300">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${action.bgColor} mb-4 group-hover:scale-110 transition-transform`}>
                        <action.icon className={`h-6 w-6 ${action.color.replace('600', '700')}`} />
                      </div>
                      <h3 className="font-semibold text-nexabook-900 mb-1 group-hover:text-nexabook-700">
                        {action.name}
                      </h3>
                      <p className="text-sm text-nexabook-600">{action.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity & Tasks Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-nexabook-900">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/activity" className="text-sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-start gap-4 p-4 rounded-lg hover:bg-nexabook-50 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-lg ${activity.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <activity.icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nexabook-900 mb-1">
                        {activity.type}
                      </p>
                      <p className="text-sm text-nexabook-600 truncate">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-nexabook-500 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{activity.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-nexabook-900">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.map((task, index) => (
                  <motion.div
                    key={task.task}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="p-4 rounded-lg border border-nexabook-200 hover:border-nexabook-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-nexabook-900 flex-1">
                        {task.task}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-nexabook-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due {task.due}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Empty State Helper */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="border-dashed border-2 border-nexabook-300">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-nexabook-100 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-nexabook-600" />
            </div>
            <h3 className="text-lg font-semibold text-nexabook-900 mb-2">
              Getting Started with NexaBook
            </h3>
            <p className="text-nexabook-600 max-w-md mx-auto mb-6">
              Your business dashboard is ready. Start by setting up your chart of accounts, adding products, or creating your first invoice.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild className="bg-nexabook-900 hover:bg-nexabook-800">
                <Link href="/dashboard/accounts/chart-of-accounts">Setup Chart of Accounts</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/inventory">Browse Inventory</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
