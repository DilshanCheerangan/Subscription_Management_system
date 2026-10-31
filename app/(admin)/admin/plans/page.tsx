"use client";

import React, { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { BillingPeriod } from "@prisma/client";
import {
  getPlansAction,
  deletePlanAction,
  togglePlanActiveAction,
} from "@/app/actions/plans";
import { getProductsAction } from "@/app/actions/products";
import { PlanFormSheet, PlanFormData, SimpleProductOption } from "@/components/catalog/plan-form-sheet";
import { PlanStatusBadge } from "@/components/catalog/plan-status-badge";
import {
  Layers,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Link2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface PlanItem {
  id: string;
  name: string;
  price: number;
  billingPeriod: BillingPeriod;
  minQuantity: number;
  availableFrom?: string | null;
  availableTo?: string | null;
  derivedStatus: "UPCOMING" | "AVAILABLE" | "ENDED";
  linkedProductId?: string | null;
  linkedProduct?: {
    id: string;
    name: string;
    salesPrice: number;
    type: string;
  } | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
  active: boolean;
  createdAt: string;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [products, setProducts] = useState<SimpleProductOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState<BillingPeriod | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanFormData | null>(null);

  const [, startTransition] = useTransition();

  // Load session role
  useEffect(() => {
    async function checkRole() {
      try {
        const authRes = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
        if (authRes && authRes.ok) {
          const authData = await authRes.json();
          if (authData?.user?.role) {
            setUserRole(authData.user.role);
          }
        }
      } catch {
        // Default to ADMIN for admin route
      }
    }
    checkRole();
  }, []);

  // Fetch available products for linked product dropdown
  useEffect(() => {
    let active = true;
    getProductsAction({ active: true, limit: 100 })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setProducts(
            res.data.products.map((p) => ({
              id: p.id,
              name: p.name,
              salesPrice: p.salesPrice,
              type: p.type,
            }))
          );
        }
      })
      .catch((err) => console.error(err));

    return () => {
      active = false;
    };
  }, []);

  // Fetch plans asynchronously
  useEffect(() => {
    let active = true;
    const activeParam =
      activeFilter === "ACTIVE" ? true : activeFilter === "INACTIVE" ? false : "ALL";

    getPlansAction({
      search,
      billingPeriod: billingFilter,
      active: activeParam,
      page,
      limit: 10,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setPlans(res.data.plans);
          setTotal(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
        } else {
          setErrorMessage(res.error || "Failed to load plans");
        }
      })
      .catch(() => {
        if (active) setErrorMessage("Network error loading plans");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, billingFilter, activeFilter, page, refreshIndex]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  function handleCreateClick() {
    setEditingPlan(null);
    setSheetOpen(true);
  }

  function handleEditClick(plan: PlanItem) {
    setEditingPlan({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      billingPeriod: plan.billingPeriod,
      minQuantity: plan.minQuantity,
      availableFrom: plan.availableFrom,
      availableTo: plan.availableTo,
      linkedProductId: plan.linkedProductId,
      autoClose: plan.autoClose,
      closable: plan.closable,
      pausable: plan.pausable,
      renewable: plan.renewable,
      active: plan.active,
    });
    setSheetOpen(true);
  }

  async function handleDeleteClick(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete or deactivate plan "${name}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deletePlanAction(id);
      if (res.success) {
        showToast(res.message || "Plan removed successfully.");
        setRefreshIndex((i) => i + 1);
      } else {
        setErrorMessage(res.error || "Failed to delete plan.");
      }
    });
  }

  async function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const res = await togglePlanActiveAction(id, !current);
      if (res.success) {
        showToast(`Plan ${!current ? "activated" : "deactivated"}.`);
        setRefreshIndex((i) => i + 1);
      } else {
        setErrorMessage(res.error || "Failed to update status.");
      }
    });
  }

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Staff Read-Only Banner */}
      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 flex items-center gap-2.5 text-xs text-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> As a STAFF member, you can browse plans and view billing cycles. Plan creation and configuration are reserved for Administrators.
          </span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Subscription Plans"
        description="Define recurring billing intervals, minimum order quantities, schedule windows, and subscription lifecycle rules."
        action={
          isAdmin ? (
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Plan
            </button>
          ) : undefined
        }
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search plans by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Cycle:</span>
          </div>
          <select
            value={billingFilter}
            onChange={(e) => {
              setBillingFilter(e.target.value as BillingPeriod | "ALL");
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Billing Cycles</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="DAILY">Daily</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Archived Only</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm">Loading subscription plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No subscription plans found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {search || billingFilter !== "ALL" || activeFilter !== "ALL"
                ? "No plans match your selected criteria."
                : "Create recurring billing plans to start issuing subscriptions and quotations."}
            </p>
            {isAdmin && (
              <div className="mt-6">
                <button
                  onClick={handleCreateClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Plan
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Plan Name</th>
                  <th className="px-6 py-3.5">Billing Cycle</th>
                  <th className="px-6 py-3.5 text-right">Price</th>
                  <th className="px-6 py-3.5 text-center">Min Qty</th>
                  <th className="px-6 py-3.5">Linked Product</th>
                  <th className="px-6 py-3.5">Availability</th>
                  <th className="px-6 py-3.5">Lifecycle Flags</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{plan.name}</div>
                      {(plan.availableFrom || plan.availableTo) && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {plan.availableFrom ? formatDate(plan.availableFrom) : "Open"} &rarr;{" "}
                          {plan.availableTo ? formatDate(plan.availableTo) : "Open"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
                        {plan.billingPeriod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(plan.price)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-slate-600">
                      {plan.minQuantity}
                    </td>
                    <td className="px-6 py-4">
                      {plan.linkedProduct ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          <Link2 className="h-3 w-3 text-indigo-500" />
                          <span>{plan.linkedProduct.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None (General)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <PlanStatusBadge status={plan.derivedStatus} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {plan.autoClose && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                            AutoClose
                          </span>
                        )}
                        {plan.closable && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            Closable
                          </span>
                        )}
                        {plan.pausable && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            Pausable
                          </span>
                        )}
                        {plan.renewable && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Renewable
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(plan.id, plan.active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            plan.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle status"
                        >
                          {plan.active ? "Active" : "Archived"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            plan.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {plan.active ? "Active" : "Archived"}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(plan)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                            title="Edit plan & flags"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(plan.id, plan.name)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete or deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {plans.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * 10 + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(page * 10, total)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{total}</span> plans
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Form Sheet */}
      {isAdmin && (
        <PlanFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          plan={editingPlan}
          products={products}
          onSuccess={() => {
            showToast(
              editingPlan
                ? "Plan updated successfully."
                : "New subscription plan created successfully."
            );
            setRefreshIndex((i) => i + 1);
          }}
        />
      )}
    </div>
  );
}
