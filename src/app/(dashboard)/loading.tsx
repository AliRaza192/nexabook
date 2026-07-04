import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-nexabook-900" />
        <p className="text-sm text-nexabook-600">Loading...</p>
      </div>
    </div>
  );
}
