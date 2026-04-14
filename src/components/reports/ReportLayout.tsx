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
  reportData?: any;
  tableId?: string;
}

export default function ReportLayout({
  title,
  breadcrumb,
  category,
  categoryHref,
  children,
  showExportButtons = true,
  reportData,
  tableId,
}: ReportLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs - Hidden on print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hidden">
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

        {showExportButtons && (
          <ReportExportButtons
            reportTitle={title}
            reportData={reportData}
            tableId={tableId}
          />
        )}
      </div>

      {/* Print Header - Visible only when printing */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold text-nexabook-900">{title}</h1>
        <p className="text-sm text-nexabook-600">
          Generated on {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Report Content */}
      {children}

      {/* Signature Lines - Visible only when printing */}
      <div className="hidden print:block mt-16 pt-8 border-t border-gray-300">
        <div className="flex justify-between gap-8">
          <div className="flex-1 text-center">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <p className="text-sm font-semibold">Prepared By</p>
              <p className="text-xs text-gray-600 mt-1">Signature & Date</p>
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <p className="text-sm font-semibold">Approved By</p>
              <p className="text-xs text-gray-600 mt-1">Signature & Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
