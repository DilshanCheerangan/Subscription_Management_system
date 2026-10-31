"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { calculateSubscriptionTotals } from "@/lib/subscriptions";
import {
  createSubscriptionAction,
  updateSubscriptionAction,
} from "@/app/actions/subscriptions";
import { SubscriptionStatus } from "@prisma/client";
import {
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  User,
  Sparkles,
} from "lucide-react";

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export interface PlanOption {
  id: string;
  name: string;
  billingPeriod: string;
  price: number;
  minQuantity: number;
  linkedProductId?: string | null;
  closable: boolean;
  pausable: boolean;
  autoClose: boolean;
  renewable: boolean;
}

export interface VariantOption {
  id: string;
  attributeName: string;
  attributeValue: string;
  extraPrice: number;
}

export interface ProductOption {
  id: string;
  name: string;
  salesPrice: number;
  type: string;
  variants: VariantOption[];
}

export interface TaxOption {
  id: string;
  name: string;
  percentage: number;
}

export interface TemplateLineItemOption {
  productId: string;
  productName: string;
  productSalesPrice: number;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxId?: string | null;
}

export interface TemplateOption {
  id: string;
  name: string;
  validityDays: number;
  planId?: string | null;
  lines: TemplateLineItemOption[];
}

export interface SubscriptionLineInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxId?: string | null;
}

export interface InitialSubscriptionData {
  id?: string;
  customerId: string;
  planId: string;
  startDate: string;
  expiryDate?: string | null;
  paymentTermId?: string | null;
  notes?: string | null;
  status: SubscriptionStatus;
  lines: SubscriptionLineInput[];
}

interface SubscriptionFormProps {
  initialData?: InitialSubscriptionData | null;
  customers: CustomerOption[];
  plans: PlanOption[];
  products: ProductOption[];
  taxes: TaxOption[];
  paymentTerms: { id: string; name: string; days: number }[];
  templates: TemplateOption[];
  preselectedTemplateId?: string | null;
}

export function SubscriptionForm({
  initialData,
  customers,
  plans,
  products,
  taxes,
  paymentTerms,
  templates,
  preselectedTemplateId,
}: SubscriptionFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const preloadedTemplate = useMemo(
    () => templates.find((t) => t.id === preselectedTemplateId),
    [templates, preselectedTemplateId]
  );

  // Form Fields
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    preselectedTemplateId || ""
  );

  const [customerId, setCustomerId] = useState(
    initialData?.customerId || (customers.length > 0 ? customers[0].id : "")
  );

  const [planId, setPlanId] = useState(() => {
    if (initialData?.planId) return initialData.planId;
    if (preloadedTemplate?.planId) return preloadedTemplate.planId;
    return plans.length > 0 ? plans[0].id : "";
  });

  const defaultStartDate = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(
    initialData?.startDate
      ? new Date(initialData.startDate).toISOString().slice(0, 10)
      : defaultStartDate
  );

  const [expiryDate, setExpiryDate] = useState(() => {
    if (initialData?.expiryDate) {
      return new Date(initialData.expiryDate).toISOString().slice(0, 10);
    }
    if (preloadedTemplate?.validityDays) {
      const exp = new Date(Date.now() + preloadedTemplate.validityDays * 24 * 60 * 60 * 1000);
      return exp.toISOString().slice(0, 10);
    }
    return "";
  });

  const [paymentTermId, setPaymentTermId] = useState(
    initialData?.paymentTermId || (paymentTerms.length > 0 ? paymentTerms[0].id : "")
  );

  const [notes, setNotes] = useState(initialData?.notes || "");
  const [initialStatus, setInitialStatus] = useState<SubscriptionStatus>(() => {
    if (initialData?.status) return initialData.status;
    if (preloadedTemplate) return SubscriptionStatus.QUOTATION;
    return SubscriptionStatus.DRAFT;
  });

  const [lines, setLines] = useState<SubscriptionLineInput[]>(() => {
    if (initialData?.lines && initialData.lines.length > 0) return initialData.lines;
    if (preloadedTemplate?.lines && preloadedTemplate.lines.length > 0) {
      return preloadedTemplate.lines.map((tl) => ({
        productId: tl.productId,
        variantId: tl.variantId || null,
        quantity: tl.quantity,
        unitPrice: tl.unitPrice,
        taxId: tl.taxId || null,
      }));
    }
    if (products.length > 0) {
      return [
        {
          productId: products[0].id,
          variantId: products[0].variants.length > 0 ? products[0].variants[0].id : null,
          quantity: 1,
          unitPrice: products[0].salesPrice,
          taxId: taxes.length > 0 ? taxes[0].id : null,
        },
      ];
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Plan lookup
  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  // Tax lookup map
  const taxMap = useMemo(() => {
    const map = new Map<string, number>();
    taxes.forEach((t) => map.set(t.id, t.percentage));
    return map;
  }, [taxes]);

  // Calculate live totals using shared helper
  const totals = useMemo(() => {
    const lineInputs = lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxPercentage: l.taxId ? taxMap.get(l.taxId) || 0 : 0,
    }));
    return calculateSubscriptionTotals(lineInputs);
  }, [lines, taxMap]);

  // Helper to determine price for a line based on plan and product
  function getAutoUnitPrice(prodId: string, varId?: string | null): number {
    const product = products.find((p) => p.id === prodId);
    if (!product) return 0;

    let basePrice = product.salesPrice;
    if (selectedPlan && selectedPlan.linkedProductId === prodId) {
      basePrice = selectedPlan.price;
    }

    if (varId && product.variants.length > 0) {
      const variant = product.variants.find((v) => v.id === varId);
      if (variant) {
        basePrice += variant.extraPrice;
      }
    }

    return basePrice;
  }

  // Apply template logic (Requirement 5: 'New from template' flow)
  function handleApplyTemplate(tmplId: string) {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find((t) => t.id === tmplId);
    if (!tmpl) return;

    if (tmpl.planId && plans.some((p) => p.id === tmpl.planId)) {
      setPlanId(tmpl.planId);
    }

    const today = new Date(startDate || new Date());
    const expiry = new Date(today.getTime() + tmpl.validityDays * 24 * 60 * 60 * 1000);
    setExpiryDate(expiry.toISOString().slice(0, 10));

    if (tmpl.lines && tmpl.lines.length > 0) {
      setLines(
        tmpl.lines.map((tl) => ({
          productId: tl.productId,
          variantId: tl.variantId || null,
          quantity: tl.quantity,
          unitPrice: tl.unitPrice,
          taxId: tl.taxId || null,
        }))
      );
    }

    setInitialStatus(SubscriptionStatus.QUOTATION);
  }

  // Line item manipulation
  function handleAddLine() {
    if (products.length === 0) return;
    const firstProduct = products[0];
    const firstVariantId = firstProduct.variants.length > 0 ? firstProduct.variants[0].id : null;
    const autoPrice = getAutoUnitPrice(firstProduct.id, firstVariantId);

    setLines([
      ...lines,
      {
        productId: firstProduct.id,
        variantId: firstVariantId,
        quantity: 1,
        unitPrice: autoPrice,
        taxId: taxes.length > 0 ? taxes[0].id : null,
      },
    ]);
  }

  function handleRemoveLine(index: number) {
    if (lines.length <= 1) {
      setError("Subscription must have at least one product line");
      return;
    }
    setError(null);
    setLines(lines.filter((_, i) => i !== index));
  }

  function handleProductChange(index: number, newProductId: string) {
    const product = products.find((p) => p.id === newProductId);
    const newVariantId = product && product.variants.length > 0 ? product.variants[0].id : null;
    const autoPrice = getAutoUnitPrice(newProductId, newVariantId);

    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      variantId: newVariantId,
      unitPrice: autoPrice,
    };
    setLines(updated);
  }

  function handleVariantChange(index: number, newVariantId: string) {
    const currentLine = lines[index];
    const autoPrice = getAutoUnitPrice(currentLine.productId, newVariantId || null);

    const updated = [...lines];
    updated[index] = {
      ...currentLine,
      variantId: newVariantId || null,
      unitPrice: autoPrice,
    };
    setLines(updated);
  }

  function handleQuantityChange(index: number, qty: number) {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      quantity: Math.max(1, qty || 1),
    };
    setLines(updated);
  }

  function handlePriceChange(index: number, price: number) {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      unitPrice: Math.max(0, price || 0),
    };
    setLines(updated);
  }

  function handleTaxChange(index: number, newTaxId: string) {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      taxId: newTaxId || null,
    };
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (!planId) {
      setError("Please select a plan.");
      return;
    }

    if (lines.length === 0) {
      setError("Please add at least one line item.");
      return;
    }

    // Check plan minQuantity constraint
    const totalUnits = lines.reduce((acc, l) => acc + l.quantity, 0);
    if (selectedPlan && totalUnits < selectedPlan.minQuantity) {
      setError(
        `Total quantity (${totalUnits}) cannot be less than plan minimum quantity requirement of ${selectedPlan.minQuantity} units.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerId,
        planId,
        startDate: new Date(startDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        paymentTermId: paymentTermId || null,
        notes: notes.trim() || null,
        initialStatus,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxId: l.taxId || null,
        })),
      };

      let res;
      if (isEditing && initialData?.id) {
        res = await updateSubscriptionAction(initialData.id, payload);
      } else {
        res = await createSubscriptionAction(payload);
      }

      if (!res.success || !res.data) {
        setError(res.error || "Failed to save subscription.");
        setLoading(false);
        return;
      }

      router.push(`/admin/subscriptions/${res.data.id}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Template Quick Loader (Shown only on new subscriptions) */}
      {!isEditing && templates.length > 0 && (
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Start from Quotation Template
              </h3>
              <p className="text-xs text-slate-600">
                Pre-fill products, variants, quantities, taxes, and expiry validity with 1 click.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 bg-white border border-indigo-200 rounded-md text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select a Template —</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.lines.length} lines, {tmpl.validityDays}d)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Grid: Parameters & Customer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Plan Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Customer & Subscription Terms
            </h2>

            {/* Customer Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Customer <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Choose customer account —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Picker */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subscription Plan <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Choose billing plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)} / {p.billingPeriod.toLowerCase()} (Min: {p.minQuantity} qty)
                  </option>
                ))}
              </select>
              {selectedPlan && (
                <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                    Period: {selectedPlan.billingPeriod}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                    Min Quantity: {selectedPlan.minQuantity}
                  </span>
                  {selectedPlan.pausable && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      Pausable
                    </span>
                  )}
                  {selectedPlan.closable && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                      Closable Early
                    </span>
                  )}
                  {selectedPlan.autoClose && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                      Auto-Closes at Expiry
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Dates & Payment Term */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry / Valid Until
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">Optional contract end date</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Term
                </label>
                <select
                  value={paymentTermId}
                  onChange={(e) => setPaymentTermId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Payment Term</option>
                  {paymentTerms.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.days}d)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Initial Status (If creating) */}
            {!isEditing && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-xs font-medium hover:bg-slate-50">
                    <input
                      type="radio"
                      name="initialStatus"
                      value={SubscriptionStatus.DRAFT}
                      checked={initialStatus === SubscriptionStatus.DRAFT}
                      onChange={() => setInitialStatus(SubscriptionStatus.DRAFT)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Draft (Internal)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-xs font-medium hover:bg-slate-50">
                    <input
                      type="radio"
                      name="initialStatus"
                      value={SubscriptionStatus.QUOTATION}
                      checked={initialStatus === SubscriptionStatus.QUOTATION}
                      onChange={() => setInitialStatus(SubscriptionStatus.QUOTATION)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Quotation (Sent)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Internal Notes & Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contract notes, customer terms, or SLA commitments..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Summary Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4 sticky top-20">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider text-xs">
              Billing & Totals Summary
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Untaxed Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated Taxes:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totals.totalTax)}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-base font-bold text-slate-900">Recurring Total:</span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>

            {selectedPlan && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div>
                  <strong>Billing Cycle:</strong> Billed {selectedPlan.billingPeriod.toLowerCase()} in advance.
                </div>
                <div>
                  <strong>First Invoice Date:</strong> {new Date(startDate).toLocaleDateString()}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Update Subscription" : "Create Subscription"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Line Items Editor */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Subscription Line Items ({lines.length})
            </h2>
            <p className="text-xs text-slate-500">
              Configure products, variants, quantities, unit prices, and applicable tax rates.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </button>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3 w-24">Qty</th>
                <th className="px-4 py-3 w-32">Unit Price (₹)</th>
                <th className="px-4 py-3 w-36">Tax</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line, idx) => {
                const product = products.find((p) => p.id === line.productId);
                const hasVariants = product && product.variants.length > 0;
                const calc = totals.lines[idx];

                return (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <select
                        value={line.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.salesPrice.toFixed(0)})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Variant */}
                    <td className="px-4 py-3">
                      <select
                        disabled={!hasVariants}
                        value={line.variantId || ""}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {!hasVariants ? (
                          <option value="">Standard</option>
                        ) : (
                          <>
                            <option value="">Standard (No extra)</option>
                            {product.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.attributeName}: {v.attributeValue} (+₹{v.extraPrice})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={line.unitPrice}
                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                      />
                    </td>

                    {/* Tax */}
                    <td className="px-4 py-3">
                      <select
                        value={line.taxId || ""}
                        onChange={(e) => handleTaxChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">No Tax (0%)</option>
                        {taxes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.percentage}%)
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Line Amount */}
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {calc ? formatCurrency(calc.totalAmount) : "—"}
                    </td>

                    {/* Remove */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Remove line item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
