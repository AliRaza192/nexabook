"use client";

import { useState, useEffect } from "react";
import { getDashboardWidgetSettings, updateDashboardWidget } from "@/lib/actions/dashboard-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, Eye, EyeOff } from "lucide-react";

export default function DashboardSettingsPage() {
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await getDashboardWidgetSettings();
    if (res.success) setWidgets(res.data || []);
    setLoading(false);
  };

  const toggle = async (key: string, current: boolean) => {
    setSaving(key);
    await updateDashboardWidget(key, !current);
    setSaving(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-nexabook-900 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-nexabook-600" />
          Dashboard Customization
        </h1>
        <p className="text-nexabook-500 text-sm mt-1">Show or hide dashboard widgets</p>
      </div>

      <Card className="enterprise-card max-w-xl">
        <CardHeader className="pb-3 border-b border-nexabook-50">
          <CardTitle className="text-base font-semibold text-nexabook-900">Widget Visibility</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-nexabook-400" /></div>
          ) : (
            <div className="divide-y divide-nexabook-100">
              {widgets.map((w) => (
                <div key={w.key} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-nexabook-900">{w.label}</p>
                    <p className="text-xs text-nexabook-400">Widget key: {w.key}</p>
                  </div>
                  <Button
                    variant={w.isVisible ? "outline" : "secondary"}
                    size="sm"
                    onClick={() => toggle(w.key, w.isVisible)}
                    disabled={saving === w.key}
                    className="h-8"
                  >
                    {saving === w.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : w.isVisible ? (
                      <><Eye className="h-3.5 w-3.5 mr-1" /> Visible</>
                    ) : (
                      <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hidden</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
