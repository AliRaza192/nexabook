"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Handshake,
  FileText,
  ShoppingCart,
  Monitor,
  BookOpen,
  Package,
  Factory,
  Users,
  Building2,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Search,
  Bell,
  ChevronLeft,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NavItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  children?: { name: string; href: string; badge?: number }[];
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/dashboard",
  },
  {
    name: "CRM",
    icon: <Handshake className="h-5 w-5" />,
    href: "/crm",
    children: [
      { name: "Leads", href: "/crm/leads" },
      { name: "Tickets", href: "/crm/tickets" },
      { name: "Loyalty", href: "/crm/loyalty" },
    ],
  },
  {
    name: "Sales",
    icon: <FileText className="h-5 w-5" />,
    href: "/sales",
    children: [
      { name: "Quotations", href: "/sales/quotations" },
      { name: "Sales Orders", href: "/sales/orders" },
      { name: "Invoices", href: "/sales/invoices" },
      { name: "Recurring Invoices", href: "/sales/recurring" },
      { name: "Sales Returns", href: "/sales/returns" },
    ],
  },
  {
    name: "Purchases",
    icon: <ShoppingCart className="h-5 w-5" />,
    href: "/purchases",
    children: [
      { name: "Purchase Orders", href: "/purchases/orders" },
      { name: "GRN", href: "/purchases/grn" },
      { name: "Bills", href: "/purchases/bills" },
      { name: "Vendor Payments", href: "/purchases/payments" },
    ],
  },
  {
    name: "POS",
    icon: <Monitor className="h-5 w-5" />,
    href: "/pos",
  },
  {
    name: "Accounts",
    icon: <BookOpen className="h-5 w-5" />,
    href: "/accounts",
    children: [
      { name: "Chart of Accounts", href: "/accounts/chart-of-accounts" },
      { name: "Journal Entries", href: "/accounts/journal-entries" },
      { name: "Ledger", href: "/accounts/ledger" },
      { name: "Banking", href: "/accounts/banking" },
      { name: "Tax", href: "/accounts/tax" },
      { name: "Reconciliation", href: "/accounts/reconciliation" },
    ],
  },
  {
    name: "Inventory",
    icon: <Package className="h-5 w-5" />,
    href: "/inventory",
    children: [
      { name: "Stock Movement", href: "/inventory/stock" },
      { name: "Warehouses", href: "/inventory/warehouses" },
      { name: "Batches", href: "/inventory/batches" },
    ],
  },
  {
    name: "Manufacturing",
    icon: <Factory className="h-5 w-5" />,
    href: "/manufacturing",
    children: [
      { name: "BOM", href: "/manufacturing/bom" },
      { name: "Job Orders", href: "/manufacturing/jobs" },
    ],
  },
  {
    name: "HR & Payroll",
    icon: <Users className="h-5 w-5" />,
    href: "/hr-payroll",
    children: [
      { name: "Employees", href: "/hr-payroll/employees" },
      { name: "Attendance", href: "/hr-payroll/attendance" },
      { name: "Salary Processing", href: "/hr-payroll/salary" },
    ],
  },
  {
    name: "Fixed Assets",
    icon: <Building2 className="h-5 w-5" />,
    href: "/fixed-assets",
    children: [
      { name: "Asset Register", href: "/fixed-assets/register" },
      { name: "Depreciation", href: "/fixed-assets/depreciation" },
    ],
  },
  {
    name: "Reports",
    icon: <BarChart3 className="h-5 w-5" />,
    href: "/reports",
    badge: 100,
  },
  {
    name: "Settings",
    icon: <Settings className="h-5 w-5" />,
    href: "/settings",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Sales"]);
  const pathname = usePathname();
  const { user } = useUser();

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-nexabook-900 text-white transition-all duration-300 ${
        mobile
          ? "w-72"
          : sidebarCollapsed
          ? "w-20"
          : "w-72"
      }`}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-nexabook-700">
        {!sidebarCollapsed || mobile ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-nexabook-900" />
            </div>
            <span className="text-xl font-bold">NexaBook</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-nexabook-900" />
            </div>
          </Link>
        )}
        {mobile ? (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 hover:bg-nexabook-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 hover:bg-nexabook-800 rounded-lg"
          >
            <ChevronLeft
              className={`h-5 w-5 transition-transform ${
                sidebarCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Company Info (Desktop) */}
      {!mobile && !sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-nexabook-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-nexabook-700 flex items-center justify-center">
              <Building className="h-5 w-5 text-nexabook-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Acme Corporation</p>
              <p className="text-xs text-nexabook-400">Professional Plan</p>
            </div>
            <ChevronDown className="h-4 w-4 text-nexabook-400" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {navItems.map((item) => (
          <div key={item.name}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                isActive(item.href)
                  ? "bg-nexabook-700 text-white"
                  : "text-nexabook-300 hover:bg-nexabook-800 hover:text-white"
              }`}
              onClick={(e) => {
                if (item.children) {
                  e.preventDefault();
                  toggleExpanded(item.name);
                }
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(!sidebarCollapsed || mobile) && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.name}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-nexabook-600">
                      {item.badge}+
                    </span>
                  )}
                  {item.children && (
                    <span className="flex-shrink-0">
                      {expandedItems.includes(item.name) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </>
              )}
              
              {/* Tooltip for collapsed state */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-nexabook-800 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.name}
                </div>
              )}
            </Link>
            
            {/* Children */}
            <AnimatePresence>
              {item.children && (!sidebarCollapsed || mobile) && expandedItems.includes(item.name) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-9 mt-1 space-y-1 overflow-hidden"
                >
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive(child.href)
                          ? "bg-nexabook-700/50 text-white"
                          : "text-nexabook-400 hover:text-white hover:bg-nexabook-800/50"
                      }`}
                    >
                      <span>{child.name}</span>
                      {child.badge && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-nexabook-600">
                          {child.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* User Profile (Bottom) */}
      {!mobile && (
        <div className="p-4 border-t border-nexabook-700">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase() || "U"}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.fullName || "User"}
                </p>
                <p className="text-xs text-nexabook-400 truncate">
                  {user?.emailAddresses[0]?.emailAddress || "user@example.com"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-nexabook-50">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <Sidebar mobile />
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-nexabook-200 h-16">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-nexabook-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Search Bar */}
              <div className="hidden md:flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexabook-400" />
                  <Input
                    type="search"
                    placeholder="Search anything..."
                    className="w-64 pl-10 bg-nexabook-50 border-nexabook-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 hover:bg-nexabook-100 rounded-lg transition-colors">
                <Bell className="h-5 w-5 text-nexabook-600" />
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-nexabook-200 hidden md:block" />

              {/* User Button */}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
