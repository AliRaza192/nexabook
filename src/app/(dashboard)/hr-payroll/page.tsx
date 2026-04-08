"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";

export default function HRPayrollPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Users className="h-16 w-16 text-nexabook-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-nexabook-900 mb-2">HR & Payroll</h1>
        <p className="text-nexabook-600">
          Employee management, attendance tracking, and salary processing.
        </p>
      </motion.div>
    </div>
  );
}
