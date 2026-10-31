"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import {
  getInvoicesAction,
  confirmInvoiceAction,
  sendInvoiceAction,
  cancelInvoiceAction,
} from "@/app/actions/invoices";
import { InvoiceStatus } from "@prisma/client";
import {
  Receipt,
  PlayCircle,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Send,
  Printer,
  XCircle,
  MoreVertical,
  Loader2,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface InvoiceRow {
  id: string;
  number: string;
  subscriptionId: string;
  subscriptionNumber: string;
  planName: string;
  billingPeriod: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: InvoiceStatus;
  isOverdue: boolean;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  lineCount: number;
  paymentCount: number;
  createdAt: string;
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL" | "OVERDUE" | "OUTSTANDING">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [counts, setCounts] = useState<{
    all: number;
    outstanding: number;
    paid: number;
    overdue: number;
  }>({ all: 0, outstanding: 0, paid: 0, overdue: 0 });

  // Action states
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;

    getInvoicesAction({
      search: searchTerm,
      status: statusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setInvoices(res.data.invoices);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
          if (res.data.counts) {
            setCounts(res.data.counts);
          }
        } else {
          setMessage({ type: "error", text: res.error || "Failed to load invoices" });
        }
      })
      .catch((err) => {
        if (!active) return;
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Error fetching invoices",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, statusFilter, refreshTrigger, searchTerm, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setLoading(true);
    setRefreshTrigger((t) => t + 1);
  };

  const handleConfirm = async (id: string) => {
    setActionLoadingId(id);
    const res = await confirmInvoiceAction(id);
    if (res.success) {
      setMessage({ type: "success", text: "Invoice confirmed successfully" });
      setRefreshTrigger((t) => t + 1);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to confirm invoice" });
    }
    setActionLoadingId(null);
    setActiveDropdownId(null);
  };

  const handleSend = async (id: string) => {
    setActionLoadingId(id);
    const res = await sendInvoiceAction(id);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Invoice email sent successfully" });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to send invoice email" });
    }
    setActionLoadingId(null);
    setActiveDropdownId(null);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this invoice?")) return;
    setActionLoadingId(id);
    const res = await cancelInvoiceAction(id);
    if (res.success) {
      setMessage({ type: "success", text: "Invoice cancelled successfully" });
      setRefreshTrigger((t) => t + 1);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to cancel invoice" });
    }
    setActionLoadingId(null);
    setActiveDropdownId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Invoices & Receivables"
          description="Manage automated billing statements, track due dates, and monitor payment collections."
        />

        <Link
          href="/admin/billing-run"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
        >
          <PlayCircle className="h-4 w-4" />
          Run Billing Engine
        </Link>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Filter Tabs with Live Count Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: "All", value: "ALL", count: counts.all, badgeClass: "bg-slate-100 text-slate-700" },
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
                setStatusFilter(tab.value as InvoiceStatus | "ALL" | "OVERDUE" | "OUTSTANDING");
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice # (e.g. INV-00001), customer name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as InvoiceStatus | "ALL" | "OVERDUE" | "OUTSTANDING");
                  setPage(1);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="OUTSTANDING">Outstanding</option>
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="OVERDUE">Overdue (Derived)</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs focus:outline-hidden"
                placeholder="From"
              />
              <span>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs focus:outline-hidden"
                placeholder="To"
              />
            </div>

            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Subscription</th>
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
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-600 font-medium">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Run the billing engine to automatically generate invoices for due subscriptions.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 block truncate max-w-[140px]">
                        {inv.customerName}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                        {inv.customerEmail}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/subscriptions/${inv.subscriptionId}`}
                        className="text-xs font-medium text-slate-700 hover:text-indigo-600 block"
                      >
                        {inv.subscriptionNumber}
                      </Link>
                      <span className="text-[11px] text-slate-400">
                        {inv.planName} ({inv.billingPeriod.toLowerCase()})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{new Date(inv.periodStart).toLocaleDateString()}</div>
                      <span className="text-slate-400">to {new Date(inv.periodEnd).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          inv.isOverdue ? "text-rose-600 font-bold flex items-center gap-1" : "text-slate-700"
                        }
                      >
                        {inv.isOverdue && <AlertTriangle className="h-3 w-3" />}
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(inv.total)}
                      {inv.discountTotal > 0 && (
                        <span className="block text-[10px] text-emerald-600 font-normal">
                          -{formatCurrency(inv.discountTotal)} disc
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {inv.balance === 0 ? (
                        <span className="text-emerald-600 font-semibold">Paid in full</span>
                      ) : (
                        <span className="text-slate-900 font-semibold">{formatCurrency(inv.balance)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.isOverdue ? (
                        <StatusBadge status="OVERDUE" label="Overdue" size="sm" />
                      ) : (
                        <StatusBadge status={inv.status} size="sm" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
                          title="View Invoice Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id)
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Dropdown menu */}
                      {activeDropdownId === inv.id && (
                        <div className="absolute right-4 top-10 z-20 w-44 rounded-lg bg-white p-1 shadow-lg border border-slate-200 text-xs">
                          {inv.status === "DRAFT" && (
                            <button
                              type="button"
                              disabled={actionLoadingId === inv.id}
                              onClick={() => handleConfirm(inv.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-indigo-600 hover:bg-indigo-50 rounded-md font-medium"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Confirm Invoice
                            </button>
                          )}

                          {inv.status !== "CANCELLED" && (
                            <button
                              type="button"
                              disabled={actionLoadingId === inv.id}
                              onClick={() => handleSend(inv.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 rounded-md"
                            >
                              <Send className="h-3.5 w-3.5 text-slate-400" />
                              Send Email Notice
                            </button>
                          )}

                          <Link
                            href={`/admin/invoices/${inv.id}/print`}
                            target="_blank"
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 rounded-md"
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-400" />
                            Print Friendly
                          </Link>

                          {(inv.status === "DRAFT" || inv.status === "CONFIRMED") && inv.amountPaid === 0 && (
                            <button
                              type="button"
                              disabled={actionLoadingId === inv.id}
                              onClick={() => handleCancel(inv.id)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50 rounded-md font-medium border-t border-slate-100 mt-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel Invoice
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <div>
            Showing <strong>{invoices.length}</strong> of <strong>{total}</strong> invoices
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
