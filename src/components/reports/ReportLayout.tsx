"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ReportExportButtons from "./ReportExportButtons";

interface ReportLayoutProps {
  title: string;
  breadcrumb: string;
  category: string;
  categoryHref: string;
  children: ReactNode;
  showExportButtons?: boolean;
}

export default function ReportLayout({
  title,
  breadcrumb,
  category,
  categoryHref,
  children,
  showExportButtons = true,
}: ReportLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-nexabook-600 mb-2">
            <Link href="/reports" className="hover:text-nexabook-900">
              Reports
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={categoryHref} className="hover:text-nexabook-900">
              {category}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-nexabook-900 font-medium">{breadcrumb}</span>
          </nav>

          <h1 className="text-2xl font-bold text-nexabook-900">{title}</h1>
        </div>

        {showExportButtons && <ReportExportButtons reportTitle={title} />}
      </div>

      {/* Report Content */}
      {children}
    </div>
  );
}
