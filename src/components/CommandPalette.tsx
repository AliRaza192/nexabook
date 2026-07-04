"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
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
} from "lucide-react";

const pages = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "CRM", icon: Handshake, href: "/crm", children: [
    { name: "Leads", href: "/crm/leads" },
    { name: "Tickets", href: "/crm/tickets" },
    { name: "Events", href: "/crm/events" },
    { name: "Calls", href: "/crm/calls" },
  ]},
  { name: "Sales", icon: FileText, href: "/sales", children: [
    { name: "Customers", href: "/sales/customers" },
    { name: "Sales Team", href: "/sales/team" },
    { name: "Quotations", href: "/sales/quotations" },
    { name: "Sales Orders", href: "/sales/orders" },
    { name: "Invoices", href: "/sales/invoices" },
    { name: "Delivery", href: "/sales/delivery" },
    { name: "Recurring Invoices", href: "/sales/recurring" },
    { name: "Sales Returns", href: "/sales/returns" },
    { name: "Receive Payment", href: "/sales/receive-payment" },
    { name: "Refund", href: "/sales/refund" },
    { name: "Settlement", href: "/sales/settlement" },
  ]},
  { name: "Purchases", icon: ShoppingCart, href: "/purchases", children: [
    { name: "Vendors", href: "/purchases/vendors" },
    { name: "Purchase Orders", href: "/purchases/orders" },
    { name: "Purchase Invoices", href: "/purchases/invoices" },
    { name: "GRN", href: "/purchases/grn" },
    { name: "Purchase Returns", href: "/purchases/returns" },
    { name: "Vendor Payments", href: "/purchases/payments" },
    { name: "Settlement", href: "/purchases/settlement" },
  ]},
  { name: "POS", icon: Monitor, href: "/pos" },
  { name: "Accounts", icon: BookOpen, href: "/accounts", children: [
    { name: "Chart of Accounts", href: "/accounts/chart-of-accounts" },
    { name: "Opening Balance", href: "/accounts/opening-balance" },
    { name: "Journal Entries", href: "/accounts/journal-entries" },
    { name: "Ledger", href: "/accounts/ledger" },
    { name: "Banking", href: "/accounts/banking" },
    { name: "Credit/Debit Notes", href: "/accounts/credit-debit-notes" },
    { name: "PDC Instruments", href: "/accounts/instruments" },
    { name: "Contact Settlement", href: "/accounts/contact-settlement" },
    { name: "Tax", href: "/accounts/tax" },
    { name: "Reconciliation", href: "/accounts/reconciliation" },
    { name: "Expenses", href: "/accounts/expenses" },
  ]},
  { name: "Inventory", icon: Package, href: "/inventory", children: [
    { name: "Dashboard", href: "/inventory" },
    { name: "Stock Movement", href: "/inventory/stock" },
    { name: "Stock Adjustment", href: "/inventory/adjustment" },
    { name: "Stock Valuation", href: "/inventory/valuation" },
    { name: "Warehouses", href: "/inventory/warehouses" },
    { name: "Batches", href: "/inventory/batches" },
    { name: "Barcodes", href: "/inventory/barcodes" },
  ]},
  { name: "Manufacturing", icon: Factory, href: "/manufacturing", children: [
    { name: "BOM", href: "/manufacturing/bom" },
    { name: "Job Orders", href: "/manufacturing/job-orders/new" },
    { name: "Disassemble", href: "/manufacturing/disassemble" },
  ]},
  { name: "HR & Payroll", icon: Users, href: "/hr-payroll", children: [
    { name: "Employees", href: "/hr-payroll/employees" },
    { name: "Attendance", href: "/hr-payroll/attendance" },
    { name: "Salary Processing", href: "/hr-payroll/salary" },
  ]},
  { name: "Fixed Assets", icon: Building2, href: "/fixed-assets", children: [
    { name: "Asset Register", href: "/fixed-assets/register" },
    { name: "Depreciation", href: "/fixed-assets/depreciation" },
  ]},
  { name: "Reports", icon: BarChart3, href: "/reports", children: [
    { name: "Profit & Loss", href: "/reports/profit-and-loss" },
    { name: "Balance Sheet", href: "/reports/balance-sheet" },
    { name: "Trial Balance", href: "/reports/trial-balance" },
    { name: "Cash Flow", href: "/reports/cash-flow" },
    { name: "Customer Ledger", href: "/reports/customer-ledger" },
    { name: "Vendor Ledger", href: "/reports/vendor-ledger" },
    { name: "Employee Ledger", href: "/reports/employee-ledger" },
    { name: "Aged Receivables", href: "/reports/aged-receivables" },
    { name: "Aged Payables", href: "/reports/aged-payables" },
    { name: "Sales Tax", href: "/reports/sales-tax" },
    { name: "Purchase Tax", href: "/reports/purchase-tax" },
    { name: "WHT Report", href: "/reports/wht" },
    { name: "Stock on Hand", href: "/reports/stock-on-hand" },
    { name: "Stock Movement", href: "/reports/stock-movement" },
    { name: "Low Inventory", href: "/reports/low-inventory" },
    { name: "Product Profit", href: "/reports/product-profit" },
    { name: "Product Aging", href: "/reports/product-aging" },
    { name: "Sales by Month", href: "/reports/sales-by-month" },
    { name: "Sales by Geography", href: "/reports/sales-by-geography" },
    { name: "Purchase Details", href: "/reports/purchase-details" },
    { name: "Attendance", href: "/reports/attendance" },
    { name: "Payroll Summary", href: "/reports/payroll-summary" },
    { name: "BOM Cost", href: "/reports/bom-cost" },
    { name: "Job Order Production", href: "/reports/job-order-production" },
    { name: "Audit Trail", href: "/reports/audit-log" },
  ]},
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-nexabook-600 bg-nexabook-800 px-3 py-1.5 text-sm text-nexabook-300 hover:bg-nexabook-700 transition-colors"
      >
        <span>Ctrl+K</span>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command Palette"
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      >
        <div
          className="fixed inset-0 bg-black/60"
          onClick={() => setOpen(false)}
        />
        <div className="relative z-10 w-full max-w-lg rounded-xl border border-nexabook-600 bg-nexabook-900 shadow-2xl overflow-hidden">
          <Command.Input
            placeholder="Search pages..."
            className="w-full border-b border-nexabook-600 bg-transparent px-4 py-3 text-white placeholder-nexabook-400 outline-none"
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-nexabook-400">
              No results found.
            </Command.Empty>
            {pages.map((page) => (
              <Command.Group key={page.name} heading={page.name}>
                <Command.Item
                  value={page.name}
                  onSelect={() => runCommand(page.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-white aria-selected:bg-nexabook-700 transition-colors"
                >
                  <page.icon className="h-4 w-4 text-nexabook-400" />
                  <span>{page.name}</span>
                </Command.Item>
                {page.children?.map((child) => (
                  <Command.Item
                    key={child.href}
                    value={`${page.name} ${child.name}`}
                    onSelect={() => runCommand(child.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 pl-9 text-sm text-nexabook-200 aria-selected:bg-nexabook-700 transition-colors"
                  >
                    <span>{child.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </div>
      </Command.Dialog>
    </>
  );
}
