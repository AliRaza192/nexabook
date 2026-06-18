"use server";

import { db } from "@/db";
import { dashboardWidgets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import { revalidatePath } from "next/cache";

const DEFAULT_WIDGETS = [
  { key: "kpi_revenue", label: "Revenue KPI", defaultVisible: true },
  { key: "kpi_expenses", label: "Expenses KPI", defaultVisible: true },
  { key: "kpi_sales", label: "Sales Count KPI", defaultVisible: true },
  { key: "kpi_low_stock", label: "Low Stock KPI", defaultVisible: true },
  { key: "chart_revenue_expenses", label: "Revenue vs Expenses Chart", defaultVisible: true },
  { key: "chart_top_products", label: "Top Products Pie Chart", defaultVisible: true },
  { key: "chart_ar_aging", label: "AR Aging Chart", defaultVisible: true },
  { key: "chart_cash_position", label: "Cash Position", defaultVisible: true },
];

export async function getDashboardWidgetSettings() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const rows = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.orgId, orgId));

    const settings = new Map(rows.map((r) => [r.widgetKey, r.isVisible]));

    const widgets = DEFAULT_WIDGETS.map((w) => ({
      ...w,
      isVisible: settings.has(w.key) ? settings.get(w.key)! : w.defaultVisible,
    }));

    return { success: true, data: widgets };
  } catch (error) {
    return { success: false, error: "Failed to load widget settings" };
  }
}

export async function updateDashboardWidget(key: string, isVisible: boolean) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const [existing] = await db
      .select({ id: dashboardWidgets.id })
      .from(dashboardWidgets)
      .where(and(eq(dashboardWidgets.orgId, orgId), eq(dashboardWidgets.widgetKey, key)))
      .limit(1);

    if (existing) {
      await db
        .update(dashboardWidgets)
        .set({ isVisible, updatedAt: new Date() })
        .where(eq(dashboardWidgets.id, existing.id));
    } else {
      await db.insert(dashboardWidgets).values({ orgId, widgetKey: key, isVisible });
    }

    revalidatePath("/dashboard");
    revalidatePath("/settings/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update widget" };
  }
}
