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
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER";

interface SidebarProps {
  role?: UserRole;
  userName?: string;
  userEmail?: string;
  onNavigate?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/admin/reports", icon: LayoutDashboard, roles: ["ADMIN", "STAFF"], exact: true },
      { label: "Subscriptions", href: "/admin/subscriptions", icon: Repeat, roles: ["ADMIN", "STAFF"] },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt, roles: ["ADMIN", "STAFF"] },
      { label: "Payments", href: "/admin/payments", icon: Wallet, roles: ["ADMIN", "STAFF"] },
      { label: "Customers", href: "/admin/staff", icon: Users, roles: ["ADMIN", "STAFF"] },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, roles: ["ADMIN", "STAFF"] },
      { label: "Plans", href: "/admin/plans", icon: Layers, roles: ["ADMIN", "STAFF"] },
      { label: "Templates", href: "/admin/quotation-templates", icon: FileStack, roles: ["ADMIN", "STAFF"] },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Taxes", href: "/admin/taxes", icon: Receipt, roles: ["ADMIN"] },
      { label: "Payment Terms", href: "/admin/payment-terms", icon: CreditCard, roles: ["ADMIN"] },
      { label: "Discounts", href: "/admin/discounts", icon: Percent, roles: ["ADMIN"] },
      { label: "Billing Engine", href: "/admin/billing-run", icon: PlayCircle, roles: ["ADMIN", "STAFF"] },
      { label: "Reports & MRR", href: "/admin/reports", icon: BarChart3, roles: ["ADMIN", "STAFF"] },
      { label: "Staff Access", href: "/admin/staff", icon: ShieldCheck, roles: ["ADMIN"] },
    ],
  },
];

const portalNavGroups: NavGroup[] = [
  {
    title: "My Account",
    items: [
      { label: "Dashboard", href: "/portal", icon: LayoutDashboard, roles: ["CUSTOMER"], exact: true },
      { label: "My Subscriptions", href: "/portal/subscriptions", icon: Repeat, roles: ["CUSTOMER"] },
      { label: "My Invoices", href: "/portal/invoices", icon: FileText, roles: ["CUSTOMER"] },
    ],
  },
];

function NavGroupSection({
  group,
  role,
  onNavigate,
}: {
  group: NavGroup;
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibleItems = group.items.filter((item) => item.roles.includes(role));

  if (visibleItems.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {group.title}
      </div>
      <nav className="space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label + item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarNavFallback() {
  return (
    <div className="space-y-2 px-3 py-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-8 rounded-lg bg-slate-100 animate-pulse"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}

function SidebarNavContent({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const groups = role === "CUSTOMER" ? portalNavGroups : adminNavGroups;

  return (
    <div>
      {groups.map((group) => (
        <NavGroupSection
          key={group.title}
          group={group}
          role={role}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  role = "ADMIN",
  userName = "Admin User",
  userEmail = "admin@brightloop.test",
  onNavigate,
}: SidebarProps) {
  const roleBadgeColors: Record<UserRole, string> = {
    ADMIN: "bg-indigo-100 text-indigo-700",
    STAFF: "bg-amber-100 text-amber-700",
    CUSTOMER: "bg-emerald-100 text-emerald-700",
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 leading-tight">Brightloop</span>
          <span className="text-[11px] text-slate-400 leading-tight">Subscription Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Suspense fallback={<SidebarNavFallback />}>
          <SidebarNavContent role={role} onNavigate={onNavigate} />
        </Suspense>
      </div>

      {/* User Profile Footer */}
      <div className="flex-shrink-0 border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-slate-800 leading-tight">{userName}</span>
            <span className="truncate text-[10px] text-slate-400 leading-tight">{userEmail}</span>
          </div>
          <span
            className={cn(
              "flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              roleBadgeColors[role]
            )}
          >
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}
