"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton, SignOutButton, useUser } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { I18nProvider, useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ChatWidget } from "@/components/ChatWidget";
import CommandPalette from "@/components/CommandPalette";
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
  Bell,
  ChevronLeft,
  Building,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";


interface NavItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  children?: { name: string; href: string; badge?: number }[];
}

function HtmlLangSetter() {
  const { locale, dir } = useT();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  return null;
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { t, dir } = useT();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Sales"]);
  const pathname = usePathname();
  const { user } = useUser();
  const router = useRouter();

  // Onboarding redirect
  useEffect(() => {
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/login") || pathname === "/") return;
    async function checkOnboarding() {
      try {
        const { getOnboardingStatus } = await import("@/lib/actions/onboarding");
        const res = await getOnboardingStatus();
        if (res.success && res.data && !res.data.isCompleted) {
          router.replace("/onboarding");
        }
      } catch { /* ignore */ }
    }
    checkOnboarding();
  }, [pathname, router]);

  const navItems: NavItem[] = [
    {
      name: t("nav.dashboard", "Dashboard"),
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
    },
    {
      name: t("nav.crm", "CRM"),
      icon: <Handshake className="h-5 w-5" />,
      href: "/crm",
      children: [
        { name: t("nav.dashboard", "Dashboard"), href: "/crm" },
        { name: t("nav.leads", "Leads"), href: "/crm/leads" },
        { name: t("nav.tickets", "Tickets"), href: "/crm/tickets" },
        { name: t("nav.events", "Events"), href: "/crm/events" },
        { name: t("nav.calls", "Calls"), href: "/crm/calls" },
      ],
    },
    {
      name: t("nav.sales", "Sales"),
      icon: <FileText className="h-5 w-5" />,
      href: "/sales",
      children: [
        { name: t("nav.customers", "Customers"), href: "/sales/customers" },
        { name: t("nav.salesTeam", "Sales Team"), href: "/sales/team" },
        { name: t("nav.quotations", "Quotations"), href: "/sales/quotations" },
        { name: t("nav.salesOrders", "Sales Orders"), href: "/sales/orders" },
        { name: t("nav.invoices", "Invoices"), href: "/sales/invoices" },
        { name: t("nav.delivery", "Delivery"), href: "/sales/delivery" },
        { name: t("nav.recurringInvoices", "Recurring Invoices"), href: "/sales/recurring" },
        { name: t("nav.salesReturns", "Sales Returns"), href: "/sales/returns" },
        { name: t("nav.receivePayment", "Receive Payment"), href: "/sales/receive-payment" },
        { name: t("nav.refund", "Refund"), href: "/sales/refund" },
        { name: t("nav.settlement", "Settlement"), href: "/sales/settlement" },
      ],
    },
    {
      name: t("nav.purchases", "Purchases"),
      icon: <ShoppingCart className="h-5 w-5" />,
      href: "/purchases",
      children: [
        { name: t("nav.vendors", "Vendors"), href: "/purchases/vendors" },
        { name: t("nav.purchaseOrders", "Purchase Orders"), href: "/purchases/orders" },
        { name: t("nav.purchaseInvoices", "Purchase Invoices"), href: "/purchases/invoices" },
        { name: t("nav.grn", "GRN"), href: "/purchases/grn" },
        { name: t("nav.purchaseReturns", "Purchase Returns"), href: "/purchases/returns" },
        { name: t("nav.payments", "Vendor Payments"), href: "/purchases/payments" },
        { name: t("nav.settlement", "Settlement"), href: "/purchases/settlement" },
      ],
    },
    {
      name: t("nav.pos", "POS"),
      icon: <Monitor className="h-5 w-5" />,
      href: "/pos",
    },
    {
      name: t("nav.accounts", "Accounts"),
      icon: <BookOpen className="h-5 w-5" />,
      href: "/accounts",
      children: [
        { name: t("nav.chartOfAccounts", "Chart of Accounts"), href: "/accounts/chart-of-accounts" },
        { name: t("nav.openingBalance", "Opening Balance"), href: "/accounts/opening-balance" },
        { name: t("nav.journalEntries", "Journal Entries"), href: "/accounts/journal-entries" },
        { name: t("nav.ledger", "Ledger"), href: "/accounts/ledger" },
        { name: t("nav.banking", "Banking"), href: "/accounts/banking" },
        { name: t("nav.creditDebitNotes", "Credit/Debit Notes"), href: "/accounts/credit-debit-notes" },
        { name: t("nav.pdcInstruments", "PDC Instruments"), href: "/accounts/instruments" },
        { name: t("nav.contactSettlement", "Contact Settlement"), href: "/accounts/contact-settlement" },
        { name: t("nav.tax", "Tax"), href: "/accounts/tax" },
        { name: t("nav.reconciliation", "Reconciliation"), href: "/accounts/reconciliation" },
        { name: t("nav.expenses", "Expenses"), href: "/accounts/expenses" },
      ],
    },
    {
      name: t("nav.inventory", "Inventory"),
      icon: <Package className="h-5 w-5" />,
      href: "/inventory",
      children: [
        { name: t("nav.dashboard", "Dashboard"), href: "/inventory" },
        { name: t("nav.stock", "Stock Movement"), href: "/inventory/stock" },
        { name: t("nav.stockAdjustment", "Stock Adjustment"), href: "/inventory/adjustment" },
        { name: t("nav.valuation", "Stock Valuation"), href: "/inventory/valuation" },
        { name: t("nav.warehouses", "Warehouses"), href: "/inventory/warehouses" },
        { name: t("nav.batches", "Batches"), href: "/inventory/batches" },
        { name: t("nav.barcodes", "Barcodes"), href: "/inventory/barcodes" },
        { name: "Price Lists", href: "/inventory/price-lists" },
      ],
    },
    {
      name: t("nav.manufacturing", "Manufacturing"),
      icon: <Factory className="h-5 w-5" />,
      href: "/manufacturing",
      children: [
        { name: t("nav.billOfMaterials", "BOM"), href: "/manufacturing/bom" },
        { name: t("nav.jobOrders", "Job Orders"), href: "/manufacturing/job-orders/new" },
        { name: t("nav.disassemble", "Disassemble"), href: "/manufacturing/disassemble" },
      ],
    },
    {
      name: t("nav.hrPayroll", "HR & Payroll"),
      icon: <Users className="h-5 w-5" />,
      href: "/hr-payroll",
      children: [
        { name: t("nav.employees", "Employees"), href: "/hr-payroll/employees" },
        { name: t("nav.attendance", "Attendance"), href: "/hr-payroll/attendance" },
        { name: t("nav.salary", "Salary Processing"), href: "/hr-payroll/salary" },
      ],
    },
    {
      name: t("nav.fixedAssets", "Fixed Assets"),
      icon: <Building2 className="h-5 w-5" />,
      href: "/fixed-assets",
      children: [
        { name: t("nav.register", "Asset Register"), href: "/fixed-assets/register" },
        { name: t("nav.depreciation", "Depreciation"), href: "/fixed-assets/depreciation" },
      ],
    },
    {
      name: t("nav.reports", "Reports"),
      icon: <BarChart3 className="h-5 w-5" />,
      href: "/reports",
      children: [
        { name: t("nav.dashboard", "Dashboard"), href: "/reports" },
        { name: t("nav.profitAndLoss", "Profit & Loss"), href: "/reports/profit-and-loss" },
        { name: t("nav.balanceSheet", "Balance Sheet"), href: "/reports/balance-sheet" },
        { name: t("nav.trialBalance", "Trial Balance"), href: "/reports/trial-balance" },
        { name: t("nav.cashFlow", "Cash Flow"), href: "/reports/cash-flow" },
        { name: t("nav.customerLedger", "Customer Ledger"), href: "/reports/customer-ledger" },
        { name: t("nav.vendorLedger", "Vendor Ledger"), href: "/reports/vendor-ledger" },
        { name: t("nav.employeeLedger", "Employee Ledger"), href: "/reports/employee-ledger" },
        { name: t("nav.agedReceivables", "Aged Receivables"), href: "/reports/aged-receivables" },
        { name: t("nav.agedPayables", "Aged Payables"), href: "/reports/aged-payables" },
        { name: t("nav.salesTax", "Sales Tax"), href: "/reports/sales-tax" },
        { name: t("nav.purchaseTax", "Purchase Tax"), href: "/reports/purchase-tax" },
        { name: t("nav.whtReport", "WHT Report"), href: "/reports/wht" },
        { name: t("nav.stockOnHand", "Stock on Hand"), href: "/reports/stock-on-hand" },
        { name: t("nav.stockMovement", "Stock Movement"), href: "/reports/stock-movement" },
        { name: t("nav.lowInventory", "Low Inventory"), href: "/reports/low-inventory" },
        { name: t("nav.productProfit", "Product Profit"), href: "/reports/product-profit" },
        { name: t("nav.productAging", "Product Aging"), href: "/reports/product-aging" },
        { name: t("nav.salesByMonth", "Sales by Month"), href: "/reports/sales-by-month" },
        { name: t("nav.salesByGeography", "Sales by Geography"), href: "/reports/sales-by-geography" },
        { name: t("nav.purchaseDetails", "Purchase Details"), href: "/reports/purchase-details" },
        { name: t("nav.attendance", "Attendance"), href: "/reports/attendance" },
        { name: t("nav.payrollSummary", "Payroll Summary"), href: "/reports/payroll-summary" },
        { name: t("nav.bomCost", "BOM Cost"), href: "/reports/bom-cost" },
        { name: t("nav.jobOrderProduction", "Job Order Production"), href: "/reports/job-order-production" },
        { name: t("nav.auditTrail", "Audit Trail"), href: "/reports/audit-log" },
        { name: "Budget vs Actual", href: "/reports/budget" },
      ],
    },
    {
      name: t("nav.settings", "Settings"),
      icon: <Settings className="h-5 w-5" />,
      href: "/settings",
    },
  ];

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
      className={`fixed inset-y-0 ${
        dir === "rtl" ? "right-0" : "left-0"
      } z-50 flex flex-col bg-nexabook-900 text-white transition-all duration-300 ${
        mobile
          ? "w-72"
          : sidebarCollapsed
          ? "w-20"
          : "w-72"
      }`}
    >
      {/* Logo Section */}
      <div className={`flex h-16 items-center justify-between px-4 border-b border-nexabook-700`}>
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
                <div className={`absolute ${dir === "rtl" ? "right-full mr-2" : "left-full ml-2"} px-3 py-2 bg-nexabook-800 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50`}>
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
                  className={`${dir === "rtl" ? "mr-9" : "ml-9"} mt-1 space-y-1 overflow-hidden`}
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
    <>
      <HtmlLangSetter />
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
            dir === "rtl"
              ? sidebarCollapsed ? "lg:mr-20" : "lg:mr-72"
              : sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
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

                {/* Command Palette */}
                <div className="hidden md:flex items-center gap-2">
                  <CommandPalette />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                {/* Language Toggle */}
                <LanguageToggle />

                {/* Notifications */}
                <button className="relative p-2 hover:bg-nexabook-100 rounded-lg transition-colors">
                  <Bell className="h-5 w-5 text-nexabook-600" />
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* Logout Button */}
                <SignOutButton>
                  <button className="p-2 hover:bg-nexabook-100 rounded-lg transition-colors" title={t("common.signOut", "Sign Out")}>
                    <LogOut className="h-5 w-5 text-nexabook-600" />
                  </button>
                </SignOutButton>

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
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
      <ChatWidget />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <DashboardInner>{children}</DashboardInner>
    </I18nProvider>
  );
}
