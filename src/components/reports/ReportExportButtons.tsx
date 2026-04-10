"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportExportButtonsProps {
  reportTitle?: string;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export default function ReportExportButtons({
  reportTitle = "Report",
  onExportPDF,
  onExportExcel,
}: ReportExportButtonsProps) {
  const handlePDFExport = () => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      // Placeholder: Print current page
      window.print();
    }
  };

  const handleExcelExport = () => {
    if (onExportExcel) {
      onExportExcel();
    } else {
      // Placeholder: Show alert
      alert(
        `Export to Excel functionality will be available soon. This is a placeholder for ${reportTitle}.`
      );
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        className="h-9"
      >
        <FileDown className="mr-2 h-4 w-4" />
        Export PDF
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
