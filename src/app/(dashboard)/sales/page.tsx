"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText, Package, Repeat, RotateCcw, DollarSign, Undo2, Handshake, Truck,
  ArrowRight, BarChart3
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  { title: "Quotations", description: "Create and manage sales quotes", href: "/sales/quotations", icon: FileText, color: "bg-blue-500" },
  { title: "Invoices", description: "Sales invoices and billing", href: "/sales/invoices", icon: BarChart3, color: "bg-green-500" },
  { title: "Orders", description: "Sale orders management", href: "/sales/orders", icon: Package, color: "bg-purple-500" },
  { title: "Delivery Notes", description: "Track shipments and deliveries", href: "/sales/delivery", icon: Truck, color: "bg-orange-500" },
  { title: "Recurring Invoices", description: "Automated recurring billing", href: "/sales/recurring", icon: Repeat, color: "bg-cyan-500" },
  { title: "Sales Returns", description: "Process returns and refunds", href: "/sales/returns", icon: RotateCcw, color: "bg-red-500" },
  { title: "Receive Payment", description: "Record customer payments", href: "/sales/receive-payment", icon: DollarSign, color: "bg-emerald-500" },
  { title: "Refunds", description: "Process refund transactions", href: "/sales/refund", icon: Undo2, color: "bg-amber-500" },
  { title: "Settlements", description: "Customer account settlements", href: "/sales/settlement", icon: Handshake, color: "bg-indigo-500" },
];

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-nexabook-900">Sales Management</h1>
        <p className="text-nexabook-600 mt-1">Manage quotations, orders, invoices, recurring billing, returns, and payments.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={mod.href}>
              <Card className="border border-nexabook-200 hover:shadow-lg hover:border-nexabook-300 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-nexabook-900 group-hover:text-nexabook-600 transition-colors">{mod.title}</h3>
                      <p className="text-sm text-nexabook-600 mt-1">{mod.description}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-lg ${mod.color} flex items-center justify-center text-white`}>
                      <mod.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-3 text-sm text-nexabook-500 group-hover:text-nexabook-700">
                    <span>Open</span><ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
