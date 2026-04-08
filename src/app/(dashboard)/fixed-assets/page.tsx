"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

export default function FixedAssetsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Building2 className="h-16 w-16 text-nexabook-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-nexabook-900 mb-2">Fixed Assets</h1>
        <p className="text-nexabook-600">
          Asset register management and automated depreciation calculations.
        </p>
      </motion.div>
    </div>
  );
}
