"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  ClipboardList,
  ArrowDownUp,
  ArrowRight,
  Package,
  TrendingUp,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ModuleCard {
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
  features: string[];
}

const modules: ModuleCard[] = [
  {
    title: "Bill of Materials",
    description: "Create and manage production recipes with components",
    href: "/manufacturing/bom",
    icon: FileText,
    color: "blue",
    features: [
      "Create BOMs with multiple components",
      "Calculate estimated costs",
      "Manage BOM status (Draft/Active/Archived)",
      "Link to finished goods",
    ],
  },
  {
    title: "Job Orders",
    description: "Track and manage production orders",
    href: "/manufacturing/job-orders/new",
    icon: ClipboardList,
    color: "green",
    features: [
      "Auto-generated order numbers",
      "Component availability checking",
      "Automatic stock deduction",
      "Accounting journal entries",
    ],
  },
  {
    title: "Disassemble",
    description: "Break down finished goods into raw materials",
    href: "/manufacturing/disassemble",
    icon: ArrowDownUp,
    color: "amber",
    features: [
      "Reverse manufacturing process",
      "Recover raw materials",
      "Automatic stock updates",
      "Complete audit trail",
    ],
  },
];

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-200",
    hover: "hover:border-blue-400",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-200",
    hover: "hover:border-green-400",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    border: "border-amber-200",
    hover: "hover:border-amber-400",
  },
};

export default function ManufacturingPage() {
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
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-nexabook-900">Manufacturing & Assembly</h1>
            <p className="text-nexabook-600">
              Manage production, BOMs, job orders, and disassembly operations
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="enterprise-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-nexabook-600">Bill of Materials</p>
                <p className="text-lg font-bold text-nexabook-900">Create & Manage</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="enterprise-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ClipboardList className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-nexabook-600">Job Orders</p>
                <p className="text-lg font-bold text-nexabook-900">Track Production</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="enterprise-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ArrowDownUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-nexabook-600">Disassembly</p>
                <p className="text-lg font-bold text-nexabook-900">Recover Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Module Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold text-nexabook-900 mb-4">Modules</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {modules.map((mod, index) => {
            const Icon = mod.icon;
            const colors = colorClasses[mod.color as keyof typeof colorClasses];

            return (
              <Link key={mod.href} href={mod.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card
                    className={`enterprise-card border-2 ${colors.border} ${colors.hover} transition-all cursor-pointer group`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${colors.bg} rounded-lg`}>
                            <Icon className={`h-5 w-5 ${colors.icon}`} />
                          </div>
                          <CardTitle className="text-lg text-nexabook-900">
                            {mod.title}
                          </CardTitle>
                        </div>
                        <ArrowRight className="h-5 w-5 text-nexabook-400 group-hover:text-nexabook-600 transition-colors" />
                      </div>
                      <CardDescription className="mt-2">
                        {mod.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {mod.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-nexabook-700">
                            <TrendingUp className="h-3 w-3 text-nexabook-400 mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Start Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="enterprise-card">
          <CardHeader>
            <CardTitle className="text-xl text-nexabook-900">Quick Start Guide</CardTitle>
            <CardDescription>
              Follow these steps to get started with manufacturing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-nexabook-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nexabook-900 text-white flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-nexabook-900">
                    Create Products First
                  </h4>
                  <p className="text-sm text-nexabook-600 mt-1">
                    Before creating BOMs, ensure you have products created in the inventory for both
                    finished goods and raw materials.
                  </p>
                  <Link
                    href="/inventory"
                    className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-flex items-center gap-1"
                  >
                    Go to Inventory <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-nexabook-900">
                    Create a Bill of Materials (BOM)
                  </h4>
                  <p className="text-sm text-nexabook-700 mt-1">
                    Define what finished good you&apos;re producing and what raw materials are needed.
                    The system will calculate the estimated cost automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-nexabook-900">
                    Create and Complete Job Orders
                  </h4>
                  <p className="text-sm text-nexabook-700 mt-1">
                    Create production orders from your BOMs. When you complete them, raw materials
                    are deducted and finished goods are added to stock automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-semibold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-nexabook-900">
                    Disassemble if Needed
                  </h4>
                  <p className="text-sm text-nexabook-700 mt-1">
                    Need to reverse production? Use the Disassemble module to break down finished
                    goods and recover raw materials.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
