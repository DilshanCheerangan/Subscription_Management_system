"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { CreditCard, Repeat, Receipt, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";

export default function CustomerPortalHomePage() {
  const activeDate = "31 October 2026";

  return (
    <AppShell role="CUSTOMER" userName="Customer Account" userEmail="customer@client.test">
      <PageHeader
        title="Customer Subscription Portal"
        description="View your active plans, review billing invoices, and manage subscription renewals."
        badge={
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="h-3 w-3" /> Customer Verified
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Active Plans</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Repeat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">1 Plan</div>
            <p className="mt-1 text-xs text-slate-500">Enterprise SaaS Platform</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Next Billing Date</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{activeDate}</div>
            <p className="mt-1 text-xs text-slate-500">Auto-renews monthly</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Outstanding</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(0)}</div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">All invoices settled</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Repeat className="h-4 w-4 text-indigo-600" /> My Subscriptions
            </h2>
            <Link
              href="/portal/subscriptions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div>
                <p className="font-semibold text-sm text-slate-900">Brightloop Pro Platform</p>
                <p className="text-xs text-slate-500">Plan: Enterprise Yearly • SUB-00001</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <StatusBadge status="ACTIVE" size="sm" />
                <span className="text-xs font-semibold text-slate-800">{formatCurrency(48000)}/yr</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" /> Recent Invoices
            </h2>
            <Link
              href="/portal/invoices"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div>
                <p className="font-semibold text-sm text-slate-900">INV-00001</p>
                <p className="text-xs text-slate-500">Period: 01 Oct 2026 - 31 Oct 2026</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <StatusBadge status="PAID" size="sm" />
                <span className="text-xs font-semibold text-slate-800">{formatCurrency(48000)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
