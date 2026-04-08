"use client";

import { motion } from "framer-motion";
import { Factory } from "lucide-react";

export default function ManufacturingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Factory className="h-16 w-16 text-nexabook-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-nexabook-900 mb-2">Manufacturing</h1>
        <p className="text-nexabook-600">
          Bill of materials, job orders, and production management.
        </p>
      </motion.div>
    </div>
  );
}
