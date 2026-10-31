"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { getPortalSubscriptionsAction } from "@/app/actions/portal";
import {
  Repeat,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface PortalSubscriptionRow {
  id: string;
  number: string;
  planName: string;
  billingPeriod: string;
  price: number;
  status: string;
  startDate: string;
  expiryDate: string | null;
  nextInvoiceDate: string | null;
  paymentTermName: string;
  createdAt: string;
}

export default function PortalSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<PortalSubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getPortalSubscriptionsAction({ page, limit: 20 })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setSubscriptions(res.data.subscriptions);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subscriptions"
        description="View your recurring contracts, check service renewal dates, and manage permitted plan actions"
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Subscription #</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Billing Period</th>
                <th className="px-4 py-3">Next Invoice Date</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading your subscriptions...</span>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Repeat className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-600 font-medium">No active subscriptions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Contact support or your account manager to activate a new subscription plan.
                    </p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs"
                      >
                        {sub.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                      {sub.planName}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-slate-600">
                      {sub.billingPeriod.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {sub.nextInvoiceDate
                        ? new Date(sub.nextInvoiceDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {sub.expiryDate
                        ? new Date(sub.expiryDate).toLocaleDateString()
                        : "Ongoing"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-xs">
                      {formatCurrency(sub.price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/portal/subscriptions/${sub.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Manage <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} subscriptions
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setLoading(true);
                }}
                className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  setLoading(true);
                }}
                className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
