import ComingSoonReport from "@/components/reports/ComingSoonReport";

export default function AttendancePage() {
  return (
    <ComingSoonReport
      title="Attendance Report"
      breadcrumb="Attendance Report"
      category="HR & Payroll Reports"
      categoryHref="/reports"
    />
  );
}
