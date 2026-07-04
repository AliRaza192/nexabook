"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShoppingCart,
  Users,
  FileText,
  Package,
  RotateCcw,
  DollarSign,
  Handshake,
  FilePlus,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuickLinkCard {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}

const quickLinks: QuickLinkCard[] = [
  {
    title: "Purchase Orders",
    description: "Create and manage purchase orders",
    icon: FileText,
    href: "/purchases/orders",
    color: "blue",
  },
  {
    title: "Purchase Invoices",
    description: "Create and track purchase bills",
    icon: ShoppingCart,
    href: "/purchases/invoices",
    color: "green",
  },
  {
    title: "Good Receiving Notes",
    description: "Record incoming inventory receipts",
    icon: Package,
    href: "/purchases/grn",
    color: "purple",
  },
  {
    title: "Purchase Returns",
    description: "Process returns to vendors",
    icon: RotateCcw,
    href: "/purchases/returns",
    color: "orange",
  },
  {
    title: "Make Payment",
    description: "Record payments to vendors",
    icon: DollarSign,
    href: "/purchases/payments",
    color: "emerald",
  },
  {
    title: "Vendor Settlement",
    description: "Settle outstanding documents",
    icon: Handshake,
    href: "/purchases/settlement",
    color: "indigo",
  },
  {
    title: "Manage Vendors",
    description: "Add and manage your suppliers",
    icon: Users,
    href: "/purchases/vendors",
    color: "cyan",
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string; hover: string }> = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200", hover: "hover:border-blue-300" },
  green: { bg: "bg-green-50", icon: "text-green-600", border: "border-green-200", hover: "hover:border-green-300" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-200", hover: "hover:border-purple-300" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-200", hover: "hover:border-orange-300" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200", hover: "hover:border-emerald-300" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-200", hover: "hover:border-indigo-300" },
  cyan: { bg: "bg-cyan-50", icon: "text-cyan-600", border: "border-cyan-200", hover: "hover:border-cyan-300" },
};

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-nexabook-900">Purchase Management</h1>
        <p className="text-nexabook-600 mt-1">
          Manage purchase orders, invoices, GRNs, returns, vendor payments, and settlements.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {quickLinks.map((link, index) => {
          const Icon = link.icon;
          const colors = colorClasses[link.color] || colorClasses.blue;

          return (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={link.href}>
                <Card className={`border ${colors.border} ${colors.hover} hover:shadow-md transition-all cursor-pointer`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`h-12 w-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                      <ArrowRight className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-nexabook-900 mb-2">{link.title}</h3>
                    <p className="text-sm text-nexabook-600">{link.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-4"
      >
        <Link href="/purchases/orders/new">
          <Button className="bg-blue-600 hover:bg-blue-700 h-11 px-6">
            <FilePlus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
        <Link href="/purchases/invoices/new">
          <Button className="bg-green-600 hover:bg-green-700 h-11 px-6">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Invoice
          </Button>
        </Link>
        <Link href="/purchases/grn/new">
          <Button className="bg-purple-600 hover:bg-purple-700 h-11 px-6">
            <Package className="mr-2 h-4 w-4" />
            New GRN
          </Button>
        </Link>
        <Link href="/purchases/returns/new">
          <Button className="bg-orange-600 hover:bg-orange-700 h-11 px-6">
            <RotateCcw className="mr-2 h-4 w-4" />
            New Purchase Return
          </Button>
        </Link>
        <Link href="/purchases/payments">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6">
            <DollarSign className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
