"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

export default function DepreciationPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 text-nexabook-300" />
            <h2 className="text-2xl font-bold text-nexabook-900 mb-2">Asset Depreciation</h2>
            <p className="text-nexabook-600">Calculate and track asset depreciation over time. Coming soon.</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
