"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Repeat,
  FileText,
  Receipt,
  Wallet,
  Users,
  Package,
  Layers,
  Percent,
  PlayCircle,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER";

interface SidebarProps {
  role?: UserRole;
  userName?: string;
  userEmail?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  // Common / Ops
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "STAFF"] },
  { label: "Quotations", href: "/admin/subscriptions?status=QUOTATION", icon: FileText, roles: ["ADMIN", "STAFF"] },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: Repeat, roles: ["ADMIN", "STAFF"] },
  { label: "Invoices", href: "/invoices", icon: Receipt, roles: ["ADMIN", "STAFF"] },
  { label: "Payments", href: "/payments", icon: Wallet, roles: ["ADMIN", "STAFF"] },
  { label: "Customers", href: "/customers", icon: Users, roles: ["ADMIN", "STAFF"] },
  
  // Catalog & Configuration
  { label: "Products", href: "/admin/products", icon: Package, roles: ["ADMIN", "STAFF"] },
  { label: "Plans", href: "/admin/plans", icon: Layers, roles: ["ADMIN", "STAFF"] },
  { label: "Templates", href: "/admin/quotation-templates", icon: FileText, roles: ["ADMIN", "STAFF"] },
  { label: "Taxes", href: "/admin/taxes", icon: Receipt, roles: ["ADMIN", "STAFF"] },
  { label: "Payment Terms", href: "/admin/payment-terms", icon: CreditCard, roles: ["ADMIN", "STAFF"] },
  { label: "Discounts", href: "/admin/discounts", icon: Percent, roles: ["ADMIN", "STAFF"] },
  { label: "Billing Engine", href: "/admin/billing-run", icon: PlayCircle, roles: ["ADMIN", "STAFF"] },
  { label: "Reports & MRR", href: "/admin/reports", icon: BarChart3, roles: ["ADMIN", "STAFF"] },
  { label: "Staff Access", href: "/admin/staff", icon: ShieldCheck, roles: ["ADMIN"] },

  // Customer Portal
  { label: "My Subscriptions", href: "/portal/subscriptions", icon: Repeat, roles: ["CUSTOMER"] },
  { label: "My Invoices", href: "/portal/invoices", icon: Receipt, roles: ["CUSTOMER"] },
  { label: "Payment History", href: "/portal/payments", icon: CreditCard, roles: ["CUSTOMER"] },
];

function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-indigo-50/80 text-indigo-600 font-semibold shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
              )}
            />
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarNavFallback({ items }: { items: NavItem[] }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.href}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
          >
            <Icon className="h-4 w-4 text-slate-400" />
            <span className="truncate">{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role = "ADMIN", userName = "Admin User", userEmail = "admin@brightloop.test" }: SidebarProps) {
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/90 bg-white shadow-xs">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-slate-900 text-base">Brightloop</span>
            <span className="inline-flex items-center rounded-sm bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 border border-indigo-200/60">
              SMS
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">Subscription Platform</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {role === "CUSTOMER" ? "Customer Portal" : "Operations"}
        </div>
        <Suspense fallback={<SidebarNavFallback items={visibleItems} />}>
          <SidebarNav items={visibleItems} />
        </Suspense>
      </div>

      {/* User profile footer */}
      <div className="border-t border-slate-200/80 p-3">
        <div className="flex items-center gap-3 rounded-lg p-2 bg-slate-50 border border-slate-200/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-semibold text-xs text-white">
            {userName.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-xs font-semibold text-slate-800">{userName}</span>
            <span className="truncate text-[11px] text-slate-400">{userEmail}</span>
          </div>
          <span className="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}
