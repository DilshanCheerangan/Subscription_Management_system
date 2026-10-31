"use client";

import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers,
} from "lucide-react";

export function DashboardContent() {
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
    <div className="space-y-6">
      <PageHeader
        title="Finance & Subscription Overview"
        description="Monitor real-time subscription lifecycle, automated invoicing runs, and revenue health."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Package className="h-4 w-4 text-indigo-600" />
              <span>Products</span>
            </Link>
            <Link
              href="/admin/plans"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-indigo-700 transition-colors"
            >
              <Layers className="h-4 w-4" />
              <span>Plans</span>
            </Link>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="mt-6 rounded-lg bg-slate-50 p-4 border border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Architecture & Lifecycle Guarantees
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Line-level rounding half-up via single money helper</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Overdue is strictly derived, never persisted in database</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Idempotent billing run with unique period constraints</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Role-aware three-tier access control (Admin, Staff, Customer)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* System & Engine Checklist */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-900">Stack Verification</h2>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-medium">Framework</span>
                <span className="text-xs font-semibold text-slate-900">Next.js 16 (App Router)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-medium">Database ORM</span>
                <span className="text-xs font-semibold text-slate-900">Prisma (PostgreSQL)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-medium">Session & Auth</span>
                <span className="text-xs font-semibold text-slate-900">jose JWT (httpOnly)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-medium">Validation</span>
                <span className="text-xs font-semibold text-slate-900">Zod Strict Schemas</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-medium">Design Tokens</span>
                <span className="text-xs font-semibold text-slate-900">Tailwind + Inter + Slate</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
            System active: {activeDate}
          </div>
        </div>
      </div>
    </div>
  );
}
