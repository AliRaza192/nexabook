"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShoppingCart,
  Users,
  FileText,
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
    title: "Manage Vendors",
    description: "Add and manage your suppliers/vendors",
    icon: Users,
    href: "/purchases/vendors",
    color: "blue",
  },
  {
    title: "Purchase Invoices",
    description: "Create and track purchase bills",
    icon: FileText,
    href: "/purchases/invoices",
    color: "green",
  },
  {
    title: "New Purchase Invoice",
    description: "Create a new purchase invoice",
    icon: Plus,
    href: "/purchases/invoices/new",
    color: "orange",
  },
];

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-200",
    hover: "hover:border-blue-300",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-200",
    hover: "hover:border-green-300",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "text-orange-600",
    border: "border-orange-200",
    hover: "hover:border-orange-300",
  },
};

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-nexabook-900">Purchase Management</h1>
        <p className="text-nexabook-600 mt-1">
          Manage purchase invoices, vendors, and supplier payments.
        </p>
      </motion.div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickLinks.map((link, index) => {
          const Icon = link.icon;
          const colors = colorClasses[link.color as keyof typeof colorClasses];

          return (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
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

      {/* Main Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-4"
      >
        <Link href="/purchases/vendors">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800 h-11 px-6">
            <Users className="mr-2 h-4 w-4" />
            Manage Vendors
          </Button>
        </Link>
        <Link href="/purchases/invoices">
          <Button className="bg-nexabook-900 hover:bg-nexabook-800 h-11 px-6">
            <FileText className="mr-2 h-4 w-4" />
            View Invoices
          </Button>
        </Link>
        <Link href="/purchases/invoices/new">
          <Button className="bg-blue-600 hover:bg-blue-700 h-11 px-6">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Invoice
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
