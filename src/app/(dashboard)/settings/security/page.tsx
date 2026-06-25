"use client";

import { UserProfile } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SecuritySettingsPage() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const enforce = searchParams.get("enforce") === "2fa";

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-nexabook-600" />
      </div>
    );
  }

  const is2FAEnabled = user?.twoFactorEnabled ?? false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {enforce && !is2FAEnabled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Two-Factor Authentication Required
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              As an admin, you must enable two-factor authentication before accessing the dashboard.
              Please set up 2FA below, then refresh the page.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexabook-900">Security Settings</h1>
          <p className="text-nexabook-500 mt-1">
            Manage your password, two-factor authentication, and active sessions.
          </p>
        </div>
        <Badge variant={is2FAEnabled ? "default" : "secondary"} className="gap-1.5">
          {is2FAEnabled ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" />
          )}
          2FA: {is2FAEnabled ? "Enabled" : "Off"}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <UserProfile
            routing="path"
            path="/settings/security"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0",
                pageScrollBox: "p-0",
                navbar: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                profileSection__password: {
                  borderTop: "none",
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
