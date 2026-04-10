import ComingSoonReport from "@/components/reports/ComingSoonReport";

export default function AgedPayablesPage() {
  return (
    <ComingSoonReport
      title="Aged Payables"
      breadcrumb="Aged Payables"
      category="Purchase Reports"
      categoryHref="/reports"
    />
  );
}
