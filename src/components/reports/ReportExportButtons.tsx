"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTableToExcel } from "@/lib/excel-export";

interface ReportExportButtonsProps {
  reportTitle?: string;
  reportData?: any;
  tableId?: string;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export default function ReportExportButtons({
  reportTitle = "Report",
  reportData,
  tableId = "report-table",
  onExportPDF,
  onExportExcel,
}: ReportExportButtonsProps) {
  const handlePDFExport = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      // Use window.print() with print CSS
      window.print();
    }
  };

  const handleExcelExport = () => {
    if (onExportExcel) {
      onExportExcel();
    } else {
      // Extract data from DOM table
      const tableElement = document.getElementById(tableId) as HTMLTableElement;
      if (tableElement) {
        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${reportTitle.replace(/\s+/g, '-')}-${dateStr}`;
        
        exportTableToExcel(tableElement, fileName, reportTitle);
      } else {
        // Fallback: try to find any table in the main content
        const tables = document.querySelectorAll('table');
        if (tables.length > 0) {
          const dateStr = new Date().toISOString().split('T')[0];
          const fileName = `${reportTitle.replace(/\s+/g, '-')}-${dateStr}`;
          exportTableToExcel(tables[0] as HTMLTableElement, fileName, reportTitle);
        }
      }
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        className="h-9"
      >
        <FileDown className="mr-2 h-4 w-4" />
        Print / PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExcelExport}
        className="h-9"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Export Excel
      </Button>
    </div>
  );
}
