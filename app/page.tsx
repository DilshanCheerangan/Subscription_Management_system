"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Plus,
  Play,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const activeDate = "31 October 2026, 09:45";

  const allStatuses: StatusType[] = [
    "DRAFT",
    "QUOTATION",
    "CONFIRMED",
    "ACTIVE",
    "PAUSED",
    "CLOSED",
    "PAID",
    "OVERDUE",
    "CANCELLED",
  ];

  const metrics = [
    {
      title: "Active Subscriptions",
      value: "2,450",
      change: "+12.5% from last month",
      icon: CreditCard,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "Monthly Recurring Revenue",
      value: formatCurrency(1850000),
      change: "+8.2% from last month",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Collected Revenue",
      value: formatCurrency(1620000),
      change: "Current billing period",
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Overdue Receivables",
      value: formatCurrency(84500),
      change: "7 invoices requiring action",
      icon: AlertCircle,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <AppShell role="ADMIN" userName="System Administrator" userEmail="admin@brightloop.test">
      <PageHeader
        title="Finance & Subscription Overview"
        description="Monitor real-time subscription lifecycle, automated invoicing runs, and revenue health."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Play className="h-4 w-4 text-indigo-600" />
              <span>Run Billing Engine</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Subscription</span>
            </button>
          </div>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {metric.title}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {metric.value}
                </div>
                <div className="mt-1 flex items-center text-xs text-slate-500 font-medium">
                  <span>{metric.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: System Status & Design System Tokens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Design System Status Badge Matrix */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Design System Status Badges
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized status token palette across quotations, subscriptions, and invoices.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> MASTER §6
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5 py-2">
            {allStatuses.map((st) => (
              <StatusBadge key={st} status={st} size="md" />
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Currency & Date Engine Ready
            </div>
            <p>
              Default Currency: <strong className="text-slate-800">{formatCurrency(12499.5)}</strong> (INR half-up rounded)
            </p>
            <p>
              Active Date: <strong className="text-slate-800">{activeDate}</strong>
            </p>
          </div>
        </div>

        {/* Scaffold Health & Stack Verification */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">
            Phase 0 Stack Checklist
          </h2>
          <ul className="space-y-3 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">
                ✓
              </span>
              <span>Next.js App Router (TypeScript Strict)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">
                ✓
              </span>
              <span>Tailwind CSS + Neutral Slate & Indigo Theme</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">
                ✓
              </span>
              <span>Prisma configured with Supabase PgBouncer</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">
                ✓
              </span>
              <span>Decimal arithmetic & half-up rounding (lib/money.ts)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-[10px]">
                ✓
              </span>
              <span>App Shell: Fixed Sidebar, Topbar & Stepper Tokens</span>
            </li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
