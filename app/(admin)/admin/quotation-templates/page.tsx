"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  QuotationTemplateFormSheet,
  QuotationTemplateFormData,
  TemplateProductOption,
  TemplatePlanOption,
  TemplateTaxOption,
} from "@/components/config/quotation-template-form-sheet";
import {
  getQuotationTemplatesAction,
  deleteQuotationTemplateAction,
  duplicateQuotationTemplateAction,
  getTemplateMetadataAction,
} from "@/app/actions/quotation-templates";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";

interface TemplateLineDisplay {
  id: string;
  productId: string;
  productName: string;
  productSalesPrice: number;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  taxId?: string | null;
  taxName?: string | null;
  taxPercentage: number;
}

interface TemplateItem {
  id: string;
  name: string;
  validityDays: number;
  planId?: string | null;
  plan?: {
    id: string;
    name: string;
    billingPeriod: string;
    price: number;
  } | null;
  lines: TemplateLineDisplay[];
  createdAt: string;
  updatedAt: string;
}

export default function QuotationTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [products, setProducts] = useState<TemplateProductOption[]>([]);
  const [plans, setPlans] = useState<TemplatePlanOption[]>([]);
  const [taxes, setTaxes] = useState<TemplateTaxOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("ADMIN");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  // Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplateFormData | null>(null);

  // Dropdown & Action Loading State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});

    getTemplateMetadataAction().then((res) => {
      if (res.success && res.data) {
        setProducts(res.data.products);
        setPlans(res.data.plans);
        setTaxes(res.data.taxes);
      }
    });
  }, []);

  // Async data fetch without synchronous setState in effect
  useEffect(() => {
    let active = true;

    getQuotationTemplatesAction({
      search: searchTerm,
      page,
      limit: 15,
    })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setTemplates(res.data.templates);
          setTotal(res.data.total);
          setTotalPages(res.data.totalPages);
        } else {
          setErrorMessage(res.error || "Failed to load quotation templates");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load quotation templates");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchTerm, page, refreshTrigger]);

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
    setEditingTemplate(null);
    setSheetOpen(true);
  };

  const handleEdit = (tmpl: TemplateItem) => {
    setEditingTemplate({
      id: tmpl.id,
      name: tmpl.name,
      validityDays: tmpl.validityDays,
      planId: tmpl.planId,
      lines: tmpl.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxId: l.taxId,
      })),
    });
    setSheetOpen(true);
    setActiveDropdownId(null);
  };

  const handleDuplicate = async (tmpl: TemplateItem) => {
    setActionLoadingId(tmpl.id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await duplicateQuotationTemplateAction(tmpl.id);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to duplicate quotation template");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  const handleDelete = async (tmpl: TemplateItem) => {
    if (!confirm(`Are you sure you want to delete "${tmpl.name}"?`)) {
      return;
    }

    setActionLoadingId(tmpl.id);
    setActiveDropdownId(null);
    setErrorMessage(null);

    const res = await deleteQuotationTemplateAction(tmpl.id);
    if (!res.success) {
      setErrorMessage(res.error || "Failed to delete quotation template");
    } else {
      reload();
    }
    setActionLoadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Quotation Templates"
        description="Standardized product bundles, plans, and line items for fast 1-click sales proposals."
        action={
          isAdmin ? (
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Template
            </button>
          ) : undefined
        }
      />

      {/* Staff View Notice */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Staff account: Quotation templates are read-only. Only administrators can create or duplicate templates.</span>
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
            placeholder="Search quotation templates by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Template Name</th>
                <th className="px-6 py-3.5">Linked Plan</th>
                <th className="px-6 py-3.5">Validity</th>
                <th className="px-6 py-3.5">Included Items</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading quotation templates...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No quotation templates found</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm
                          ? "Try clearing your search query to see all templates."
                          : "Create your first pre-configured quotation bundle."}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={handleCreate}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-medium transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Template
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                templates.map((tmpl) => (
                  <tr key={tmpl.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{tmpl.name}</span>
                    </td>

                    {/* Linked Plan */}
                    <td className="px-6 py-4">
                      {tmpl.plan ? (
                        <div>
                          <span className="font-medium text-slate-900">{tmpl.plan.name}</span>
                          <span className="text-xs text-slate-500 block">
                            ₹{tmpl.plan.price.toFixed(2)} / {tmpl.plan.billingPeriod.toLowerCase()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Custom Bundle (No Plan)</span>
                      )}
                    </td>

                    {/* Validity Days */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {tmpl.validityDays} {tmpl.validityDays === 1 ? "day" : "days"}
                      </span>
                    </td>

                    {/* Included Items */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Package className="h-3 w-3" />
                          {tmpl.lines.length} Line Item{tmpl.lines.length !== 1 ? "s" : ""}
                        </span>
                        <div className="text-xs text-slate-500 max-w-xs truncate">
                          {tmpl.lines
                            .map((l) => `${l.quantity}x ${l.productName}`)
                            .join(", ")}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {isAdmin ? (
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={actionLoadingId === tmpl.id}
                            onClick={() =>
                              setActiveDropdownId(activeDropdownId === tmpl.id ? null : tmpl.id)
                            }
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeDropdownId === tmpl.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(tmpl)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Edit Template
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(tmpl)}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-indigo-600 font-medium"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Duplicate (Copy)
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(tmpl)}
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
              Showing {templates.length} of {total} quotation templates
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

      {/* Quotation Template Form Sheet */}
      <QuotationTemplateFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        template={editingTemplate}
        products={products}
        plans={plans}
        taxes={taxes}
        onSuccess={reload}
      />
    </div>
  );
}
