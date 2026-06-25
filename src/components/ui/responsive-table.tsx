"use client";

import { ReactNode } from "react";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = "" }: ResponsiveTableProps) {
  return (
    <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <table className={`w-full ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function MobileCard({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-nexabook-100 last:border-0 ${className}`}>
      <span className="text-sm text-nexabook-500">{label}</span>
      <span className="text-sm font-medium text-nexabook-900 text-right">{value}</span>
    </div>
  );
}
