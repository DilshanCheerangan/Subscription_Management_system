"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  PaymentTermFormSheet,
  PaymentTermFormData,
} from "@/components/config/payment-term-form-sheet";
import {
  getPaymentTermsAction,
  togglePaymentTermActiveAction,
  deletePaymentTermAction,
} from "@/app/actions/payment-terms";
import {
  CalendarClock,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface PaymentTermItem {
  id: string;
  name: string;
  days: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentTermsPage() {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "true" | "false">("ALL");

  // Modal / Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTermFormData | null>(null);

  // Row action menu dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN";

  // Fetch current user role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  // Async data fetch without synchronous setState in effect
  useEffect(() => {
    let active = true;
    const activeBool = activeFilter === "ALL" ? "ALL" : activeFilter === "true";

    getPaymentTermsAction({
      search: searchTerm,
      active: activeBool,
      page,
      limit: 15,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setPaymentTerms(res.data.paymentTerms);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        } else {
          setErrorMessage(res.error || "Failed to load payment terms");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load payment terms");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchTerm, activeFilter, page, refreshTrigger]);

  const reload = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
    setLoading(true);
  };

  const handleActiveFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveFilter(e.target.value as "ALL" | "true" | "false");
    setPage(1);
    setLoading(true);
  };

  const handleCreate = () => {
    setEditingTerm(null);
    setSheetOpen(true);
  };

  const handleEdit = (term: PaymentTermItem) => {
    setEditingTerm({
      id: term.id,
      name: term.name,
      days: term.days,
      active: term.active,
    });
    setSheetOpen(true);
    setActiveDropdownId(null);
  };

  const handleToggleActive = async (term: PaymentTermItem) => {
    setActionLoadingId(term.id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await togglePaymentTermActiveAction(term.id);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to change payment term status");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  const handleDelete = async (term: PaymentTermItem) => {
    if (!confirm(`Are you sure you want to delete "${term.name}"?`)) {
      return;
    }

    setActionLoadingId(term.id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await deletePaymentTermAction(term.id);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to delete payment term");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Payment Terms"
        description="Define invoice due date schedules and grace periods (Immediate, 15 Days, 30 Days)."
        action={
          isAdmin ? (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Payment Term
            </button>
          ) : undefined
        }
      />

      {/* Staff View Notice */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Staff account: Payment terms are in read-only mode. Only administrators can configure terms.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payment terms..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={activeFilter}
              onChange={handleActiveFilterChange}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Terms Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Term Name</th>
                <th className="px-6 py-3.5">Due Days</th>
                <th className="px-6 py-3.5">Calculation Rule</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading payment terms...
                  </td>
                </tr>
              ) : paymentTerms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No payment terms found</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || activeFilter !== "ALL"
                          ? "Try clearing filters to see all payment terms."
                          : "Define your first invoice due date schedule."}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={handleCreate}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-medium transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Payment Term
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paymentTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{term.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                        {term.days} {term.days === 1 ? "day" : "days"}
                        {term.days === 0 && (
                          <span className="ml-1 text-xs text-indigo-600 font-normal">
                            (Immediate)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {term.days === 0
                        ? "Due immediately on invoice creation date"
                        : `Invoice due date = Invoice date + ${term.days} days`}
                    </td>
                    <td className="px-6 py-4">
                      {term.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={actionLoadingId === term.id}
                            onClick={() =>
                              setActiveDropdownId(activeDropdownId === term.id ? null : term.id)
                            }
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdownId === term.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(term)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit Term
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(term)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                  {term.active ? "Deactivate" : "Activate"}
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(term)}
                                  className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Read only</span>
                      )}
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
              Showing {paymentTerms.length} of {total} payment terms
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

      {/* Payment Term Form Sheet */}
      <PaymentTermFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        paymentTerm={editingTerm}
        onSuccess={reload}
      />
    </div>
  );
}
