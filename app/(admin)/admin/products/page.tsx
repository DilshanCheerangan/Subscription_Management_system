"use client";

import React, { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/lib/format";
import { ProductType } from "@prisma/client";
import {
  getProductsAction,
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/actions/products";
import { ProductFormSheet, ProductFormData } from "@/components/catalog/product-form-sheet";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Tag,
  AlertCircle,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  marginAmount: number;
  marginPercent: number;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  variantsCount: number;
  variants: {
    id: string;
    attributeName: string;
    attributeValue: string;
    extraPrice: number;
  }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);

  const [, startTransition] = useTransition();

  // Initial load role
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

  // Fetch products asynchronously
  useEffect(() => {
    let active = true;
    const activeParam =
      activeFilter === "ACTIVE" ? true : activeFilter === "INACTIVE" ? false : "ALL";

    getProductsAction({
      search,
      type: typeFilter,
      active: activeParam,
      page,
      limit: 10,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setProducts(res.data.products);
          setTotal(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
        } else {
          setErrorMessage(res.error || "Failed to load products");
        }
      })
      .catch(() => {
        if (active) setErrorMessage("Network error loading products");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, typeFilter, activeFilter, page, refreshIndex]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  function handleCreateClick() {
    setEditingProduct(null);
    setSheetOpen(true);
  }

  function handleEditClick(product: ProductItem) {
    setEditingProduct({
      id: product.id,
      name: product.name,
      type: product.type,
      salesPrice: product.salesPrice,
      costPrice: product.costPrice,
      notes: product.notes,
      active: product.active,
      variants: product.variants || [],
    });
    setSheetOpen(true);
  }

  async function handleDeleteClick(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${name}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (res.success) {
        showToast(res.message || "Product removed successfully.");
        setRefreshIndex((i) => i + 1);
      } else {
        setErrorMessage(res.error || "Failed to delete product.");
      }
    });
  }

  async function handleToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleProductActiveAction(id, !current);
      if (res.success) {
        showToast(`Product ${!current ? "activated" : "deactivated"}.`);
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
            <strong>Read-Only Mode:</strong> As a STAFF member, you can browse products and check pricing variants. Creation and editing are restricted to Administrators.
          </span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Products & Catalog"
        description="Configure software licenses, billable services, hardware goods, and variant price add-ons."
        action={
          isAdmin ? (
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Product
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
            placeholder="Search products by name..."
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
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as ProductType | "ALL");
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">All Types</option>
            <option value="SOFTWARE">Software (SaaS)</option>
            <option value="SERVICE">Service</option>
            <option value="GOODS">Goods / Hardware</option>
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
            <p className="text-sm">Loading product catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No products found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {search || typeFilter !== "ALL" || activeFilter !== "ALL"
                ? "No products match the selected search and filter criteria."
                : "Your catalog is empty. Start by adding your first product with pricing and variants."}
            </p>
            {isAdmin && (
              <div className="mt-6">
                <button
                  onClick={handleCreateClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Sales Price</th>
                  <th className="px-6 py-3.5 text-right">Cost Price</th>
                  <th className="px-6 py-3.5 text-right">Gross Margin</th>
                  <th className="px-6 py-3.5">Variants</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isAdmin && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isNegativeMargin = p.marginAmount < 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        {p.notes && (
                          <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {p.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {p.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(p.salesPrice)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className={`font-mono text-xs font-semibold ${
                            isNegativeMargin ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {formatCurrency(p.marginAmount)}
                        </div>
                        <div
                          className={`text-[11px] ${
                            isNegativeMargin ? "text-rose-500" : "text-slate-400"
                          }`}
                        >
                          ({p.marginPercent.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.variantsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-medium">
                            <Tag className="h-3 w-3" />
                            {p.variantsCount} {p.variantsCount === 1 ? "variant" : "variants"}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Base only</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p.id, p.active)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                              p.active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Click to toggle status"
                          >
                            {p.active ? "Active" : "Archived"}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {p.active ? "Active" : "Archived"}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                              title="Edit product & variants"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(p.id, p.name)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete or deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {products.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * 10 + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(page * 10, total)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{total}</span> products
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
        <ProductFormSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          product={editingProduct}
          onSuccess={() => {
            showToast(
              editingProduct
                ? "Product updated successfully."
                : "New product created successfully."
            );
            setRefreshIndex((i) => i + 1);
          }}
        />
      )}
    </div>
  );
}
