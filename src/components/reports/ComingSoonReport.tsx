"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ReportLayout from "@/components/reports/ReportLayout";

interface ComingSoonReportProps {
  title: string;
  breadcrumb: string;
  category: string;
  categoryHref: string;
}

export default function ComingSoonReport({
  title,
  breadcrumb,
  category,
  categoryHref,
}: ComingSoonReportProps) {
  return (
    <ReportLayout
      title={title}
      breadcrumb={breadcrumb}
      category={category}
      categoryHref={categoryHref}
    >
      <Card className="enterprise-card">
        <CardHeader>
          <CardTitle className="text-xl text-nexabook-900">Report Under Development</CardTitle>
          <CardDescription>
            This report is being prepared and will be available soon
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Loader2 className="h-16 w-16 animate-spin text-nexabook-400 mx-auto" />
            <h3 className="text-lg font-semibold text-nexabook-900">
              {title} - Coming Soon
            </h3>
            <p className="text-nexabook-600 max-w-md mx-auto">
              This report is currently under development. It will provide comprehensive analytics
              and insights for your business operations.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
}
