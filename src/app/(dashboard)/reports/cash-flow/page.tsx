import ComingSoonReport from "@/components/reports/ComingSoonReport";

export default function CashFlowPage() {
  return (
    <ComingSoonReport
      title="Cash Flow Statement"
      breadcrumb="Cash Flow Statement"
      category="Financial Reports"
      categoryHref="/reports"
    />
  );
}
