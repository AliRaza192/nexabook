"use client";

import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";

export default function PurchasesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <ShoppingCart className="h-16 w-16 text-nexabook-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-nexabook-900 mb-2">Purchase Management</h1>
        <p className="text-nexabook-600">
          Manage purchase orders, goods received notes, bills, and vendor payments.
        </p>
      </motion.div>
    </div>
  );
}
