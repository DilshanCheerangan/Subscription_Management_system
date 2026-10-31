"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  DiscountFormSheet,
  DiscountFormData,
  DiscountProductOption,
} from "@/components/config/discount-form-sheet";
import { DiscountStatusBadge } from "@/components/config/discount-status-badge";
import {
  getDiscountsAction,
  toggleDiscountActiveAction,
  deleteDiscountAction,
} from "@/app/actions/discounts";
import { getProductsAction } from "@/app/actions/products";
import { DiscountType, DiscountScope } from "@prisma/client";
import { DiscountStatusDerived } from "@/lib/discounts";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  Loader2,
  AlertCircle,
  Tag,
  Package,
} from "lucide-react";

interface DiscountItem {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minPurchase: number | null;
  minQuantity: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usedCount: number;
  scope: DiscountScope;
  active: boolean;
  derivedStatus: DiscountStatusDerived;
  products: { id: string; name: string; salesPrice: number }[];
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [products, setProducts] = useState<DiscountProductOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<DiscountType | "ALL">("ALL");
  const [scopeFilter, setScopeFilter] = useState<DiscountScope | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "true" | "false">("ALL");

  // Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountFormData | null>(null);

  // Row action menu dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN";

  // Fetch current user role and catalog products
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});

    getProductsAction({ limit: 100, active: true }).then((res) => {
      if (res.success && res.data) {
        setProducts(
          res.data.products.map((p) => ({
            id: p.id,
            name: p.name,
            salesPrice: p.salesPrice,
          }))
        );
      }
    });
  }, []);

  // Async data fetch without synchronous setState in effect
  useEffect(() => {
    let active = true;
    const activeBool = activeFilter === "ALL" ? "ALL" : activeFilter === "true";

    getDiscountsAction({
      search: searchTerm,
      type: typeFilter,
      scope: scopeFilter,
      active: activeBool,
      page,
      limit: 15,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setDiscounts(res.data.discounts);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        } else {
          setErrorMessage(res.error || "Failed to load discounts");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load discounts");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchTerm, typeFilter, scopeFilter, activeFilter, page, refreshTrigger]);

  const reload = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
    setLoading(true);
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setSheetOpen(true);
  };

  const handleEdit = (d: DiscountItem) => {
    setEditingDiscount({
      id: d.id,
      name: d.name,
      type: d.type,
      value: d.value,
      minPurchase: d.minPurchase,
      minQuantity: d.minQuantity,
      startDate: d.startDate,
      endDate: d.endDate,
      usageLimit: d.usageLimit,
      usedCount: d.usedCount,
      scope: d.scope,
      productIds: d.productIds,
      active: d.active,
    });
    setSheetOpen(true);
    setActiveDropdownId(null);
  };

  const handleToggleActive = async (d: DiscountItem) => {
    setActionLoadingId(d.id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await toggleDiscountActiveAction(d.id);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to change discount status");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  const handleDelete = async (d: DiscountItem) => {
    if (!confirm(`Are you sure you want to delete "${d.name}"?`)) {
      return;
    }

    setActionLoadingId(d.id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await deleteDiscountAction(d.id);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to delete discount");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Discounts & Coupons"
        description="Manage automated promotional rules, percentage cuts, and fixed vouchers for subscriptions and products."
        action={
          isAdmin ? (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Discount
            </button>
          ) : undefined
        }
      />

      {/* Staff View Notice */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Staff account: Discounts are in read-only mode. Only administrators can create or edit discount rules.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search discounts by code or name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as DiscountType | "ALL");
              setPage(1);
              setLoading(true);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed (₹)</option>
          </select>

          <select
            value={scopeFilter}
            onChange={(e) => {
              setScopeFilter(e.target.value as DiscountScope | "ALL");
              setPage(1);
              setLoading(true);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Scopes</option>
            <option value="SUBSCRIPTION">Whole Subscription</option>
            <option value="PRODUCT">Specific Products</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as "ALL" | "true" | "false");
              setPage(1);
              setLoading(true);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="true">Active Switch</option>
            <option value="false">Inactive Switch</option>
          </select>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Discount Name</th>
                <th className="px-6 py-3.5">Value</th>
                <th className="px-6 py-3.5">Scope</th>
                <th className="px-6 py-3.5">Validity Dates</th>
                <th className="px-6 py-3.5">Usage</th>
                <th className="px-6 py-3.5">Live Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading discount rules...
                  </td>
                </tr>
              ) : discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                        <Tag className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No discounts found</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || typeFilter !== "ALL" || scopeFilter !== "ALL"
                          ? "Try clearing filters to see all discounts."
                          : "Create your first promotional discount rule or coupon."}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={handleCreate}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-medium transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Discount
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-slate-900">{d.name}</span>
                        {(d.minPurchase || d.minQuantity) && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {d.minPurchase && `Min ₹${d.minPurchase.toFixed(0)} `}
                            {d.minQuantity && `Min ${d.minQuantity} qty`}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">
                        {d.type === "PERCENTAGE" ? `${d.value}%` : `₹${d.value.toFixed(2)}`}
                      </span>
                      <span className="text-xs text-slate-500 block">
                        {d.type === "PERCENTAGE" ? "Off subtotal" : "Flat deduction"}
                      </span>
                    </td>

                    {/* Scope */}
                    <td className="px-6 py-4">
                      {d.scope === "SUBSCRIPTION" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Subscription
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <Package className="h-3 w-3" />
                            {d.products.length} Product{d.products.length !== 1 ? "s" : ""}
                          </span>
                          {d.products.length > 0 && (
                            <div className="text-xs text-slate-500 max-w-xs truncate">
                              {d.products.map((p) => p.name).join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Validity Dates */}
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div>
                        <span className="font-medium text-slate-900">From:</span>{" "}
                        {new Date(d.startDate).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">Until:</span>{" "}
                        {new Date(d.endDate).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Usage */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{d.usedCount}</span>
                      <span className="text-xs text-slate-500">
                        {d.usageLimit !== null ? ` / ${d.usageLimit}` : " / ∞"}
                      </span>
                    </td>

                    {/* Live Status Badge */}
                    <td className="px-6 py-4">
                      <DiscountStatusBadge status={d.derivedStatus} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={actionLoadingId === d.id}
                            onClick={() =>
                              setActiveDropdownId(activeDropdownId === d.id ? null : d.id)
                            }
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdownId === d.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(d)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit Discount
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(d)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                  {d.active ? "Deactivate" : "Activate"}
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(d)}
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
              Showing {discounts.length} of {total} discount rules
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

      {/* Discount Form Sheet */}
      <DiscountFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        discount={editingDiscount}
        availableProducts={products}
        onSuccess={reload}
      />
    </div>
  );
}
