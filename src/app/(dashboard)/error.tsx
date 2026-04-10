"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // Add your error monitoring service here (e.g., Sentry, LogRocket)
    }
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-nexabook-900 mb-2">
            Something went wrong!
          </h2>
          <p className="text-sm text-nexabook-600">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button
          onClick={() => reset()}
          className="bg-nexabook-900 hover:bg-nexabook-800"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
