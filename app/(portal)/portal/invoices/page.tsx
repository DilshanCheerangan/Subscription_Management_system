"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { getPortalInvoicesAction } from "@/app/actions/portal";
import {
  Receipt,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface PortalInvoiceRow {
  id: string;
  number: string;
  subscriptionNumber: string;
  planName: string;
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  status: string;
  isOverdue: boolean;
  createdAt: string;
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<PortalInvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "OUTSTANDING" | "OVERDUE">("ALL");
  const [counts, setCounts] = useState({ all: 0, outstanding: 0, paid: 0, overdue: 0 });

  useEffect(() => {
    let active = true;

    getPortalInvoicesAction({ status: statusFilter, page, limit: 20 })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setInvoices(res.data.invoices);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
          if (res.data.counts) {
            setCounts(res.data.counts);
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Invoices"
        description="Review billing statements, verify payment settlements, and print tax receipts"
      />

      {/* Quick Filter Tabs with Live Count Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: "All Invoices", value: "ALL", count: counts.all, badgeClass: "bg-slate-100 text-slate-700" },
          { label: "Outstanding", value: "OUTSTANDING", count: counts.outstanding, badgeClass: "bg-amber-100 text-amber-800" },
          { label: "Paid", value: "PAID", count: counts.paid, badgeClass: "bg-emerald-100 text-emerald-800" },
          { label: "Overdue", value: "OVERDUE", count: counts.overdue, badgeClass: "bg-rose-100 text-rose-800" },
        ].map((tab) => {
          const isSelected = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value as "ALL" | "PAID" | "OUTSTANDING" | "OVERDUE");
                setPage(1);
                setLoading(true);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? "bg-slate-700 text-white" : tab.badgeClass
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Plan / Subscription</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Amount Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading your invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-600 font-medium">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Billing statements will appear here as billing cycles complete.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const badgeStatus =
                    inv.status === "PAID"
                      ? "PAID"
                      : inv.isOverdue
                      ? "OVERDUE"
                      : "CONFIRMED";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs"
                        >
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block text-xs">
                          {inv.planName}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {inv.subscriptionNumber} • {inv.billingPeriod.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{new Date(inv.periodStart).toLocaleDateString()}</div>
                        <span className="text-slate-400">to {new Date(inv.periodEnd).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={
                            inv.isOverdue
                              ? "font-bold text-rose-600"
                              : "text-slate-700 font-medium"
                          }
                        >
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-xs">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs">
                        <span
                          className={
                            inv.balance > 0
                              ? inv.isOverdue
                                ? "text-rose-600 font-bold"
                                : "text-amber-700 font-bold"
                              : "text-slate-400"
                          }
                        >
                          {formatCurrency(inv.balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={badgeStatus} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        <Link
                          href={`/portal/invoices/${inv.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/portal/invoices/${inv.id}/print`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:underline"
                        >
                          <Printer className="h-3 w-3" /> Print
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} invoices
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
