import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn(
        "flex items-center space-x-2 text-sm text-nexabook-600 mb-4",
        className
      )}
    >
      <Link
        href="/dashboard"
        className="flex items-center hover:text-nexabook-900 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-nexabook-900 transition-colors hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-nexabook-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
