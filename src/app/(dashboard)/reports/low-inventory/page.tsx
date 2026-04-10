import ComingSoonReport from "@/components/reports/ComingSoonReport";

export default function LowInventoryPage() {
  return (
    <ComingSoonReport
      title="Low Inventory"
      breadcrumb="Low Inventory"
      category="Inventory Reports"
      categoryHref="/reports"
    />
  );
}
