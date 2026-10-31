"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getSubscriptionsAction,
  getSubscriptionMetadataAction,
  transitionSubscriptionAction,
} from "@/app/actions/subscriptions";
import { SubscriptionStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/format";
import {
  Repeat,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Loader2,
  AlertCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface SubscriptionRow {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName: string;
  planBillingPeriod: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string | null;
  nextInvoiceDate: string | null;
  paymentTermName: string;
  lineCount: number;
  totalAmount: number;
  createdAt: string;
}

interface PlanFilterOption {
  id: string;
  name: string;
}

export default function SubscriptionsListPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlanFilterOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "ALL">("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Dropdown & Action State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load plans for filter
  useEffect(() => {
    getSubscriptionMetadataAction().then((res) => {
      if (res.success && res.data) {
        setPlans(res.data.plans.map((p) => ({ id: p.id, name: p.name })));
      }
    });
  }, []);

  // Async data fetch without synchronous setState in effect
  useEffect(() => {
    let active = true;

    getSubscriptionsAction({
      search: searchTerm,
      status: statusFilter,
      planId: planFilter !== "ALL" ? planFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 15,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setSubscriptions(res.data.subscriptions);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        } else {
          setErrorMessage(res.error || "Failed to load subscriptions");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load subscriptions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchTerm, statusFilter, planFilter, dateFrom, dateTo, page, refreshTrigger]);

  const reload = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
    setLoading(true);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as SubscriptionStatus | "ALL");
    setPage(1);
    setLoading(true);
  };

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlanFilter(e.target.value);
    setPage(1);
    setLoading(true);
  };

  const handleQuickTransition = async (id: string, target: SubscriptionStatus) => {
    setActionLoadingId(id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await transitionSubscriptionAction(id, target);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to update status");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Subscriptions & Quotations"
        description="Unified lifecycle management for customer subscriptions, quotations, renewals, and recurring billing."
        action={
          <Link
            href="/admin/subscriptions/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Subscription
          </Link>
        }
      />

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subscription # (SUB-00001), customer name, or email..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="QUOTATION">Quotation</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={handlePlanChange}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-medium text-slate-700 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Start Date Range:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
                setLoading(true);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:bg-white"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
                setLoading(true);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:bg-white"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                  setLoading(true);
                }}
                className="text-xs text-indigo-600 hover:underline ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Subscription #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Plan</th>
                <th className="px-6 py-3.5">Start Date</th>
                <th className="px-6 py-3.5">Next Invoice</th>
                <th className="px-6 py-3.5">Recurring Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                        <Repeat className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No subscriptions found</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || statusFilter !== "ALL" || planFilter !== "ALL" || dateFrom
                          ? "Try clearing filters to see all subscriptions."
                          : "Create your first customer subscription or quotation proposal."}
                      </p>
                      <Link
                        href="/admin/subscriptions/new"
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-medium transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Subscription
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Number */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/subscriptions/${sub.id}`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {sub.number}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {sub.customerName}
                        </span>
                        <span className="text-xs text-slate-400">{sub.customerEmail}</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-medium text-slate-800 block">{sub.planName}</span>
                        <span className="text-xs text-slate-500 capitalize">
                          {sub.planBillingPeriod.toLowerCase()}
                        </span>
                      </div>
                    </td>

                    {/* Start Date */}
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>

                    {/* Next Invoice */}
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {sub.nextInvoiceDate
                        ? new Date(sub.nextInvoiceDate).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(sub.totalAmount)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <StatusBadge status={sub.status} />
                    </td>

                    {/* Actions Menu */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          disabled={actionLoadingId === sub.id}
                          onClick={() =>
                            setActiveDropdownId(activeDropdownId === sub.id ? null : sub.id)
                          }
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeDropdownId === sub.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveDropdownId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                              <Link
                                href={`/admin/subscriptions/${sub.id}`}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Details & Stepper
                              </Link>

                              {(sub.status === SubscriptionStatus.DRAFT ||
                                sub.status === SubscriptionStatus.QUOTATION) && (
                                <Link
                                  href={`/admin/subscriptions/${sub.id}/edit`}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit Subscription
                                </Link>
                              )}

                              <div className="border-t border-slate-100 my-1" />

                              {/* Quick Transitions */}
                              {sub.status === SubscriptionStatus.DRAFT && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickTransition(sub.id, SubscriptionStatus.QUOTATION)
                                  }
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-blue-600 font-medium"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Send Quotation
                                </button>
                              )}

                              {sub.status === SubscriptionStatus.QUOTATION && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickTransition(sub.id, SubscriptionStatus.CONFIRMED)
                                  }
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-indigo-600 font-medium"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Confirm Quotation
                                </button>
                              )}

                              {sub.status === SubscriptionStatus.CONFIRMED && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickTransition(sub.id, SubscriptionStatus.ACTIVE)
                                  }
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-600 font-medium"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Activate Subscription
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {subscriptions.length} of {total} subscriptions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setLoading(true);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  setLoading(true);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
