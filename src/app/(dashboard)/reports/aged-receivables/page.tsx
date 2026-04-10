import ComingSoonReport from "@/components/reports/ComingSoonReport";

export default function AgedReceivablesPage() {
  return (
    <ComingSoonReport
      title="Aged Receivables"
      breadcrumb="Aged Receivables"
      category="Sales Reports"
      categoryHref="/reports"
    />
  );
}
