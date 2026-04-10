"use client";

import { motion } from "framer-motion";
import { Users, CalendarDays, DollarSign, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Employee Management",
    description: "Add, edit, and manage employee records with complete profiles",
    icon: Users,
    href: "/hr-payroll/employees",
    color: "blue",
  },
  {
    title: "Attendance Tracking",
    description: "Mark daily attendance and track employee presence",
    icon: CalendarDays,
    href: "/hr-payroll/attendance",
    color: "green",
  },
  {
    title: "Run Payroll",
    description: "Generate and approve monthly payroll for all employees",
    icon: DollarSign,
    href: "/hr-payroll/run",
    color: "purple",
  },
  {
    title: "Payslip Reports",
    description: "View, download, and print employee payslips",
    icon: FileText,
    href: "/hr-payroll/reports",
    color: "orange",
  },
];

export default function HRPayrollPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">HR & Payroll</h1>
        <p className="text-slate-600 mt-2">
          Complete employee management, attendance tracking, and payroll processing with Pakistan-specific compliance
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod, index) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={mod.href}>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-lg bg-${mod.color}-100 flex items-center justify-center flex-shrink-0 group-hover:bg-${mod.color}-200 transition-colors`}>
                        <Icon className={`h-6 w-6 text-${mod.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {mod.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">{mod.description}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto text-blue-600 hover:text-blue-700 group/btn"
                        >
                          Open Module
                          <ArrowRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Pakistan Payroll Compliance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">EOBI Contribution</h4>
              <p className="text-sm text-slate-600">
                Employer: 6% | Employee: 1% of basic salary. Applicable for all organizations under EOBI Act 1992.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Income Tax Slabs</h4>
              <p className="text-sm text-slate-600">
                Automatic tax calculation based on Pakistan income tax slabs (FY 2025-26).
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Working Days</h4>
              <p className="text-sm text-slate-600">
                Standard 26 working days per month. Overtime calculated at 1.5x hourly rate as per labor laws.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
