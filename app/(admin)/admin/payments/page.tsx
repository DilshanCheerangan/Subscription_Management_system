"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/lib/format";
import {
  getPaymentsAction,
  getPaymentFilterCustomersAction,
  PaymentFilterParams,
} from "@/app/actions/payments";
import { PaymentMethod } from "@prisma/client";
import {
  Wallet,
  Search,
  Calendar,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface PaymentRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  method: PaymentMethod;
  amount: number;
  paymentDate: string;
  note?: string | null;
  recordedByName: string;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  // Load customer filter options once
  useEffect(() => {
    getPaymentFilterCustomersAction().then((res) => {
      if (res.success && res.customers) {
        setCustomers(res.customers);
      }
    });
  }, []);

  // Fetch payments with active filters
  useEffect(() => {
    let active = true;

    const params: PaymentFilterParams = {
      search: searchTerm.trim() || undefined,
      method: methodFilter,
      customerId: customerFilter !== "ALL" ? customerFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 20,
    };

    getPaymentsAction(params)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setPayments(res.data.payments);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        }
      })
      .catch((err) => {
        console.error("Error loading payments:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, methodFilter, customerFilter, dateFrom, dateTo, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setLoading(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setMethodFilter("ALL");
    setCustomerFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setLoading(true);
  };

  const totalAmountOnPage = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Payment History"
        description="View and filter all recorded customer payments, transaction methods, and settlement references"
      />

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
            {/* Method filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value as PaymentMethod | "ALL");
                  setPage(1);
                  setLoading(true);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Methods</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Customer filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[200px]">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setPage(1);
                  setLoading(true);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-hidden truncate"
              >
                <option value="ALL">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                  setLoading(true);
                }}
                className="bg-transparent text-xs focus:outline-hidden"
                placeholder="From"
              />
              <span>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                  setLoading(true);
                }}
                className="bg-transparent text-xs focus:outline-hidden"
                placeholder="To"
              />
            </div>

            {(searchTerm || methodFilter !== "ALL" || customerFilter !== "ALL" || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Note / Reference</th>
                <th className="px-4 py-3">Recorded By</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading payment records...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-600 font-medium">No payments found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Payments recorded on confirmed invoices will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap text-xs">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/invoices/${p.invoiceId}`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs"
                      >
                        {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900 block truncate max-w-[140px] text-xs">
                        {p.customerName}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                        {p.customerEmail}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {p.method.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap text-xs">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">
                      {p.note || <span className="text-slate-300 italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {p.recordedByName}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/invoices/${p.invoiceId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Invoice <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Bar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Showing {total === 0 ? 0 : (page - 1) * 20 + 1} to{" "}
              {Math.min(page * 20, total)} of {total} payments
            </span>
            {payments.length > 0 && (
              <span className="font-semibold text-slate-700">
                Page Total: <span className="text-emerald-700">{formatCurrency(totalAmountOnPage)}</span>
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setLoading(true);
                }}
                className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
