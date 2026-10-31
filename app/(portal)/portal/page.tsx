"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { getPortalDashboardAction } from "@/app/actions/portal";
import {
  Repeat,
  Receipt,
  CreditCard,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface DashboardData {
  customerName: string;
  customerEmail: string;
  activeSubscriptionsCount: number;
  nextBillingDate: string | null;
  totalAmountDue: number;
  overdueCount: number;
  recentSubscriptions: Array<{
    id: string;
    number: string;
    planName: string;
    billingPeriod: string;
    price: number;
    status: string;
    startDate: string;
    expiryDate: string | null;
    nextInvoiceDate: string | null;
  }>;
  recentInvoices: Array<{
    id: string;
    number: string;
    subscriptionNumber: string;
    planName: string;
    dueDate: string;
    total: number;
    amountPaid: number;
    balance: number;
    status: string;
    isOverdue: boolean;
  }>;
}

export default function CustomerPortalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPortalDashboardAction()
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data as DashboardData);
        } else {
          setError(res.error || "Failed to load dashboard");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error loading dashboard");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm font-medium">Loading your portal dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || "Could not load customer dashboard."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${data.customerName}`}
        description="Monitor your active subscriptions, review upcoming billing dates, and manage invoices."
        badge={
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3 w-3" /> Customer Verified
          </span>
        }
      />

      {/* Metrics Row: 3 Highlight Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Active Subscriptions Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Subscriptions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {data.activeSubscriptionsCount}{" "}
              <span className="text-sm font-normal text-slate-500">
                {data.activeSubscriptionsCount === 1 ? "subscription" : "subscriptions"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {data.activeSubscriptionsCount > 0
                ? "Active and renewing automatically"
                : "No active plans running"}
            </p>
          </div>
        </div>

        {/* Next Billing Date Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Next Billing Date
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {data.nextBillingDate
                ? new Date(data.nextBillingDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "None Scheduled"}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {data.nextBillingDate
                ? "Automatic invoice generation on scheduled date"
                : "No pending billing cycles"}
            </p>
          </div>
        </div>

        {/* Amount Due Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount Due
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                data.totalAmountDue > 0
                  ? data.overdueCount > 0
                    ? "bg-rose-50 text-rose-600"
                    : "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold ${
                data.totalAmountDue > 0
                  ? data.overdueCount > 0
                    ? "text-rose-600"
                    : "text-amber-700"
                  : "text-slate-900"
              }`}
            >
              {formatCurrency(data.totalAmountDue)}
            </div>
            <p className="mt-1 text-xs">
              {data.totalAmountDue === 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> All invoices settled
                </span>
              ) : data.overdueCount > 0 ? (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {data.overdueCount} overdue invoice(s)
                </span>
              ) : (
                <span className="text-amber-700 font-medium">Payment pending on confirmed invoice</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: My Subscriptions & Recent Invoices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Subscriptions Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="h-4 w-4 text-indigo-600" />
              My Subscriptions
            </h2>
            <Link
              href="/portal/subscriptions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {data.recentSubscriptions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No subscriptions found under your account.
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <Link
                      href={`/portal/subscriptions/${sub.id}`}
                      className="font-bold text-sm text-indigo-600 hover:underline"
                    >
                      {sub.planName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {sub.number} • {sub.billingPeriod.toLowerCase()} billing
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <StatusBadge status={sub.status} size="sm" />
                    <span className="text-xs font-semibold text-slate-900">
                      {formatCurrency(sub.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              Recent Invoices
            </h2>
            <Link
              href="/portal/invoices"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {data.recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No invoices generated yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentInvoices.map((inv) => {
                const badgeStatus =
                  inv.status === "PAID"
                    ? "PAID"
                    : inv.isOverdue
                    ? "OVERDUE"
                    : "CONFIRMED";

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/portal/invoices/${inv.id}`}
                        className="font-bold text-sm text-indigo-600 hover:underline"
                      >
                        {inv.number}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Due: {new Date(inv.dueDate).toLocaleDateString()} • {inv.planName}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <StatusBadge status={badgeStatus} size="sm" />
                      <span className="text-xs font-semibold text-slate-900">
                        {formatCurrency(inv.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
